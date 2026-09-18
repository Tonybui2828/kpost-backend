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
  // 0. EMAIL THÔNG BÁO TỔNG QUÁT DÙNG CHUNG (Cập nhật mới)
  // ==========================================
  async sendEmail(toEmail: string, subject: string, contentHtml: string): Promise<boolean> {
    if (!toEmail) return false;
    try {
      const mailOptions = {
        from: `"Kpost System" <${process.env.ZOHO_MAIL_USER}>`,
        to: toEmail,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
             ${contentHtml.replace(/\n/g, '<br>')}
          </div>
        `,
      };
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Đã gửi email (Chủ đề: ${subject}) tới: ${toEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Lỗi gửi email: ${error.message}`);
      return false;
    }
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

  // ==========================================
  // 5. EMAIL GỬI MÃ XÁC THỰC OTP (2FA BẢO MẬT)
  // ==========================================
  async sendOTPEmail(to: string, otpCode: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"Kpost Security" <${process.env.ZOHO_MAIL_USER}>`, 
        to: to,
        subject: `[KPOST] Mã xác thực bảo mật OTP của bạn: ${otpCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="background-color: #2563eb; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-style: italic;">KPOST AI SECURITY</h1>
            </div>
            <div style="padding: 32px; background-color: #ffffff;">
              <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">Xin chào!</h2>
              <p style="color: #475569; line-height: 1.6;">
                Hệ thống nhận được yêu cầu <strong>Kích hoạt bảo mật đa tầng (OTP 2FA)</strong> cho tài khoản của bạn tại hệ thống Kpost AI.
              </p>
              <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 24px; text-align: center; border-radius: 12px; margin: 24px 0;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 12px 0; text-transform: uppercase; font-weight: bold;">Mã xác thực của bạn là:</p>
                <div style="font-size: 42px; font-weight: 900; letter-spacing: 8px; color: #2563eb;">
                  ${otpCode}
                </div>
              </div>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                Mã bảo mật này có hiệu lực trong <strong>5 phút</strong>. Tuyệt đối KHÔNG chia sẻ mã này cho bất kỳ ai, kể cả nhân viên Kpost.
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email và thay đổi mật khẩu ngay lập tức.
              </p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Đã gửi mã OTP ${otpCode} tới ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Lỗi khi gửi mail OTP: ${error.message}`);
      throw new Error('Lỗi gửi email xác thực. Vui lòng thử lại sau!');
    }
  }
}