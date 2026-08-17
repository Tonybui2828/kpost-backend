// src/auth.service.ts
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
  async register(email: string, pass: string, name: string) {
    // Kiểm tra xem email đã có người dùng chưa
    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) throw new BadRequestException('Email này đã được sử dụng!');

    // Mã hóa mật khẩu (không bao giờ lưu mật khẩu thô vào DB)
    const hashedPassword = await bcrypt.hash(pass, 10);

    // Lưu người dùng mới vào Supabase
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        // Lưu ý: Trong schema.prisma bạn cần thêm cột password nếu muốn lưu mật khẩu
        // Tạm thời chúng ta lưu thông tin cơ bản trước
      },
    });

    return { message: 'Đăng ký thành công!', userId: user.id };
  }

  // 2. Logic Đăng nhập (Trả về Token để truy cập web)
  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}