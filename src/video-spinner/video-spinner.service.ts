import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SpinVideoDto } from './video-spinner.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver = require('archiver');

// Gán đường dẫn binary nếu có installer
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
  if (ffmpegInstaller && ffmpegInstaller.path) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  }
  if (ffprobeInstaller && ffprobeInstaller.path) {
    ffmpeg.setFfprobePath(ffprobeInstaller.path);
  }
} catch (err) {
  Logger.warn('Sử dụng FFmpeg mặc định từ container hệ thống.');
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
    if (!fs.existsSync(this.uploadBaseDir)) {
      fs.mkdirSync(this.uploadBaseDir, { recursive: true });
    }
  }

  /**
   * Nhân bản 1 video thành N video biến thể độc nhất
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

    const count = Math.min(Math.max(Number(dto.count) || 5, 1), 20);
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

    // Kiểm tra xem video gốc có âm thanh không để tránh lỗi audio filter
    const hasAudio = await this.checkHasAudio(inputPath);

    this.logger.log(`[Spin Video] Bắt đầu nhân bản ${count} video từ batch ${batchId} (hasAudio: ${hasAudio})`);

    for (let i = 1; i <= count; i++) {
      const outputFileName = `spin_${batchId}_v${i}_${Date.now()}.mp4`;
      const outputPath = path.join(batchDir, outputFileName);

      // Thông số biến thể ngẫu nhiên vi mô
      const speed = isChangeSpeed ? Number((0.985 + Math.random() * 0.03).toFixed(4)) : 1.0;
      const zoom = isMicroZoom ? Number((1.01 + Math.random() * 0.02).toFixed(4)) : 1.0;
      const brightness = isChangeColor ? Number((-0.02 + Math.random() * 0.04).toFixed(3)) : 0;
      const contrast = isChangeColor ? Number((0.98 + Math.random() * 0.04).toFixed(3)) : 1.0;
      const saturation = isChangeColor ? Number((0.97 + Math.random() * 0.06).toFixed(3)) : 1.0;

      // 1. Tạo chuỗi Video Filters
      const vFilters: string[] = [];

      if (isFlip) {
        vFilters.push('hflip');
      }

      if (speed !== 1.0) {
        const ptsMultiplier = (1 / speed).toFixed(4);
        vFilters.push(`setpts=${ptsMultiplier}*PTS`);
      }

      if (brightness !== 0 || contrast !== 1.0 || saturation !== 1.0) {
        vFilters.push(`eq=contrast=${contrast}:brightness=${brightness}:saturation=${saturation}`);
      }

      if (zoom > 1.0) {
        vFilters.push(
          `scale=iw*${zoom}:ih*${zoom},crop=iw/${zoom}:ih/${zoom}:(iw-iw/${zoom})/2:(ih-ih/${zoom})/2`
        );
      }

      if (isAddNoise) {
        vFilters.push('noise=alls=1:allf=t');
      }

      // 2. Tạo chuỗi Audio Filters (chỉ kích hoạt nếu video gốc có âm thanh)
      const aFilters: string[] = [];
      if (hasAudio) {
        if (speed !== 1.0) {
          aFilters.push(`atempo=${speed}`);
        }
        if (isChangeAudio) {
          aFilters.push('equalizer=f=1000:t=q:w=1:g=0.5');
        }
      }

      // 3. Render video biến thể
      await this.processSingleVariant(inputPath, outputPath, vFilters, aFilters, hasAudio);

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

    // 4. Tạo file ZIP đóng gói
    const zipFileName = `batch_${batchId}_all_${count}_videos.zip`;
    const zipFilePath = path.join(batchDir, zipFileName);
    await this.createZipFile(spunVideos.map((v) => path.join(batchDir, v.fileName)), zipFilePath);

    const zipDownloadUrl = `${serverBaseUrl}/uploads/spun-videos/${batchId}/${zipFileName}`;

    // Xoá file upload tạm ban đầu
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
   * Kiểm tra video có luồng audio không
   */
  private checkHasAudio(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
        if (err || !metadata || !metadata.streams) {
          resolve(false);
          return;
        }
        const hasAudioStream = metadata.streams.some(
          (stream: any) => stream.codec_type === 'audio'
        );
        resolve(hasAudioStream);
      });
    });
  }

  /**
   * Render 1 file video biến thể với FFmpeg
   */
  private processSingleVariant(
    input: string,
    output: string,
    videoFilters: string[],
    audioFilters: string[],
    hasAudio: boolean
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(input);

      if (videoFilters.length > 0) {
        command = command.videoFilters(videoFilters);
      }

      if (hasAudio && audioFilters.length > 0) {
        command = command.audioFilters(audioFilters);
      }

      // Tách từng tham số riêng biệt trong mảng (sửa lỗi Unrecognized option metadata)
      const options: string[] = [
        '-map_metadata', '-1',
        '-metadata', `title=Video_${uuidv4().slice(0, 8)}`,
        '-metadata', `comment=Cloned_${Date.now()}`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '22',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
      ];

      if (hasAudio) {
        options.push('-c:a', 'aac', '-b:a', '128k');
      } else {
        options.push('-an'); // Tắt audio nếu video gốc không có tiếng
      }

      command
        .outputOptions(options)
        .output(output)
        .on('end', () => resolve())
        .on('error', (err: any) => {
          this.logger.error(`FFmpeg lỗi khi tạo biến thể: ${err?.message || err}`);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Nén file ZIP
   */
  private createZipFile(filePaths: string[], destinationZip: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(destinationZip);
      const archive = archiver('zip', { zlib: { level: 6 } });

      output.on('close', () => resolve());
      archive.on('error', (err: any) => reject(err));

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