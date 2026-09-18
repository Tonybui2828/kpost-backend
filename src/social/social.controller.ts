import { Controller, Post, Body, Get, Query, Delete, Param, Patch, Res, Req, HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express'; 
import { extname, join } from 'path';
import * as fs from 'fs';
import axios from 'axios'; 
import * as jwt from 'jsonwebtoken';
import { FacebookService } from './facebook.service';
import { PrismaService } from '../prisma.service';
import { ChatGateway } from './chat.gateway';
import { AiContentService } from '../ai-content/ai-content.service';
import { PaymentService } from '../products/payment.service';
import { AutomatorService } from './automator.service';
import { SocialScheduleService } from './social-schedule.service';
import { GroupBotService } from './group-bot.service'; 
import { EmailService } from '../email/email.service';

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
    private readonly groupBotService: GroupBotService,
    private readonly emailService: EmailService
  ) {}

  // ===============================================
  // API LƯU MEDIA TỪ MÁY TÍNH QUA BASE64 (CHỐNG LỖI MULTIPART 100%)
  // ===============================================
  @Post('upload')
  async uploadMedia(@Body() body: { files: { name: string, base64: string }[] }, @Req() req: any) {
    const files = body.files;
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new HttpException('Vui lòng chọn ít nhất 1 file ảnh', HttpStatus.BAD_REQUEST);
    }

    const uploadPath = './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host');
    const baseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;

    const urls: string[] = [];

    for (const file of files) {
      try {
        if (!file.base64) continue;

        // Tách phần dữ liệu Base64
        const matches = file.base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let buffer: Buffer;
        let ext = '.jpg';

        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
          if (mimeType.includes('png')) ext = '.png';
          else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
          else if (mimeType.includes('webp')) ext = '.webp';
          else if (mimeType.includes('gif')) ext = '.gif';
          else if (mimeType.includes('mp4')) ext = '.mp4';
        } else {
          buffer = Buffer.from(file.base64, 'base64');
        }

        const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const filePath = join(uploadPath, fileName);

        fs.writeFileSync(filePath, buffer);
        urls.push(`${baseUrl}/uploads/${fileName}`);
      } catch (err: any) {
        console.error('Lỗi ghi file ảnh:', err);
      }
    }

    if (urls.length === 0) {
      throw new HttpException('Không thể lưu file ảnh', HttpStatus.BAD_REQUEST);
    }

    return {
      success: true,
      message: `Đã tải lên thành công ${urls.length} file ảnh`,
      urls
    };
  }

  // ===============================================
  // CỤM API RÚT TIỀN AFFILIATE 
  // ===============================================

  // 1. API: Lấy thông tin ngân hàng & Tính số dư thực tế
  @Get('affiliate/bank-info')
  async getBankInfo(@Query('workspaceId') workspaceId: string) {
      const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
      
      const withdrawals = await this.prisma.withdrawalRequest.findMany({
          where: { workspaceId, status: { in: ['pending', 'completed'] } }
      });
      const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
      
      const availableBalance = (ws?.commission || 0) - totalWithdrawn;

      return {
          bankName: ws?.bankName || "",
          bankAccount: ws?.bankAccount || "",
          bankOwnerName: ws?.bankOwnerName || "",
          availableBalance: availableBalance > 0 ? availableBalance : 0
      };
  }

  // 2. API: Cập nhật thông tin tài khoản ngân hàng
  @Post('affiliate/bank-info')
  async updateBankInfo(@Body() body: any) {
      const { workspaceId, bankName, bankAccount, bankOwnerName } = body;
      await this.prisma.workspace.update({
          where: { id: workspaceId },
          data: { bankName, bankAccount, bankOwnerName }
      });
      return { success: true };
  }

  // 3. API: Gửi yêu cầu rút tiền
  @Post('affiliate/withdraw')
  async requestWithdraw(@Body() body: any) {
      const { workspaceId, amount } = body;
      const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!ws) throw new HttpException("Không tìm thấy Workspace", HttpStatus.BAD_REQUEST);

      const withdrawals = await this.prisma.withdrawalRequest.findMany({
          where: { workspaceId, status: { in: ['pending', 'completed'] } }
      });
      const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
      const availableBalance = (ws.commission || 0) - totalWithdrawn;

      if (amount < 500000) throw new HttpException("Số tiền rút tối thiểu là 500.000đ", HttpStatus.BAD_REQUEST);
      if (amount > availableBalance) throw new HttpException("Số dư khả dụng không đủ!", HttpStatus.BAD_REQUEST);
      if (!ws.bankName || !ws.bankAccount || !ws.bankOwnerName) throw new HttpException("Vui lòng cập nhật ngân hàng", HttpStatus.BAD_REQUEST);

      await this.prisma.withdrawalRequest.create({
          data: {
              workspaceId,
              amount,
              bankName: ws.bankName,
              bankAccount: ws.bankAccount,
              bankOwnerName: ws.bankOwnerName
          }
      });

      try {
          await this.emailService.sendEmail(
              'support@kpost.vn', 
              `[KPOST] Yêu cầu rút tiền Affiliate: ${amount.toLocaleString()}đ`,
              `Có yêu cầu rút hoa hồng mới từ hệ thống:
              - Mã không gian (Workspace ID): ${workspaceId}
              - Số tiền rút: ${amount.toLocaleString()} VNĐ
              - Ngân hàng: ${ws.bankName}
              - Số tài khoản: ${ws.bankAccount}
              - Chủ tài khoản: ${ws.bankOwnerName}`
          );
      } catch (err) {
          console.error("Lỗi gửi mail admin:", err.message);
      }

      return { success: true, message: "Đã tạo lệnh rút tiền!" };
  }
  
  // ===============================================

  @Get('affiliate/stats')
  async getAffiliateStats(@Query('workspaceId') workspaceId: string) {
    if (!workspaceId) return { clicks: 0, signups: 0, orders: 0, revenue: 0 };
    try {
      const ws = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!ws) return { clicks: 0, signups: 0, orders: 0, revenue: 0 };
      
      return {
        clicks: ws.totalSignups * 3,
        signups: ws.totalSignups,
        orders: ws.totalOrders,
        revenue: ws.commission
      };
    } catch (e) {
      return { clicks: 0, signups: 0, orders: 0, revenue: 0 };
    }
  }

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

    if (data.isUserToken) {
       try {
         const axios = require('axios');
         const response = await axios.get(`https://graph.facebook.com/v21.0/me/accounts?access_token=${data.accessToken}`);
         const pages = response.data.data || [];
         
         if (pages.length === 0) {
           throw new HttpException("Tài khoản này không quản lý Fanpage nào.", HttpStatus.BAD_REQUEST);
         }

         let addedCount = 0;
         for (const page of pages) {
            const currentCount = await this.prisma.socialAccount.count({ where: { workspaceId: data.workspaceId } });
            if (currentCount >= maxLimit) break;

            const existing = await this.prisma.socialAccount.findFirst({
              where: { platformId: page.id }
            });

            if (existing) {
               await this.prisma.socialAccount.update({
                  where: { id: existing.id },
                  data: {
                    workspaceId: data.workspaceId,
                    accessToken: page.access_token,
                    accountName: page.name,
                    isAiAutoReply: false
                  }
               });
            } else {
               await this.prisma.socialAccount.create({
                  data: {
                    workspaceId: data.workspaceId,
                    platform: 'facebook',
                    platformId: page.id,
                    accountName: page.name,
                    accessToken: page.access_token,
                    isAiAutoReply: false,
                    aiTone: 'friendly'
                  }
               });
               addedCount++;
            }
         }
         return { message: `Đã kết nối thành công ${addedCount} Fanpage!` };
       } catch (error: any) {
         throw new HttpException(error.response?.data?.error?.message || "Lỗi khi quét Fanpage từ User Token", HttpStatus.BAD_REQUEST);
       }
    }

    const existingAccount = await this.prisma.socialAccount.findFirst({
      where: { platformId: data.platformId }
    });
    
    if (existingAccount) {
      if (existingAccount.workspaceId !== data.workspaceId) {
        if (workspace._count.socialAccounts >= maxLimit) {
          throw new HttpException(`Hạn mức gói ${currentPlan} đã hết (${maxLimit} Fanpage).`, HttpStatus.FORBIDDEN);
        }
      }
      return this.prisma.socialAccount.update({
        where: { id: existingAccount.id },
        data: {
          workspaceId: data.workspaceId,
          accessToken: data.accessToken,
          accountName: data.accountName,
          isAiAutoReply: false
        }
      });
    }

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
    const workspace = await this.prisma.workspace.findUnique({
       where: { id: body.workspaceId }
    });

    if (!workspace) {
       throw new HttpException("Không tìm thấy tài khoản.", HttpStatus.NOT_FOUND);
    }

    const plan = workspace.plan?.toUpperCase();
    if (!['PRO', 'GOLD', 'DIAMOND'].includes(plan)) {
      throw new HttpException("Tính năng đồng bộ Hộp thư chỉ dành cho thành viên gói PRO, GOLD và DIAMOND. Vui lòng nâng cấp!", HttpStatus.FORBIDDEN);
    }

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
    const billCode = `SAASAI${Date.now().toString().slice(-6)}`;
    await this.prisma.transaction.create({ 
      data: { 
        workspaceId: body.workspaceId, 
        planName: body.planName, 
        amount: body.amount, 
        description: billCode, 
        status: 'pending' 
      } 
    });
    return { description: billCode };
  }

  @Get('check-transaction/:billCode')
  async checkTransaction(@Param('billCode') billCode: string) {
    return this.prisma.transaction.findFirst({ where: { description: { contains: billCode, mode: 'insensitive' } }, select: { status: true, planName: true } });
  }

  @Post('check-voucher')
  async checkVoucher(@Body('code') code: string) {
    if (!code) {
      return { valid: false, message: 'Vui lòng nhập mã giảm giá' };
    }

    try {
      const voucherRecord = await this.prisma.voucher.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!voucherRecord || !voucherRecord.isActive) {
        return { valid: false, message: 'Mã giảm giá không tồn tại hoặc đã bị khóa' };
      }

      if (voucherRecord.usedCount >= voucherRecord.usageLimit) {
        return { valid: false, message: 'Mã giảm giá đã hết lượt sử dụng' };
      }

      if (voucherRecord.validUntil && new Date() > new Date(voucherRecord.validUntil)) {
        return { valid: false, message: 'Mã giảm giá đã hết hạn' };
      }

      return { 
        valid: true, 
        discountValue: voucherRecord.discount, 
        discountType: voucherRecord.type 
      };
    } catch (error) {
      console.error("Lỗi khi kiểm tra voucher:", error);
      throw new HttpException('Lỗi hệ thống kiểm tra voucher', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('get-vouchers-detail')
  async getVouchersDetail(@Body() body: { codes: string[] }) {
    if (!body.codes || body.codes.length === 0) return [];
    
    try {
      const vouchers = await this.prisma.voucher.findMany({
        where: {
          code: { in: body.codes }
        }
      });

      return vouchers.map(v => ({
        code: v.code,
        discountValue: v.discount,
        discountType: v.type,
        validUntil: v.validUntil 
            ? new Date(v.validUntil).toLocaleDateString('vi-VN') 
            : "Vô thời hạn"
      }));
    } catch (error) {
      throw new HttpException('Lỗi hệ thống tải ví voucher', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('add-voucher-to-wallet')
  async addVoucherToWallet(@Body() body: { code: string, workspaceId: string }, @Req() req: Request) {
    if (!body.code) {
        throw new HttpException('Thiếu dữ liệu', HttpStatus.BAD_REQUEST);
    }
    
    try {
        const code = body.code.toUpperCase().trim();
        
        const voucherRecord = await this.prisma.voucher.findUnique({
            where: { code: code },
        });

        if (!voucherRecord || !voucherRecord.isActive) {
            throw new HttpException('Mã giảm giá không tồn tại hoặc đã bị khóa', HttpStatus.BAD_REQUEST);
        }
        
        if (voucherRecord.usedCount >= voucherRecord.usageLimit) {
            throw new HttpException('Mã giảm giá đã hết lượt sử dụng', HttpStatus.BAD_REQUEST);
        }
        
        if (voucherRecord.validUntil && new Date() > new Date(voucherRecord.validUntil)) {
            throw new HttpException('Mã giảm giá đã hết hạn', HttpStatus.BAD_REQUEST);
        }

        let userIdToSave = null;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decodedToken: any = jwt.decode(token);
                if (decodedToken && (decodedToken.userId || decodedToken.id || decodedToken.sub)) {
                    userIdToSave = decodedToken.userId || decodedToken.id || decodedToken.sub;
                }
            } catch (err) {
                console.error("Không thể giải mã token:", err);
            }
        }

        if (!userIdToSave && body.workspaceId) {
             const directUser = await this.prisma.user.findUnique({ where: { id: body.workspaceId } });
             if (directUser) {
                  userIdToSave = directUser.id;
             } else {
                  const workspace = await this.prisma.workspace.findUnique({ where: { id: body.workspaceId } });
                  if (workspace && workspace.ownerId) {
                      userIdToSave = workspace.ownerId;
                  }
             }
        }

        if (!userIdToSave) {
            throw new HttpException('Không thể xác thực thông tin tài khoản (Token không hợp lệ). Vui lòng đăng xuất và đăng nhập lại.', HttpStatus.NOT_FOUND);
        }

        const user = await this.prisma.user.findUnique({
            where: { id: userIdToSave }
        });

        if (!user) {
            throw new HttpException('Tài khoản không tồn tại trên hệ thống', HttpStatus.NOT_FOUND);
        }

        let currentVouchers: string[] = [];
        const rawVouchers: any = user.vouchers; 
        
        if (rawVouchers) {
            const extractCleanArray = (data: any): any => {
                if (typeof data === 'string') {
                    try {
                        const parsed = JSON.parse(data);
                        return extractCleanArray(parsed);
                    } catch (e) {
                        return data;
                    }
                }
                return data;
            };

            const cleanData = extractCleanArray(rawVouchers);

            if (Array.isArray(cleanData)) {
                currentVouchers = cleanData.map(c => String(c).replace(/[^a-zA-Z0-9]/g, '').trim()).filter(c => c.length > 0);
            } else if (typeof cleanData === 'string' && cleanData.trim().length > 0) {
                currentVouchers = cleanData.split(',').map(c => c.replace(/[^a-zA-Z0-9]/g, '').trim()).filter(c => c.length > 0);
            }
        }
        
        if (currentVouchers.includes(code)) {
            throw new HttpException('Bạn đã lưu mã này vào ví rồi', HttpStatus.BAD_REQUEST);
        }

        currentVouchers.push(code);
        const uniqueVouchers = Array.from(new Set(currentVouchers));
        
        await this.prisma.user.update({
            where: { id: user.id },
            data: { 
                vouchers: uniqueVouchers 
            }
        });

        return { success: true, message: 'Đã thêm mã vào ví', vouchers: uniqueVouchers };

    } catch (error) {
        if (error instanceof HttpException) {
            throw error;
        }
        console.error("Lỗi khi thêm voucher vào ví:", error);
        throw new HttpException('Lỗi hệ thống khi thêm voucher', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('casso-webhook')
  async handleCassoWebhook(@Body() body: any, @Res() res: Response) {
    try {
      console.log("🔔 [Casso Webhook] Nhận dữ liệu:", JSON.stringify(body));
      const transactions = body.data;
      
      if (!transactions || transactions.length === 0) {
        return res.status(200).send();
      }

      for (const trans of transactions) {
        const description = String(trans.description).toUpperCase();
        console.log("🔍 [Casso Webhook] Nội dung CK:", description);

        const match = description.match(/SAASAI\s*(\d+)/i);
        
        if (match) {
          const billCode = `SAASAI${match[1]}`;
          console.log(`✅ [Casso Webhook] Phát hiện mã: ${billCode}`);
          
          const dbTrans = await this.prisma.transaction.findFirst({ 
            where: { description: { contains: billCode, mode: 'insensitive' }, status: 'pending' } 
          });

          if (dbTrans) {
            console.log(`⏳ [Casso Webhook] Cập nhật Workspace: ${dbTrans.workspaceId}`);
            await this.prisma.transaction.update({ where: { id: dbTrans.id }, data: { status: 'success' } });
            
            const exp = new Date(); exp.setDate(exp.getDate() + 30);
            
            const workspaceInfo = await this.prisma.workspace.update({ 
              where: { id: dbTrans.workspaceId }, data: { plan: dbTrans.planName, planExpiry: exp } 
            });
            
            if (workspaceInfo.referredBy) {
               const refId = workspaceInfo.referredBy.replace('KPOST_', '');
               const referrer = await this.prisma.workspace.findUnique({ where: { id: refId } });
               if (referrer) {
                  const comm = dbTrans.amount * 0.10;
                  await this.prisma.workspace.update({
                      where: { id: refId },
                      data: { commission: { increment: comm }, totalOrders: { increment: 1 } }
                  });
                  await this.prisma.affiliateHistory.create({
                      data: { workspaceId: refId, sourceId: dbTrans.id, amount: comm, note: `Hoa hồng từ đơn ${dbTrans.description}` }
                  });
               }
            }
            this.chatGateway.server.emit('paymentSuccess', { billCode: dbTrans.description });
          } else {
             console.log(`⚠️ [Casso Webhook] Không tìm thấy đơn Pending mã ${billCode}`);
          }
        }
      }
      return res.status(200).json({ error: 0, message: "Done" });
    } catch (error) {
      console.error("🚨 [Casso Webhook] Lỗi:", error);
      return res.status(200).json({ error: 0, message: "Error handled" });
    }
  }

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
      
      const match = description.match(/SAASAI\s*(\d+)/i);
      if (match) {
        const billCode = `SAASAI${match[1]}`;
        console.log(`✅ [PayOS Webhook] Phát hiện mã đơn hàng: ${billCode}`);
        
        const dbTrans = await this.prisma.transaction.findFirst({ 
          where: { description: billCode, status: 'pending' } 
        });

        if (dbTrans) {
          console.log(`⏳ [PayOS Webhook] Tiến hành nâng cấp cho Workspace: ${dbTrans.workspaceId}`);
          await this.prisma.transaction.update({ where: { id: dbTrans.id }, data: { status: 'success' } });
          
          const exp = new Date(); exp.setDate(exp.getDate() + 30);
          
          const workspaceInfo = await this.prisma.workspace.update({ 
            where: { id: dbTrans.workspaceId }, data: { plan: dbTrans.planName, planExpiry: exp } 
          });

          if (workspaceInfo.referredBy) {
            const refId = workspaceInfo.referredBy.replace('KPOST_', '');
            const referrer = await this.prisma.workspace.findUnique({ where: { id: refId } });
            if (referrer) {
               const comm = dbTrans.amount * 0.10;
               await this.prisma.workspace.update({
                   where: { id: refId },
                   data: { commission: { increment: comm }, totalOrders: { increment: 1 } }
               });
               await this.prisma.affiliateHistory.create({
                   data: { workspaceId: refId, sourceId: dbTrans.id, amount: comm, note: `Hoa hồng từ đơn ${dbTrans.description}` }
               });
            }
          }
          
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
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const verifyToken = process.env.FB_VERIFY_TOKEN || 'saas_ai_token_123';

    if (mode && token) {
      if (mode === 'subscribe' && token === verifyToken) {
        console.log('✅ Xác minh Webhook Facebook thành công!');
        return res.status(200).send(challenge);
      } else {
        console.log('❌ Xác minh Webhook thất bại: Sai Token!');
        return res.status(403).send('Forbidden');
      }
    }
    return res.status(400).send('Bad Request');
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any, @Res() res: Response) {
    res.status(HttpStatus.OK).send('EVENT_RECEIVED');

    try {
      const entry = body.entry?.[0];
      if (!entry) return;

      const pageId = entry.id; 
      const messaging = entry.messaging ? entry.messaging[0] : null;
      const changes = entry.changes ? entry.changes[0] : null;

      const account = await this.prisma.socialAccount.findFirst({
        where: { platformId: pageId },
      });

      if (!account) return;

      if (messaging && messaging.message && !messaging.message.is_echo) {
        const senderId = messaging.sender.id;
        const text = messaging.message.text;

        if (senderId === pageId || !text) return;

        const isDuplicate = await this.prisma.inboxMessage.findUnique({
          where: { platformId: messaging.message.mid }
        });

        if (!isDuplicate) {
          const savedMsg = await this.prisma.inboxMessage.create({
            data: { 
              workspaceId: account.workspaceId, 
              platform: 'facebook', 
              type: 'inbox', 
              senderName: "Khách hàng", 
              senderId, 
              content: text, 
              platformId: messaging.message.mid,
              pageName: account.accountName
            }
          });

          this.chatGateway.sendMessageToUI(savedMsg);

          if (account.isAiAutoReply) {
            this.automatorService.processIncomingMessage(pageId, senderId, text, 'inbox', messaging.message.mid)
                .catch(err => console.error("Lỗi AI Inbox:", err.message));
          }
        }
      }

      if (changes && changes.value.item === 'comment' && changes.value.verb === 'add') {
        const commentText = changes.value.message;
        const commentId = changes.value.comment_id;
        const senderId = changes.value.from.id;

        const isDuplicateCmt = await this.prisma.inboxMessage.findUnique({
           where: { platformId: commentId }
        });

        if (senderId !== pageId && !isDuplicateCmt && commentText) {
          await this.prisma.inboxMessage.create({
            data: {
              workspaceId: account.workspaceId,
              platform: 'facebook',
              type: 'comment',
              senderName: changes.value.from.name || "Khách hàng",
              senderId,
              content: commentText,
              platformId: commentId,
              pageName: account.accountName
            }
          });

          if (account.isAiAutoReply) {
            this.automatorService.processIncomingMessage(pageId, senderId, commentText, 'comment', commentId)
                .catch(err => console.error("Lỗi AI Comment:", err.message));
          }
        }
      }
    } catch (e) { 
      console.log("⚠️ Webhook Error:", e.message); 
    }
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
        : await this.facebookService.sendReply(account.platformId, account.accessToken, body.senderId, body.text, body.imageUrl);
      
      await this.prisma.inboxMessage.create({ 
          data: { 
             workspaceId: body.workspaceId, 
             platform: 'facebook', 
             type: 'outbound', 
             senderName: 'Bạn (Admin)', 
             senderId: body.senderId, 
             content: body.text, 
             pageName: body.pageName, 
             platformId: `out_${Date.now()}` 
          } 
        });
      return fbRes;
    } catch (e) { throw new HttpException(e.message, HttpStatus.BAD_REQUEST); }
  }

  @Get('groups')
  async getGroupsByPage(@Query('pageId') pageId: string) {
    if (!pageId) return [];
    return this.prisma.socialGroup.findMany({ where: { pageId: pageId } });
  }

  @Post('bot/join-groups')
  async botJoinGroups(@Body() body: { cookie: string, groupUrls: string[], pageIds: string[] }) {
    if (!body.cookie || !body.groupUrls || body.groupUrls.length === 0) {
      throw new HttpException("Thiếu Cookie hoặc danh sách nhóm", HttpStatus.BAD_REQUEST);
    }
    const result = await this.groupBotService.joinGroups(body.cookie, body.groupUrls, body.pageIds);
    return result; 
  }

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