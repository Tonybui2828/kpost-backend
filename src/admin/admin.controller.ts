import { Controller, Get, Post, Patch, Delete, Put, Body, Query, Param } from '@nestjs/common';
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

  // ==========================================
  // 3. QUẢN LÝ DANH SÁCH KHÁCH HÀNG (MỚI)
  // ==========================================
  
  // Lấy danh sách user kèm theo gói cước (plan) và ngày hết hạn
  @Get('users-list')
  async getUsers() {
    return this.adminService.getAllUsers();
  }

  // Nâng cấp hoặc tăng thời hạn gói cho khách
  @Put('users/:id/plan')
  async updateUserPlan(
    @Param('id') userId: string, 
    @Body() body: { plan: string, extraDays: number }
  ) {
    return this.adminService.updateUserPlan(userId, body.plan, body.extraDays);
  }

  // Tặng voucher riêng cho khách
  @Post('users/:id/voucher')
  async addVoucherToUser(
    @Param('id') userId: string,
    @Body() body: { voucherCode: string }
  ) {
    return this.adminService.addVoucherToUser(userId, body.voucherCode);
  }

  // Khóa/Xóa tài khoản (Xóa mềm)
  @Delete('users/:id')
  async deleteUser(@Param('id') userId: string) {
    return this.adminService.deleteUser(userId);
  }

  // Khôi phục tài khoản
  @Put('users/:id/restore')
  async restoreUser(@Param('id') userId: string) {
    return this.adminService.restoreUser(userId);
  }

  // ==========================================
  // 4. QUẢN LÝ VOUCHER
  // ==========================================
  @Get('vouchers')
  async getVouchers() {
    return this.adminService.getAllVouchers();
  }

  @Post('vouchers')
  async createVoucher(@Body() body: any) {
    return this.adminService.createVoucher(body);
  }

  @Delete('vouchers/:id')
  async deleteVoucher(@Param('id') id: string) {
    return this.adminService.deleteVoucher(id);
  }

  // ==========================================
  // 5. KÍCH HOẠT QUÉT THÔNG BÁO GIA HẠN
  // ==========================================
  @Post('check-renewal')
  async checkRenewal() {
    return this.adminService.checkExpiringWorkspaces();
  }
}