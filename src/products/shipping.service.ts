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

  // 2. Lấy ID Huyện
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

  // 3. Lấy ID Xã
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

  // Hàm phụ trợ: Lấy Token VTP mới bằng User/Pass
  public async getNewVTPToken(vtpUsername: string, vtpPassword: string): Promise<string> {
    try {
      const loginUrl = 'https://partner.viettelpost.vn/v2/user/Login';
      const payload = {
        USERNAME: vtpUsername,
        PASSWORD: vtpPassword,
      };

      const res = await axios.post(loginUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.data && res.data.data && res.data.data.token) {
        this.logger.log('--- 🔄 Đã làm mới Token VTP thành công');
        return res.data.data.token;
      }
      throw new Error(res.data?.message || 'Login VTP thất bại');
    } catch (error) {
      this.logger.error('Lỗi khi lấy lại Token VTP:', error.message);
      throw new Error('Không thể làm mới Token Viettel Post. Vui lòng kiểm tra lại tài khoản.');
    }
  }


  // 4. Tạo đơn sang Viettel Post (ĐÃ NÂNG CẤP AUTO REFRESH TOKEN)
  // Lưu ý: Mình thêm tham số vtpUsername và vtpPassword vào hàm này. 
  // Bạn cần truyền nó từ file gọi hàm (Controller) vào đây.
  async createVTPOrder(
    order: any, 
    token: string, 
    shopId: string | number,
    vtpUsername?: string, // <--- Thêm tham số Tài khoản VTP
    vtpPassword?: string  // <--- Thêm tham số Mật khẩu VTP
  ) {
    const createUrl = 'https://partner.viettelpost.vn/v2/order/createOrder';
    let currentToken = token ? token.replace(/\s/g, '').trim() : '';

    if (!currentToken) {
      throw new HttpException('Viettel Post Token không hợp lệ hoặc bị thiếu', HttpStatus.UNAUTHORIZED);
    }

    // Tự động tìm ID số từ tên chữ
    const rawProvince = order.provinceId || order.province || order.RECEIVER_PROVINCE || '';
    const rawDistrict = order.districtId || order.district || order.RECEIVER_DISTRICT || '';
    const rawWard = order.wardId || order.ward || order.RECEIVER_WARDS || '';

    const receiverProvince = await this.getProvinceId(String(rawProvince));
    const receiverDistrict = await this.getDistrictId(receiverProvince, String(rawDistrict));
    const receiverWard = await this.getWardId(receiverDistrict, String(rawWard));

    if (!receiverProvince || !receiverDistrict) {
      throw new HttpException(
        `Không tìm thấy Tỉnh/Huyện tương ứng trên VTP: "${rawProvince}" - "${rawDistrict}"`,
        HttpStatus.BAD_REQUEST,
      );
    }

    let detailedAddress = (order.customerAddress || order.address || '').trim();
    if (!detailedAddress || detailedAddress.length < 5 || detailedAddress.includes('Xem trong đoạn chat')) {
      const addressParts = [rawWard, rawDistrict, rawProvince]
        .filter(part => part && String(part).trim().length > 0)
        .map(part => String(part).trim());
      detailedAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Khu vực trung tâm';
    }

    detailedAddress = detailedAddress.replace(/^[,\s\-\.\/]+|[,\s\-\.\/]+$/g, '').trim();
    if (detailedAddress.length < 5) {
      detailedAddress = `Khu vực ${detailedAddress}`;
    }

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
      SENDER_FULLNAME: order.senderName || "Dropbuy Việt Nam",
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

    // Hàm gọi API thực tế (bọc lại để gọi được nhiều lần)
    const executePost = async (validToken: string) => {
      const response = await axios.post(createUrl, payload, {
        headers: {
          Token: validToken,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
      return response;
    };

    try {
      this.logger.log(`--- 🚀 ĐẨY ĐƠN SANG VTP: ${payload.ORDER_NUMBER} - ĐỊA CHỈ: ${detailedAddress}`);
      let response = await executePost(currentToken);

      // Nếu API trả về 200 nhưng VTP báo Token invalid trong chuỗi JSON
      if (response.data?.error === true && response.data?.message?.toLowerCase().includes('token')) {
         throw new Error("Token invalid"); // Cố tình ném lỗi để nhảy vào catch bên dưới
      }

      if (response.data && (response.data.status === 200 || response.data.error === false)) {
        return response.data;
      } else {
        const errorMsg = response.data?.message || JSON.stringify(response.data);
        this.logger.error(`--- ❌ VTP TỪ CHỐI: ${errorMsg}`);
        throw new HttpException(`Lỗi VTP: ${errorMsg}`, HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      // KIỂM TRA XEM CÓ PHẢI LỖI TOKEN KHÔNG
      const errorMsg = error.response?.data?.message || error.message || '';
      const isTokenError = errorMsg.toLowerCase().includes('token') || error.response?.status === 401;

      // NẾU LỖI TOKEN VÀ CÓ USER/PASS THÌ TỰ ĐỘNG ĐĂNG NHẬP LẠI
      if (isTokenError && vtpUsername && vtpPassword) {
        this.logger.warn(`--- ⚠️ Phát hiện Token hết hạn, đang tự động lấy Token mới...`);
        try {
          // Lấy token mới
          const newToken = await this.getNewVTPToken(vtpUsername, vtpPassword);
          
          // GỌI LẠI TẠO ĐƠN LẦN 2 VỚI TOKEN MỚI
          const retryResponse = await executePost(newToken);
          
          if (retryResponse.data && (retryResponse.data.status === 200 || retryResponse.data.error === false)) {
            // (Tuỳ chọn) Nếu bạn lưu token vào DB, bạn nên có đoạn code update token mới vào DB ở đây.
            // Ví dụ: await this.userRepository.update({id: userId}, {vtpToken: newToken})
            
            return retryResponse.data;
          } else {
             throw new HttpException(`Lỗi VTP (Sau khi refresh): ${retryResponse.data?.message}`, HttpStatus.BAD_REQUEST);
          }
        } catch (retryError) {
           this.logger.error(`--- ❌ Lỗi khi thử lại sau khi refresh token: ${retryError.message}`);
           throw new HttpException(`Lỗi đẩy đơn VTP: Không thể làm mới phiên đăng nhập`, HttpStatus.BAD_REQUEST);
        }
      }

      // Nếu không phải lỗi token, văng lỗi ra cho Front-end
      const detailMsg = error.response?.data?.message || error.response?.data?.data || error.message || 'Lỗi không xác định khi kết nối VTP';
      this.logger.error(`--- ❌ LỖI VTP: ${JSON.stringify(detailMsg)}`);
      throw new HttpException(`Lỗi đẩy đơn VTP: ${detailMsg}`, HttpStatus.BAD_REQUEST);
    }
  }
}