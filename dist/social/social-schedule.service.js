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
var SocialScheduleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialScheduleService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma.service");
const facebook_service_1 = require("./facebook.service");
let SocialScheduleService = SocialScheduleService_1 = class SocialScheduleService {
    constructor(prisma, facebookService) {
        this.prisma = prisma;
        this.facebookService = facebookService;
        this.logger = new common_1.Logger(SocialScheduleService_1.name);
    }
    async handleCron() {
        this.logger.debug('--- 🔍 Đang quét danh sách bài viết chờ đăng... ---');
        const now = new Date();
        const pendingPosts = await this.prisma.post.findMany({
            where: {
                status: 'scheduled',
                createdAt: { lte: now },
            },
        });
        if (pendingPosts.length === 0)
            return;
        for (const post of pendingPosts) {
            try {
                this.logger.log(`🚀 Bắt đầu đăng bài theo lịch [ID: ${post.id}]`);
                const accounts = await this.prisma.socialAccount.findMany({
                    where: { workspaceId: post.workspaceId },
                });
                if (accounts.length === 0) {
                    this.logger.warn(`⚠️ Không tìm thấy Fanpage cho bài đăng ${post.id}.`);
                    await this.prisma.post.update({
                        where: { id: post.id },
                        data: { status: 'failed' },
                    });
                    continue;
                }
                for (const acc of accounts) {
                    try {
                        const fbRes = await this.facebookService.postToPage(acc.platformId, acc.accessToken, post.content, post.userId || '');
                        this.logger.log(`✅ Đăng bài thành công lên Page: ${acc.accountName}`);
                        const linkSanPham = post.productUrl;
                        if (fbRes && fbRes.id && linkSanPham) {
                            const commentMessage = `🔗 Link mua sản phẩm tại đây: ${linkSanPham}`;
                            await this.facebookService.commentOnPost(fbRes.id, acc.accessToken, commentMessage);
                            this.logger.log(`💬 Đã tự động rải link comment cho: ${acc.accountName}`);
                        }
                    }
                    catch (pageError) {
                        this.logger.error(`❌ Lỗi tại Page [${acc.accountName}]: ${pageError.message}`);
                    }
                }
                await this.prisma.post.update({
                    where: { id: post.id },
                    data: { status: 'published' },
                });
                this.logger.log(`🎉 Nhiệm vụ hoàn tất cho bài đăng: ${post.id}`);
            }
            catch (error) {
                this.logger.error(`❌ Lỗi hệ thống bài đăng ${post.id}:`, error.message);
            }
        }
    }
};
exports.SocialScheduleService = SocialScheduleService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SocialScheduleService.prototype, "handleCron", null);
exports.SocialScheduleService = SocialScheduleService = SocialScheduleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        facebook_service_1.FacebookService])
], SocialScheduleService);
//# sourceMappingURL=social-schedule.service.js.map