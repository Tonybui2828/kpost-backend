import { Controller, Post, Body, Get, Query, Delete, Param, Patch, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ShippingService } from './shipping.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private prisma: PrismaService,
    private shippingService: ShippingService
  ) {}

  // 1. API TẠO ĐƠN HÀNG (CHỐT ĐƠN)
  @Post()
  async createOrder(@Body() body: any) {
    const { 
      workspaceId, customerName, customerPhone, customerAddress, 
      province, district, ward, items 
    } = body;
    
    return this.prisma.$transaction(async (tx) => {
      let total = 0;
      for (const item of items) {
        total += item.price * item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: { totalStock: { decrement: item.quantity } }
        });
      }

      return tx.order.create({
        data: {
          workspaceId,
          customerName,
          customerPhone,
          customerAddress: customerAddress || "Chưa có địa chỉ",
          province: province || "", 
          district: district || "",
          ward: ward || "",
          totalAmount: total,
          status: 'confirmed',
          items: {
            create: items.map(i => ({
              productId: i.productId,
              quantity: i.quantity,
              price: i.price
            }))
          }
        }
      });
    });
  }

  // 2. API LẤY DANH SÁCH ĐƠN HÀNG
  @Get()
  async getOrders(@Query('workspaceId') workspaceId: string) {
    return this.prisma.order.findMany({
      where: { workspaceId },
      include: { 
        items: { include: { product: true } },
        workspace: true 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 3. API ĐẨY ĐƠN SANG VIETTEL POST (DẠNG ĐƠN NHÁP) 🚛
  @Post(':id/ship')
  async shipOrder(@Param('id') id: string) {
    console.log(`--- 🚛 BẮT ĐẦU ĐẨY ĐƠN SANG VTP: ${id} ---`);
    
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
        include: { workspace: true }
      });

      if (!order) throw new HttpException("Không tìm thấy đơn hàng", HttpStatus.NOT_FOUND);

      const vtpToken = (order.workspace as any)?.vtpToken;
      const vtpShopId = (order.workspace as any)?.vtpShopId;

      if (!vtpToken || !vtpShopId) {
        throw new HttpException("Cửa hàng chưa cấu hình Token hoặc Mã kho ViettelPost", HttpStatus.BAD_REQUEST);
      }

      // Gọi sang ShippingService để xử lý API ViettelPost
      // Lưu ý: ShippingService của bạn cần đặt TYPE_ORDER: 3 để vào đơn nháp
      const shipRes = await this.shippingService.createVTPOrder(order, vtpToken, vtpShopId);
      
      const vtpOrderNumber = shipRes.data?.ORDER_NUMBER || shipRes.ORDER_NUMBER;

      // Cập nhật trạng thái trong Database
      return await this.prisma.order.update({
        where: { id },
        data: { 
          shippingCode: vtpOrderNumber || 'VTP_DRAFT',
          status: 'shipping',
          carrierName: 'ViettelPost'
        }
      });
    } catch (error) {
      console.error("LỖI ĐẨY ĐƠN VTP:", error.message);
      // Trả về lỗi chi tiết cho Frontend để hiện thông báo thay vì lỗi 500 chung chung
      throw new HttpException(
        error.message || "Lỗi hệ thống khi kết nối ViettelPost", 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // 4. API LẤY CẤU HÌNH VẬN CHUYỂN
  @Get('shipping-settings/:workspaceId')
  async getShippingSettings(@Param('workspaceId') workspaceId: string) {
    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { vtpToken: true, vtpShopId: true }
    });
  }

  // 5. API LƯU CẤU HÌNH VẬN CHUYỂN
  @Patch('shipping-settings/:workspaceId')
  async updateShippingSettings(
    @Param('workspaceId') workspaceId: string,
    @Body() body: any
  ) {
    const { vtpToken, vtpShopId } = body;
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { vtpToken, vtpShopId },
    });
  }

  // 6. API CẬP NHẬT THÔNG TIN ĐƠN HÀNG (SỬA ĐƠN)
  @Patch(':id')
  async updateOrder(@Param('id') id: string, @Body() body: any) {
    return this.prisma.order.update({
      where: { id },
      data: {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerAddress: body.customerAddress,
        province: body.province,
        district: body.district,
        ward: body.ward,
        totalAmount: body.totalAmount ? Number(body.totalAmount) : undefined,
      }
    });
  }

  // 7. API XÓA ĐƠN HÀNG
  @Delete(':id')
  async deleteOrder(@Param('id') id: string) {
    return this.prisma.order.delete({
      where: { id }
    });
  }

  // 8. API XÓA HÀNG LOẠT
  @Post('bulk-delete')
  async bulkDelete(@Body() body: { ids: string[] }) {
    return this.prisma.order.deleteMany({
      where: { id: { in: body.ids } }
    });
  }
}