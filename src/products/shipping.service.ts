import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  async createVTPOrder(order: any, token: string, shopId: string) {
    const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
    const cleanToken = token.replace(/\s/g, '').trim();

    // 1. Chẩn đoán địa chỉ: VTP rất nhạy cảm với tên địa danh
    // Nếu trong DB của bạn là "Thành phố Hồ Chí Minh", hãy đổi thành "Hồ Chí Minh"
    const province = (order.province || "Hồ Chí Minh").replace("Thành phố ", "").replace("Tỉnh ", "");
    const district = order.district || "Quận 5";
    const ward = order.ward || "Phường 15";

    const now = new Date();
    const deliveryDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const payload = {
      // ORDER_NUMBER phải là duy nhất. Thêm timestamp để không bị trùng khi test
      ORDER_NUMBER: `K${Date.now().toString().slice(-8)}`, 
      GROUPADDRESS_ID: Number(shopId),
      CUS_ID: 0,
      DELIVERY_DATE: deliveryDate,
      SENDER_FULLNAME: "Dropbuy Việt Nam",
      SENDER_PHONE: "0928912828",
      RECEIVER_FULLNAME: order.customerName || "Khách hàng",
      RECEIVER_PHONE: order.customerPhone.replace(/[^0-9]/g, ''),
      RECEIVER_ADDRESS: order.customerAddress,
      RECEIVER_PROVINCE: province,
      RECEIVER_DISTRICT: district,
      RECEIVER_WARDS: ward,
      PRODUCT_NAME: "Hàng gia dụng",
      PRODUCT_WEIGHT: order.weight || 500,
      PRODUCT_QUANTITY: 1,
      PRODUCT_PRICE: Math.round(order.totalAmount),
      PRODUCT_TYPE: "HH",
      MONEY_COLLECTION: Math.round(order.totalAmount),
      ORDER_PAYMENT: 2, 
      ORDER_SERVICE: "VCN",
      
      // --- CHẾ ĐỘ ĐƠN NHÁP (TYPE_ORDER: 3) ---
      TYPE_ORDER: 3, 
      
      CHECK_USER: 1,
      LIST_ITEM: [{
        PRODUCT_NAME: "Sản phẩm",
        PRODUCT_WEIGHT: order.weight || 500,
        PRODUCT_QUANTITY: 1,
        PRODUCT_PRICE: Math.round(order.totalAmount)
      }]
    };

    console.log("--- 📦 GỬI DỮ LIỆU SANG VTP:", JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(createUrl, payload, {
        headers: { 'Token': cleanToken, 'Content-Type': 'application/json' }
      });
      
      // VTP trả về 200 nhưng bên trong có thể vẫn có lỗi
      if (response.data.status === 200 || response.data.error === false) {
        return response.data;
      } else {
        console.error("--- ❌ VTP TỪ CHỐI:", response.data);
        throw new Error(response.data.message || "ViettelPost không chấp nhận dữ liệu này");
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.error("--- ❌ LỖI KẾT NỐI VTP:", msg);
      throw new Error(msg);
    }
  }
}