"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialController = void 0;
const common_1 = require("@nestjs/common");
const facebook_service_1 = require("./facebook.service");
const prisma_service_1 = require("../prisma.service");
const chat_gateway_1 = require("./chat.gateway");
const ai_content_service_1 = require("../ai-content/ai-content.service");
const payment_service_1 = require("../products/payment.service");
const automator_service_1 = require("./automator.service");
let SocialController = class SocialController {
    constructor(facebookService, prisma, chatGateway, aiService, paymentService, automatorService) {
        this.facebookService = facebookService;
        this.prisma = prisma;
        this.chatGateway = chatGateway;
        this.aiService = aiService;
        this.paymentService = paymentService;
        this.automatorService = automatorService;
    }
    async saveAccount(data) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: data.workspaceId },
            include: { _count: { select: { socialAccounts: true } } }
        });
        if (!workspace)
            throw new common_1.HttpException("Không tìm thấy Workspace", common_1.HttpStatus.NOT_FOUND);
        const planLimits = { 'free': 1, 'PRO': 50, 'GOLD': 100, 'DIAMOND': 500 };
        const currentPlan = workspace.plan || 'free';
        const maxLimit = planLimits[currentPlan] || 1;
        if (workspace._count.socialAccounts >= maxLimit) {
            throw new common_1.HttpException(`Hạn mức gói ${currentPlan} đã hết (${maxLimit} Fanpage).`, common_1.HttpStatus.FORBIDDEN);
        }
        return this.prisma.socialAccount.create({ data });
    }
    async getAccounts(workspaceId) { return this.prisma.socialAccount.findMany({ where: { workspaceId } }); }
    async updateAccount(id, data) { return this.prisma.socialAccount.update({ where: { id }, data }); }
    async deleteAccount(id) { return this.prisma.socialAccount.delete({ where: { id } }); }
    async postToGroups(body) {
        const groups = await this.prisma.socialGroup.findMany({ where: { workspaceId: body.workspaceId } });
        const results = [];
        for (const group of groups) {
            try {
                const account = await this.prisma.socialAccount.findFirst({ where: { workspaceId: body.workspaceId, platformId: group.pageId } });
                if (account) {
                    const res = await this.facebookService.postToPage(group.groupId, account.accessToken, body.message, body.imageUrl);
                    if (res?.id && body.productUrl)
                        await this.facebookService.commentOnPost(res.id, account.accessToken, `🔗 Link mua sản phẩm: ${body.productUrl}`);
                    results.push({ group: group.groupName, status: 'success' });
                }
            }
            catch (e) {
                results.push({ group: group.groupName, status: 'failed', error: e.message });
            }
        }
        return results;
    }
    async postFacebook(body) {
        const res = await this.facebookService.postToPage(body.pageId, body.accessToken, body.message, body.imageUrl);
        if (res?.id && body.productUrl)
            await this.facebookService.commentOnPost(res.id, body.accessToken, `🔗 Link mua sản phẩm tại đây: ${body.productUrl}`);
        return res;
    }
    async schedulePost(body) {
        return this.prisma.post.create({
            data: { content: body.content, workspaceId: body.workspaceId, productUrl: body.productUrl || null, status: 'scheduled', createdAt: new Date(body.scheduledAt), userId: body.imageUrl || "" }
        });
    }
    async getScheduledPosts(workspaceId) { return this.prisma.post.findMany({ where: { workspaceId, status: 'scheduled' }, orderBy: { createdAt: 'asc' } }); }
    async createTransaction(body) {
        const billCode = `SAASAI${Math.floor(1000 + Math.random() * 8999)}`;
        return this.prisma.transaction.create({ data: { workspaceId: body.workspaceId, planName: body.planName, amount: body.amount, description: billCode, status: 'pending' } });
    }
    async checkTransaction(billCode) {
        return this.prisma.transaction.findFirst({ where: { description: { contains: billCode, mode: 'insensitive' } }, select: { status: true, planName: true } });
    }
    async handleCassoWebhook(body, res) {
        const transactions = body.data;
        if (!transactions)
            return res.status(200).send();
        for (const trans of transactions) {
            const match = trans.description.toUpperCase().match(/SAASAI(\d+)/i);
            if (match) {
                const billCode = match[0];
                const dbTrans = await this.prisma.transaction.findFirst({ where: { description: { contains: billCode, mode: 'insensitive' }, status: 'pending' } });
                if (dbTrans) {
                    await this.prisma.transaction.update({ where: { id: dbTrans.id }, data: { status: 'success' } });
                    const exp = new Date();
                    exp.setDate(exp.getDate() + 30);
                    await this.prisma.workspace.update({ where: { id: dbTrans.workspaceId }, data: { plan: dbTrans.planName, planExpiry: exp } });
                    this.chatGateway.server.emit('paymentSuccess', { billCode: dbTrans.description });
                }
            }
        }
        return res.status(200).json({ error: 0, message: "Done" });
    }
    verifyWebhook(query, res) {
        if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === "saas_ai_token_123") {
            return res.status(200).send(query['hub.challenge']);
        }
        return res.status(403).send('Forbidden');
    }
    async handleWebhook(body) {
        try {
            const entry = body.entry?.[0];
            if (!entry)
                return 'NO_ENTRY';
            const pageId = entry.id;
            const messaging = entry.messaging ? entry.messaging[0] : null;
            const changes = entry.changes ? entry.changes[0] : null;
            if (messaging && messaging.message && !messaging.message.is_echo) {
                const senderId = messaging.sender.id;
                const text = messaging.message.text;
                const savedMsg = await this.prisma.inboxMessage.upsert({
                    where: { platformId: messaging.message.mid },
                    update: { content: text },
                    create: { workspaceId: "workspace-01", platform: 'facebook', type: 'inbox', senderName: "Khách mới", senderId, content: text, platformId: messaging.message.mid }
                });
                this.chatGateway.sendMessageToUI(savedMsg);
                await this.automatorService.processIncomingMessage(pageId, senderId, text, 'inbox', messaging.message.mid);
            }
            if (changes && changes.value.item === 'comment' && changes.value.verb === 'add') {
                const commentText = changes.value.message;
                const commentId = changes.value.comment_id;
                const senderId = changes.value.from.id;
                if (senderId !== pageId) {
                    await this.automatorService.processIncomingMessage(pageId, senderId, commentText, 'comment', commentId);
                }
            }
        }
        catch (e) {
            console.log("⚠️ Webhook Error:", e.message);
        }
        return 'EVENT_RECEIVED';
    }
    async extractInfo(body) {
        const { text } = body;
        const phone = text.match(/(0|\+84|84)?([3|5|7|8|9][0-9]{8})\b/)?.[0] || "";
        const addressKeywords = ["số", "ngõ", "ngách", "đường", "phố", "phường", "xã", "quận", "huyện", "tỉnh", "thành phố"];
        let address = text.split(/[\n,.]/).find(line => addressKeywords.some(key => line.toLowerCase().includes(key))) || "";
        return { phone, address, name: "Chưa rõ" };
    }
    async suggestReply(body) { return this.aiService.suggestReply(body.customerMessage, body.workspaceId); }
    async aiImage(body) { return this.aiService.generateImage(body.prompt); }
    async aiEditImage(body) { return this.aiService.editImage(body.imageUrl, body.prompt); }
    async sendReply(body) {
        try {
            const account = await this.prisma.socialAccount.findFirst({ where: { workspaceId: body.workspaceId, accountName: body.pageName } });
            if (!account)
                throw new Error("Không tìm thấy Fanpage");
            let fbRes = body.type === 'comment'
                ? await this.facebookService.replyToComment(body.platformId, account.accessToken, body.text)
                : await this.facebookService.sendReply(account.platformId, account.accessToken, body.senderId, body.text);
            await this.prisma.inboxMessage.create({
                data: { workspaceId: body.workspaceId, platform: 'facebook', type: 'outbound', senderName: 'Bạn (Admin)', senderId: body.senderId, content: body.text, pageName: body.pageName, platformId: `out_${Date.now()}` }
            });
            return fbRes;
        }
        catch (e) {
            throw new common_1.HttpException(e.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.SocialController = SocialController;
__decorate([
    (0, common_1.Post)('accounts'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "saveAccount", null);
__decorate([
    (0, common_1.Get)('accounts'),
    __param(0, (0, common_1.Query)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "getAccounts", null);
__decorate([
    (0, common_1.Patch)('accounts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "updateAccount", null);
__decorate([
    (0, common_1.Delete)('accounts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "deleteAccount", null);
__decorate([
    (0, common_1.Post)('facebook/post-groups'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "postToGroups", null);
__decorate([
    (0, common_1.Post)('facebook/post'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "postFacebook", null);
__decorate([
    (0, common_1.Post)('schedule'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "schedulePost", null);
__decorate([
    (0, common_1.Get)('scheduled-posts'),
    __param(0, (0, common_1.Query)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "getScheduledPosts", null);
__decorate([
    (0, common_1.Post)('create-transaction'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "createTransaction", null);
__decorate([
    (0, common_1.Get)('check-transaction/:billCode'),
    __param(0, (0, common_1.Param)('billCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "checkTransaction", null);
__decorate([
    (0, common_1.Post)('casso-webhook'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "handleCassoWebhook", null);
__decorate([
    (0, common_1.Get)('webhook'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SocialController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Post)('extract-info'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "extractInfo", null);
__decorate([
    (0, common_1.Post)('ai-suggest-reply'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "suggestReply", null);
__decorate([
    (0, common_1.Post)('ai-generate-image'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "aiImage", null);
__decorate([
    (0, common_1.Post)('ai-edit-image'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "aiEditImage", null);
__decorate([
    (0, common_1.Post)('reply'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SocialController.prototype, "sendReply", null);
exports.SocialController = SocialController = __decorate([
    (0, common_1.Controller)('social'),
    __metadata("design:paramtypes", [facebook_service_1.FacebookService,
        prisma_service_1.PrismaService,
        chat_gateway_1.ChatGateway,
        ai_content_service_1.AiContentService,
        payment_service_1.PaymentService,
        automator_service_1.AutomatorService])
], SocialController);
//# sourceMappingURL=social.controller.js.map