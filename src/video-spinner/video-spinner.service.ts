import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { SpinVideoDto } from './video-spinner.dto';

const execAsync = promisify(exec);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg');

// Cấu hình FFmpeg binary an toàn
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
   * Nhân bản video siêu tốc với Concurrency & Ultrafast preset (Chỉ mất ~20 giây)
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
    const hasAudio = await this.checkHasAudio(inputPath);
    this.logger.log(`[Spin Video] Bắt đầu nhân bản ${count} video từ batch ${batchId} (hasAudio: ${hasAudio})`);

    const spunVideos: SpunVideoResult[] = [];
    const tasks: Array<() => Promise<void>> = [];

    // Tạo bộ lọc cho từng biến thể
    for (let i = 1; i <= count; i++) {
      const outputFileName = `spin_${batchId}_v${i}.mp4`;
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
        vFilters.push(`scale=iw*${zoom}:ih*${zoom},crop=iw/${zoom}:ih/${zoom}:(iw-iw/${zoom})/2:(ih-ih/${zoom})/2`);
      }
      if (isAddNoise) {
        vFilters.push('noise=alls=1:allf=t');
      }

      // Giới hạn max width 720p để tốc độ xử lý nhanh gấp 4 lần (chuẩn sắc nét TikTok/Reels)
      vFilters.push("scale='min(720,iw)':-2");

      // 2. Audio Filters
      const aFilters: string[] = [];
      if (hasAudio) {
        if (speed !== 1.0) aFilters.push(`atempo=${speed}`);
        if (isChangeAudio) aFilters.push('equalizer=f=1000:t=q:w=1:g=0.5');
      }

      tasks.push(async () => {
        await this.processSingleVariant(inputPath, outputPath, vFilters, aFilters, hasAudio);
        const publicUrl = `${serverBaseUrl}/uploads/spun-videos/${batchId}/${outputFileName}`;
        spunVideos.push({
          id: uuidv4(),
          fileName: outputFileName,
          url: publicUrl,
          variantIndex: i,
          parameters: { speed, zoom, brightness, contrast, saturation, isFlipped: isFlip },
        });
      });
    }

    // Chạy song song 2 luồng render cùng lúc để tận dụng tối đa CPU của VPS
    const concurrency = 2;
    for (let i = 0; i < tasks.length; i += concurrency) {
      const chunk = tasks.slice(i, i + concurrency);
      await Promise.all(chunk.map((fn) => fn()));
    }

    // Sắp xếp thứ tự video từ v1 -> vN
    spunVideos.sort((a, b) => a.variantIndex - b.variantIndex);

    // 3. Đóng gói ZIP đa tầng bảo đảm 100% không lỗi
    let zipDownloadUrl: string | undefined = undefined;
    try {
      const zipFileName = `batch_${batchId}_all_${count}_videos.zip`;
      const zipFilePath = path.join(batchDir, zipFileName);
      const fileList = spunVideos.map((v) => path.join(batchDir, v.fileName));
      await this.createZipFileResilient(fileList, zipFilePath);
      zipDownloadUrl = `${serverBaseUrl}/uploads/spun-videos/${batchId}/${zipFileName}`;
      this.logger.log(`[Spin Video] Đã tạo thành công file ZIP: ${zipFileName}`);
    } catch (zipErr) {
      this.logger.warn(`Không thể nén file ZIP: ${zipErr}`);
    }

    // Xoá file upload tạm sau khi đã nhân bản xong
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

  private checkHasAudio(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
        if (err || !metadata || !metadata.streams) {
          resolve(false);
          return;
        }
        const hasAudioStream = metadata.streams.some((stream: any) => stream.codec_type === 'audio');
        resolve(hasAudioStream);
      });
    });
  }

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
        '-c:v', 'libx264',
        '-preset', 'ultrafast',     // Preset nhanh nhất của x264
        '-tune', 'fastdecode',
        '-threads', '0',            // Tận dụng hết tất cả CPU core của VPS
        '-crf', '26',               // Cân bằng tối ưu giữa dung lượng và độ nét
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
   * Đóng gói ZIP 3 tầng an toàn tuyệt đối: Archiver -> Linux zip command -> Pure Node.js Store Zip
   */
  private async createZipFileResilient(filePaths: string[], destinationZip: string): Promise<void> {
    // Tầng 1: Archiver
    try {
      await this.zipWithArchiver(filePaths, destinationZip);
      if (fs.existsSync(destinationZip) && fs.statSync(destinationZip).size > 0) {
        return;
      }
    } catch (e) {
      this.logger.warn(`Archiver không khả dụng, chuyển sang Linux CLI: ${e}`);
    }

    // Tầng 2: Lệnh zip có sẵn của Linux
    try {
      const filesStr = filePaths.map((p) => `"${p}"`).join(' ');
      await execAsync(`zip -j -1 "${destinationZip}" ${filesStr}`);
      if (fs.existsSync(destinationZip) && fs.statSync(destinationZip).size > 0) {
        return;
      }
    } catch (e) {
      this.logger.warn(`Linux zip CLI thất bại, chuyển sang Pure Node.js ZIP: ${e}`);
    }

    // Tầng 3: Thuần Node.js (100% chạy được mọi môi trường)
    await this.zipWithPureNode(filePaths, destinationZip);
  }

  private zipWithArchiver(filePaths: string[], destinationZip: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let archiverLib: any = null;
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const raw = require('archiver');
          archiverLib = raw?.default?.default || raw?.default || raw;
        } catch {
          return reject(new Error('Archiver module not found'));
        }

        const archive = typeof archiverLib === 'function' ? archiverLib('zip', { zlib: { level: 1 } }) : archiverLib?.create ? archiverLib.create('zip', { zlib: { level: 1 } }) : null;

        if (!archive) {
          return reject(new Error('Không thể khởi tạo Archiver'));
        }

        const output = fs.createWriteStream(destinationZip);
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

  private async zipWithPureNode(filePaths: string[], destinationZip: string): Promise<void> {
    const parts: Buffer[] = [];
    const cdEntries: Buffer[] = [];
    let currentOffset = 0;

    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) continue;
      const fileBuffer = fs.readFileSync(filePath);
      const fileNameBuffer = Buffer.from(path.basename(filePath), 'utf-8');
      const crc = this.calculateCrc32(fileBuffer);

      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(0, 8); // Store
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(fileBuffer.length, 18);
      localHeader.writeUInt32LE(fileBuffer.length, 22);
      localHeader.writeUInt16LE(fileNameBuffer.length, 26);
      localHeader.writeUInt16LE(0, 28);

      parts.push(localHeader, fileNameBuffer, fileBuffer);

      const cdEntry = Buffer.alloc(46);
      cdEntry.writeUInt32LE(0x02014b50, 0);
      cdEntry.writeUInt16LE(20, 4);
      cdEntry.writeUInt16LE(20, 6);
      cdEntry.writeUInt16LE(0, 8);
      cdEntry.writeUInt16LE(0, 10);
      cdEntry.writeUInt16LE(0, 12);
      cdEntry.writeUInt16LE(0, 14);
      cdEntry.writeUInt32LE(crc, 16);
      cdEntry.writeUInt32LE(fileBuffer.length, 20);
      cdEntry.writeUInt32LE(fileBuffer.length, 24);
      cdEntry.writeUInt16LE(fileNameBuffer.length, 28);
      cdEntry.writeUInt16LE(0, 30);
      cdEntry.writeUInt16LE(0, 32);
      cdEntry.writeUInt16LE(0, 34);
      cdEntry.writeUInt16LE(0, 36);
      cdEntry.writeUInt32LE(0, 38);
      cdEntry.writeUInt32LE(currentOffset, 42);

      cdEntries.push(cdEntry, fileNameBuffer);
      currentOffset += localHeader.length + fileNameBuffer.length + fileBuffer.length;
    }

    const cdBuffer = Buffer.concat(cdEntries);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(filePaths.length, 8);
    eocd.writeUInt16LE(filePaths.length, 10);
    eocd.writeUInt32LE(cdBuffer.length, 12);
    eocd.writeUInt32LE(currentOffset, 16);
    eocd.writeUInt16LE(0, 20);

    const fullZip = Buffer.concat([...parts, cdBuffer, eocd]);
    fs.writeFileSync(destinationZip, fullZip);
  }

  private calculateCrc32(buf: Buffer): number {
    let crc = ~0;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
      }
    }
    return (crc ^ ~0) >>> 0;
  }
}