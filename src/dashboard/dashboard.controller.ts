import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiContentService } from '../ai-content/ai-content.service';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private prisma: PrismaService,
    private aiService: AiContentService
  ) {}

  @Get('stats')
  async getStats(@Query('workspaceId') workspaceId: string) {
    try {
      // 1. Lấy thông tin gói cước (Để hiện ở Sidebar)
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { plan: true }
      });

      // 2. Xác định mốc thời gian (Hôm nay và 7 ngày trước)
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);

      // 3. Lấy tất cả đơn hàng để tính toán
      const allOrders = await this.prisma.order.findMany({ 
        where: { workspaceId },
        orderBy: { createdAt: 'desc' }
      });

      // 4. Tính toán các con số cho Dashboard
      const totalRevenue = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      
      // Doanh thu hôm nay
      const todayRevenue = allOrders
        .filter(order => new Date(order.createdAt) >= startOfToday)
        .reduce((sum, order) => sum + order.totalAmount, 0);

      // Đếm tổng sản phẩm trong kho
      const totalProducts = await this.prisma.product.count({
        where: { workspaceId }
      });

      const totalOrders = allOrders.length;
      const totalMessages = await this.prisma.inboxMessage.count({ where: { workspaceId } });
      const chartData = this.formatChartData(allOrders);

      // 5. Phân tích AI Insight
      const aiInsight = await this.aiService.analyzeGrowth({
        totalRevenue,
        totalOrders,
        totalPosts: await this.prisma.post.count({ where: { workspaceId } }),
        totalMessages,
        lowStockCount: await this.prisma.product.count({ where: { workspaceId, totalStock: { lt: 10 } } })
      });

      // 6. TRẢ VỀ DỮ LIỆU CHUẨN CHO FRONTEND
      return {
        // Các số này sẽ hiện ở 4 ô trên đầu Frontend
        todayRevenue: todayRevenue, 
        totalRevenue: totalRevenue,
        totalOrders: totalOrders,
        totalProducts: totalProducts,
        totalCustomers: totalMessages, // Lấy tổng tin nhắn làm khách hàng tiềm năng
        growthRate: "12%", // Bạn có thể tính logic % tăng trưởng ở đây

        stats: {
          totalRevenue,
          totalOrders,
          chart: chartData,
          plan: workspace?.plan || 'free' 
        },
        recentOrders: allOrders.slice(0, 5),
        aiInsight: aiInsight
      };

    } catch (error) {
      console.error("Lỗi Dashboard Server:", error.message);
      return {
        todayRevenue: 0, totalOrders: 0, totalProducts: 0, totalCustomers: 0,
        stats: { totalRevenue: 0, chart: [], plan: 'free' },
        recentOrders: [],
        aiInsight: { analysis: "Hệ thống đang bận...", suggestions: [] }
      };
    }
  }

  // Hàm định dạng dữ liệu biểu đồ
  private formatChartData(orders: any[]) {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        date: days[d.getDay()],
        revenue: 0,
        fullDate: d.toLocaleDateString('vi-VN')
      };
    }).reverse();

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt).toLocaleDateString('vi-VN');
      const dayData = last7Days.find(d => d.fullDate === orderDate);
      if (dayData) {
        dayData.revenue += order.totalAmount;
      }
    });

    return last7Days;
  }
}