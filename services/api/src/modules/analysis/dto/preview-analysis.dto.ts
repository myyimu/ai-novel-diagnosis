import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class PreviewAnalysisDto {
  @ApiProperty({
    description: "Chapter title shown in the critique report.",
    example: "第一章 退婚之后",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @ApiProperty({
    description: "User chapter text to score with the current rubric.",
    example: "主角刚进入考场，就发现考官正是三年前废掉他经脉的人。",
  })
  @IsString()
  @MinLength(20)
  @MaxLength(30000)
  text!: string;

  @ApiProperty({
    description: "Rubric id generated from reference novel analysis.",
    example: "default-webnovel-rubric",
  })
  @IsString()
  @IsNotEmpty()
  rubricId!: string;
}
