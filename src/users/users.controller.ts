// src/users/users.controller.ts
import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

class UpdateMeDto {
  FullName?: string;
  Phone?: string;
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
