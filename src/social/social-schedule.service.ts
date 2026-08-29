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
      scheduledAt
    } = data;

    this.logger.log(`📥 Nhận lệnh lên lịch cho ${pageIds?.length || 0} pages.`);

    // Chuyển mảng ảnh thành chuỗi JSON Array 
    // (Định dạng: '["url1", "url2"]') để hàm postToPage xử lý được nhiều ảnh
    const imageString = imageUrls && imageUrls.length > 0 ? JSON.stringify(imageUrls) : '[]';

    for (const pageId of pageIds) {
      // Gói url ảnh và pageId vào Database
      const payload = JSON.stringify({
        image: imageString,
        pageId: pageId
      });

      await this.prisma.post.create({
        data: {
          content: baseContent,
          workspaceId: workspaceId,
          productUrl: productUrl || null,
          status: 'scheduled',
          createdAt: new Date(scheduledAt), 
          userId: payload 
        }
      });
      
      this.logger.log(`✅ Đã lưu lịch đăng cho Page ${pageId}`);
    }

    return {
      success: true,
      message: `Đã đưa ${pageIds.length} bài viết vào lịch chờ thành công!`
    };
  }

  // ========================================================
  // CRONJOB: TỰ ĐỘNG QUÉT VÀ ĐĂNG BÀI ĐÃ ĐẾN GIỜ
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
          let imageArray: string[] = []; // SỬA Ở ĐÂY: Khai báo là MẢNG
          let targetPageId = null;

          try {
            const parsed = JSON.parse(post.userId);
            // SỬA Ở ĐÂY: Giải mã lần nữa vì lúc lưu ta đã stringify 2 lần
            if (parsed.image !== undefined) {
               try {
                 imageArray = JSON.parse(parsed.image);
               } catch(e) {
                 imageArray = [];
               }
            }
            if (parsed.pageId) targetPageId = parsed.pageId;
          } catch (e) {
            imageArray = [];
          }

          const whereClause: any = { workspaceId: post.workspaceId };
          if (targetPageId) whereClause.platformId = targetPageId;

          const accounts = await this.prisma.socialAccount.findMany({
            where: whereClause,
          });

          if (accounts.length === 0) {
            await this.prisma.post.update({ where: { id: post.id }, data: { status: 'failed' } });
            continue;
          }

          for (const acc of accounts) {
            try {
              // TRUYỀN `imageArray` (đã là Mảng) SANG FACEBOOK SERVICE
              const fbRes = await this.facebookService.postToPage(
                acc.platformId,
                acc.accessToken,
                post.content,
                imageArray, 
              );

              const linkSanPham = post.productUrl; 
              if (fbRes && fbRes.id && linkSanPham) {
                  await this.facebookService.commentOnPost(fbRes.id, acc.accessToken, `🔗 Link mua sản phẩm tại đây: ${linkSanPham}`);
              }
            } catch (pageError: any) {
              this.logger.error(`❌ Lỗi tại Page [${acc.accountName}]: ${pageError.message}`);
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