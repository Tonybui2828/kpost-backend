import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule'; 

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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AiContentModule,
    AdminModule, 
  ],
  controllers: [
    ProductsController, 
    SocialController,
    OrdersController,
    DashboardController,
    InboxController,    
    ShippingController  
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
    PaymentService 
  ],
})
export class AppModule {}