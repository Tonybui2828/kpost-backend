import { Response } from 'express';
import { FacebookService } from './facebook.service';
import { PrismaService } from '../prisma.service';
import { ChatGateway } from './chat.gateway';
import { AiContentService } from '../ai-content/ai-content.service';
import { PaymentService } from '../products/payment.service';
import { AutomatorService } from './automator.service';
export declare class SocialController {
    private readonly facebookService;
    private readonly prisma;
    private readonly chatGateway;
    private readonly aiService;
    private readonly paymentService;
    private readonly automatorService;
    constructor(facebookService: FacebookService, prisma: PrismaService, chatGateway: ChatGateway, aiService: AiContentService, paymentService: PaymentService, automatorService: AutomatorService);
    saveAccount(data: any): Promise<{
        id: string;
        workspaceId: string;
        platform: string;
        platformId: string;
        accountName: string;
        accessToken: string;
        cookies: string | null;
        isAiAutoReply: boolean;
        aiTone: string;
    }>;
    getAccounts(workspaceId: string): Promise<{
        id: string;
        workspaceId: string;
        platform: string;
        platformId: string;
        accountName: string;
        accessToken: string;
        cookies: string | null;
        isAiAutoReply: boolean;
        aiTone: string;
    }[]>;
    updateAccount(id: string, data: any): Promise<{
        id: string;
        workspaceId: string;
        platform: string;
        platformId: string;
        accountName: string;
        accessToken: string;
        cookies: string | null;
        isAiAutoReply: boolean;
        aiTone: string;
    }>;
    deleteAccount(id: string): Promise<{
        id: string;
        workspaceId: string;
        platform: string;
        platformId: string;
        accountName: string;
        accessToken: string;
        cookies: string | null;
        isAiAutoReply: boolean;
        aiTone: string;
    }>;
    postToGroups(body: any): Promise<any[]>;
    postFacebook(body: any): Promise<any>;
    schedulePost(body: any): Promise<{
        id: string;
        workspaceId: string;
        productUrl: string | null;
        content: string;
        status: string;
        isSystemPost: boolean;
        userId: string | null;
        createdAt: Date;
    }>;
    getScheduledPosts(workspaceId: string): Promise<{
        id: string;
        workspaceId: string;
        productUrl: string | null;
        content: string;
        status: string;
        isSystemPost: boolean;
        userId: string | null;
        createdAt: Date;
    }[]>;
    createTransaction(body: any): Promise<{
        id: string;
        workspaceId: string;
        description: string;
        status: string;
        createdAt: Date;
        amount: number;
        planName: string | null;
    }>;
    checkTransaction(billCode: string): Promise<{
        status: string;
        planName: string;
    }>;
    handleCassoWebhook(body: any, res: Response): Promise<Response<any, Record<string, any>>>;
    verifyWebhook(query: any, res: Response): Response<any, Record<string, any>>;
    handleWebhook(body: any): Promise<"NO_ENTRY" | "EVENT_RECEIVED">;
    extractInfo(body: {
        text: string;
    }): Promise<{
        phone: string;
        address: string;
        name: string;
    }>;
    suggestReply(body: any): Promise<string>;
    aiImage(body: {
        prompt: string;
    }): Promise<{
        url: string;
    }>;
    aiEditImage(body: {
        imageUrl: string;
        prompt: string;
    }): Promise<{
        url: string;
    }>;
    sendReply(body: any): Promise<any>;
}
