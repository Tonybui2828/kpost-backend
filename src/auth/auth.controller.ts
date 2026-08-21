import { Controller, Get, Req, UseGuards, Res, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const googleUser = req.user;

    // 1. Tìm User trong DB kèm theo danh sách Workspace của họ
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
      include: { 
        workspaces: {
          include: { workspace: true }
        } 
      }
    });

    // 2. Nếu người dùng mới hoàn toàn (chưa có trong DB)
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          name: `${googleUser.firstName} ${googleUser.lastName}`,
          image: googleUser.picture,
          role: 'user',
          // TỰ ĐỘNG TẠO KHÔNG GIAN LÀM VIỆC RIÊNG CHO KHÁCH MỚI
          workspaces: {
            create: {
              workspace: {
                create: { 
                  name: `Cửa hàng của ${googleUser.firstName}`,
                  ownerId: "temp-id" // Sẽ được cập nhật sau nếu cần
                }
              }
            }
          }
        },
        include: { workspaces: { include: { workspace: true } } }
      });
    }

    // 3. Lấy ID không gian làm việc đầu tiên của người này
    const userWorkspaceId = user.workspaces[0]?.workspaceId || "no-workspace";

    // 4. Tạo mã JWT Token (Gắn kèm ID không gian vào mã hóa)
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role,
      wid: userWorkspaceId 
    };
    const jwtToken = this.jwtService.sign(payload);

    // 5. Chuyển hướng về Frontend kèm Token và Mã không gian (wid) trên đường dẫn
    // Frontend sẽ bốc cái 'wid' này lưu vào máy khách thay cho 'workspace-01'
    return res.redirect(`https://kpost.vn/dashboard?token=${jwtToken}&wid=${userWorkspaceId}`);
  }

  // API Lấy thông tin cá nhân
  @Get('profile')
  async getProfile(@Req() req) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return { message: 'Unauthorized' };

      const token = authHeader.split(' ')[1];
      const decoded = this.jwtService.verify(token);

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { 
          id: true, 
          email: true, 
          name: true, 
          role: true, 
          image: true,
          workspaces: {
            select: { workspaceId: true }
          }
        }
      });

      return {
        ...user,
        currentWorkspaceId: user.workspaces[0]?.workspaceId
      };
    } catch (e) {
      return { message: 'Invalid token' };
    }
  }
}