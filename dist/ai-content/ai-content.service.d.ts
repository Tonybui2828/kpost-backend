import { PrismaService } from '../prisma.service';
export declare class AiContentService {
    private prisma;
    private openai;
    private supabase;
    constructor(prisma: PrismaService);
    analyzeGrowth(stats: any): Promise<any>;
    suggestReply(msg: string, wsId: string): Promise<string>;
    private getOptimizedPrompt;
    editImage(imageUrl: string, prompt: string): Promise<{
        url: string;
    }>;
    generateImage(prompt: string): Promise<{
        url: string;
    }>;
    generatePost(topic: string, userId: string, workspaceId: string): Promise<{
        id: string;
        workspaceId: string;
        productUrl: string | null;
        content: string;
        status: string;
        isSystemPost: boolean;
        userId: string | null;
        createdAt: Date;
    }>;
    private saveToSupabase;
}
