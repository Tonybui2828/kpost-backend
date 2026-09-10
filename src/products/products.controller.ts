import { Controller, Get, Post, Body, Query, Delete, Param, Patch, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(@Body() data: any) {
    if (!data.workspaceId) {
      throw new BadRequestException("Không thể tạo sản phẩm: Thiếu workspaceId!");
    }
    return this.productsService.create(data);
  }

  @Get()
  async findAll(@Query('workspaceId') workspaceId: string) {
    // CHẶN: Nếu không có workspaceId thì báo lỗi ngay, không gọi vào Database
    if (!workspaceId) {
      throw new BadRequestException("Vui lòng cung cấp workspaceId để lấy danh sách sản phẩm!");
    }
    return this.productsService.findAll(workspaceId);
  }

  // 1. API XÓA SẢN PHẨM
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  // 2. API CẬP NHẬT SẢN PHẨM
  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.productsService.update(id, data);
  }
}