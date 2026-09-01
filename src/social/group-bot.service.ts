import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import { PrismaService } from '../prisma.service'; // 🚀 Nhúng Prisma để lưu DB

@Injectable()
export class GroupBotService {
  private readonly logger = new Logger(GroupBotService.name);

  // 🚀 Bổ sung PrismaService vào Constructor
  constructor(private readonly prisma: PrismaService) {}

  // 🕒 Hàm mô phỏng độ trễ của người thật (Chống Spam)
  private async delay(min: number, max: number) {
    const time = Math.floor(Math.random() * (max - min + 1) + min);
    return new Promise(resolve => setTimeout(resolve, time));
  }

  // 🚀 Khởi động trình duyệt ẩn và cắm Cookie
  async initBrowser(cookieString: string): Promise<{ browser: Browser, page: Page }> {
    this.logger.log('🚀 Khởi động Bot Trình duyệt ẩn...');
    const browser = await puppeteer.launch({
      headless: true, // true = chạy ẩn, false = hiện giao diện
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-notifications',
        '--disable-gpu', 
        '--disable-dev-shm-usage' 
      ]
    });
    
    const page = await browser.newPage();
    
    // Cài đặt thiết bị như một máy tính Windows bình thường
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Chuyển Cookie từ chuỗi string sang định dạng của Bot
    if (cookieString) {
      const cookies = cookieString.split(';').map(c => {
        const [name, ...rest] = c.trim().split('=');
        return { name, value: rest.join('='), domain: '.facebook.com' };
      });
      await page.setCookie(...cookies);
    }

    return { browser, page };
  }

  // ==========================================
  // TÍNH NĂNG 1: TỰ ĐỘNG THAM GIA & QUÉT NHÓM
  // ==========================================
  async joinGroups(cookieString: string, groupUrls: string[], pageIds: string[] = []) {
    const { browser, page } = await this.initBrowser(cookieString);
    
    // BIẾN ĐẾM VÀ LƯU LOG CHO FRONTEND
    let successCount = 0;
    let failCount = 0;
    const logs = [];

    // Lấy WorkspaceId (Tạm thời tìm từ bảng account dựa trên pageId đầu tiên để lưu DB)
    let currentWorkspaceId = "workspace-01";
    if (pageIds.length > 0) {
       const acc = await this.prisma.socialAccount.findFirst({ where: { platformId: pageIds[0] } });
       if (acc) currentWorkspaceId = acc.workspaceId;
    }

    const targetPages = pageIds.length > 0 ? pageIds : ['Profile Cá Nhân'];

    try {
      // 1. Lặp qua từng Fanpage được chọn
      for (const pageId of targetPages) {
        
        // 2. Lặp qua từng nhóm
        for (const url of groupUrls) {
          
          // Bỏ qua nếu URL bị dán dính chữ, không hợp lệ
          if (!url.includes('facebook.com')) {
              failCount++;
              logs.push({ pageName: pageId, groupId: url, status: 'error', message: 'URL không hợp lệ' });
              continue;
          }

          this.logger.log(`👉 Bot đang truy cập nhóm: ${url} (Tư cách ID: ${pageId})`);
          
          try {
            await page.goto(url, { waitUntil: 'networkidle2' });
            
            // Nghỉ ngơi 3-5s như người thật đang đọc trang web
            await this.delay(3000, 5000);

            // Lấy tiêu đề trang web, ví dụ: "Cộng đồng KPost Việt Nam | Facebook"
            const pageTitle = await page.title();
            this.logger.log(`🏷️ Tiêu đề trang Bot đang thấy: "${pageTitle}"`);
            
            // Tách lấy tên nhóm sạch (Bỏ chữ " | Facebook")
            let groupName = pageTitle.replace(' | Facebook', '').trim();
            // Nếu tiêu đề bị dính notification ví dụ "(1) Cộng đồng KPost" thì cắt bỏ (1)
            groupName = groupName.replace(/^\(\d+\)\s*/, ''); 
            
            // Lấy Group ID (Chuỗi số) từ URL để lưu vào DB (Thường URL là /groups/123456789)
            let groupIdNumber = url.match(/\/groups\/(\d+)/)?.[1] || `grp_${Date.now()}`;

            // Kiểm tra xem Cookie có bị chết văng ra ngoài không
            if (pageTitle.toLowerCase().includes('log in') || pageTitle.toLowerCase().includes('đăng nhập')) {
               this.logger.error(`❌ COOKIE ĐÃ CHẾT! Bot bị đá văng ra màn hình Đăng Nhập.`);
               failCount++;
               logs.push({ pageName: pageId, groupId: url, status: 'error', message: 'Cookie lỗi/Bị văng đăng nhập' });
               continue; 
            }

            // 🚀 BƯỚC 1: TÌM XEM ĐÃ THAM GIA CHƯA (Quét các nút: Đã tham gia, Mời, Joined)
            const alreadyJoinedButton = await page.$('[aria-label="Đã tham gia"], [aria-label="Joined"], [aria-label="Mời"], [aria-label="Invite"]');
            
            if (alreadyJoinedButton) {
                this.logger.log(`✅ Tuyệt! Page này đã nằm trong nhóm "${groupName}" từ trước.`);
                
                // Lưu/Update thẳng vào Database để Web hiển thị
                await this.prisma.socialGroup.upsert({
                  where: { groupId_pageId: { groupId: groupIdNumber, pageId: pageId } },
                  update: { groupName: groupName },
                  create: {
                    workspaceId: currentWorkspaceId,
                    pageId: pageId,
                    groupId: groupIdNumber,
                    groupName: groupName,
                    platform: 'facebook'
                  }
                });

                successCount++;
                logs.push({
                  pageName: pageId, 
                  groupId: url,
                  status: 'success', 
                  message: `Thành công: Đã có sẵn trong nhóm [${groupName}]`
                });
                continue; // Chuyển sang URL tiếp theo luôn, không cần quét nút Tham Gia nữa
            }

            // 🚀 BƯỚC 2: NẾU CHƯA, TÌM NÚT THAM GIA VÀ CLICK
            const joinButton = await page.$('[aria-label="Tham gia nhóm"], [aria-label="Join Group"], [aria-label="Tham gia"], [aria-label="Join"]');
            
            if (joinButton) {
              await joinButton.click();
              this.logger.log(`✅ Đã ấn gửi yêu cầu Tham gia nhóm: ${groupName}`);
              
              // Cứ lưu sẵn vào DB. Khi nào Admin Group duyệt thì tính sau
              await this.prisma.socialGroup.upsert({
                where: { groupId_pageId: { groupId: groupIdNumber, pageId: pageId } },
                update: { groupName: groupName },
                create: {
                  workspaceId: currentWorkspaceId,
                  pageId: pageId,
                  groupId: groupIdNumber,
                  groupName: groupName,
                  platform: 'facebook'
                }
              });

              successCount++;
              logs.push({
                pageName: pageId, 
                groupId: url,
                status: 'success',
                message: `Đã gửi yêu cầu tham gia [${groupName}] thành công`
              });

            } else {
              // Đến đây mà không thấy nút gì hết, tức là nhóm bị riêng tư/ẩn cmnr
              this.logger.warn(`⚠️ Không tìm thấy nút tham gia. Nhóm có thể bị ẩn.`);
              failCount++;
              logs.push({
                pageName: pageId, 
                groupId: url,
                status: 'error',
                message: 'Nhóm ẩn hoặc sai định dạng'
              });
            }
          } catch (err) {
            this.logger.error(`❌ Lỗi thao tác click nhóm ${url}`);
            failCount++;
            logs.push({
              pageName: pageId, 
              groupId: url,
              status: 'error',
              message: 'Lỗi trình duyệt khi thao tác'
            });
          }

          // 🕒 THUẬT TOÁN CHỐNG CHECKPOINT
          this.logger.log(`⏳ Đang nghỉ ngơi giải lao chờ nhóm tiếp theo...`);
          await this.delay(5000, 15000); // Rút ngắn thời gian nghỉ một tí cho quét nhanh
        }
      }
    } catch (error) {
      this.logger.error(`❌ Lỗi nghiêm trọng của Bot: ${error.message}`);
    } finally {
      await browser.close();
      this.logger.log('🛑 Đã đóng Bot Trình duyệt.');
    }

    return {
      success: successCount,
      fail: failCount,
      logs: logs
    };
  }
}