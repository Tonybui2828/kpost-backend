import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  /**
   * Tạo đơn hàng / đơn nháp đẩy sang Viettel Post
   * @param order Đối tượng đơn hàng chứa thông tin người nhận, tiền, trọng lượng, ID địa chỉ
   * @param token Access Token lấy từ API login Viettel Post
   * @param shopId GROUPADDRESS_ID (ID kho lấy hàng lấy từ listInventory)
   */
  async createVTPOrder(order: any, token: string, shopId: string | number) {
    const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
    const cleanToken = token ? token.replace(/\s/g, '').trim() : '';

    if (!cleanToken) {
      throw new HttpException('Viettel Post Token không hợp lệ hoặc bị thiếu', HttpStatus.UNAUTHORIZED);
    }

    if (!shopId || Number(shopId) <= 0) {
      throw new HttpException('Mã kho lấy hàng (GROUPADDRESS_ID) không hợp lệ', HttpStatus.BAD_REQUEST);
    }

    // 1. Kiểm tra ID Tỉnh / Huyện / Xã bắt buộc là số nguyên theo chuẩn VTP
    const receiverProvince = Number(order.provinceId || order.RECEIVER_PROVINCE);
    const receiverDistrict = Number(order.districtId || order.RECEIVER_DISTRICT);
    const receiverWard = Number(order.wardId || order.RECEIVER_WARDS);

    if (!receiverProvince || !receiverDistrict) {
      throw new HttpException(
        'RECEIVER_PROVINCE và RECEIVER_DISTRICT bắt buộc phải là ID số theo danh mục Viettel Post',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Format ngày giao hàng: dd/MM/yyyy HH:mm:ss
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const deliveryDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // 3. Xử lý số tiền và hình thức thanh toán cước
    const codAmount = Math.round(Number(order.totalAmount || order.codAmount || 0));
    // ORDER_PAYMENT:
    // 1: Không thu tiền (Người gửi trả cước qua hợp đồng, không thu COD)
    // 2: Thu người nhận: Cước + Tiền COD
    // 3: Thu người nhận: Tiền COD (Người gửi trả cước)
    const orderPayment = order.orderPayment ? Number(order.orderPayment) : (codAmount > 0 ? 3 : 1);

    const totalWeight = Math.max(Number(order.weight) || 200, 50); // Tối thiểu 50g-100g

    // 4. Chuẩn bị payload chuẩn định dạng VTP v2
    const payload = {
      ORDER_NUMBER: order.orderCode || `ORD${Date.now().toString().slice(-8)}`,
      GROUPADDRESS_ID: Number(shopId), // ID kho lấy hàng đã cài trên VTP
      CUS_ID: 0,
      DELIVERY_DATE: deliveryDate,
      
      // Người gửi (Lấy theo cấu hình kho hoặc ghi đè nếu cần)
      SENDER_FULLNAME: order.senderName || "Dropbuy Việt Nam",
      SENDER_PHONE: order.senderPhone || "0928912828",
      SENDER_ADDRESS: order.senderAddress || "Kho hàng",

      // Người nhận
      RECEIVER_FULLNAME: (order.customerName || "Khách Hàng").trim(),
      RECEIVER_PHONE: String(order.customerPhone || "").replace(/[^0-9]/g, '').slice(-10),
      RECEIVER_ADDRESS: (order.customerAddress || "").trim(),
      RECEIVER_PROVINCE: receiverProvince, // ID số (VD: 1 cho Hà Nội)
      RECEIVER_DISTRICT: receiverDistrict, // ID số (VD: 10 cho Cầu Giấy)
      RECEIVER_WARDS: receiverWard || 0,   // ID số xã/phường (Nếu có)

      // Thông tin hàng hóa & dịch vụ
      PRODUCT_NAME: order.productName || "Hàng gia dụng",
      PRODUCT_DESCRIPTION: order.note || "Hàng dễ vỡ, xin nhẹ tay",
      PRODUCT_WEIGHT: totalWeight,
      PRODUCT_QUANTITY: Number(order.quantity) || 1,
      PRODUCT_PRICE: codAmount,
      PRODUCT_TYPE: "HH", // HH: Hàng hóa, TH: Thư/Tài liệu
      MONEY_COLLECTION: codAmount,

      // Kích thước (cm)
      PRODUCT_LENGTH: Number(order.length) || 10,
      PRODUCT_WIDTH: Number(order.width) || 10,
      PRODUCT_HEIGHT: Number(order.height) || 10,

      ORDER_PAYMENT: orderPayment,
      ORDER_SERVICE: order.serviceCode || "VCN", // VCN (Nhanh), VTK (Tiết kiệm), VHT (Hỏa tốc)
      ORDER_SERVICE_ADD: "", // Dịch vụ cộng thêm (nếu có)
      TYPE_ORDER: 3,         // 3: Đơn nháp (Draft) lưu trên hệ thống VTP để Shop vào duyệt
      CHECK_USER: 1,

      LIST_ITEM: order.items && order.items.length > 0 
        ? order.items.map((item: any) => ({
            PRODUCT_NAME: item.name || "Hàng hóa",
            PRODUCT_WEIGHT: Number(item.weight) || 100,
            PRODUCT_QUANTITY: Number(item.quantity) || 1,
            PRODUCT_PRICE: Number(item.price) || 0,
          }))
        : [
            {
              PRODUCT_NAME: order.productName || "Hàng gia dụng",
              PRODUCT_WEIGHT: totalWeight,
              PRODUCT_QUANTITY: 1,
              PRODUCT_PRICE: codAmount,
            },
          ],
    };

    try {
      console.log('--- 🚀 GỬI PAYLOAD VTP:', JSON.stringify(payload, null, 2));

      const response = await axios.post(createUrl, payload, {
        headers: {
          Token: cleanToken,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      // Viettel Post trả về status 200 kèm error = false hoặc status = 200
      if (response.data && (response.data.status === 200 || response.data.error === false)) {
        return response.data;
      } else {
        const errorMsg = response.data?.message || 'Viettel Post từ chối tạo đơn';
        console.error('--- ❌ VTP REJECTED RESPONSE:', response.data);
        throw new HttpException(`Lỗi VTP: ${errorMsg}`, HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      const errorResponse = error.response?.data;
      console.error('--- ❌ LỖI GỌI API VTP:', JSON.stringify(errorResponse || error.message, null, 2));

      const detailMsg =
        errorResponse?.message ||
        errorResponse?.data ||
        error.message ||
        'Lỗi không xác định khi kết nối Viettel Post';

      throw new HttpException(`Lỗi đẩy đơn VTP: ${detailMsg}`, HttpStatus.BAD_REQUEST);
    }
  }
}