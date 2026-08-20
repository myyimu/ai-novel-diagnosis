import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class UpdateDivergenceNoteDto {
  @ApiProperty({
    description:
      "The author's adjudication on the detected contradictions (1-2000 chars). Only this note is writable — the detection itself is immutable.",
    example: "我信体检：这章确实拖，下一版砍掉两段回忆。",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  note!: string;
}
