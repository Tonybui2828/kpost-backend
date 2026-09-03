import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly vtpUrl = 'https://partner.viettelpost.vn/v2';

  // --- BỘ NHỚ ĐỆM ĐỂ TÌM NHANH TỈNH/HUYỆN/XÃ ---
  private provincesCache: any[] = [];
  private districtsCache = new Map<number, any[]>();
  private wardsCache = new Map<number, any[]>();

  private cleanName(str: string): string {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^(tinh|thanh pho|tp\.|tp|quan|huyen|thi xa|tx\.|tx|phuong|xa|thi tran|tt\.)\s+/g, '').replace(/\s+/g, ' ').trim();
  }

  private async getProvinceId(provinceName: string): Promise<number> {
    if (!provinceName) return 2; // Mặc định HCM nếu lỗi
    try {
      if (this.provincesCache.length === 0) {
        const res = await axios.get(`${this.vtpUrl}/categories/listProvince`);
        this.provincesCache = res.data?.data || [];
      }
      const target = this.cleanName(provinceName);
      const found = this.provincesCache.find(p => this.cleanName(p.PROVINCE_NAME).includes(target));
      return found ? found.PROVINCE_ID : 2;
    } catch (err) { return 2; }
  }

  private async getDistrictId(provinceId: number, districtName: string): Promise<number> {
    if (!provinceId || !districtName) return 33; // Mặc định Q5
    try {
      if (!this.districtsCache.has(provinceId)) {
        const res = await axios.get(`${this.vtpUrl}/categories/listDistrict?provinceId=${provinceId}`);
        this.districtsCache.set(provinceId, res.data?.data || []);
      }
      const list = this.districtsCache.get(provinceId) || [];
      const target = this.cleanName(districtName);
      const found = list.find(d => this.cleanName(d.DISTRICT_NAME).includes(target));
      return found ? found.DISTRICT_ID : 33;
    } catch (err) { return 33; }
  }

  private async getWardId(districtId: number, wardName: string): Promise<number> {
    if (!districtId || !wardName) return 645; // Mặc định Phường 3
    try {
      if (!this.wardsCache.has(districtId)) {
        const res = await axios.get(`${this.vtpUrl}/categories/listWards?districtId=${districtId}`);
        this.wardsCache.set(districtId, res.data?.data || []);
      }
      const list = this.wardsCache.get(districtId) || [];
      const target = this.cleanName(wardName);
      const found = list.find(w => this.cleanName(w.WARDS_NAME).includes(target));
      return found ? found.WARDS_ID : 645;
    } catch (err) { return 645; }
  }

  // --- HÀM TẠO ĐƠN CHÍNH THỨC ---
  async createVTPOrder(orderData: any, vtpToken: string) {
    const url = `${this.vtpUrl}/order/createOrder`;
    
    // 1. Tự động dịch Tỉnh/Huyện/Xã sang ID bằng code ở trên
    const provinceId = await this.getProvinceId(orderData.province || 'Hồ Chí Minh');
    const districtId = await this.getDistrictId(provinceId, orderData.district || 'Quận 5');
    const wardId = await this.getWardId(districtId, orderData.ward || 'Phường 3');

    // 2. Chống móm địa chỉ chi tiết
    let detailedAddress = (orderData.customerAddress || '').trim();
    if (!detailedAddress || detailedAddress.length < 5) {
      detailedAddress = "Liên hệ khách để lấy địa chỉ chi tiết";
    }

    const payload = {
      ORDER_NUMBER: orderData.id || `ORD${Date.now()}`,
      GROUPADDRESS_ID: 16983116, // Mã kho hàng của bạn
      SENDER_FULLNAME: "Shop Bán Hàng",
      SENDER_PHONE: "0966527931",
      SENDER_ADDRESS: "Kho hàng",
      RECEIVER_FULLNAME: orderData.customerName || "Khách Hàng",
      RECEIVER_PHONE: String(orderData.customerPhone || "0987654321").replace(/[^0-9]/g, ''),
      RECEIVER_ADDRESS: detailedAddress,
      
      // 3 BỘ PHẬN SINH TỬ ĐÃ ĐƯỢC THÊM VÀO:
      RECEIVER_PROVINCE: provinceId,
      RECEIVER_DISTRICT: districtId,
      RECEIVER_WARDS: wardId,

      PRODUCT_NAME: "Hàng hóa tổng hợp",
      PRODUCT_WEIGHT: Number(orderData.weight) || 500,
      PRODUCT_PRICE: Number(orderData.totalAmount) || 0,
      MONEY_COLLECTION: Number(orderData.totalAmount) || 0, // Tiền thu hộ COD
      TYPE_ORDER: 3, 
      ORDER_PAYMENT: 3, 
      ORDER_SERVICE: "VCN",
      LIST_ITEM: [
        {
          PRODUCT_NAME: "Hàng hóa",
          PRODUCT_WEIGHT: Number(orderData.weight) || 500,
          PRODUCT_QUANTITY: 1,
          PRODUCT_PRICE: Number(orderData.totalAmount) || 0,
        }
      ]
    };

    try {
      this.logger.log(`🚀 Đang đẩy đơn lên VTP: ${payload.ORDER_NUMBER}`);
      const res = await axios.post(url, payload, {
        headers: { 
          'Token': vtpToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.data?.error) {
         throw new Error(res.data.message);
      }
      return res.data; 
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Lỗi tạo đơn VTP";
      this.logger.error("Lỗi ViettelPost:", msg);
      throw new HttpException(`Lỗi đẩy đơn VTP: ${msg}`, HttpStatus.BAD_REQUEST);
    }
  }
}