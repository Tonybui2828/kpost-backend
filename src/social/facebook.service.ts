import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma.service'; 

@Injectable()
export class FacebookService {
  private readonly logger = new Logger(FacebookService.name);
  private readonly graphUrl = 'https://graph.facebook.com/v21.0'; 

  constructor(private readonly prisma: PrismaService) {}

  private clean(token: string): string {
    return token ? token.trim().replace(/\s/g, "") : "";
  }

  // Hàm phụ: Kiểm tra xem link có phải là Video không
  private isVideo(url: string): boolean {
    return url.match(/\.(mp4|mov|webm|mkv)(\?.*)?$/i) !== null;
  }

  // ==========================================
  // 1. ĐỒNG BỘ TIN NHẮN & BÌNH LUẬN
  // ==========================================
  async syncAllMessages(workspaceId: string) {
    try {
      const accounts = await this.prisma.socialAccount.findMany({ where: { workspaceId } });
      
      for (const acc of accounts) {
        const cleanToken = this.clean(acc.accessToken);

        // --- A. QUÉT INBOX (TIN NHẮN) ---
        try {
          const inboxUrl = `${this.graphUrl}/${acc.platformId}/conversations?fields=messages{message,from,created_time},participants&access_token=${cleanToken}`;
          const response = await axios.get(inboxUrl);
          const conversations = response.data.data || [];
          
          for (const conv of conversations) {
            const lastMsg = conv.messages?.data[0];
            if (lastMsg && lastMsg.from?.id !== acc.platformId) {
              await this.prisma.inboxMessage.upsert({
                where: { platformId: lastMsg.id },
                update: { content: lastMsg.message },
                create: {
                  workspaceId, 
                  platform: 'facebook', 
                  type: 'inbox',
                  senderName: lastMsg.from?.name || "Khách hàng",
                  senderId: lastMsg.from?.id || "",
                  content: lastMsg.message, 
                  platformId: lastMsg.id,
                  pageName: acc.accountName, 
                  createdAt: new Date(lastMsg.created_time)
                }
              });
            }
          }
        } catch (e) { 
          this.logger.error(`Lỗi quét Inbox Page ${acc.accountName}`); 
        }

        // --- B. QUÉT COMMENTS (BÌNH LUẬN) ---
        try {
          // Lấy danh sách bài đăng và bình luận của bài đăng đó
          const feedUrl = `${this.graphUrl}/${acc.platformId}/feed?fields=comments{id,message,from,created_time}&access_token=${cleanToken}`;
          const feedRes = await axios.get(feedUrl);
          const posts = feedRes.data.data || [];

          for (const post of posts) {
            if (post.comments && post.comments.data) {
              for (const comment of post.comments.data) {
                // CHẶN BÌNH LUẬN RÁC: Chỉ lưu bình luận nếu ID người gửi KHÁC với ID của Page
                if (comment.from?.id !== acc.platformId && comment.from?.name !== acc.accountName) {
                  await this.prisma.inboxMessage.upsert({
                    where: { platformId: comment.id },
                    update: { content: comment.message },
                    create: {
                      workspaceId,
                      platform: 'facebook',
                      type: 'comment',
                      senderName: comment.from?.name || "Khách hàng",
                      senderId: comment.from?.id || "",
                      content: comment.message,
                      platformId: comment.id,
                      pageName: acc.accountName,
                      createdAt: new Date(comment.created_time)
                    }
                  });
                }
              }
            }
          }
        } catch (e) { 
          this.logger.error(`Lỗi quét Comments Page ${acc.accountName}`); 
        }
      }
      return { status: 'success', message: 'Đồng bộ Tin nhắn & Bình luận hoàn tất!' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // ==========================================
  // 2. ĐĂNG BÀI FACEBOOK (CHUẨN 1 ẢNH / 1 VIDEO / NHIỀU ẢNH)
  // ==========================================
  async postToPage(pageId: string, accessToken: string, message: string, imageUrls?: any, productUrl?: string): Promise<any> {
    const cleanToken = this.clean(accessToken);
    
    // Lọc danh sách link ảnh/video hợp lệ
    const rawImages = Array.isArray(imageUrls) ? imageUrls : (imageUrls ? [imageUrls] : []);
    const validMediaUrls = rawImages
      .filter((url: any) => typeof url === 'string' && url.trim().startsWith('http'))
      .map((url: string) => url.trim());

    let resultId = "";

    try {
      // ----------------------------------------------------
      // TRƯỜNG HỢP 1: ĐĂNG 1 VIDEO DUY NHẤT (REELS/VIDEO POST)
      // ----------------------------------------------------
      if (validMediaUrls.length === 1 && this.isVideo(validMediaUrls[0])) {
        this.logger.log(`--- 🎥 [Page: ${pageId}] Đang đăng Video / Reels ---`);
        const videoRes = await axios.post(`${this.graphUrl}/${pageId}/videos`, {
          file_url: validMediaUrls[0], 
          description: message,        
          published: true,
          access_token: cleanToken,
        });
        resultId = videoRes.data?.post_id || videoRes.data?.id;
      }
      // ----------------------------------------------------
      // TRƯỜNG HỢP 2: ĐĂNG 1 ẢNH DUY NHẤT
      // ----------------------------------------------------
      else if (validMediaUrls.length === 1 && !this.isVideo(validMediaUrls[0])) {
        this.logger.log(`--- 📸 [Page: ${pageId}] Đang đăng bài kèm 1 ảnh đơn ---`);
        const photoRes = await axios.post(`${this.graphUrl}/${pageId}/photos`, {
          url: validMediaUrls[0],
          caption: message,
          published: true,
          access_token: cleanToken,
        });
        resultId = photoRes.data?.post_id || photoRes.data?.id;
      } 
      // ----------------------------------------------------
      // TRƯỜNG HỢP 3: ĐĂNG TỪ 2 MEDIA TRỞ LÊN (ALBUM ẢNH)
      // ----------------------------------------------------
      else if (validMediaUrls.length > 1) {
        this.logger.log(`--- 📸 [Page: ${pageId}] Đang xử lý đăng Album kèm ${validMediaUrls.length} file ---`);
        
        const mediaObjects = [];
        for (const mediaUrl of validMediaUrls) {
          if (this.isVideo(mediaUrl)) {
             this.logger.warn(`⚠ Facebook Album API hiện không hỗ trợ gộp Video. Đã bỏ qua file video: ${mediaUrl}`);
             continue; 
          }
          try {
            const uploadRes = await axios.post(`${this.graphUrl}/${pageId}/photos`, {
              url: mediaUrl,
              published: false,
              access_token: cleanToken,
            });
            if (uploadRes.data?.id) {
              mediaObjects.push({ media_fbid: uploadRes.data.id });
            }
          } catch (uploadErr) {
            this.logger.error(`Lỗi tải ảnh (${mediaUrl}): ${uploadErr.response?.data?.error?.message || uploadErr.message}`);
          }
        }

        if (mediaObjects.length === 0) {
          throw new Error('Không thể tải bất kỳ hình ảnh nào hợp lệ lên Facebook Server');
        }

        const feedRes = await axios.post(`${this.graphUrl}/${pageId}/feed`, {
          message: message,
          attached_media: mediaObjects,
          access_token: cleanToken,
        });
        resultId = feedRes.data?.id;
      } 
      // ----------------------------------------------------
      // TRƯỜNG HỢP 4: CHỈ ĐĂNG VĂN BẢN (KHÔNG CÓ MEDIA)
      // ----------------------------------------------------
      else {
        this.logger.log(`--- 📝 [Page: ${pageId}] Đang đăng bài dạng chữ (không đính kèm) ---`);
        const feedRes = await axios.post(`${this.graphUrl}/${pageId}/feed`, {
          message: message,
          access_token: cleanToken,
        });
        resultId = feedRes.data?.id;
      }

      // --- TỰ ĐỘNG CHÈN LINK VÀO BÌNH LUẬN ---
      if (resultId && productUrl) {
        this.logger.log(`--- 🔗 Auto comment link mua hàng vào post ${resultId} ---`);
        await this.commentOnPost(resultId, cleanToken, `🔗 Link mua sản phẩm: ${productUrl}`);
      }

      return { id: resultId, status: 'success' };

    } catch (error) {
      const errorDetail = error.response?.data?.error?.message || error.message;
      this.logger.error(`❌ Lỗi Facebook Graph API: ${errorDetail}`);
      throw new Error(errorDetail);
    }
  }

  // ==========================================
  // 3. CÁC HÀM PHỤ TRỢ
  // ==========================================
  async sendReply(pageId: string, accessToken: string, recipientId: string, text: string): Promise<any> {
    const url = `${this.graphUrl}/${pageId}/messages`;
    const payload = {
      recipient: { id: recipientId.trim() },
      message: { text: text },
      access_token: this.clean(accessToken)
    };
    return (await axios.post(url, payload)).data;
  }

  async replyToComment(commentId: string, accessToken: string, text: string): Promise<any> {
    const url = `${this.graphUrl}/${commentId}/comments`;
    return (await axios.post(url, { message: text }, { params: { access_token: this.clean(accessToken) } })).data;
  }

  async commentOnPost(postId: string, accessToken: string, message: string): Promise<any> {
    const url = `${this.graphUrl}/${postId}/comments`;
    try {
      return (await axios.post(url, { message: message, access_token: this.clean(accessToken) })).data;
    } catch (error) {
      this.logger.error(`❌ Lỗi Auto Comment: ${error.message}`);
      return null;
    }
  }
}