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
    async createVTPOrder(order, token, shopId) {
        const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
        const cleanToken = token.replace(/\s/g, '').trim();
        console.log("--- 🕵️ DỮ LIỆU ĐƠN HÀNG NHẬN ĐƯỢC:", JSON.stringify(order, null, 2));
        const p = order.provinceName || order.province || "Hà Nội";
        const d = order.districtName || order.district || "Ba Đình";
        const w = order.wardName || order.ward || "Phúc Xá";
        const now = new Date();
        const deliveryDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const payload = {
            ORDER_NUMBER: order.code || `S${Date.now().toString().slice(-8)}`,
            GROUPADDRESS_ID: Number(shopId),
            CUS_ID: 0,
            DELIVERY_DATE: deliveryDate,
            SENDER_FULLNAME: "Dropbuy Việt Nam",
            SENDER_PHONE: "0928912828",
            RECEIVER_FULLNAME: order.customerName || "Khách hàng",
            RECEIVER_PHONE: String(order.customerPhone || "0912345678").replace(/[^0-9]/g, ''),
            RECEIVER_ADDRESS: order.customerAddress || "Địa chỉ khách hàng",
            RECEIVER_PROVINCE: p,
            RECEIVER_DISTRICT: d,
            RECEIVER_WARDS: w,
            PRODUCT_NAME: "Hàng gia dụng",
            PRODUCT_WEIGHT: 1000,
            PRODUCT_QUANTITY: 1,
            PRODUCT_PRICE: Math.round(Number(order.totalAmount || 0)),
            PRODUCT_TYPE: "HH",
            MONEY_COLLECTION: Math.round(Number(order.totalAmount || 0)),
            ORDER_PAYMENT: 2,
            ORDER_SERVICE: "VCN",
            TYPE_ORDER: 3,
            CHECK_USER: 1,
            LIST_ITEM: [{
                    PRODUCT_NAME: "Hàng gia dụng",
                    PRODUCT_WEIGHT: 1000,
                    PRODUCT_QUANTITY: 1,
                    PRODUCT_PRICE: Math.round(Number(order.totalAmount || 0))
                }]
        };
        try {
            console.log(`--- 🚀 ĐANG ĐẨY ĐƠN: ${payload.ORDER_NUMBER} (${p} -> ${d}) ---`);
            const response = await axios_1.default.post(createUrl, payload, {
                headers: { 'Token': cleanToken, 'Content-Type': 'application/json' }
            });
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.message || error.message);
        }
    }
};
exports.ShippingService = ShippingService;
exports.ShippingService = ShippingService = __decorate([
    (0, common_1.Injectable)()
], ShippingService);
//# sourceMappingURL=shipping.service.js.map