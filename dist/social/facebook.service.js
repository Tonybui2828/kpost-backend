"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
let FacebookService = class FacebookService {
    constructor() {
        this.graphUrl = 'https://graph.facebook.com/v19.0';
    }
    clean(token) {
        return token ? token.trim().replace(/\s/g, "") : "";
    }
    async postToPage(pageId, accessToken, message, imageUrl) {
        const cleanToken = this.clean(accessToken);
        const cleanMediaUrl = imageUrl ? imageUrl.trim() : "";
        const isVideo = cleanMediaUrl.match(/\.(mp4|mov|avi|wmv)$/i);
        const isImage = cleanMediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        let url = `${this.graphUrl}/${pageId}/feed`;
        const payload = { access_token: cleanToken, message };
        if (isVideo) {
            url = `${this.graphUrl}/${pageId}/videos`;
            payload.file_url = cleanMediaUrl;
            payload.description = message;
            delete payload.message;
        }
        else if (isImage) {
            url = `${this.graphUrl}/${pageId}/photos`;
            payload.url = cleanMediaUrl;
            payload.caption = message;
            delete payload.message;
        }
        try {
            const response = await axios_1.default.post(url, payload);
            return response.data;
        }
        catch (error) {
            throw new Error(error.response?.data?.error?.message || 'Lỗi đăng bài');
        }
    }
    async getInboxMessages(pageId, accessToken) {
        try {
            const url = `${this.graphUrl}/${pageId}/conversations?fields=messages{message,from,created_time},participants&access_token=${this.clean(accessToken)}`;
            const response = await axios_1.default.get(url);
            return response.data.data || [];
        }
        catch (error) {
            return [];
        }
    }
    async getPageComments(pageId, accessToken) {
        try {
            const fields = 'comments.limit(100){from,message,created_time,id,comments{from,message,created_time,id}},id,message';
            const url = `${this.graphUrl}/${pageId}/published_posts?fields=${fields}&limit=50&access_token=${this.clean(accessToken)}`;
            const response = await axios_1.default.get(url);
            return response.data.data || [];
        }
        catch (error) {
            return [];
        }
    }
    async sendReply(pageId, accessToken, recipientId, text) {
        const url = `${this.graphUrl}/${pageId}/messages`;
        const cleanToken = this.clean(accessToken);
        const payload = {
            recipient: { id: recipientId.trim() },
            message: { text: text },
            access_token: cleanToken
        };
        try {
            const response = await axios_1.default.post(url, payload);
            console.log("✅ Gửi tin nhắn thành công!");
            return response.data;
        }
        catch (error) {
            const fbError = error.response?.data?.error?.message || 'Lỗi gửi tin';
            throw new Error(fbError);
        }
    }
    async replyToComment(commentId, accessToken, text) {
        const url = `${this.graphUrl}/${commentId}/comments`;
        try {
            const response = await axios_1.default.post(url, { message: text }, { params: { access_token: this.clean(accessToken) } });
            return response.data;
        }
        catch (error) {
            const fbError = error.response?.data?.error?.message || "Lỗi phản hồi bình luận";
            throw new Error(fbError);
        }
    }
    async commentOnPost(postId, accessToken, message) {
        const url = `${this.graphUrl}/${postId}/comments`;
        try {
            const response = await axios_1.default.post(url, {
                message: message,
                access_token: this.clean(accessToken)
            });
            console.log(`✅ Đã tự động chèn comment vào bài viết: ${postId}`);
            return response.data;
        }
        catch (error) {
            const fbError = error.response?.data?.error?.message || "Lỗi tự động comment";
            console.error("❌ Lỗi Facebook Comment:", fbError);
            return null;
        }
    }
};
exports.FacebookService = FacebookService;
exports.FacebookService = FacebookService = __decorate([
    (0, common_1.Injectable)()
], FacebookService);
//# sourceMappingURL=facebook.service.js.map