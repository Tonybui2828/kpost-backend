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
  // 2. AI AUTOPILOT - TRỢ LÝ CHỐT ĐƠN (PROMPT CHUẨN THƯƠNG MẠI)
  // ==========================================
  async suggestReply(msg: string, wsId: string, history: any[] = []) {
    try {
      // 1. Lấy danh sách sản phẩm thật
      const products = await this.prisma.product.findMany({
        where: { workspaceId: wsId },
        select: { name: true, price: true }
      });

      const productContext = products.map(p => 
        `- ${p.name}: ${p.price?.toLocaleString()}đ`
      ).join('\n');

      // 2. Chuyển đổi lịch sử chat
      const chatHistory = history.map(h => ({
        role: h.type === 'outbound' ? 'assistant' : 'user',
        content: h.content
      }));

      // 3. SYSTEM PROMPT
      const systemPrompt = `
        Bạn là "Mai" - nhân viên chốt đơn của shop. Lễ phép, ngắn gọn, dùng "Dạ", "ạ" và icon 😍, 🚀.
        SẢN PHẨM:
        ${productContext}

        QUY TẮC:
        1. KHÔNG hỏi lại thông tin khách đã gửi (Họ tên, SĐT, Địa chỉ).
        2. Phí ship: 1 cái là 30k, 2 cái trở lên FREESHIP.
        3. Đủ 5 thông tin [Tên, SĐT, Địa chỉ, Tên SP, Số lượng] thì XUẤT HÓA ĐƠN ngay theo mẫu:
        
        "Dạ em chốt đơn thành công rồi ạ! ❤️
        ---
        📦 THÔNG TIN:
        - Khách: [Tên]
        - SĐT: [SĐT]
        - Địa chỉ: [Địa chỉ]
        - SP: [Tên SP]
        - SL: [Số lượng]
        - Ship: [30k/Free]
        ---
        💰 TỔNG: [Tiền]đ
        🚀 Cảm ơn Anh/Chị!"
      `;

      const res = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt }, 
          ...chatHistory.slice(-5), 
          { role: "user", content: msg }
        ],
        temperature: 0.2,
      });

      return res.choices[0].message.content;
    } catch (error) {
      return "Dạ em chào Anh/Chị, em giúp gì được cho mình ạ? 😍";
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
        model: "dall-e-2",
        image: imageFile,
        prompt: technicalPrompt,
        n: 1,
        size: "1024x1024",
      });
      return this.saveToSupabase(aiResponse.data[0]?.url || "");
    } catch (error) { throw new Error(error.message); }
  }

  async generateImage(prompt: string) {
    try {
      const technicalPrompt = await this.getOptimizedPrompt(prompt);
      const res = await this.openai.images.generate({ model: "dall-e-3", prompt: technicalPrompt, n: 1, size: "1024x1024" });
      return this.saveToSupabase(res.data[0].url || "");
    } catch (error) { 
      return { url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` }; 
    }
  }

  async generatePost(topic: string, userId: string, workspaceId: string) {
    const res = await this.openai.chat.completions.create({ 
      model: "gpt-4o-mini", 
      messages: [{ role: "user", content: topic }] 
    });
    return this.prisma.post.create({ 
      data: { content: res.choices[0].message.content || '', workspaceId, status: 'draft', userId: userId || null } 
    });
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