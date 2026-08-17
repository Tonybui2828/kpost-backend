import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FacebookService {
  private readonly graphUrl = 'https://graph.facebook.com/v19.0';

  private clean(token: string): string {
    return token ? token.trim().replace(/\s/g, "") : "";
  }

  // 1. ĐĂNG BÀI (PAGE/ẢNH/VIDEO)
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

  // 2. LẤY TIN NHẮN INBOX
  async getInboxMessages(pageId: string, accessToken: string): Promise<any[]> {
    try {
      const url = `${this.graphUrl}/${pageId}/conversations?fields=messages{message,from,created_time},participants&access_token=${this.clean(accessToken)}`;
      const response = await axios.get(url);
      return response.data.data || [];
    } catch (error) {
      return [];
    }
  }

  // 3. LẤY BÌNH LUẬN ĐA TẦNG
  async getPageComments(pageId: string, accessToken: string): Promise<any[]> {
    try {
      const fields = 'comments.limit(100){from,message,created_time,id,comments{from,message,created_time,id}},id,message';
      const url = `${this.graphUrl}/${pageId}/published_posts?fields=${fields}&limit=50&access_token=${this.clean(accessToken)}`;
      const response = await axios.get(url);
      return response.data.data || [];
    } catch (error) {
      return [];
    }
  }

  // 4. GỬI TIN NHẮN (TRẢ LỜI INBOX)
  async sendReply(pageId: string, accessToken: string, recipientId: string, text: string): Promise<any> {
    const url = `${this.graphUrl}/${pageId}/messages`;
    const cleanToken = this.clean(accessToken);

    const payload = {
      recipient: { id: recipientId.trim() },
      message: { text: text },
      access_token: cleanToken
    };

    try {
      const response = await axios.post(url, payload);
      console.log("✅ Gửi tin nhắn thành công!");
      return response.data;
    } catch (error) {
      const fbError = error.response?.data?.error?.message || 'Lỗi gửi tin';
      throw new Error(fbError);
    }
  }

  // 5. PHẢN HỒI BÌNH LUẬN (REPLY COMMENT)
  async replyToComment(commentId: string, accessToken: string, text: string): Promise<any> {
    const url = `${this.graphUrl}/${commentId}/comments`;
    try {
      const response = await axios.post(url, { message: text }, { params: { access_token: this.clean(accessToken) } });
      return response.data;
    } catch (error) {
      const fbError = error.response?.data?.error?.message || "Lỗi phản hồi bình luận";
      throw new Error(fbError);
    }
  }

  // --- MỚI BỔ SUNG: 6. TỰ ĐỘNG COMMENT VÀO BÀI VIẾT (DÙNG ĐỂ CHÈN LINK) ---
  async commentOnPost(postId: string, accessToken: string, message: string): Promise<any> {
    // postId có thể là "ID_BAI_VIET" hoặc "PAGEID_IDBAIVIET"
    const url = `${this.graphUrl}/${postId}/comments`;
    try {
      const response = await axios.post(url, {
        message: message,
        access_token: this.clean(accessToken)
      });
      console.log(`✅ Đã tự động chèn comment vào bài viết: ${postId}`);
      return response.data;
    } catch (error) {
      const fbError = error.response?.data?.error?.message || "Lỗi tự động comment";
      console.error("❌ Lỗi Facebook Comment:", fbError);
      return null; // Trả về null để không làm sập quy trình đăng bài nếu comment lỗi
    }
  }
}