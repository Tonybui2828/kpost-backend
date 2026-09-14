import { Controller, Get, Post, Query, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { InboxService } from './inbox.service';

@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  // 1. Xác minh Webhook với Facebook (Facebook sẽ gọi API này 1 lần lúc cài đặt)
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response
  ) {
    // Đặt Token này trong file .env (Ví dụ: KPOST_WEBHOOK_VERIFY_123)
    const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'kpost_verify_token_123';
    
    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        return res.status(HttpStatus.OK).send(challenge);
      }
      return res.sendStatus(HttpStatus.FORBIDDEN);
    }
    return res.sendStatus(HttpStatus.BAD_REQUEST);
  }

  // 2. Nhận dữ liệu tin nhắn Real-time từ Facebook
  @Post('webhook')
  async handleIncomingMessage(@Body() body: any, @Res() res: Response) {
    // Trả về 200 OK ngay lập tức để Facebook không khóa Webhook vì timeout
    res.status(HttpStatus.OK).send('EVENT_RECEIVED');

    if (body.object === 'page') {
      for (const entry of body.entry) {
        const pageId = entry.id; // ID của Fanpage nhận tin nhắn
        
        if (entry.messaging) {
          for (const webhookEvent of entry.messaging) {
            // Chỉ xử lý nếu là tin nhắn và KHÔNG phải tin nhắn do chính page gửi ra (is_echo)
            if (webhookEvent.message && !webhookEvent.message.is_echo) {
              await this.inboxService.processFacebookMessage(pageId, webhookEvent);
            }
          }
        }
      }
    }
  }
}