import { Controller, Get, Post, Body, Req, UseGuards, Res, HttpStatus, HttpException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs'; // Sử dụng bcryptjs để ổn định trên VPS

@Controller('auth')
export class AuthController {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ==========================================
  // 1. ĐĂNG KÝ THỦ CÔNG
  // ==========================================
  @Post('register')
  async register(@Body() body: any) {
    const { email, password, name } = body;

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

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { workspaces: { include: { workspace: true } } }
    });

    if (!user || !user.password) {
      throw new HttpException('Tài khoản không tồn tại!', HttpStatus.UNAUTHORIZED);
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
  // 3. ĐỔI MẬT KHẨU (MỚI BỔ SUNG)
  // ==========================================
  @Post('change-password')
  async changePassword(@Req() req, @Body() body: any) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) throw new HttpException('Chưa đăng nhập', HttpStatus.UNAUTHORIZED);

      const token = authHeader.split(' ')[1];
      const decoded = this.jwtService.verify(token);

      const { old, new: newPass } = body;
      const user = await this.prisma.user.findUnique({ where: { id: decoded.sub } });

      if (!user || !user.password) {
        throw new HttpException('Tài khoản này dùng Google, không có mật khẩu để đổi!', HttpStatus.BAD_REQUEST);
      }

      // Kiểm tra mật khẩu cũ
      const isMatch = await bcrypt.compare(old, user.password);
      if (!isMatch) {
        throw new HttpException('Mật khẩu hiện tại không chính xác', HttpStatus.BAD_REQUEST);
      }

      // Mã hóa và lưu mật khẩu mới
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
  // 4. ĐĂNG NHẬP GOOGLE
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
  // 5. LẤY THÔNG TIN CÁ NHÂN
  // ==========================================
  @Get('profile')
  async getProfile(@Req() req) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) throw new Error();

      const token = authHeader.split(' ')[1];
      const decoded = this.jwtService.verify(token);

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { workspaces: { include: { workspace: true } } }
      });

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