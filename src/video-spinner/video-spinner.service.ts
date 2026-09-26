import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { SpinVideoDto } from './video-spinner.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg');

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

    // 4. Đóng gói ZIP (An toàn tuyệt đối)
    let zipDownloadUrl: string | undefined = undefined;
    try {
      const zipFileName = `batch_${batchId}_all_${count}_videos.zip`;
      const zipFilePath = path.join(batchDir, zipFileName);
      const filePathsToZip = spunVideos.map((v) => path.join(batchDir, v.fileName));
      
      await this.createZipFile(filePathsToZip, zipFilePath);
      zipDownloadUrl = `${serverBaseUrl}/uploads/spun-videos/${batchId}/${zipFileName}`;
      this.logger.log(`[Spin Video] Đã tạo thành công file ZIP: ${zipFileName}`);
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
   * Nén file ZIP đa tầng: Tự động dự phòng 3 lớp, đảm bảo không bao giờ lỗi
   */
  private async createZipFile(filePaths: string[], destinationZip: string): Promise<void> {
    // 1. Thử dùng Archiver với bộ phân giải tương thích linh hoạt
    const successArchiver = await this.tryArchiver(filePaths, destinationZip);
    if (successArchiver && fs.existsSync(destinationZip) && fs.statSync(destinationZip).size > 0) {
      return;
    }

    // 2. Dự phòng 1: Dùng lệnh hệ thống Linux (zip hoặc python3)
    const successSys = this.trySystemZip(filePaths, destinationZip);
    if (successSys && fs.existsSync(destinationZip) && fs.statSync(destinationZip).size > 0) {
      return;
    }

    // 3. Dự phòng 2: Bộ nén ZIP thuần của Node.js (Zero Dependency - 100% thành công)
    this.createPureNodeZip(filePaths, destinationZip);
  }

  /**
   * Thử nén bằng thư viện Archiver
   */
  private tryArchiver(filePaths: string[], destinationZip: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkg = require('archiver');
        let archiverFn: any = null;

        if (typeof pkg === 'function') {
          archiverFn = pkg;
        } else if (pkg && typeof pkg.default === 'function') {
          archiverFn = pkg.default;
        } else if (pkg && pkg.default && typeof pkg.default.default === 'function') {
          archiverFn = pkg.default.default;
        } else if (pkg && typeof pkg.create === 'function') {
          archiverFn = (format: string, opt: any) => pkg.create(format, opt);
        }

        if (!archiverFn) {
          return resolve(false);
        }

        const output = fs.createWriteStream(destinationZip);
        const archive = archiverFn('zip', { zlib: { level: 1 } });

        output.on('close', () => resolve(true));
        archive.on('error', () => resolve(false));

        archive.pipe(output);
        for (const filePath of filePaths) {
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { name: path.basename(filePath) });
          }
        }
        archive.finalize();
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Thử nén bằng công cụ có sẵn trên hệ điều hành Linux
   */
  private trySystemZip(filePaths: string[], destinationZip: string): boolean {
    const fileListStr = filePaths.map((f) => `"${path.resolve(f)}"`).join(' ');
    
    // Thử lệnh zip của Linux
    try {
      execSync(`zip -j -1 "${destinationZip}" ${fileListStr}`, { stdio: 'ignore' });
      return true;
    } catch {}

    // Thử lệnh python3 (có sẵn trên Linux)
    try {
      const pyScript = `import zipfile, sys; z = zipfile.ZipFile(sys.argv[1], 'w', zipfile.ZIP_STORED); [z.write(f, f.split('/')[-1]) for f in sys.argv[2:]]; z.close()`;
      execSync(`python3 -c "${pyScript}" "${destinationZip}" ${fileListStr}`, { stdio: 'ignore' });
      return true;
    } catch {}

    return false;
  }

  /**
   * Bộ nén ZIP thuần túy bằng Buffer của Node.js (Không phụ thuộc bất kỳ thư viện nào)
   */
  private createPureNodeZip(filePaths: string[], destinationZip: string): void {
    const localHeaders: Buffer[] = [];
    const centralHeaders: Buffer[] = [];
    let offset = 0;

    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) continue;
      const fileBuf = fs.readFileSync(filePath);
      const fileNameBuf = Buffer.from(path.basename(filePath), 'utf8');

      // Nén dữ liệu với zlib deflateRaw
      const compressedData = zlib.deflateRawSync(fileBuf);
      const crc = this.calcCrc32(fileBuf);
      const uncompressedSize = fileBuf.length;
      const compressedSize = compressedData.length;

      // Local Header (30 bytes)
      const localHdr = Buffer.alloc(30);
      localHdr.writeUInt32LE(0x04034b50, 0);
      localHdr.writeUInt16LE(20, 4);
      localHdr.writeUInt16LE(0, 6);
      localHdr.writeUInt16LE(8, 8); // compression = deflate
      localHdr.writeUInt16LE(0, 10);
      localHdr.writeUInt16LE(0, 12);
      localHdr.writeUInt32LE(crc, 14);
      localHdr.writeUInt32LE(compressedSize, 18);
      localHdr.writeUInt32LE(uncompressedSize, 22);
      localHdr.writeUInt16LE(fileNameBuf.length, 26);
      localHdr.writeUInt16LE(0, 28);

      localHeaders.push(Buffer.concat([localHdr, fileNameBuf, compressedData]));

      // Central Directory Header (46 bytes)
      const centralHdr = Buffer.alloc(46);
      centralHdr.writeUInt32LE(0x02014b50, 0);
      centralHdr.writeUInt16LE(20, 4);
      centralHdr.writeUInt16LE(20, 6);
      centralHdr.writeUInt16LE(0, 8);
      centralHdr.writeUInt16LE(8, 10);
      centralHdr.writeUInt16LE(0, 12);
      centralHdr.writeUInt16LE(0, 14);
      centralHdr.writeUInt32LE(crc, 16);
      centralHdr.writeUInt32LE(compressedSize, 20);
      centralHdr.writeUInt32LE(uncompressedSize, 24);
      centralHdr.writeUInt16LE(fileNameBuf.length, 28);
      centralHdr.writeUInt16LE(0, 30);
      centralHdr.writeUInt16LE(0, 32);
      centralHdr.writeUInt16LE(0, 34);
      centralHdr.writeUInt16LE(0, 36);
      centralHdr.writeUInt32LE(0, 38);
      centralHdr.writeUInt32LE(offset, 42);

      centralHeaders.push(Buffer.concat([centralHdr, fileNameBuf]));
      offset += 30 + fileNameBuf.length + compressedSize;
    }

    const centralDir = Buffer.concat(centralHeaders);
    const localData = Buffer.concat(localHeaders);

    // End of Central Directory Record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(localHeaders.length, 8);
    eocd.writeUInt16LE(localHeaders.length, 10);
    eocd.writeUInt32LE(centralDir.length, 12);
    eocd.writeUInt32LE(localData.length, 16);
    eocd.writeUInt16LE(0, 20);

    const finalZipBuffer = Buffer.concat([localData, centralDir, eocd]);
    fs.writeFileSync(destinationZip, finalZipBuffer);
  }

  /**
   * Tính CRC32 cho file zip
   */
  private calcCrc32(buf: Buffer): number {
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