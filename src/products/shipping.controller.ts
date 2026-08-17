import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('shipping')
export class ShippingController {
  constructor(private prisma: PrismaService) {}

  @Get(':workspaceId')
  async getSettings(@Param('workspaceId') workspaceId: string) {
    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { 
        vtpToken: true, 
        vtpShopId: true,
        senderProvince: true,
        senderDistrict: true
      }
    });
  }

  @Patch(':workspaceId')
  async updateSettings(@Param('workspaceId') workspaceId: string, @Body() body: any) {
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: body
    });
  }
}