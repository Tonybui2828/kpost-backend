export declare class FacebookService {
    private readonly graphUrl;
    private clean;
    postToPage(pageId: string, accessToken: string, message: string, imageUrl?: string): Promise<any>;
    getInboxMessages(pageId: string, accessToken: string): Promise<any[]>;
    getPageComments(pageId: string, accessToken: string): Promise<any[]>;
    sendReply(pageId: string, accessToken: string, recipientId: string, text: string): Promise<any>;
    replyToComment(commentId: string, accessToken: string, text: string): Promise<any>;
    commentOnPost(postId: string, accessToken: string, message: string): Promise<any>;
}
