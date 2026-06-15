import { ApiProperty } from "@nestjs/swagger";
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class PreprocessBookDto {
  @ApiProperty({
    description: "Raw TXT content to clean and split into chapters.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500000)
  text!: string;

  @ApiProperty({
    description: "Maximum characters per chapter chunk before auto-splitting.",
    required: false,
    default: 12000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  maxChapterChars?: number;
}
