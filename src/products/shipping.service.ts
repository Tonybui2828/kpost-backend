import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly vtpUrl = 'https://partner.viettelpost.vn/v2';

  private provincesCache: any[] = [];
  private districtsCache = new Map<number, any[]>();
  private wardsCache = new Map<number, any[]>();
  private inventoryCache = new Map<string, any>(); 

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

  private async getActualInventory(token: string): Promise<any> {
    if (this.inventoryCache.has(token)) return this.inventoryCache.get(token);
    try {
      const res = await axios.get(`${this.vtpUrl}/user/listInventory`, {
        headers: { Token: token, 'Content-Type': 'application/json' }
      });
      if (res.data && res.data.data && res.data.data.length > 0) {
        const kho = res.data.data[0];
        this.inventoryCache.set(token, kho);
        return kho;
      }
      return null;
    } catch (error) {
       this.logger.error("Lỗi lấy danh sách kho: " + error.message);
       return null; 
    }
  }

  async createVTPOrder(order: any, token: string, shopId: string | number, vtpUsername?: string, vtpPassword?: string) {
    const createUrl = `${this.vtpUrl}/order/createOrder`;
    let currentToken = token ? token.replace(/\s/g, '').trim() : '';
    if (!currentToken) throw new HttpException('Viettel Post Token bị thiếu', HttpStatus.UNAUTHORIZED);

    const provinceId = await this.getProvinceId(order.province);
    const districtId = await this.getDistrictId(provinceId, order.district);
    const wardId = await this.getWardId(districtId, order.ward);

    const inventory = await this.getActualInventory(currentToken);
    if (!inventory) {
        throw new HttpException('Vui lòng tạo ít nhất 1 kho hàng trên app/web ViettelPost trước khi tạo đơn.', HttpStatus.BAD_REQUEST);
    }

    // Bắt lỗi kho người dùng quên cài đặt Tỉnh/Huyện thì mặc định cho về Hà Nội để chống văng lỗi
    const senderProvince = inventory.provinceId || inventory.PROVINCE_ID || 1;
    const senderDistrict = inventory.districtId || inventory.DISTRICT_ID || 1;
    const senderWard = inventory.wardsId || inventory.WARDS_ID || 1;
    const senderAddress = inventory.address || inventory.ADDRESS || order.senderAddress || "Kho hàng";
    const senderName = inventory.name || inventory.NAME || order.senderName || "Shop";
    const senderPhone = inventory.phone || inventory.PHONE || order.senderPhone || "0966527931";
    const groupAddressId = inventory.groupaddressId || inventory.GROUPADDRESS_ID || 0;

    let detailedAddress = (order.customerAddress || '').trim();
    if (!detailedAddress || detailedAddress.length < 3 || detailedAddress.toLowerCase() === 'chưa có địa chỉ') {
      detailedAddress = "Không có số nhà";
    }

    const fullAddress = `${detailedAddress}, ${order.ward || ''}, ${order.district || ''}, ${order.province || ''}`
      .replace(/,\s*,/g, ',').replace(/(,\s*)+$/, '').replace(/^,\s*/, '').trim();

    const codAmount = Math.round(Number(order.totalAmount || 0));

    const payload = {
      ORDER_NUMBER: `ORD${Date.now().toString().slice(-8)}`,
      GROUPADDRESS_ID: groupAddressId, 
      SENDER_FULLNAME: senderName,
      SENDER_PHONE: senderPhone,
      SENDER_ADDRESS: senderAddress,
      SENDER_PROVINCE: senderProvince,
      SENDER_DISTRICT: senderDistrict,
      SENDER_WARD: senderWard,
      RECEIVER_FULLNAME: (order.customerName || "Khách Hàng").trim(),
      RECEIVER_PHONE: String(order.customerPhone || "0987654321").replace(/[^0-9]/g, '').slice(-10),
      RECEIVER_ADDRESS: fullAddress,
      RECEIVER_PROVINCE: provinceId,
      RECEIVER_DISTRICT: districtId,
      RECEIVER_WARD: wardId,
      PRODUCT_TYPE: "HH", 
      PRODUCT_NAME: "Hàng hóa",
      PRODUCT_WEIGHT: 500, 
      PRODUCT_PRICE: codAmount,
      MONEY_COLLECTION: codAmount, 
      TYPE_ORDER: 3, 
      ORDER_PAYMENT: codAmount > 0 ? 2 : 1, // 2: Khách trả ship, 1: Shop trả ship
      ORDER_SERVICE: "VCN",
      LIST_ITEM: [{
          PRODUCT_NAME: "Hàng hóa",
          PRODUCT_WEIGHT: 500,
          PRODUCT_QUANTITY: 1,
          PRODUCT_PRICE: codAmount,
      }]
    };

    const executePost = async (validToken: string, serviceCode: string) => {
      payload.ORDER_SERVICE = serviceCode;
      return await axios.post(createUrl, payload, {
        headers: { Token: validToken, 'Content-Type': 'application/json' },
        timeout: 15000,
      });
    };

    // 🚀 AUTO FALLBACK: NẾU GÓI NHANH BỊ LỖI TUYẾN ĐƯỜNG, TỰ ĐỘNG ĐỔI SANG GÓI TIẾT KIỆM / BƯU KIỆN
    const servicesToTry = ["VCN", "VTK", "VBD"]; 
    let lastErrorMessage = "Lỗi tạo đơn VTP";

    for (const serviceCode of servicesToTry) {
        try {
            this.logger.log(`--- 🚀 THỬ TẠO NHÁP VTP (Gói ${serviceCode}): ${payload.ORDER_NUMBER}`);
            let response = await executePost(currentToken, serviceCode);
            
            // Xử lý nếu Token hết hạn giữa chừng
            if (response.data?.error === true && response.data?.message?.toLowerCase().includes('token')) {
                currentToken = await this.getNewVTPToken(vtpUsername, vtpPassword);
                response = await executePost(currentToken, serviceCode);
            }

            if (response.data && (response.data.status === 200 || response.data.error === false)) {
                this.logger.log(`--- ✅ TẠO ĐƠN NHÁP THÀNH CÔNG VỚI GÓI: ${serviceCode}`);
                return response.data; // THÀNH CÔNG RỒI, THOÁT LUÔN!
            }

            lastErrorMessage = response.data?.message || JSON.stringify(response.data);
            
            // NẾU LÀ LỖI TUYẾN ĐƯỜNG -> TIẾP TỤC VÒNG LẶP ĐỂ THỬ GÓI CƯỚC KHÁC
            if (lastErrorMessage.toLowerCase().includes('price') || lastErrorMessage.toLowerCase().includes('itinerary')) {
                this.logger.warn(`--- ⚠️ Gói ${serviceCode} không hỗ trợ, đang tự đổi sang gói khác...`);
                continue;
            } else {
                // Lỗi khác (vd thiếu SĐT khách) thì quăng lỗi ra app
                throw new Error(lastErrorMessage);
            }

        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || '';
            
            if (errorMsg.toLowerCase().includes('token') || error.response?.status === 401) {
                 try {
                    currentToken = await this.getNewVTPToken(vtpUsername, vtpPassword);
                    const retryResponse = await executePost(currentToken, serviceCode);
                    if (retryResponse.data && (retryResponse.data.status === 200 || retryResponse.data.error === false)) return retryResponse.data;
                    lastErrorMessage = retryResponse.data?.message || "Lỗi tạo đơn VTP";
                 } catch (retryError) {
                    throw new HttpException(`Lỗi kết nối ViettelPost: ${retryError.message}`, HttpStatus.BAD_REQUEST);
                 }
            } else {
                 lastErrorMessage = errorMsg;
            }
            
            if (lastErrorMessage.toLowerCase().includes('price') || lastErrorMessage.toLowerCase().includes('itinerary')) {
                this.logger.warn(`--- ⚠️ Gói ${serviceCode} không hỗ trợ, đang tự đổi sang gói khác...`);
                continue;
            } else {
                throw new HttpException(`Lỗi đẩy đơn VTP: ${lastErrorMessage}`, HttpStatus.BAD_REQUEST);
            }
        }
    }

    // Đã thử cả 3 gói mà vẫn lỗi
    throw new HttpException(`Viettel Post từ chối tạo đơn: Tuyến đường từ kho của bạn đến khách hàng không được hỗ trợ giao hàng.`, HttpStatus.BAD_REQUEST);
  }
}