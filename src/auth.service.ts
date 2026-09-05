import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  // 1. Logic Đăng ký
  async register(email: string, pass: string, name: string, affiliateBy?: string) {
    // Kiểm tra xem email đã có người dùng chưa
    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) throw new BadRequestException('Email này đã được sử dụng!');

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(pass, 10);

    // XỬ LÝ AFFILIATE
    let referrerWorkspaceId = null;
    if (affiliateBy && affiliateBy.startsWith('KPOST_')) {
      const refId = affiliateBy.replace('KPOST_', '');
      const referrer = await this.prisma.workspace.findUnique({ where: { id: refId } });
      if (referrer) {
        referrerWorkspaceId = refId;
        // Cộng 1 vào số lượt đăng ký của người giới thiệu
        await this.prisma.workspace.update({
          where: { id: refId },
          data: { totalSignups: { increment: 1 } }
        });
      }
    }

    // Lưu người dùng mới VÀ tạo luôn Workspace mặc định
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword, // Đã thêm mật khẩu
        workspaces: {
          create: {
            workspace: {
              create: {
                name: `Workspace của ${name || 'Bạn'}`,
                ownerId: 'temp', 
                referredBy: referrerWorkspaceId ? affiliateBy : null, // Lưu mã giới thiệu vào Workspace
              }
            },
            role: 'admin'
          }
        }
      },
      include: { workspaces: { include: { workspace: true } } }
    });

    // Cập nhật lại ownerId cho chuẩn
    const newWorkspace = user.workspaces[0].workspace;
    await this.prisma.workspace.update({
      where: { id: newWorkspace.id },
      data: { ownerId: user.id }
    });

    return { message: 'Đăng ký thành công!', userId: user.id, wid: newWorkspace.id };
  }

  // 2. Logic Đăng nhập
  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}