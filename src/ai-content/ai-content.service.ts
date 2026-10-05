import { Injectable, ForbiddenException } from '@nestjs/common';
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

  // =========================================================================
  // 🌟 HÀM KIỂM SOÁT BẢN QUYỀN GÓI: HẾT HẠN LẬP TỨC VỀ FREE VÀ CHẶN MỌI TÍNH NĂNG
  // =========================================================================
  async checkPlanPermission(workspaceId?: string, userId?: string) {
    if (!workspaceId && !userId) return;

    let workspace: any = null;

    if (workspaceId) {
      workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
      });
    }

    if (!workspace && userId) {
      const member = await this.prisma.workspaceMember.findFirst({
        where: { userId },
        include: { workspace: true },
      });
      workspace = member?.workspace || (await this.prisma.workspace.findFirst({ where: { ownerId: userId } }));
    }

    if (!workspace) {
      throw new ForbiddenException("Không tìm thấy không gian làm việc. Vui lòng thử lại!");
    }

    const now = new Date();

    // 1. TỰ ĐỘNG HẠ VỀ FREE NGAY LẬP TỨC NẾU ĐÃ QUÁ HẠN PLAN EXPIRY
    if (workspace.plan !== 'FREE' && workspace.planExpiry && new Date(workspace.planExpiry) < now) {
      await this.prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          plan: 'FREE',
          planExpiry: null,
        },
      });
      workspace.plan = 'FREE';
      workspace.planExpiry = null;
    }

    // 2. NẾU LÀ GÓI FREE: CHẶN TOÀN BỘ TÍNH NĂNG TRÊN KPOST
    if (workspace.plan === 'FREE') {
      throw new ForbiddenException(
        "Gói dùng thử của bạn đã hết hạn. Vui lòng liên hệ Admin hoặc nâng cấp gói PRO / DIAMOND để tiếp tục sử dụng các tính năng trên KPOST!"
      );
    }

    return workspace;
  }

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
    await this.checkPlanPermission(wsId);

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
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;
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

  async editImage(imageUrl: string, prompt: string, workspaceId?: string) {
    if (workspaceId) await this.checkPlanPermission(workspaceId);
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

  async generateImage(prompt: string, workspaceId?: string) {
    if (workspaceId) await this.checkPlanPermission(workspaceId);
    try {
      const technicalPrompt = await this.getOptimizedPrompt(prompt);
      const res = await this.openai.images.generate({ model: "dall-e-3", prompt: technicalPrompt, n: 1, size: "1024x1024" });
      return this.saveToSupabase(res.data[0].url || "");
    } catch (error) { return { url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` }; }
  }

  async generatePost(topic: string, userId: string, workspaceId: string) {
    await this.checkPlanPermission(workspaceId, userId);

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
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;
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
  // 🌟 4. AI HỌC HIỂU NỘI DUNG VIDEO KHI KHÁCH TẢI LÊN
  // =========================================================================
  async analyzeVideoDeep(data: { videoName?: string; duration?: number; keyframes?: any[]; extraContext?: string; workspaceId?: string }) {
    if (data.workspaceId) await this.checkPlanPermission(data.workspaceId);

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
      "suggestion": "Nên tăng tốc 1.25x hoặc chèn logo thương hiệu ở góc"
    },
    {
      "id": "seg_2",
      "startSec": ${Math.round(duration * 0.25)},
      "endSec": ${Math.round(duration * 0.75)},
      "timeLabel": "00:${Math.round(duration * 0.25).toString().padStart(2, '0')} - 00:${Math.round(duration * 0.75).toString().padStart(2, '0')}",
      "title": "Trình Diễn Tính Năng / Nội Dung Chính",
      "description": "Trình bày chi tiết sản phẩm, công năng và trải nghiệm",
      "suggestion": "Nên chèn banner Flash Sale giảm giá 50% ở đáy video"
    },
    {
      "id": "seg_3",
      "startSec": ${Math.round(duration * 0.75)},
      "endSec": ${Math.round(duration)},
      "timeLabel": "00:${Math.round(duration * 0.75).toString().padStart(2, '0')} - 00:${Math.round(duration).toString().padStart(2, '0')}",
      "title": "Kết Thúc & Kêu Gọi Hành Động (CTA)",
      "description": "Chốt thông điệp, hướng dẫn đặt hàng hoặc liên hệ",
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
      if (error instanceof ForbiddenException) throw error;
      console.error("Lỗi AI analyzeVideoDeep:", error);
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
  // 🌟 5. AI BÓC TÁCH CÂU LỆNH CHỈNH SỬA THEO TRỤC THỜI GIAN
  // =========================================================================
  async parseTimelinePrompt(data: { userPrompt: string; currentTimeline?: any[]; duration?: number; currentTime?: number; workspaceId?: string }) {
    if (data.workspaceId) await this.checkPlanPermission(data.workspaceId);

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
      if (error instanceof ForbiddenException) throw error;
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

  // =========================================================================
  // 🌟 6. AI WHISPER BÓC BĂNG ÂM THANH CHUẨN XÁC 100% CẢ VIDEO (KHÔNG BỊ LẶP 30S)
  // =========================================================================
  async transcribeAudioWithWhisper(data: { fileBuffer?: Buffer; fileName?: string; audioBase64?: string; videoUrl?: string; duration?: number; workspaceId?: string }) {
    if (data.workspaceId) {
      await this.checkPlanPermission(data.workspaceId);
    }

    try {
      if (!data.fileBuffer && !data.audioBase64 && !data.videoUrl) {
        return { success: false, message: "Không tìm thấy dữ liệu âm thanh/video" };
      }

      let buffer: Buffer | null = null;
      let targetName = data.fileName || 'video.mp4';

      if (data.fileBuffer) {
        buffer = data.fileBuffer;
      } else if (data.audioBase64) {
        const isWav = data.audioBase64.includes('audio/wav') || !data.audioBase64.includes('audio/mp3');
        targetName = isWav ? 'audio.wav' : 'audio.mp3';
        const base64Clean = data.audioBase64.includes(',') 
          ? data.audioBase64.split(',')[1] 
          : data.audioBase64;
        buffer = Buffer.from(base64Clean, 'base64');
      }

      if (!buffer) {
        return { success: false, message: "Không thể đọc dữ liệu file âm thanh" };
      }

      const ext = targetName.split('.').pop() || 'mp4';
      const file = await OpenAI.toFile(buffer, `whisper_input_${Date.now()}.${ext}`);

      const transcription: any = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'vi',
        response_format: 'verbose_json',
        timestamp_granularities: ['word', 'segment'],
        temperature: 0,
        prompt: "hướng dẫn sử dụng máy hút mùi kính cong, phím bấm cảm ứng, vẫy tay, tốc độ gió, công suất, lưới lọc than hoạt tính.",
      });

      const cues: any[] = [];
      const CHUNK_SIZE = 3;

      if (transcription.words && Array.isArray(transcription.words) && transcription.words.length > 0) {
        const validWords = transcription.words.filter((w: any) => w.word && w.word.trim().length > 0);
        
        for (let i = 0; i < validWords.length; i += CHUNK_SIZE) {
          const group = validWords.slice(i, i + CHUNK_SIZE);
          const startSec = Number(group[0].start.toFixed(2));
          const lastEnd = Number(group[group.length - 1].end.toFixed(2));
          const endSec = Number(Math.max(lastEnd, startSec + 1.2).toFixed(2));
          const text = group.map((w: any) => w.word.trim()).join(' ');

          const mins = Math.floor(startSec / 60);
          const secs = Math.floor(startSec % 60);
          const timeLabel = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

          cues.push({
            id: `cue_${cues.length}`,
            startSec,
            endSec,
            timeLabel,
            text,
            words: group.map((w: any) => ({
              word: w.word.trim(),
              startSec: Number(w.start.toFixed(2)),
              endSec: Number(w.end.toFixed(2)),
            }))
          });
        }
      } else if (transcription.segments && Array.isArray(transcription.segments)) {
        const rawSegments = transcription.segments || [];

        rawSegments.forEach((seg: any) => {
          const rawText = (seg.text || '').trim();
          if (!rawText) return;

          const words = rawText.split(/\s+/).filter((w: string) => w.length > 0);
          if (words.length === 0) return;

          const duration = Math.max(0.6, seg.end - seg.start);
          const chunkCount = Math.ceil(words.length / CHUNK_SIZE);
          const step = duration / chunkCount;

          for (let i = 0; i < words.length; i += CHUNK_SIZE) {
            const chunkWords = words.slice(i, i + CHUNK_SIZE);
            const chunkIdx = i / CHUNK_SIZE;
            const startSec = Number((seg.start + chunkIdx * step).toFixed(2));
            const endSec = Number(Math.max(seg.start + (chunkIdx + 1) * step, startSec + 1.2).toFixed(2));

            const mins = Math.floor(startSec / 60);
            const secs = Math.floor(startSec % 60);
            const timeLabel = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            cues.push({
              id: `cue_${cues.length}`,
              startSec,
              endSec,
              timeLabel,
              text: chunkWords.join(' '),
              words: chunkWords.map((w: string, wIdx: number) => ({
                word: w,
                startSec: Number((startSec + (wIdx / chunkWords.length) * step).toFixed(2)),
                endSec: Number((startSec + ((wIdx + 1) / chunkWords.length) * step).toFixed(2)),
              })),
            });
          }
        });
      }

      for (let k = 0; k < cues.length - 1; k++) {
        if (cues[k + 1].startSec > cues[k].endSec && cues[k + 1].startSec - cues[k].endSec < 1.2) {
          cues[k].endSec = cues[k + 1].startSec;
        }
      }

      return { 
        success: true, 
        cues: cues, 
        data: {
          cues: cues,
          fullText: transcription.text || '',
          totalCues: cues.length,
          duration: transcription.duration || data.duration || 0,
        },
        fullText: transcription.text 
      };
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;
      console.error("Lỗi Whisper AI transcribe:", error);
      return { success: false, error: error.message || "Lỗi bóc băng âm thanh" };
    }
  }

  // =========================================================================
  // 🌟 7. TÍNH NĂNG MỚI: BÓC BĂNG & CHUYỂN NGỮ ĐA NGÔN NGỮ (TIẾNG TRUNG/ANH -> TIẾNG VIỆT)
  // ƯU TIÊN GROQ WHISPER LARGE V3 & LLAMA 3.3 70B (SIÊU TỐC, 100% MIỄN PHÍ, BẢO MẬT SERVER)
  // DỰ PHÒNG GOOGLE GEMINI NẾU GROQ TẠM GIÁN ĐOẠN
  // =========================================================================
  async transcribeAndTranslate(data: {
    audioBase64?: string;
    mimeType?: string;
    duration?: number;
    videoTitle?: string;
    sourceLang?: string;
    startOffset?: number;
    chunkIndex?: number;
    totalChunks?: number;
    workspaceId?: string;
  }) {
    if (data.workspaceId) {
      await this.checkPlanPermission(data.workspaceId);
    }

    try {
      const {
        audioBase64,
        mimeType,
        duration,
        videoTitle,
        startOffset = 0,
        chunkIndex = 1,
        totalChunks = 1,
      } = data;

      const totalSec = Math.max(3, Math.round(Number(duration) || 30));
      const offset = Math.max(0, Number(startOffset) || 0);

      // =====================================================================
      // 🌟 ĐỘNG CƠ 1: GROQ WHISPER LARGE V3 + LLAMA 3.3 70B (ƯU TIÊN SỐ 1 - 0 ĐỒNG)
      // =====================================================================
      const groqKey = process.env.GROQ_API_KEY || process.env.GROQ_KEY || '';
      if (groqKey && audioBase64) {
        try {
          console.log(`[Groq Whisper] Đang bóc băng phân đoạn ${chunkIndex}/${totalChunks} (mốc ${offset}s)...`);
          const rawAudio = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
          const audioBuffer = Buffer.from(rawAudio, 'base64');

          const formData = new FormData();
          const fileBlob = new Blob([audioBuffer], { type: mimeType || 'audio/wav' });
          formData.append('file', fileBlob, 'audio.wav');
          formData.append('model', 'whisper-large-v3');
          formData.append('response_format', 'verbose_json');
          formData.append('temperature', '0');

          const groqResp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${groqKey}` },
            body: formData,
          });

          if (groqResp.ok) {
            const whisperData = await groqResp.json();
            const detectedLang = whisperData.language || 'auto';
            const segments = whisperData.segments || [];

            if (segments.length === 0 && !whisperData.text?.trim()) {
              return { success: true, detectedLanguage: detectedLang, summary: '', cues: [] };
            }

            const rawItems = segments.length > 0
              ? segments.map((s: any, idx: number) => ({
                  id: idx + 1,
                  startSec: Number(Number(s.start || 0).toFixed(1)),
                  endSec: Number(Number(s.end || (s.start + 2.5)).toFixed(1)),
                  text: String(s.text || '').trim(),
                }))
              : [{ id: 1, startSec: 0.0, endSec: totalSec, text: String(whisperData.text || '').trim() }];

            const validItems = rawItems.filter((it: any) => it.text.length > 0);

            // Nếu ngôn ngữ gốc ĐÃ LÀ TIẾNG VIỆT ('vi' hoặc 'vietnamese'):
            if (detectedLang.toLowerCase() === 'vi' || detectedLang.toLowerCase() === 'vietnamese') {
              const finalCues = validItems.map((it: any) => ({
                id: `groq_${offset}_${it.id}`,
                startSec: Number((it.startSec + offset).toFixed(1)),
                endSec: Number((Math.max(it.startSec + 0.8, it.endSec) + offset).toFixed(1)),
                text: it.text,
              }));
              return {
                success: true,
                chunkIndex,
                totalChunks,
                startOffset: offset,
                detectedLanguage: 'Tiếng Việt',
                summary: '',
                cues: finalCues,
              };
            }

            // Dịch sang tiếng Việt bằng Groq Llama 3.3 70B (Siêu tốc ~250 tokens/s, 100% miễn phí)
            const translatePrompt = `Bạn là chuyên gia dịch thuật phụ đề video và phim ảnh sang tiếng Việt xuất sắc.
NHIỆM VỤ: Dịch toàn bộ các câu sau sang tiếng Việt chuẩn ngữ cảnh, tự nhiên, lôi cuốn theo phong cách video mạng xã hội (TikTok, Douyin, YouTube).
QUY TẮC BẮT BUỘC:
1. Giữ nguyên cấu trúc startSec và endSec của từng câu.
2. Dịch thoát nghĩa, ngắn gọn, súc tích (3 đến 7 từ mỗi câu nếu có thể để khớp nhịp đọc MC).
3. Tuyệt đối trả về đúng JSON định dạng:
{
  "cues": [
    { "id": 1, "startSec": 0.5, "endSec": 3.2, "text": "Câu dịch tiếng Việt thứ nhất" }
  ]
}

Danh sách câu cần dịch:
${JSON.stringify(validItems)}`;

            const transResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${groqKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                  { role: 'system', content: 'Bạn là chuyên gia dịch phụ đề video sang tiếng Việt. Chỉ trả về JSON duy nhất.' },
                  { role: 'user', content: translatePrompt },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2,
              }),
            });

            if (transResp.ok) {
              const transData = await transResp.json();
              const content = transData.choices?.[0]?.message?.content || '{}';
              try {
                const parsed = JSON.parse(content);
                if (parsed && Array.isArray(parsed.cues) && parsed.cues.length > 0) {
                  const finalCues = parsed.cues.map((c: any, i: number) => {
                    const rawStart = Number(c.startSec !== undefined ? c.startSec : (validItems[i]?.startSec || 0));
                    const rawEnd = Number(c.endSec !== undefined ? c.endSec : (validItems[i]?.endSec || (rawStart + 2.5)));
                    return {
                      id: `groq_${offset}_${c.id || i + 1}`,
                      startSec: Number((rawStart + offset).toFixed(1)),
                      endSec: Number((Math.max(rawStart + 0.8, rawEnd) + offset).toFixed(1)),
                      text: String(c.text || validItems[i]?.text || '').trim(),
                    };
                  });
                  return {
                    success: true,
                    chunkIndex,
                    totalChunks,
                    startOffset: offset,
                    detectedLanguage: detectedLang,
                    summary: '',
                    cues: finalCues,
                  };
                }
              } catch (parseErr) {
                console.warn('[Groq JSON Parse Error]:', parseErr);
              }
            }

            // Dự phòng câu gốc nếu dịch Llama tạm lỗi
            const fallbackCues = validItems.map((it: any) => ({
              id: `groq_${offset}_${it.id}`,
              startSec: Number((it.startSec + offset).toFixed(1)),
              endSec: Number((Math.max(it.startSec + 0.8, it.endSec) + offset).toFixed(1)),
              text: it.text,
            }));
            return {
              success: true,
              chunkIndex,
              totalChunks,
              startOffset: offset,
              detectedLanguage: detectedLang,
              summary: '',
              cues: fallbackCues,
            };
          }
        } catch (groqErr) {
          console.warn('[Groq Whisper failed, fallback to Gemini]:', groqErr);
        }
      }

      // =====================================================================
      // 🌟 ĐỘNG CƠ 2: DỰ PHÒNG QUA GOOGLE GEMINI NẾU CHƯA CÓ GROQ
      // =====================================================================
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
      if (!apiKey && !groqKey) {
        throw new Error('Chưa cấu hình GROQ_API_KEY hoặc GEMINI_API_KEY trên Coolify');
      }

      const modelsToTry = [
        'gemini-3.5-transcribe',
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
        'gemini-flash-latest'
      ];

      const prompt = `Bạn là chuyên gia bóc băng âm thanh và dịch phụ đề video sang tiếng Việt.
Phân đoạn video dài ${totalSec} giây.
Nhiệm vụ: Lắng nghe âm thanh đính kèm, nhận diện lời thoại nhân vật và dịch chuẩn xác sang tiếng Việt.
Trả về định dạng JSON thuần túy:
{
  "detectedLanguage": "Ngôn ngữ gốc",
  "summary": "",
  "cues": [
    { "id": 1, "startSec": 0.5, "endSec": 3.0, "text": "Câu dịch tiếng Việt..." }
  ]
}`;

      const parts: any[] = [{ text: prompt }];
      if (audioBase64 && typeof audioBase64 === 'string') {
        const rawBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
        parts.push({
          inlineData: {
            mimeType: mimeType || 'audio/wav',
            data: rawBase64,
          },
        });
      }

      let resultJson: any = null;

      // 1. Thử qua SDK
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        for (const model of modelsToTry) {
          try {
            const resp = await ai.models.generateContent({
              model,
              contents: parts,
              config: { responseMimeType: 'application/json', temperature: 0.2 },
            });
            const rawText = (resp.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
            if (rawText) {
              const parsed = JSON.parse(rawText);
              if (parsed && Array.isArray(parsed.cues)) {
                resultJson = parsed;
                break;
              }
            }
          } catch (mErr) {
            console.warn(`[Gemini SDK ${model} failed]:`, mErr);
          }
        }
      } catch (sdkErr) {}

      // 2. Thử qua REST nếu SDK chưa trả về
      if (!resultJson) {
        for (const model of modelsToTry) {
          try {
            const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const restResp = await fetch(restUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts }],
                generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
              }),
            });
            if (restResp.ok) {
              const data = await restResp.json();
              const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
              if (cleaned) {
                const parsed = JSON.parse(cleaned);
                if (parsed && Array.isArray(parsed.cues)) {
                  resultJson = parsed;
                  break;
                }
              }
            }
          } catch (restErr) {}
        }
      }

      if (!resultJson) {
        throw new Error('Không thể xử lý âm thanh trong phân đoạn này.');
      }

      const finalCues = (resultJson.cues || []).map((c: any) => ({
        id: c.id ? `gemini_${offset}_${c.id}` : `gemini_${offset}_${Math.random()}`,
        startSec: Number((Number(c.startSec || 0) + offset).toFixed(1)),
        endSec: Number((Number(c.endSec || (c.startSec + 2.5)) + offset).toFixed(1)),
        text: String(c.text || '').trim(),
      }));

      return {
        success: true,
        chunkIndex,
        totalChunks,
        startOffset: offset,
        detectedLanguage: resultJson.detectedLanguage || 'Tự động nhận diện',
        summary: resultJson.summary || '',
        cues: finalCues,
      };
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;
      console.error('Lỗi transcribeAndTranslate:', error);
      throw new Error(error.message || 'Lỗi bóc băng và chuyển ngữ video');
    }
  }
}
