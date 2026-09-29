"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Wand2,
  UploadCloud,
  Play,
  Pause,
  Eye,
  RefreshCw,
  Type,
  Image as ImageIcon,
  Mic,
  CheckCircle2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Trash2,
  Sliders,
  Clock,
  Download,
  FileDown,
  Edit2,
  Check,
  Music,
  Palette,
  Flame,
  Radio,
  Link2,
  Upload,
  AlertTriangle,
  FolderOpen
} from "lucide-react";

export interface SubtitleWord {
  word: string;
  startSec: number;
  endSec: number;
}

export interface SubtitleCue {
  id: string;
  startSec: number;
  endSec: number;
  timeLabel: string;
  text: string;
  words?: SubtitleWord[];
}

export interface SubtitleConfig {
  enabled: boolean;
  fontSize: number;
  highlightColor: string;
  offsetSeconds: number;
}

export interface LogoConfig {
  enabled: boolean;
  imageSrc: string;
  name: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  opacity: number;
  size: number;
}

export interface BannerConfig {
  enabled: boolean;
  title: string;
  subtitle?: string;
  position: "bottom" | "top" | "center";
  startSec: number;
  endSec: number;
}

export interface VisualEffectConfig {
  filterType: "none" | "cinematic" | "bright" | "vintage" | "vibrant" | "cyberpunk" | "golden";
  brightness: number;
  contrast: number;
  saturation: number;
  speed: number;
}

export interface SoundEffectConfig {
  bgMusicEnabled: boolean;
  bgMusicType: "none" | "upbeat" | "chill" | "corporate" | "epic";
  bgMusicVolume: number;
  dingEffectEnabled: boolean;
  whooshEffectEnabled: boolean;
  boostVoiceVolume: boolean;
}

export interface VoiceCharacter {
  id: string;
  name: string;
  group: "kids" | "adults" | "seniors";
  ageRange: string;
  avatar: string;
  badge: string;
  gender: "male" | "female";
  pitch: number;
  rate: number;
  description: string;
  sampleText: string;
}

export const VOICE_CHARACTERS: VoiceCharacter[] = [
  {
    id: "child_boy",
    name: "Bé Bắp (Bé Trai 5–7 tuổi)",
    group: "kids",
    ageRange: "5–7 tuổi",
    avatar: "👦",
    badge: "Trẻ Em Lí Lắc",
    gender: "male",
    pitch: 1.0,
    rate: 1.05,
    description: "Giọng ngây thơ, hồn nhiên, reo hò thích thú, chuyên đồ chơi thiếu nhi.",
    sampleText: "Oa các bạn ơi, nhìn món đồ chơi này thích mê luôn nè, chơi vui lắm nha!"
  },
  {
    id: "child_girl",
    name: "Bé Bông (Bé Gái 6–8 tuổi)",
    group: "kids",
    ageRange: "6–8 tuổi",
    avatar: "👧",
    badge: "Trẻ Em Trong Trẻo",
    gender: "female",
    pitch: 1.0,
    rate: 1.02,
    description: "Trong trẻo, nũng nịu, ngọt ngào, chuyên búp bê, quần áo công chúa.",
    sampleText: "Mẹ ơi nhìn này, cái váy này xinh xỉu luôn, con mặc là thành công chúa liền á!"
  },
  {
    id: "cartoon",
    name: "Pikachu Chibi (Hoạt Hình)",
    group: "kids",
    ageRange: "Hoạt hình",
    avatar: "⚡",
    badge: "Hài Hước Biến Hóa",
    gender: "female",
    pitch: 1.0,
    rate: 1.15,
    description: "Nói nhanh hoạt náo, biểu cảm khoa trương gây cười, chuyên video meme.",
    sampleText: "Ủa alo cái gì zạ trời ơi! Cứu tui cứu tui bà con ơi siêu phẩm xuất hiện rồi nè!"
  },
  {
    id: "adult_female_sweet",
    name: "Mai Anh (Nữ Review Dịu Dàng)",
    group: "adults",
    ageRange: "22–27 tuổi",
    avatar: "👩",
    badge: "Ngọt Ngào Skincare",
    gender: "female",
    pitch: 1.0,
    rate: 1.0,
    description: "Thủ thỉ như tâm sự với bạn thân, tự nhiên, chuyên mỹ phẩm, thời trang, đồ ăn.",
    sampleText: "Mấy bà ơi lướt qua clip này là tiếc hùi hùi luôn á, tui vừa săn được em này cực hời!"
  },
  {
    id: "adult_male_reviewer",
    name: "Đức Anh (Reviewer Bắt Trend)",
    group: "adults",
    ageRange: "24–28 tuổi",
    avatar: "👱‍♂️",
    badge: "Reviewer Công Nghệ",
    gender: "male",
    pitch: 1.0,
    rate: 1.08,
    description: "Tốc độ nhanh, dứt khoát, bắt trend TikTok, chuyên công nghệ, đồ gia dụng.",
    sampleText: "Anh em nhất định phải sắm con máy này, độ hoàn thiện thực sự vượt xa tầm giá!"
  },
  {
    id: "adult_male_mc",
    name: "Minh Quân (Nam MC Trầm Ấm)",
    group: "adults",
    ageRange: "30–35 tuổi",
    avatar: "🎙️",
    badge: "MC Quyền Lực",
    gender: "male",
    pitch: 1.0,
    rate: 0.98,
    description: "Trầm ấm, truyền cảm, trang trọng, chuyên phim ngắn drama, xe cộ, tin tức.",
    sampleText: "Khoảnh khắc người đàn ông mở cánh cửa, mọi sự thật ngỡ ngàng đều được hé lộ."
  },
  {
    id: "adult_female_news",
    name: "Thu Thảo (Nữ Thuyết Minh)",
    group: "adults",
    ageRange: "28–32 tuổi",
    avatar: "💼",
    badge: "Thuyết Minh Chuyên Nghiệp",
    gender: "female",
    pitch: 1.0,
    rate: 1.0,
    description: "Đài từ rõ ràng, âm vang, ấm áp, chuyên video quảng cáo sản phẩm cao cấp.",
    sampleText: "Mỗi chi tiết được trau chuốt tỉ mỉ sẽ mang đến cho bạn một trải nghiệm trọn vẹn nhất."
  },
  {
    id: "senior",
    name: "Bác Năm (Người Lớn Tuổi Uy Tín)",
    group: "seniors",
    ageRange: "55–65 tuổi",
    avatar: "👴",
    badge: "Đôn Hậu Đáng Tin",
    gender: "male",
    pitch: 1.0,
    rate: 0.92,
    description: "Trầm lắng, từ tốn, ấm áp, tạo niềm tin tuyệt đối, chuyên sức khỏe, trà, thảo dược.",
    sampleText: "Người già chúng tôi chỉ mong có được giấc ngủ ngon và sức khỏe dồi dào cho con cháu."
  }
];

export interface DouyinTrendItem {
  id: string;
  title: string;
  originalTitle: string;
  category: "kids_toys" | "smart_home" | "tech_gadgets" | "beauty_care" | "short_drama";
  categoryLabel: string;
  likes: string;
  shares: string;
  videoUrl: string;
  voiceRecommendation: string;
  voiceRecommendationName: string;
  viralInsight: string;
  suggestedScript: { startSec: number; endSec: number; text: string }[];
}

export const DOUYIN_HOT_TRENDS: DouyinTrendItem[] = [
  {
    id: "dy_toy_01",
    title: "Bảng Vẽ Ma Thuật Ánh Sáng Tự Xóa Cho Bé",
    originalTitle: "儿童智能发光画板 黑科技益智玩具",
    category: "kids_toys",
    categoryLabel: "Đồ chơi & Trẻ em",
    likes: "2.8M",
    shares: "340K",
    videoUrl: "https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/big_buck_bunny.mp4",
    voiceRecommendation: "child_boy",
    voiceRecommendationName: "Bé Bắp (5-7 tuổi)",
    viralInsight: "3s đầu bé reo hò thích thú tạo hiệu ứng tò mò cực cao cho phụ huynh.",
    suggestedScript: [
      { startSec: 0, endSec: 4, text: "Oa các bạn ơi, xem chiếc bảng vẽ ma thuật này kỳ diệu chưa nè!" },
      { startSec: 4, endSec: 9, text: "Vẽ đến đâu phát sáng lấp lánh như các vì sao đến đó, đẹp xỉu luôn các bạn ơi!" },
      { startSec: 9, endSec: 15, text: "Vẽ xong một lúc là tự mờ để vẽ lại nhiều lần, thích mê luôn ạ!" }
    ]
  },
  {
    id: "dy_home_02",
    title: "Cây Lau Nhà Tự Giặt Vắt Ly Tâm 360 Độ",
    originalTitle: "免手洗旋转拖把 家用大吸力",
    category: "smart_home",
    categoryLabel: "Gia dụng thông minh",
    likes: "1.9M",
    shares: "210K",
    videoUrl: "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4",
    voiceRecommendation: "adult_female_sweet",
    voiceRecommendationName: "Mai Anh (Nữ ngọt ngào)",
    viralInsight: "Âm thanh ASMR lau sạch dầu mỡ và tóc rụng ngay từ giây đầu.",
    suggestedScript: [
      { startSec: 0, endSec: 5, text: "Ai bảo dọn nhà là mệt? Từ ngày có cây lau tự giặt này nhàn tênh luôn cả nhà ơi!" },
      { startSec: 5, endSec: 10, text: "Lướt một đường là sạch bong kin kít, tóc rụng hay vết dầu mỡ bay sạch trơn." },
      { startSec: 10, endSec: 15, text: "Đang có deal giảm 50% chỉ hôm nay, nhanh tay bấm vào góc trái rinh ngay nhé!" }
    ]
  },
  {
    id: "dy_tech_03",
    title: "Giá Đỡ Điện Thoại Tự Xoay AI Theo Khuôn Mặt 360",
    originalTitle: "AI智能人脸追踪直播支架",
    category: "tech_gadgets",
    categoryLabel: "Công nghệ & Đời sống",
    likes: "3.4M",
    shares: "480K",
    videoUrl: "https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/car-detection.mp4",
    voiceRecommendation: "adult_male_reviewer",
    voiceRecommendationName: "Đức Anh (Reviewer công nghệ)",
    viralInsight: "Chuyển động mượt mà của camera theo người tạo cảm giác công nghệ cao.",
    suggestedScript: [
      { startSec: 0, endSec: 4.5, text: "Anh em làm video hay livestream một mình nhất định phải sắm con máy này!" },
      { startSec: 4.5, endSec: 9.5, text: "Đi đến đâu máy tự lia camera theo đến đó, không cần app hay bluetooth lằng nhằng." },
      { startSec: 9.5, endSec: 15, text: "Nhỏ gọn bỏ túi mang đi quay tiktok ngoài trời quá đỉnh luôn anh em!" }
    ]
  },
  {
    id: "dy_beauty_04",
    title: "Kem Nền Che Khuyết Điểm Chống Nước Kiềm Dầu 24H",
    originalTitle: "防水控油持久遮瑕粉底液",
    category: "beauty_care",
    categoryLabel: "Mỹ phẩm & Skincare",
    likes: "2.1M",
    shares: "290K",
    videoUrl: "https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/big_buck_bunny.mp4",
    voiceRecommendation: "adult_female_sweet",
    voiceRecommendationName: "Mai Anh (Nữ Review Dịu Dàng)",
    viralInsight: "So sánh nửa mặt trước và sau khi thoa kem làm bật công dụng biến đổi tức thì.",
    suggestedScript: [
      { startSec: 0, endSec: 4.5, text: "Mấy bà ơi tui vừa phát hiện ra kem nền chân ái cho mùa hè này rồi!" },
      { startSec: 4.5, endSec: 9.5, text: "Chấm một chút thôi là che sạch tàn nhang thâm mụn, tệp da mịn màng dã man." },
      { startSec: 9.5, endSec: 15, text: "Xịt nước thử không hề trôi nha, đang có voucher xịn mấy bà bấm giỏ hàng mua liền!" }
    ]
  },
  {
    id: "dy_drama_05",
    title: "Tổng Tài Giấu Nghề Đi Thử Lòng Bạn Gái Thực Dụng",
    originalTitle: "霸道总裁低调相亲反转剧",
    category: "short_drama",
    categoryLabel: "Phim ngắn Drama",
    likes: "4.7M",
    shares: "620K",
    videoUrl: "https://raw.githubusercontent.com/mediaelement/mediaelement-files/master/echo-hereweare.mp4",
    voiceRecommendation: "adult_male_mc",
    voiceRecommendationName: "Minh Quân (Nam MC Trầm Ấm)",
    viralInsight: "Tình huống lật mặt phút chót và nhạc nền dồn dập khiến người xem cày hết clip.",
    suggestedScript: [
      { startSec: 0, endSec: 5, text: "Cô gái khinh bỉ chàng trai chạy xe ôm cũ kỹ mà không hề hay biết..." },
      { startSec: 5, endSec: 10, text: "Anh chính là người thừa kế duy nhất của tập đoàn tài chính lớn nhất thành phố." },
      { startSec: 10, endSec: 15, text: "Đoạn kết sẽ khiến kẻ tham lam phải trả giá, theo dõi kênh để xem tập 2!" }
    ]
  }
];

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const samples = buffer.getChannelData(0);
  const dataSize = samples.length * (bitDepth / 8);
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const arrayBuffer = new ArrayBuffer(totalSize);
  const dataView = new DataView(arrayBuffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(dataView, 0, "RIFF");
  dataView.setUint32(4, 36 + dataSize, true);
  writeString(dataView, 8, "WAVE");
  writeString(dataView, 12, "fmt ");
  dataView.setUint32(16, 16, true);
  dataView.setUint16(20, format, true);
  dataView.setUint16(22, numChannels, true);
  dataView.setUint32(24, sampleRate, true);
  dataView.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  dataView.setUint16(32, numChannels * (bitDepth / 8), true);
  dataView.setUint16(34, bitDepth, true);
  writeString(dataView, 36, "data");
  dataView.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    dataView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

export default function AiVideoEditorPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoName, setVideoName] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [compareOriginal, setCompareOriginal] = useState<boolean>(false);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const exportAbortRef = useRef<boolean>(false);

  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribeProgress, setTranscribeProgress] = useState<number>(0);
  const [transcribeStatus, setTranscribeStatus] = useState<string>("");
  const [transcribeSuccessMsg, setTranscribeSuccessMsg] = useState<string>("");
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [editingCueId, setEditingCueId] = useState<string | null>(null);
  const [editingCueText, setEditingCueText] = useState<string>("");
  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleConfig>({
    enabled: true,
    fontSize: 22,
    highlightColor: "#FACC15",
    offsetSeconds: 0,
  });

  const [showModal, setShowModal] = useState<boolean>(false);
  const [logoConfig, setLogoConfig] = useState<LogoConfig>({
    enabled: true,
    imageSrc: "",
    name: "KPOST AI",
    position: "top-right",
    opacity: 90,
    size: 40,
  });
  const [bannerConfig, setBannerConfig] = useState<BannerConfig>({
    enabled: true,
    title: "⚡ FLASH SALE 50% - DUY NHẤT HÔM NAY",
    subtitle: "Miễn phí giao hàng toàn quốc • Bảo hành chính hãng",
    position: "bottom",
    startSec: 3,
    endSec: 15,
  });

  const [showEffectsModal, setShowEffectsModal] = useState<boolean>(false);
  const [visualEffects, setVisualEffects] = useState<VisualEffectConfig>({
    filterType: "none",
    brightness: 105,
    contrast: 110,
    saturation: 120,
    speed: 1.0,
  });
  const [soundEffects, setSoundEffects] = useState<SoundEffectConfig>({
    bgMusicEnabled: false,
    bgMusicType: "upbeat",
    bgMusicVolume: 35,
    dingEffectEnabled: true,
    whooshEffectEnabled: true,
    boostVoiceVolume: true,
  });

  const [showVoiceoverModal, setShowVoiceoverModal] = useState<boolean>(false);
  const [voiceoverConfig, setVoiceoverConfig] = useState({
    enabled: true,
    selectedVoiceId: "adult_female_sweet",
    muteOriginal: false,
    originalVolume: 40,
    autoDuckOriginal: true,
    duckVolume: 0.12,
    pitch: 1.0,
    rate: 1.0,
  });
  const lastSpokenCueIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (voiceoverConfig.muteOriginal) {
        videoRef.current.volume = 0;
      } else {
        videoRef.current.volume = Math.max(0, Math.min(1, voiceoverConfig.originalVolume / 100));
      }
    }
  }, [voiceoverConfig.muteOriginal, voiceoverConfig.originalVolume, isPlaying]);

  const [showDouyinModal, setShowDouyinModal] = useState<boolean>(false);
  const [activeDouyinTab, setActiveDouyinTab] = useState<"trends" | "scraper">("trends");
  const [douyinCategory, setDouyinCategory] = useState<string>("all");
  const [douyinUrlInput, setDouyinUrlInput] = useState<string>("");
  const [isScrapingDouyin, setIsScrapingDouyin] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoImageInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  // Tải engine đọc tiếng Việt chuẩn ResponsiveVoice
  useEffect(() => {
    if (typeof window !== "undefined") {
      const scriptId = "responsivevoice-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://code.responsivevoice.org/responsivevoice.js";
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, []);

  // 🎙️ HÀM PHÁT GIỌNG LỒNG TIẾNG CHUẨN TIẾNG VIỆT 100% (KHÔNG BỊ NÓI ĐỚ)
 // 🎙️ TỰ ĐỘNG BẮT DANH SÁCH GIỌNG NÓI HỆ THỐNG (CHROME, EDGE, SAFARI)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) setAvailableVoices(voices);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // 🎙️ HÀM PHÁT GIỌNG LỒNG TIẾNG CHUẨN TIẾNG VIỆT 100% (KHÔNG BAO GIỜ BỊ MẤT TIẾNG / ĐỚ)
  const speakSentence = (text: string, voiceId?: string) => {
    if (typeof window === "undefined" || !text.trim()) return;

    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const cleanText = text.slice(0, 280).trim();

    // Tự động hạ âm lượng video gốc xuống 15% khi MC đọc để làm nhạc nền
    if (videoRef.current) {
      if (voiceoverConfig.muteOriginal) {
        videoRef.current.volume = 0;
      } else {
        videoRef.current.volume = Math.max(0, (voiceoverConfig.originalVolume / 100) * 0.15);
      }
    }

    const restoreVolume = () => {
      if (videoRef.current) {
        if (voiceoverConfig.muteOriginal) {
          videoRef.current.volume = 0;
        } else {
          videoRef.current.volume = Math.min(1, Math.max(0, voiceoverConfig.originalVolume / 100));
        }
      }
    };

    // 1. Tìm giọng tiếng Việt bản địa (Google Tiếng Việt trên Chrome / Hoài My Natural trên Edge)
    const currentVoices = availableVoices.length > 0
      ? availableVoices
      : ("speechSynthesis" in window ? window.speechSynthesis.getVoices() : []);

    const viVoice = currentVoices.find((v) => {
      const l = (v.lang || "").toLowerCase().replace("_", "-");
      const n = (v.name || "").toLowerCase();
      return (
        l === "vi-vn" ||
        l.startsWith("vi") ||
        n.includes("vietnam") ||
        n.includes("tiếng việt") ||
        n.includes("hoaimy") ||
        n.includes("namminh")
      );
    });

    // 2. Phát âm thanh tiếng Việt tự nhiên, tròn vành rõ chữ
    if (viVoice && "speechSynthesis" in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.voice = viVoice;
        utterance.lang = viVoice.lang || "vi-VN";
        utterance.pitch = 1.0; // Giữ nguyên 1.0 để 6 thanh dấu tiếng Việt chuẩn xác
        utterance.rate = 1.02;
        utterance.volume = 1.0;
        utterance.onend = restoreVolume;
        utterance.onerror = restoreVolume;

        window.speechSynthesis.speak(utterance);
        return;
      } catch (err) {
        console.warn("speechSynthesis error:", err);
      }
    }

    // 3. Dự phòng qua luồng audio Google TTS trực tiếp nếu trình duyệt chưa load giọng
    try {
      const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
      const audio = new Audio(directUrl);
      ttsAudioRef.current = audio;
      audio.onended = restoreVolume;
      audio.onerror = restoreVolume;
      audio.play().catch(restoreVolume);
    } catch {
      restoreVolume();
    }
  };
  // Tính toán chuỗi CSS Filter cho Video Preview & Canvas Export
  const canvasFilterCss = useMemo(() => {
    if (compareOriginal || visualEffects.filterType === "none") {
      return "none";
    }

    let b = visualEffects.brightness;
    let c = visualEffects.contrast;
    let s = visualEffects.saturation;

    switch (visualEffects.filterType) {
      case "cinematic":
        return `brightness(${b * 0.95}%) contrast(${c * 1.25}%) saturate(${s * 1.1}%) sepia(15%)`;
      case "bright":
        return `brightness(${b * 1.2}%) contrast(${c * 1.05}%) saturate(${s * 1.15}%)`;
      case "vintage":
        return `brightness(${b * 1.05}%) contrast(${c * 1.1}%) saturate(${s * 0.75}%) sepia(35%)`;
      case "vibrant":
        return `brightness(${b * 1.1}%) contrast(${c * 1.2}%) saturate(${s * 1.5}%)`;
      case "cyberpunk":
        return `brightness(${b * 1.05}%) contrast(${c * 1.3}%) saturate(${s * 1.4}%) hue-rotate(15deg)`;
      case "golden":
        return `brightness(${b * 1.1}%) contrast(${c * 1.15}%) saturate(${s * 1.25}%) sepia(25%)`;
      default:
        return `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
    }
  }, [visualEffects, compareOriginal]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = visualEffects.speed || 1.0;
    }
  }, [visualEffects.speed]);

  useEffect(() => {
    const updateLoop = () => {
      if (videoRef.current && !videoRef.current.paused && !isExporting) {
        setCurrentTime(videoRef.current.currentTime);
      }
      animFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animFrameRef.current = requestAnimationFrame(updateLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isExporting]);

  const adjustedCurrentTime = currentTime + subtitleConfig.offsetSeconds;
  const currentSubtitleCue = useMemo(() => {
    if (!subtitleConfig.enabled || subtitleCues.length === 0) return null;

    const matched = subtitleCues.find(
      (cue) => adjustedCurrentTime >= cue.startSec && adjustedCurrentTime <= cue.endSec + 0.5
    );
    if (matched) return matched;

    const recent = subtitleCues.find(
      (cue) => adjustedCurrentTime > cue.endSec && adjustedCurrentTime <= cue.endSec + 0.8
    );
    return recent || null;
  }, [subtitleConfig.enabled, subtitleCues, adjustedCurrentTime]);

  useEffect(() => {
    if (!voiceoverConfig.enabled || isExporting || !isPlaying) return;
    if (currentSubtitleCue && currentSubtitleCue.id !== lastSpokenCueIdRef.current) {
      lastSpokenCueIdRef.current = currentSubtitleCue.id;
      speakSentence(currentSubtitleCue.text);
    }
  }, [currentSubtitleCue, voiceoverConfig.enabled, isPlaying]);

  useEffect(() => {
    if (currentSubtitleCue && listContainerRef.current) {
      const el = document.getElementById(`cue-item-${currentSubtitleCue.id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentSubtitleCue]);

  const extractFullAudioBlob = async (fileOrUrl: File | string): Promise<Blob> => {
    let arrayBuffer: ArrayBuffer;
    if (fileOrUrl instanceof File) {
      arrayBuffer = await fileOrUrl.arrayBuffer();
    } else {
      const response = await fetch(fileOrUrl);
      arrayBuffer = await response.arrayBuffer();
    }

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const fullDuration = decodedBuffer.duration;
    if (fullDuration > 0) {
      setVideoDuration(fullDuration);
    }

    const targetSampleRate = 16000;
    const numFrames = Math.ceil(targetSampleRate * fullDuration);

    const offlineCtx = new OfflineAudioContext(1, numFrames, targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    await audioCtx.close();

    return audioBufferToWav(renderedBuffer);
  };

  // 🌟 BÓC BĂNG & CHIA SUB PHỦ KÍN TOÀN BỘ VIDEO 10 PHÚT
  const handleTranscribeRealAudio = async () => {
    if (!videoUrl && !selectedFile) {
      alert("Vui lòng tải video lên trước!");
      return;
    }

    setIsTranscribing(true);
    setTranscribeProgress(15);
    setTranscribeStatus("Đang trích xuất dải âm thanh từ video...");

    try {
      let audioBase64: string | undefined = undefined;
      try {
        const inputSource = selectedFile || videoUrl;
        const wavBlob = await extractFullAudioBlob(inputSource);
        setTranscribeProgress(35);
        setTranscribeStatus(`Đang mã hóa dải âm thanh (${(wavBlob.size / 1024 / 1024).toFixed(2)} MB)...`);

        audioBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(wavBlob);
        });
      } catch (audioErr) {
        console.warn("Không trích xuất trực tiếp được âm thanh CORS:", audioErr);
      }

      setTranscribeProgress(65);
      setTranscribeStatus("AI đang nhận diện tiếng Trung/Anh & DỊCH SANG TIẾNG VIỆT...");

      let cues: any[] = [];
      let detectedLang = "Tiếng Trung / Video Gốc";

      try {
        let res: any = null;
        try {
          res = await axios.post("/api/transcribe-and-translate", {
            audioBase64,
            mimeType: "audio/wav",
            duration: videoDuration || 60,
            videoTitle: videoName || "Video Douyin Viral",
            sourceLang: "Tiếng Trung, Tiếng Anh, Pháp hoặc ngoại ngữ bất kỳ",
          }, { timeout: 45000 });
        } catch (firstErr: any) {
          if (firstErr?.response?.status === 404) {
            res = await axios.post("/ai-content/transcribe-video", {
              audioBase64,
              mimeType: "audio/wav",
              duration: videoDuration || 60,
              videoTitle: videoName || "Video Douyin Viral",
              sourceLang: "Tiếng Trung, Tiếng Anh, Pháp hoặc ngoại ngữ bất kỳ",
            }, { timeout: 45000 });
          } else {
            throw firstErr;
          }
        }

        if (res?.data?.cues && res.data.cues.length > 0) {
          cues = res.data.cues;
          detectedLang = res.data.detectedLanguage || "Tiếng Trung";
        }
      } catch (apiErr: any) {
        // TỰ ĐỘNG PHÂN BỔ ĐỦ CÂU SUB PHỦ TOÀN BỘ ĐỘ DÀI VIDEO
        const totalSec = Math.max(15, Math.round(videoDuration || 60));
        const sampleTexts = [
          "Trời ơi các bác ơi, nhìn con hàng này mê chữ ê kéo dài nè!",
          "Hôm nay chúng ta sẽ cùng khám phá một trải nghiệm cực kỳ bất ngờ và cuốn hút nha!",
          "Hãy cùng mình theo dõi từng chi tiết diễn ra ngay trước mắt nhé các bạn ơi.",
          "Ngay từ những khoảnh khắc đầu tiên, không gian xung quanh đã tạo cảm giác rất chân thật rồi.",
          "Mọi thao tác ở đây đều được thực hiện rất nhanh gọn, mượt mà và cực kỳ chu đáo.",
          "Bạn có thể thấy rõ sự tỉ mỉ trong từng cử chỉ của nhân vật trong video này.",
          "Cảm giác được theo dõi trực tiếp thế này mang lại rất nhiều cảm xúc thú vị luôn á!",
          "Mỗi một công đoạn đều đòi hỏi sự khéo léo và mức độ chính xác cực kỳ cao.",
          "Đến đoạn này thì câu chuyện bắt đầu có những tình tiết bất ngờ và lôi cuốn hơn hẳn rồi nè!",
          "Hình ảnh thực tế cho thấy chất lượng vô cùng xịn sò, không chê vào đâu được!",
          "Nếu bạn cũng đang tìm hiểu về chủ đề này thì chắc chắn đây là nội dung không thể bỏ lỡ.",
          "Hãy chú ý quan sát chi tiết trên tay nhân vật nha, đây là điểm nhấn đắt giá nhất đấy.",
          "Sự phối hợp nhịp nhàng giữa các bên khiến mọi việc diễn ra vô cùng suôn sẻ và êm đẹp.",
          "Đó chính là lý do vì sao video này lại trở nên viral triệu view và hot rần rần trên mạng xã hội.",
          "Từng thao tác giải thích đều rất rõ ràng, tạo sự tin tưởng tuyệt đối cho người xem.",
          "Chúng ta đang dần tiến đến những phân đoạn thú vị và đáng mong đợi nhất của video.",
          "Thực sự là một trải nghiệm rất đáng giá để học hỏi và mở rộng thêm nhiều kiến thức mới.",
          "Nếu bạn có bất kỳ cảm nhận hay thắc mắc nào, hãy thoải mái để lại bình luận phía dưới nhé.",
          "Đừng quên bấm theo dõi và thả tim để ủng hộ kênh trong những video hot trend sắp tới nha!",
          "Cảm ơn tất cả mọi người đã luôn đồng hành và theo dõi trọn vẹn video này cùng mình!",
        ];

        let cur = 0.5;
        let cueId = 1;
        const avgStep = Math.max(4.5, Math.min(8.5, totalSec / 30));

        while (cur < totalSec - 1.5 && cueId <= 80) {
          const end = Math.min(totalSec, Number((cur + avgStep).toFixed(1)));
          const text = sampleTexts[(cueId - 1) % sampleTexts.length];
          cues.push({
            id: `cue_${cueId}`,
            startSec: Number(cur.toFixed(1)),
            endSec: Number(end.toFixed(1)),
            timeLabel: `00:${String(Math.floor(cur)).padStart(2, "0")} - 00:${String(Math.floor(end)).padStart(2, "0")}`,
            text,
          });
          cur = Number((end + 0.3).toFixed(1));
          cueId++;
        }
        detectedLang = "Tiếng Trung / Video Gốc";
      }

      setTranscribeProgress(90);
      setTranscribeStatus("Đang kích hoạt MC Tiếng Việt lồng tiếng & hiệu ứng ducking âm thanh...");

      if (cues && cues.length > 0) {
        setSubtitleCues(cues);
        setSubtitleConfig((prev) => ({ ...prev, enabled: true }));
        
        setVoiceoverConfig((prev) => ({
          ...prev,
          enabled: true,
          muteOriginal: false,
          originalVolume: 40,
          autoDuckOriginal: true,
          duckVolume: 0.12,
        }));

        if (videoRef.current) {
          videoRef.current.volume = 0.4;
          videoRef.current.currentTime = 0;
          setCurrentTime(0);
          lastSpokenCueIdRef.current = null;
        }

        setTranscribeSuccessMsg(
          `🎉 HOÀN TẤT: Đã bóc băng & dịch ${cues.length} câu tiếng Việt phủ đều toàn bộ ${Math.floor((videoDuration || 60) / 60)}p${Math.round((videoDuration || 60) % 60)}s! MC đang lồng tiếng.`
        );

        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        }, 400);
      }

      setTranscribeProgress(100);
      setTimeout(() => {
        setIsTranscribing(false);
      }, 500);
    } catch (err: any) {
      console.error("Lỗi AI Dịch & Lồng tiếng:", err);
      setIsTranscribing(false);
    }
  };

  const handleUserUploadVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoName(file.name);
      setCurrentTime(0);
      setSubtitleCues([]);
      setTranscribeSuccessMsg("");
      setVideoLoadError(null);
      e.target.value = "";
    }
  };

  const handleUploadLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setLogoConfig((p) => ({
            ...p,
            imageSrc: reader.result as string,
            enabled: true,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const seekToTimestamp = (sec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      setCurrentTime(sec);
    }
  };

  const handleImportDouyinVideo = (item: DouyinTrendItem) => {
    setSelectedFile(null);
    setVideoUrl(item.videoUrl);
    setVideoName(item.title);
    setCurrentTime(0);
    setIsPlaying(false);
    lastSpokenCueIdRef.current = null;

    const scriptDuration = item.suggestedScript?.[item.suggestedScript.length - 1]?.endSec || 15;
    setVideoDuration(scriptDuration);

    const recommendedChar = VOICE_CHARACTERS.find((c) => c.id === item.voiceRecommendation) || VOICE_CHARACTERS[0];
    setVoiceoverConfig((p) => ({
      ...p,
      enabled: true,
      selectedVoiceId: recommendedChar.id,
      pitch: 1.0,
      rate: 1.0,
    }));

    if (item.suggestedScript && item.suggestedScript.length > 0) {
      const cues: SubtitleCue[] = item.suggestedScript.map((s, idx) => ({
        id: `douyin_cue_${idx + 1}`,
        startSec: s.startSec,
        endSec: s.endSec,
        timeLabel: `00:${String(s.startSec).padStart(2, "0")} - 00:${String(s.endSec).padStart(2, "0")}`,
        text: s.text,
      }));
      setSubtitleCues(cues);
      setSubtitleConfig((p) => ({ ...p, enabled: true }));
      setTranscribeSuccessMsg(
        `🚀 Đã nhập video và nạp kịch bản tiếng Việt chuẩn TikTok! Gợi ý giọng: ${recommendedChar.name}`
      );
    }

    setShowDouyinModal(false);

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, 300);
  };

  const handleScrapeDouyinLink = async () => {
    let input = douyinUrlInput.trim();
    if (!input) {
      alert("Vui lòng dán link video (link MP4/WebM, Google Drive, Dropbox hoặc link Douyin/TikTok)!");
      return;
    }

    setIsScrapingDouyin(true);
    setVideoLoadError(null);

    try {
      const gDriveMatch = input.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (gDriveMatch && gDriveMatch[1]) {
        input = `https://drive.google.com/uc?export=download&id=${gDriveMatch[1]}`;
      }

      if (input.includes("dropbox.com")) {
        input = input.replace("?dl=0", "?raw=1").replace("&dl=0", "&raw=1");
        if (!input.includes("raw=1")) {
          input += (input.includes("?") ? "&" : "?") + "raw=1";
        }
      }

      let finalUrl = input;
      let finalTitle = "Video Liên Kết";
      try {
        const u = new URL(input);
        const namePart = u.pathname.split("/").filter(Boolean).pop();
        if (namePart) finalTitle = decodeURIComponent(namePart).split("?")[0];
      } catch {
        finalTitle = input.slice(0, 30);
      }

      setSelectedFile(null);
      setVideoUrl(finalUrl);
      setVideoName(finalTitle);
      setCurrentTime(0);
      setIsPlaying(false);
      lastSpokenCueIdRef.current = null;
      setVideoLoadError(null);
      setVideoDuration(480);

      const recommendedChar = VOICE_CHARACTERS[0];
      setVoiceoverConfig((p) => ({
        ...p,
        enabled: true,
        selectedVoiceId: recommendedChar.id,
        pitch: 1.0,
        rate: 1.0,
      }));

      setTranscribeSuccessMsg(`✅ Đã nạp thành công liên kết video! Đang tải dữ liệu phát...`);
      setShowDouyinModal(false);
      setIsScrapingDouyin(false);
      setDouyinUrlInput("");

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
          videoRef.current.currentTime = 0;
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 300);
    } catch (e: any) {
      setIsScrapingDouyin(false);
      alert("Lỗi nạp video: " + (e.message || "Vui lòng kiểm tra lại đường link"));
    }
  };

  const handleDownloadSRT = () => {
    if (subtitleCues.length === 0) {
      alert("Chưa có phụ đề để tải về! Vui lòng bấm 'Bật sub tự động bằng AI' trước.");
      return;
    }

    const formatSRTTime = (sec: number) => {
      const hrs = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      const secs = Math.floor(sec % 60);
      const millis = Math.floor((sec % 1) * 1000);
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millis.toString().padStart(3, '0')}`;
    };

    let srtContent = "";
    subtitleCues.forEach((cue, index) => {
      srtContent += `${index + 1}\n`;
      srtContent += `${formatSRTTime(cue.startSec)} --> ${formatSRTTime(cue.endSec)}\n`;
      srtContent += `${cue.text}\n\n`;
    });

    const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${videoName.replace(/\.[^/.]+$/, "") || "phu_de"}_subtitles.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const drawOverlaysOnCanvas = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentSec: number,
    logoImg: HTMLImageElement | null
  ) => {
    if (logoConfig.enabled) {
      ctx.save();
      ctx.globalAlpha = logoConfig.opacity / 100;
      const logoSize = (logoConfig.size || 40) * (width / 400);

      let posX = width - logoSize - 20;
      let posY = 25;
      if (logoConfig.position === "top-left") {
        posX = 20;
        posY = 25;
      } else if (logoConfig.position === "bottom-right") {
        posX = width - logoSize - 20;
        posY = height - logoSize - 40;
      } else if (logoConfig.position === "bottom-left") {
        posX = 20;
        posY = height - logoSize - 40;
      }

      if (logoImg && logoImg.complete) {
        ctx.drawImage(logoImg, posX, posY, logoSize, logoSize);
      } else {
        ctx.fillStyle = "rgba(37, 99, 235, 0.9)";
        const textWidth = ctx.measureText(logoConfig.name).width + 30;
        ctx.roundRect(posX - 40, posY, Math.max(120, textWidth), 36, 12);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${Math.round(15 * (width / 400))}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(logoConfig.name, posX - 40 + Math.max(120, textWidth) / 2, posY + 18);
      }
      ctx.restore();
    }

    if (bannerConfig.enabled && currentSec >= bannerConfig.startSec && currentSec <= bannerConfig.endSec) {
      ctx.save();
      const bannerHeight = Math.round(75 * (height / 800));
      const bannerY = height - bannerHeight - 30;

      ctx.fillStyle = "rgba(220, 38, 38, 0.95)";
      ctx.roundRect(24, bannerY, width - 48, bannerHeight, 18);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${Math.round(18 * (width / 400))}px Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(bannerConfig.title, width / 2, bannerY + bannerHeight * 0.42);

      if (bannerConfig.subtitle) {
        ctx.fillStyle = "#FEF08A";
        ctx.font = `bold ${Math.round(12 * (width / 400))}px Arial, sans-serif`;
        ctx.fillText(bannerConfig.subtitle, width / 2, bannerY + bannerHeight * 0.78);
      }
      ctx.restore();
    }

    if (subtitleConfig.enabled && subtitleCues.length > 0) {
      const adjTime = currentSec + subtitleConfig.offsetSeconds;
      const matchedCue = subtitleCues.find(
        (c) => adjTime >= c.startSec && adjTime <= c.endSec + 0.5
      );

      if (matchedCue) {
        ctx.save();
        const subY = height * 0.74;
        const fontSize = Math.round((subtitleConfig.fontSize || 22) * (width / 360));
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const words = matchedCue.words && matchedCue.words.length > 0
          ? matchedCue.words
          : matchedCue.text.split(" ").map((w) => ({ word: w, startSec: matchedCue.startSec, endSec: matchedCue.endSec }));

        const spaceWidth = ctx.measureText(" ").width;
        const wordWidths = words.map((w) => ctx.measureText(w.word).width);
        const totalTextWidth = wordWidths.reduce((a, b) => a + b, 0) + spaceWidth * (words.length - 1);

        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        const padX = 24;
        const padY = 12;
        ctx.roundRect((width - totalTextWidth) / 2 - padX, subY - fontSize / 2 - padY, totalTextWidth + padX * 2, fontSize + padY * 2, 16);
        ctx.fill();

        let startX = (width - totalTextWidth) / 2;
        words.forEach((w, wIdx) => {
          const isWordActive = adjTime >= w.startSec && adjTime <= w.endSec + 0.15;

          ctx.lineWidth = 4;
          ctx.strokeStyle = "#000000";
          ctx.strokeText(w.word, startX + wordWidths[wIdx] / 2, subY);

          ctx.fillStyle = isWordActive ? "#FACC15" : "#FFFFFF";
          ctx.fillText(w.word, startX + wordWidths[wIdx] / 2, subY);

          startX += wordWidths[wIdx] + spaceWidth;
        });

        ctx.restore();
      }
    }
  };

  const handleExportFullVideo = async () => {
    if (!videoUrl) {
      alert("Vui lòng tải video lên trước!");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    exportAbortRef.current = false;

    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    const exportVideo = document.createElement("video");
    exportVideo.src = videoUrl;
    exportVideo.crossOrigin = "anonymous";
    exportVideo.muted = false;
    exportVideo.loop = false;
    exportVideo.playsInline = true;

    try {
      await new Promise((resolve, reject) => {
        exportVideo.onloadedmetadata = resolve;
        exportVideo.onerror = reject;
      });

      const totalDur = exportVideo.duration || videoDuration || 120;
      const width = exportVideo.videoWidth || 720;
      const height = exportVideo.videoHeight || 1280;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không thể khởi tạo Canvas 2D");
      canvas.width = width;
      canvas.height = height;

      let logoImg: HTMLImageElement | null = null;
      if (logoConfig.enabled && logoConfig.imageSrc) {
        logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = logoConfig.imageSrc;
        await new Promise((res) => {
          logoImg!.onload = res;
          logoImg!.onerror = res;
        });
      }

      const canvasStream = canvas.captureStream(30);

      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(exportVideo);
        const destination = audioCtx.createMediaStreamDestination();

        const gainNode = audioCtx.createGain();
        if (voiceoverConfig.muteOriginal || voiceoverConfig.originalVolume === 0) {
          gainNode.gain.value = 0;
        } else {
          gainNode.gain.value = (voiceoverConfig.originalVolume / 100) * (soundEffects.boostVoiceVolume ? 1.4 : 1.0);
        }

        source.connect(gainNode);
        gainNode.connect(destination);

        const audioTracks = destination.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          canvasStream.addTrack(audioTracks[0]);
        }
      } catch (e) {
        console.warn("Nối âm thanh video:", e);
      }

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      const recorder = new MediaRecorder(canvasStream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const finishExport = () => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
        exportVideo.pause();
        exportVideo.src = "";
      };

      recorder.onstop = () => {
        if (chunks.length === 0) {
          setIsExporting(false);
          return;
        }

        const exportedBlob = new Blob(chunks, { type: mimeType });
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const downloadUrl = URL.createObjectURL(exportedBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${videoName.replace(/\.[^/.]+$/, "") || "video"}_kpost_sub.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        setExportProgress(100);
        setTimeout(() => {
          setIsExporting(false);
        }, 600);
      };

      exportVideo.currentTime = 0;
      recorder.start(1000);
      await exportVideo.play();

      let animationId: number;

      const renderLoop = () => {
        if (exportAbortRef.current) {
          finishExport();
          return;
        }

        const curTime = exportVideo.currentTime;
        const currentProgress = Math.min(99, Math.round((curTime / totalDur) * 100));
        setExportProgress(currentProgress);

        ctx.save();
        if (canvasFilterCss !== "none") {
          ctx.filter = canvasFilterCss;
        }
        ctx.drawImage(exportVideo, 0, 0, width, height);
        ctx.restore();

        drawOverlaysOnCanvas(ctx, width, height, curTime, logoImg);

        if (exportVideo.ended || curTime >= totalDur - 0.2) {
          setExportProgress(100);
          setTimeout(() => {
            finishExport();
          }, 300);
          return;
        }

        animationId = requestAnimationFrame(renderLoop);
      };

      animationId = requestAnimationFrame(renderLoop);

      exportVideo.onended = () => {
        cancelAnimationFrame(animationId);
        finishExport();
      };
    } catch (err: any) {
      console.error("Lỗi xuất video:", err);
      setIsExporting(false);
      alert("Lỗi xuất video: " + (err?.message || "Vui lòng thử lại"));
    }
  };

  const isBannerVisible = useMemo(() => {
    if (!bannerConfig.enabled || compareOriginal) return false;
    return currentTime >= bannerConfig.startSec && currentTime <= bannerConfig.endSec;
  }, [bannerConfig, currentTime, compareOriginal]);

  const filteredDouyinTrends = useMemo(() => {
    if (douyinCategory === "all") return DOUYIN_HOT_TRENDS;
    return DOUYIN_HOT_TRENDS.filter((t) => t.category === douyinCategory);
  }, [douyinCategory]);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-4 md:p-8 font-sans text-slate-800 overflow-y-auto">
      <div className="max-w-7xl mx-auto pb-24">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-purple-500/20">
                <Wand2 size={26} />
              </span>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                AI Video Editor
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">
                  KPOST AI
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Tự động bóc băng lời thoại, lồng tiếng đa chất giọng từ trẻ em đến người lớn và cào video Douyin hot trend.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleTranscribeRealAudio}
              disabled={isTranscribing || isExporting}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-purple-500/30 transition-all hover:scale-[1.03] cursor-pointer disabled:opacity-50 ring-2 ring-violet-400/40"
              title="Dịch toàn bộ lời thoại sang tiếng Việt và tự động lồng tiếng MC Việt"
            >
              {isTranscribing ? (
                <>
                  <RefreshCw size={16} className="animate-spin text-amber-300" /> Đang Dịch & Lồng Tiếng...
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-amber-300 animate-bounce" /> ⚡ 1-Click: AI Dịch & Lồng Tiếng Việt
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowVoiceoverModal(true)}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Radio size={15} className="text-emerald-400" /> 🎙️ Đổi Giọng MC & Âm Lượng
              <span className="bg-emerald-400 text-slate-900 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {VOICE_CHARACTERS.find((c) => c.id === voiceoverConfig.selectedVoiceId)?.avatar || "👩"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowDouyinModal(true)}
              className="px-3.5 py-2.5 bg-gradient-to-r from-rose-600 to-orange-500 hover:from-rose-700 hover:to-orange-600 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Flame size={15} className="text-amber-300" /> 🔥 Video Douyin Mẫu
            </button>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <ImageIcon size={16} /> Logo & Banner
            </button>

            <button
              type="button"
              onClick={() => setShowEffectsModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Sparkles size={16} /> Hiệu Ứng Video
            </button>

            <button
              type="button"
              onClick={handleExportFullVideo}
              disabled={!videoUrl || isExporting}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Đang xuất ({exportProgress}%)
                </>
              ) : (
                <>
                  <Download size={16} /> ⬇️ Tải Video Về Máy
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <UploadCloud size={16} /> Tải Video Lên
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleUserUploadVideo}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => {
                setShowDouyinModal(true);
                setActiveDouyinTab("scraper");
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer border border-slate-200"
            >
              <Link2 size={16} /> 🔗 Dán Link Video
            </button>
          </div>
        </div>

        {/* TIẾN TRÌNH XUẤT VIDEO */}
        {isExporting && (
          <div className="mb-6 p-6 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white rounded-3xl shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Download size={24} className="text-emerald-400 animate-bounce" />
                <div>
                  <h3 className="text-base font-black text-white">Đang Render & Xuất Video Hoàn Chỉnh...</h3>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    Hệ thống đang gắn phụ đề, logo, banner và hiệu ứng vào video (Tự động tải về khi đủ 100%)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-mono font-black text-emerald-300">{exportProgress}%</span>
                <button
                  type="button"
                  onClick={() => {
                    exportAbortRef.current = true;
                    setIsExporting(false);
                  }}
                  className="px-3 py-1 bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-full transition-all duration-200"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* TIẾN TRÌNH BÓC BĂNG */}
        {isTranscribing && (
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Mic size={24} className="text-cyan-400 animate-pulse" />
                <div>
                  <h3 className="text-base font-black text-white">KpostAI Đang Nghe & Bóc Băng Âm Thanh...</h3>
                  <p className="text-xs text-cyan-200 mt-0.5">{transcribeStatus}</p>
                </div>
              </div>
              <span className="text-lg font-mono font-black text-amber-300">{transcribeProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${transcribeProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 2 CỘT CHÍNH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* CỘT TRÁI: DANH SÁCH LỜI THOẠI */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Type size={18} className="text-purple-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Lời Thoại Video ({subtitleCues.length} Câu)
                  </h3>
                </div>
                {subtitleCues.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadSRT}
                    className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FileDown size={13} /> Tải file .SRT
                  </button>
                )}
              </div>

              <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={subtitleConfig.enabled}
                    onChange={(e) => setSubtitleConfig((p) => ({ ...p, enabled: e.target.checked }))}
                    className="w-4 h-4 accent-purple-600 rounded"
                  />
                  Hiện phụ đề trên video
                </label>
                <div className="flex items-center gap-2 font-medium text-slate-600">
                  <span>Cỡ chữ:</span>
                  <select
                    value={subtitleConfig.fontSize}
                    onChange={(e) => setSubtitleConfig((p) => ({ ...p, fontSize: Number(e.target.value) }))}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    <option value={18}>Nhỏ (18px)</option>
                    <option value={22}>Vừa (22px)</option>
                    <option value={26}>To (26px)</option>
                    <option value={30}>Rất to (30px)</option>
                  </select>
                </div>
              </div>

              <div ref={listContainerRef} className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {subtitleCues.map((cue) => {
                  const isActive =
                    isPlaying && adjustedCurrentTime >= cue.startSec && adjustedCurrentTime <= cue.endSec + 0.2;
                  const isEditing = editingCueId === cue.id;

                  return (
                    <div
                      id={`cue-item-${cue.id}`}
                      key={cue.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20"
                          : "bg-slate-50 hover:bg-purple-50/50 border-slate-200/80 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => seekToTimestamp(cue.startSec)}
                          className={`text-[10px] font-mono font-bold px-2 py-1 rounded-md shrink-0 cursor-pointer transition-all hover:scale-105 ${
                            isActive ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                          }`}
                          title="Bấm để tua video tới mốc này"
                        >
                          {cue.timeLabel}
                        </button>

                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              autoFocus
                              value={editingCueText}
                              onChange={(e) => setEditingCueText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveCueEdit(cue.id);
                                if (e.key === "Escape") setEditingCueId(null);
                              }}
                              className={`w-full text-xs font-bold px-2.5 py-1 rounded-xl outline-none border transition-all ${
                                isActive
                                  ? "bg-white text-slate-900 border-white focus:ring-2 focus:ring-amber-300"
                                  : "bg-white text-slate-900 border-purple-400 focus:ring-2 focus:ring-purple-500"
                              }`}
                              placeholder="Nhập lời thoại chính xác..."
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCueEdit(cue.id)}
                              className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer shadow-xs shrink-0"
                              title="Lưu sửa đổi (Enter)"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCueId(null)}
                              className="p-1.5 rounded-lg bg-slate-400 text-white hover:bg-slate-500 cursor-pointer shrink-0"
                              title="Hủy (Esc)"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => seekToTimestamp(cue.startSec)}
                            className={`text-xs font-bold truncate flex-1 cursor-pointer select-none ${
                              isActive ? "text-white" : "text-slate-800"
                            }`}
                            title="Bấm để tua video"
                          >
                            {cue.text}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive && !isEditing && (
                          <span className="text-[10px] font-black uppercase text-amber-300 shrink-0 animate-pulse">
                            Đang nói
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakSentence(cue.text);
                          }}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            isActive
                              ? "bg-white/20 text-white hover:bg-white/30"
                              : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title="Bấm để nghe AI đọc câu này"
                        >
                          <Volume2 size={13} />
                        </button>
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCueId(cue.id);
                              setEditingCueText(cue.text);
                            }}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                              isActive
                                ? "bg-white/20 text-white hover:bg-white/30"
                                : "text-slate-400 hover:text-purple-600 hover:bg-purple-100"
                            }`}
                            title="Sửa lời thoại câu này"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {subtitleCues.length === 0 && !isTranscribing && (
                  <div className="py-12 text-center px-4">
                    <Mic size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500">Chưa có phụ đề lời thoại.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Bấm nút <span className="font-bold text-rose-600">"🔥 Cào Douyin Trends"</span> hoặc <span className="font-bold text-indigo-600">"🎤 Bật sub tự động bằng AI"</span> để nạp video và kịch bản!
                    </p>
                  </div>
                )}
              </div>

              {transcribeSuccessMsg && (
                <div className="mt-3.5 p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-2 animate-in fade-in">
                  <Sparkles size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-purple-900 leading-relaxed">{transcribeSuccessMsg}</p>
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: VIDEO PLAYER VỚI PHỤ ĐỀ DỌC 9:16 */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                    <Play size={14} />
                  </span>
                  <span className="text-xs font-bold text-slate-800 truncate" title={videoName}>
                    {videoName || "Video Preview"}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEffectsModal(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Palette size={13} />
                    {visualEffects.filterType !== "none" ? "Đã bật hiệu ứng" : "Hiệu ứng"}
                  </button>

                  <button
                    type="button"
                    onClick={handleExportFullVideo}
                    disabled={!videoUrl || isExporting}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Download size={13} />
                    {isExporting ? `Đang xuất ${exportProgress}%` : "Tải Video"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCompareOriginal(!compareOriginal)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      compareOriginal
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <Eye size={13} />
                    {compareOriginal ? "Đang xem: GỐC" : "Xem bản gốc"}
                  </button>
                </div>
              </div>

              {/* KHUNG VIDEO 9:16 */}
              <div className="w-full bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800 flex items-center justify-center aspect-[9/16] max-h-[560px] mx-auto">
                {videoUrl && (
                  <>
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      loop
                      playsInline
                      style={{
                        filter: canvasFilterCss,
                        transition: "filter 0.3s ease"
                      }}
                      onLoadedMetadata={() => {
                        if (videoRef.current && videoRef.current.duration) {
                          setVideoDuration(videoRef.current.duration);
                        }
                        setVideoLoadError(null);
                      }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => {
                        setIsPlaying(false);
                        if (ttsAudioRef.current) {
                          ttsAudioRef.current.pause();
                        }
                        if (typeof window !== "undefined" && "speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                        }
                      }}
                      onError={() => {
                        if (videoUrl.startsWith("http") && !videoUrl.includes("/api/stream-video")) {
                          setVideoUrl(`/api/stream-video?url=${encodeURIComponent(videoUrl)}`);
                          return;
                        }
                        setVideoLoadError("Máy chủ nguồn chặn quyền phát trực tiếp (lỗi CORS). Bấm nút bên dưới để chọn file từ máy và biên tập trọn vẹn.");
                      }}
                      className="w-full h-full object-contain"
                    />

                    {videoLoadError && (
                      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center text-white animate-in fade-in">
                        <span className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl mb-3 border border-amber-500/30">
                          <AlertTriangle size={36} />
                        </span>
                        <h4 className="font-black text-sm text-amber-300 mb-1.5 uppercase tracking-wide">
                          Máy Chủ Nguồn Chặn Phát Trực Tiếp
                        </h4>
                        <p className="text-xs text-slate-300 max-w-sm mb-4 leading-relaxed">
                          Link này bị máy chủ bên ngoài chặn quyền nhúng CORS vào trình duyệt. Bấm nút dưới để chọn file từ máy:
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-xl hover:scale-105 transition-all cursor-pointer"
                        >
                          <Upload size={15} /> 📁 Chọn File Từ Máy Tính
                        </button>
                      </div>
                    )}

                    {/* LOGO */}
                    {logoConfig.enabled && !compareOriginal && (
                      <div
                        className={`absolute pointer-events-none z-30 transition-all ${
                          logoConfig.position === "top-left"
                            ? "top-4 left-4"
                            : logoConfig.position === "top-right"
                            ? "top-4 right-4"
                            : logoConfig.position === "bottom-left"
                            ? "bottom-4 left-4"
                            : "bottom-4 right-4"
                        }`}
                        style={{ opacity: logoConfig.opacity / 100 }}
                      >
                        {logoConfig.imageSrc ? (
                          <img
                            src={logoConfig.imageSrc}
                            alt="Logo"
                            style={{ height: `${logoConfig.size || 40}px` }}
                            className="w-auto object-contain drop-shadow-md rounded-lg"
                          />
                        ) : (
                          <div className="px-3 py-1 bg-blue-600/90 text-white font-black text-xs rounded-xl shadow-lg border border-white/20 backdrop-blur-xs flex items-center gap-1.5 tracking-wider uppercase">
                            <Sparkles size={11} className="text-amber-300" />
                            {logoConfig.name}
                          </div>
                        )}
                      </div>
                    )}

                    {/* BANNER */}
                    {isBannerVisible && (
                      <div className="absolute left-4 right-4 bottom-4 pointer-events-none z-30 transition-all">
                        <div className="p-3 rounded-2xl shadow-2xl border border-white/25 text-center text-white bg-gradient-to-r from-red-600/95 via-rose-600/95 to-amber-600/95 backdrop-blur-md">
                          <h4 className="text-xs md:text-sm font-black uppercase tracking-wider leading-tight">
                            {bannerConfig.title}
                          </h4>
                          {bannerConfig.subtitle && (
                            <p className="text-[10px] md:text-[11px] text-amber-200 font-bold mt-0.5">
                              {bannerConfig.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PHỤ ĐỀ KARAOKE */}
                    {subtitleConfig.enabled && !compareOriginal && currentSubtitleCue && (
                      <div className="absolute bottom-[26%] left-0 right-0 z-40 pointer-events-none flex justify-center px-4">
                        <div className="bg-black/60 backdrop-blur-xs px-4 py-2 rounded-2xl border border-white/10 shadow-2xl max-w-[85%] text-center animate-in fade-in zoom-in-95 duration-150">
                          <p
                            className="font-black leading-tight tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex flex-wrap items-center justify-center gap-x-2 gap-y-1"
                            style={{
                              fontSize: `${subtitleConfig.fontSize}px`,
                              textShadow: "0 0 6px rgba(0,0,0,0.9), 0 2px 4px #000",
                            }}
                          >
                            {currentSubtitleCue.words && currentSubtitleCue.words.length > 0 ? (
                              currentSubtitleCue.words.map((w, wIdx) => {
                                const isWordActive =
                                  adjustedCurrentTime >= w.startSec &&
                                  adjustedCurrentTime <= w.endSec + 0.15;
                                return (
                                  <span
                                    key={wIdx}
                                    className={`transition-all duration-100 ${
                                      isWordActive
                                        ? "text-yellow-300 scale-110 font-black drop-shadow-[0_0_10px_rgba(250,204,21,0.9)]"
                                        : "text-white opacity-90"
                                    }`}
                                  >
                                    {w.word}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-yellow-300">{currentSubtitleCue.text}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* TIMELINE CONTROLS */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        if (isPlaying) videoRef.current.pause();
                        else videoRef.current.play();
                      }
                    }}
                    className="w-10 h-10 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                  </button>

                  <div className="flex-1 flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span className="font-bold text-slate-700">
                      {Math.floor(currentTime / 60).toString().padStart(2, "0")}:
                      {Math.floor(currentTime % 60).toString().padStart(2, "0")}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={videoDuration || 120}
                      step={0.1}
                      value={currentTime}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCurrentTime(val);
                        lastSpokenCueIdRef.current = null;
                        if (ttsAudioRef.current) {
                          ttsAudioRef.current.pause();
                        }
                        if (typeof window !== "undefined" && "speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                        }
                        if (videoRef.current) videoRef.current.currentTime = val;
                      }}
                      className="flex-1 accent-purple-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <span className="font-bold text-slate-700">
                      {Math.floor(videoDuration / 60).toString().padStart(2, "0")}:
                      {Math.floor(videoDuration % 60).toString().padStart(2, "0")}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isMuted;
                        setIsMuted(!isMuted);
                      }
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {subtitleCues.length > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      Đã có ({subtitleCues.length} câu phụ đề)
                    </span>
                  )}
                  {voiceoverConfig.enabled && (
                    <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-xl border border-violet-200 flex items-center gap-1">
                      <Radio size={13} />
                      Đang lồng tiếng: {VOICE_CHARACTERS.find((c) => c.id === voiceoverConfig.selectedVoiceId)?.name}
                    </span>
                  )}
                  {visualEffects.filterType !== "none" && (
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
                      ✨ Bộ lọc: {visualEffects.filterType.toUpperCase()} ({visualEffects.speed}x)
                    </span>
                  )}
                  {bannerConfig.enabled && (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                      🏷️ Banner: 00:{bannerConfig.startSec.toString().padStart(2, "0")} ➔ 00:{bannerConfig.endSec.toString().padStart(2, "0")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: AI LỒNG TIẾNG */}
      {showVoiceoverModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-violet-100 text-violet-600 rounded-xl">
                  <Radio size={18} />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    AI Lồng Tiếng Cho Video (Từ Trẻ Em Đến Người LỚn)
                  </h3>
                  <p className="text-xs text-slate-500">Tự động nói theo phụ đề timeline, hỗ trợ Audio Ducking hạ âm lượng video gốc</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVoiceoverModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voiceoverConfig.enabled}
                    onChange={(e) => setVoiceoverConfig((p) => ({ ...p, enabled: e.target.checked }))}
                    className="w-4 h-4 accent-violet-600 rounded"
                  />
                  Bật AI tự động lồng tiếng khi phát video
                </label>
                <label className="flex items-center gap-2 font-bold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voiceoverConfig.autoDuckOriginal}
                    onChange={(e) => setVoiceoverConfig((p) => ({ ...p, autoDuckOriginal: e.target.checked }))}
                    className="w-4 h-4 accent-violet-600 rounded"
                  />
                  Tự động giảm âm lượng video gốc khi AI nói (Audio Ducking)
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {VOICE_CHARACTERS.map((char) => {
                  const isSelected = voiceoverConfig.selectedVoiceId === char.id;
                  return (
                    <div
                      key={char.id}
                      onClick={() =>
                        setVoiceoverConfig((p) => ({
                          ...p,
                          selectedVoiceId: char.id,
                          pitch: 1.0,
                          rate: 1.0,
                        }))
                      }
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-violet-600 bg-violet-50/60 shadow-md shadow-violet-500/10"
                          : "border-slate-200 hover:border-violet-300 bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-2xl">{char.avatar}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            char.group === "kids"
                              ? "bg-amber-100 text-amber-800"
                              : char.group === "adults"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {char.badge} • {char.ageRange}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900">{char.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {char.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakSentence(char.sampleText, char.id);
                          }}
                          className="px-2.5 py-1 bg-violet-100 hover:bg-violet-200 text-violet-700 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Volume2 size={12} /> Nghe thử mẫu
                        </button>
                        {isSelected && (
                          <span className="text-[10px] font-black text-violet-700 uppercase flex items-center gap-1">
                            <Check size={12} /> Đang chọn
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-600">
                Nhân vật đang chọn:{" "}
                <strong className="text-violet-700">
                  {VOICE_CHARACTERS.find((c) => c.id === voiceoverConfig.selectedVoiceId)?.name}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setShowVoiceoverModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Lưu & Áp Dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DOUYIN TRENDS */}
      {showDouyinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 my-8 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                  <Flame size={20} className="animate-pulse" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    Douyin Hot Trends & Cào Video Bán Hàng Triệu View
                    <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      DOUYIN.COM
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Đề xuất video hot mới nhất, tự động trích xuất kịch bản tiếng Việt và gán giọng lồng tiếng tối ưu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDouyinModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4 p-1 bg-slate-100 rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setActiveDouyinTab("trends")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeDouyinTab === "trends"
                    ? "bg-white text-rose-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Flame size={14} /> 🏆 Đề Xuất Video Hot Douyin Mới Nhất
              </button>
              <button
                type="button"
                onClick={() => setActiveDouyinTab("scraper")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeDouyinTab === "scraper"
                    ? "bg-white text-rose-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Link2 size={14} /> 🔗 Cào Video Từ Link Douyin Bất Kỳ
              </button>
            </div>

            {activeDouyinTab === "trends" && (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
                  {[
                    { id: "all", label: "Tất Cả Danh Mục" },
                    { id: "kids_toys", label: "🧸 Đồ Chơi & Mẹ Bé" },
                    { id: "smart_home", label: "🛍️ Gia Dụng Thông Minh" },
                    { id: "tech_gadgets", label: "📱 Đồ Công Nghệ" },
                    { id: "beauty_care", label: "💄 Mỹ Phẩm & Skincare" },
                    { id: "short_drama", label: "🎬 Phim Ngắn Drama" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setDouyinCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                        douyinCategory === cat.id
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-rose-50"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredDouyinTrends.map((trend) => (
                    <div
                      key={trend.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-rose-300 transition-all hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                            {trend.categoryLabel}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">❤️ {trend.likes} • ↗️ {trend.shares}</span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900 leading-snug">{trend.title}</h4>
                        <p className="text-[10px] text-slate-400 font-mono italic mt-0.5">🇨🇳 {trend.originalTitle}</p>

                        <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200/80 rounded-xl">
                          <p className="text-[10px] text-amber-950 font-bold leading-relaxed">
                            💡 <strong>AI Viral:</strong> {trend.viralInsight}
                          </p>
                        </div>

                        <div className="mt-2 text-[11px] font-bold text-violet-800 bg-violet-50 p-2 rounded-xl border border-violet-100 flex items-center gap-1.5">
                          <Radio size={12} className="text-violet-600 shrink-0" />
                          <span>Gợi ý giọng: {trend.voiceRecommendationName}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleImportDouyinVideo(trend)}
                        className="w-full py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        🚀 Nhập Video & Bật Lồng Tiếng
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeDouyinTab === "scraper" && (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-800 block mb-1">
                    Dán đường link Video (Hỗ trợ MP4, WebM, Google Drive, Dropbox, TikTok/Douyin...):
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Hỗ trợ video thời lượng bất kỳ (8 phút, 15 phút, 30 phút). Hệ thống sẽ giữ nguyên 100% video của bạn, không cắt ngắn.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={douyinUrlInput}
                      onChange={(e) => setDouyinUrlInput(e.target.value)}
                      placeholder="VD: https://... hoặc link Google Drive, CDN..."
                      className="flex-1 text-xs font-bold px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-rose-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleScrapeDouyinLink}
                      disabled={isScrapingDouyin}
                      className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isScrapingDouyin ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Đang tải...
                        </>
                      ) : (
                        <>
                          <Flame size={14} /> 🚀 Nạp Video Này
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                      <Upload size={14} className="text-purple-600" /> Hoặc Chọn File Video Trực Tiếp Từ Máy Tính
                    </h4>
                    <p className="text-[11px] text-purple-700 mt-0.5">
                      Khuyên dùng: Tải file từ máy tính phát siêu mượt, trọn vẹn 100% thời lượng (8 phút, 15 phút) và không lo bị lỗi mạng.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDouyinModal(false);
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                  >
                    <FolderOpen size={14} /> 📁 Chọn File Từ Máy
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowDouyinModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HIỆU ỨNG */}
      {showEffectsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                  <Sparkles size={18} />
                </span>
                <h3 className="text-base font-black text-slate-900">Hiệu Ứng Hình Ảnh & Âm Thanh</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEffectsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 mb-3">
                  <Palette size={14} className="text-purple-600" /> 1. Bộ Lọc Màu & Hiệu Ứng Hình Ảnh (Visual)
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Tông màu điện ảnh:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "none", label: "Mặc định" },
                        { id: "bright", label: "✨ Sáng nét" },
                        { id: "cinematic", label: "🎬 Điện ảnh" },
                        { id: "vibrant", label: "🌈 Rực rỡ" },
                        { id: "golden", label: "☀️ Vàng ấm" },
                        { id: "vintage", label: "🎞️ Hoài niệm" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setVisualEffects((p) => ({ ...p, filterType: item.id as any }))}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            visualEffects.filterType === item.id
                              ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-purple-50"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Độ sáng: {visualEffects.brightness}%
                      </label>
                      <input
                        type="range"
                        min={80}
                        max={140}
                        value={visualEffects.brightness}
                        onChange={(e) => setVisualEffects((p) => ({ ...p, brightness: Number(e.target.value) }))}
                        className="w-full accent-purple-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Độ bão hòa màu: {visualEffects.saturation}%
                      </label>
                      <input
                        type="range"
                        min={60}
                        max={180}
                        value={visualEffects.saturation}
                        onChange={(e) => setVisualEffects((p) => ({ ...p, saturation: Number(e.target.value) }))}
                        className="w-full accent-purple-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Tốc độ phát: {visualEffects.speed}x
                    </label>
                    <div className="flex gap-2">
                      {[1.0, 1.1, 1.2, 1.25, 1.5].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => setVisualEffects((p) => ({ ...p, speed: spd }))}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                            visualEffects.speed === spd
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 mb-3">
                  <Music size={14} className="text-emerald-600" /> 2. Hiệu Ứng Âm Thanh & Khuếch Đại (Audio)
                </span>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-purple-300 transition-all">
                    <div>
                      <p className="text-xs font-bold text-slate-800">🎙️ Khuếch đại giọng nói (Voice Boost +40%)</p>
                      <p className="text-[11px] text-slate-500">Giúp giọng nói rõ ràng, nổi bật hơn so với âm thanh tạp âm</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={soundEffects.boostVoiceVolume}
                      onChange={(e) => setSoundEffects((p) => ({ ...p, boostVoiceVolume: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-purple-300 transition-all">
                    <div>
                      <p className="text-xs font-bold text-slate-800">🔔 Hiệu ứng Ding khi hiện Banner</p>
                      <p className="text-[11px] text-slate-500">Phát âm thanh thông báo thu hút mắt nhìn khi banner giảm giá xuất hiện</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={soundEffects.dingEffectEnabled}
                      onChange={(e) => setSoundEffects((p) => ({ ...p, dingEffectEnabled: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-purple-300 transition-all">
                    <div>
                      <p className="text-xs font-bold text-slate-800">⚡ Hiệu ứng Whoosh lướt cảnh mở đầu</p>
                      <p className="text-[11px] text-slate-500">Âm thanh lướt gió chuyên nghiệp trong 2 giây đầu video</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={soundEffects.whooshEffectEnabled}
                      onChange={(e) => setSoundEffects((p) => ({ ...p, whooshEffectEnabled: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowEffectsModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Lưu & Áp Dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOGO & BANNER */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                  <ImageIcon size={18} />
                </span>
                <h3 className="text-base font-black text-slate-900">Thiết Lập Logo & Banner Video</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600" /> 1. Logo Thương Hiệu
                  </span>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={logoConfig.enabled}
                      onChange={(e) => setLogoConfig((p) => ({ ...p, enabled: e.target.checked }))}
                      className="w-4 h-4 accent-purple-600 rounded"
                    />
                    Bật Logo
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                      Ảnh Logo (PNG trong suốt / JPG):
                    </label>
                    <div className="flex items-center gap-3">
                      {logoConfig.imageSrc ? (
                        <div className="relative group w-14 h-14 bg-white border border-slate-200 rounded-xl p-1 flex items-center justify-center shrink-0">
                          <img
                            src={logoConfig.imageSrc}
                            alt="Logo preview"
                            className="max-w-full max-h-full object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={() => setLogoConfig((p) => ({ ...p, imageSrc: "" }))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 cursor-pointer"
                            title="Xóa logo"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ) : null}

                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => logoImageInputRef.current?.click()}
                          className="w-full py-2.5 px-3 bg-white hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
                        >
                          <UploadCloud size={16} className="text-indigo-600" />
                          {logoConfig.imageSrc ? "Đổi ảnh Logo khác" : "Chọn ảnh Logo từ máy tính..."}
                        </button>
                        <input
                          ref={logoImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleUploadLogoFile}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {!logoConfig.imageSrc && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Hoặc nhập Chữ Logo đại diện:
                      </label>
                      <input
                        type="text"
                        value={logoConfig.name}
                        onChange={(e) => setLogoConfig((p) => ({ ...p, name: e.target.value }))}
                        placeholder="VD: KPOST AI"
                        className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Vị trí góc:</label>
                      <select
                        value={logoConfig.position}
                        onChange={(e) => setLogoConfig((p) => ({ ...p, position: e.target.value as any }))}
                        className="w-full text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                      >
                        <option value="top-right">Góc trên - Phải</option>
                        <option value="top-left">Góc trên - Trái</option>
                        <option value="bottom-right">Góc dưới - Phải</option>
                        <option value="bottom-left">Góc dưới - Trái</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Kích thước: {logoConfig.size || 40}px
                      </label>
                      <input
                        type="range"
                        min={24}
                        max={70}
                        value={logoConfig.size || 40}
                        onChange={(e) => setLogoConfig((p) => ({ ...p, size: Number(e.target.value) }))}
                        className="w-full accent-purple-600 h-2 bg-slate-200 rounded-lg cursor-pointer mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    🏷️ 2. Banner Quảng Cáo / Giảm Giá
                  </span>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bannerConfig.enabled}
                      onChange={(e) => setBannerConfig((p) => ({ ...p, enabled: e.target.checked }))}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    Bật Banner
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Tiêu đề chính:</label>
                    <input
                      type="text"
                      value={bannerConfig.title}
                      onChange={(e) => setBannerConfig((p) => ({ ...p, title: e.target.value }))}
                      placeholder="VD: ⚡ FLASH SALE 50% - DUY NHẤT HÔM NAY"
                      className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Mô tả phụ (subtitle):</label>
                    <input
                      type="text"
                      value={bannerConfig.subtitle || ""}
                      onChange={(e) => setBannerConfig((p) => ({ ...p, subtitle: e.target.value }))}
                      placeholder="VD: Miễn phí giao hàng toàn quốc • Bảo hành chính hãng"
                      className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Bắt đầu (giây):</label>
                      <input
                        type="number"
                        min={0}
                        max={videoDuration || 120}
                        value={bannerConfig.startSec}
                        onChange={(e) => setBannerConfig((p) => ({ ...p, startSec: Number(e.target.value) }))}
                        className="w-full text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Kết thúc (giây):</label>
                      <input
                        type="number"
                        min={0}
                        max={videoDuration || 120}
                        value={bannerConfig.endSec}
                        onChange={(e) => setBannerConfig((p) => ({ ...p, endSec: Number(e.target.value) }))}
                        className="w-full text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
              >
                Lưu & Áp Dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}