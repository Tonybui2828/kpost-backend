import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly vtpUrl = 'https://partner.viettelpost.vn/v2';

  private provincesCache: any[] = [];
  private districtsCache = new Map<number, any[]>();
  private wardsCache = new Map<number, any[]>();
  // Bộ nhớ đệm lưu ID kho theo Token để tránh gọi API nhiều lần
  private inventoryCache = new Map<string, number>(); 

  private cleanName(str: string): string {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^(tinh|thanh pho|tp\.|tp|quan|huyen|thi xa|tx\.|tx|phuong|xa|thi tran|tt\.)\s+/g, '').replace(/\s+/g, ' ').trim();
  }

  private async getProvinceId(provinceName: string): Promise<number> {
    if (!provinceName) return 2; 
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
    if (!provinceId || !districtName) return 33; 
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
    if (!districtId || !wardName) return 645; 
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

  public async getNewVTPToken(vtpUsername?: string, vtpPassword?: string): Promise<string> {
    try {
      const cleanUser = (vtpUsername || '').trim();
      const cleanPass = (vtpPassword || '').trim();
      if (!cleanUser || !cleanPass) throw new Error("Chưa cấu hình SĐT & Mật khẩu ViettelPost");
      const res = await axios.post(`${this.vtpUrl}/user/Login`, {
        USERNAME: cleanUser,
        PASSWORD: cleanPass,
      }, { headers: { 'Content-Type': 'application/json' }});

      if (res.data && res.data.data && res.data.data.token) return res.data.data.token;
      throw new Error(res.data?.message || 'Sai SĐT hoặc Mật khẩu');
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Lỗi không xác định');
    }
  }

  // HÀM MỚI: TỰ ĐỘNG LẤY ID KHO THỰC TẾ CỦA KHÁCH HÀNG TỪ VIETTEL POST
  private async getActualInventoryId(token: string): Promise<number> {
    if (this.inventoryCache.has(token)) {
      return this.inventoryCache.get(token);
    }
    try {
      const res = await axios.get(`${this.vtpUrl}/user/listInventory`, {
        headers: { Token: token, 'Content-Type': 'application/json' }
      });
      // Lấy ID của kho đầu tiên (thường là kho mặc định của shop)
      if (res.data && res.data.data && res.data.data.length > 0) {
        const khoId = res.data.data[0].groupaddressId;
        this.inventoryCache.set(token, khoId);
        return khoId;
      }
      throw new Error("Không tìm thấy kho hàng nào trong tài khoản ViettelPost");
    } catch (error) {
       this.logger.error("Lỗi lấy danh sách kho: " + error.message);
       // Nếu lỗi gọi API, fallback tạm về một ID kho giả để khỏi văng app, nhưng thường sẽ gọi API tạo đơn lỗi.
       return 0; 
    }
  }

  async createVTPOrder(order: any, token: string, shopId: string | number, vtpUsername?: string, vtpPassword?: string) {
    const createUrl = `${this.vtpUrl}/order/createOrder`;
    let currentToken = token ? token.replace(/\s/g, '').trim() : '';

    if (!currentToken) throw new HttpException('Viettel Post Token bị thiếu', HttpStatus.UNAUTHORIZED);

    const provinceId = await this.getProvinceId(order.province);
    const districtId = await this.getDistrictId(provinceId, order.district);
    const wardId = await this.getWardId(districtId, order.ward);

    // LẤY ID KHO ĐỘNG THEO ACCOUNT (Tránh lỗi sai tuyến đường)
    const actualInventoryId = await this.getActualInventoryId(currentToken);
    if (actualInventoryId === 0) {
        throw new HttpException('Vui lòng tạo ít nhất 1 kho hàng trên app/web ViettelPost trước khi tạo đơn.', HttpStatus.BAD_REQUEST);
    }

    let detailedAddress = (order.customerAddress || '').trim();
    if (!detailedAddress || detailedAddress.length < 3 || detailedAddress.toLowerCase() === 'chưa có địa chỉ') {
      detailedAddress = "Không có số nhà";
    }

    const fullAddress = `${detailedAddress}, ${order.ward || ''}, ${order.district || ''}, ${order.province || ''}`
      .replace(/,\s*,/g, ',')
      .replace(/(,\s*)+$/, '')
      .replace(/^,\s*/, '')
      .trim();

    const codAmount = Math.round(Number(order.totalAmount || 0));

    const payload = {
      ORDER_NUMBER: `ORD${Date.now().toString().slice(-8)}`,
      
      // ✅ ĐÃ FIX ĐỘNG: Gắn chuẩn ID Kho của từng shop vào
      GROUPADDRESS_ID: actualInventoryId, 
      
      SENDER_FULLNAME: order.senderName || "Shop Bán Hàng",
      SENDER_PHONE: order.senderPhone || "0966527931",
      SENDER_ADDRESS: order.senderAddress || "Kho hàng",

      RECEIVER_FULLNAME: (order.customerName || "Khách Hàng").trim(),
      RECEIVER_PHONE: String(order.customerPhone || "0987654321").replace(/[^0-9]/g, '').slice(-10),
      RECEIVER_ADDRESS: fullAddress,
      RECEIVER_PROVINCE: provinceId,
      RECEIVER_DISTRICT: districtId,
      RECEIVER_WARD: wardId,

      PRODUCT_TYPE: "HH", 
      PRODUCT_NAME: "Hàng hóa tổng hợp",
      PRODUCT_WEIGHT: 500, 
      PRODUCT_PRICE: codAmount,
      MONEY_COLLECTION: codAmount, 
      TYPE_ORDER: 3, 
      ORDER_PAYMENT: codAmount > 0 ? 3 : 1, 
      ORDER_SERVICE: "VCN",
      LIST_ITEM: [
        {
          PRODUCT_NAME: "Hàng hóa tổng hợp",
          PRODUCT_WEIGHT: 500,
          PRODUCT_QUANTITY: 1,
          PRODUCT_PRICE: codAmount,
        }
      ]
    };

    const executePost = async (validToken: string) => {
      return await axios.post(createUrl, payload, {
        headers: { Token: validToken, 'Content-Type': 'application/json' },
        timeout: 15000,
      });
    };

    try {
      this.logger.log(`--- 🚀 ĐẨY ĐƠN SANG VTP: ${payload.ORDER_NUMBER}`);
      const response = await executePost(currentToken);
      
      if (response.data?.error === true && response.data?.message?.toLowerCase().includes('token')) {
         throw new Error("Token invalid");
      }

      if (response.data && (response.data.status === 200 || response.data.error === false)) {
         return response.data;
      }
      throw new Error(response.data?.message || "Lỗi tạo đơn VTP");
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || '';
      
      if (errorMsg.toLowerCase().includes('token') || error.response?.status === 401) {
        try {
          const newToken = await this.getNewVTPToken(vtpUsername, vtpPassword);
          const retryResponse = await executePost(newToken);
          if (retryResponse.data && (retryResponse.data.status === 200 || retryResponse.data.error === false)) {
            return retryResponse.data;
          }
          throw new Error(retryResponse.data?.message || "Lỗi tạo đơn VTP");
        } catch (retryError) {
           throw new HttpException(`Lỗi kết nối ViettelPost: ${retryError.message}`, HttpStatus.BAD_REQUEST);
        }
      }

      throw new HttpException(`Lỗi đẩy đơn VTP: ${errorMsg}`, HttpStatus.BAD_REQUEST);
    }
  }
}