import { Controller, Get, Req, UseGuards, Res, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt'; // Đảm bảo đã npm install @nestjs/jwt

@Controller('auth')
export class AuthController {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 1. Cổng gọi đăng nhập Google
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  // 2. Cổng xử lý dữ liệu Google trả về
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const googleUser = req.user;

    // BƯỚC QUAN TRỌNG: Lưu hoặc Cập nhật user vào Database của bạn
    const user = await this.prisma.user.upsert({
      where: { email: googleUser.email },
      update: { name: `${googleUser.firstName} ${googleUser.lastName}`, image: googleUser.picture },
      create: {
        email: googleUser.email,
        name: `${googleUser.firstName} ${googleUser.lastName}`,
        image: googleUser.picture,
        role: 'user', // Mặc định là user thường
      },
    });

    // Tạo mã JWT Token để xác thực các phiên làm việc sau này
    const payload = { email: user.email, sub: user.id, role: user.role };
    const jwtToken = this.jwtService.sign(payload);

    // Chuyển hướng về Frontend kèm theo Token trên đường dẫn (URL)
    // Frontend sẽ bốc cái token này và lưu vào localStorage
    return res.redirect(`https://kpost.vn/dashboard?token=${jwtToken}`);
  }

  // 3. API Lấy thông tin cá nhân (Mà bạn vừa hỏi)
  @Get('profile')
  async getProfile(@Req() req) {
    try {
      // Lấy token từ header gửi lên
      const authHeader = req.headers.authorization;
      if (!authHeader) return { message: 'Unauthorized' };

      const token = authHeader.split(' ')[1];
      const decoded = this.jwtService.verify(token);

      // Tìm user trong DB theo ID trong token
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, name: true, role: true, image: true }
      });

      return user;
    } catch (e) {
      return { message: 'Invalid token' };
    }
  }
}