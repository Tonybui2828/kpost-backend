"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
let ShippingService = class ShippingService {
    constructor() {
        this.vtpUrl = 'https://partner.viettelpost.vn/v2';
    }
    async createVTPOrder(orderData, vtpToken) {
        const url = `${this.vtpUrl}/order/create`;
        const payload = {
            ORDER_NUMBER: orderData.id,
            SENDER_FULLNAME: "Tên Shop Của Bạn",
            SENDER_ADDRESS: "123 Đường ABC",
            SENDER_PHONE: "0987654321",
            RECEIVER_FULLNAME: orderData.customerName,
            RECEIVER_ADDRESS: orderData.customerAddress,
            RECEIVER_PHONE: orderData.customerPhone,
            PRODUCT_NAME: "Hàng hóa tổng hợp",
            PRODUCT_WEIGHT: orderData.weight || 500,
            PRODUCT_PRICE: orderData.totalAmount,
            MONEY_COLLECTION: orderData.totalAmount,
            TYPE_ORDER: "VCN",
        };
        try {
            const res = await axios_1.default.post(url, payload, {
                headers: { 'Token': vtpToken }
            });
            return res.data;
        }
        catch (error) {
            console.error("Lỗi ViettelPost:", error.response?.data);
            throw new Error("Không thể kết nối đơn vị vận chuyển");
        }
    }
};
exports.ShippingService = ShippingService;
exports.ShippingService = ShippingService = __decorate([
    (0, common_1.Injectable)()
], ShippingService);
//# sourceMappingURL=shipping.service.js.map