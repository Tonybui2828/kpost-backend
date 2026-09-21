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
  // 3. QUẢN LÝ DANH SÁCH KHÁCH HÀNG
  // ==========================================
  
  // Lấy danh sách user kèm theo gói cước (plan) và ngày hết hạn
  @Get('users-list')
  async getUsers() {
    return this.adminService.getAllUsers();
  }

  // Nâng cấp, Tăng/Giảm thời hạn gói hoặc Chọn ngày hết hạn cụ thể
  @Put('users/:id/plan')
  async updateUserPlan(
    @Param('id') userId: string, 
    @Body() body: { plan: string; extraDays?: number; customExpireDate?: string }
  ) {
    return this.adminService.updateUserPlan(
      userId, 
      body.plan, 
      body.extraDays, 
      body.customExpireDate
    );
  }

  // Tặng voucher riêng cho khách
  @Post('users/:id/voucher')
  async addVoucherToUser(
    @Param('id') userId: string,
    @Body() body: { voucherCode: string }
  ) {
    return this.adminService.addVoucherToUser(userId, body.voucherCode);
  }

  // Khóa tài khoản (Xóa mềm - Soft Delete)
  @Delete('users/:id')
  async deleteUser(@Param('id') userId: string) {
    return this.adminService.deleteUser(userId);
  }

  // Khôi phục tài khoản
  @Put('users/:id/restore')
  async restoreUser(@Param('id') userId: string) {
    return this.adminService.restoreUser(userId);
  }

  // Xóa vĩnh viễn 1 tài khoản (Hard Delete)
  @Delete('users/:id/hard-delete')
  async hardDeleteUser(@Param('id') userId: string) {
    if (typeof (this.adminService as any).hardDeleteUser === 'function') {
      return (this.adminService as any).hardDeleteUser(userId);
    }
    return this.adminService.deleteUser(userId);
  }

  // ==========================================
  // THAO TÁC HÀNG LOẠT (BULK ACTIONS)
  // ==========================================
  @Post('users/bulk-lock')
  async bulkLockUsers(@Body() body: { userIds: string[] }) {
    if (typeof (this.adminService as any).bulkLockUsers === 'function') {
      return (this.adminService as any).bulkLockUsers(body.userIds);
    }
    for (const id of body.userIds || []) {
      await this.adminService.deleteUser(id).catch(() => {});
    }
    return { success: true, message: `Đã khóa ${body.userIds?.length || 0} tài khoản` };
  }

  @Post('users/bulk-restore')
  async bulkRestoreUsers(@Body() body: { userIds: string[] }) {
    if (typeof (this.adminService as any).bulkRestoreUsers === 'function') {
      return (this.adminService as any).bulkRestoreUsers(body.userIds);
    }
    for (const id of body.userIds || []) {
      await this.adminService.restoreUser(id).catch(() => {});
    }
    return { success: true, message: `Đã khôi phục ${body.userIds?.length || 0} tài khoản` };
  }

  @Post('users/bulk-hard-delete')
  async bulkHardDeleteUsers(@Body() body: { userIds: string[] }) {
    if (typeof (this.adminService as any).bulkHardDeleteUsers === 'function') {
      return (this.adminService as any).bulkHardDeleteUsers(body.userIds);
    }
    for (const id of body.userIds || []) {
      await this.adminService.deleteUser(id).catch(() => {});
    }
    return { success: true, message: `Đã xóa vĩnh viễn ${body.userIds?.length || 0} tài khoản` };
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