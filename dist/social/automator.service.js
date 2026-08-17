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
var AutomatorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomatorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const ai_content_service_1 = require("../ai-content/ai-content.service");
const facebook_service_1 = require("./facebook.service");
const puppeteer = require("puppeteer-core");
let AutomatorService = AutomatorService_1 = class AutomatorService {
    constructor(prisma, aiService, fbService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.fbService = fbService;
        this.logger = new common_1.Logger(AutomatorService_1.name);
    }
    async processIncomingMessage(pageId, senderId, content, type, platformId) {
        try {
            const account = await this.prisma.socialAccount.findFirst({
                where: { platformId: pageId },
                include: { workspace: true }
            });
            if (!account || !account.isAiAutoReply)
                return;
            const plan = account.workspace.plan?.toUpperCase();
            if (plan !== 'GOLD' && plan !== 'DIAMOND') {
                this.logger.warn(`⚠️ Shop [${account.workspace.name}] không có quyền dùng AI Autopilot.`);
                return;
            }
            const aiReply = await this.aiService.suggestReply(content, account.workspaceId);
            if (!aiReply)
                return;
            if (type === 'comment') {
                await this.fbService.replyToComment(platformId, account.accessToken, aiReply);
            }
            else {
                await this.fbService.sendReply(pageId, account.accessToken, senderId, aiReply);
            }
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
            if (aiReply.includes("XÁC NHẬN CHỐT ĐƠN") || aiReply.includes("THÔNG TIN ĐƠN HÀNG")) {
                await this.extractAndSaveOrder(account.workspaceId, aiReply);
            }
            this.logger.log(`✅ AI đã xử lý xong tin nhắn cho: ${senderId}`);
        }
        catch (error) {
            this.logger.error("❌ Lỗi AI Autopilot:", error.message);
        }
    }
    async extractAndSaveOrder(workspaceId, aiText) {
        try {
            this.logger.log("--- 🕵️ ĐANG BÓC TÁCH HÓA ĐƠN ĐỂ LƯU VÀO DATABASE ---");
            const res = await this.aiService.openai.chat.completions.create({
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
        }
        catch (e) {
            this.logger.error("❌ Lỗi bóc tách đơn hàng:", e.message);
        }
    }
    async postToGroup(groupId, cookiesJson, content) {
        const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
        const browser = await puppeteer.launch({
            executablePath: chromePath,
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized', '--no-sandbox', '--disable-notifications']
        });
        const page = await browser.newPage();
        try {
            const cookies = JSON.parse(cookiesJson);
            await page.setCookie(...cookies);
            await page.goto(`https://www.facebook.com/groups/${groupId}`, { waitUntil: 'networkidle2', timeout: 60000 });
            await new Promise(r => setTimeout(r, 3000));
            const postBoxSelector = 'div[role="button"]';
            await page.waitForSelector(postBoxSelector);
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
                const postButton = buttons.find(b => b.textContent.includes("Bạn viết gì đi") || b.textContent.includes("Create a public post"));
                if (postButton)
                    postButton.click();
            });
            await new Promise(r => setTimeout(r, 3000));
            await page.keyboard.type(content, { delay: 30 });
            await new Promise(r => setTimeout(r, 2000));
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
                const submitBtn = buttons.find(b => b.textContent === "Đăng" || b.textContent === "Post");
                if (submitBtn)
                    submitBtn.click();
            });
            await new Promise(r => setTimeout(r, 5000));
            return { success: true };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
        finally {
            await browser.close();
        }
    }
};
exports.AutomatorService = AutomatorService;
exports.AutomatorService = AutomatorService = AutomatorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_content_service_1.AiContentService,
        facebook_service_1.FacebookService])
], AutomatorService);
//# sourceMappingURL=automator.service.js.map