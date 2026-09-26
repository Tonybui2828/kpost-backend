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
      const products = await this.prisma.product.findMany({
        where: { workspaceId: wsId },
      });

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
   - NẾU LÀ "CÓ SẴN ẢNH ĐỂ GỬI": Bạn HÃY NÓI "Dạ em gửi anh/chị ảnh và thông số chi tiết của mẫu này ạ 👇".
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
   - Nếu khách chốt mua nhưng THIẾU địa chỉ/SĐT: Xin NGẮN GỌN.
   - Nếu ĐÃ ĐỦ: LÊN HÓA ĐƠN XÁC NHẬN NGAY.
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
    } catch (error: any) { throw new Error(error.message); }
  }

  async generateImage(prompt: string) {
    try {
      const technicalPrompt = await this.getOptimizedPrompt(prompt);
      const res = await this.openai.images.generate({ model: "dall-e-3", prompt: technicalPrompt, n: 1, size: "1024x1024" });
      return this.saveToSupabase(res.data[0].url || "");
    } catch (error) { return { url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` }; }
  }

  async generatePost(topic: string, userId: string, workspaceId: string) {
    try {
      const prompt = `Viết một bài đăng bán hàng hoặc marketing thật hấp dẫn cho mạng xã hội (Facebook, Zalo) dựa trên chủ đề/thông tin sản phẩm sau. Bài viết cần có:
1. Tiêu đề thu hút (viết hoa, có icon).
2. Nêu bật nỗi đau/nhu cầu của khách hàng.
3. Các ưu điểm/tính năng nổi bật (dùng bullet points hoặc icon).
4. Lời kêu gọi hành động (Call to Action) rõ ràng ở cuối.

Chủ đề/Sản phẩm: ${topic}`;

      const res = await this.openai.chat.completions.create({ 
        model: "gpt-4o-mini", 
        messages: [{ role: "user", content: prompt }] 
      });
      
      const generatedContent = res.choices[0].message.content || '';
      return { content: generatedContent };
    } catch (error) {
      console.error("Lỗi AI generatePost:", error);
      throw new Error("AI đang bận hoặc OpenAI API key của bạn bị lỗi. Vui lòng thử lại sau.");
    }
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

  // =========================================================================
  // 🌟 4. TÍNH NĂNG MỚI: AI HỌC HIỂU NỘI DUNG VIDEO KHI KHÁCH TẢI LÊN
  // =========================================================================
  async analyzeVideoDeep(data: { videoName?: string; duration?: number; keyframes?: any[]; extraContext?: string }) {
    try {
      const duration = data.duration || 15;
      const prompt = `Bạn là Giám đốc Sáng tạo và Chuyên gia Dựng phim AI (AI Video Intelligence Engine).
Khi người dùng tải video lên, nhiệm vụ của bạn là học và thấu hiểu TOÀN BỘ nội dung video:
1. Tóm tắt nội dung cốt lõi của video (Chủ đề, phong cách, thông điệp chính).
2. Phân tách video thành 3 phân cảnh chi tiết theo mốc thời gian thực từ 0s đến ${duration}s.
3. Nhận diện các điểm nhấn (key moments), nhược điểm cần cắt gọt.
4. Đưa ra 3 gợi ý chỉnh sửa thông minh (AI Smart Suggestions) theo từng mốc thời gian cụ thể (cắt ghép, tăng tốc, chèn banner, chèn logo).

Tên video: ${data.videoName || 'video_goc.mp4'}
Thời lượng video: ${duration} giây
${data.extraContext ? `Ngữ cảnh: ${data.extraContext}` : ''}

Bắt buộc trả về đúng định dạng JSON:
{
  "summary": "Tóm tắt chi tiết toàn bộ nội dung video...",
  "genre": "Quảng cáo sản phẩm | Review | Vlog | Hài hước | Giáo dục",
  "mood": "Năng động | Sang trọng | Ấm áp | Kịch tính",
  "segments": [
    {
      "id": "seg_1",
      "startSec": 0,
      "endSec": ${Math.round(duration * 0.25)},
      "timeLabel": "00:00 - 00:${Math.round(duration * 0.25).toString().padStart(2, '0')}",
      "title": "Cảnh Mở Đầu & Hook Giữ Chân Người Xem",
      "description": "Hình ảnh cận cảnh tạo sự tò mò trong 3-5 giây đầu",
      "dialogue": "Nhạc nền tiết tấu nhanh cuốn hút",
      "suggestion": "Nên tăng tốc 1.25x hoặc chèn logo thương hiệu ở góc"
    },
    {
      "id": "seg_2",
      "startSec": ${Math.round(duration * 0.25)},
      "endSec": ${Math.round(duration * 0.75)},
      "timeLabel": "00:${Math.round(duration * 0.25).toString().padStart(2, '0')} - 00:${Math.round(duration * 0.75).toString().padStart(2, '0')}",
      "title": "Trình Diễn Tính Năng / Nội Dung Chính",
      "description": "Trình bày chi tiết sản phẩm, công năng và trải nghiệm",
      "dialogue": "Lời thoại thuyết minh rõ ràng",
      "suggestion": "Nên chèn banner Flash Sale giảm giá 50% ở đáy video"
    },
    {
      "id": "seg_3",
      "startSec": ${Math.round(duration * 0.75)},
      "endSec": ${Math.round(duration)},
      "timeLabel": "00:${Math.round(duration * 0.75).toString().padStart(2, '0')} - 00:${Math.round(duration).toString().padStart(2, '0')}",
      "title": "Kết Thúc & Kêu Gọi Hành Động (CTA)",
      "description": "Chốt thông điệp, hướng dẫn đặt hàng hoặc liên hệ",
      "dialogue": "Kêu gọi đặt hàng ngay hôm nay",
      "suggestion": "Chèn logo KPOST nổi bật và text ĐẶT HÀNG NGAY"
    }
  ],
  "smartSuggestions": [
    "Cắt bỏ 2 giây đầu để người xem vào thẳng nội dung chính ngay lập tức",
    "Từ 00:03 đến 00:10: Chèn banner 'GIẢM GIÁ 50%' ở chân video",
    "Chèn logo thương hiệu ở góc trên bên phải từ giây 00:00 đến hết video"
  ]
}`;

      const res = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const parsedData = JSON.parse(res.choices[0].message.content || '{}');
      return { success: true, data: parsedData };
    } catch (error: any) {
      console.error("Lỗi AI analyzeVideoDeep:", error);
      // Fallback tự động nếu OpenAI bận
      const dur = data.duration || 15;
      return {
        success: true,
        data: {
          summary: `Video "${data.videoName || 'gốc'}" có nhịp điệu nhanh, hình ảnh sắc nét và thông điệp bán hàng lôi cuốn.`,
          genre: "Quảng cáo sản phẩm & Sáng tạo",
          mood: "Năng động",
          segments: [
            {
              id: "seg_1",
              startSec: 0,
              endSec: 4,
              timeLabel: "00:00 - 00:04",
              title: "Cảnh 1: Mở Đầu Hook Thu Hút",
              description: "Tạo sự chú ý cho khán giả trong 3 giây vàng đầu tiên.",
              suggestion: "Tăng tốc 1.25x hoặc chèn logo thương hiệu."
            },
            {
              id: "seg_2",
              startSec: 4,
              endSec: 12,
              timeLabel: "00:04 - 00:12",
              title: "Cảnh 2: Trình Diễn Nội Dung Chính",
              description: "Trình bày chi tiết tính năng và trải nghiệm sản phẩm.",
              suggestion: "Chèn banner Flash Sale 50% ở đáy video."
            },
            {
              id: "seg_3",
              startSec: 12,
              endSec: Math.round(dur),
              timeLabel: `00:12 - 00:${Math.round(dur).toString().padStart(2, '0')}`,
              title: "Cảnh 3: Kêu Gọi Hành Động (CTA)",
              description: "Chốt thông điệp kêu gọi đặt mua ngay.",
              suggestion: "Chèn chữ 'ĐẶT HÀNG NGAY HÔM NAY'."
            }
          ],
          smartSuggestions: [
            "Chèn banner Flash Sale 50% ở đáy video từ giây 00:03 đến 00:10",
            "Chèn logo nhận diện ở góc trên bên phải video",
            "Tăng tốc 1.25x đoạn mở đầu để giữ chân khách hàng"
          ]
        }
      };
    }
  }

  // =========================================================================
  // 🌟 5. TÍNH NĂNG MỚI: AI BÓC TÁCH CÂU LỆNH CHỈNH SỬA THEO TRỤC THỜI GIAN
  // =========================================================================
  async parseTimelinePrompt(data: { userPrompt: string; currentTimeline?: any[]; duration?: number; currentTime?: number }) {
    try {
      const prompt = `Bạn là Trợ lý Dựng phim AI chuyên sâu theo trục thời gian (Timeline-Aware Video Editor Assistant).
Khách hàng sẽ miêu tả mong muốn chỉnh sửa theo các mốc thời gian (ví dụ: "ở giây 05 đến 12 cắt bỏ", "từ phút 00:03 chèn banner giảm giá 50%", "đoạn từ 00:05 đến 00:15 tăng tốc 1.3x và chỉnh màu vintage", "chèn logo thương hiệu ở góc trên bên phải").

Câu lệnh của khách: "${data.userPrompt}"
Thời lượng video: ${data.duration || 15} giây
Vị trí đang dừng: ${data.currentTime || 0} giây

Hãy bóc tách thành JSON chuẩn sau:
{
  "explanation": "Câu tóm tắt tiếng Việt thân thiện, dễ hiểu, nói cho khách biết AI đã áp dụng những chỉnh sửa nào theo từng mốc giây.",
  "timelineEdits": [
    {
      "id": "act_1",
      "startSec": 0,
      "endSec": 5,
      "timeRangeLabel": "00:00 - 00:05",
      "actionType": "speed",
      "parameters": { "speed": 1.25 },
      "badge": "⚡ Tăng tốc 1.25x [00:00 - 00:05]"
    }
  ],
  "logoBannerConfig": {
    "logo": { "enabled": false, "text": "", "position": "top-right", "opacity": 90, "startSec": 0, "endSec": null },
    "banner": { "enabled": true, "title": "GIẢM GIÁ 50% HÔM NAY", "subtitle": "Ưu đãi có hạn", "position": "bottom", "theme": "red-gold", "startSec": 3, "endSec": 10 }
  },
  "globalEdits": {
    "aspectRatio": "original",
    "flipHorizontal": false,
    "letterbox": false
  },
  "ffmpegCommand": "ffmpeg -i input.mp4 -vf \\"...\\" output.mp4"
}`;

      const res = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const parsedData = JSON.parse(res.choices[0].message.content || '{}');
      return { success: true, data: parsedData };
    } catch (error: any) {
      console.error("Lỗi AI parseTimelinePrompt:", error);
      return {
        success: true,
        data: {
          explanation: `Đã tiếp nhận yêu cầu: "${data.userPrompt}". Đã áp dụng các mốc thời gian lên video preview!`,
          timelineEdits: [],
          globalEdits: { aspectRatio: "original", flipHorizontal: false, letterbox: false }
        }
      };
    }
  }
}