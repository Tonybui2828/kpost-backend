import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { RemarketingService } from './remarketing.service';

@Controller('remarketing')
export class RemarketingController {
  constructor(private readonly remarketingService: RemarketingService) {}

  @Post('schedule')
  async scheduleCampaign(@Body() body: { customerIds: string[], prompt: string, scheduledAt: string, workspaceId: string }) {
    try {
      if (!body.customerIds || body.customerIds.length === 0) {
        throw new HttpException('Vui lòng chọn khách hàng', HttpStatus.BAD_REQUEST);
      }
      return await this.remarketingService.scheduleCampaign(body);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}