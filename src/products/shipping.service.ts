import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  // Bộ nhớ đệm danh mục để không phải gọi API VTP liên tục
  private provincesCache: any[] = [];
  private districtsCache = new Map<number, any[]>();
  private wardsCache = new Map<number, any[]>();

  // Hàm chuẩn hóa chuỗi tiếng Việt để so sánh tìm kiếm
  private cleanName(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt
      .replace(/^(tinh|thanh pho|tp\.|tp|quan|huyen|thi xa|tx\.|tx|phuong|xa|thi tran|tt\.)\s+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 1. Tự động lấy ID Tỉnh từ tên chữ
  private async getProvinceId(provinceName: string): Promise<number> {
    if (!provinceName) return 0;
    if (!isNaN(Number(provinceName)) && Number(provinceName) > 0) {
      return Number(provinceName);
    }

    try {
      if (this.provincesCache.length === 0) {
        const res = await axios.get('https://partner.viettelpost.vn/v2/categories/listProvince');
        this.provincesCache = res.data?.data || [];
      }

      const target = this.cleanName(provinceName);
      const found = this.provincesCache.find(p => {
        const pName = this.cleanName(p.PROVINCE_NAME);
        return pName === target || pName.includes(target) || target.includes(pName);
      });

      return found ? found.PROVINCE_ID : 0;
    } catch (err) {
      this.logger.error('Lỗi lấy danh mục Tỉnh VTP:', err.message);
      return 0;
    }
  }

  // 2. Tự động lấy ID Huyện từ Tỉnh ID & tên Huyện
  private async getDistrictId(provinceId: number, districtName: string): Promise<number> {
    if (!provinceId || !districtName) return 0;
    if (!isNaN(Number(districtName)) && Number(districtName) > 0) {
      return Number(districtName);
    }

    try {
      if (!this.districtsCache.has(provinceId)) {
        const res = await axios.get(`https://partner.viettelpost.vn/v2/categories/listDistrict?provinceId=${provinceId}`);
        this.districtsCache.set(provinceId, res.data?.data || []);
      }

      const list = this.districtsCache.get(provinceId) || [];
      const target = this.cleanName(districtName);
      const found = list.find(d => {
        const dName = this.cleanName(d.DISTRICT_NAME);
        return dName === target || dName.includes(target) || target.includes(dName);
      });

      return found ? found.DISTRICT_ID : 0;
    } catch (err) {
      this.logger.error('Lỗi lấy danh mục Huyện VTP:', err.message);
      return 0;
    }
  }

  // 3. Tự động lấy ID Xã từ Huyện ID & tên Xã
  private async getWardId(districtId: number, wardName: string): Promise<number> {
    if (!districtId || !wardName) return 0;
    if (!isNaN(Number(wardName)) && Number(wardName) > 0) {
      return Number(wardName);
    }

    try {
      if (!this.wardsCache.has(districtId)) {
        const res = await axios.get(`https://partner.viettelpost.vn/v2/categories/listWards?districtId=${districtId}`);
        this.wardsCache.set(districtId, res.data?.data || []);
      }

      const list = this.wardsCache.get(districtId) || [];
      const target = this.cleanName(wardName);
      const found = list.find(w => {
        const wName = this.cleanName(w.WARDS_NAME);
        return wName === target || wName.includes(target) || target.includes(wName);
      });

      return found ? found.WARDS_ID : 0;
    } catch (err) {
      return 0;
    }
  }

  // 4. Hàm chính tạo đơn Viettel Post
  async createVTPOrder(order: any, token: string, shopId: string | number) {
    const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
    const cleanToken = token ? token.replace(/\s/g, '').trim() : '';

    if (!cleanToken) {
      throw new HttpException('Viettel Post Token không hợp lệ hoặc bị thiếu', HttpStatus.UNAUTHORIZED);
    }

    // Tự động tìm ID số từ tên chữ (ví dụ "Hòa Bình" -> 28, "Yên Thủy" -> 320...)
    const rawProvince = order.provinceId || order.province || order.RECEIVER_PROVINCE || '';
    const rawDistrict = order.districtId || order.district || order.RECEIVER_DISTRICT || '';
    const rawWard = order.wardId || order.ward || order.RECEIVER_WARDS || '';

    const receiverProvince = await this.getProvinceId(String(rawProvince));
    const receiverDistrict = await this.getDistrictId(receiverProvince, String(rawDistrict));
    const receiverWard = await this.getWardId(receiverDistrict, String(rawWard));

    if (!receiverProvince || !receiverDistrict) {
      throw new HttpException(
        `Không thể tìm thấy ID Tỉnh/Huyện trên Viettel Post cho: Tỉnh "${rawProvince}" - Huyện "${rawDistrict}"`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Format ngày giờ: dd/MM/yyyy HH:mm:ss
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const deliveryDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // Tiền thu hộ COD và trọng lượng
    const codAmount = Math.round(Number(order.totalAmount || order.codAmount || 0));
    const totalWeight = Math.max(Number(order.weight) || 200, 100);

    const payload = {
      ORDER_NUMBER: order.orderCode || `ORD${Date.now().toString().slice(-8)}`,
      GROUPADDRESS_ID: Number(shopId) || 0,
      CUS_ID: 0,
      DELIVERY_DATE: deliveryDate,
      
      SENDER_FULLNAME: order.senderName || "Dropbuy Việt Nam",
      SENDER_PHONE: order.senderPhone || "0928912828",
      SENDER_ADDRESS: order.senderAddress || "Kho hàng",

      RECEIVER_FULLNAME: (order.customerName || "Khách Hàng").trim(),
      RECEIVER_PHONE: String(order.customerPhone || "").replace(/[^0-9]/g, '').slice(-10),
      RECEIVER_ADDRESS: (order.customerAddress || `${rawWard}, ${rawDistrict}, ${rawProvince}`).trim(),
      RECEIVER_PROVINCE: receiverProvince,
      RECEIVER_DISTRICT: receiverDistrict,
      RECEIVER_WARDS: receiverWard || 0,

      PRODUCT_NAME: order.productName || "Hàng hóa",
      PRODUCT_DESCRIPTION: order.note || "Giao giờ hành chính",
      PRODUCT_WEIGHT: totalWeight,
      PRODUCT_QUANTITY: Number(order.quantity) || 1,
      PRODUCT_PRICE: codAmount,
      PRODUCT_TYPE: "HH",
      MONEY_COLLECTION: codAmount,

      PRODUCT_LENGTH: Number(order.length) || 10,
      PRODUCT_WIDTH: Number(order.width) || 10,
      PRODUCT_HEIGHT: Number(order.height) || 10,

      ORDER_PAYMENT: codAmount > 0 ? 3 : 1, // 3: Thu COD người nhận, người gửi trả cước
      ORDER_SERVICE: order.serviceCode || "VCN",
      ORDER_SERVICE_ADD: "",
      TYPE_ORDER: 3, // 3: Tạo dạng Đơn Nháp
      CHECK_USER: 1,

      LIST_ITEM: [
        {
          PRODUCT_NAME: order.productName || "Hàng hóa",
          PRODUCT_WEIGHT: totalWeight,
          PRODUCT_QUANTITY: 1,
          PRODUCT_PRICE: codAmount,
        },
      ],
    };

    try {
      this.logger.log(`--- 🚀 ĐẨY ĐƠN SANG VTP: ${payload.ORDER_NUMBER}`);
      const response = await axios.post(createUrl, payload, {
        headers: {
          Token: cleanToken,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      if (response.data && (response.data.status === 200 || response.data.error === false)) {
        return response.data;
      } else {
        const errorMsg = response.data?.message || JSON.stringify(response.data);
        this.logger.error(`--- ❌ VTP TỪ CHỐI: ${errorMsg}`);
        throw new HttpException(`Lỗi VTP: ${errorMsg}`, HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      const errorResponse = error.response?.data;
      const detailMsg =
        errorResponse?.message ||
        errorResponse?.data ||
        error.message ||
        'Lỗi không xác định khi kết nối Viettel Post';

      this.logger.error(`--- ❌ LỖI VTP: ${JSON.stringify(errorResponse || detailMsg)}`);
      throw new HttpException(`Lỗi đẩy đơn VTP: ${detailMsg}`, HttpStatus.BAD_REQUEST);
    }
  }
}