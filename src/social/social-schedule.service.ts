import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { FacebookService } from './facebook.service';

@Injectable()
export class SocialScheduleService {
  private readonly logger = new Logger(SocialScheduleService.name);

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
      scheduledAt, 
      spinContent 
    } = data;

    this.logger.log(`📥 Nhận lệnh lên lịch cho ${pageIds.length} pages. Thời gian: ${scheduledAt}`);

    // Dùng imageUrl đầu tiên làm đại diện tạm
    const firstImageUrl = imageUrls && imageUrls.length > 0 ? imageUrls[0] : "";

    // Duyệt qua từng Fanpage để lưu lịch đăng
    for (const pageId of pageIds) {
      let finalContent = baseContent;

      // TODO: (Sau này) Bổ sung logic Spin bằng AI ở đây nếu cần.
      // Hiện tại nếu bật Spin, tạm thời dùng nội dung gốc để tránh lỗi biên dịch.
      if (spinContent) {
         this.logger.debug(`Spin Content tạm tắt, sử dụng nội dung gốc cho Page ID: ${pageId}...`);
      }

      // Lưu vào Database (Bảng Post) chờ đến giờ đăng
      await this.prisma.post.create({
        data: {
          content: finalContent,
          workspaceId: workspaceId,
          productUrl: productUrl || null,
          status: 'scheduled',
          createdAt: new Date(scheduledAt), 
          userId: firstImageUrl 
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
    this.logger.debug('--- 🔍 Đang quét danh sách bài viết chờ đăng... ---');

    const now = new Date();

    // 1. Lấy danh sách bài viết trạng thái 'scheduled' đã đến giờ đăng
    const pendingPosts = await this.prisma.post.findMany({
      where: {
        status: 'scheduled',
        createdAt: { lte: now },
      },
    });

    if (pendingPosts.length === 0) return;

    for (const post of pendingPosts) {
      try {
        this.logger.log(`🚀 Bắt đầu đăng bài theo lịch [ID: ${post.id}]`);

        // 2. Lấy danh sách Fanpage của Workspace
        const accounts = await this.prisma.socialAccount.findMany({
          where: { workspaceId: post.workspaceId },
        });

        if (accounts.length === 0) {
          this.logger.warn(`⚠️ Không tìm thấy Fanpage cho bài đăng ${post.id}.`);
          await this.prisma.post.update({
            where: { id: post.id },
            data: { status: 'failed' },
          });
          continue;
        }

        // 3. Đăng lên từng Fanpage và tự động comment link
        for (const acc of accounts) {
          try {
            // A. ĐĂNG BÀI CHÍNH
            const fbRes = await this.facebookService.postToPage(
              acc.platformId,
              acc.accessToken,
              post.content,
              post.userId || '', 
            );

            this.logger.log(`✅ Đăng bài thành công lên Page: ${acc.accountName}`);

            // B. TỰ ĐỘNG CHÈN LINK VÀO BÌNH LUẬN (IMAGE-LINK-COMMENT)
            const linkSanPham = post.productUrl; 
            
            if (fbRes && fbRes.id && linkSanPham) {
                const commentMessage = `🔗 Link mua sản phẩm tại đây: ${linkSanPham}`;
                
                await this.facebookService.commentOnPost(
                    fbRes.id, 
                    acc.accessToken, 
                    commentMessage
                );
                this.logger.log(`💬 Đã tự động rải link comment cho: ${acc.accountName}`);
            }

          } catch (pageError: any) {
            this.logger.error(`❌ Lỗi tại Page [${acc.accountName}]: ${pageError.message}`);
          }
        }

        // 4. Đánh dấu hoàn tất
        await this.prisma.post.update({
          where: { id: post.id },
          data: { status: 'published' },
        });

        this.logger.log(`🎉 Nhiệm vụ hoàn tất cho bài đăng: ${post.id}`);

      } catch (error: any) {
        this.logger.error(`❌ Lỗi hệ thống bài đăng ${post.id}:`, error.message);
      }
    }
  }
}