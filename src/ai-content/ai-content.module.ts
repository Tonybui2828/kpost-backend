import { Module } from '@nestjs/common';
import { AiContentService } from './ai-content.service';
import { AiContentController } from './ai-content.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [AiContentService, PrismaService],
  controllers: [AiContentController],
})
export class AiContentModule {}