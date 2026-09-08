import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service'; // Sửa đường dẫn import
import { PrismaService } from '../prisma.service'; // Sửa đường dẫn import
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'; // Hoặc 'bcryptjs' tùy dự án

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private emailService: EmailService,
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  @Post('register')
  async register(@Body() body: any) {
    // Truyền thêm affiliateBy vào service
    return this.authService.register(body.email, body.password, body.name, body.affiliateBy);
  }

  // ==========================================
  // 1. API YÊU CẦU QUÊN MẬT KHẨU (GỬI MAIL)
  // ==========================================
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    if (!body.email) {
      throw new HttpException('Vui lòng cung cấp email', HttpStatus.BAD_REQUEST);
    }

    // Kiểm tra tài khoản có tồn tại không
    const user = await this.prisma.user.findUnique({
      where: { email: body.email }
    });

    if (!user) {
      return { success: true, message: 'Nếu email tồn tại trên hệ thống, link khôi phục đã được gửi.' };
    }

    // Tạo mã token JWT có thời hạn 15 phút, gói email của user vào trong đó
    const resetToken = this.jwtService.sign(
      { email: user.email, purpose: 'reset-password' },
      { expiresIn: '15m' } 
    );

    // Gửi email cho khách
    await this.emailService.sendForgotPasswordEmail(user.email, resetToken);

    return { success: true, message: 'Vui lòng kiểm tra hộp thư email (hoặc thư rác) để đặt lại mật khẩu.' };
  }

  // ==========================================
  // 2. API ĐẶT LẠI MẬT KHẨU MỚI (TỪ LINK TRONG EMAIL)
  // ==========================================
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string, newPassword: string }) {
    if (!body.token || !body.newPassword) {
      throw new HttpException('Thiếu token hoặc mật khẩu mới', HttpStatus.BAD_REQUEST);
    }

    try {
      // 1. Giải mã và kiểm tra token xem còn hạn không
      const payload = this.jwtService.verify(body.token);

      if (payload.purpose !== 'reset-password') {
        throw new Error('Mã Token không hợp lệ cho chức năng này');
      }

      // 2. Mã hoá mật khẩu mới
      const hashedPassword = await bcrypt.hash(body.newPassword, 10);

      // 3. Cập nhật mật khẩu mới vào Database
      await this.prisma.user.update({
        where: { email: payload.email },
        data: { password: hashedPassword }
      });

      return { success: true, message: 'Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.' };
      
    } catch (error) {
      throw new HttpException('Đường link đã hết hạn (quá 15 phút) hoặc không hợp lệ. Vui lòng yêu cầu gửi lại.', HttpStatus.BAD_REQUEST);
    }
  }
}