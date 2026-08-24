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
  // 2. ĐĂNG BÀI (ĐÃ FIX: ĐẢM BẢO LUÔN CÓ ẢNH)
  // ==========================================
  async postToPage(pageId: string, accessToken: string, message: string, imageUrls?: any, productUrl?: string): Promise<any> {
    const cleanToken = this.clean(accessToken);
    
    // Đảm bảo đầu vào luôn là một mảng link ảnh sạch
    const images = Array.isArray(imageUrls) ? imageUrls : (imageUrls ? [imageUrls] : []);
    const validImages = images.filter((url: any) => typeof url === 'string' && url.startsWith('http'));

    let resultId = "";

    try {
      // --- TRƯỜNG HỢP 1: CÓ ẢNH (1 HOẶC NHIỀU ẢNH) ---
      if (validImages.length > 0) {
        console.log(`--- 📸 Đang xử lý đăng bài kèm ${validImages.length} ảnh ---`);
        
        // Bước A: Upload từng tấm ảnh lên Facebook lấy ID (published=false)
        const mediaIds = await Promise.all(
          validImages.map(async (url: string) => {
            const uploadRes = await axios.post(`${this.graphUrl}/${pageId}/photos`, {
              url: url.trim(),
              published: false,
              access_token: cleanToken,
            });
            return { media_fbid: uploadRes.data.id };
          })
        );

        // Bước B: Đăng bài Feed và đính kèm danh sách ID ảnh đã upload
        const finalRes = await axios.post(`${this.graphUrl}/${pageId}/feed`, {
          message: message,
          attached_media: JSON.stringify(mediaIds),
          access_token: cleanToken,
        });
        resultId = finalRes.data.id;
      } 
      // --- TRƯỜNG HỢP 2: CHỈ ĐĂNG CHỮ ---
      else {
        const response = await axios.post(`${this.graphUrl}/${pageId}/feed`, {
          message: message,
          access_token: cleanToken,
        });
        resultId = response.data.id;
      }

      // --- BƯỚC QUAN TRỌNG: TỰ ĐỘNG CHÈN LINK VÀO COMMENT ---
      if (resultId && productUrl) {
        console.log("--- 🔗 Tự động chèn link mua hàng vào bình luận ---");
        await this.commentOnPost(resultId, cleanToken, `Dạ em gửi mình link xem chi tiết và đặt hàng tại đây nhé: ${productUrl} 😍🚀`);
      }

      return { id: resultId, status: 'success' };

    } catch (error) {
      console.error("❌ Lỗi Facebook API:", error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'Lỗi kết nối Facebook');
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