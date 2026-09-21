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
  
  // Lưu trữ các luồng đang chạy theo workspaceId
  private activeStreams: Map<string, ActiveStream[]> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. BẮT ĐẦU PHÁT LIVE HÀNG LOẠT LÊN CÁC FANPAGE
   */
  async startMultiLive(body: {
    workspaceId: string;
    videoUrl: string; // Link file MP4 tải lên hoặc đường dẫn file
    title: string;
    description: string;
    pageIds: string[]; // Danh sách ID các Fanpage muốn Live
    loop?: boolean; // Lặp lại video liên tục hay không
  }) {
    const { workspaceId, videoUrl, title, description, pageIds, loop = true } = body;

    if (!pageIds || pageIds.length === 0) {
      throw new HttpException('Vui lòng chọn ít nhất 1 Fanpage để phát Live', HttpStatus.BAD_REQUEST);
    }

    if (!videoUrl) {
      throw new HttpException('Vui lòng cung cấp video để phát Livestream', HttpStatus.BAD_REQUEST);
    }

    // Lấy danh sách tài khoản Fanpage từ Database
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        workspaceId,
        platformId: { in: pageIds }
      }
    });

    if (accounts.length === 0) {
      throw new HttpException('Không tìm thấy thông tin quyền truy cập của các Fanpage đã chọn', HttpStatus.NOT_FOUND);
    }

    const currentActive = this.activeStreams.get(workspaceId) || [];
    const results = [];

    // Xử lý đường dẫn file video nguồn
    let localVideoPath = videoUrl;
    if (videoUrl.includes('/uploads/')) {
      const fileName = videoUrl.split('/uploads/')[1];
      localVideoPath = join(process.cwd(), 'uploads', fileName);
    }

    // Nếu là đường dẫn cục bộ nhưng file không tồn tại
    if (!videoUrl.startsWith('http') && !fs.existsSync(localVideoPath)) {
      throw new HttpException(`Không tìm thấy file video tại: ${localVideoPath}`, HttpStatus.BAD_REQUEST);
    }

    for (const acc of accounts) {
      try {
        this.logger.log(`🎬 Bắt đầu tạo phiên Live trên Fanpage: ${acc.accountName} (${acc.platformId})`);

        // A. Gọi Facebook Graph API v21.0 tạo phiên Live Video
        const fbRes = await axios.post(
          `https://graph.facebook.com/v21.0/${acc.platformId}/live_videos`,
          {
            title: title || 'Livestream cùng Trợ lý AI',
            description: description || '',
            status: 'LIVE_NOW'
          },
          {
            headers: { Authorization: `Bearer ${acc.accessToken}` }
          }
        );

        const liveVideoId = fbRes.data?.id;
        const streamUrl = fbRes.data?.secure_stream_url || fbRes.data?.stream_url;

        if (!streamUrl) {
          throw new Error('Facebook không trả về RTMP Stream URL');
        }

        this.logger.log(`✅ Lấy được RTMP URL cho ${acc.accountName}. Bắt đầu đẩy luồng bằng FFmpeg...`);

        // B. Cấu hình FFmpeg phát sóng chuẩn Facebook Live RTMP
        const ffmpegArgs = [
          '-re', // Đọc input theo tốc độ thực tế (realtime)
          ...(loop ? ['-stream_loop', '-1'] : []), // Lặp lại vô hạn nếu bật loop
          '-i', localVideoPath,
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-b:v', '2500k',
          '-maxrate', '3000k',
          '-bufsize', '5000k',
          '-pix_fmt', 'yuv420p',
          '-g', '60', // Keyframe 2 giây chuẩn Facebook
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ar', '44100',
          '-f', 'flv',
          streamUrl
        ];

        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

        ffmpegProcess.stderr.on('data', (data) => {
          // Ghi nhận log khi cần thiết
          const output = data.toString();
          if (output.includes('error') || output.includes('Error')) {
            this.logger.warn(`[FFmpeg Warning ${acc.accountName}]: ${output.slice(0, 200)}`);
          }
        });

        ffmpegProcess.on('close', (code) => {
          this.logger.log(`🛑 Luồng FFmpeg của Fanpage ${acc.accountName} đã kết thúc với mã: ${code}`);
          this.removeStream(workspaceId, acc.platformId);
        });

        ffmpegProcess.on('error', (err) => {
          this.logger.error(`🚨 Lỗi tiến trình FFmpeg trên ${acc.accountName}:`, err.message);
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
        const errorDetail = err.response?.data?.error || err.response?.data || err.message;
        this.logger.error(`🚨 Thất bại khi phát Live trên ${acc.accountName}:`, JSON.stringify(errorDetail));
        results.push({
          pageId: acc.platformId,
          pageName: acc.accountName,
          status: 'failed',
          error: err.response?.data?.error?.message || err.message
        });
      }
    }

    this.activeStreams.set(workspaceId, currentActive);

    const successCount = results.filter(r => r.status === 'streaming').length;

    if (successCount === 0) {
      const firstError = results[0]?.error || 'Lỗi không xác định khi kết nối Facebook Live';
      throw new HttpException(`Không thể phát sóng: ${firstError}`, HttpStatus.BAD_REQUEST);
    }

    return {
      success: true,
      message: `Đã bắt đầu phát sóng Live trên ${successCount}/${accounts.length} Fanpage`,
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
          // Dừng tiến trình FFmpeg
          stream.process.kill('SIGTERM');
          
          // Lấy token để gọi Facebook đóng phiên Live Video
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