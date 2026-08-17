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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const shipping_service_1 = require("./shipping.service");
let OrdersController = class OrdersController {
    constructor(prisma, shippingService) {
        this.prisma = prisma;
        this.shippingService = shippingService;
    }
    async createOrder(body) {
        const { workspaceId, customerName, customerPhone, customerAddress, province, district, ward, items } = body;
        return this.prisma.$transaction(async (tx) => {
            let total = 0;
            for (const item of items) {
                total += item.price * item.quantity;
                await tx.product.update({
                    where: { id: item.productId },
                    data: { totalStock: { decrement: item.quantity } }
                });
            }
            return tx.order.create({
                data: {
                    workspaceId,
                    customerName,
                    customerPhone,
                    customerAddress: customerAddress || "Chưa có địa chỉ",
                    province: province || "",
                    district: district || "",
                    ward: ward || "",
                    totalAmount: total,
                    status: 'confirmed',
                    items: {
                        create: items.map(i => ({
                            productId: i.productId,
                            quantity: i.quantity,
                            price: i.price
                        }))
                    }
                }
            });
        });
    }
    async getOrders(workspaceId) {
        return this.prisma.order.findMany({
            where: { workspaceId },
            include: {
                items: { include: { product: true } },
                workspace: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async shipOrder(id) {
        console.log(`--- 🚛 BẮT ĐẦU ĐẨY ĐƠN SANG VTP: ${id} ---`);
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: { workspace: true }
        });
        if (!order)
            throw new Error("Không tìm thấy đơn hàng");
        console.log(`--- Tuyến thực tế: ${order['province']} -> ${order['district']} ---`);
        const vtpToken = order.workspace?.vtpToken;
        const vtpShopId = order.workspace?.vtpShopId;
        if (!vtpToken || !vtpShopId) {
            throw new Error("Cửa hàng chưa cấu hình Token hoặc Mã kho ViettelPost");
        }
        try {
            const shipRes = await this.shippingService.createVTPOrder(order, vtpToken, vtpShopId);
            const vtpOrderNumber = shipRes.data?.ORDER_NUMBER || shipRes.ORDER_NUMBER;
            return await this.prisma.order.update({
                where: { id },
                data: {
                    shippingCode: vtpOrderNumber || 'Đang xử lý',
                    status: 'shipping',
                    carrierName: 'ViettelPost'
                }
            });
        }
        catch (error) {
            console.error("Lỗi VTP chi tiết:", error.message);
            throw new Error(error.message);
        }
    }
    async getShippingSettings(workspaceId) {
        return this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: { vtpToken: true, vtpShopId: true }
        });
    }
    async updateShippingSettings(workspaceId, body) {
        const { vtpToken, vtpShopId } = body;
        return this.prisma.workspace.update({
            where: { id: workspaceId },
            data: { vtpToken, vtpShopId },
        });
    }
    async updateOrder(id, body) {
        console.log(`--- CẬP NHẬT THÔNG TIN ĐƠN: ${id} ---`);
        return this.prisma.order.update({
            where: { id },
            data: {
                customerName: body.customerName,
                customerPhone: body.customerPhone,
                customerAddress: body.customerAddress,
                province: body.province,
                district: body.district,
                ward: body.ward,
                totalAmount: body.totalAmount ? Number(body.totalAmount) : undefined,
            }
        });
    }
    async deleteOrder(id) {
        return this.prisma.order.delete({
            where: { id }
        });
    }
    async bulkDelete(body) {
        return this.prisma.order.deleteMany({
            where: { id: { in: body.ids } }
        });
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "createOrder", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getOrders", null);
__decorate([
    (0, common_1.Post)(':id/ship'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "shipOrder", null);
__decorate([
    (0, common_1.Get)('shipping-settings/:workspaceId'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "getShippingSettings", null);
__decorate([
    (0, common_1.Patch)('shipping-settings/:workspaceId'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateShippingSettings", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "updateOrder", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "deleteOrder", null);
__decorate([
    (0, common_1.Post)('bulk-delete'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersController.prototype, "bulkDelete", null);
exports.OrdersController = OrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        shipping_service_1.ShippingService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map