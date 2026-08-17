"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const PayOS = require('@payos/node');
let PaymentService = PaymentService_1 = class PaymentService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PaymentService_1.name);
        try {
            this.payos = new PayOS(process.env.PAYOS_CLIENT_ID || '', process.env.PAYOS_API_KEY || '', process.env.PAYOS_CHECKSUM_KEY || '');
            this.logger.log("✅ PayOS đã sẵn sàng!");
        }
        catch (e) {
            this.logger.warn("Cảnh báo: Chưa cấu hình PayOS Keys trong .env");
        }
    }
    async createTransaction(workspaceId, planName, amount) {
        const billCode = `SAASAI${Math.floor(100000 + Math.random() * 900000)}`;
        return this.prisma.transaction.create({
            data: {
                workspaceId,
                amount,
                planName,
                description: billCode,
                status: 'pending'
            }
        });
    }
    async handleCassoWebhook(body) {
        this.logger.log("--- 🔔 NHẬN WEBHOOK TỪ CASSO ---");
        const transactions = body.data;
        if (!transactions)
            return { error: 0, message: "No data" };
        for (const trans of transactions) {
            const memo = trans.description;
            const dbTrans = await this.prisma.transaction.findFirst({
                where: {
                    description: { contains: memo, mode: 'insensitive' },
                    status: 'pending'
                }
            });
            if (dbTrans) {
                await this.activatePlan(dbTrans);
            }
        }
        return { error: 0, message: "Ok" };
    }
    async activatePlan(transaction) {
        await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'success' }
        });
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        await this.prisma.workspace.update({
            where: { id: transaction.workspaceId },
            data: {
                plan: transaction.planName,
                planExpiry: expiryDate
            }
        });
        this.logger.log(`✅ KÍCH HOẠT THÀNH CÔNG: Shop ${transaction.workspaceId} lên gói ${transaction.planName}`);
    }
    async createPaymentLink(workspaceId, planName, amount) {
        const orderCode = Number(Date.now().toString().slice(-6));
        const transaction = await this.createTransaction(workspaceId, planName, amount);
        const body = {
            orderCode: orderCode,
            amount: amount,
            description: transaction.description,
            cancelUrl: 'http://localhost:3000/settings',
            returnUrl: 'http://localhost:3000/settings',
        };
        return await this.payos.createPaymentLink(body);
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map