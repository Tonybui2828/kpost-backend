import { Controller, Post, Body } from '@nestjs/common';
import { AiContentService } from './ai-content.service';

@Controller('ai-content')
export class AiContentController {
  constructor(private readonly aiContentService: AiContentService) {}

  @Post('generate')
  async generate(@Body() body: { topic: string, userId: string, workspaceId: string }) {
    return this.aiContentService.generatePost(body.topic, body.userId, body.workspaceId);
  }

  // 🚀 ĐÃ THÊM: Cổng POST /ai-content/suggest-reply để gọi AI
  @Post('suggest-reply')
  async suggestReply(@Body() body: { msg?: string, wsId?: string, message?: string, workspaceId?: string }) {
    // Chấp nhận cả tên biến cũ và tên biến mới để ko bao giờ trượt
    const text = body.msg || body.message || "";
    const workspace = body.wsId || body.workspaceId || "";
    return this.aiContentService.suggestReply(text, workspace);
  }
}