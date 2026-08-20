import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  async createVTPOrder(order: any, token: string, shopId: string) {
    const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
    const cleanToken = token.replace(/\s/g, '').trim();

    // 1. KIỂM TRÁ DỮ LIỆU ĐỊA CHỈ CẤU TRÚC (Bắt buộc phải có sau khi nhấn Sửa đơn)
    if (!order.province || !order.district) {
        throw new Error("Đơn hàng này chưa có Tỉnh/Huyện riêng biệt. Vui lòng bấm 'Sửa đơn' và điền vào ô Tỉnh/Huyện trước khi Giao ngay!");
    }

    // 2. CHUẨN HÓA ĐỊA DANH (VTP yêu cầu tên sạch, không kèm tiền tố Tỉnh/Thành phố/Quận/Huyện)
    const cleanProvince = order.province.replace(/Tỉnh |Thành phố |Thành Phố /gi, "").trim();
    const cleanDistrict = order.district.replace(/Quận |Huyện |Thị xã |Thành phố /gi, "").trim();
    const cleanWard = (order.ward || "").replace(/Phường |Xã |Thị trấn /gi, "").trim();

    const now = new Date();
    const deliveryDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const payload = {
      // Tạo mã đơn không trùng lặp
      ORDER_NUMBER: `K${Date.now().toString().slice(-9)}`,
      GROUPADDRESS_ID: Number(shopId),
      CUS_ID: 0,
      DELIVERY_DATE: deliveryDate,
      
      SENDER_FULLNAME: "Dropbuy Việt Nam",
      SENDER_PHONE: "0928912828",

      RECEIVER_FULLNAME: order.customerName,
      RECEIVER_PHONE: order.customerPhone.replace(/[^0-9]/g, ''), // Xóa ký tự lạ trong SĐT
      RECEIVER_ADDRESS: order.customerAddress,
      
      // ĐỊA CHỈ ĐÃ CHUẨN HÓA
      RECEIVER_PROVINCE: cleanProvince,
      RECEIVER_DISTRICT: cleanDistrict,
      RECEIVER_WARDS: cleanWard,

      PRODUCT_NAME: "Hàng hóa tổng hợp",
      PRODUCT_WEIGHT: Number(order.weight) || 500,
      PRODUCT_QUANTITY: 1,
      PRODUCT_PRICE: Math.round(Number(order.totalAmount || 0)),
      PRODUCT_TYPE: "HH",
      MONEY_COLLECTION: Math.round(Number(order.totalAmount || 0)),
      
      ORDER_PAYMENT: 2, // 2: Người gửi trả ship (Shop trả)
      ORDER_SERVICE: "VCN", // Chuyển phát nhanh
      
      // --- CHẾ ĐỘ ĐƠN NHÁP ---
      TYPE_ORDER: 3, 
      
      CHECK_USER: 1,
      LIST_ITEM: [{
        PRODUCT_NAME: "Sản phẩm",
        PRODUCT_WEIGHT: Number(order.weight) || 500,
        PRODUCT_QUANTITY: 1,
        PRODUCT_PRICE: Math.round(Number(order.totalAmount || 0))
      }]
    };

    try {
      console.log("--- 🚀 ĐANG ĐẨY ĐƠN SANG VTP (DẠNG NHÁP) ---");
      const response = await axios.post(createUrl, payload, {
        headers: { 
            'Token': cleanToken, 
            'Content-Type': 'application/json' 
        }
      });
      
      // Kiểm tra phản hồi từ VTP
      if (response.data.status === 200 || response.data.error === false) {
        console.log("--- ✅ THÀNH CÔNG! ĐƠN ĐÃ VÀO MỤC NHÁP CỦA VTP.");
        return response.data;
      } else {
        // In lỗi cụ thể từ VTP (VD: Sai mã tỉnh, sai token...)
        console.error("--- ❌ VTP TỪ CHỐI:", response.data);
        throw new Error(response.data.message || "ViettelPost từ chối dữ liệu.");
      }
    } catch (error) {
      const errorDetail = error.response?.data?.message || error.message;
      console.error("--- ❌ LỖI HỆ THỐNG VTP:", errorDetail);
      throw new Error(errorDetail);
    }
  }
}