import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  async createVTPOrder(order: any, token: string, shopId: string) {
    const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
    const cleanToken = token.replace(/\s/g, '').trim();

    // 1. KIỂM TRA DỮ LIỆU BẮT BUỘC
    if (!order.province || !order.district) {
        throw new Error("Đơn hàng này thiếu thông tin Tỉnh/Huyện cấu trúc. Vui lòng nhấn 'Sửa đơn' trên web để chọn đúng Tỉnh/Huyện trước khi giao.");
    }

    // 2. Chuẩn hóa địa chỉ (Xóa bỏ tiền tố thừa)
    const province = order.province.replace(/Thành phố |Tỉnh /gi, "").trim();
    const district = order.district.replace(/Quận |Huyện |Thị xã /gi, "").trim();
    const ward = (order.ward || "").replace(/Phường |Xã |Thị trấn /gi, "").trim();

    const now = new Date();
    const deliveryDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const payload = {
      ORDER_NUMBER: `K${Date.now().toString().slice(-9)}`,
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
      PRODUCT_NAME: "Hàng hóa",
      PRODUCT_WEIGHT: Number(order.weight) || 500,
      PRODUCT_QUANTITY: 1,
      PRODUCT_PRICE: Math.round(Number(order.totalAmount || 0)),
      PRODUCT_TYPE: "HH",
      MONEY_COLLECTION: Math.round(Number(order.totalAmount || 0)),
      ORDER_PAYMENT: 2, 
      ORDER_SERVICE: "VCN",
      TYPE_ORDER: 3, // ĐƠN NHÁP
      CHECK_USER: 1,
      LIST_ITEM: [{
        PRODUCT_NAME: "Hàng hóa",
        PRODUCT_WEIGHT: Number(order.weight) || 500,
        PRODUCT_QUANTITY: 1,
        PRODUCT_PRICE: Math.round(Number(order.totalAmount || 0))
      }]
    };

    try {
      const response = await axios.post(createUrl, payload, {
        headers: { 'Token': cleanToken, 'Content-Type': 'application/json' }
      });
      
      if (response.data.status === 200 || response.data.error === false) {
        return response.data;
      } else {
        throw new Error(`VTP từ chối: ${response.data.message}`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(errorMsg);
    }
  }
}