import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SpinVideoDto } from './video-spinner.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg');

// Trình giải mã Archiver đa tầng an toàn 100%
function getArchiverInstance(options: any) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pkg = require('archiver');
  if (typeof pkg === 'function') return pkg('zip', options);
  if (pkg && typeof pkg.create === 'function') return pkg.create('zip', options);
  if (pkg && pkg.default) {
    if (typeof pkg.default === 'function') return pkg.default('zip', options);
    if (typeof pkg.default.create === 'function') return pkg.default.create('zip', options);
    if (pkg.default.default && typeof pkg.default.default === 'function') return pkg.default.default('zip', options);
  }
  throw new Error(`Archiver không tương thích: ${typeof pkg}`);
}

// Cấu hình FFmpeg binary
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
  Logger.warn('Sử dụng FFmpeg mặc định từ container Linux.');
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
   * Nhân bản 1 video thành N video biến thể độc nhất (Siêu tốc)
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

    const hasAudio = await this.checkHasAudio(inputPath);
    this.logger.log(`[Spin Video] Bắt đầu nhân bản ${count} video từ batch ${batchId} (hasAudio: ${hasAudio})`);

    // Render từng biến thể với preset ultrafast
    for (let i = 1; i <= count; i++) {
      const outputFileName = `spin_${batchId}_v${i}_${Date.now()}.mp4`;
      const outputPath = path.join(batchDir, outputFileName);

      const speed = isChangeSpeed ? Number((0.985 + Math.random() * 0.03).toFixed(4)) : 1.0;
      const zoom = isMicroZoom ? Number((1.01 + Math.random() * 0.02).toFixed(4)) : 1.0;
      const brightness = isChangeColor ? Number((-0.02 + Math.random() * 0.04).toFixed(3)) : 0;
      const contrast = isChangeColor ? Number((0.98 + Math.random() * 0.04).toFixed(3)) : 1.0;
      const saturation = isChangeColor ? Number((0.97 + Math.random() * 0.06).toFixed(3)) : 1.0;

      // 1. Video Filters
      const vFilters: string[] = [];
      if (isFlip) vFilters.push('hflip');
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

      // 2. Audio Filters
      const aFilters: string[] = [];
      if (hasAudio) {
        if (speed !== 1.0) aFilters.push(`atempo=${speed}`);
        if (isChangeAudio) aFilters.push('equalizer=f=1000:t=q:w=1:g=0.5');
      }

      // 3. Render siêu tốc
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

    // 4. Đóng gói ZIP
    let zipDownloadUrl: string | undefined = undefined;
    try {
      const zipFileName = `batch_${batchId}_all_${count}_videos.zip`;
      const zipFilePath = path.join(batchDir, zipFileName);
      await this.createZipFile(spunVideos.map((v) => path.join(batchDir, v.fileName)), zipFilePath);
      zipDownloadUrl = `${serverBaseUrl}/uploads/spun-videos/${batchId}/${zipFileName}`;
    } catch (zipErr) {
      this.logger.warn(`Không thể nén file ZIP: ${zipErr}`);
    }

    // Xoá file upload tạm
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
   * Kiểm tra luồng Audio
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
   * Render 1 video với FFmpeg siêu tốc (ultrafast + threads 0)
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

      const options: string[] = [
        '-map_metadata', '-1',
        '-metadata', `title=Video_${uuidv4().slice(0, 8)}`,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',     // ⚡ TĂNG TỐC ĐỘ GẤP 5 LẦN, CHỐNG TIMEOUT
        '-tune', 'fastdecode',
        '-threads', '0',            // ⚡ TẬN DỤNG TẤT CẢ CÁC NHÂN CPU CỦA VPS
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
      ];

      if (hasAudio) {
        options.push('-c:a', 'aac', '-b:a', '128k');
      } else {
        options.push('-an');
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
   * Nén file ZIP an toàn
   */
  private createZipFile(filePaths: string[], destinationZip: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const output = fs.createWriteStream(destinationZip);
        const archive = getArchiverInstance({ zlib: { level: 4 } });

        output.on('close', () => resolve());
        archive.on('error', (err: any) => reject(err));

        archive.pipe(output);

        for (const filePath of filePaths) {
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: path.basename(filePath) });
          }
        }

        archive.finalize();
      } catch (err) {
        reject(err);
      }
    });
  }
}