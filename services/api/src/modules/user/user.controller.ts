import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PaginationDto } from "@/shared/dto/pagination.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import {
  UserResponseDto,
  UserPaginatedResponseDto,
} from "./dto/user-response.dto";
import { UserService } from "./user.service";

@ApiTags("users")
@ApiBearerAuth("JWT-auth")
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: "Get paginated user list" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "pageSize", required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: "User list retrieved successfully",
    type: UserPaginatedResponseDto,
  })
  @Get()
  async getUsers(
    @Query() query: PaginationDto,
  ): Promise<UserPaginatedResponseDto> {
    return this.userService.getAllUsers(query.page, query.pageSize);
  }

  @ApiOperation({ summary: "Create a new user" })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: "User created successfully",
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @Post()
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.createUser(createUserDto.name);
  }
}
