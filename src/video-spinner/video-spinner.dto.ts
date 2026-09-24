export class SpinVideoDto {
  // Số lượng video muốn nhân bản ra (Mặc định: 5 video, tối đa ví dụ: 20)
  count?: number;

  // Lật gương video (flip ngang) - Có/Không
  flip?: boolean | string;

  // Thay đổi tốc độ vi mô (0.98x - 1.02x)
  changeSpeed?: boolean | string;

  // Tinh chỉnh nhẹ màu sắc (Contrast/Saturation/Brightness ±2%)
  changeColor?: boolean | string;

  // Zoom nhẹ và crop (1.01x - 1.03x) để làm lệch toạ độ pixel
  microZoom?: boolean | string;

  // Thay đổi nhẹ cao độ âm thanh (Audio pitch / tempo)
  changeAudio?: boolean | string;

  // Chèn lớp noise ngẫu nhiên siêu mờ chống quét hash MD5/SHA256
  addNoise?: boolean | string;

  // Tiêu đề/Prefix cho video
  prefixName?: string;
}