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

  // 1. API: LÊN LỊCH TỪ FRONTEND
  async scheduleCampaign(data: { customerIds: string[], prompt: string, scheduledAt: string, workspaceId: string }) {
    const { customerIds, prompt, scheduledAt, workspaceId } = data;
    const safeWorkspaceId = workspaceId && workspaceId.trim() !== "" ? workspaceId : "default_workspace";

    // Tạo hàng loạt task vào DB
    const tasks = customerIds.map(id => ({
      customerId: id,
      workspaceId: safeWorkspaceId,
      prompt: prompt,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      status: 'pending'
    }));

    await this.prisma.remarketingTask.createMany({ data: tasks });
    return { success: true, message: `Đã đưa ${customerIds.length} khách hàng vào hàng đợi Remarketing.` };
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

      return res.choices[0].message.content.trim();
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
      // Lấy 5 task mỗi lần quét để đảm bảo không bị nghẽn
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
        await this.prisma.remarketingTask.update({ where: { id: task.id }, data: { status: 'processing' } });

        try {
          // Lấy Access Token của Fanpage
          const account = await this.prisma.socialAccount.findFirst({
            where: { platformId: task.customer.platformId }
          });

          if (!account) throw new Error("Không tìm thấy Access Token của Fanpage");

          // Tính toán luật 24h
          const hoursSinceLastChat = (now.getTime() - task.customer.lastInteractedAt.getTime()) / (1000 * 60 * 60);
          const isOver24h = hoursSinceLastChat > 24;

          // AI sinh nội dung
          const messageToSend = await this.generatePersonalizedMessage(task.customer.name, task.prompt, isOver24h);

          // Build cấu hình gửi Facebook
          const fbPayload: any = {
            recipient: { id: task.customer.psid },
            message: { text: messageToSend },
            messaging_type: isOver24h ? "MESSAGE_TAG" : "UPDATE"
          };
          
          if (isOver24h) {
             // Dùng thẻ POST_PURCHASE_UPDATE cho khách đã mua, hoặc ACCOUNT_UPDATE
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

        // 🔥 THUẬT TOÁN CHỐNG SPAM: Delay ngẫu nhiên từ 15 -> 30 giây giữa mỗi lần gửi
        const delayMs = Math.floor(Math.random() * (30000 - 15000 + 1) + 15000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

    } finally {
      this.isCronRunning = false;
    }
  }
}