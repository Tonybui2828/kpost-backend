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
  // 1. AI AUTOPILOT - TỰ ĐỘNG PHẢN HỒI 24/7 (CÓ HỖ TRỢ GỬI ẢNH)
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

      // 1. Nhờ AI soạn câu trả lời văn bản (Dựa trên kịch bản chốt đơn và phí ship của hàm CŨ)
      const aiReply = await this.aiService.suggestReply(content, account.workspaceId);
      if (!aiReply) return;

      // -------------------------------------------------------------
      // --- LOGIC MỚI: TÌM ẢNH SẢN PHẨM TRONG KHO ĐỂ ĐÍNH KÈM ---
      // -------------------------------------------------------------
      let productImageUrl = "";
      try {
        // Lấy toàn bộ sản phẩm (bỏ select để tránh lỗi Prisma Strict Type)
        const rawProducts = await this.prisma.product.findMany({ 
          where: { workspaceId: account.workspaceId }
        });
        
        if (rawProducts.length > 0) {
           // Lọc bớt dữ liệu rác để gửi cho AI (Tự động thích nghi với tên cột ảnh của DB)
           const productsForAi = rawProducts.map((p: any) => ({
               name: p.name,
               imageUrl: p.images || p.imageUrl || p.image || p.thumbnail || ""
           }));

           // Dùng AI rà soát xem trong câu trả lời (hoặc câu hỏi) có nhắc tới tên sản phẩm nào không
           const imgRes = await (this.aiService as any).openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                { 
                  role: "system", 
                  content: `Khách hỏi: "${content}". AI trả lời: "${aiReply}". Trong kho có các sản phẩm: ${JSON.stringify(productsForAi)}. 
                  Dựa vào ngữ cảnh, AI đang tư vấn sản phẩm nào? 
                  Trả về định dạng JSON: {"imageUrl": "link_anh_sản_phẩm"} hoặc {"imageUrl": ""} nếu không cần gửi ảnh.` 
                }
              ],
              response_format: { type: "json_object" }
           });
           const imgData = JSON.parse(imgRes.choices[0].message.content || '{}');
           productImageUrl = imgData.imageUrl || "";
        }
      } catch (e) {
        this.logger.error("Lỗi trích xuất ảnh sản phẩm:", e.message);
      }
      // -------------------------------------------------------------

      // 2. Gửi phản hồi lên Facebook
      if (type === 'comment') {
        await this.fbService.replyToComment(platformId, account.accessToken, aiReply);
      } else {
        // Truyền thêm productImageUrl vào hàm sendReply
        await (this.fbService as any).sendReply(pageId, account.accessToken, senderId, aiReply, productImageUrl);
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

      // 4. TỰ ĐỘNG LƯU ĐƠN HÀNG NẾU AI VỪA CHỐT XONG
      if (aiReply.includes("XÁC NHẬN CHỐT ĐƠN") || aiReply.includes("THÔNG TIN ĐƠN HÀNG")) {
          await this.extractAndSaveOrder(account.workspaceId, aiReply);
      }

      this.logger.log(`✅ AI xử lý xong tin nhắn. Khách: ${senderId} - Có gửi ảnh: ${!!productImageUrl}`);

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