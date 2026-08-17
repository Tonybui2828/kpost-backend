import { Controller, Get, Post, Patch, Delete, Body, Query, Param } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // 1. Lấy dữ liệu thống kê Dashboard Admin (Doanh thu, Tăng trưởng...)
  @Get('stats')
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  // 2. Cấu hình Logo, Tên website, Thông báo chạy chữ
  @Get('settings')
  async getSettings() {
    return this.adminService.getSystemSettings();
  }

  @Patch('settings')
  async updateSettings(@Body() body: any) {
    return this.adminService.updateSystemSettings(body);
  }

  // 3. Quản lý danh sách khách hàng (MỚI THÊM)
  // Trả về danh sách user kèm theo gói cước (plan) và ngày hết hạn
  @Get('users-list')
  async getUsers() {
    return this.adminService.getAllUsers();
  }

  // 4. Quản lý Voucher
  @Get('vouchers')
  async getVouchers() {
    return this.adminService.getAllVouchers();
  }

  @Post('vouchers')
  async createVoucher(@Body() body: any) {
    return this.adminService.createVoucher(body);
  }

  // Xóa Voucher theo ID (MỚI THÊM)
  @Delete('vouchers/:id')
  async deleteVoucher(@Param('id') id: string) {
    return this.adminService.deleteVoucher(id);
  }

  // 5. Kích hoạt quét thông báo gia hạn thủ công
  @Post('check-renewal')
  async checkRenewal() {
    return this.adminService.checkExpiringWorkspaces();
  }
}