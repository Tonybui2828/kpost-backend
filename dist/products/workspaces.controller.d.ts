import { PrismaService } from '../prisma.service';
export declare class WorkspacesController {
    private prisma;
    constructor(prisma: PrismaService);
    updateShippingConfig(body: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
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
    }>;
}
