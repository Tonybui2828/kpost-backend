import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import axios from 'axios';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(private prisma: PrismaService) {}

  async processFacebookMessage(pageId: string, webhookEvent: any) {
    const senderId = webhookEvent.sender.id; // ID Facebook của khách
    const messageText = webhookEvent.message.text;
    const messageId = webhookEvent.message.mid;

    if (!messageText) return; // Bỏ qua ảnh/video tạm thời

    // 1. Kiểm tra Page ID này thuộc về Workspace nào trong DB của KPost
    const socialAccount = await this.prisma.socialAccount.findFirst({
      where: {
        platform: 'facebook',
        platformId: pageId,
      },
      include: {
        workspace: {
          include: { products: true } // Kéo theo sản phẩm để AI tư vấn
        }
      }
    });

    if (!socialAccount) {
      this.logger.warn(`Không tìm thấy cấu hình Fanpage ${pageId} trong hệ thống Kpost.`);
      return;
    }

    // 2. Lưu tin nhắn của khách vào DB
    try {
      // (Tuỳ chọn) Gọi API lấy tên khách hàng, nếu lỗi thì mặc định là "Khách hàng"
      let senderName = 'Khách hàng';
      try {
         const fbUser = await axios.get(`https://graph.facebook.com/${senderId}?fields=first_name,last_name&access_token=${socialAccount.accessToken}`);
         senderName = `${fbUser.data.last_name} ${fbUser.data.first_name}`;
      } catch (e) {}

      await this.prisma.inboxMessage.create({
        data: {
          workspaceId: socialAccount.workspaceId,
          platform: 'facebook',
          type: 'message',
          senderName: senderName,
          senderId: senderId,
          content: messageText,
          pageName: socialAccount.accountName,
          platformId: messageId,
        }
      });
    } catch (error) {
      this.logger.error('Lỗi lưu tin nhắn khách:', error);
    }

    // 3. Nếu khách hàng bật tính năng AI Trả Lời Tự Động -> Chuyển cho AI
    if (socialAccount.isAiAutoReply) {
      await this.handleAiAutoReply(socialAccount, senderId, messageText);
    }
  }

  private async handleAiAutoReply(socialAccount: any, customerId: string, customerMessage: string) {
    try {
      // a. Nạp kiến thức Sản Phẩm cho AI
      const products = socialAccount.workspace.products;
      const productContext = products.map(p => 
        `- Tên SP: ${p.name}, Giá: ${p.price || 'Liên hệ'}, Tồn kho: ${p.totalStock}, Mô tả: ${p.description || ''}`
      ).join('\n');

      // b. Prompt kịch bản bán hàng
      const aiPrompt = `
        Bạn là nhân viên CSKH xuất sắc của shop "${socialAccount.accountName}".
        Giọng điệu tư vấn: ${socialAccount.aiTone} (ví dụ: thân thiện, chuyên nghiệp...).
        Dưới đây là danh sách sản phẩm hiện có của shop:
        ${productContext}
        
        Khách hàng vừa hỏi: "${customerMessage}"
        Nhiệm vụ: Trả lời tự nhiên, ngắn gọn, cung cấp thông tin giá cả nếu khách hỏi, và khéo léo chốt sale. KHÔNG tự bịa ra sản phẩm không có trong danh sách.
      `;

      // c. Gọi Google Gemini API 
      const geminiApiKey = process.env.GEMINI_API_KEY; 
      const geminiRes = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        contents: [{ parts: [{ text: aiPrompt }] }]
      });

      let replyText = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      // Dự phòng nếu AI lỗi
      if (!replyText) replyText = "Dạ shop đang kiểm tra thông tin, bạn đợi xíu nhé!";

      // d. Gửi tin nhắn trả lại cho khách qua Facebook Graph API
      await axios.post(
        `https://graph.facebook.com/v19.0/me/messages?access_token=${socialAccount.accessToken}`,
        {
          recipient: { id: customerId },
          message: { text: replyText }
        }
      );

      // e. Lưu tin nhắn của AI vào DB để hiển thị trên UI Hộp thư
      await this.prisma.inboxMessage.create({
        data: {
          workspaceId: socialAccount.workspaceId,
          platform: 'facebook',
          type: 'message',
          senderName: socialAccount.accountName, 
          senderId: 'agent', // Đánh dấu là shop gửi
          content: replyText,
          pageName: socialAccount.accountName,
          platformId: `reply_${Date.now()}`,
        }
      });

    } catch (error) {
      this.logger.error('Lỗi khi AI trả lời:', error?.response?.data || error);
    }
  }
}