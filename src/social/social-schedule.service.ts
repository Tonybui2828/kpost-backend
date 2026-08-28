import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { FacebookService } from './facebook.service';

@Injectable()
export class SocialScheduleService {
  private readonly logger = new Logger(SocialScheduleService.name);
  
  // BỔ SUNG: Cờ khóa luồng (Lock) để tránh các đợt Cronjob chạy đè lên nhau
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
      scheduledAt, 
      spinContent 
    } = data;

    this.logger.log(`📥 Nhận lệnh lên lịch cho ${pageIds?.length || 0} pages. Thời gian: ${scheduledAt}`);

    const firstImageUrl = imageUrls && imageUrls.length > 0 ? imageUrls[0] : "";

    for (const pageId of pageIds) {
      let finalContent = baseContent;

      if (spinContent) {
         this.logger.debug(`Spin Content tạm tắt, sử dụng nội dung gốc cho Page ID: ${pageId}...`);
      }

      // LƯU Ý QUAN TRỌNG:
      // Lưu gộp cả URL ảnh và ID của Page vào một chuỗi JSON ở cột userId. 
      // Việc này giúp Cronjob biết chính xác TỪNG BÀI VIẾT thuộc về TỪNG FANPAGE cụ thể.
      const payload = JSON.stringify({
        image: firstImageUrl,
        pageId: pageId
      });

      await this.prisma.post.create({
        data: {
          content: finalContent,
          workspaceId: workspaceId,
          productUrl: productUrl || null,
          status: 'scheduled',
          createdAt: new Date(scheduledAt), 
          userId: payload // Gắn payload chứa pageId vào đây
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
    // CHỐT CHẶN 1: Nếu cronjob phút trước vẫn đang kẹt (do Facebook API chậm), bỏ qua phút này!
    if (this.isCronRunning) {
      this.logger.warn('⚠️ Cronjob trước chưa chạy xong, bỏ qua lượt này để tránh đăng trùng lặp...');
      return;
    }

    this.isCronRunning = true; // Khóa luồng
    
    try {
      const now = new Date();

      const pendingPosts = await this.prisma.post.findMany({
        where: {
          status: 'scheduled',
          createdAt: { lte: now },
        },
      });

      if (pendingPosts.length === 0) {
        this.isCronRunning = false;
        return;
      }

      this.logger.debug(`--- 🔍 Tìm thấy ${pendingPosts.length} bài viết chờ đăng... ---`);

      // CHỐT CHẶN 2: Lập tức chuyển toàn bộ sang 'processing' để không bị quét lại
      await this.prisma.post.updateMany({
        where: { id: { in: pendingPosts.map(p => p.id) } },
        data: { status: 'processing' }
      });

      for (const post of pendingPosts) {
        try {
          this.logger.log(`🚀 Bắt đầu xử lý bài đăng [ID: ${post.id}]`);

          let imageUrl = post.userId || '';
          let targetPageId = null;

          // Giải mã dữ liệu (Lấy URL ảnh và ID của Fanpage mục tiêu)
          try {
            const parsed = JSON.parse(post.userId);
            if (parsed.image !== undefined) imageUrl = parsed.image;
            if (parsed.pageId) targetPageId = parsed.pageId;
          } catch (e) {
            // Tương thích ngược với các bài viết cũ (nếu có)
            imageUrl = post.userId || '';
          }

          // CHỐT CHẶN 3: Chỉ tìm ĐÚNG Fanpage có ID là targetPageId
          const whereClause: any = { workspaceId: post.workspaceId };
          if (targetPageId) {
            whereClause.platformId = targetPageId;
          }

          const accounts = await this.prisma.socialAccount.findMany({
            where: whereClause,
          });

          if (accounts.length === 0) {
            this.logger.warn(`⚠️ Không tìm thấy Fanpage hợp lệ cho bài đăng ${post.id}.`);
            await this.prisma.post.update({
              where: { id: post.id },
              data: { status: 'failed' },
            });
            continue;
          }

          // Đăng bài (Lúc này accounts.length luôn bằng 1 nếu là đăng từ schedule-batch)
          for (const acc of accounts) {
            try {
              const fbRes = await this.facebookService.postToPage(
                acc.platformId,
                acc.accessToken,
                post.content,
                imageUrl, 
              );

              this.logger.log(`✅ Đăng bài thành công lên Page: ${acc.accountName}`);

              const linkSanPham = post.productUrl; 
              if (fbRes && fbRes.id && linkSanPham) {
                  const commentMessage = `🔗 Link mua sản phẩm tại đây: ${linkSanPham}`;
                  await this.facebookService.commentOnPost(fbRes.id, acc.accessToken, commentMessage);
              }
            } catch (pageError: any) {
              this.logger.error(`❌ Lỗi tại Page [${acc.accountName}]: ${pageError.message}`);
            }
          }

          // Đánh dấu hoàn tất
          await this.prisma.post.update({
            where: { id: post.id },
            data: { status: 'published' },
          });

        } catch (error: any) {
          this.logger.error(`❌ Lỗi hệ thống bài đăng ${post.id}:`, error.message);
          // Gặp lỗi nặng thì trả về trạng thái failed
          await this.prisma.post.update({
            where: { id: post.id },
            data: { status: 'failed' },
          });
        }
      }
    } finally {
      // Mở khóa luồng sau khi chạy xong toàn bộ
      this.isCronRunning = false;
    }
  }
}