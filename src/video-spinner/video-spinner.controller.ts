import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { Request } from 'express';
import { VideoSpinnerService } from './video-spinner.service';
import { SpinVideoDto } from './video-spinner.dto';

// Tạo thư mục tạm lưu file upload
const tempUploadDir = path.join(process.cwd(), 'uploads', 'temp');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

@Controller('video-spinner')
export class VideoSpinnerController {
  constructor(private readonly videoSpinnerService: VideoSpinnerService) {}

  @Post('spin')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: tempUploadDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname) || '.mp4';
          cb(null, `original-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 300 * 1024 * 1024, // Giới hạn tối đa 300MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.includes('video') && !file.originalname.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
          return cb(new BadRequestException('Chỉ chấp nhận file định dạng video (.mp4, .mov, .avi, .webm)!'), false);
        }
        cb(null, true);
      },
    })
  )
  async spinVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SpinVideoDto,
    @Req() req: Request
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn 1 file video để tải lên!');
    }

    // Tự động nhận diện domain của backend (ví dụ: https://api.kpost.vn)
    const protocol = req.protocol;
    const host = req.get('host');
    const serverBaseUrl = `${protocol}://${host}`;

    const result = await this.videoSpinnerService.spinVideo(file, dto, serverBaseUrl);

    return {
      success: true,
      message: `Đã nhân bản thành công ${result.totalSpun} video độc nhất!`,
      data: result,
    };
  }
}