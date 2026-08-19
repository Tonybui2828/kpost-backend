import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma.service'; // <--- PHẢI CÓ DÒNG NÀY

@Injectable()
export class FacebookService {
  private readonly graphUrl = 'https://graph.facebook.com/v21.0'; // Cập nhật bản v21 mới nhất

  // TIÊM PRISMA VÀO ĐỂ LƯU DỮ LIỆU
  constructor(private readonly prisma: PrismaService) {}

  private clean(token: string): string {
    return token ? token.trim().replace(/\s/g, "") : "";
  }

  // ==========================================
  // 1. HÀM ĐỒNG BỘ TIN NHẮN (QUAN TRỌNG NHẤT ĐỂ HẾT LỖI BUILD)
  // ==========================================
  async syncAllMessages(workspaceId: string) {
    try {
      // Lấy tất cả Fanpage đã kết nối của Workspace này
      const accounts = await this.prisma.socialAccount.findMany({
        where: { workspaceId }
      });

      for (const acc of accounts) {
        // Gọi API Facebook lấy danh sách hội thoại
        const url = `${this.graphUrl}/${acc.platformId}/conversations?fields=messages{message,from,created_time},participants&access_token=${this.clean(acc.accessToken)}`;
        const response = await axios.get(url);
        const conversations = response.data.data || [];

        for (const conv of conversations) {
          const lastMsg = conv.messages?.data[0];
          if (lastMsg && lastMsg.from?.id !== acc.platformId) { // Chỉ lưu tin nhắn từ khách
            // Lưu hoặc cập nhật vào bảng InboxMessage
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
      return { status: 'success', message: 'Đồng bộ tin nhắn hoàn tất!' };
    } catch (error) {
      console.error("Lỗi đồng bộ Facebook:", error.message);
      return { status: 'error', message: error.message };
    }
  }

  // 2. ĐĂNG BÀI (PAGE/ẢNH/VIDEO)
  async postToPage(pageId: string, accessToken: string, message: string, imageUrl?: string): Promise<any> {
    const cleanToken = this.clean(accessToken);
    const cleanMediaUrl = imageUrl ? imageUrl.trim() : "";
    const isVideo = cleanMediaUrl.match(/\.(mp4|mov|avi|wmv)$/i);
    const isImage = cleanMediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);

    let url = `${this.graphUrl}/${pageId}/feed`;
    const payload: any = { access_token: cleanToken, message };

    if (isVideo) {
      url = `${this.graphUrl}/${pageId}/videos`;
      payload.file_url = cleanMediaUrl;
      payload.description = message;
      delete payload.message;
    } else if (isImage) {
      url = `${this.graphUrl}/${pageId}/photos`;
      payload.url = cleanMediaUrl;
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

  // 3. GỬI TIN NHẮN (TRẢ LỜI INBOX)
  async sendReply(pageId: string, accessToken: string, recipientId: string, text: string): Promise<any> {
    const url = `${this.graphUrl}/${pageId}/messages`;
    const payload = {
      recipient: { id: recipientId.trim() },
      message: { text: text },
      access_token: this.clean(accessToken)
    };
    try {
      const response = await axios.post(url, payload);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error?.message || 'Lỗi gửi tin');
    }
  }

  // 4. PHẢN HỒI BÌNH LUẬN (REPLY COMMENT)
  async replyToComment(commentId: string, accessToken: string, text: string): Promise<any> {
    const url = `${this.graphUrl}/${commentId}/comments`;
    try {
      const response = await axios.post(url, { message: text }, { params: { access_token: this.clean(accessToken) } });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error?.message || "Lỗi phản hồi bình luận");
    }
  }

  // 5. TỰ ĐỘNG COMMENT VÀO BÀI VIẾT
  async commentOnPost(postId: string, accessToken: string, message: string): Promise<any> {
    const url = `${this.graphUrl}/${postId}/comments`;
    try {
      const response = await axios.post(url, {
        message: message,
        access_token: this.clean(accessToken)
      });
      return response.data;
    } catch (error) {
      console.error("❌ Lỗi Facebook Comment:", error.message);
      return null;
    }
  }
}