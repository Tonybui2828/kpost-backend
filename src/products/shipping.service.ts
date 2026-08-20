import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  async createVTPOrder(order: any, token: string, shopId: string) {
    const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
    const cleanToken = token.replace(/\s/g, '').trim();

    // 1. Chỉnh sửa bảng mã tiếng Việt (VTP thường dùng mã chuẩn cũ)
    const normalizeName = (str: string) => {
      if (!str) return "";
      return str
        .replace(/Hoà Bình/g, "Hòa Bình")
        .replace(/Yên Thuỷ/g, "Yên Thủy")
        .replace(/Hữu Lợi/g, "Hữu Lợi")
        .replace(/Tỉnh |Thành phố |Thành Phố |Quận |Huyện |Thị xã |Phường |Xã |Thị trấn /gi, "")
        .trim();
    };

    const province = normalizeName(order.province);
    const district = normalizeName(order.district);
    const ward = normalizeName(order.ward || "");

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
      RECEIVER_PHONE: order.customerPhone.replace(/[^0-9]/g, '').slice(-10),
      RECEIVER_ADDRESS: order.customerAddress,
      RECEIVER_PROVINCE: province,
      RECEIVER_DISTRICT: district,
      RECEIVER_WARDS: ward,
      PRODUCT_NAME: "Hàng gia dụng",
      PRODUCT_WEIGHT: Number(order.weight) || 500,
      PRODUCT_QUANTITY: 1,
      PRODUCT_PRICE: Math.round(Number(order.totalAmount || 0)),
      PRODUCT_TYPE: "HH",
      MONEY_COLLECTION: Math.round(Number(order.totalAmount || 0)),
      
      // THAY ĐỔI: Thử để người nhận trả tiền ship (1) để tránh lỗi nếu tài khoản shop hết tiền
      ORDER_PAYMENT: 1, 
      
      ORDER_SERVICE: "VCN",
      TYPE_ORDER: 3, // ĐƠN NHÁP
      CHECK_USER: 1,
      LIST_ITEM: [{
        PRODUCT_NAME: "Sản phẩm",
        PRODUCT_WEIGHT: Number(order.weight) || 500,
        PRODUCT_QUANTITY: 1,
        PRODUCT_PRICE: Math.round(Number(order.totalAmount || 0))
      }]
    };

    try {
      console.log("--- 📦 KIỂM TRA DỮ LIỆU TRƯỚC KHI GỬI ---");
      console.log("Mã kho (ShopID):", payload.GROUPADDRESS_ID);
      console.log("Tuyến đường:", `${payload.RECEIVER_PROVINCE} - ${payload.RECEIVER_DISTRICT} - ${payload.RECEIVER_WARDS}`);

      const response = await axios.post(createUrl, payload, {
        headers: { 'Token': cleanToken, 'Content-Type': 'application/json' }
      });
      
      if (response.data.status === 200 || response.data.error === false) {
        return response.data;
      } else {
        // In lỗi thô từ VTP
        console.error("--- ❌ VTP TỪ CHỐI:", JSON.stringify(response.data, null, 2));
        throw new Error(response.data.message);
      }
    } catch (error) {
      const vtpResponse = error.response?.data;
      console.error("--- ❌ LỖI PHẢN HỒI TỪ VTP:", JSON.stringify(vtpResponse, null, 2));
      
      // Bóc tách lỗi cụ thể để hiện lên màn hình web
      let msg = "Dữ liệu không hợp lệ";
      if (vtpResponse?.message) msg = vtpResponse.message;
      if (vtpResponse?.data && typeof vtpResponse.data === 'string') msg = vtpResponse.data;
      
      throw new Error(msg);
    }
  }
}