import { Module } from '@nestjs/common';
import { VideoSpinnerController } from './video-spinner.controller';
import { VideoSpinnerService } from './video-spinner.service';

@Module({
  controllers: [VideoSpinnerController],
  providers: [VideoSpinnerService],
  exports: [VideoSpinnerService],
})
export class VideoSpinnerModule {}