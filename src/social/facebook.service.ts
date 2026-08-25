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

  // ==========================================
  // 1. ĐỒNG BỘ TIN NHẮN
  // ==========================================
  async syncAllMessages(workspaceId: string) {
    try {
      const accounts = await this.prisma.socialAccount.findMany({ where: { workspaceId } });
      for (const acc of accounts) {
        const url = `${this.graphUrl}/${acc.platformId}/conversations?fields=messages{message,from,created_time},participants&access_token=${this.clean(acc.accessToken)}`;
        const response = await axios.get(url);
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
                senderName: lastMsg.from?.name || "Khách hàng mới",
                senderId: lastMsg.from?.id || "",
                content: lastMsg.message, 
                platformId: lastMsg.id,
                pageName: acc.accountName, 
                createdAt: new Date(lastMsg.created_time)
              }
            });
          }
        }
      }
      return { status: 'success', message: 'Đồng bộ hoàn tất!' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // ==========================================
  // 2. ĐĂNG BÀI FACEBOOK (CHUẨN 1 ẢNH & NHIỀU ẢNH)
  // ==========================================
  async postToPage(pageId: string, accessToken: string, message: string, imageUrls?: any, productUrl?: string): Promise<any> {
    const cleanToken = this.clean(accessToken);
    
    // Lọc danh sách link ảnh hợp lệ
    const rawImages = Array.isArray(imageUrls) ? imageUrls : (imageUrls ? [imageUrls] : []);
    const validImages = rawImages
      .filter((url: any) => typeof url === 'string' && url.trim().startsWith('http'))
      .map((url: string) => url.trim());

    let resultId = "";

    try {
      // ----------------------------------------------------
      // TRƯỜNG HỢP 1: ĐĂNG 1 ẢNH DUY NHẤT (POST PHOTO TRỰC TIẾP)
      // ----------------------------------------------------
      if (validImages.length === 1) {
        this.logger.log(`--- 📸 [Page: ${pageId}] Đang đăng bài kèm 1 ảnh đơn ---`);
        const photoRes = await axios.post(`${this.graphUrl}/${pageId}/photos`, {
          url: validImages[0],
          caption: message,
          published: true,
          access_token: cleanToken,
        });
        resultId = photoRes.data?.post_id || photoRes.data?.id;
      } 
      // ----------------------------------------------------
      // TRƯỜNG HỢP 2: ĐĂNG TỪ 2 ẢNH TRỞ LÊN (ALBUM POST)
      // ----------------------------------------------------
      else if (validImages.length > 1) {
        this.logger.log(`--- 📸 [Page: ${pageId}] Đang xử lý đăng Album kèm ${validImages.length} ảnh ---`);
        
        // Bước A: Tải từng ảnh lên Facebook ở trạng thái tạm (published=false)
        const mediaObjects = [];
        for (const imgUrl of validImages) {
          try {
            const uploadRes = await axios.post(`${this.graphUrl}/${pageId}/photos`, {
              url: imgUrl,
              published: false,
              access_token: cleanToken,
            });
            if (uploadRes.data?.id) {
              mediaObjects.push({ media_fbid: uploadRes.data.id });
            }
          } catch (uploadErr) {
            this.logger.error(`Lỗi tải ảnh (${imgUrl}): ${uploadErr.response?.data?.error?.message || uploadErr.message}`);
          }
        }

        if (mediaObjects.length === 0) {
          throw new Error('Không thể tải bất kỳ hình ảnh nào lên Facebook Server');
        }

        // Bước B: Đăng bài viết Feed gắn kèm mảng attached_media chuẩn JSON Array
        const feedRes = await axios.post(`${this.graphUrl}/${pageId}/feed`, {
          message: message,
          attached_media: mediaObjects, // MẢNG OBJECT CHUẨN (KHÔNG DÙNG JSON.stringify)
          access_token: cleanToken,
        });
        resultId = feedRes.data?.id;
      } 
      // ----------------------------------------------------
      // TRƯỜNG HỢP 3: CHỈ ĐĂNG VĂN BẢN (KHÔNG ẢNH)
      // ----------------------------------------------------
      else {
        this.logger.log(`--- 📝 [Page: ${pageId}] Đang đăng bài dạng chữ (không ảnh) ---`);
        const feedRes = await axios.post(`${this.graphUrl}/${pageId}/feed`, {
          message: message,
          access_token: cleanToken,
        });
        resultId = feedRes.data?.id;
      }

      // --- TỰ ĐỘNG CHÈN LINK VÀO BÌNH LUẬN ---
      if (resultId && productUrl) {
        this.logger.log(`--- 🔗 Auto comment link mua hàng vào post ${resultId} ---`);
        await this.commentOnPost(resultId, cleanToken, `Dạ em gửi mình link xem chi tiết và đặt hàng tại đây nhé: ${productUrl} 😍🚀`);
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