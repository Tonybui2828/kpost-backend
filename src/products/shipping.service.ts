import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  async createVTPOrder(order: any, token: string, shopId: string) {
    const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
    const cleanToken = token.replace(/\s/g, '').trim();

    // 1. Logic bóc tách địa chỉ dự phòng nếu khách chưa chọn Tỉnh/Huyện/Xã
    const province = order.province || "Hồ Chí Minh";
    const district = order.district || "Quận 5";
    const ward = order.ward || "Phường 15";

    const now = new Date();
    const deliveryDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const payload = {
      ORDER_NUMBER: order.id.substring(0, 10).toUpperCase(),
      GROUPADDRESS_ID: Number(shopId),
      CUS_ID: 0,
      DELIVERY_DATE: deliveryDate,
      SENDER_FULLNAME: "Dropbuy Việt Nam",
      SENDER_PHONE: "0928912828",
      RECEIVER_FULLNAME: order.customerName,
      RECEIVER_PHONE: order.customerPhone.replace(/[^0-9]/g, ''),
      RECEIVER_ADDRESS: order.customerAddress,
      RECEIVER_PROVINCE: province,
      RECEIVER_DISTRICT: district,
      RECEIVER_WARDS: ward,
      PRODUCT_NAME: "Hàng hóa tổng hợp",
      PRODUCT_WEIGHT: order.weight || 500,
      PRODUCT_QUANTITY: 1,
      PRODUCT_PRICE: Math.round(order.totalAmount),
      PRODUCT_TYPE: "HH",
      MONEY_COLLECTION: Math.round(order.totalAmount),
      ORDER_PAYMENT: 2, 
      ORDER_SERVICE: "VCN",
      
      // --- QUAN TRỌNG: TYPE_ORDER = 3 LÀ ĐƠN NHÁP ---
      TYPE_ORDER: 3, 
      
      CHECK_USER: 1,
      LIST_ITEM: [{
        PRODUCT_NAME: "Hàng hóa",
        PRODUCT_WEIGHT: order.weight || 500,
        PRODUCT_QUANTITY: 1,
        PRODUCT_PRICE: Math.round(order.totalAmount)
      }]
    };

    try {
      const response = await axios.post(createUrl, payload, {
        headers: { 'Token': cleanToken, 'Content-Type': 'application/json' }
      });
      
      if (response.data.status === 200 || response.data.error === false) {
        return response.data;
      } else {
        // Log lỗi chi tiết từ VTP để debug
        console.error("VTP Error Response:", response.data);
        throw new Error(response.data.message || "ViettelPost từ chối đơn hàng");
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      throw new Error(msg);
    }
  }
}