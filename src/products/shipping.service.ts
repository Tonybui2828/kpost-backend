import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  private provincesCache: any[] = [];
  private districtsCache = new Map<number, any[]>();
  private wardsCache = new Map<number, any[]>();

  // Chuẩn hóa chuỗi tiếng Việt để so sánh tìm kiếm ID
  private cleanName(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^(tinh|thanh pho|tp\.|tp|quan|huyen|thi xa|tx\.|tx|phuong|xa|thi tran|tt\.)\s+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 1. Lấy ID Tỉnh
  private async getProvinceId(provinceName: string): Promise<number> {
    if (!provinceName) return 0;
    if (!isNaN(Number(provinceName)) && Number(provinceName) > 0) return Number(provinceName);

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
      return 0;
    }
  }

  // 2. Lấy ID Huyện
  private async getDistrictId(provinceId: number, districtName: string): Promise<number> {
    if (!provinceId || !districtName) return 0;
    if (!isNaN(Number(districtName)) && Number(districtName) > 0) return Number(districtName);

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
      return 0;
    }
  }

  // 3. Lấy ID Xã
  private async getWardId(districtId: number, wardName: string): Promise<number> {
    if (!districtId || !wardName) return 0;
    if (!isNaN(Number(wardName)) && Number(wardName) > 0) return Number(wardName);

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

  // Hàm phụ trợ: Lấy Token VTP mới bằng User/Pass (ĐÃ NÂNG CẤP LOẠI BỎ KHOẢNG TRẮNG)
  public async getNewVTPToken(vtpUsername?: string, vtpPassword?: string): Promise<string> {
    try {
      // LOẠI BỎ TOÀN BỘ KHOẢNG TRẮNG Ở ĐẦU VÀ CUỐI ĐỂ TRÁNH LỖI VTP
      const cleanUser = (vtpUsername || '').trim();
      const cleanPass = (vtpPassword || '').trim();

      this.logger.log(`--- 🔄 Bắt đầu xin Token mới cho SĐT: ${cleanUser || 'TRỐNG'}`);

      // NẾU CHƯA CÓ TRONG DATABASE THÌ BÁO LỖI LUÔN, KHÔNG GỬI LÊN VTP CHO MẤT CÔNG
      if (!cleanUser || !cleanPass) {
         throw new Error("Tài khoản chưa được cấu hình. Vui lòng vào Cài đặt vận chuyển để lưu Số điện thoại & Mật khẩu!");
      }

      const loginUrl = 'https://partner.viettelpost.vn/v2/user/Login';
      const res = await axios.post(loginUrl, {
        USERNAME: cleanUser,
        PASSWORD: cleanPass,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.data && res.data.data && res.data.data.token) {
        this.logger.log('--- ✅ Đã làm mới Token VTP thành công');
        return res.data.data.token;
      }
      throw new Error(res.data?.message || 'Sai Số điện thoại hoặc Mật khẩu');
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Lỗi không xác định';
      this.logger.error(`❌ Lỗi khi lấy lại Token VTP: ${msg}`);
      throw new Error(msg); // Ném lỗi ra để popup hiển thị chi tiết cho người dùng
    }
  }

  // 4. Tạo đơn sang Viettel Post (ĐÃ NÂNG CẤP AUTO REFRESH TOKEN)
  async createVTPOrder(
    order: any, 
    token: string, 
    shopId: string | number,
    vtpUsername?: string,
    vtpPassword?: string
  ) {
    const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
    let currentToken = token ? token.replace(/\s/g, '').trim() : '';

    if (!currentToken) {
      throw new HttpException('Viettel Post Token không hợp lệ hoặc bị thiếu', HttpStatus.UNAUTHORIZED);
    }

    const rawProvince = order.provinceId || order.province || order.RECEIVER_PROVINCE || '';
    const rawDistrict = order.districtId || order.district || order.RECEIVER_DISTRICT || '';
    const rawWard = order.wardId || order.ward || order.RECEIVER_WARDS || '';

    const receiverProvince = await this.getProvinceId(String(rawProvince));
    const receiverDistrict = await this.getDistrictId(receiverProvince, String(rawDistrict));
    const receiverWard = await this.getWardId(receiverDistrict, String(rawWard));

    if (!receiverProvince || !receiverDistrict) {
      throw new HttpException(`Không tìm thấy Tỉnh/Huyện tương ứng: "${rawProvince}" - "${rawDistrict}"`, HttpStatus.BAD_REQUEST);
    }

    let detailedAddress = (order.customerAddress || order.address || '').trim();
    if (!detailedAddress || detailedAddress.length < 5 || detailedAddress.includes('Xem trong đoạn chat')) {
      const addressParts = [rawWard, rawDistrict, rawProvince].filter(p => p && String(p).trim().length > 0);
      detailedAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Khu vực trung tâm';
    }
    detailedAddress = detailedAddress.replace(/^[,\s\-\.\/]+|[,\s\-\.\/]+$/g, '').trim();

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const deliveryDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const codAmount = Math.round(Number(order.totalAmount || order.codAmount || 0));
    const totalWeight = Math.max(Number(order.weight) || 200, 100);

    const payload = {
      ORDER_NUMBER: order.orderCode || `ORD${Date.now().toString().slice(-8)}`,
      GROUPADDRESS_ID: Number(shopId) || 0,
      CUS_ID: 0,
      DELIVERY_DATE: deliveryDate,
      SENDER_FULLNAME: order.senderName || "Cửa Hàng",
      SENDER_PHONE: order.senderPhone || "0928912828",
      SENDER_ADDRESS: order.senderAddress || "Kho hàng",
      RECEIVER_FULLNAME: (order.customerName || "Khách Hàng").trim(),
      RECEIVER_PHONE: String(order.customerPhone || "").replace(/[^0-9]/g, '').slice(-10),
      RECEIVER_ADDRESS: detailedAddress,
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
      ORDER_PAYMENT: codAmount > 0 ? 3 : 1,
      ORDER_SERVICE: order.serviceCode || "VCN",
      ORDER_SERVICE_ADD: "",
      TYPE_ORDER: 3,
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
      } else {
        throw new Error(response.data?.message || JSON.stringify(response.data));
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || '';
      const isTokenError = errorMsg.toLowerCase().includes('token') || error.response?.status === 401;

      if (isTokenError) {
        this.logger.warn(`--- ⚠️ Phát hiện Token hết hạn, đang tự động lấy Token mới...`);
        try {
          // BƯỚC NÀY SẼ GỌI HÀM LẤY TOKEN VÀ NẾU CÓ LỖI (SAI PASS), NÓ SẼ VĂNG LỖI LÊN TRÊN
          const newToken = await this.getNewVTPToken(vtpUsername, vtpPassword);
          const retryResponse = await executePost(newToken);
          
          if (retryResponse.data && (retryResponse.data.status === 200 || retryResponse.data.error === false)) {
            return retryResponse.data;
          } else {
             throw new Error(retryResponse.data?.message || "Lỗi tạo đơn VTP");
          }
        } catch (retryError) {
           // Đẩy chính xác thông báo lỗi từ hàm login ra màn hình
           throw new HttpException(`Lỗi kết nối ViettelPost: ${retryError.message}`, HttpStatus.BAD_REQUEST);
        }
      }

      throw new HttpException(`Lỗi đẩy đơn VTP: ${errorMsg}`, HttpStatus.BAD_REQUEST);
    }
  }
}