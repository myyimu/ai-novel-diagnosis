import { ApiProperty } from "@nestjs/swagger";

/**
 * Safe user response DTO.
 * Never expose internal fields like password_hash or database FKs through the API boundary.
 */
export class UserResponseDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "Unique user identifier",
  })
  id!: string;

  @ApiProperty({ example: "Alice", description: "Display name" })
  name!: string;

  @ApiProperty({ description: "ISO 8601 creation timestamp" })
  createdAt!: Date | string;

  @ApiProperty({ description: "ISO 8601 last update timestamp" })
  updatedAt!: Date | string;
}

/** Paginated wrapper for user responses */
export class UserPaginatedResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  items!: UserResponseDto[];

  @ApiProperty({ example: 10, description: "Total number of users" })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 5, description: "Total number of pages" })
  totalPages!: number;
}
