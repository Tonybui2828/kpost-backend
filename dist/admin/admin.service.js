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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let AdminService = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardStats() {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const totalUsers = await this.prisma.user.count();
        const totalRevenue = await this.prisma.transaction.aggregate({
            where: { status: 'success' },
            _sum: { amount: true }
        });
        const thisMonthRevenue = await this.prisma.transaction.aggregate({
            where: {
                status: 'success',
                createdAt: { gte: firstDayOfMonth }
            },
            _sum: { amount: true }
        });
        const lastMonthRevenue = await this.prisma.transaction.aggregate({
            where: {
                status: 'success',
                createdAt: { gte: firstDayOfLastMonth, lt: firstDayOfMonth }
            },
            _sum: { amount: true }
        });
        const currentVal = thisMonthRevenue._sum.amount || 0;
        const lastVal = lastMonthRevenue._sum.amount || 0;
        let growth = 0;
        if (lastVal > 0) {
            growth = ((currentVal - lastVal) / lastVal) * 100;
        }
        return {
            totalUsers,
            totalRevenue: totalRevenue._sum.amount || 0,
            thisMonthRevenue: currentVal,
            growthRate: growth.toFixed(2) + '%',
            newUsersThisMonth: await this.prisma.user.count({ where: { createdAt: { gte: firstDayOfMonth } } })
        };
    }
    async getSystemSettings() {
        return this.prisma.systemSetting.upsert({
            where: { id: 'global' },
            update: {},
            create: { id: 'global', websiteName: 'Dropbuy SaaS' }
        });
    }
    async updateSystemSettings(data) {
        return this.prisma.systemSetting.update({
            where: { id: 'global' },
            data: data
        });
    }
    async getAllVouchers() {
        return this.prisma.voucher.findMany({ orderBy: { createdAt: 'desc' } });
    }
    async createVoucher(data) {
        return this.prisma.voucher.create({ data });
    }
    async deleteVoucher(id) {
        return this.prisma.voucher.delete({ where: { id } });
    }
    async getAllUsers() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                workspaces: {
                    select: {
                        workspace: {
                            select: {
                                name: true,
                                plan: true,
                                planExpiry: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async checkExpiringWorkspaces() {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const expiringWorkspaces = await this.prisma.workspace.findMany({
            where: {
                planExpiry: {
                    lte: threeDaysFromNow,
                    gte: new Date()
                }
            }
        });
        for (const ws of expiringWorkspaces) {
            await this.prisma.systemNotification.create({
                data: {
                    targetId: ws.id,
                    title: "Thông báo gia hạn gói cước",
                    content: `Gói cước của không gian ${ws.name} sẽ hết hạn vào ngày ${ws.planExpiry?.toLocaleDateString()}. Vui lòng gia hạn để không bị gián đoạn dịch vụ.`,
                    type: "renewal"
                }
            });
        }
        return { count: expiringWorkspaces.length };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map