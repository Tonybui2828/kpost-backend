import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule'; 
import { JwtModule } from '@nestjs/jwt'; // <--- THÊM DÒNG NÀY

// Modules
import { AiContentModule } from './ai-content/ai-content.module';
import { AdminModule } from './admin/admin.module';

// Controllers
import { ProductsController } from './products/products.controller';
import { OrdersController } from './products/orders.controller';
import { SocialController } from './social/social.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { InboxController } from './inbox/inbox.controller'; 
import { ShippingController } from './products/shipping.controller'; 
import { AuthController } from './auth/auth.controller'; 

// Services
import { PrismaService } from './prisma.service';
import { ProductsService } from './products/products.service';
import { FacebookService } from './social/facebook.service';
import { SocialScheduleService } from './social/social-schedule.service'; 
import { ChatGateway } from './social/chat.gateway';
import { AutomatorService } from './social/automator.service';
import { AiContentService } from './ai-content/ai-content.service';
import { ShippingService } from './products/shipping.service'; 
import { PaymentService } from './products/payment.service'; 
import { GoogleStrategy } from './auth/google.strategy'; 

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // --- ĐĂNG KÝ JWT ĐỂ TẠO MÃ ĐĂNG NHẬP ---
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'kpost_ai_secret_key_2024', // Nên đổi trong file .env
      signOptions: { expiresIn: '7d' }, // Token có hiệu lực 7 ngày
    }),
    AiContentModule,
    AdminModule, 
  ],
  controllers: [
    ProductsController, 
    SocialController,
    OrdersController,
    DashboardController,
    InboxController,    
    ShippingController,
    AuthController      
  ],
  providers: [
    PrismaService, 
    ProductsService, 
    FacebookService,
    SocialScheduleService,
    ChatGateway,
    AutomatorService,
    AiContentService,
    ShippingService,
    PaymentService,
    GoogleStrategy      
  ],
})
export class AppModule {}