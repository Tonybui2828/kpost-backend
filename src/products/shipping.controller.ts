import { Controller, Get, Param, Patch, Body, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
// Nhớ import ShippingService vào (bạn kiểm tra lại đường dẫn cho đúng với thư mục của bạn nhé)
import { ShippingService } from './shipping.service'; 

@Controller('shipping')
export class ShippingController {
  constructor(
    private prisma: PrismaService,
    private shippingService: ShippingService // <--- Inject (Tiêm) ShippingService vào đây
  ) {}

  // 1. API Lấy cấu hình (Khi vừa mở trang web)
  @Get(':workspaceId')
  async getSettings(@Param('workspaceId') workspaceId: string) {
    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { 
        vtpPhone: true,       // Đổi thành lấy Phone
        vtpPassword: true,    // Lấy Pass để điền sẵn vào ô input cho khách
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
      
      // Nếu khách có nhập SĐT và Mật khẩu, tiến hành gọi sang Viettel Post kiểm tra
      if (vtpPhone && vtpPassword) {
        // Tự động Login VTP để lấy Token
        newToken = await this.shippingService.getNewVTPToken(vtpPhone, vtpPassword);
      }

      // Chuẩn bị dữ liệu cập nhật
      const updateData: any = {
        vtpPhone: vtpPhone,
        vtpPassword: vtpPassword,
        vtpShopId: vtpShopId,
        ...(senderProvince && { senderProvince }),
        ...(senderDistrict && { senderDistrict })
      };

      // Chỉ cập nhật token vào DB nếu lấy được token mới từ VTP
      if (newToken) {
        updateData.vtpToken = newToken;
      }

      // Lưu tất cả vào DB
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: updateData
      });

      return { success: true, message: "Lưu cấu hình và kết nối VTP thành công!" };

    } catch (error) {
      // Nếu Mật khẩu sai, Viettel post từ chối -> Ném lỗi về cho giao diện hiển thị đỏ lên
      throw new HttpException(
        error.message || 'Tài khoản hoặc mật khẩu Viettel Post không đúng!', 
        HttpStatus.BAD_REQUEST
      );
    }
  }
}