import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AnalysisPersistenceRepository,
  type AnalysisUploadSnapshot,
} from "./analysis-persistence.repository";
import { TextPreprocessorService } from "./text-preprocessor.service";
import { normalizeUploadFilename } from "./upload-filename";

export interface UploadedTxtFile {
  originalname?: string;
  buffer?: Buffer;
  mimetype?: string;
  size?: number;
}

export interface CreateUploadInput {
  title?: string;
  genre: string;
  file: UploadedTxtFile;
  encoding?: string;
}

@Injectable()
export class BookUploadService {
  private readonly logger = new Logger(BookUploadService.name);
  private readonly storageRoot: string;
  private readonly encryptionKey: Buffer | undefined;

  constructor(
    private readonly repository: AnalysisPersistenceRepository,
    private readonly textPreprocessor: TextPreprocessorService,
    configService: ConfigService,
  ) {
    this.storageRoot =
      configService.get<string>("analysis.storageDir") ||
      join(process.cwd(), ".local", "analysis");
    const storageKey = configService.get<string>("analysis.storageKey");
    this.encryptionKey = storageKey
      ? createHash("sha256").update(storageKey).digest()
      : undefined;
  }

  async createUpload(
    input: CreateUploadInput,
  ): Promise<AnalysisUploadSnapshot> {
    if (!input.file?.buffer?.length) {
      throw new BadRequestException(
        "请上传有正文内容的 TXT 文件，或在页面文本框粘贴整书内容后再预览章节。",
      );
    }

    const originalFilename = normalizeUploadFilename(input.file.originalname);
    if (!originalFilename.toLowerCase().endsWith(".txt")) {
      throw new BadRequestException("Only .txt files are supported.");
    }

    const rawText = this.decodeUploadedFileText(
      input.file.buffer,
      input.encoding,
    );
    const preprocessing = this.textPreprocessor.preprocess(rawText);
    const normalizedText = preprocessing.chapters
      .map((chapter) => `${chapter.title}\n${chapter.text}`)
      .join("\n\n");
    const uploadId = randomUUID();
    const uploadDir = join(this.storageRoot, "uploads", uploadId);
    await mkdir(uploadDir, { recursive: true });

    const [rawTextPath, normalizedTextPath] = await Promise.all([
      this.writeStoredText(join(uploadDir, "raw.txt"), rawText),
      this.writeStoredText(join(uploadDir, "normalized.txt"), normalizedText),
    ]);

    const snapshot: AnalysisUploadSnapshot = {
      id: uploadId,
      title: input.title?.trim() || originalFilename.replace(/\.[^.]+$/, ""),
      genre: input.genre,
      originalFilename,
      rawTextPath,
      normalizedTextPath,
      rawLength: rawText.length,
      cleanedLength: preprocessing.cleaning.cleanedLength,
      chapterCount: preprocessing.chapters.length,
      preprocessing,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.writeSnapshot(snapshot);

    try {
      const persisted = await this.repository.createUpload({
        id: uploadId,
        title: snapshot.title,
        genre: snapshot.genre,
        originalFilename: snapshot.originalFilename,
        rawTextPath: snapshot.rawTextPath,
        normalizedTextPath: snapshot.normalizedTextPath,
        rawLength: snapshot.rawLength,
        cleanedLength: snapshot.cleanedLength,
        chapterCount: snapshot.chapterCount,
        preprocessing: snapshot.preprocessing,
      });
      await this.writeSnapshot(persisted);
      return persisted;
    } catch (error) {
      this.logger.warn(
        `Upload ${uploadId} saved to local snapshot because database persistence failed: ${
          (error as Error).message
        }`,
      );
      return snapshot;
    }
  }

  async getUpload(uploadId: string): Promise<AnalysisUploadSnapshot> {
    const upload =
      (await this.repository.getUpload(uploadId)) ??
      (await this.readSnapshot(uploadId));
    if (!upload) {
      throw new NotFoundException(`Book upload not found: ${uploadId}`);
    }

    return upload;
  }

  async listUploads(limit = 20): Promise<AnalysisUploadSnapshot[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const byId = new Map<string, AnalysisUploadSnapshot>();

    try {
      for (const upload of await this.repository.listUploads(safeLimit)) {
        byId.set(upload.id, upload);
      }
    } catch (error) {
      this.logger.warn(
        `Listing database uploads failed; falling back to local snapshots: ${
          (error as Error).message
        }`,
      );
    }
    for (const upload of await this.listSnapshotUploads()) {
      if (!byId.has(upload.id)) {
        byId.set(upload.id, upload);
      }
    }

    return [...byId.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, safeLimit);
  }

  async readNormalizedText(uploadId: string): Promise<string> {
    const upload = await this.getUpload(uploadId);
    return this.readStoredText(upload.normalizedTextPath);
  }

  toPublicUpload(upload: AnalysisUploadSnapshot) {
    const {
      rawTextPath: _rawTextPath,
      normalizedTextPath: _normalizedTextPath,
      ...safe
    } = upload;
    return safe;
  }

  private snapshotPath(uploadId: string): string {
    return join(this.storageRoot, "uploads", uploadId, "snapshot.json");
  }

  private async writeSnapshot(upload: AnalysisUploadSnapshot): Promise<void> {
    await this.writeStoredText(
      this.snapshotPath(upload.id),
      JSON.stringify(upload),
    );
  }

  private async readSnapshot(
    uploadId: string,
  ): Promise<AnalysisUploadSnapshot | undefined> {
    for (const path of this.storageReadCandidates(
      this.snapshotPath(uploadId),
    )) {
      try {
        return JSON.parse(
          await this.readStoredText(path),
        ) as AnalysisUploadSnapshot;
      } catch {
        /* try next storage representation */
      }
    }
    return undefined;
  }

  private decodeUploadedFileText(
    raw: Buffer,
    preferredEncoding?: string,
  ): string {
    const withBomRemoved = this.stripTextBom(raw);
    const preferred = this.normalizeEncodingPreference(preferredEncoding);
    if (preferred) {
      const candidates = this.uniqueBuffers([withBomRemoved, raw]);
      for (const candidate of candidates) {
        try {
          return this.decodeBuffer(
            candidate,
            preferred,
            preferred === "latin1",
          );
        } catch {
          /* try other decoding paths */
        }
      }
    }

    const candidateBuffers = this.uniqueBuffers([withBomRemoved, raw]);
    const utf16Hint = this.isLikelyUtf16(withBomRemoved);
    const encodings = [
      ...new Set([
        ...(utf16Hint ? ["utf-16le", "utf-16be"] : []),
        "utf-8",
        "utf-16le",
        "utf-16be",
        "gbk",
        "gb18030",
        "gb2312",
      ]),
    ];
    const scored: Array<{ text: string; score: number; encoding: string }> = [];

    for (const encoding of encodings) {
      for (const candidate of candidateBuffers) {
        let decoded: string;
        try {
          decoded = this.decodeBuffer(
            candidate,
            encoding,
            encoding === "latin1",
          );
        } catch {
          continue;
        }

        scored.push({
          text: decoded,
          score: this.scoreDecodedText(decoded),
          encoding,
        });
      }
    }

    if (!scored.length) {
      return this.decodeBuffer(withBomRemoved, "latin1", true);
    }

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best.score < 0) {
      return this.decodeBuffer(withBomRemoved, "latin1", true);
    }
    return best.text;
  }

  private scoreDecodedText(text: string): number {
    if (!text.trim().length) {
      return -10000;
    }

    let replacementCount = 0;
    let controlCount = 0;
    let printableCount = 0;
    let cjkCount = 0;

    for (const char of text) {
      if (char === "\uFFFD") {
        replacementCount += 1;
        continue;
      }

      const code = char.codePointAt(0) ?? 0;

      if (
        code === 0x0000 ||
        (code <= 0x08 && code !== 0x09) ||
        code === 0x0b ||
        code === 0x0c ||
        (code >= 0x0e && code < 0x20)
      ) {
        controlCount += 1;
        continue;
      }

      if (
        (code >= 0x4e00 && code <= 0x9fff) ||
        (code >= 0x3400 && code <= 0x4dbf) ||
        /[A-Za-z0-9]/.test(char) ||
        /[\u3000-\u303f\u3040-\u30ff]/.test(char) ||
        "，。？！；：“”‘’（）《》【】、".includes(char) ||
        /\s/.test(char)
      ) {
        printableCount += 1;
      }

      if (code >= 0x4e00 && code <= 0x9fff) {
        cjkCount += 1;
      }
    }

    const length = text.length || 1;
    return (
      printableCount * 4 +
      cjkCount -
      replacementCount * 64 -
      controlCount * 128 -
      Math.max(0, length - printableCount - cjkCount - replacementCount) * 2
    );
  }

  private decodeBuffer(
    buffer: Buffer,
    encoding: string,
    latin1Fallback = false,
  ): string {
    if (latin1Fallback) {
      return buffer.toString("latin1");
    }
    return new TextDecoder(encoding, { fatal: true }).decode(buffer);
  }

  private normalizeEncodingPreference(
    preferredEncoding?: string,
  ): string | undefined {
    const normalized = preferredEncoding?.trim().toLowerCase();
    if (!normalized || normalized === "auto") {
      return undefined;
    }

    const aliasMap: Record<string, string> = {
      "utf-8": "utf-8",
      utf8: "utf-8",
      "utf-16": "utf-16le",
      utf16: "utf-16le",
      "utf-16le": "utf-16le",
      utf16le: "utf-16le",
      "utf-16be": "utf-16be",
      utf16be: "utf-16be",
      gbk: "gbk",
      gb2312: "gb2312",
      "gb-2312": "gb2312",
      gb18030: "gb18030",
      "gb-18030": "gb18030",
      ansi: "gb18030",
      "windows-1252": "latin1",
      latin1: "latin1",
    };

    return aliasMap[normalized];
  }

  private uniqueBuffers(buffers: Buffer[]): Buffer[] {
    const unique: Buffer[] = [];
    for (const current of buffers) {
      if (!unique.some((entry) => entry.equals(current))) {
        unique.push(current);
      }
    }
    return unique;
  }

  private isLikelyUtf16(raw: Buffer): boolean {
    if (raw.length < 32) {
      return false;
    }
    const sample = raw.subarray(0, Math.min(raw.length, 4096));
    let zeroBytes = 0;
    for (const byte of sample) {
      if (byte === 0x00) {
        zeroBytes += 1;
      }
    }
    return zeroBytes / sample.length >= 0.2;
  }

  private stripTextBom(raw: Buffer): Buffer {
    if (
      raw.length >= 3 &&
      raw[0] === 0xef &&
      raw[1] === 0xbb &&
      raw[2] === 0xbf
    ) {
      return raw.subarray(3);
    }
    if (raw.length >= 2 && raw[0] === 0xff && raw[1] === 0xfe) {
      return raw.subarray(2);
    }
    if (raw.length >= 2 && raw[0] === 0xfe && raw[1] === 0xff) {
      return raw.subarray(2);
    }
    return raw;
  }

  private async listSnapshotUploads(): Promise<AnalysisUploadSnapshot[]> {
    const uploadsDir = join(this.storageRoot, "uploads");
    try {
      const entries = await readdir(uploadsDir, { withFileTypes: true });
      const snapshots = await Promise.all(
        entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => this.readSnapshot(entry.name)),
      );
      return snapshots.filter((upload): upload is AnalysisUploadSnapshot =>
        Boolean(upload),
      );
    } catch {
      return [];
    }
  }

  private async writeStoredText(path: string, text: string): Promise<string> {
    if (!this.encryptionKey) {
      await writeFile(path, text, "utf8");
      return path;
    }

    const encryptedPath = this.encryptedPath(path);
    await writeFile(
      encryptedPath,
      this.encryptBuffer(Buffer.from(text, "utf8")),
    );
    return encryptedPath;
  }

  private async readStoredText(path: string): Promise<string> {
    if (path.endsWith(".enc")) {
      return this.decryptBuffer(await readFile(path)).toString("utf8");
    }
    return readFile(path, "utf8");
  }

  private storageReadCandidates(path: string): string[] {
    return path.endsWith(".enc") ? [path] : [path, this.encryptedPath(path)];
  }

  private encryptedPath(path: string): string {
    return path.endsWith(".enc") ? path : `${path}.enc`;
  }

  private encryptBuffer(plain: Buffer): Buffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey!, iv);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    return Buffer.concat([
      Buffer.from("ANDENC1"),
      iv,
      cipher.getAuthTag(),
      encrypted,
    ]);
  }

  private decryptBuffer(payload: Buffer): Buffer {
    const magic = payload.subarray(0, 7).toString("utf8");
    if (magic !== "ANDENC1") {
      throw new Error("Unsupported encrypted analysis upload format.");
    }
    if (!this.encryptionKey) {
      throw new Error(
        "ANALYSIS_STORAGE_KEY is required to read encrypted uploads.",
      );
    }

    const iv = payload.subarray(7, 19);
    const authTag = payload.subarray(19, 35);
    const encrypted = payload.subarray(35);
    const decipher = createDecipheriv("aes-256-gcm", this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}
