import { AiContentService } from './ai-content.service';
export declare class AiContentController {
    private readonly aiContentService;
    constructor(aiContentService: AiContentService);
    generate(body: {
        topic: string;
        userId: string;
        workspaceId: string;
    }): Promise<{
        id: string;
        workspaceId: string;
        productUrl: string | null;
        content: string;
        status: string;
        isSystemPost: boolean;
        userId: string | null;
        createdAt: Date;
    }>;
}
