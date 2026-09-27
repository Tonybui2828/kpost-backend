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

  // 🌟 1. Cổng AI học hiểu toàn bộ nội dung video khi khách tải lên
  @Post('analyze-video-deep')
  async analyzeVideoDeep(
    @Body() body: { videoName?: string; duration?: number; keyframes?: any[]; extraContext?: string }
  ) {
    return this.aiContentService.analyzeVideoDeep(body);
  }

  // 🌟 2. Cổng AI phân tích câu lệnh chỉnh sửa video theo mốc thời gian
  @Post('parse-timeline-prompt')
  async parseTimelinePrompt(
    @Body() body: { userPrompt: string; currentTimeline?: any[]; duration?: number; currentTime?: number }
  ) {
    return this.aiContentService.parseTimelinePrompt(body);
  }

  // 🌟 3. CỔNG MỚI: AI Whisper bóc băng âm thanh thực tế từ video thành lời thoại tiếng Việt chuẩn 100%
  @Post('transcribe-video')
  async transcribeVideo(@Body() body: { audioBase64?: string; videoUrl?: string }) {
    return this.aiContentService.transcribeAudioWithWhisper(body);
  }
}