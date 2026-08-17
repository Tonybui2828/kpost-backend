"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const ai_content_module_1 = require("./ai-content/ai-content.module");
const admin_module_1 = require("./admin/admin.module");
const products_controller_1 = require("./products/products.controller");
const orders_controller_1 = require("./products/orders.controller");
const social_controller_1 = require("./social/social.controller");
const dashboard_controller_1 = require("./dashboard/dashboard.controller");
const inbox_controller_1 = require("./inbox/inbox.controller");
const shipping_controller_1 = require("./products/shipping.controller");
const prisma_service_1 = require("./prisma.service");
const products_service_1 = require("./products/products.service");
const facebook_service_1 = require("./social/facebook.service");
const social_schedule_service_1 = require("./social/social-schedule.service");
const chat_gateway_1 = require("./social/chat.gateway");
const automator_service_1 = require("./social/automator.service");
const ai_content_service_1 = require("./ai-content/ai-content.service");
const shipping_service_1 = require("./products/shipping.service");
const payment_service_1 = require("./products/payment.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            ai_content_module_1.AiContentModule,
            admin_module_1.AdminModule,
        ],
        controllers: [
            products_controller_1.ProductsController,
            social_controller_1.SocialController,
            orders_controller_1.OrdersController,
            dashboard_controller_1.DashboardController,
            inbox_controller_1.InboxController,
            shipping_controller_1.ShippingController
        ],
        providers: [
            prisma_service_1.PrismaService,
            products_service_1.ProductsService,
            facebook_service_1.FacebookService,
            social_schedule_service_1.SocialScheduleService,
            chat_gateway_1.ChatGateway,
            automator_service_1.AutomatorService,
            ai_content_service_1.AiContentService,
            shipping_service_1.ShippingService,
            payment_service_1.PaymentService
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map