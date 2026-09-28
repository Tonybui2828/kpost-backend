import { Controller, Post, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiContentService } from './ai-content.service';

@Controller('ai-content')
export class AiContentController {
  constructor(private readonly aiContentService: AiContentService) {}

  @Post('generate')
  async generate(@Body() body: { topic: string; userId: string; workspaceId: string }) {
    return this.aiContentService.generatePost(body.topic, body.userId, body.workspaceId);
  }

  @Post('suggest-reply')
  async suggestReply(@Body() body: { msg?: string; wsId?: string; message?: string; workspaceId?: string }) {
    const text = body.msg || body.message || "";
    const workspace = body.wsId || body.workspaceId || "";
    return this.aiContentService.suggestReply(text, workspace);
  }

  @Post('analyze-video-deep')
  async analyzeVideoDeep(
    @Body() body: { videoName?: string; duration?: number; keyframes?: any[]; extraContext?: string }
  ) {
    return this.aiContentService.analyzeVideoDeep(body);
  }

  @Post('parse-timeline-prompt')
  async parseTimelinePrompt(
    @Body() body: { userPrompt: string; currentTimeline?: any[]; duration?: number; currentTime?: number }
  ) {
    return this.aiContentService.parseTimelinePrompt(body);
  }

  // 🌟 CỔNG BÓC BĂNG TOÀN DIỆN: HỖ TRỢ CẢ FILE UPLOAD LẪN BASE64
  @Post('transcribe-video')
  @UseInterceptors(FileInterceptor('file'))
  async transcribeVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { audioBase64?: string; videoUrl?: string; duration?: number }
  ) {
    return this.aiContentService.transcribeAudioWithWhisper({
      fileBuffer: file?.buffer,
      fileName: file?.originalname,
      audioBase64: body?.audioBase64,
      videoUrl: body?.videoUrl,
      duration: body?.duration,
    });
  }
}