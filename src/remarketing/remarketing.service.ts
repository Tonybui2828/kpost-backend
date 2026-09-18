import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import OpenAI from 'openai';
import axios from 'axios';

@Injectable()
export class RemarketingService {
  private readonly logger = new Logger(RemarketingService.name);
  private isCronRunning = false;
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  constructor(private prisma: PrismaService) {}

  // 1. API: LÊN LỊCH TỪ FRONTEND (ĐÃ XỬ LÝ KHÓA NGOẠI VÀ TỰ TẠO CUSTOMER NẾU CHƯA CÓ)
  async scheduleCampaign(data: { customerIds: string[], prompt: string, scheduledAt: string, workspaceId: string }) {
    const { customerIds, prompt, scheduledAt, workspaceId } = data;
    const safeWorkspaceId = workspaceId && workspaceId.trim() !== "" ? workspaceId : "default_workspace";

    if (!customerIds || customerIds.length === 0) {
      return { success: false, message: "Danh sách khách hàng không được để trống." };
    }

    const validCustomerIds: string[] = [];

    // Duyệt qua từng ID gửi lên để đảm bảo khách hàng tồn tại trong bảng Customer
    for (const rawId of customerIds) {
      try {
        // 1.1 Kiểm tra xem rawId có phải là Customer.id hay Customer.psid
        let customer = await this.prisma.customer.findFirst({
          where: {
            OR: [
              { id: rawId },
              { psid: rawId }
            ]
          }
        });

        // 1.2 Nếu chưa tồn tại trong bảng Customer, tự động tạo mới để tránh lỗi Foreign Key
        if (!customer) {
          // Thử tìm Fanpage mặc định của Workspace
          const account = await this.prisma.socialAccount.findFirst({
            where: { workspaceId: safeWorkspaceId }
          });

          customer = await this.prisma.customer.create({
            data: {
              id: rawId,
              psid: rawId,
              name: `Khách #${rawId.slice(-4)}`,
              status: 'chua_mua',
              workspaceId: safeWorkspaceId,
              platformId: account?.platformId || "default_page",
              lastInteractedAt: new Date()
            }
          });
        }

        if (customer) {
          validCustomerIds.push(customer.id);
        }
      } catch (err: any) {
        this.logger.warn(`Không thể khởi tạo khách hàng ID: ${rawId} - ${err.message}`);
      }
    }

    if (validCustomerIds.length === 0) {
      return { success: false, message: "Không tìm thấy thông tin khách hàng hợp lệ để tạo chiến dịch." };
    }

    // Tạo danh sách Task với customerId hợp lệ 100%
    const tasks = validCustomerIds.map(cId => ({
      customerId: cId,
      workspaceId: safeWorkspaceId,
      prompt: prompt,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      status: 'pending'
    }));

    await this.prisma.remarketingTask.createMany({ data: tasks });
    return { success: true, message: `✅ Đã đưa ${validCustomerIds.length} khách hàng vào hàng đợi Remarketing thành công!` };
  }

  // 2. AI CÁ NHÂN HÓA TIN NHẮN THEO LUẬT 24H
  private async generatePersonalizedMessage(customerName: string, prompt: string, isOver24h: boolean): Promise<string> {
    try {
      const systemInstruction = isOver24h 
        ? `Bạn là nhân viên chăm sóc khách hàng. Hãy viết 1 tin nhắn NGẮN GỌN, THÂN THIỆN gửi cho khách hàng tên "${customerName}". Dựa trên ý chính: "${prompt}". 
           BẮT BUỘC: KHÔNG dùng từ ngữ quảng cáo, giảm giá, mua bán (vì vi phạm chính sách Facebook). CHỈ HỎI THĂM trải nghiệm, xin feedback, hoặc hỏi lý do chưa mua để mồi khách phản hồi.`
        : `Bạn là nhân viên bán hàng. Hãy viết 1 tin nhắn tự nhiên, thân thiện gửi cho khách tên "${customerName}". Dựa trên nội dung: "${prompt}". Có thể kèm khuyến mãi.`;

      const res = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemInstruction }],
        temperature: 0.7,
      });

      return res.choices[0]?.message?.content?.trim() || `Chào ${customerName}, em nhắn tin để hỏi thăm trải nghiệm của mình ạ.`;
    } catch (error) {
      this.logger.error("Lỗi AI sinh tin nhắn Remarketing:", error);
      return `Chào ${customerName}, dạo này anh/chị khỏe không ạ? Em nhắn tin để hỏi thăm trải nghiệm của mình ạ.`;
    }
  }

  // 3. CRONJOB: GỬI TIN CÓ ĐỘ TRỄ CHỐNG SPAM
  @Cron(CronExpression.EVERY_MINUTE)
  async processRemarketingQueue() {
    if (this.isCronRunning) return;
    this.isCronRunning = true;

    try {
      const now = new Date();
      // Lấy 5 task mỗi lần quét
      const pendingTasks = await this.prisma.remarketingTask.findMany({
        where: { status: 'pending', scheduledAt: { lte: now } },
        take: 5, 
        include: { customer: true }
      });

      if (pendingTasks.length === 0) {
        this.isCronRunning = false;
        return;
      }

      for (const task of pendingTasks) {
        if (!task.customer) {
          await this.prisma.remarketingTask.update({ where: { id: task.id }, data: { status: 'failed' } });
          continue;
        }

        await this.prisma.remarketingTask.update({ where: { id: task.id }, data: { status: 'processing' } });

        try {
          // Lấy Access Token của Fanpage
          const account = await this.prisma.socialAccount.findFirst({
            where: { platformId: task.customer.platformId }
          });

          if (!account || !account.accessToken) {
            throw new Error("Không tìm thấy Access Token của Fanpage");
          }

          // Tính toán luật 24h
          const lastChatTime = task.customer.lastInteractedAt ? new Date(task.customer.lastInteractedAt).getTime() : 0;
          const hoursSinceLastChat = lastChatTime > 0 ? (now.getTime() - lastChatTime) / (1000 * 60 * 60) : 999;
          const isOver24h = hoursSinceLastChat > 24;

          // AI sinh nội dung
          const messageToSend = await this.generatePersonalizedMessage(task.customer.name, task.prompt, isOver24h);

          // Build cấu hình gửi Facebook
          const fbPayload: any = {
            recipient: { id: task.customer.psid || task.customer.id },
            message: { text: messageToSend },
            messaging_type: isOver24h ? "MESSAGE_TAG" : "UPDATE"
          };
          
          if (isOver24h) {
             fbPayload.tag = task.customer.status === "da_mua" ? "POST_PURCHASE_UPDATE" : "ACCOUNT_UPDATE";
          }

          // Gọi API Facebook gửi tin
          await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${account.accessToken}`, fbPayload);

          this.logger.log(`✅ Đã gửi Remarketing cho khách: ${task.customer.name}`);
          await this.prisma.remarketingTask.update({ where: { id: task.id }, data: { status: 'completed' } });

        } catch (error: any) {
          this.logger.error(`❌ Lỗi gửi Remarketing KH ${task.customer.name}:`, error?.response?.data || error.message);
          await this.prisma.remarketingTask.update({ where: { id: task.id }, data: { status: 'failed' } });
        }

        // Delay ngẫu nhiên từ 15 -> 30 giây chống spam
        const delayMs = Math.floor(Math.random() * (30000 - 15000 + 1) + 15000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

    } finally {
      this.isCronRunning = false;
    }
  }
}