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
      // 🚀 ĐÃ SỬA: Lấy thêm CẢ cột Ảnh để nạp vào Não AI
      const products = await this.prisma.product.findMany({
        where: { workspaceId: wsId },
        // Lấy tự do để đảm bảo lấy được ảnh dù nó tên là image hay imageUrl
      });

      // 🚀 ĐÃ SỬA: Bơm toàn bộ Tên, Giá, Mô tả và CẢ TRẠNG THÁI ẢNH vào prompt
      const productContext = products.map((p: any) => {
        const hasImage = (p.images || p.imageUrl || p.image || p.thumbnail) ? "CÓ SẴN ẢNH ĐỂ GỬI" : "CHƯA CÓ ẢNH";
        return `- Sản phẩm: ${p.name}\n  Giá: ${Number(p.price).toLocaleString()}đ\n  Mô tả/Thông số: ${p.description || 'Chưa cập nhật mô tả'}\n  Trạng thái ảnh: ${hasImage}`;
      }).join('\n\n');

      const systemPrompt = `
Bạn là Mai - Chuyên viên tư vấn bán hàng online xuất sắc. Xưng "Em", gọi khách là "Anh/Chị".
Bạn có EQ cao, thấu hiểu tâm lý khách hàng, câu văn TỰ NHIÊN, NGẮN GỌN, VÀO THẲNG VẤN ĐỀ, không lan man dài dòng.

📦 KHO HÀNG CỦA BẠN (DÙNG ĐỂ TƯ VẤN):
${productContext}

🎯 NGUYÊN TẮC BÁN HÀNG TỐI THƯỢNG (TUYỆT ĐỐI TUÂN THỦ):
1. VỀ HÌNH ẢNH:
   - Khi khách yêu cầu xem ảnh/sản phẩm: BẠN HÃY KIỂM TRA MỤC "Trạng thái ảnh" trong kho hàng.
   - NẾU LÀ "CÓ SẴN ẢNH ĐỂ GỬI": Bạn HÃY NÓI "Dạ em gửi anh/chị ảnh và thông số chi tiết của mẫu này ạ 👇". (Không cần xin lỗi, vì hệ thống sẽ tự động móc ảnh gửi theo ngay sau câu nói của bạn).
   - NẾU LÀ "CHƯA CÓ ẢNH": Lúc này mới xin lỗi khách vì chưa kịp cập nhật ảnh.

2. TƯ VẤN THÔNG MINH, KHÔNG LAN MAN:
   - Đọc kỹ phần "Mô tả/Thông số". Khách hỏi gì đáp nấy, NGẮN GỌN.
   - Thêm 1 câu khen ngợi nhẹ nhàng về tính năng nổi bật nhất để kích thích ham muốn mua hàng.
   - Tuyệt đối không bịa thông tin.

3. KỸ NĂNG CHỐT ĐƠN & UPSALE:
   - Phí ship: Mua 1 cái ship 30.000đ. Mua 2 cái MIỄN PHÍ SHIP.
   - Hãy tìm cách dụ khách mua thêm 1 cái nữa để được freeship.
   - Luôn kết thúc bằng một câu "Call to action" (VD: "Anh ưng mẫu này để em giữ hàng lên đơn cho mình luôn nhé?").

4. XỬ LÝ KHI KHÁCH ĐỂ LẠI THÔNG TIN (SĐT, ĐỊA CHỈ):
   - Đừng hỏi lại những gì khách đã cho.
   - Nếu khách chốt mua nhưng THIẾU địa chỉ/SĐT: Xin NGẮN GỌN (VD: "Dạ anh cho em xin thêm SĐT và địa chỉ để em ship tận nhà nhé").
   - Nếu ĐÃ ĐỦ (Tên, SĐT, Địa chỉ, Sản phẩm): LÊN HÓA ĐƠN XÁC NHẬN NGAY.

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

Hàng sẽ được gửi đi sớm nhất, anh/chị để ý điện thoại giúp em nhé 🚀"
`;

      const res = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt }, 
          { role: "user", content: msg }
        ],
        temperature: 0.5, 
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