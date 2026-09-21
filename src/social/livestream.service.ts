import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import * as fs from 'fs';

interface ActiveStream {
  process: ChildProcess;
  pageId: string;
  liveVideoId: string;
  pageName: string;
  startTime: Date;
}

@Injectable()
export class LiveStreamService {
  private readonly logger = new Logger(LiveStreamService.name);
  private activeStreams: Map<string, ActiveStream[]> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. BẮT ĐẦU PHÁT LIVE HÀNG LOẠT LÊN CÁC FANPAGE
   */
  async startMultiLive(body: {
    workspaceId: string;
    videoUrl: string;
    title: string;
    description: string;
    pageIds: string[];
    loop?: boolean;
  }) {
    const { workspaceId, videoUrl, title, description, pageIds, loop = true } = body;

    this.logger.log(`📥 [LIVESTREAM REQUEST] workspaceId: ${workspaceId}, PageIds: ${JSON.stringify(pageIds)}`);

    if (!pageIds || pageIds.length === 0) {
      throw new HttpException('Vui lòng chọn ít nhất 1 Fanpage để phát Live', HttpStatus.BAD_REQUEST);
    }

    if (!videoUrl) {
      throw new HttpException('Vui lòng cung cấp video MP4 để phát Livestream', HttpStatus.BAD_REQUEST);
    }

    // 1. LẤY TẤT CẢ TÀI KHOẢN FANPAGE ĐÃ CHỌN
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        workspaceId,
        platformId: { in: pageIds }
      }
    });

    this.logger.log(`🔍 Tìm thấy ${accounts.length} Fanpage hợp lệ trong Database`);

    if (accounts.length === 0) {
      throw new HttpException('Không tìm thấy Fanpage nào thuộc workspace này', HttpStatus.NOT_FOUND);
    }

    // 2. XỬ LÝ FILE VIDEO CỤC BỘ (TẢI VỀ NẾU LÀ LINK ONLINE ĐỂ TRÁNH LỖI MẠNG)
    let localVideoPath = videoUrl;
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (videoUrl.includes('/uploads/')) {
      const fileName = videoUrl.split('/uploads/')[1];
      localVideoPath = join(uploadsDir, fileName);
    }

    // Nếu là link http từ xa thì tải nhanh về file temp để FFmpeg đọc nội bộ
    if (videoUrl.startsWith('http') && !fs.existsSync(localVideoPath)) {
      try {
        this.logger.log(`⏳ Đang nạp video nguồn từ URL: ${videoUrl}`);
        const tempName = `stream-temp-${Date.now()}.mp4`;
        const tempPath = join(uploadsDir, tempName);
        const response = await axios({
          method: 'GET',
          url: videoUrl,
          responseType: 'stream'
        });
        const writer = fs.createWriteStream(tempPath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on('finish', () => resolve(true));
          writer.on('error', (err) => reject(err));
        });
        localVideoPath = tempPath;
        this.logger.log(`✅ Đã lưu file video nguồn tạm thời: ${localVideoPath}`);
      } catch (dlErr: any) {
        this.logger.error(`🚨 Không thể nạp video từ URL:`, dlErr.message);
        // Fallback dùng trực tiếp videoUrl nếu không lưu được
        localVideoPath = videoUrl;
      }
    }

    const currentActive = this.activeStreams.get(workspaceId) || [];
    const results = [];

    // 3. DUYỆT TỪNG FANPAGE VÀ PHÁT SÓNG
    for (const acc of accounts) {
      try {
        this.logger.log(`🎬 [1/3] Đang gọi Facebook API tạo Live trên: ${acc.accountName} (${acc.platformId})`);

        // A. Tạo phiên Live Video trên Facebook Graph API v21.0
        const fbRes = await axios.post(
          `https://graph.facebook.com/v21.0/${acc.platformId}/live_videos`,
          {
            title: title || 'Livestream cùng Trợ lý AI',
            description: description || '',
            status: 'LIVE_NOW' // Trực tiếp Live ngay khi có luồng
          },
          {
            headers: { Authorization: `Bearer ${acc.accessToken}` }
          }
        );

        const liveVideoId = fbRes.data?.id;
        // Ưu tiên RTMPS bảo mật của Facebook
        const streamUrl = fbRes.data?.secure_stream_url || fbRes.data?.stream_url;

        this.logger.log(`✅ [FB RESPONSE] LiveVideoId: ${liveVideoId}, StreamURL: ${streamUrl ? 'CÓ RTMP' : 'KHÔNG CÓ'}`);

        if (!streamUrl) {
          throw new Error('Facebook không trả về RTMP URL');
        }

        // B. Cấu hình lệnh FFmpeg chuẩn cho Facebook Live
        const ffmpegArgs = [
          '-re',
          ...(loop ? ['-stream_loop', '-1'] : []),
          '-i', localVideoPath,
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-b:v', '2500k',
          '-maxrate', '3000k',
          '-bufsize', '6000k',
          '-pix_fmt', 'yuv420p',
          '-g', '60',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ar', '44100',
          '-flvflags', 'no_duration_filesize',
          '-f', 'flv',
          streamUrl
        ];

        this.logger.log(`🚀 [2/3] Bắt đầu khởi chạy tiến trình FFmpeg cho: ${acc.accountName}`);

        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

        // BẮT LỖI QUAN TRỌNG: Kiểm tra xem hệ thống có cài FFmpeg chưa
        ffmpegProcess.on('error', (err: any) => {
          this.logger.error(`🚨 [LỖI NGHIÊM TRỌNG FFMPEG] Trên page ${acc.accountName}:`, err);
          if (err.code === 'ENOENT') {
            this.logger.error(`❌ MÁY CHỦ CHƯA CÀI FFMPEG! Vui lòng cài ffmpeg vào Dockerfile hoặc VPS!`);
          }
        });

        ffmpegProcess.stderr.on('data', (data) => {
          const logStr = data.toString();
          // Log khi có lỗi phát sinh từ FFmpeg
          if (logStr.includes('Error') || logStr.includes('error') || logStr.includes('failed')) {
            this.logger.warn(`[FFmpeg Log ${acc.accountName}]: ${logStr.slice(0, 200)}`);
          }
        });

        ffmpegProcess.on('close', (code) => {
          this.logger.log(`🛑 Luồng FFmpeg của ${acc.accountName} đã kết thúc với mã: ${code}`);
          this.removeStream(workspaceId, acc.platformId);
        });

        const streamInfo: ActiveStream = {
          process: ffmpegProcess,
          pageId: acc.platformId,
          liveVideoId,
          pageName: acc.accountName,
          startTime: new Date()
        };

        currentActive.push(streamInfo);
        results.push({
          pageId: acc.platformId,
          pageName: acc.accountName,
          liveVideoId,
          status: 'streaming'
        });

      } catch (err: any) {
        const errorMsg = err.response?.data?.error?.message || err.message;
        this.logger.error(`🚨 Thất bại khi tạo Live trên ${acc.accountName}:`, errorMsg);
        results.push({
          pageId: acc.platformId,
          pageName: acc.accountName,
          status: 'failed',
          error: errorMsg
        });
      }
    }

    this.activeStreams.set(workspaceId, currentActive);

    const successful = results.filter(r => r.status === 'streaming');
    if (successful.length === 0) {
      throw new HttpException({
        message: 'Không thể phát Live trên bất kỳ Fanpage nào',
        details: results
      }, HttpStatus.BAD_REQUEST);
    }

    return {
      success: true,
      message: `Đã kích hoạt phát Live thành công trên ${successful.length}/${accounts.length} Fanpage!`,
      details: results
    };
  }

  /**
   * 2. DỪNG LIVE TOÀN BỘ HOẶC DỪNG TRÊN TỪNG FANPAGE
   */
  async stopLive(workspaceId: string, pageId?: string) {
    const streams = this.activeStreams.get(workspaceId) || [];
    let stoppedCount = 0;

    for (const stream of streams) {
      if (!pageId || stream.pageId === pageId) {
        try {
          stream.process.kill('SIGTERM');

          const account = await this.prisma.socialAccount.findFirst({
            where: { workspaceId, platformId: stream.pageId }
          });

          if (account) {
            await axios.post(
              `https://graph.facebook.com/v21.0/${stream.liveVideoId}`,
              { end_live_video: true },
              { headers: { Authorization: `Bearer ${account.accessToken}` } }
            ).catch(() => {});
          }

          stoppedCount++;
        } catch (e: any) {
          this.logger.error(`Lỗi khi tắt luồng ${stream.pageName}:`, e.message);
        }
      }
    }

    if (pageId) {
      this.activeStreams.set(workspaceId, streams.filter(s => s.pageId !== pageId));
    } else {
      this.activeStreams.delete(workspaceId);
    }

    return {
      success: true,
      message: `Đã kết thúc ${stoppedCount} phiên Livestream`
    };
  }

  /**
   * 3. LẤY DANH SÁCH CÁC LUỒNG ĐANG PHÁT CỦA KHÁCH
   */
  getActiveStreams(workspaceId: string) {
    const streams = this.activeStreams.get(workspaceId) || [];
    return streams.map(s => ({
      pageId: s.pageId,
      pageName: s.pageName,
      liveVideoId: s.liveVideoId,
      startTime: s.startTime
    }));
  }

  private removeStream(workspaceId: string, pageId: string) {
    const streams = this.activeStreams.get(workspaceId) || [];
    this.activeStreams.set(workspaceId, streams.filter(s => s.pageId !== pageId));
  }
}