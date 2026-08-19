import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma.service';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

@Injectable()
export class AiContentService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  private supabase = createClient(
    "https://wsgjryobqfayxhdhujki.supabase.co", 
    "sb_publishable__cTnEl5USBaraE6p6P0WDw_Q37Hmye7"
  );

  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 1. AI ADVISOR - PHÂN TÍCH TĂNG TRƯỞNG
  // ==========================================
  async analyzeGrowth(stats: any) {
    try {
      const prompt = `
        Bạn là một chuyên gia cố vấn tăng trưởng doanh thu. 
        Dữ liệu shop: Doanh thu ${stats.totalRevenue}đ, ${stats.totalOrders} đơn, ${stats.totalMessages} tin nhắn.
        Hãy phân tích ngắn gọn và đưa ra 3 lời khuyên thực chiến để shop bùng nổ doanh số.
        Trả về JSON: { "analysis": "...", "suggestions": ["...", "...", "..."] }
      `;
      const res = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      return JSON.parse(res.choices[0].message.content || '{}');
    } catch (error) {
      return { analysis: "Đang cập nhật...", suggestions: ["Tăng cường đăng bài", "Chăm sóc khách cũ"] };
    }
  }

  // ==========================================
  // 2. AI AUTOPILOT - TRỢ LÝ CHỐT ĐƠN (NÂNG CẤP MẠNH)
  // ==========================================
  async suggestReply(msg: string, wsId: string) {
    try {
      // 1. Lấy danh sách sản phẩm thật
      const products = await this.prisma.product.findMany({
        where: { workspaceId: wsId },
        select: { name: true, price: true, productUrl: true }
      });

      const productContext = products.map(p => 
        `- ${p.name}: ${p.price?.toLocaleString()}đ`
      ).join('\n');

      // 2. CHỈ DẪN CHỐT ĐƠN THÔNG MINH
      const systemPrompt = `
        Bạn là một nữ nhân viên chốt đơn siêu giỏi tên là Mai của shop, có đủ mọi kỹ năng để đọc, hiểu tâm lý khách hàng và phản hồi khách hàng, chốt đơn nhanh chóng. Xưng hô: "Em" và "Anh/Chị".
        
        DANH SÁCH SẢN PHẨM HIỆN CÓ:
        ${productContext}

        QUY TẮC BÁN HÀNG & PHÍ SHIP:
        1. Nếu khách muốn mua sản phẩm nhưng CHƯA nói số lượng: Bắt buộc phải hỏi "Dạ Anh/Chị muốn lấy số lượng mấy bộ/cái ạ? Bên em đang có ưu đãi: Mua từ 2 sản phẩm trở lên là được MIỄN PHÍ SHIP toàn quốc luôn đó ạ 😍".
        2. Nếu khách mua 1 sản phẩm: Phí ship là 30.000đ.
        3. Nếu khách mua từ 2 sản phẩm trở lên: MIỄN PHÍ SHIP (Freeship).
        4. Nếu khách đã báo số lượng thì không hỏi lại nữa. Hỏi thêm địa chỉ và số điện thoại rồi chốt đơn cho khách luôn.
        5. Giọng điệu tự nhiên như nhân viên thật,Luôn lễ phép, bắt đầu bằng "Dạ", kết thúc bằng "ạ", dùng nhiều icon: 😍, 🥰, 🚀.

        KỊCH BẢN CHỐT ĐƠN (Invoice Format):
        Chỉ khi khách đã cung cấp ĐỦ [Họ tên, SĐT, Địa chỉ, Tên SP, Số lượng], hãy trả lời theo mẫu hóa đơn sau:
        "Dạ em xác nhận chốt đơn cho mình thành công rồi ạ! ❤️
        ---
        📦 THÔNG TIN ĐƠN HÀNG:
        - Khách hàng: [Tên khách]
        - Số điện thoại: [SĐT]
        - Địa chỉ: [Địa chỉ]
        - Sản phẩm: [Tên SP]
        - Số lượng: [Số lượng]
        - Phí ship: [30.000đ hoặc MIỄN PHÍ]
        ---
        💰 TỔNG THANH TOÁN: [Tổng tiền hàng + phí ship]đ
        
        Cảm ơn Anh/Chị đã ủng hộ shop bên em ạ! Chờ em gửi hàng cho mình nhé 🚀"
      `;

      const res = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt }, 
          { role: "user", content: msg }
        ],
        temperature: 0.3, // Giảm sáng tạo để hóa đơn ra chuẩn định dạng
      });

      return res.choices[0].message.content;
    } catch (error) {
      console.error("Lỗi AI Autopilot:", error.message);
      return "Dạ em chào Anh/Chị, em có thể giúp gì cho mình không ạ? 😍";
    }
  }

  // ==========================================
  // 3. LOGIC XỬ LÝ ẢNH & POST (GIỮ NGUYÊN)
  // ==========================================
  private async getOptimizedPrompt(userPrompt: string): Promise<string> {
    const res = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Professional advertisement designer. Translate to English, high-end luxury style." },
        { role: "user", content: userPrompt }
      ],
    });
    return res.choices[0].message.content || userPrompt;
  }

  async editImage(imageUrl: string, prompt: string) {
    try {
      const technicalPrompt = await this.getOptimizedPrompt(prompt);
      const responseImg = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageFile = await OpenAI.toFile(Buffer.from(responseImg.data), 'source.png');
      const aiResponse = await this.openai.images.edit({
        model: "gpt-image-2", image: imageFile, prompt: technicalPrompt, n: 1, size: "1024x1024",
      });
      return this.saveToSupabase(aiResponse.data[0]?.url || "");
    } catch (error) { throw new Error(error.message); }
  }

  async generateImage(prompt: string) {
    try {
      const technicalPrompt = await this.getOptimizedPrompt(prompt);
      const res = await this.openai.images.generate({ model: "gpt-image-2", prompt: technicalPrompt, n: 1, size: "1024x1024" });
      return this.saveToSupabase(res.data[0].url || "");
    } catch (error) { return { url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` }; }
  }

  async generatePost(topic: string, userId: string, workspaceId: string) {
    const res = await this.openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: topic }] });
    return this.prisma.post.create({ data: { content: res.choices[0].message.content || '', workspaceId, status: 'draft', userId: userId || null } });
  }

  private async saveToSupabase(rawData: string) {
    try {
      if (!rawData.startsWith('http')) return { url: "" };
      const res = await axios.get(rawData, { responseType: 'arraybuffer' });
      const fileName = `ai_pro_${Date.now()}.png`;
      await this.supabase.storage.from('product-images').upload(fileName, Buffer.from(res.data), { contentType: 'image/png', upsert: true });
      return { url: this.supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl };
    } catch (e) { return { url: rawData }; }
  }
}