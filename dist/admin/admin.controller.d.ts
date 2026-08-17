import { AdminService } from './admin.service';
export declare class AdminController {
    private adminService;
    constructor(adminService: AdminService);
    getStats(): Promise<{
        totalUsers: number;
        totalRevenue: number;
        thisMonthRevenue: number;
        growthRate: string;
        newUsersThisMonth: number;
    }>;
    getSettings(): Promise<{
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
    updateSettings(body: any): Promise<{
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
    getUsers(): Promise<{
        id: string;
        name: string;
        email: string;
        createdAt: Date;
        workspaces: {
            workspace: {
                name: string;
                plan: string;
                planExpiry: Date;
            };
        }[];
    }[]>;
    getVouchers(): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        code: string;
        discount: number;
        type: string;
        minOrder: number;
        expiryDate: Date | null;
        usageLimit: number;
        usedCount: number;
    }[]>;
    createVoucher(body: any): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        code: string;
        discount: number;
        type: string;
        minOrder: number;
        expiryDate: Date | null;
        usageLimit: number;
        usedCount: number;
    }>;
    deleteVoucher(id: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        code: string;
        discount: number;
        type: string;
        minOrder: number;
        expiryDate: Date | null;
        usageLimit: number;
        usedCount: number;
    }>;
    checkRenewal(): Promise<{
        count: number;
    }>;
}
