import { Module } from '@nestjs/common';
import { RemarketingController } from './remarketing.controller';
import { RemarketingService } from './remarketing.service';
import { PrismaService } from '../prisma.service'; // Chỉnh lại đường dẫn nếu cần

@Module({
  controllers: [RemarketingController],
  providers: [RemarketingService, PrismaService],
})
export class RemarketingModule {}