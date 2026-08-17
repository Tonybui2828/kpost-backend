import { PrismaService } from '../prisma.service';
export declare class PaymentService {
    private prisma;
    private payos;
    private readonly logger;
    constructor(prisma: PrismaService);
    createTransaction(workspaceId: string, planName: string, amount: number): Promise<{
        id: string;
        workspaceId: string;
        description: string;
        status: string;
        createdAt: Date;
        amount: number;
        planName: string | null;
    }>;
    handleCassoWebhook(body: any): Promise<{
        error: number;
        message: string;
    }>;
    private activatePlan;
    createPaymentLink(workspaceId: string, planName: string, amount: number): Promise<any>;
}
