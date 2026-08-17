import { PrismaService } from '../prisma.service';
import { AiContentService } from '../ai-content/ai-content.service';
import { FacebookService } from './facebook.service';
export declare class AutomatorService {
    private prisma;
    private aiService;
    private fbService;
    private readonly logger;
    constructor(prisma: PrismaService, aiService: AiContentService, fbService: FacebookService);
    processIncomingMessage(pageId: string, senderId: string, content: string, type: 'inbox' | 'comment', platformId: string): Promise<void>;
    private extractAndSaveOrder;
    postToGroup(groupId: string, cookiesJson: string, content: string): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
}
