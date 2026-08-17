import { PrismaService } from '../prisma.service';
import { AiContentService } from '../ai-content/ai-content.service';
export declare class DashboardController {
    private prisma;
    private aiService;
    constructor(prisma: PrismaService, aiService: AiContentService);
    getStats(workspaceId: string): Promise<{
        stats: {
            totalRevenue: number;
            totalOrders: number;
            totalPosts: number;
            totalMessages: number;
            lowStockCount: number;
            chart: {
                date: string;
                revenue: number;
                fullDate: string;
            }[];
            plan: string;
        };
        recentOrders: {
            id: string;
            workspaceId: string;
            status: string;
            createdAt: Date;
            customerName: string;
            customerPhone: string | null;
            customerAddress: string | null;
            province: string | null;
            district: string | null;
            ward: string | null;
            totalAmount: number;
            shippingCode: string | null;
            shippingFee: number | null;
            weight: number | null;
            carrierName: string | null;
        }[];
        aiInsight: any;
    }>;
    private formatChartData;
}
