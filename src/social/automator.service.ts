import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiContentService } from '../ai-content/ai-content.service';
import { FacebookService } from './facebook.service';
import * as puppeteer from 'puppeteer-core';

@Injectable()
export class AutomatorService {
  private readonly logger = new Logger(AutomatorService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiContentService,
    private fbService: FacebookService,
  ) {}

  // ==========================================
  // 1. AI AUTOPILOT - TỰ ĐỘNG PHẢN HỒI 24/7
  // ==========================================
  async processIncomingMessage(
    pageId: string, 
    senderId: string, 
    content: string, 
    type: 'inbox' | 'comment', 
    platformId: string
  ) {
    try {
      const account = await this.prisma.socialAccount.findFirst({
        where: { platformId: pageId },
        include: { workspace: true }
      });

      if (!account || !account.isAiAutoReply) return; 

      const plan = account.workspace.plan?.toUpperCase();
      if (plan !== 'GOLD' && plan !== 'DIAMOND') {
        this.logger.warn(`⚠️ Shop [${account.workspace.name}] không có quyền dùng AI Autopilot.`);
        return;
      }

      // 1. Nhờ AI soạn câu trả lời (Dựa trên kịch bản chốt đơn và phí ship)
      const aiReply = await this.aiService.suggestReply(content, account.workspaceId);
      if (!aiReply) return;

      // 2. Gửi phản hồi lên Facebook
      if (type === 'comment') {
        await this.fbService.replyToComment(platformId, account.accessToken, aiReply);
      } else {
        await this.fbService.sendReply(pageId, account.accessToken, senderId, aiReply);
      }

      // 3. Lưu lịch sử chat
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

      // --- MỚI: TỰ ĐỘNG LƯU ĐƠN HÀNG NẾU AI VỪA CHỐT XONG ---
      if (aiReply.includes("XÁC NHẬN CHỐT ĐƠN") || aiReply.includes("THÔNG TIN ĐƠN HÀNG")) {
          await this.extractAndSaveOrder(account.workspaceId, aiReply);
      }

      this.logger.log(`✅ AI đã xử lý xong tin nhắn cho: ${senderId}`);

    } catch (error) {
      this.logger.error("❌ Lỗi AI Autopilot:", error.message);
    }
  }

  // --- HÀM BÓC TÁCH VÀ LƯU ĐƠN HÀNG TỰ ĐỘNG ---
  private async extractAndSaveOrder(workspaceId: string, aiText: string) {
    try {
      this.logger.log("--- 🕵️ ĐANG BÓC TÁCH HÓA ĐƠN ĐỂ LƯU VÀO DATABASE ---");
      
      // Sử dụng model gpt-4o-mini của bạn để bóc tách text sang JSON
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

      // Lưu vào bảng Order trong Database
      const newOrder = await this.prisma.order.create({
        data: {
          workspaceId: workspaceId,
          customerName: orderData.customerName || "Khách chốt qua AI",
          customerPhone: orderData.customerPhone || "",
          customerAddress: orderData.customerAddress || "Xem trong đoạn chat",
          totalAmount: Number(orderData.totalAmount) || 0,
          status: 'confirmed', // Trạng thái Đã chốt
          carrierName: 'Chưa chọn'
        }
      });

      this.logger.log(`🎉 ĐÃ TỰ ĐỘNG TẠO ĐƠN HÀNG MỚI: ID ${newOrder.id}`);
    } catch (e) {
      this.logger.error("❌ Lỗi bóc tách đơn hàng:", e.message);
    }
  }

  // ==========================================
  // 2. ROBOT TỰ ĐỘNG ĐĂNG BÀI NHÓM (PUPPETEER)
  // ==========================================
  async postToGroup(groupId: string, cookiesJson: string, content: string) {
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
        if (postButton) (postButton as HTMLElement).click();
      });

      await new Promise(r => setTimeout(r, 3000));
      await page.keyboard.type(content, { delay: 30 });
      await new Promise(r => setTimeout(r, 2000));

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
        const submitBtn = buttons.find(b => b.textContent === "Đăng" || b.textContent === "Post");
        if (submitBtn) (submitBtn as HTMLElement).click();
      });

      await new Promise(r => setTimeout(r, 5000));
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      await browser.close(); 
    }
  }
}