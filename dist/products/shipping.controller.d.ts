import { PrismaService } from '../prisma.service';
export declare class ShippingController {
    private prisma;
    constructor(prisma: PrismaService);
    getSettings(workspaceId: string): Promise<{
        vtpToken: string;
        vtpShopId: string;
        senderProvince: string;
        senderDistrict: string;
    }>;
    updateSettings(workspaceId: string, body: any): Promise<{
        id: string;
        name: string;
        ownerId: string;
        phoneNumber: string | null;
        plan: string;
        planExpiry: Date | null;
        isAutoPay: boolean;
        balance: number;
        vtpToken: string | null;
        vtpShopId: string | null;
        senderAddress: string | null;
        senderProvince: string | null;
        senderDistrict: string | null;
        createdAt: Date;
    }>;
}
