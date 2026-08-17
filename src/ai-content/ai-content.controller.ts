import { Controller, Post, Body } from '@nestjs/common';
import { AiContentService } from './ai-content.service';

@Controller('ai-content')
export class AiContentController {
  constructor(private readonly aiContentService: AiContentService) {}

  @Post('generate')
  async generate(@Body() body: { topic: string, userId: string, workspaceId: string }) {
    return this.aiContentService.generatePost(body.topic, body.userId, body.workspaceId);
  }
}