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
      const prompt = `Bạn là một chuyên gia cố vấn tăng trưởng doanh thu. Dữ liệu shop: Doanh thu ${stats.totalRevenue}đ, ${stats.totalOrders} đơn, ${stats.totalMessages} tin nhắn. Hãy phân tích ngắn gọn và đưa ra 3 lời khuyên thực chiến để shop bùng nổ doanh số. Trả về JSON: { "analysis": "...", "suggestions": ["...", "...", "..."] }`;
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
  // 2. AI AUTOPILOT - TRỢ LÝ CHỐT ĐƠN (NHÂN CÁCH SALES CAO CẤP)
  // ==========================================
  async suggestReply(msg: string, wsId: string) {
    try {
      // 🚀 ĐÃ SỬA: Lấy THÊM mô tả chi tiết (thông số) từ Database
      const products = await this.prisma.product.findMany({
        where: { workspaceId: wsId },
        select: { name: true, price: true, description: true }
      });

      // 🚀 ĐÃ SỬA: Nạp thông số vào não AI
      const productContext = products.map(p => 
        `- Sản phẩm: ${p.name}\n  Giá: ${p.price?.toLocaleString()}đ\n  Mô tả/Thông số: ${p.description || 'Chưa cập nhật mô tả'}`
      ).join('\n\n');

      const systemPrompt = `
        Bạn là Mai - Chuyên viên tư vấn bán hàng online xuất sắc, cực kỳ khéo léo, duyên dáng và chuyên nghiệp. 
        Bạn xưng hô là "Em" và gọi khách là "Anh/Chị" một cách trân trọng, nhẹ nhàng. Tôn chỉ của bạn là: "Khách hàng luôn đúng, tư vấn tận tâm, chốt đơn tinh tế".

        📦 KHO DỮ LIỆU SẢN PHẨM CỦA SHOP (DÙNG ĐỂ TƯ VẤN):
        ${productContext}

        🎯 KỸ NĂNG BÁN HÀNG & CHỐT ĐƠN:
        1. TRẢ LỜI THÔNG SỐ CHÍNH XÁC: Khi khách hỏi kích thước, chất liệu, tính năng... HÃY ĐỌC KỸ phần "Mô tả/Thông số" ở trên để trả lời. Khéo léo lồng ghép lời khen (VD: "Dạ máy này kích thước dài rộng là... nhỏ gọn để bếp cực sang luôn anh ạ").
        2. KHÔNG CÓ THÔNG TIN: Tuyệt đối không bịa đặt. Xin lỗi khéo léo và lái sang ưu điểm khác hoặc xin phép kiểm tra lại.
        3. KỸ NĂNG UPSALE (BÁN THÊM): Quy tắc phí ship là mua 1 cái ship 30.000đ, mua từ 2 cái trở lên MIỄN PHÍ SHIP. Hãy dùng điều này để chèo kéo khách mua thêm (VD: "Anh lấy thêm 1 cái nữa để bên em miễn phí ship luôn cho mình nhé?").
        4. LUÔN HƯỚNG TỚI CHỐT ĐƠN: Cuối mỗi câu trả lời tư vấn, thả một câu mồi nhẹ nhàng (VD: "Anh/Chị ưng mẫu này để em lên đơn giữ ưu đãi cho mình luôn nhé?").
        
        🛒 XỬ LÝ KHI KHÁCH ĐỂ LẠI THÔNG TIN (SĐT, Địa chỉ):
        - Bóc tách thông tin ngay. KHÔNG HỎI LẠI những gì khách đã cung cấp.
        - Nếu thiếu, hỏi NGẮN GỌN (VD: "Dạ anh cho em xin thêm địa chỉ cụ thể để shipper giao tận nhà nhé").
        - Nếu ĐÃ ĐỦ thông tin (Tên, SĐT, Địa chỉ, Sản phẩm), XUẤT HÓA ĐƠN CHỐT ĐƠN ngay.

        📝 MẪU HÓA ĐƠN CHỐT ĐƠN (Chỉ xuất khi đủ thông tin):
        "Dạ em xác nhận lên đơn thành công cho mình rồi ạ! ❤️
        ---
        📦 THÔNG TIN ĐƠN HÀNG:
        - Khách hàng: [Tên khách]
        - SĐT: [SĐT]
        - Địa chỉ: [Địa chỉ]
        - Sản phẩm: [Tên SP]
        - Số lượng: [Số lượng]
        - Phí ship: [30.000đ hoặc MIỄN PHÍ SHIP]
        ---
        💰 TỔNG THANH TOÁN: [Tổng tiền]đ
        
        Dạ em cảm ơn Anh/Chị đã ủng hộ shop ạ! Hàng sẽ được gửi đi sớm nhất, anh/chị để ý điện thoại giúp em nhé 🚀"
      `;

      const res = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt }, 
          { role: "user", content: msg }
        ],
        temperature: 0.4, // Tăng nhẹ độ sáng tạo để câu văn tự nhiên, bớt giống rô bốt
      });

      return res.choices[0].message.content;
    } catch (error) {
      return "Dạ em chào Anh/Chị, dạ mình đang quan tâm đến sản phẩm nào bên em ạ? 😍";
    }
  }

  // ==========================================
  // 3. LOGIC XỬ LÝ ẢNH & POST
  // ==========================================
  private async getOptimizedPrompt(userPrompt: string): Promise<string> {
    const res = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Professional advertisement designer. Luxury style." },
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
        model: "dall-e-2", image: imageFile, prompt: technicalPrompt, n: 1, size: "1024x1024",
      });
      return this.saveToSupabase(aiResponse.data[0]?.url || "");
    } catch (error) { throw new Error(error.message); }
  }

  async generateImage(prompt: string) {
    try {
      const technicalPrompt = await this.getOptimizedPrompt(prompt);
      const res = await this.openai.images.generate({ model: "dall-e-3", prompt: technicalPrompt, n: 1, size: "1024x1024" });
      return this.saveToSupabase(res.data[0].url || "");
    } catch (error) { return { url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` }; }
  }

  async generatePost(topic: string, userId: string, workspaceId: string) {
    const res = await this.openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: topic }] });
    return this.prisma.post.create({ data: { content: res.choices[0].message.content || '', workspaceId, status: 'draft', userId: userId || null } });
  }

  private async saveToSupabase(rawData: string) {
    try {
      if (!rawData || !rawData.startsWith('http')) return { url: "" };
      const res = await axios.get(rawData, { responseType: 'arraybuffer' });
      const fileName = `ai_pro_${Date.now()}.png`;
      await this.supabase.storage.from('product-images').upload(fileName, Buffer.from(res.data), { contentType: 'image/png', upsert: true });
      return { url: this.supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl };
    } catch (e) { return { url: rawData }; }
  }
}