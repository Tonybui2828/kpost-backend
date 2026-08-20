import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  async createVTPOrder(order: any, token: string, shopId: string) {
    const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
    const cleanToken = token.replace(/\s/g, '').trim();

    // 1. CHUẨN HÓA TIẾNG VIỆT (Chuyển về dạng NFC để VTP không bị lỗi font)
    const normalize = (str: string) => {
      if (!str) return "";
      return str.normalize('NFC')
        .replace(/Tỉnh |Thành phố |Thành Phố |Quận |Huyện |Thị xã |Phường |Xã |Thị trấn /gi, "")
        .trim();
    };

    const province = normalize(order.province);
    const district = normalize(order.district);
    const ward = normalize(order.ward);

    const now = new Date();
    const deliveryDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // 2. TẠO PAYLOAD VỚI CÁC THÔNG SỐ CỐ ĐỊNH AN TOÀN
    const payload = {
      ORDER_NUMBER: `K${Date.now().toString().slice(-9)}`,
      GROUPADDRESS_ID: Number(shopId),
      CUS_ID: 0,
      DELIVERY_DATE: deliveryDate,
      SENDER_FULLNAME: "Dropbuy Việt Nam",
      SENDER_PHONE: "0928912828",
      RECEIVER_FULLNAME: normalize(order.customerName) || "Khach Hang",
      RECEIVER_PHONE: order.customerPhone.replace(/[^0-9]/g, '').slice(-10),
      RECEIVER_ADDRESS: order.customerAddress.normalize('NFC'),
      RECEIVER_PROVINCE: province,
      RECEIVER_DISTRICT: district,
      RECEIVER_WARDS: ward,
      
      PRODUCT_NAME: "Hàng gia dụng",
      PRODUCT_WEIGHT: Math.max(Number(order.weight) || 500, 100), // Tối thiểu 100g
      PRODUCT_QUANTITY: 1,
      PRODUCT_PRICE: Math.round(Number(order.totalAmount || 0)),
      PRODUCT_TYPE: "HH",
      MONEY_COLLECTION: Math.round(Number(order.totalAmount || 0)),
      
      // KÍCH THƯỚC MẶC ĐỊNH (Thiếu cái này VTP đôi khi báo lỗi 400 rỗng)
      PRODUCT_LENGTH: 10,
      PRODUCT_WIDTH: 10,
      PRODUCT_HEIGHT: 10,

      ORDER_PAYMENT: 1, // 1: Người gửi trả (Shop trả), 2: Người nhận trả. Thử đổi sang 1.
      ORDER_SERVICE: "VCN", 
      TYPE_ORDER: 3, // ĐƠN NHÁP
      CHECK_USER: 1,
      
      LIST_ITEM: [{
        PRODUCT_NAME: "Hàng gia dụng",
        PRODUCT_WEIGHT: Math.max(Number(order.weight) || 500, 100),
        PRODUCT_QUANTITY: 1,
        PRODUCT_PRICE: Math.round(Number(order.totalAmount || 0))
      }]
    };

    try {
      const response = await axios.post(createUrl, payload, {
        headers: { 
          'Token': cleanToken, 
          'Content-Type': 'application/json' 
        }
      });
      
      if (response.data.status === 200 || response.data.error === false) {
        return response.data;
      } else {
        // Nếu VTP trả về lỗi trong body
        const errorMsg = response.data.message || JSON.stringify(response.data);
        console.error("--- ❌ VTP REJECTED:", errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      // Bóc tách lỗi 400 chi tiết nhất có thể
      const errorBody = error.response?.data;
      console.error("--- ❌ CRITICAL ERROR:", JSON.stringify(errorBody, null, 2));
      
      const finalMsg = errorBody?.message || errorBody?.data || "Dữ liệu Tỉnh/Huyện hoặc Mã kho không khớp danh mục VTP";
      throw new Error(finalMsg);
    }
  }
}