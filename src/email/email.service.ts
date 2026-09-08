import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true, 
      auth: {
        user: process.env.ZOHO_MAIL_USER, 
        pass: process.env.ZOHO_MAIL_PASS, 
      },
    });
  }

  // ==========================================
  // 1. EMAIL THÔNG BÁO ĐẶT HÀNH THÀNH CÔNG
  // ==========================================
  async sendOrderSuccessEmail(toEmail: string, orderData: any) {
    if (!toEmail) return;
    try {
      const mailOptions = {
        from: `"Kpost Shop" <${process.env.ZOHO_MAIL_USER}>`,
        to: toEmail,
        subject: `🎉 Đặt hàng thành công! Mã đơn #${orderData.id}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto;">
            <h2 style="color: #2e6c80;">Cảm ơn bạn đã đặt hàng!</h2>
            <p>Xin chào <strong>${orderData.customerName}</strong>,</p>
            <p>Đơn hàng của bạn đã được ghi nhận trên hệ thống. Thông tin chi tiết:</p>
            <ul style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
              <li><strong>Mã đơn:</strong> #${orderData.id}</li>
              <li><strong>Tên người nhận:</strong> ${orderData.customerName}</li>
              <li><strong>SĐT:</strong> ${orderData.customerPhone || 'Chưa cung cấp'}</li>
              <li><strong>Địa chỉ:</strong> ${orderData.customerAddress}</li>
              <li><strong>Tổng tiền:</strong> ${Number(orderData.totalAmount).toLocaleString('vi-VN')}đ</li>
            </ul>
            <p>Chúng tôi sẽ sớm liên hệ để xác nhận và giao hàng. Cảm ơn bạn!</p>
          </div>
        `,
      };
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Đã gửi mail đặt hàng tới: ${toEmail}`);
    } catch (error) {
      this.logger.error(`❌ Lỗi gửi mail đặt hàng: ${error.message}`);
    }
  }

  // ==========================================
  // 2. EMAIL QUÊN MẬT KHẨU
  // ==========================================
  async sendForgotPasswordEmail(toEmail: string, resetToken: string) {
    if (!toEmail) return;
    try {
      const resetLink = `${process.env.FRONTEND_URL || 'https://kpost.vn'}/reset-password?token=${resetToken}`; 
      
      const mailOptions = {
        from: `"Kpost Security" <${process.env.ZOHO_MAIL_USER}>`,
        to: toEmail,
        subject: '🔒 Yêu cầu đặt lại mật khẩu Kpost',
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; max-width: 500px; margin: auto;">
            <h2 style="color: #d9534f;">Yêu cầu đặt lại mật khẩu</h2>
            <p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>${toEmail}</strong>.</p>
            <p>Vui lòng click vào nút bên dưới để đổi mật khẩu mới (Link có hiệu lực trong 15 phút):</p>
            <br>
            <a href="${resetLink}" style="padding: 12px 25px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">ĐẶT LẠI MẬT KHẨU</a>
            <br><br>
            <p style="font-size: 12px; color: #777;">Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
          </div>
        `,
      };
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Đã gửi mail Quên MK tới: ${toEmail}`);
    } catch (error) {
      this.logger.error(`❌ Lỗi gửi mail Quên MK: ${error.message}`);
    }
  }

  // ==========================================
  // 3. EMAIL KHUYẾN MÃI MARKETING
  // ==========================================
  async sendPromotionalEmail(toEmail: string, title: string, content: string, discountCode: string, link: string) {
    if (!toEmail) return;
    try {
      const mailOptions = {
        from: `"Kpost Ưu Đãi" <${process.env.ZOHO_MAIL_USER}>`,
        to: toEmail,
        subject: `🎁 ${title}`,
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; border: 1px solid #eee; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto;">
            <h2 style="color: #ff5722;">SIÊU ƯU ĐÃI DÀNH CHO BẠN!</h2>
            <p style="font-size: 16px;">${content}</p>
            <div style="background-color: #fff3e0; padding: 15px; margin: 20px 0; border-radius: 5px; border: 1px dashed #ff9800;">
              Mã giảm giá của bạn: <strong style="font-size: 20px; color: #e65100;">${discountCode}</strong>
            </div>
            <a href="${link}" style="padding: 15px 30px; background-color: #ff5722; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">MUA NGAY</a>
          </div>
        `,
      };
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Đã gửi mail Khuyến mãi tới: ${toEmail}`);
    } catch (error) {
      this.logger.error(`❌ Lỗi gửi mail KM: ${error.message}`);
    }
  }

  // ==========================================
  // 4. EMAIL RÚT TIỀN AFFILIATE THÀNH CÔNG
  // ==========================================
  async sendAffiliateWithdrawEmail(toEmail: string, amount: number, bankName: string, bankAccount: string) {
    if (!toEmail) return;
    try {
      const mailOptions = {
        from: `"Kpost Affiliate" <${process.env.ZOHO_MAIL_USER}>`,
        to: toEmail,
        subject: `💰 Rút tiền hoa hồng thành công!`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
            <h2 style="color: #28a745; text-align: center;">Thanh toán thành công!</h2>
            <p>Chào bạn,</p>
            <p>Yêu cầu rút tiền hoa hồng Affiliate của bạn đã được Kpost duyệt và chuyển khoản thành công. Dưới đây là thông tin chi tiết:</p>
            <ul style="background: #f4fdf6; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; list-style-type: none;">
              <li><strong>Số tiền rút:</strong> <span style="color: #d9534f; font-weight: bold; font-size: 16px;">${Number(amount).toLocaleString('vi-VN')}đ</span></li>
              <li><strong>Ngân hàng nhận:</strong> ${bankName}</li>
              <li><strong>Số tài khoản:</strong> ${bankAccount}</li>
              <li><strong>Thời gian duyệt:</strong> ${new Date().toLocaleString('vi-VN')}</li>
            </ul>
            <p>Tiền sẽ về tài khoản của bạn trong ít phút (tuỳ thuộc vào ngân hàng). Cảm ơn bạn đã đồng hành cùng Kpost!</p>
          </div>
        `,
      };
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Đã gửi mail rút tiền Affiliate tới: ${toEmail}`);
    } catch (error) {
      this.logger.error(`❌ Lỗi gửi mail rút tiền Affiliate: ${error.message}`);
    }
  }
}