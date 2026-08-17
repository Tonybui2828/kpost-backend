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
      // --- MỚI BỔ SUNG: Lấy thông tin Workspace để xem gói cước hiện tại ---
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { plan: true } // Chỉ bốc trường plan cho nhẹ
      });

      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);

      const allOrders = await this.prisma.order.findMany({ 
        where: { workspaceId },
        orderBy: { createdAt: 'desc' }
      });

      const totalRevenue = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalOrders = allOrders.length;
      const chartData = this.formatChartData(allOrders, sevenDaysAgo);
      const totalPosts = await this.prisma.post.count({ where: { workspaceId } });
      const totalMessages = await this.prisma.inboxMessage.count({ where: { workspaceId } });

      const lowStockProducts = await this.prisma.product.findMany({
        where: { workspaceId, totalStock: { lt: 10 } }
      });

      const aiInsight = await this.aiService.analyzeGrowth({
        totalRevenue,
        totalOrders,
        totalPosts,
        totalMessages,
        lowStockCount: lowStockProducts.length
      });

      return {
        stats: {
          totalRevenue,
          totalOrders,
          totalPosts,
          totalMessages,
          lowStockCount: lowStockProducts.length,
          chart: chartData,
          // --- QUAN TRỌNG: Trả về plan để Sidebar hiển thị huy hiệu ---
          plan: workspace?.plan || 'free' 
        },
        recentOrders: allOrders.slice(0, 5),
        aiInsight: aiInsight
      };

    } catch (error) {
      console.error("Lỗi Dashboard:", error.message);
      return {
        stats: { totalRevenue: 0, totalOrders: 0, totalPosts: 0, totalMessages: 0, lowStockCount: 0, chart: [], plan: 'free' },
        recentOrders: [],
        aiInsight: { analysis: "Đang cập nhật...", suggestions: [] }
      };
    }
  }

  private formatChartData(orders: any[], startDate: Date) {
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