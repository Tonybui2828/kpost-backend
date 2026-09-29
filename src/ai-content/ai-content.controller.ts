import { Controller, Post, Get, Body, Query, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiContentService } from './ai-content.service';
import type { Response } from 'express';

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

  // 🌟 CỔNG BÓC BĂNG TOÀN DIỆN: HỖ TRỢ CẢ FILE UPLOAD LẪN BASE64 (DÙNG CHO TẠO SUB TIẾNG VIỆT GỐC)
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

  // 🌟 CỔNG DỰ PHÒNG CHO ROUTE /api/transcribe-video
  @Post('/api/transcribe-video')
  @UseInterceptors(FileInterceptor('file'))
  async transcribeVideoDirect(
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

  // 🌟 1. CỔNG BÓC BĂNG & CHUYỂN NGỮ ĐA NGÔN NGỮ (TIẾNG TRUNG/ANH -> TIẾNG VIỆT) BẰNG GEMINI 3.8 FLASH
  @Post('transcribe-and-translate')
  async transcribeAndTranslate(
    @Body() body: {
      audioBase64?: string;
      mimeType?: string;
      duration?: number;
      videoTitle?: string;
      sourceLang?: string;
      workspaceId?: string;
    }
  ) {
    return this.aiContentService.transcribeAndTranslate(body);
  }

  // 🌟 2. CỔNG DỰ PHÒNG TRỰC TIẾP CHO FRONTEND GỌI /api/transcribe-and-translate
  @Post('/api/transcribe-and-translate')
  async transcribeAndTranslateDirect(
    @Body() body: {
      audioBase64?: string;
      mimeType?: string;
      duration?: number;
      videoTitle?: string;
      sourceLang?: string;
      workspaceId?: string;
    }
  ) {
    return this.aiContentService.transcribeAndTranslate(body);
  }

  // 🎙️ CỔNG PHÁT ÂM THANH LỒNG TIẾNG MC TIẾNG VIỆT CHUẨN 100%
  @Get('tts')
  async getTts(@Query('text') text: string, @Res() res: Response) {
    if (!text) return res.status(400).send('Missing text');
    try {
      const cleanText = text.slice(0, 300);
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
      const response = await fetch(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
        },
      });

      if (!response.ok) return res.status(response.status).send('TTS upstream error');
      const arrayBuffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      return res.status(500).send(err.message || 'TTS Error');
    }
  }

  // 🎙️ CỔNG DỰ PHÒNG /api/tts CHO FRONTEND GỌI TRỰC TIẾP
  @Get('/api/tts')
  async getTtsDirect(@Query('text') text: string, @Res() res: Response) {
    return this.getTts(text, res);
  }
}