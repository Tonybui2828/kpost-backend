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
      headless: true, // true = chạy ẩn không hiện giao diện, false = hiện giao diện (chỉ dùng khi test ở máy cá nhân)
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-notifications']
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
  async joinGroups(cookieString: string, groupUrls: string[]) {
    const { browser, page } = await this.initBrowser(cookieString);
    const results = [];

    try {
      for (const url of groupUrls) {
        this.logger.log(`👉 Bot đang truy cập nhóm: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        // Nghỉ ngơi 3-5s như người thật đang đọc trang web
        await this.delay(3000, 5000);

        try {
          // Tìm nút "Tham gia nhóm" hoặc "Join Group"
          const joinButton = await page.$('div[aria-label="Tham gia nhóm"], div[aria-label="Join Group"]');
          
          if (joinButton) {
            await joinButton.click();
            this.logger.log(`✅ Đã ấn Tham gia nhóm: ${url}`);
            results.push({ url, status: 'success', message: 'Đã gửi yêu cầu tham gia' });
          } else {
            this.logger.warn(`⚠️ Không tìm thấy nút tham gia. Có thể đã tham gia rồi hoặc link sai.`);
            results.push({ url, status: 'skipped', message: 'Đã tham gia hoặc không thấy nút' });
          }
        } catch (err) {
          results.push({ url, status: 'failed', message: 'Lỗi khi click' });
        }

        // 🕒 THUẬT TOÁN CHỐNG CHECKPOINT: Nghỉ ngơi từ 10 đến 25 giây trước khi sang nhóm tiếp theo
        const waitTime = await this.delay(10000, 25000); 
        this.logger.log(`⏳ Đang nghỉ ngơi giải lao chờ nhóm tiếp theo...`);
      }
    } catch (error) {
      this.logger.error(`❌ Lỗi nghiêm trọng của Bot: ${error.message}`);
    } finally {
      // Xong việc phải đóng trình duyệt để giải phóng RAM cho Server
      await browser.close();
      this.logger.log('🛑 Đã đóng Bot Trình duyệt.');
    }

    return results;
  }
}