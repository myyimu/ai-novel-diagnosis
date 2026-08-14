import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";
import { validateJobId, validateUploadId } from "../utils/path-sanitizer";

@Injectable()
export class ValidateJobIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || typeof value !== "string") {
      throw new BadRequestException("jobId is required");
    }
    validateJobId(value);
    return value;
  }
}

@Injectable()
export class ValidateUploadIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || typeof value !== "string") {
      throw new BadRequestException("uploadId is required");
    }
    validateUploadId(value);
    return value;
  }
}
