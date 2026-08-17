import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('inbox')
export class InboxController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getMessages(@Query('workspaceId') workspaceId: string) {
    if (!workspaceId) return [];
    return this.prisma.inboxMessage.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });
  }
}