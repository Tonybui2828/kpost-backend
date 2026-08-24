import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma.service'; 

@Injectable()
export class FacebookService {
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
  // 2. ĐĂNG BÀI (ĐÃ NÂNG CẤP ĐĂNG NHIỀU ẢNH)
  // ==========================================
  async postToPage(pageId: string, accessToken: string, message: string, imageUrls?: any): Promise<any> {
    const cleanToken = this.clean(accessToken);
    
    // Chuyển đổi đầu vào thành mảng nếu là chuỗi đơn
    const images = Array.isArray(imageUrls) ? imageUrls : (imageUrls ? [imageUrls] : []);

    // --- TRƯỜNG HỢP A: ĐĂNG NHIỀU ẢNH (TỪ 2 ĐẾN 10 ẢNH) ---
    if (images.length > 1) {
      try {
        console.log(`--- 📸 Đang xử lý đăng Album ${images.length} ảnh ---`);
        
        // 1. Upload từng ảnh lên Facebook ở chế độ "tạm ẩn" (published=false) để lấy ID
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

        // 2. Tạo bài viết Feed và gắn toàn bộ ID ảnh vào Album
        const finalRes = await axios.post(`${this.graphUrl}/${pageId}/feed`, {
          message: message,
          attached_media: JSON.stringify(mediaIds),
          access_token: cleanToken,
        });

        return finalRes.data;
      } catch (error) {
        throw new Error(error.response?.data?.error?.message || 'Lỗi đăng nhiều ảnh');
      }
    }

    // --- TRƯỜNG HỢP B: ĐĂNG 1 ẢNH HOẶC 1 VIDEO (LOGIC CŨ) ---
    const singleUrl = images[0] || "";
    const isVideo = singleUrl.match(/\.(mp4|mov|avi|wmv)$/i);
    const isImage = singleUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);

    let url = `${this.graphUrl}/${pageId}/feed`;
    const payload: any = { access_token: cleanToken, message };

    if (isVideo) {
      url = `${this.graphUrl}/${pageId}/videos`;
      payload.file_url = singleUrl;
      payload.description = message;
      delete payload.message;
    } else if (isImage) {
      url = `${this.graphUrl}/${pageId}/photos`;
      payload.url = singleUrl;
      payload.caption = message;
      delete payload.message;
    }

    try {
      const response = await axios.post(url, payload);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error?.message || 'Lỗi đăng bài');
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