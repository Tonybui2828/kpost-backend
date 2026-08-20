import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  async createVTPOrder(order: any, token: string, shopId: string) {
    const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
    const cleanToken = token.replace(/\s/g, '').trim();

    // 1. Kiểm tra Tỉnh/Huyện (Bắt buộc phải có giá trị)
    if (!order.province || !order.district) {
      throw new Error("Dữ liệu thiếu Tỉnh hoặc Huyện. Hãy bấm 'Sửa đơn' và chọn lại.");
    }

    // 2. Làm sạch địa danh cực mạnh (Bỏ hết chữ Tỉnh, Thành phố, Quận, Huyện...)
    const cleanAddr = (str: string) => {
      if (!str) return "";
      return str.replace(/Tỉnh |Thành phố |Thành Phố |Quận |Huyện |Thị xã |Phường |Xã |Thị trấn /gi, "").trim();
    };

    const province = cleanAddr(order.province);
    const district = cleanAddr(order.district);
    const ward = cleanAddr(order.ward || "");

    const now = new Date();
    const deliveryDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const payload = {
      ORDER_NUMBER: `K${Date.now().toString().slice(-9)}`,
      GROUPADDRESS_ID: Number(shopId),
      CUS_ID: 0,
      DELIVERY_DATE: deliveryDate,
      SENDER_FULLNAME: "Dropbuy Việt Nam",
      SENDER_PHONE: "0928912828",
      RECEIVER_FULLNAME: order.customerName || "Khách hàng",
      RECEIVER_PHONE: order.customerPhone.replace(/[^0-9]/g, '').slice(-10), // Lấy 10 số cuối
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
      ORDER_PAYMENT: 2, 
      ORDER_SERVICE: "VCN",
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
      console.log("--- 📦 PAYLOAD GỬI ĐI:", JSON.stringify(payload, null, 2));
      const response = await axios.post(createUrl, payload, {
        headers: { 'Token': cleanToken, 'Content-Type': 'application/json' }
      });
      
      if (response.data.status === 200 || response.data.error === false) {
        return response.data;
      } else {
        // IN LỖI CHI TIẾT TỪ VTP
        console.error("--- ❌ VTP TỪ CHỐI DỮ LIỆU:", JSON.stringify(response.data, null, 2));
        throw new Error(`VTP báo lỗi: ${response.data.message}`);
      }
    } catch (error) {
      // TRÍCH XUẤT NỘI DUNG LỖI TRONG MÃ 400
      const errorData = error.response?.data;
      const errorMessage = errorData ? JSON.stringify(errorData) : error.message;
      console.error("--- ❌ LỖI 400 CHI TIẾT:", errorMessage);
      
      // Gửi thông báo lỗi cụ thể về cho web
      throw new Error(errorData?.message || "Dữ liệu địa chỉ hoặc mã kho không hợp lệ");
    }
  }
}