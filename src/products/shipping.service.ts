import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  async createVTPOrder(order: any, token: string, shopId: string) {
    const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
    const cleanToken = token.replace(/\s/g, '').trim();

    // LOG để kiểm tra dữ liệu từ Database truyền sang
    console.log("--- 🕵️ DỮ LIỆU ĐƠN HÀNG NHẬN ĐƯỢC:", JSON.stringify(order, null, 2));

    // TRÍCH XUẤT ĐỊA CHỈ: Bạn phải đảm bảo tên trường (key) khớp với Database của bạn
    // Nếu log trên hiện ra trường khác, hãy sửa lại các dòng dưới đây
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
      const response = await axios.post(createUrl, payload, {
        headers: { 'Token': cleanToken, 'Content-Type': 'application/json' }
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
}