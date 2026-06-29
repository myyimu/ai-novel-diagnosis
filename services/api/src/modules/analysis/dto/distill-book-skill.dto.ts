import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  MinLength,
} from "class-validator";

export class DistillBookSkillDto {
  @ApiProperty({
    description: "Job IDs to aggregate into a cross-sample distilled skill.",
    example: ["book_abc123", "book_def456"],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  jobIds!: string[];

  @ApiProperty({
    description: "Dimension to group the contributing books by.",
    example: "author",
    enum: ["author", "genre", "platform"],
  })
  @IsIn(["author", "genre", "platform"])
  groupBy!: "author" | "genre" | "platform";

  @ApiProperty({
    description:
      "The specific value of the grouping dimension (e.g. the author name).",
    example: "猫腻",
  })
  @IsString()
  @MinLength(1)
  groupValue!: string;
}
