import { Controller, Post, Body } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private prisma: PrismaService) {}

  @Post('update-shipping')
  async updateShippingConfig(@Body() body: any) {
    const { workspaceId, vtpToken, vtpShopId } = body;
    
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { 
        vtpToken: vtpToken,
        vtpShopId: vtpShopId 
      }
    });
  }
}