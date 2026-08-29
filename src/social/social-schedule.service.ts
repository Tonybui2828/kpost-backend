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
  // 1. XỬ LÝ NHẬN LỆNH LÊN LỊCH TỪ FRONTEND
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

    // Đảm bảo imageUrls luôn là một mảng
    const validImages = Array.isArray(imageUrls) ? imageUrls : [];

    for (const pageId of pageIds) {
      // Đưa phần tạo Meta vào TRONG vòng lặp để biến pageId tồn tại
      const metaPayload = JSON.stringify({
        images: validImages,
        pageId: pageId
      });

      // Giấu mảng ảnh và ID page vào cuối nội dung bài viết bằng thẻ ẩn
      const contentWithMeta = `${baseContent}\n\n[KPOST_META]${metaPayload}[/KPOST_META]`;

      await this.prisma.post.create({
        data: {
          content: contentWithMeta,
          workspaceId: workspaceId,
          productUrl: productUrl || null,
          status: 'scheduled',
          createdAt: new Date(scheduledAt), 
          userId: 'batch-post' // Bỏ cột này, không dùng để lưu JSON dài nữa
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
  // 2. CRONJOB: TỰ ĐỘNG QUÉT VÀ ĐĂNG BÀI ĐÃ ĐẾN GIỜ
  // ========================================================
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    if (this.isCronRunning) return;
    this.isCronRunning = true; 
    
    try {
      const now = new Date();

      const pendingPosts = await this.prisma.post.findMany({
        where: { 
          status: 'scheduled', 
          createdAt: { lte: now } 
        },
      });

      if (pendingPosts.length === 0) {
        this.isCronRunning = false;
        return;
      }

      // Khóa các bài viết đang xử lý
      await this.prisma.post.updateMany({
        where: { id: { in: pendingPosts.map(p => p.id) } },
        data: { status: 'processing' }
      });

      for (const post of pendingPosts) {
        try {
          let actualContent = post.content || '';
          let imageArray: string[] = [];
          let targetPageId: string | null = null;

          // BÓC TÁCH THẺ [KPOST_META] RA KHỎI NỘI DUNG
          const metaMatch = actualContent.match(/\[KPOST_META\](.*?)\[\/KPOST_META\]/s);
          
          if (metaMatch && metaMatch[1]) {
            try {
              const meta = JSON.parse(metaMatch[1]);
              imageArray = meta.images || [];
              targetPageId = meta.pageId || null;
              
              // Xóa thẻ ẩn đi để trả lại nội dung sạch sẽ đăng lên Facebook
              actualContent = actualContent.replace(metaMatch[0], '').trim();
            } catch(e) {
              this.logger.error(`Lỗi giải mã JSON từ thẻ Meta: ${e.message}`);
            }
          } else {
             // Fallback cứu hộ cho các bài cũ (nếu có lưu ảnh trong userId từ đợt test trước)
             try {
                if (post.userId && post.userId.startsWith('[')) {
                    imageArray = JSON.parse(post.userId);
                } else if (post.userId && post.userId.startsWith('{')) {
                    const parsed = JSON.parse(post.userId);
                    imageArray = parsed.images ? parsed.images : [];
                    targetPageId = parsed.pageId || null;
                } else if (post.userId && post.userId !== 'batch-post') {
                    imageArray = [post.userId];
                }
             } catch (e) {
                // Ignore fallback error
             }
          }

          // Lọc chính xác Fanpage
          const whereClause: any = { workspaceId: post.workspaceId };
          if (targetPageId) {
            whereClause.platformId = targetPageId;
          }

          const accounts = await this.prisma.socialAccount.findMany({
            where: whereClause,
          });

          if (accounts.length === 0) {
            await this.prisma.post.update({ 
              where: { id: post.id }, 
              data: { status: 'failed' } 
            });
            continue;
          }

          // Tiến hành đăng bài lên Facebook
          for (const acc of accounts) {
            try {
              this.logger.log(`🚀 Chuyển ${imageArray.length} ảnh sang FB Service cho Page: ${acc.accountName}...`);
              
              const fbRes = await this.facebookService.postToPage(
                acc.platformId,
                acc.accessToken,
                actualContent, 
                imageArray,    
              );

              // Auto comment link sản phẩm nếu có
              const linkSanPham = post.productUrl; 
              if (fbRes && fbRes.id && linkSanPham) {
                  await this.facebookService.commentOnPost(
                    fbRes.id, 
                    acc.accessToken, 
                    `🔗 Link mua sản phẩm tại đây: ${linkSanPham}`
                  );
              }
            } catch (pageError: any) {
              this.logger.error(`❌ Lỗi tại Page [${acc.accountName}]: ${pageError.message}`);
            }
          }

          // Đánh dấu bài viết đã đăng thành công
          await this.prisma.post.update({ 
            where: { id: post.id }, 
            data: { status: 'published' } 
          });

        } catch (error: any) {
          this.logger.error(`❌ Lỗi hệ thống bài đăng ${post.id}:`, error.message);
          await this.prisma.post.update({ 
            where: { id: post.id }, 
            data: { status: 'failed' } 
          });
        }
      }
    } finally {
      this.isCronRunning = false;
    }
  }
}