// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthScheduler } from './auth.scheduler';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [JwtModule.register({}), MailModule],
  providers: [AuthService, JwtStrategy, AuthScheduler],
  controllers: [AuthController],
  exports: [],
})
export class AuthModule {}
