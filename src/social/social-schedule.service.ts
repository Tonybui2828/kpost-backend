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

    // 1. Đóng gói Meta Data (Ảnh và PageId)
    const metaPayload = JSON.stringify({
      images: imageUrls || [],
      pageId: pageId
    });

    for (const pageId of pageIds) {
      // 2. GIẤU METADATA VÀO CUỐI BÀI VIẾT BẰNG THẺ [KPOST_META]
      // Cột content là kiểu TEXT (vô hạn ký tự) nên sẽ không bao giờ bị cắt cụt.
      const contentWithMeta = `${baseContent}\n\n[KPOST_META]${JSON.stringify({ images: imageUrls || [], pageId })}[/KPOST_META]`;

      await this.prisma.post.create({
        data: {
          content: contentWithMeta, // Lưu nội dung kèm thẻ ẩn
          workspaceId: workspaceId,
          productUrl: productUrl || null,
          status: 'scheduled',
          createdAt: new Date(scheduledAt), 
          userId: 'batch-post' // Bỏ, không dùng cột này lưu data nữa
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
          let actualContent = post.content;
          let imageArray: string[] = [];
          let targetPageId = null;

          // 3. BÓC TÁCH THẺ [KPOST_META] RA KHỎI NỘI DUNG
          const metaMatch = actualContent.match(/\[KPOST_META\](.*?)\[\/KPOST_META\]/s);
          
          if (metaMatch && metaMatch[1]) {
            try {
              const meta = JSON.parse(metaMatch[1]);
              imageArray = meta.images || [];
              targetPageId = meta.pageId || null;
              
              // Xóa sạch đoạn Meta đi để nội dung gửi lên FB hoàn toàn sạch sẽ
              actualContent = actualContent.replace(metaMatch[0], '').trim();
            } catch(e) {
              this.logger.error(`Lỗi giải mã Meta: ${e.message}`);
            }
          }

          // Lọc tài khoản đích
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
              this.logger.log(`🚀 Chuyển ${imageArray.length} ảnh sang FB Service...`);
              
              // 4. GỬI NỘI DUNG SẠCH VÀ MẢNG ẢNH SANG FACEBOOK
              const fbRes = await this.facebookService.postToPage(
                acc.platformId,
                acc.accessToken,
                actualContent, // Nội dung đã gọt bỏ Meta
                imageArray,    // Mảng link ảnh thật
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