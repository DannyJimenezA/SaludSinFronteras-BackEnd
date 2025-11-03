// src/users/users.controller.ts
import { Controller, Get, Patch, Post, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { IsOptional, IsString, IsNotEmpty, MinLength } from 'class-validator';

class UpdateMeDto {
  @IsOptional()
  @IsString()
  FullName?: string;

  @IsOptional()
  @IsString()
  FirstName?: string;

  @IsOptional()
  @IsString()
  LastName1?: string;

  @IsOptional()
  @IsString()
  LastName2?: string;

  @IsOptional()
  @IsString()
  Phone?: string;

  @IsOptional()
  @IsString()
  Gender?: string;

  @IsOptional()
  @IsString()
  DateOfBirth?: string;

  @IsOptional()
  @IsString()
  Identification?: string;

  @IsOptional()
  @IsString()
  NationalityId?: string;

  @IsOptional()
  @IsString()
  ResidenceCountryId?: string;

  @IsOptional()
  @IsString()
  PrimaryLanguage?: string;

  @IsOptional()
  @IsString()
  Timezone?: string;
}

class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword: string;
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

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }
}
