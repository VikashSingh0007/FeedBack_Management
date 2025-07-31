import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() body: { email: string; password: string }) {
    const { email, password } = body;
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }
    return this.usersService.create(email, password);
  }

  @Get(':id')
  findUser(@Param('id', ParseIntPipe) id: number): Promise<User | null> {
    return this.usersService.findById(id);
  }

  // users.controller.ts
@Patch(':id')
updateUser(
  @Param('id', ParseIntPipe) id: number,
  @Body() updateData: Partial<User>,
) {
  if (!Object.keys(updateData).length) {
    throw new BadRequestException('No update fields provided');
  }

  return this.usersService.updateUser(id, updateData);
}

}
