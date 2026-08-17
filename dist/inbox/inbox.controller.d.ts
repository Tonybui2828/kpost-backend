import { PrismaService } from '../prisma.service';
export declare class InboxController {
    private prisma;
    constructor(prisma: PrismaService);
    getMessages(workspaceId: string): Promise<{
        id: string;
        workspaceId: string;
        platform: string;
        type: string;
        senderName: string;
        senderId: string;
        content: string;
        pageName: string | null;
        platformId: string;
        createdAt: Date;
    }[]>;
}
