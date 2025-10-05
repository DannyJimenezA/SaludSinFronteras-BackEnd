import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('messages/:id/translate')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TranslationController {
  constructor(private svc: TranslationService) {}

  @Roles('ADMIN','DOCTOR','PATIENT')
  @Post()
  create(@Param('id') id: string, @Body() body: { language: string }) {
    return this.svc.translateMessage(BigInt(id), body.language);
  }

  @Roles('ADMIN','DOCTOR','PATIENT')
  @Get()
  list(@Param('id') id: string) {
    return this.svc.getTranslations(BigInt(id));
  }
}
