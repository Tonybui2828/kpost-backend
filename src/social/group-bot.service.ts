import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';

@Injectable()
export class GroupBotService {
  private readonly logger = new Logger(GroupBotService.name);

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
        '--disable-gpu', // 🚀 Tắt tính năng card màn hình vì server Linux không có
        '--disable-dev-shm-usage' // 🚀 Chống crash văng Bot khi Server bị đầy RAM chia sẻ
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
  // TÍNH NĂNG 1: TỰ ĐỘNG THAM GIA NHÓM
  // ==========================================
  async joinGroups(cookieString: string, groupUrls: string[], pageIds: string[] = []) {
    const { browser, page } = await this.initBrowser(cookieString);
    
    // BIẾN ĐẾM VÀ LƯU LOG CHO FRONTEND
    let successCount = 0;
    let failCount = 0;
    const logs = [];

    // Nếu người dùng không chọn page nào, gán mặc định là tham gia bằng Profile Cá nhân
    const targetPages = pageIds.length > 0 ? pageIds : ['Profile Cá Nhân'];

    try {
      // 1. Lặp qua từng Fanpage được chọn
      for (const pageId of targetPages) {
        
        // 2. Lặp qua từng nhóm
        for (const url of groupUrls) {
          this.logger.log(`👉 Bot đang truy cập nhóm: ${url} (Tư cách ID: ${pageId})`);
          
          try {
            await page.goto(url, { waitUntil: 'networkidle2' });
            
            // Nghỉ ngơi 3-5s như người thật đang đọc trang web
            await this.delay(3000, 5000);

            // Tìm nút "Tham gia nhóm" hoặc "Join Group"
            const joinButton = await page.$('div[aria-label="Tham gia nhóm"], div[aria-label="Join Group"]');
            
            if (joinButton) {
              await joinButton.click();
              this.logger.log(`✅ Đã ấn Tham gia nhóm: ${url}`);
              
              /* 
                ⚠️ LƯU Ý CHO DEV BACKEND: 
                Khi bấm tham gia, Facebook có thể hiện Popup hỏi "Tham gia với tư cách nào" (Profile hay Fanpage).
                Nếu bạn cần bot chọn đúng Page, bạn sẽ cần code thêm logic Puppeteer click vào popup đó dựa trên pageId ở đây.
              */

              successCount++;
              logs.push({
                pageName: pageId, 
                groupId: url,
                status: 'success', // Chữ 'success' để Frontend hiện icon màu Xanh
                message: 'Đã gửi yêu cầu tham gia thành công'
              });

            } else {
              this.logger.warn(`⚠️ Không tìm thấy nút tham gia. Có thể đã tham gia rồi hoặc nhóm ẩn.`);
              failCount++;
              logs.push({
                pageName: pageId, 
                groupId: url,
                status: 'error', // Chữ 'error' để Frontend hiện icon màu Đỏ
                message: 'Đã tham gia hoặc chờ duyệt / Lỗi nút'
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

          // 🕒 THUẬT TOÁN CHỐNG CHECKPOINT: Nghỉ ngơi từ 10 đến 25 giây trước khi sang nhóm tiếp theo
          this.logger.log(`⏳ Đang nghỉ ngơi giải lao chờ nhóm tiếp theo...`);
          await this.delay(10000, 25000); 
        }
      }
    } catch (error) {
      this.logger.error(`❌ Lỗi nghiêm trọng của Bot: ${error.message}`);
    } finally {
      // Xong việc phải đóng trình duyệt để giải phóng RAM cho Server
      await browser.close();
      this.logger.log('🛑 Đã đóng Bot Trình duyệt.');
    }

    // 🚀 TRẢ VỀ ĐÚNG FORMAT MÀ GIAO DIỆN (FRONTEND) ĐANG ĐỢI
    return {
      success: successCount,
      fail: failCount,
      logs: logs
    };
  }
}