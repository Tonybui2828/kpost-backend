import { Controller, Get, Param, Patch, Body, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ShippingService } from './shipping.service'; 

@Controller('shipping')
export class ShippingController {
  constructor(
    private prisma: PrismaService,
    private shippingService: ShippingService
  ) {}

  // 1. API Lấy cấu hình (Khi vừa mở trang web)
  @Get(':workspaceId')
  async getSettings(@Param('workspaceId') workspaceId: string) {
    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { 
        vtpPhone: true,       
        vtpPassword: true,    
        vtpShopId: true,
        senderProvince: true,
        senderDistrict: true
      }
    });
  }

  // 2. API Lưu cấu hình (Khi bấm nút LƯU & KẾT NỐI)
  @Patch(':workspaceId')
  async updateSettings(@Param('workspaceId') workspaceId: string, @Body() body: any) {
    const { vtpPhone, vtpPassword, vtpShopId, senderProvince, senderDistrict } = body;

    try {
      let newToken = "";
      
      // KIỂM TRA: Khách có nhập Pass mới không? (Khác rỗng và khác chuỗi ********)
      const isNewPassword = vtpPassword && vtpPassword !== '********' && vtpPassword.trim() !== '';
      
      // 🚀 BƯỚC 1: NẾU CÓ PASS MỚI -> TEST ĐĂNG NHẬP NGAY & LUÔN
      if (vtpPhone && isNewPassword) {
        // Nếu sai SĐT/Pass, nó sẽ ném lỗi chữ đỏ và nhảy thẳng xuống khối catch bên dưới
        newToken = await this.shippingService.getNewVTPToken(vtpPhone, vtpPassword);
      }

      // 💾 BƯỚC 2: CHUẨN BỊ DỮ LIỆU ĐỂ LƯU DATABASE
      const updateData: any = {
        vtpPhone: vtpPhone,
        vtpShopId: vtpShopId,
        ...(senderProvince && { senderProvince }),
        ...(senderDistrict && { senderDistrict })
      };

      // QUAN TRỌNG: Chỉ lưu đè Mật khẩu vào Database nếu đó là mật khẩu mới
      if (isNewPassword) {
        updateData.vtpPassword = vtpPassword;
      }

      // Nếu giật được token mới thì lưu luôn
      if (newToken) {
        updateData.vtpToken = newToken;
      }

      // Tiến hành lưu
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: updateData
      });

      return { success: true, message: "Lưu cấu hình và kết nối VTP thành công!" };

    } catch (error) {
      // ❌ BƯỚC 3: NẾU TEST PASS THẤT BẠI HOẶC LỖI DB -> BÁO LỖI VỀ GIAO DIỆN
      throw new HttpException(
        error.message || 'Tài khoản hoặc mật khẩu Viettel Post không đúng!', 
        HttpStatus.BAD_REQUEST
      );
    }
  }
}