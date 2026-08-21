import { Controller, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req, @Res() res) {
    // Sau khi login xong, Google trả về thông tin user ở req.user
    // Bạn có thể xử lý lưu DB ở đây, sau đó chuyển hướng về web chính
    console.log("User Google:", req.user);
    return res.redirect('https://kpost.vn/dashboard'); 
  }
}