import { Controller, Post, Body } from '@nestjs/common';
import { AiContentService } from './ai-content.service';

@Controller('ai-content')
export class AiContentController {
  constructor(private readonly aiContentService: AiContentService) {}

  @Post('generate')
  async generate(@Body() body: { topic: string; userId: string; workspaceId: string }) {
    return this.aiContentService.generatePost(body.topic, body.userId, body.workspaceId);
  }

  // Cổng gợi ý trả lời tin nhắn
  @Post('suggest-reply')
  async suggestReply(@Body() body: { msg?: string; wsId?: string; message?: string; workspaceId?: string }) {
    const text = body.msg || body.message || "";
    const workspace = body.wsId || body.workspaceId || "";
    return this.aiContentService.suggestReply(text, workspace);
  }

  // 🌟 MỚI 1: Cổng AI học hiểu toàn bộ nội dung video khi khách tải lên
  @Post('analyze-video-deep')
  async analyzeVideoDeep(
    @Body() body: { videoName?: string; duration?: number; keyframes?: any[]; extraContext?: string }
  ) {
    return this.aiContentService.analyzeVideoDeep(body);
  }

  // 🌟 MỚI 2: Cổng AI phân tích câu lệnh chỉnh sửa video theo mốc thời gian
  @Post('parse-timeline-prompt')
  async parseTimelinePrompt(
    @Body() body: { userPrompt: string; currentTimeline?: any[]; duration?: number; currentTime?: number }
  ) {
    return this.aiContentService.parseTimelinePrompt(body);
  }
}