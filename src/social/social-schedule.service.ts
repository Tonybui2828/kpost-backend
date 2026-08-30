import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { FacebookService } from './facebook.service';

@Injectable()
export class SocialScheduleService {
  private readonly logger = new Logger(SocialScheduleService.name);
  private isCronRunning = false;

  constructor(
    private prisma: PrismaService,
    private facebookService: FacebookService,
  ) {}

  // --- HÀM TỰ ĐỘNG XÀO NỘI DUNG (AI SPIN) SIÊU TRÂU BÒ ---
  private async spinText(text: string): Promise<string> {
    try {
      let spinned = text.replace(/\{([^{}]*)\}/g, (match, choices) => {
        const options = choices.split('|');
        return options[Math.floor(Math.random() * options.length)];
      });

      // Ưu tiên 1: Dùng OpenAI (ChatGPT) vì hệ thống bạn có key này
      if (process.env.OPENAI_API_KEY) {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
              },
              body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [
                      { role: 'system', content: 'Bạn là chuyên gia Content. Hãy viết lại bài đăng Facebook sau sao cho mới mẻ, giữ nguyên emoji, CỰC KỲ QUAN TRỌNG: KHÔNG ĐƯỢC XÓA LINK. Trả về trực tiếp bài viết, không giải thích dài dòng.' },
                      { role: 'user', content: spinned }
                  ]
              })
          });
          const data = await res.json();
          if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content.trim();
      } 
      // Ưu tiên 2: Fallback qua Gemini API nếu không có OpenAI
      else if (process.env.GEMINI_API_KEY) {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  contents: [{ parts: [{ text: `Viết lại bài đăng Facebook này, giữ nguyên emoji và KHÔNG ĐƯỢC XÓA link:\n\n${spinned}` }] }]
              })
          });
          const data = await res.json();
          if (data?.candidates?.[0]?.content?.parts?.[0]?.text) return data.candidates[0].content.parts[0].text.trim();
      }
      return spinned;
    } catch(e) {
      this.logger.error("Lỗi Spin content:", e.message);
      return text;
    }
  }

  // ========================================================
  // XỬ LÝ LÊN LỊCH
  // ========================================================
  async handleBatchSchedule(data: any) {
    const { workspaceId, baseContent, pageIds, imageUrls, productUrl, scheduledAt, spinContent } = data;
    const validImages = Array.isArray(imageUrls) ? imageUrls : [];

    for (const pageId of pageIds) {
      let finalContent = baseContent;
      if (spinContent) {
         this.logger.log(`🌀 Đang gọi AI Spin nội dung độc nhất cho Page ${pageId}...`);
         finalContent = await this.spinText(baseContent);
      }

      const metaPayload = JSON.stringify({ images: validImages, pageId: pageId });
      const contentWithMeta = `${finalContent}\n\n[KPOST_META]${metaPayload}[/KPOST_META]`;

      await this.prisma.post.create({
        data: {
          content: contentWithMeta,
          workspaceId: workspaceId,
          productUrl: productUrl || null,
          status: 'scheduled',
          createdAt: new Date(scheduledAt), // Ngày giờ UTC chuẩn từ frontend gửi lên
          userId: 'batch-post' 
        }
      });
    }

    return { success: true, message: `Đã lên lịch thành công` };
  }

  // ========================================================
  // CRONJOB: QUÉT VÀ ĐĂNG BÀI
  // ========================================================
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    if (this.isCronRunning) return;
    this.isCronRunning = true; 
    
    try {
      const now = new Date();
      const pendingPosts = await this.prisma.post.findMany({
        where: { status: 'scheduled', createdAt: { lte: now } },
      });

      if (pendingPosts.length === 0) {
        this.isCronRunning = false;
        return;
      }

      await this.prisma.post.updateMany({
        where: { id: { in: pendingPosts.map(p => p.id) } },
        data: { status: 'processing' }
      });

      for (const post of pendingPosts) {
        try {
          let actualContent = post.content || '';
          let imageArray: string[] = [];
          let targetPageId: string | null = null;

          const metaMatch = actualContent.match(/\[KPOST_META\](.*?)\[\/KPOST_META\]/s);
          if (metaMatch && metaMatch[1]) {
            try {
              const meta = JSON.parse(metaMatch[1]);
              imageArray = meta.images || [];
              targetPageId = meta.pageId || null;
              actualContent = actualContent.replace(metaMatch[0], '').trim();
            } catch(e) {}
          } 

          const whereClause: any = { workspaceId: post.workspaceId };
          if (targetPageId) whereClause.platformId = targetPageId;

          const accounts = await this.prisma.socialAccount.findMany({ where: whereClause });

          if (accounts.length === 0) {
            await this.prisma.post.update({ where: { id: post.id }, data: { status: 'failed' } });
            continue;
          }

          for (const acc of accounts) {
            try {
              const fbRes = await this.facebookService.postToPage(
                acc.platformId, acc.accessToken, actualContent, imageArray
              );
              if (fbRes && fbRes.id && post.productUrl) {
                  await this.facebookService.commentOnPost(fbRes.id, acc.accessToken, `🔗 Link mua sản phẩm: ${post.productUrl}`);
              }
            } catch (pageError: any) {
              this.logger.error(`❌ Lỗi Page [${acc.accountName}]: ${pageError.message}`);
            }
          }
          await this.prisma.post.update({ where: { id: post.id }, data: { status: 'published' } });

        } catch (error: any) {
          await this.prisma.post.update({ where: { id: post.id }, data: { status: 'failed' } });
        }
      }
    } finally {
      this.isCronRunning = false;
    }
  }
}