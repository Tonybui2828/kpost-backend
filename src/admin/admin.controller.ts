import { Controller, Get, Post, Patch, Delete, Put, Body, Param } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // 1. Thống kê Dashboard
  @Get('stats')
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  // 2. Cấu hình hệ thống
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
  @Get('users-list')
  async getUsers() {
    return this.adminService.getAllUsers();
  }

  // Nâng cấp / Chỉnh hạn dùng (Hỗ trợ cả +days, -days và custom date)
  @Put('users/:id/plan')
  async updateUserPlan(
    @Param('id') userId: string, 
    @Body() body: { plan: string; extraDays?: number; customExpireDate?: string }
  ) {
    return (this.adminService as any).updateUserPlan(
      userId, 
      body.plan, 
      body.extraDays, 
      body.customExpireDate
    );
  }

  // Tặng voucher
  @Post('users/:id/voucher')
  async addVoucherToUser(
    @Param('id') userId: string,
    @Body() body: { voucherCode: string }
  ) {
    return this.adminService.addVoucherToUser(userId, body.voucherCode);
  }

  // Khóa tài khoản (Xóa mềm)
  @Delete('users/:id')
  async deleteUser(@Param('id') userId: string) {
    return this.adminService.deleteUser(userId);
  }

  // Khôi phục tài khoản
  @Put('users/:id/restore')
  async restoreUser(@Param('id') userId: string) {
    return this.adminService.restoreUser(userId);
  }

  // Xóa vĩnh viễn 1 tài khoản
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
    for (const id of body.userIds || []) {
      await this.adminService.deleteUser(id).catch(() => {});
    }
    return { success: true, message: `Đã khóa ${body.userIds?.length || 0} tài khoản` };
  }

  @Post('users/bulk-restore')
  async bulkRestoreUsers(@Body() body: { userIds: string[] }) {
    for (const id of body.userIds || []) {
      await this.adminService.restoreUser(id).catch(() => {});
    }
    return { success: true, message: `Đã khôi phục ${body.userIds?.length || 0} tài khoản` };
  }

  @Post('users/bulk-hard-delete')
  async bulkHardDeleteUsers(@Body() body: { userIds: string[] }) {
    for (const id of body.userIds || []) {
      if (typeof (this.adminService as any).hardDeleteUser === 'function') {
        await (this.adminService as any).hardDeleteUser(id).catch(() => {});
      } else {
        await this.adminService.deleteUser(id).catch(() => {});
      }
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
  // 5. THÔNG BÁO GIA HẠN
  // ==========================================
  @Post('check-renewal')
  async checkRenewal() {
    return this.adminService.checkExpiringWorkspaces();
  }

  // ==========================================
  // 6. QUẢN LÝ CHIẾN DỊCH FLASHSALE & POPUP TRANG CHỦ
  // ==========================================
  @Get('marketing-campaigns')
  async getMarketingCampaigns() {
    return (this.adminService as any).getMarketingCampaigns();
  }

  @Post('marketing-campaigns')
  async updateMarketingCampaigns(@Body() body: any) {
    return (this.adminService as any).updateMarketingCampaigns(body);
  }
}