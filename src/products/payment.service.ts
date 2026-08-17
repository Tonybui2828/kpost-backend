import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// SỬA LẠI DÒNG NÀY: Dùng require để tránh lỗi "not constructable"
const PayOS = require('@payos/node');

@Injectable()
export class PaymentService {
  private payos: any;
  private readonly logger = new Logger(PaymentService.name);

  constructor(private prisma: PrismaService) {
    // Khởi tạo PayOS
    try {
      this.payos = new PayOS(
        process.env.PAYOS_CLIENT_ID || '',
        process.env.PAYOS_API_KEY || '',
        process.env.PAYOS_CHECKSUM_KEY || ''
      );
      this.logger.log("✅ PayOS đã sẵn sàng!");
    } catch (e) {
      this.logger.warn("Cảnh báo: Chưa cấu hình PayOS Keys trong .env");
    }
  }

  // 1. TẠO GIAO DỊCH CHỜ (Dùng cho cả Casso và PayOS)
  async createTransaction(workspaceId: string, planName: string, amount: number) {
    // Tạo mã nội dung chuyển khoản duy nhất (Ví dụ: SAASAI123456)
    const billCode = `SAASAI${Math.floor(100000 + Math.random() * 900000)}`;

    return this.prisma.transaction.create({
      data: {
        workspaceId,
        amount,
        planName,
        description: billCode,
        status: 'pending'
      }
    });
  }

  // 2. LOGIC DÀNH CHO CASSO (Gạch nợ qua Webhook ngân hàng)
  async handleCassoWebhook(body: any) {
    this.logger.log("--- 🔔 NHẬN WEBHOOK TỪ CASSO ---");
    const transactions = body.data;
    if (!transactions) return { error: 0, message: "No data" };

    for (const trans of transactions) {
      const memo = trans.description; // Nội dung khách ghi

      const dbTrans = await this.prisma.transaction.findFirst({
        where: { 
          description: { contains: memo, mode: 'insensitive' },
          status: 'pending' 
        }
      });

      if (dbTrans) {
        await this.activatePlan(dbTrans);
      }
    }
    return { error: 0, message: "Ok" };
  }

  // 3. LOGIC KÍCH HOẠT GÓI (DÙNG CHUNG)
  private async activatePlan(transaction: any) {
    // Cập nhật giao dịch thành công
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'success' }
    });

    // Tính ngày hết hạn (30 ngày từ hôm nay)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    // Nâng cấp gói cho Shop
    await this.prisma.workspace.update({
      where: { id: transaction.workspaceId },
      data: {
        plan: transaction.planName,
        planExpiry: expiryDate
      }
    });

    this.logger.log(`✅ KÍCH HOẠT THÀNH CÔNG: Shop ${transaction.workspaceId} lên gói ${transaction.planName}`);
  }

  // 4. LOGIC DÀNH CHO PAYOS (Nếu bạn muốn dùng link thanh toán của họ)
  async createPaymentLink(workspaceId: string, planName: string, amount: number) {
    const orderCode = Number(Date.now().toString().slice(-6));
    const transaction = await this.createTransaction(workspaceId, planName, amount);

    const body = {
      orderCode: orderCode,
      amount: amount,
      description: transaction.description, // Gửi mã SAASAI... sang PayOS
      cancelUrl: 'http://localhost:3000/settings',
      returnUrl: 'http://localhost:3000/settings',
    };

    return await this.payos.createPaymentLink(body);
  }
}