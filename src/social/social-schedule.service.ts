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
              post.userId || '', // URL ảnh AI
            );

            this.logger.log(`✅ Đăng bài thành công lên Page: ${acc.accountName}`);

            // B. TỰ ĐỘNG CHÈN LINK VÀO BÌNH LUẬN (IMAGE-LINK-COMMENT)
            // Lấy trực tiếp từ trường productUrl trong bản ghi Post
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

          } catch (pageError) {
            this.logger.error(`❌ Lỗi tại Page [${acc.accountName}]: ${pageError.message}`);
          }
        }

        // 4. Đánh dấu hoàn tất
        await this.prisma.post.update({
          where: { id: post.id },
          data: { status: 'published' },
        });

        this.logger.log(`🎉 Nhiệm vụ hoàn tất cho bài đăng: ${post.id}`);

      } catch (error) {
        this.logger.error(`❌ Lỗi hệ thống bài đăng ${post.id}:`, error.message);
      }
    }
  }
}