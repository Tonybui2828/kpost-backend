import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiContentService } from '../ai-content/ai-content.service';
import { FacebookService } from './facebook.service';

@Injectable()
export class AutomatorService {
  private readonly logger = new Logger(AutomatorService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiContentService,
    private fbService: FacebookService,
  ) {}

  // ==========================================
  // 1. AI AUTOPILOT - TRỢ LÝ THÔNG MINH (CÓ TRÍ NHỚ + CHỈ GỬI MEDIA 1 LẦN)
  // ==========================================
  async processIncomingMessage(
    pageId: string, 
    senderId: string, 
    content: string, 
    type: 'inbox' | 'comment', 
    platformId: string
  ) {
    try {
      let account = await this.prisma.socialAccount.findFirst({
        where: { platformId: pageId, isAiAutoReply: true },
        include: { workspace: true }
      });
      
      if (!account) {
        account = await this.prisma.socialAccount.findFirst({
          where: { platformId: pageId },
          include: { workspace: true }
        });
      }

      if (!account || !account.isAiAutoReply) return; 

      const plan = account.workspace.plan?.toUpperCase();
      
      // CHO PHÉP PRO, GOLD, DIAMOND ĐƯỢC DÙNG AI AUTOPILOT
      if (!['PRO', 'GOLD', 'DIAMOND'].includes(plan)) {
        this.logger.warn(`⚠️ Shop [${account.workspace.name}] đang ở gói ${plan}, không có quyền dùng AI Autopilot.`);
        return; // Dừng lại, không gọi AI
      }

      // --- 1. LẤY LỊCH SỬ CHAT VÀ DỮ LIỆU KHO HÀNG ---
      const chatHistory = await this.prisma.inboxMessage.findMany({
          where: { senderId: senderId, workspaceId: account.workspaceId },
          orderBy: { createdAt: 'desc' },
          take: 6
      });
      const historyText = chatHistory.reverse().map(m => `${m.type === 'inbox' || m.type === 'comment' ? 'Khách' : 'AI'}: ${m.content}`).join('\n');

      const rawProducts = await this.prisma.product.findMany({ 
          where: { workspaceId: account.workspaceId }
      });
      const productContext = rawProducts.map((p: any) => {
        // Fix lỗi: Chuyển dữ liệu ảnh về dạng chuỗi (nếu nó là mảng JSON)
        let rawImage = p.images || p.imageUrl || p.image || p.thumbnail || "";
        let imageUrl = typeof rawImage === 'string' ? rawImage : (Array.isArray(rawImage) && rawImage.length > 0 ? String(rawImage[0]) : "");
        
        const isVideo = imageUrl.match(/\.(mp4|mov|webm|mkv)(\?.*)?$/i) !== null;
        let mediaStatus = "CHƯA CÓ ẢNH/VIDEO";
        if (imageUrl) {
           mediaStatus = isVideo ? "CÓ SẴN VIDEO ĐỂ GỬI" : "CÓ SẴN ẢNH ĐỂ GỬI";
        }
        return `- Sản phẩm: ${p.name}\n  Giá: ${Number(p.price).toLocaleString()}đ\n  Mô tả: ${p.description || 'Chưa cập nhật'}\n  Trạng thái: ${mediaStatus}\n  Link media hệ thống: ${imageUrl}`;
      }).join('\n\n');

      // --- 2. GỘP CHUNG VÀO 1 LẦN GỌI GPT DUY NHẤT ĐỂ HIỂU HOÀN TOÀN NGỮ CẢNH ---
      const systemPrompt = `Bạn là Mai - Chuyên viên tư vấn bán hàng online xuất sắc. Xưng "Em", gọi khách là "Anh/Chị".
Bạn có EQ cao, thấu hiểu tâm lý, câu văn TỰ NHIÊN, NGẮN GỌN, VÀO THẲNG VẤN ĐỀ.

📦 KHO HÀNG CỦA SHOP (DÙNG ĐỂ TƯ VẤN):
${productContext}

💬 LỊCH SỬ CHUYỆN GẦN ĐÂY:
${historyText}
(Dựa vào lịch sử trên để hiểu khách đang muốn gì. Nếu khách nói cụt lủn "lấy 1 cái", "bao nhiêu tiền", hãy tự suy luận sản phẩm từ lịch sử).

🎯 NGUYÊN TẮC BÁN HÀNG VÀ CHỐT ĐƠN:
1. GỬI ẢNH / VIDEO THÔNG MINH (QUAN TRỌNG NHẤT): 
   - CHỈ ĐÍNH KÈM MEDIA khi tư vấn LẦN ĐẦU TIÊN về sản phẩm đó, HOẶC khi khách yêu cầu "cho xem ảnh", "có hình không", "có video không", "cho xem video".
   - NẾU khách bảo "cho xem video" -> Bắt buộc lấy "Link media hệ thống" nếu Trạng thái ghi là "CÓ SẴN VIDEO ĐỂ GỬI".
   - NẾU khách bảo "cho xem ảnh" -> Ưu tiên lấy Link nếu Trạng thái ghi "CÓ SẴN ẢNH ĐỂ GỬI".
   - NẾU trong Lịch sử trò chuyện đã từng gửi ảnh/video hoặc đã nhắc tới sản phẩm này rồi, TUYỆT ĐỐI KHÔNG GỬI LẠI NỮA (trả về mảng media rỗng).

2. TƯ VẤN VÀ UPSALE:
   - Mua 1 cái ship 30.000đ. Mua 2 cái MIỄN PHÍ SHIP. Hãy lồng ghép up-sale.
   - Không lan man. Đọc kỹ mô tả sản phẩm để trả lời đúng trọng tâm.

3. XỬ LÝ CHỐT ĐƠN:
   - Không hỏi lại thông tin khách đã cho.
   - Nếu khách chốt nhưng thiếu SĐT/Địa chỉ, hỏi xin ngắn gọn.
   - Nếu ĐÃ ĐỦ (Tên, SĐT, Địa chỉ, Sản phẩm) -> LÊN HÓA ĐƠN XÁC NHẬN: "📦 THÔNG TIN ĐƠN HÀNG:..."

TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON SAU (KHÔNG DÙNG MARKDOWN):
{
  "text": "Câu trả lời của bạn gửi cho khách (Text)",
  "imageUrls": ["link_media"] // Mảng chứa tối đa 4 link ảnh/video (hoặc mảng rỗng [] nếu không nên gửi media).
}
`;

      let aiReply = "";
      let productImages: string[] = [];

      try {
        const aiRes = await (this.aiService as any).openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
        });
        const aiData = JSON.parse(aiRes.choices[0].message.content || '{}');
        aiReply = aiData.text;
        
        if (Array.isArray(aiData.imageUrls)) {
           productImages = aiData.imageUrls.filter((url: string) => url && typeof url === 'string' && url.trim() !== '');
        }
      } catch (e) {
         this.logger.error("Lỗi AI Call Gộp:", e.message);
         return;
      }

      if (!aiReply) return;

      // --- 3. GỬI PHẢN HỒI LÊN FACEBOOK ---
      if (type === 'comment') {
        await this.fbService.replyToComment(platformId, account.accessToken, aiReply);
      } else {
        await (this.fbService as any).sendReply(pageId, account.accessToken, senderId, aiReply, productImages);
      }

      // --- 4. LƯU LỊCH SỬ CHAT ---
      await this.prisma.inboxMessage.create({
        data: {
          workspaceId: account.workspaceId,
          platform: 'facebook',
          type: 'outbound',
          senderName: `AI Assistant`,
          senderId: senderId,
          content: aiReply,
          pageName: account.accountName,
          platformId: `ai_auto_${Date.now()}`
        }
      });

      // --- 5. TỰ ĐỘNG LƯU ĐƠN HÀNG NẾU AI VỪA CHỐT XONG ---
      if (aiReply.includes("XÁC NHẬN CHỐT ĐƠN") || aiReply.includes("THÔNG TIN ĐƠN HÀNG")) {
          await this.extractAndSaveOrder(account.workspaceId, aiReply);
      }

      this.logger.log(`✅ AI xử lý xong. Khách: ${senderId} - Lấy ${productImages.length} media.`);

    } catch (error) {
      this.logger.error("❌ Lỗi AI Autopilot:", error.message);
    }
  }

  // ==========================================
  // --- HÀM BÓC TÁCH VÀ LƯU ĐƠN HÀNG TỰ ĐỘNG ---
  // ==========================================
  private async extractAndSaveOrder(workspaceId: string, aiText: string) {
    try {
      this.logger.log("--- 🕵️ ĐANG BÓC TÁCH HÓA ĐƠN ĐỂ LƯU VÀO DATABASE ---");
      
      const res = await (this.aiService as any).openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "Bóc tách thông tin từ hóa đơn sau sang định dạng JSON: { customerName: string, customerPhone: string, customerAddress: string, totalAmount: number }. Chỉ trả về JSON." 
          },
          { role: "user", content: aiText }
        ],
        response_format: { type: "json_object" }
      });

      const orderData = JSON.parse(res.choices[0].message.content || '{}');

      const newOrder = await this.prisma.order.create({
        data: {
          workspaceId: workspaceId,
          customerName: orderData.customerName || "Khách chốt qua AI",
          customerPhone: orderData.customerPhone || "",
          customerAddress: orderData.customerAddress || "Xem trong đoạn chat",
          totalAmount: Number(orderData.totalAmount) || 0,
          status: 'confirmed',
          carrierName: 'Chưa chọn'
        }
      });

      this.logger.log(`🎉 ĐÃ TỰ ĐỘNG TẠO ĐƠN HÀNG MỚI: ID ${newOrder.id}`);
    } catch (e) {
      this.logger.error("❌ Lỗi bóc tách đơn hàng:", e.message);
    }
  }
}