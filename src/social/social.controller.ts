import { Controller, Post, Body, Get, Query, Delete, Param, Patch, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express'; 
import axios from 'axios'; 
import { FacebookService } from './facebook.service';
import { PrismaService } from '../prisma.service';
import { ChatGateway } from './chat.gateway';
import { AiContentService } from '../ai-content/ai-content.service';
import { PaymentService } from '../products/payment.service';
import { AutomatorService } from './automator.service';
import { SocialScheduleService } from './social-schedule.service';
import { GroupBotService } from './group-bot.service'; 

@Controller('social')
export class SocialController {
  constructor(
    private readonly facebookService: FacebookService,
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly aiService: AiContentService,
    private readonly paymentService: PaymentService,
    private readonly automatorService: AutomatorService,
    private readonly socialScheduleService: SocialScheduleService,
    private readonly groupBotService: GroupBotService 
  ) {}

  @Post('accounts') 
  async saveAccount(@Body() data: any) { 
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: data.workspaceId },
      include: { _count: { select: { socialAccounts: true } } }
    });
    if (!workspace) throw new HttpException("Không tìm thấy Workspace", HttpStatus.NOT_FOUND);

    const planLimits: Record<string, number> = { 'free': 1, 'PRO': 50, 'GOLD': 100, 'DIAMOND': 500 };
    const currentPlan = workspace.plan || 'free';
    const maxLimit = planLimits[currentPlan] || 1;

    if (workspace._count.socialAccounts >= maxLimit) {
      throw new HttpException(`Hạn mức gói ${currentPlan} đã hết (${maxLimit} Fanpage).`, HttpStatus.FORBIDDEN);
    }
    return this.prisma.socialAccount.create({ data }); 
  }

  @Get('accounts') async getAccounts(@Query('workspaceId') workspaceId: string) { return this.prisma.socialAccount.findMany({ where: { workspaceId } }); }
  @Patch('accounts/:id') async updateAccount(@Param('id') id: string, @Body() data: any) { return this.prisma.socialAccount.update({ where: { id }, data }); }
  @Delete('accounts/:id') async deleteAccount(@Param('id') id: string) { return this.prisma.socialAccount.delete({ where: { id } }); }

  @Post('sync-inbox')
  async syncInbox(@Body() body: { workspaceId: string }) {
    return this.facebookService.syncAllMessages(body.workspaceId);
  }

  @Get('inbox')
  async getInbox(@Query('workspaceId') workspaceId: string) {
    return this.prisma.inboxMessage.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Get('chat-history')
  async getChatHistory(@Query('senderId') senderId: string, @Query('workspaceId') workspaceId: string) {
    return this.prisma.inboxMessage.findMany({
      where: { senderId, workspaceId },
      orderBy: { createdAt: 'asc' }
    });
  }

  @Post('facebook/post-groups')
  async postToGroups(@Body() body: any) {
    const groups = await this.prisma.socialGroup.findMany({ where: { workspaceId: body.workspaceId } });
    const results = [];
    for (const group of groups) {
      try {
        const account = await this.prisma.socialAccount.findFirst({ where: { workspaceId: body.workspaceId, platformId: group.pageId } });
        if (account) {
          const imagesToPost = body.imageUrls || body.imageUrl;
          const res = await this.facebookService.postToPage(group.groupId, account.accessToken, body.message, imagesToPost);
          if (res?.id && body.productUrl) await this.facebookService.commentOnPost(res.id, account.accessToken, `🔗 Link mua sản phẩm: ${body.productUrl}`);
          results.push({ group: group.groupName, status: 'success' });
        }
      } catch (e) { results.push({ group: group.groupName, status: 'failed', error: e.message }); }
    }
    return results;
  }

  @Post('facebook/post') 
  async postFacebook(@Body() body: any) { 
    const imagesToPost = body.imageUrls || body.imageUrl;
    const res = await this.facebookService.postToPage(body.pageId, body.accessToken, body.message, imagesToPost); 
    if (res?.id && body.productUrl) await this.facebookService.commentOnPost(res.id, body.accessToken, `🔗 Link mua sản phẩm tại đây: ${body.productUrl}`);
    return res;
  }

  @Post('schedule')
  async schedulePost(@Body() body: any) {
    return this.prisma.post.create({
      data: { content: body.content, workspaceId: body.workspaceId, productUrl: body.productUrl || null, status: 'scheduled', createdAt: new Date(body.scheduledAt), userId: body.imageUrl || "" }
    });
  }

  @Post('schedule-batch')
  async scheduleBatch(@Body() body: any) {
    try {
      if (!this.socialScheduleService) {
         throw new Error("Lỗi Server: Chưa kết nối SocialScheduleService.");
      }
      return await this.socialScheduleService.handleBatchSchedule(body);
    } catch (error) {
      console.error("[scheduleBatch] Lỗi:", error);
      throw new HttpException(
        error.message || 'Lỗi hệ thống khi lên lịch hàng loạt', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('scheduled-posts') async getScheduledPosts(@Query('workspaceId') workspaceId: string) { return this.prisma.post.findMany({ where: { workspaceId, status: 'scheduled' }, orderBy: { createdAt: 'asc' } }); }

  @Delete('scheduled-posts/:id')
  async deleteScheduledPost(@Param('id') id: string) {
    return this.prisma.post.delete({
      where: { id }
    });
  }

  @Patch('scheduled-posts/:id')
  async updateScheduledPost(@Param('id') id: string, @Body() body: any) {
    return this.prisma.post.update({
      where: { id },
      data: { content: body.content }
    });
  }

  @Post('create-transaction')
  async createTransaction(@Body() body: any) {
    const billCode = `SAASAI${Math.floor(1000 + Math.random() * 8999)}`;
    return this.prisma.transaction.create({ data: { workspaceId: body.workspaceId, planName: body.planName, amount: body.amount, description: billCode, status: 'pending' } });
  }

  @Get('check-transaction/:billCode')
  async checkTransaction(@Param('billCode') billCode: string) {
    return this.prisma.transaction.findFirst({ where: { description: { contains: billCode, mode: 'insensitive' } }, select: { status: true, planName: true } });
  }

  // ==========================================
  // 🚀 API KIỂM TRA MÃ GIẢM GIÁ TỪ FRONTEND
  // ==========================================
  @Post('check-voucher')
  async checkVoucher(@Body('code') code: string) {
    if (!code) {
      return { valid: false, message: 'Vui lòng nhập mã giảm giá' };
    }

    try {
      const voucherRecord = await this.prisma.voucher.findFirst({
        where: {
          code: code.toUpperCase(),
          isActive: true 
        },
      });

      if (voucherRecord) {
        return {
          valid: true,
          discountValue: voucherRecord.discount, 
          discountType: voucherRecord.type 
        };
      }

      return { valid: false, message: 'Mã không tồn tại hoặc đã hết hạn' };
    } catch (error) {
      console.error("Lỗi khi kiểm tra voucher:", error);
      throw new HttpException(
        'Mã không tồn tại hoặc lỗi hệ thống', 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('casso-webhook')
  async handleCassoWebhook(@Body() body: any, @Res() res: Response) {
    const transactions = body.data;
    if (!transactions) return res.status(200).send();
    for (const trans of transactions) {
      const match = trans.description.toUpperCase().match(/SAASAI(\d+)/i);
      if (match) {
        const billCode = match[0];
        const dbTrans = await this.prisma.transaction.findFirst({ where: { description: { contains: billCode, mode: 'insensitive' }, status: 'pending' } });
        if (dbTrans) {
          await this.prisma.transaction.update({ where: { id: dbTrans.id }, data: { status: 'success' } });
          const exp = new Date(); exp.setDate(exp.getDate() + 30);
          await this.prisma.workspace.update({ where: { id: dbTrans.workspaceId }, data: { plan: dbTrans.planName, planExpiry: exp } });
          this.chatGateway.server.emit('paymentSuccess', { billCode: dbTrans.description });
        }
      }
    }
    return res.status(200).json({ error: 0, message: "Done" });
  }

  // ==========================================
  // 🚀 API WEBHOOK DÀNH CHO PAYOS (Đã dọn dẹp)
  // ==========================================
  @Post('payos-webhook')
  async handlePayosWebhook(@Body() body: any, @Res() res: Response) {
    try {
      console.log("🔔 [PayOS Webhook] Bắt đầu nhận dữ liệu");
      
      const payloadData = body.data;

      if (!payloadData) {
         return res.status(200).json({ success: true, message: "Webhook received but no data" });
      }

      let description = "";
      
      if (payloadData.description) {
         description = String(payloadData.description).toUpperCase();
      } else if (payloadData.transactions && payloadData.transactions.length > 0) {
         description = String(payloadData.transactions[0].description).toUpperCase();
      }

      console.log("🔍 [PayOS Webhook] Nội dung chuyển khoản thô nhận được:", description);
      
      const match = description.match(/SAASAI(\d+)/i);
      
      if (match) {
        const billCode = match[0];
        console.log(`✅ [PayOS Webhook] Phát hiện mã đơn hàng: ${billCode}`);
        
        const dbTrans = await this.prisma.transaction.findFirst({ 
          where: { 
             description: { contains: billCode, mode: 'insensitive' }, 
             status: 'pending' 
          } 
        });

        if (dbTrans) {
          console.log(`⏳ [PayOS Webhook] Tiến hành nâng cấp cho Workspace: ${dbTrans.workspaceId}`);
          
          await this.prisma.transaction.update({ 
            where: { id: dbTrans.id }, 
            data: { status: 'success' } 
          });
          
          const exp = new Date(); 
          exp.setDate(exp.getDate() + 30);
          
          await this.prisma.workspace.update({ 
            where: { id: dbTrans.workspaceId }, 
            data: { plan: dbTrans.planName, planExpiry: exp } 
          });
          
          console.log(`🎉 [PayOS Webhook] Hoàn thành nâng cấp! Kích hoạt Socket.io`);
          
          this.chatGateway.server.emit('paymentSuccess', { billCode: dbTrans.description });
        } else {
           console.log(`⚠️ [PayOS Webhook] Không tìm thấy đơn hàng Pending nào mang mã ${billCode}`);
        }
      } else {
         console.log("❌ [PayOS Webhook] Nội dung chuyển khoản KHÔNG chứa mã SAASAI hợp lệ!");
      }
      
      return res.status(200).json({ success: true, message: "Processed successfully" });
      
    } catch (error) {
      console.error("🚨 Lỗi khi xử lý Webhook PayOS:", error);
      return res.status(200).json({ success: true, message: "Error handled gracefully" });
    }
  }

  @Get('webhook')
  verifyWebhook(@Query() query: any, @Res() res: Response) {
    if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === "saas_ai_token_123") {
      return res.status(200).send(query['hub.challenge']); 
    }
    return res.status(403).send('Forbidden');
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    try {
      const entry = body.entry?.[0];
      if (!entry) return 'NO_ENTRY';

      const pageId = entry.id; 
      const messaging = entry.messaging ? entry.messaging[0] : null;
      const changes = entry.changes ? entry.changes[0] : null;

      const account = await this.prisma.socialAccount.findFirst({
        where: { platformId: pageId },
      });

      if (!account) {
        return 'ACCOUNT_NOT_FOUND';
      }

      if (messaging && messaging.message && !messaging.message.is_echo) {
        const senderId = messaging.sender.id;
        const text = messaging.message.text;

        const savedMsg = await this.prisma.inboxMessage.upsert({
          where: { platformId: messaging.message.mid },
          update: { content: text },
          create: { 
            workspaceId: account.workspaceId, 
            platform: 'facebook', 
            type: 'inbox', 
            senderName: "Khách từ Fanpage", 
            senderId, 
            content: text, 
            platformId: messaging.message.mid,
            pageName: account.accountName
          }
        });

        this.chatGateway.sendMessageToUI(savedMsg);

        if (account.isAiAutoReply) {
          await this.automatorService.processIncomingMessage(pageId, senderId, text, 'inbox', messaging.message.mid);
        }
      }

      if (changes && changes.value.item === 'comment' && changes.value.verb === 'add') {
        const commentText = changes.value.message;
        const commentId = changes.value.comment_id;
        const senderId = changes.value.from.id;

        if (senderId !== pageId) {
          await this.prisma.inboxMessage.create({
            data: {
              workspaceId: account.workspaceId,
              platform: 'facebook',
              type: 'comment',
              senderName: changes.value.from.name || "Người dùng FB",
              senderId,
              content: commentText,
              platformId: commentId,
              pageName: account.accountName
            }
          });

          if (account.isAiAutoReply) {
            await this.automatorService.processIncomingMessage(pageId, senderId, commentText, 'comment', commentId);
          }
        }
      }

    } catch (e) { 
      console.log("⚠️ Webhook Error:", e.message); 
    }
    return 'EVENT_RECEIVED';
  }

  @Post('extract-info')
  async extractInfo(@Body() body: { text: string }) {
    const { text } = body;
    const phone = text.match(/(0|\+84|84)?([3|5|7|8|9][0-9]{8})\b/)?.[0] || "";
    const addressKeywords = ["số", "ngõ", "ngách", "đường", "phố", "phường", "xã", "quận", "huyện", "tỉnh", "thành phố"];
    let address = text.split(/[\n,.]/).find(line => addressKeywords.some(key => line.toLowerCase().includes(key))) || "";
    return { phone, address, name: "Chưa rõ" };
  }

  @Post('ai-suggest-reply') async suggestReply(@Body() body: any) { return this.aiService.suggestReply(body.customerMessage, body.workspaceId); }
  @Post('ai-generate-image') async aiImage(@Body() body: { prompt: string }) { return this.aiService.generateImage(body.prompt); }
  @Post('ai-edit-image') async aiEditImage(@Body() body: { imageUrl: string, prompt: string }) { return this.aiService.editImage(body.imageUrl, body.prompt); }

  @Post('comment-reply')
  async commentReply(@Body() body: any) {
    try {
      const account = await this.prisma.socialAccount.findFirst({ 
        where: { workspaceId: body.workspaceId, accountName: body.pageName } 
      });
      if (!account) throw new Error("Không tìm thấy Fanpage");
      
      const fbRes = await this.facebookService.replyToComment(body.commentId, account.accessToken, body.text);
      
      return fbRes;
    } catch (e) { 
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST); 
    }
  }

  @Post('reply') 
  async sendReply(@Body() body: any) { 
    try {
      const account = await this.prisma.socialAccount.findFirst({ where: { workspaceId: body.workspaceId, accountName: body.pageName } });
      if (!account) throw new Error("Không tìm thấy Fanpage");
      let fbRes = body.type === 'comment' 
        ? await this.facebookService.replyToComment(body.platformId, account.accessToken, body.text)
        : await this.facebookService.sendReply(account.platformId, account.accessToken, body.senderId, body.text);
      
      await this.prisma.inboxMessage.create({ 
          data: { workspaceId: body.workspaceId, platform: 'facebook', type: 'outbound', senderName: 'Bạn (Admin)', senderId: body.senderId, content: body.text, pageName: body.pageName, platformId: `out_${Date.now()}` } 
        });
      return fbRes;
    } catch (e) { throw new HttpException(e.message, HttpStatus.BAD_REQUEST); }
  }

  @Get('groups')
  async getGroupsByPage(@Query('pageId') pageId: string) {
    if (!pageId) return [];
    
    return this.prisma.socialGroup.findMany({
      where: { pageId: pageId }
    });
  }

  @Post('bot/join-groups')
  async botJoinGroups(@Body() body: { cookie: string, groupUrls: string[], pageIds: string[] }) {
    if (!body.cookie || !body.groupUrls || body.groupUrls.length === 0) {
      throw new HttpException("Thiếu Cookie hoặc danh sách nhóm", HttpStatus.BAD_REQUEST);
    }
    
    const result = await this.groupBotService.joinGroups(body.cookie, body.groupUrls, body.pageIds);
    return result; 
  }

  // ==========================================
  // 🚀 TÍNH NĂNG ĐĂNG NHẬP FACEBOOK LẤY PAGE TỰ ĐỘNG
  // ==========================================

  @Get('auth/facebook')
  async facebookLogin(@Query('workspaceId') workspaceId: string, @Res() res: Response) {
    const appId = process.env.FACEBOOK_APP_ID;
    const redirectUri = `${process.env.BACKEND_URL}/social/auth/facebook/callback`;
    const state = JSON.stringify({ workspaceId });
    const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_messaging';
    const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}`;
    return res.redirect(fbAuthUrl);
  }

  @Get('auth/facebook/callback')
  async facebookCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    try {
      if (!code) throw new Error("Khách hàng từ chối cấp quyền.");
      
      const { workspaceId } = JSON.parse(state);
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      const redirectUri = `${process.env.BACKEND_URL}/social/auth/facebook/callback`;

      const tokenRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`);
      const shortLivedToken = tokenRes.data.access_token;

      const longLivedRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`);
      const longLivedToken = longLivedRes.data.access_token;

      const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`);
      const pages = pagesRes.data.data;

      for (const page of pages) {
        const existingPage = await this.prisma.socialAccount.findFirst({
          where: { platformId: page.id, workspaceId: workspaceId }
        });

        if (existingPage) {
          await this.prisma.socialAccount.update({
            where: { id: existingPage.id },
            data: { accessToken: page.access_token, accountName: page.name }
          });
        } else {
          await this.prisma.socialAccount.create({
            data: {
              workspaceId,
              platformId: page.id,
              accountName: page.name,
              accessToken: page.access_token,
              platform: 'facebook',
              isAiAutoReply: false 
            }
          });
        }
      }
      
      return res.redirect(`${process.env.FRONTEND_URL}/social?success=true`);
    } catch (error) {
      console.error("Lỗi đăng nhập FB:", error.response?.data || error.message);
      return res.redirect(`${process.env.FRONTEND_URL}/social?error=true`);
    }
  }
}