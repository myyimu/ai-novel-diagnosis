import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ProviderConfigDto } from "@/modules/ai-provider/dto/provider-config.dto";

export class RewriteParagraphTargetDto {
  @ApiProperty({ description: "Stable client-side paragraph identifier." })
  @IsString()
  @MaxLength(120)
  id!: string;

  @ApiProperty({ description: "Original paragraph to polish." })
  @IsString()
  @MinLength(1)
  @MaxLength(12000)
  originalText!: string;

  @ApiProperty({
    description: "Accepted editorial constraints for this paragraph.",
  })
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  instructions!: string[];
}

export class RewriteParagraphsDto {
  @ApiPropertyOptional({
    description: "Chapter title, used only as writing context.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  chapterTitle?: string;

  @ApiProperty({ type: [RewriteParagraphTargetDto] })
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => RewriteParagraphTargetDto)
  targets!: RewriteParagraphTargetDto[];

  @ApiPropertyOptional({ type: ProviderConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderConfigDto)
  provider?: ProviderConfigDto;
}
