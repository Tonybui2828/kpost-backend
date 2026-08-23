import { Controller, Get, Post, Body, Req, UseGuards, Res, HttpStatus, HttpException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'; // Đảm bảo đã chạy: npm install bcrypt

@Controller('auth')
export class AuthController {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ==========================================
  // 1. ĐĂNG KÝ THỦ CÔNG (MỚI BỔ SUNG)
  // ==========================================
  @Post('register')
  async register(@Body() body: any) {
    const { email, password, name } = body;

    // Kiểm tra email tồn tại
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new HttpException('Email này đã được đăng ký!', HttpStatus.BAD_REQUEST);
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo User + Tự động tạo Workspace riêng cho họ (Giống logic Google)
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
  // 2. ĐĂNG NHẬP THỦ CÔNG (MỚI BỔ SUNG)
  // ==========================================
  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body;

    // Tìm user
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { workspaces: { include: { workspace: true } } }
    });

    if (!user || !user.password) {
      throw new HttpException('Tài khoản không tồn tại!', HttpStatus.UNAUTHORIZED);
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new HttpException('Mật khẩu không chính xác!', HttpStatus.UNAUTHORIZED);
    }

    // Lấy ID không gian của người này
    const userWorkspaceId = user.workspaces[0]?.workspaceId || "no-workspace";

    // Tạo Token
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
  // 3. ĐĂNG NHẬP GOOGLE (GIỮ NGUYÊN LOGIC CỦA BẠN)
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

    // Chuyển hướng về Frontend kèm Token và wid
    return res.redirect(`https://kpost.vn/dashboard?token=${jwtToken}&wid=${userWorkspaceId}`);
  }

  // ==========================================
  // 4. API LẤY PROFILE (ĐÃ CẬP NHẬT GÓI CƯỚC THẬT)
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
        // Trả về plan thật từ database thay vì viết cứng Gold Member
        plan: user.workspaces[0]?.workspace?.plan?.toUpperCase() || "FREE",
        currentWorkspaceId: user.workspaces[0]?.workspaceId
      };
    } catch (e) {
      throw new HttpException('Mời bạn đăng nhập lại', HttpStatus.UNAUTHORIZED);
    }
  }
}