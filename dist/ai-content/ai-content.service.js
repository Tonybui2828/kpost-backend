"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiContentService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = require("openai");
const prisma_service_1 = require("../prisma.service");
const supabase_js_1 = require("@supabase/supabase-js");
const axios_1 = require("axios");
let AiContentService = class AiContentService {
    constructor(prisma) {
        this.prisma = prisma;
        this.openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
        this.supabase = (0, supabase_js_1.createClient)("https://wsgjryobqfayxhdhujki.supabase.co", "sb_publishable__cTnEl5USBaraE6p6P0WDw_Q37Hmye7");
    }
    async analyzeGrowth(stats) {
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
        }
        catch (error) {
            return { analysis: "Đang cập nhật...", suggestions: ["Tăng cường đăng bài", "Chăm sóc khách cũ"] };
        }
    }
    async suggestReply(msg, wsId) {
        try {
            const products = await this.prisma.product.findMany({
                where: { workspaceId: wsId },
                select: { name: true, price: true, productUrl: true }
            });
            const productContext = products.map(p => `- ${p.name}: ${p.price?.toLocaleString()}đ`).join('\n');
            const systemPrompt = `
        Bạn là một nữ nhân viên chốt đơn tên là Mai của shop. Xưng hô: "Em" và "Anh/Chị".
        
        DANH SÁCH SẢN PHẨM HIỆN CÓ:
        ${productContext}

        QUY TẮC BÁN HÀNG & PHÍ SHIP:
        1. Nếu khách muốn mua sản phẩm nhưng CHƯA nói số lượng: Bắt buộc phải hỏi "Dạ Anh/Chị muốn lấy số lượng mấy bộ/cái ạ? Bên em đang có ưu đãi: Mua từ 2 sản phẩm trở lên là được MIỄN PHÍ SHIP toàn quốc luôn đó ạ 😍".
        2. Nếu khách mua 1 sản phẩm: Phí ship là 30.000đ.
        3. Nếu khách mua từ 2 sản phẩm trở lên: MIỄN PHÍ SHIP (Freeship).
        4. Luôn lễ phép, bắt đầu bằng "Dạ", kết thúc bằng "ạ", dùng nhiều icon: 😍, 🥰, 🚀.

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
        
        Cảm ơn Anh/Chị đã ủng hộ shop Mai ạ! Chờ em gửi hàng cho mình nhé 🚀"
      `;
            const res = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: msg }
                ],
                temperature: 0.3,
            });
            return res.choices[0].message.content;
        }
        catch (error) {
            console.error("Lỗi AI Autopilot:", error.message);
            return "Dạ em chào Anh/Chị, em có thể giúp gì cho mình không ạ? 😍";
        }
    }
    async getOptimizedPrompt(userPrompt) {
        const res = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Professional advertisement designer. Translate to English, high-end luxury style." },
                { role: "user", content: userPrompt }
            ],
        });
        return res.choices[0].message.content || userPrompt;
    }
    async editImage(imageUrl, prompt) {
        try {
            const technicalPrompt = await this.getOptimizedPrompt(prompt);
            const responseImg = await axios_1.default.get(imageUrl, { responseType: 'arraybuffer' });
            const imageFile = await openai_1.default.toFile(Buffer.from(responseImg.data), 'source.png');
            const aiResponse = await this.openai.images.edit({
                model: "gpt-image-2", image: imageFile, prompt: technicalPrompt, n: 1, size: "1024x1024",
            });
            return this.saveToSupabase(aiResponse.data[0]?.url || "");
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async generateImage(prompt) {
        try {
            const technicalPrompt = await this.getOptimizedPrompt(prompt);
            const res = await this.openai.images.generate({ model: "gpt-image-2", prompt: technicalPrompt, n: 1, size: "1024x1024" });
            return this.saveToSupabase(res.data[0].url || "");
        }
        catch (error) {
            return { url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` };
        }
    }
    async generatePost(topic, userId, workspaceId) {
        const res = await this.openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: topic }] });
        return this.prisma.post.create({ data: { content: res.choices[0].message.content || '', workspaceId, status: 'draft', userId: userId || null } });
    }
    async saveToSupabase(rawData) {
        try {
            if (!rawData.startsWith('http'))
                return { url: "" };
            const res = await axios_1.default.get(rawData, { responseType: 'arraybuffer' });
            const fileName = `ai_pro_${Date.now()}.png`;
            await this.supabase.storage.from('product-images').upload(fileName, Buffer.from(res.data), { contentType: 'image/png', upsert: true });
            return { url: this.supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl };
        }
        catch (e) {
            return { url: rawData };
        }
    }
};
exports.AiContentService = AiContentService;
exports.AiContentService = AiContentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AiContentService);
//# sourceMappingURL=ai-content.service.js.map