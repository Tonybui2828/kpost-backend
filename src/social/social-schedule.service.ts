import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { FacebookService } from './facebook.service';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class SocialScheduleService {
  private readonly logger = new Logger(SocialScheduleService.name);
  private isCronRunning = false;

  constructor(
    private prisma: PrismaService,
    private facebookService: FacebookService,
  ) {}

  // --- HÀM TỰ ĐỘNG XÀO NỘI DUNG (SPIN) BẰNG AI ---
  private async spinText(text: string): Promise<string> {
    try {
      // 1. Trộn văn bản thủ công (Cú pháp Spintax: {A|B|C})
      let spinned = text.replace(/\{([^{}]*)\}/g, (match, choices) => {
        const options = choices.split('|');
        return options[Math.floor(Math.random() * options.length)];
      });

      // 2. Dùng AI xào lại nội dung (Nếu hệ thống có gắn key Gemini)
      if (process.env.GEMINI_API_KEY) {
         const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
         const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Hãy đóng vai một chuyên gia Marketing. Viết lại bài đăng Facebook sau bằng tiếng Việt sao cho mới mẻ, văn phong khác đi một chút, giữ nguyên các icon emoji và CỰC KỲ QUAN TRỌNG là giữ nguyên các đường link mua hàng. Không thêm thông tin bịa đặt:\n\n${spinned}`
         });
         if (response.text) return response.text;
      }
      return spinned;
    } catch(e) {
      this.logger.error("Lỗi Spin content:", e.message);
      return text;
    }
  }

  // ========================================================
  // XỬ LÝ NHẬN LỆNH LÊN LỊCH TỪ FRONTEND
  // ========================================================
  async handleBatchSchedule(data: any) {
    const { 
      workspaceId, 
      baseContent, 
      pageIds, 
      imageUrls, 
      productUrl, 
      scheduledAt,
      spinContent // Cờ hiệu Spin từ Frontend gửi lên
    } = data;

    const validImages = Array.isArray(imageUrls) ? imageUrls : [];

    for (const pageId of pageIds) {
      // BẮT ĐẦU SPIN NỘI DUNG NẾU ĐƯỢC YÊU CẦU
      let finalContent = baseContent;
      if (spinContent) {
         this.logger.log(`🌀 Đang Spin AI tạo nội dung độc nhất cho Page ${pageId}...`);
         finalContent = await this.spinText(baseContent);
      }

      const metaPayload = JSON.stringify({
        images: validImages,
        pageId: pageId
      });

      const contentWithMeta = `${finalContent}\n\n[KPOST_META]${metaPayload}[/KPOST_META]`;

      await this.prisma.post.create({
        data: {
          content: contentWithMeta,
          workspaceId: workspaceId,
          productUrl: productUrl || null,
          status: 'scheduled',
          createdAt: new Date(scheduledAt), 
          userId: 'batch-post' 
        }
      });
    }

    return {
      success: true,
      message: `Đã đưa ${pageIds.length} bài viết vào lịch chờ thành công!`
    };
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