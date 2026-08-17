import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaService } from '../prisma.service'; // Thêm dòng này

@Module({
  providers: [AdminService, PrismaService], // Thêm PrismaService vào đây
  controllers: [AdminController]
})
export class AdminModule {}