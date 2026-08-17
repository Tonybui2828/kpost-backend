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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const ai_content_service_1 = require("../ai-content/ai-content.service");
let DashboardController = class DashboardController {
    constructor(prisma, aiService) {
        this.prisma = prisma;
        this.aiService = aiService;
    }
    async getStats(workspaceId) {
        try {
            const workspace = await this.prisma.workspace.findUnique({
                where: { id: workspaceId },
                select: { plan: true }
            });
            const now = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            const allOrders = await this.prisma.order.findMany({
                where: { workspaceId },
                orderBy: { createdAt: 'desc' }
            });
            const totalRevenue = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
            const totalOrders = allOrders.length;
            const chartData = this.formatChartData(allOrders, sevenDaysAgo);
            const totalPosts = await this.prisma.post.count({ where: { workspaceId } });
            const totalMessages = await this.prisma.inboxMessage.count({ where: { workspaceId } });
            const lowStockProducts = await this.prisma.product.findMany({
                where: { workspaceId, totalStock: { lt: 10 } }
            });
            const aiInsight = await this.aiService.analyzeGrowth({
                totalRevenue,
                totalOrders,
                totalPosts,
                totalMessages,
                lowStockCount: lowStockProducts.length
            });
            return {
                stats: {
                    totalRevenue,
                    totalOrders,
                    totalPosts,
                    totalMessages,
                    lowStockCount: lowStockProducts.length,
                    chart: chartData,
                    plan: workspace?.plan || 'free'
                },
                recentOrders: allOrders.slice(0, 5),
                aiInsight: aiInsight
            };
        }
        catch (error) {
            console.error("Lỗi Dashboard:", error.message);
            return {
                stats: { totalRevenue: 0, totalOrders: 0, totalPosts: 0, totalMessages: 0, lowStockCount: 0, chart: [], plan: 'free' },
                recentOrders: [],
                aiInsight: { analysis: "Đang cập nhật...", suggestions: [] }
            };
        }
    }
    formatChartData(orders, startDate) {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return {
                date: days[d.getDay()],
                revenue: 0,
                fullDate: d.toLocaleDateString('vi-VN')
            };
        }).reverse();
        orders.forEach(order => {
            const orderDate = new Date(order.createdAt).toLocaleDateString('vi-VN');
            const dayData = last7Days.find(d => d.fullDate === orderDate);
            if (dayData) {
                dayData.revenue += order.totalAmount;
            }
        });
        return last7Days;
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Query)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getStats", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_content_service_1.AiContentService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map