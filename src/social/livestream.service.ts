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
    videoUrl: string;
    title: string;
    description: string;
    pageIds: string[];
    loop?: boolean;
  }) {
    const { workspaceId, videoUrl, title, description, pageIds, loop = true } = body;

    if (!pageIds || pageIds.length === 0) {
      throw new HttpException('Vui lòng chọn ít nhất 1 Fanpage để phát Live', HttpStatus.BAD_REQUEST);
    }

    if (!videoUrl) {
      throw new HttpException('Vui lòng cung cấp video MP4 để phát Livestream', HttpStatus.BAD_REQUEST);
    }

    // Lấy danh sách tài khoản Fanpage từ Database
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        workspaceId,
        platformId: { in: pageIds }
      }
    });

    if (accounts.length === 0) {
      throw new HttpException('Không tìm thấy thông tin các Fanpage đã chọn trong hệ thống', HttpStatus.NOT_FOUND);
    }

    // Xác định nguồn video (Local File hoặc URL)
    let inputSource = videoUrl;
    if (videoUrl.includes('/uploads/')) {
      const fileName = videoUrl.split('/uploads/')[1];
      const localPath = join(process.cwd(), 'uploads', fileName);
      if (fs.existsSync(localPath)) {
        inputSource = localPath;
      }
    }

    const currentActive = this.activeStreams.get(workspaceId) || [];
    const results = [];

    // Chạy song song từng Fanpage để không bị chặn lẫn nhau
    for (const acc of accounts) {
      try {
        this.logger.log(`🎬 [1/3] Khởi tạo phiên Live trên Page: ${acc.accountName} (${acc.platformId})`);

        // BƯỚC A: Tạo phiên Live trên Facebook Graph API v21.0
        const fbRes = await axios.post(
          `https://graph.facebook.com/v21.0/${acc.platformId}/live_videos`,
          {
            title: title || 'Livestream cùng Trợ lý AI',
            description: description || '',
            status: 'UNPUBLISHED' // Tạo phiên ở chế độ sẵn sàng nhận luồng
          },
          {
            headers: { Authorization: `Bearer ${acc.accessToken}` }
          }
        );

        const liveVideoId = fbRes.data?.id;
        const streamUrl = fbRes.data?.secure_stream_url || fbRes.data?.stream_url;

        if (!streamUrl) {
          throw new Error('Facebook không trả về RTMP URL');
        }

        this.logger.log(`✅ [2/3] Lấy RTMP URL thành công: ${acc.accountName}. Bắt đầu đẩy luồng FFmpeg...`);

        // BƯỚC B: Cấu hình FFmpeg đẩy luồng RTMP lên Facebook
        const ffmpegArgs = [
          '-re',
          ...(loop ? ['-stream_loop', '-1'] : []),
          '-i', inputSource,
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-tune', 'zerolatency',
          '-b:v', '2500k',
          '-maxrate', '3000k',
          '-bufsize', '5000k',
          '-pix_fmt', 'yuv420p',
          '-g', '60',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ar', '44100',
          '-f', 'flv',
          streamUrl
        ];

        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

        ffmpegProcess.stderr.on('data', (data) => {
          const logStr = data.toString();
          if (logStr.includes('error') || logStr.includes('Error')) {
            this.logger.warn(`[FFmpeg Warning ${acc.accountName}]: ${logStr.slice(0, 150)}`);
          }
        });

        ffmpegProcess.on('close', (code) => {
          this.logger.log(`🛑 Luồng FFmpeg của Page ${acc.accountName} kết thúc (code: ${code})`);
          this.removeStream(workspaceId, acc.platformId);
        });

        ffmpegProcess.on('error', (err) => {
          this.logger.error(`🚨 Lỗi tiến trình FFmpeg trên ${acc.accountName}:`, err.message);
        });

        // BƯỚC C: Sau 4 giây khi FFmpeg đã bơm dữ liệu RTMP vào Facebook -> Kích hoạt GO LIVE CHÍNH THỨC
        setTimeout(async () => {
          try {
            this.logger.log(`🚀 [3/3] Kích hoạt phát sóng GO LIVE chính thức trên ${acc.accountName}...`);
            await axios.post(
              `https://graph.facebook.com/v21.0/${liveVideoId}`,
              { status: 'LIVE_NOW' },
              { headers: { Authorization: `Bearer ${acc.accessToken}` } }
            );
            this.logger.log(`🎉 Page ${acc.accountName} ĐÃ PHÁT SÓNG TRỰC TIẾP CÔNG KHAI THÀNH CÔNG!`);
          } catch (publishErr: any) {
            this.logger.error(
              `Lỗi khi Go Live trên ${acc.accountName}:`,
              publishErr.response?.data?.error?.message || publishErr.message
            );
          }
        }, 4000);

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
        const errDetail = err.response?.data?.error?.message || err.message;
        this.logger.error(`🚨 Thất bại khi tạo Live trên ${acc.accountName}:`, errDetail);
        results.push({
          pageId: acc.platformId,
          pageName: acc.accountName,
          status: 'failed',
          error: errDetail
        });
      }
    }

    this.activeStreams.set(workspaceId, currentActive);

    const successList = results.filter(r => r.status === 'streaming');
    if (successList.length === 0) {
      throw new HttpException(`Không thể phát sóng: ${results[0]?.error || 'Lỗi không xác định'}`, HttpStatus.BAD_REQUEST);
    }

    return {
      success: true,
      message: `Đã kích hoạt phát Live trên ${successList.length}/${accounts.length} Fanpage thành công!`,
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