import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  async createVTPOrder(order: any, token: string, shopId: string) {
    const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
    const cleanToken = token.replace(/\s/g, '').trim();

    // 1. Chuẩn hóa địa chỉ (VTP thường yêu cầu tên trực tiếp)
    const province = (order.province || "Hồ Chí Minh").replace(/Thành phố |Tỉnh /gi, "").trim();
    const district = (order.district || "Quận 5").replace(/Quận |Huyện |Thị xã /gi, "").trim();
    const ward = (order.ward || "Phường 1").replace(/Phường |Xã |Thị trấn /gi, "").trim();

    const now = new Date();
    const deliveryDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // 2. Tạo Payload với dữ liệu được ép kiểu chuẩn
    const payload = {
      ORDER_NUMBER: `K${Date.now().toString().slice(-9)}`, // Mã đơn duy nhất
      GROUPADDRESS_ID: Number(shopId), // Bắt buộc là số
      CUS_ID: 0,
      DELIVERY_DATE: deliveryDate,
      SENDER_FULLNAME: "Dropbuy Việt Nam",
      SENDER_PHONE: "0928912828",
      RECEIVER_FULLNAME: order.customerName || "Khách hàng",
      RECEIVER_PHONE: String(order.customerPhone || "0900000000").replace(/[^0-9]/g, ''),
      RECEIVER_ADDRESS: order.customerAddress || "Địa chỉ khách hàng",
      RECEIVER_PROVINCE: province,
      RECEIVER_DISTRICT: district,
      RECEIVER_WARDS: ward,
      PRODUCT_NAME: "Hàng hóa",
      PRODUCT_WEIGHT: Number(order.weight) || 500,
      PRODUCT_QUANTITY: 1,
      PRODUCT_PRICE: Math.round(Number(order.totalAmount || 0)),
      PRODUCT_TYPE: "HH",
      MONEY_COLLECTION: Math.round(Number(order.totalAmount || 0)),
      ORDER_PAYMENT: 2, // 2: Shop trả ship
      ORDER_SERVICE: "VCN",
      TYPE_ORDER: 3, // 3: ĐƠN NHÁP (Vào mục đơn nháp trên web VTP)
      CHECK_USER: 1,
      LIST_ITEM: [{
        PRODUCT_NAME: "Hàng hóa",
        PRODUCT_WEIGHT: Number(order.weight) || 500,
        PRODUCT_QUANTITY: 1,
        PRODUCT_PRICE: Math.round(Number(order.totalAmount || 0))
      }]
    };

    try {
      console.log("--- 🚀 GỬI SANG VTP:", JSON.stringify(payload, null, 2));
      const response = await axios.post(createUrl, payload, {
        headers: { 'Token': cleanToken, 'Content-Type': 'application/json' }
      });
      
      if (response.data.status === 200 || response.data.error === false) {
        return response.data;
      } else {
        // QUAN TRỌNG: In ra nội dung lỗi chi tiết từ VTP
        console.error("--- ❌ VTP PHẢN HỒI LỖI DỮ LIỆU:", JSON.stringify(response.data, null, 2));
        throw new Error(response.data.message || "Dữ liệu đơn hàng không hợp lệ");
      }
    } catch (error) {
      // Lấy thông báo lỗi chi tiết nhất từ phản hồi của VTP
      const errorDetail = error.response?.data?.message || error.message;
      const errorBody = error.response?.data ? JSON.stringify(error.response.data) : "";
      
      console.error("--- ❌ LỖI CHI TIẾT:", errorDetail, errorBody);
      throw new Error(`${errorDetail} ${errorBody}`);
    }
  }
}