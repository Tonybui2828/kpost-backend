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

  // Lấy ID Tỉnh
  private async getProvinceId(provinceName: string): Promise<number> {
    try {
      if (this.provincesCache.length === 0) {
        const res = await axios.get(`${this.vtpUrl}/categories/listProvince`);
        this.provincesCache = res.data?.data || [];
      }
      if (!provinceName) return this.provincesCache.length > 0 ? this.provincesCache[0].PROVINCE_ID : 1;
      const target = this.cleanName(provinceName);
      const found = this.provincesCache.find(p => this.cleanName(p.PROVINCE_NAME).includes(target));
      return found ? found.PROVINCE_ID : (this.provincesCache.length > 0 ? this.provincesCache[0].PROVINCE_ID : 1);
    } catch (err) { return 1; }
  }

  // Lấy ID Huyện
  private async getDistrictId(provinceId: number, districtName: string): Promise<number> {
    if (!provinceId) return 1; 
    try {
      if (!this.districtsCache.has(provinceId)) {
        const res = await axios.get(`${this.vtpUrl}/categories/listDistrict?provinceId=${provinceId}`);
        this.districtsCache.set(provinceId, res.data?.data || []);
      }
      const list = this.districtsCache.get(provinceId) || [];
      if (list.length === 0) return 1;
      if (!districtName) return list[0].DISTRICT_ID;
      const target = this.cleanName(districtName);
      const found = list.find(d => this.cleanName(d.DISTRICT_NAME).includes(target));
      return found ? found.DISTRICT_ID : list[0].DISTRICT_ID;
    } catch (err) { return 1; }
  }

  // Lấy ID Phường Xã (Auto fallback nếu thiếu)
  private async getWardId(districtId: number, wardName: string): Promise<number> {
    if (!districtId) return 6; 
    try {
      if (!this.wardsCache.has(districtId)) {
        const res = await axios.get(`${this.vtpUrl}/categories/listWards?districtId=${districtId}`);
        this.wardsCache.set(districtId, res.data?.data || []);
      }
      const list = this.wardsCache.get(districtId) || [];
      if (list.length === 0) return 6;
      if (!wardName) return list[0].WARDS_ID;
      const target = this.cleanName(wardName);
      const found = list.find(w => this.cleanName(w.WARDS_NAME).includes(target));
      return found ? found.WARDS_ID : list[0].WARDS_ID;
    } catch (err) { return 6; }
  }

  // Đăng nhập lấy Token
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

  // Lấy ID Kho thực tế để truyền vào GROUPADDRESS_ID
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

  // TẠO ĐƠN CHÍNH
  async createVTPOrder(order: any, token: string, shopId: string | number, vtpUsername?: string, vtpPassword?: string) {
    const createUrl = `${this.vtpUrl}/order/createOrder`;
    let currentToken = token ? token.replace(/\s/g, '').trim() : '';
    if (!currentToken) throw new HttpException('Viettel Post Token bị thiếu', HttpStatus.UNAUTHORIZED);

    // 1. Chuyển đổi tên Tỉnh/Huyện/Xã sang ID
    const provinceId = await this.getProvinceId(order.province);
    const districtId = await this.getDistrictId(provinceId, order.district);
    const wardId = await this.getWardId(districtId, order.ward);

    // 2. Lấy Kho hàng của Shop
    const inventory = await this.getActualInventory(currentToken);
    if (!inventory) {
        throw new HttpException('Vui lòng tạo ít nhất 1 kho hàng trên app/web ViettelPost trước khi tạo đơn.', HttpStatus.BAD_REQUEST);
    }

    // 3. Xử lý địa chỉ khách hàng
    let detailedAddress = (order.customerAddress || '').trim();
    if (!detailedAddress || detailedAddress.length < 3 || detailedAddress.toLowerCase() === 'chưa có địa chỉ') {
      detailedAddress = "Không có số nhà";
    }
    const fullAddress = `${detailedAddress}, ${order.ward || ''}, ${order.district || ''}, ${order.province || ''}`
      .replace(/,\s*,/g, ',').replace(/(,\s*)+$/, '').replace(/^,\s*/, '').trim();

    // 4. Chuẩn bị biến
    const codAmount = Math.round(Number(order.totalAmount || 0));
    const now = new Date();
    const deliveryDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    // 5. PAYLOAD CHUẨN (SAO CHÉP Y HỆT BẢN HOẠT ĐỘNG CỦA BẠN)
    const payload = {
      ORDER_NUMBER: `ORD${Date.now().toString().slice(-8)}`,
      GROUPADDRESS_ID: inventory.groupaddressId || inventory.GROUPADDRESS_ID || 0, // Dùng ID kho thật
      CUS_ID: 0,
      DELIVERY_DATE: deliveryDate,
      
      SENDER_FULLNAME: inventory.name || order.senderName || "Shop",
      SENDER_PHONE: inventory.phone || order.senderPhone || "0966527931",
      // TUYỆT ĐỐI KHÔNG GỬI SENDER_PROVINCE, SENDER_DISTRICT, SENDER_WARD

      RECEIVER_FULLNAME: (order.customerName || "Khách Hàng").trim(),
      RECEIVER_PHONE: String(order.customerPhone || "0987654321").replace(/[^0-9]/g, '').slice(-10),
      RECEIVER_ADDRESS: fullAddress,
      RECEIVER_PROVINCE: provinceId,
      RECEIVER_DISTRICT: districtId,
      RECEIVER_WARDS: wardId,
      
      PRODUCT_NAME: "Hàng hóa",
      PRODUCT_WEIGHT: 500, 
      PRODUCT_QUANTITY: 1,
      PRODUCT_PRICE: codAmount,
      PRODUCT_TYPE: "HH",
      MONEY_COLLECTION: codAmount, 
      
      ORDER_PAYMENT: codAmount > 0 ? 2 : 1, // Khách trả ship hoặc Shop trả ship
      ORDER_SERVICE: "VCN", 
      TYPE_ORDER: 3, // Đơn nháp
      CHECK_USER: 1,
      LIST_ITEM: [{
        PRODUCT_NAME: "Hàng hóa",
        PRODUCT_WEIGHT: 500,
        PRODUCT_QUANTITY: 1,
        PRODUCT_PRICE: codAmount
      }]
    };

    const executePost = async (validToken: string, serviceCode: string) => {
      payload.ORDER_SERVICE = serviceCode;
      return await axios.post(createUrl, payload, {
        headers: { Token: validToken, 'Content-Type': 'application/json' },
        timeout: 15000,
      });
    };

    // VÒNG LẶP AUTO FALLBACK (THỬ NHIỀU GÓI CƯỚC)
    const servicesToTry = ["VCN", "VTK", "VBD"]; 
    let lastErrorMessage = "Lỗi tạo đơn VTP";

    for (const serviceCode of servicesToTry) {
        try {
            this.logger.log(`--- 🚀 THỬ TẠO ĐƠN VTP (Gói ${serviceCode}): ${payload.ORDER_NUMBER}`);
            let response = await executePost(currentToken, serviceCode);
            
            if (response.data?.error === true && response.data?.message?.toLowerCase().includes('token')) {
                currentToken = await this.getNewVTPToken(vtpUsername, vtpPassword);
                response = await executePost(currentToken, serviceCode);
            }

            if (response.data && (response.data.status === 200 || response.data.error === false || response.data.data?.ORDER_NUMBER)) {
                this.logger.log(`--- ✅ TẠO ĐƠN THÀNH CÔNG VỚI GÓI: ${serviceCode}`);
                return response.data;
            }

            lastErrorMessage = response.data?.message || JSON.stringify(response.data);
            
            if (lastErrorMessage.toLowerCase().includes('price') || lastErrorMessage.toLowerCase().includes('itinerary') || lastErrorMessage.toLowerCase().includes('không được hỗ trợ')) {
                this.logger.warn(`--- ⚠️ Gói ${serviceCode} không hỗ trợ, đang đổi gói...`);
                continue;
            } else {
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
            
            if (lastErrorMessage.toLowerCase().includes('price') || lastErrorMessage.toLowerCase().includes('itinerary') || lastErrorMessage.toLowerCase().includes('không được hỗ trợ')) {
                continue;
            } else {
                throw new HttpException(`Lỗi đẩy đơn VTP: ${lastErrorMessage}`, HttpStatus.BAD_REQUEST);
            }
        }
    }

    throw new HttpException(`Viettel Post từ chối: Tuyến đường không hỗ trợ. Vui lòng kiểm tra lại địa chỉ kho hàng và địa chỉ khách.`, HttpStatus.BAD_REQUEST);
  }
}