// src/users/users.controller.ts
import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { IsOptional, IsString } from 'class-validator';

class UpdateMeDto {
  @IsOptional()
  @IsString()
  FullName?: string;

  @IsOptional()
  @IsString()
  Phone?: string;

  // Note: Gender is not included as the schema uses GenderId (foreign key)
  // To update gender, you would need to provide GenderId with a valid foreign key
}

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

@UseGuards(JwtAuthGuard)
@Get('me')
async me(@Req() req: any) {
  const id = BigInt(req.user.sub);
  return this.users.findById(id);
}

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Req() req: any, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(req.user.sub, dto);
  }
}
