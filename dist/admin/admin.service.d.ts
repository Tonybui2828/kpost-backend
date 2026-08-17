import { PrismaService } from '../prisma.service';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardStats(): Promise<{
        totalUsers: number;
        totalRevenue: number;
        thisMonthRevenue: number;
        growthRate: string;
        newUsersThisMonth: number;
    }>;
    getSystemSettings(): Promise<{
        id: string;
        websiteName: string | null;
        logoUrl: string | null;
        faviconUrl: string | null;
        hotline: string | null;
        emailSupport: string | null;
        announcement: string | null;
        maintenance: boolean;
        updatedAt: Date;
    }>;
    updateSystemSettings(data: any): Promise<{
        id: string;
        websiteName: string | null;
        logoUrl: string | null;
        faviconUrl: string | null;
        hotline: string | null;
        emailSupport: string | null;
        announcement: string | null;
        maintenance: boolean;
        updatedAt: Date;
    }>;
    getAllVouchers(): Promise<{
        id: string;
        code: string;
        discount: number;
        type: string;
        minOrder: number;
        expiryDate: Date | null;
        usageLimit: number;
        usedCount: number;
        isActive: boolean;
        createdAt: Date;
    }[]>;
    createVoucher(data: any): Promise<{
        id: string;
        code: string;
        discount: number;
        type: string;
        minOrder: number;
        expiryDate: Date | null;
        usageLimit: number;
        usedCount: number;
        isActive: boolean;
        createdAt: Date;
    }>;
    deleteVoucher(id: string): Promise<{
        id: string;
        code: string;
        discount: number;
        type: string;
        minOrder: number;
        expiryDate: Date | null;
        usageLimit: number;
        usedCount: number;
        isActive: boolean;
        createdAt: Date;
    }>;
    getAllUsers(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        email: string;
        workspaces: {
            workspace: {
                name: string;
                plan: string;
                planExpiry: Date;
            };
        }[];
    }[]>;
    checkExpiringWorkspaces(): Promise<{
        count: number;
    }>;
}
