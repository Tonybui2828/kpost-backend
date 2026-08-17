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
exports.ShippingController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let ShippingController = class ShippingController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSettings(workspaceId) {
        return this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                vtpToken: true,
                vtpShopId: true,
                senderProvince: true,
                senderDistrict: true
            }
        });
    }
    async updateSettings(workspaceId, body) {
        return this.prisma.workspace.update({
            where: { id: workspaceId },
            data: body
        });
    }
};
exports.ShippingController = ShippingController;
__decorate([
    (0, common_1.Get)(':workspaceId'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Patch)(':workspaceId'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ShippingController.prototype, "updateSettings", null);
exports.ShippingController = ShippingController = __decorate([
    (0, common_1.Controller)('shipping'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ShippingController);
//# sourceMappingURL=shipping.controller.js.map