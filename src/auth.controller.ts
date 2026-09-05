import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    // Truyền thêm affiliateBy vào service
    return this.authService.register(body.email, body.password, body.name, body.affiliateBy);
  }
}