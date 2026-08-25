import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { FacebookService } from './facebook.service';
// BỔ SUNG: Inject AiContentService để Spin bài viết
import { AiContentService } from '../ai-content/ai-content.service';

@Injectable()
export class SocialScheduleService {
  private readonly logger = new Logger(SocialScheduleService.name);

  constructor(
    private prisma: PrismaService,
    private facebookService: FacebookService,
    // BỔ SUNG
    private aiContentService: AiContentService,
  ) {}

  // ========================================================
  // [MỚI THÊM] XỬ LÝ NHẬN LỆNH LÊN LỊCH & SPIN TỪ FRONTEND
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

    // Dùng imageUrl đầu tiên làm đại diện tạm (tuỳ logic hệ thống cũ của bạn)
    const firstImageUrl = imageUrls && imageUrls.length > 0 ? imageUrls[0] : "";

    // Duyệt qua từng Fanpage để lưu lịch đăng (và spin nếu có bật)
    for (const pageId of pageIds) {
      let finalContent = baseContent;

      // 1. Tự động viết lại nội dung (Spin Content) nếu khách bật tính năng Tránh Spam
      if (spinContent) {
        try {
           this.logger.debug(`🤖 Đang dùng AI viết lại nội dung cho Page ID: ${pageId}...`);
           // Dùng AI sửa lại content (Sử dụng prompt spin cơ bản)
           // Lưu ý: AiContentService phải có sẵn hàm để gọi. Nếu bạn chưa có hàm spin, có thể dùng tạm hàm generate
           const promptSpin = `Hãy viết lại nội dung bán hàng sau đây theo một văn phong khác (không thay đổi thông tin sản phẩm, giá cả nếu có). Hãy làm cho nó tự nhiên, thêm bớt icon một chút để tránh thuật toán spam trùng lặp bài của Facebook. Nội dung gốc:\n\n${baseContent}`;
           
           // Thay 'userId' tạm thời bằng 'system' vì đây là chạy ngầm
           const aiResult = await this.aiContentService.generateContent({ prompt: promptSpin, userId: 'system', workspaceId });
           
           if (aiResult && aiResult.content) {
             finalContent = aiResult.content;
           }
        } catch (err) {
           this.logger.error(`❌ Spin Content cho Page ${pageId} thất bại, dùng nội dung gốc. Lỗi: ${err.message}`);
           // Nếu AI lỗi, vẫn dùng baseContent gốc để không làm gián đoạn lịch đăng
           finalContent = baseContent;
        }
      }

      // 2. Lưu vào Database (Bảng Post) chờ đến giờ đăng
      // Cấu trúc đang làm theo chuẩn cũ của bạn (Lưu imageUrl vào trường userId)
      await this.prisma.post.create({
        data: {
          content: finalContent,
          workspaceId: workspaceId,
          productUrl: productUrl || null,
          status: 'scheduled',
          createdAt: new Date(scheduledAt), 
          userId: firstImageUrl // <- Lưu tạm image vào userId như hàm schedule cũ của bạn
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
              post.userId || '', // URL ảnh (đang lưu tạm trong userId)
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