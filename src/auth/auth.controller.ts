import { Controller, Get, Post, Body, Req, UseGuards, Res, HttpStatus, HttpException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service'; 
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Controller('auth')
export class AuthController {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService, 
  ) {}

  // ==========================================
  // 1. ĐĂNG KÝ THỦ CÔNG
  // ==========================================
  @Post('register')
  async register(@Body() body: any) {
    const { email, password, name, affiliateBy } = body; 

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new HttpException('Email này đã được đăng ký!', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'user',
        affiliateBy: affiliateBy || null, 
        workspaces: {
          create: {
            workspace: {
              create: { 
                name: `Cửa hàng của ${name}`,
                ownerId: "manual-user"
              }
            }
          }
        }
      },
      include: { workspaces: true }
    });

    return { message: 'Đăng ký tài khoản thành công!' };
  }

  // ==========================================
  // 2. ĐĂNG NHẬP THỦ CÔNG
  // ==========================================
  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body;

    // --- [MỚI] KIỂM TRA TÀI KHOẢN ADMIN ĐẶC BIỆT (KHÔNG CẦN CÓ TRONG DB) ---
    if (email === 'tech28.vn@gmail.com' && password === '123Iloveyou$$$') {
      // Cấp luôn quyền admin bằng cách ký JWT đặc biệt
      const payload = { 
        email: email, 
        sub: 'super-admin-id', 
        role: 'admin', // Vai trò Admin
        wid: 'admin-workspace-01' 
      };
      const token = this.jwtService.sign(payload);

      return {
        token,
        wid: 'admin-workspace-01',
        name: 'Quản Trị Viên',
        email: email,
        role: 'admin'
      };
    }
    // -----------------------------------------------------------------------

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { workspaces: { include: { workspace: true } } }
    });

    if (!user || !user.password) {
      throw new HttpException('Tài khoản không tồn tại!', HttpStatus.UNAUTHORIZED);
    }

    if (user.status === 'deleted') {
      throw new HttpException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ: support@kpost.vn để được hỗ trợ', HttpStatus.FORBIDDEN);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new HttpException('Mật khẩu không chính xác!', HttpStatus.UNAUTHORIZED);
    }

    const userWorkspaceId = user.workspaces[0]?.workspaceId || "no-workspace";
    const payload = { email: user.email, sub: user.id, role: user.role, wid: userWorkspaceId };
    const token = this.jwtService.sign(payload);

    return {
      token,
      wid: userWorkspaceId,
      name: user.name,
      email: user.email
    };
  }

  // ==========================================
  // 3. ĐỔI MẬT KHẨU (KHI ĐÃ ĐĂNG NHẬP)
  // ==========================================
  @Post('change-password')
  async changePassword(@Req() req, @Body() body: any) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) throw new HttpException('Chưa đăng nhập', HttpStatus.UNAUTHORIZED);

      const token = authHeader.split(' ')[1];
      const decoded = this.jwtService.verify(token);

      // KHÔNG CHO PHÉP ĐỔI MẬT KHẨU CỦA ADMIN ẢO
      if (decoded.email === 'tech28.vn@gmail.com') {
         throw new HttpException('Tài khoản Quản trị không cho phép đổi mật khẩu từ giao diện này!', HttpStatus.BAD_REQUEST);
      }

      const { old, new: newPass } = body;
      const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });

      if (!user || !user.password) {
        throw new HttpException('Tài khoản này dùng Google, không có mật khẩu để đổi!', HttpStatus.BAD_REQUEST);
      }

      const isMatch = await bcrypt.compare(old, user.password);
      if (!isMatch) {
        throw new HttpException('Mật khẩu hiện tại không chính xác', HttpStatus.BAD_REQUEST);
      }

      const hashed = await bcrypt.hash(newPass, 10);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashed }
      });

      return { message: 'Cập nhật mật khẩu thành công!' };
    } catch (e) {
      throw new HttpException(e.message || 'Lỗi xử lý đổi mật khẩu', HttpStatus.BAD_REQUEST);
    }
  }

  // ==========================================
  // 4. QUÊN MẬT KHẨU (GỬI MAIL)
  // ==========================================
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    if (!body.email) {
      throw new HttpException('Vui lòng cung cấp email', HttpStatus.BAD_REQUEST);
    }

    if (body.email === 'tech28.vn@gmail.com') {
       return { success: true, message: 'Nếu email tồn tại trên hệ thống, link khôi phục đã được gửi.' };
    }

    const user = await this.prisma.user.findUnique({
      where: { email: body.email }
    });

    if (!user) {
      return { success: true, message: 'Nếu email tồn tại trên hệ thống, link khôi phục đã được gửi.' };
    }

    const resetToken = this.jwtService.sign(
      { email: user.email, purpose: 'reset-password' },
      { expiresIn: '15m' } 
    );

    await this.emailService.sendForgotPasswordEmail(user.email, resetToken);

    return { success: true, message: 'Vui lòng kiểm tra hộp thư email (hoặc thư rác) để đặt lại mật khẩu.' };
  }

  // ==========================================
  // 5. ĐẶT LẠI MẬT KHẨU TỪ LINK EMAIL
  // ==========================================
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string, newPassword: string }) {
    if (!body.token || !body.newPassword) {
      throw new HttpException('Thiếu token hoặc mật khẩu mới', HttpStatus.BAD_REQUEST);
    }

    try {
      const payload = this.jwtService.verify(body.token);

      if (payload.purpose !== 'reset-password') {
        throw new Error('Mã Token không hợp lệ');
      }

      const hashedPassword = await bcrypt.hash(body.newPassword, 10);

      await this.prisma.user.update({
        where: { email: payload.email },
        data: { password: hashedPassword }
      });

      return { success: true, message: 'Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.' };
      
    } catch (error) {
      throw new HttpException('Đường link đã hết hạn (quá 15 phút) hoặc không hợp lệ.', HttpStatus.BAD_REQUEST);
    }
  }

  // ==========================================
  // 6. ĐĂNG NHẬP GOOGLE
  // ==========================================
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const googleUser = req.user;

    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
      include: { workspaces: { include: { workspace: true } } }
    });

    if (user && user.status === 'deleted') {
      return res.redirect(`https://kpost.vn/login?error=account_locked`);
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          name: `${googleUser.firstName} ${googleUser.lastName}`,
          image: googleUser.picture,
          role: 'user',
          workspaces: {
            create: {
              workspace: {
                create: { 
                  name: `Cửa hàng của ${googleUser.firstName}`,
                  ownerId: "google-user"
                }
              }
            }
          }
        },
        include: { workspaces: { include: { workspace: true } } }
      });
    }

    const userWorkspaceId = user.workspaces[0]?.workspaceId || "no-workspace";
    const payload = { email: user.email, sub: user.id, role: user.role, wid: userWorkspaceId };
    const jwtToken = this.jwtService.sign(payload);

    return res.redirect(`https://kpost.vn/dashboard?token=${jwtToken}&wid=${userWorkspaceId}`);
  }

  // ==========================================
  // 7. LẤY THÔNG TIN CÁ NHÂN
  // ==========================================
  @Get('profile')
  async getProfile(@Req() req) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) throw new Error();

      const token = authHeader.split(' ')[1];
      const decoded = this.jwtService.verify(token);

      // --- TRẢ VỀ INFO CHO TÀI KHOẢN ADMIN ẢO ---
      if (decoded.email === 'tech28.vn@gmail.com') {
         return {
            id: 'super-admin-id',
            email: decoded.email,
            name: 'Quản Trị Viên',
            role: 'admin',
            plan: 'DIAMOND', // Admin có gói cao nhất
            currentWorkspaceId: 'admin-workspace-01'
         };
      }
      // -------------------------------------------

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { workspaces: { include: { workspace: true } } }
      });

      if (user && user.status === 'deleted') {
         throw new HttpException('Tài khoản đã bị khóa', HttpStatus.FORBIDDEN);
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.workspaces[0]?.workspace?.plan?.toUpperCase() || "FREE",
        currentWorkspaceId: user.workspaces[0]?.workspaceId
      };
    } catch (e) {
      throw new HttpException('Mời bạn đăng nhập lại', HttpStatus.UNAUTHORIZED);
    }
  }
}