import { Controller, Post, Body, Get, Query, Delete, Param, Patch } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ShippingService } from './shipping.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private prisma: PrismaService,
    private shippingService: ShippingService
  ) {}

  // 1. API TẠO ĐƠN HÀNG - Cập nhật để nhận thêm Tỉnh/Huyện/Xã
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
          // LƯU THÊM CÁC TRƯỜNG ĐỊA CHÍ TÁCH RỜI
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

  // 3. API ĐẨY ĐƠN SANG VẬN CHUYỂN 🚛
  @Post(':id/ship')
  async shipOrder(@Param('id') id: string) {
    console.log(`--- 🚛 BẮT ĐẦU ĐẨY ĐƠN SANG VTP: ${id} ---`);
    
    // Lấy đơn hàng kèm đầy đủ thông tin địa chỉ đã lưu
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { workspace: true }
    });

    if (!order) throw new Error("Không tìm thấy đơn hàng");

    // Log kiểm tra xem dữ liệu có bị undefined không
    console.log(`--- Tuyến thực tế: ${order['province']} -> ${order['district']} ---`);

    const vtpToken = (order.workspace as any)?.vtpToken;
    const vtpShopId = (order.workspace as any)?.vtpShopId;

    if (!vtpToken || !vtpShopId) {
      throw new Error("Cửa hàng chưa cấu hình Token hoặc Mã kho ViettelPost");
    }

    try {
      // Gọi ShippingService với object order đã đầy đủ thông tin
      const shipRes = await this.shippingService.createVTPOrder(order, vtpToken, vtpShopId);
      
      const vtpOrderNumber = shipRes.data?.ORDER_NUMBER || shipRes.ORDER_NUMBER;

      return await this.prisma.order.update({
        where: { id },
        data: { 
          shippingCode: vtpOrderNumber || 'Đang xử lý',
          status: 'shipping',
          carrierName: 'ViettelPost'
        }
      });
    } catch (error) {
      console.error("Lỗi VTP chi tiết:", error.message);
      throw new Error(error.message);
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
    console.log(`--- CẬP NHẬT THÔNG TIN ĐƠN: ${id} ---`);
    return this.prisma.order.update({
      where: { id },
      data: {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerAddress: body.customerAddress,
        // CẬP NHẬT THÊM CÁC TRƯỜNG ĐỊA CHỈ
        province: body.province,
        district: body.district,
        ward: body.ward,
        totalAmount: body.totalAmount ? Number(body.totalAmount) : undefined,
      }
    });
  }

  // 7. API XÓA 1 ĐƠN HÀNG
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