import { BadRequestException } from "@nestjs/common";
import { resolve, sep } from "node:path";

/**
 * Validates that a user-supplied path component doesn't escape the base directory.
 * Prevents path traversal attacks like jobId = "../../etc/passwd".
 */
export function resolveSafePath(
  baseDir: string,
  userInput: string,
  context = "path",
): string {
  const resolved = resolve(baseDir, userInput);
  const normalizedBase = resolve(baseDir);

  if (
    !resolved.startsWith(normalizedBase + sep) &&
    resolved !== normalizedBase
  ) {
    throw new BadRequestException(
      `Invalid ${context}: path traversal detected`,
    );
  }

  return resolved;
}

/**
 * Validates job ID format: book_<timestamp_base36>_<random_base36>
 * Example: book_lz8v1k2_a3f9x2
 */
const JOB_ID_PATTERN = /^book_[a-z0-9]{4,20}_[a-z0-9]{2,12}$/i;

export function validateJobId(jobId: string): void {
  if (!JOB_ID_PATTERN.test(jobId)) {
    throw new BadRequestException(
      `Invalid job ID format: expected book_<id>_<suffix>, got "${jobId}"`,
    );
  }
}

/**
 * Validates upload ID format (UUID)
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUploadId(uploadId: string): void {
  if (!UUID_PATTERN.test(uploadId)) {
    throw new BadRequestException(
      `Invalid upload ID format: expected UUID, got "${uploadId}"`,
    );
  }
}
