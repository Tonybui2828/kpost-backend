import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma.service'; 

@Injectable()
export class FacebookService {
  // Sử dụng phiên bản API mới nhất của Facebook
  private readonly graphUrl = 'https://graph.facebook.com/v21.0'; 

  constructor(private readonly prisma: PrismaService) {}

  private clean(token: string): string {
    return token ? token.trim().replace(/\s/g, "") : "";
  }

  // ==========================================
  // 1. ĐỒNG BỘ TIN NHẮN (GIỮ NGUYÊN)
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
                workspaceId, platform: 'facebook', type: 'inbox',
                senderName: lastMsg.from?.name || "Khách hàng mới",
                senderId: lastMsg.from?.id || "",
                content: lastMsg.message, platformId: lastMsg.id,
                pageName: acc.accountName, createdAt: new Date(lastMsg.created_time)
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
  // 2. ĐĂNG BÀI (NÂNG CẤP ALBUM 10 ẢNH + AUTO COMMENT LINK)
  // ==========================================
  async postToPage(pageId: string, accessToken: string, message: string, imageUrls?: any, productUrl?: string): Promise<any> {
    const cleanToken = this.clean(accessToken);
    const images = Array.isArray(imageUrls) ? imageUrls : (imageUrls ? [imageUrls] : []);

    let resultId = "";

    try {
      // --- TRƯỜNG HỢP A: ĐĂNG NHIỀU ẢNH (ALBUM) ---
      if (images.length > 1) {
        console.log(`--- 📸 Đang tải lên Album ${images.length} ảnh ---`);
        
        // Bước 1: Upload từng ảnh lên Facebook ở chế độ tạm ẩn (published=false)
        const mediaIds = await Promise.all(
          images.map(async (url: string) => {
            const uploadRes = await axios.post(`${this.graphUrl}/${pageId}/photos`, {
              url: url.trim(),
              published: false,
              access_token: cleanToken,
            });
            return { media_fbid: uploadRes.data.id };
          })
        );

        // Bước 2: Tạo bài viết Feed và đính kèm danh sách ID ảnh đã upload
        const finalRes = await axios.post(`${this.graphUrl}/${pageId}/feed`, {
          message: message,
          attached_media: JSON.stringify(mediaIds),
          access_token: cleanToken,
        });
        resultId = finalRes.data.id;
      } 
      // --- TRƯỜNG HỢP B: ĐĂNG 1 ẢNH HOẶC VIDEO ---
      else if (images.length === 1) {
        const singleUrl = images[0];
        const isVideo = singleUrl.match(/\.(mp4|mov|avi|wmv)$/i);
        
        let url = `${this.graphUrl}/${pageId}/photos`;
        let payload: any = { url: singleUrl, caption: message, access_token: cleanToken };

        if (isVideo) {
          url = `${this.graphUrl}/${pageId}/videos`;
          payload = { file_url: singleUrl, description: message, access_token: cleanToken };
        }

        const response = await axios.post(url, payload);
        resultId = response.data.id;
      }
      // --- TRƯỜNG HỢP C: CHỈ ĐĂNG CHỮ ---
      else {
        const response = await axios.post(`${this.graphUrl}/${pageId}/feed`, {
          message: message,
          access_token: cleanToken,
        });
        resultId = response.data.id;
      }

      // --- BƯỚC QUAN TRỌNG: TỰ ĐỘNG CHÈN LINK VÀO COMMENT SAU KHI ĐĂNG ---
      if (resultId && productUrl) {
        console.log("--- 🔗 Đang tự động chèn link sản phẩm vào bình luận ---");
        await this.commentOnPost(resultId, cleanToken, `Chào bạn, bạn có thể xem chi tiết và mua sản phẩm tại đây nhé: ${productUrl} 😍🚀`);
      }

      return { id: resultId, status: 'success' };

    } catch (error) {
      console.error("❌ Lỗi xử lý Facebook:", error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Lỗi đăng bài lên Facebook');
    }
  }

  // ==========================================
  // 3. CÁC HÀM PHỤ TRỢ (GIỮ NGUYÊN)
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
      console.error("❌ Lỗi Auto Comment:", error.message);
      return null;
    }
  }
}