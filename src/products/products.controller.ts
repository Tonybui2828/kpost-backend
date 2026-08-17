import { Controller, Get, Post, Body, Query, Delete, Param, Patch } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(@Body() data: any) {
    return this.productsService.create(data);
  }

  @Get()
  async findAll(@Query('workspaceId') workspaceId: string) {
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