import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as ffprobeInstaller from '@ffprobe-installer/ffprobe';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { SpinVideoDto } from './video-spinner.dto';

// Tự động gán đường dẫn binary ffmpeg
try {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
} catch (err) {
  Logger.warn('Sử dụng FFmpeg mặc định từ môi trường hệ điều hành.');
}

export interface SpunVideoResult {
  id: string;
  fileName: string;
  url: string;
  variantIndex: number;
  parameters: {
    speed: number;
    zoom: number;
    brightness: number;
    contrast: number;
    saturation: number;
    isFlipped: boolean;
  };
}

@Injectable()
export class VideoSpinnerService {
  private readonly logger = new Logger(VideoSpinnerService.name);
  private readonly uploadBaseDir = path.join(process.cwd(), 'uploads', 'spun-videos');

  constructor() {
    // Đảm bảo thư mục lưu trữ tồn tại
    if (!fs.existsSync(this.uploadBaseDir)) {
      fs.mkdirSync(this.uploadBaseDir, { recursive: true });
    }
  }

  /**
   * Nhân bản 1 video thành N video biến thể
   */
  async spinVideo(
    file: Express.Multer.File,
    dto: SpinVideoDto,
    serverBaseUrl: string = ''
  ): Promise<{
    originalName: string;
    totalSpun: number;
    zipDownloadUrl?: string;
    videos: SpunVideoResult[];
  }> {
    if (!file) {
      throw new BadRequestException('Vui lòng tải lên 1 file video hợp lệ!');
    }

    const count = Math.min(Math.max(Number(dto.count) || 5, 1), 20); // Giới hạn 1 - 20 video mỗi đợt
    const isFlip = String(dto.flip) === 'true';
    const isChangeSpeed = String(dto.changeSpeed) !== 'false';
    const isChangeColor = String(dto.changeColor) !== 'false';
    const isMicroZoom = String(dto.microZoom) !== 'false';
    const isChangeAudio = String(dto.changeAudio) !== 'false';
    const isAddNoise = String(dto.addNoise) === 'true';

    const batchId = uuidv4().slice(0, 8);
    const batchDir = path.join(this.uploadBaseDir, batchId);
    fs.mkdirSync(batchDir, { recursive: true });

    const inputPath = file.path;
    const spunVideos: SpunVideoResult[] = [];

    this.logger.log(`[Spin Video] Bắt đầu nhân bản ${count} video từ batch ${batchId}`);

    for (let i = 1; i <= count; i++) {
      const outputFileName = `spin_${batchId}_v${i}_${Date.now()}.mp4`;
      const outputPath = path.join(batchDir, outputFileName);

      // 1. Tính toán thông số biến thể ngẫu nhiên cho từng video
      // Tốc độ thay đổi từ 0.98x -> 1.02x (người xem không nhận ra nhưng thay đổi toàn bộ timecode)
      const speed = isChangeSpeed ? Number((0.985 + Math.random() * 0.03).toFixed(4)) : 1.0;
      
      // Zoom nhẹ từ 1.01x -> 1.03x
      const zoom = isMicroZoom ? Number((1.01 + Math.random() * 0.02).toFixed(4)) : 1.0;
      
      // Độ sáng (-0.02 -> +0.02), Độ tương phản (0.98 -> 1.02), Độ bão hòa (0.97 -> 1.03)
      const brightness = isChangeColor ? Number((-0.02 + Math.random() * 0.04).toFixed(3)) : 0;
      const contrast = isChangeColor ? Number((0.98 + Math.random() * 0.04).toFixed(3)) : 1.0;
      const saturation = isChangeColor ? Number((0.97 + Math.random() * 0.06).toFixed(3)) : 1.0;

      // Xây dựng bộ lọc Video Filters
      const videoFilters: string[] = [];

      // A. Lật gương (nếu người dùng bật hoặc ngẫu nhiên biến thể)
      if (isFlip) {
        videoFilters.push('hflip');
      }

      // B. Tốc độ video (setpts)
      if (speed !== 1.0) {
        const ptsMultiplier = (1 / speed).toFixed(4);
        videoFilters.push(`setpts=${ptsMultiplier}*PTS`);
      }

      // C. Chỉnh màu (eq)
      if (brightness !== 0 || contrast !== 1.0 || saturation !== 1.0) {
        videoFilters.push(`eq=contrast=${contrast}:brightness=${brightness}:saturation=${saturation}`);
      }

      // D. Micro Zoom và Crop
      if (zoom > 1.0) {
        videoFilters.push(
          `scale=iw*${zoom}:ih*${zoom},crop=iw/${zoom}:ih/${zoom}:(iw-iw/${zoom})/2:(ih-ih/${zoom})/2`
        );
      }

      // E. Thêm Noise vi mô (nếu bật)
      if (isAddNoise) {
        videoFilters.push('noise=alls=1:allf=t');
      }

      // Xây dựng bộ lọc Audio Filters
      const audioFilters: string[] = [];
      if (speed !== 1.0) {
        audioFilters.push(`atempo=${speed}`);
      }
      if (isChangeAudio) {
        // Tinh chỉnh tần số nhẹ
        audioFilters.push('equalizer=f=1000:t=q:w=1:g=0.5');
      }

      // 2. Chạy FFmpeg render biến thể
      await this.processSingleVariant(inputPath, outputPath, videoFilters, audioFilters);

      const publicUrl = `${serverBaseUrl}/uploads/spun-videos/${batchId}/${outputFileName}`;
      spunVideos.push({
        id: uuidv4(),
        fileName: outputFileName,
        url: publicUrl,
        variantIndex: i,
        parameters: {
          speed,
          zoom,
          brightness,
          contrast,
          saturation,
          isFlipped: isFlip,
        },
      });
    }

    // 3. Đóng gói toàn bộ video thành 1 file ZIP để tải về nhanh
    const zipFileName = `batch_${batchId}_all_${count}_videos.zip`;
    const zipFilePath = path.join(batchDir, zipFileName);
    await this.createZipFile(spunVideos.map((v) => path.join(batchDir, v.fileName)), zipFilePath);

    const zipDownloadUrl = `${serverBaseUrl}/uploads/spun-videos/${batchId}/${zipFileName}`;

    // Xoá file gốc tạm sau khi đã xử lý xong
    try {
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
    } catch (e) {
      this.logger.warn(`Không thể xoá file tạm: ${inputPath}`);
    }

    return {
      originalName: file.originalname,
      totalSpun: spunVideos.length,
      zipDownloadUrl,
      videos: spunVideos,
    };
  }

  /**
   * Xử lý 1 video bằng ffmpeg
   */
  private processSingleVariant(
    input: string,
    output: string,
    videoFilters: string[],
    audioFilters: string[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(input);

      if (videoFilters.length > 0) {
        command = command.videoFilters(videoFilters);
      }

      if (audioFilters.length > 0) {
        command = command.audioFilters(audioFilters);
      }

      // Xoá sạch Metadata cũ và gắn ngẫu nhiên Metadata mới để chống quét
      command
        .outputOptions([
          '-map_metadata -1', // Xoá sạch metadata gốc
          `-metadata title="Video ${uuidv4()}"`,
          `-metadata date="${new Date().toISOString()}"`,
          '-c:v libx264',
          '-preset veryfast', // Tối ưu tốc độ render nhanh nhất
          '-crf 22',         // Đảm bảo chất lượng video sắc nét
          '-c:a aac',
          '-b:a 128k',
        ])
        .output(output)
        .on('end', () => resolve())
        .on('error', (err) => {
          this.logger.error(`FFmpeg lỗi khi tạo biến thể: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Nén tất cả video thành file ZIP
   */
  private createZipFile(filePaths: string[], destinationZip: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(destinationZip);
      const archive = archiver('zip', { zlib: { level: 6 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);

      for (const filePath of filePaths) {
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: path.basename(filePath) });
        }
      }

      archive.finalize();
    });
  }
}