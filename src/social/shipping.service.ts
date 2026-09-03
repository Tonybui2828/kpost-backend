import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  private readonly vtpUrl = 'https://partner.viettelpost.vn/v2';

  async createVTPOrder(orderData: any, vtpToken: string) {
    const url = `${this.vtpUrl}/order/create`;
    
    const payload = {
      ORDER_NUMBER: orderData.id,
      SENDER_FULLNAME: "Tên Shop Của Bạn",
      SENDER_ADDRESS: "123 Đường ABC",
      SENDER_PHONE: "0987654321",
      RECEIVER_FULLNAME: orderData.customerName,
      RECEIVER_ADDRESS: (orderData.customerAddress && orderData.customerAddress.trim().length >= 5) ? orderData.customerAddress.trim() : "Liên hệ khách để lấy địa chỉ chi tiết",
      RECEIVER_PHONE: orderData.customerPhone,
      PRODUCT_NAME: "Hàng hóa tổng hợp",
      PRODUCT_WEIGHT: orderData.weight || 500,
      PRODUCT_PRICE: orderData.totalAmount,
      MONEY_COLLECTION: orderData.totalAmount, // Tiền thu hộ (COD)
      TYPE_ORDER: "VCN", // Vận chuyển nhanh
    };

    try {
      const res = await axios.post(url, payload, {
        headers: { 'Token': vtpToken }
      });
      return res.data; // Trả về mã vận đơn từ ViettelPost
    } catch (error) {
      console.error("Lỗi ViettelPost:", error.response?.data);
      throw new Error("Không thể kết nối đơn vị vận chuyển");
    }
  }
}