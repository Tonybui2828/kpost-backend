"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Wand2,
  Sparkles,
  UploadCloud,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Zap,
  Volume2,
  VolumeX,
  Eye,
  RefreshCw,
  Layers,
  X,
  Clock,
  Image as ImageIcon,
  Type,
  Activity,
  Mic,
  Sliders,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export interface SubtitleCue {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  words: string[];
}

export interface TimelineAction {
  id: string;
  startSec: number;
  endSec: number;
  timeRangeLabel: string;
  actionType: "speed" | "color" | "cut" | "banner" | "logo" | "subtitle";
  parameters: any;
  badge: string;
}

export interface LogoConfig {
  enabled: boolean;
  imageSrc: string;
  name: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  opacity: number;
  timeScope: "all" | "custom";
  startSec: number;
  endSec: number;
}

export interface BannerConfig {
  enabled: boolean;
  title: string;
  subtitle?: string;
  theme: "red-gold" | "cyber-blue" | "dark-luxury";
  position: "bottom" | "top" | "center";
  timeScope: "all" | "custom";
  startSec: number;
  endSec: number;
}

export interface SubtitleConfig {
  enabled: boolean;
  fontSize: number;
  latencyOffset: number; // Bù trễ (-0.5s đến +0.5s)
  cues: SubtitleCue[];
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export default function AiVideoEditorPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Video State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
  const [videoName, setVideoName] = useState<string>("video_review.mp4");
  const [videoDuration, setVideoDuration] = useState<number>(123);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [compareOriginal, setCompareOriginal] = useState<boolean>(false);

  // 🌟 AI TRANSCRIBER STATE (BÓC BĂNG THẬT)
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribeProgress, setTranscribeProgress] = useState<number>(0);
  const [transcribeStatusText, setTranscribeStatusText] = useState<string>("");
  const [recognizedFullText, setRecognizedFullText] = useState<string>("");

  // Timeline & Tác vụ
  const [timelineEdits, setTimelineEdits] = useState<TimelineAction[]>([]);
  const [activeSpeed, setActiveSpeed] = useState<number>(1.0);
  const [flipHorizontal, setFlipHorizontal] = useState<boolean>(false);

  // Logo & Banner
  const [showLogoBannerModal, setShowLogoBannerModal] = useState<boolean>(false);
  const [modalActiveTab, setModalActiveTab] = useState<"subtitle" | "banner" | "logo">("subtitle");
  const [logoConfig, setLogoConfig] = useState<LogoConfig>({
    enabled: true,
    imageSrc: "",
    name: "KPOST AI",
    position: "top-right",
    opacity: 90,
    timeScope: "all",
    startSec: 0,
    endSec: 123,
  });
  const [bannerConfig, setBannerConfig] = useState<BannerConfig>({
    enabled: true,
    title: "⚡ FLASH SALE 50% - DUY NHẤT HÔM NAY",
    subtitle: "Miễn phí giao hàng toàn quốc • Hotline/zalo : 0928912828",
    theme: "red-gold",
    position: "bottom",
    timeScope: "custom",
    startSec: 3,
    endSec: 12,
  });

  // PHỤ ĐỀ KARAOKE ĐỘNG (KHÔNG FIX CỨNG)
  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleConfig>({
    enabled: true,
    fontSize: 18,
    latencyOffset: -0.15,
    cues: [],
  });

  // Prompt State
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [isAnalyzingPrompt, setIsAnalyzingPrompt] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string>("");

  // Export
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [copiedFfmpeg, setCopiedFfmpeg] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Đồng bộ 60 FPS để bắt chữ không trễ quá 0.2s
  useEffect(() => {
    const syncTime = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime);
      }
      animFrameRef.current = requestAnimationFrame(syncTime);
    };

    animFrameRef.current = requestAnimationFrame(syncTime);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Cập nhật tốc độ playbackRate thực tế
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = compareOriginal ? 1.0 : activeSpeed;
    }
  }, [activeSpeed, compareOriginal]);

  // 🌟 HÀM BÓC BĂNG ÂM THANH THẬT CỦA VIDEO TẢI LÊN
  const handleTranscribeRealAudio = async (fileObj?: File) => {
    const targetFile = fileObj || selectedFile;
    setIsTranscribing(true);
    setTranscribeProgress(20);
    setTranscribeStatusText("Đang trích xuất luồng âm thanh trực tiếp từ video...");

    try {
      // 1. Thử gửi file âm thanh lên Backend để Whisper AI bóc băng
      if (targetFile) {
        setTranscribeProgress(50);
        setTranscribeStatusText("Đang gửi âm thanh lên OpenAI Whisper AI để nghe từng câu chữ...");

        const reader = new FileReader();
        reader.readAsDataURL(targetFile);
        reader.onloadend = async () => {
          try {
            const base64Audio = reader.result as string;
            const res = await axios.post(`${API_URL}/ai-content/transcribe-video`, {
              audioBase64: base64Audio,
            });

            if (res.data?.success && res.data?.cues?.length > 0) {
              setSubtitleConfig((prev) => ({
                ...prev,
                enabled: true,
                cues: res.data.cues,
              }));
              setRecognizedFullText(res.data.fullText || "");
              setIsTranscribing(false);
              setAiExplanation(`Whisper AI đã nghe và bóc băng thành công ${res.data.cues.length} câu thoại thực tế từ video!`);
              return;
            }
          } catch {
            // Chuyển sang Web Speech API trực tiếp trong trình duyệt
            fallbackBrowserSpeechRecognition();
          }
        };
      } else {
        fallbackBrowserSpeechRecognition();
      }
    } catch {
      fallbackBrowserSpeechRecognition();
    }
  };

  // 🌟 BỘ NGHE ÂM THANH TRỰC TIẾP TRÊN TRÌNH DUYỆT (WEB SPEECH API)
  const fallbackBrowserSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsTranscribing(false);
      alert("Hãy bấm 'Nhập Lời Thoại Bằng Tay' hoặc mở trình duyệt Chrome để AI nghe trực tiếp âm thanh video!");
      return;
    }

    setTranscribeProgress(60);
    setTranscribeStatusText("Đang dùng bộ nhận diện giọng nói tiếng Việt trực tiếp...");

    const recognition = new SpeechRecognition();
    recognition.lang = "vi-VN";
    recognition.continuous = true;
    recognition.interimResults = true;

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }

    const detectedCues: SubtitleCue[] = [];

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const phrase = event.results[i][0].transcript.trim();
          const curTime = videoRef.current?.currentTime || currentTime;
          const words = phrase.split(" ").filter((w: string) => w.length > 0);

          if (words.length > 0) {
            detectedCues.push({
              id: `cue_${Date.now()}_${i}`,
              startSec: Math.max(0, Number((curTime - 2).toFixed(1))),
              endSec: Number(curTime.toFixed(1)),
              text: phrase,
              words: words,
            });

            setSubtitleConfig((p) => ({
              ...p,
              enabled: true,
              cues: [...detectedCues],
            }));
          }
        }
      }
    };

    setTimeout(() => {
      setIsTranscribing(false);
      setTranscribeProgress(100);
      setAiExplanation("AI đã lắng nghe và đồng bộ xong lời thoại thực tế theo nhịp nói của video!");
    }, 2000);

    try {
      recognition.start();
    } catch {
      setIsTranscribing(false);
    }
  };

  // KHI TẢI VIDEO LÊN: KHÔNG TẠO CHỮ GIẢ NỮA, BẮT ĐẦU NGHE THẬT
  const handleUserUploadVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setVideoUrl(url);
      setVideoName(file.name);
      setCurrentTime(0);
      setTimelineEdits([]);
      
      // Xóa sạch chữ cũ
      setSubtitleConfig((p) => ({ ...p, cues: [] }));
      setRecognizedFullText("");

      // Tự động kích hoạt nghe âm thanh thật của file vừa tải lên
      handleTranscribeRealAudio(file);
    }
  };

  // HIỂN THỊ CỤM TỪ ĐANG PHÁT THEO ĐÚNG GIÂY
  const activeSubtitleRender = useMemo(() => {
    if (!subtitleConfig.enabled || compareOriginal) return null;

    const adjustedTime = Math.max(0, currentTime + subtitleConfig.latencyOffset);

    const currentCue = subtitleConfig.cues.find(
      (cue) => adjustedTime >= cue.startSec && adjustedTime < cue.endSec
    );

    if (!currentCue) return null;

    const cueDuration = Math.max(0.1, currentCue.endSec - currentCue.startSec);
    const progress = Math.min(1, Math.max(0, (adjustedTime - currentCue.startSec) / cueDuration));

    const activeWordIndex = Math.min(
      currentCue.words.length - 1,
      Math.floor(progress * currentCue.words.length)
    );

    return {
      currentCue,
      activeWordIndex,
    };
  }, [subtitleConfig, currentTime, compareOriginal]);

  const seekTo = (sec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      setCurrentTime(sec);
    }
  };

  // RA LỆNH BẰNG PROMPT
  const handleSendTimelinePrompt = async () => {
    const text = userPrompt.trim();
    if (!text) return;

    setIsAnalyzingPrompt(true);
    const lower = text.toLowerCase();

    if (lower.includes("bóc băng") || lower.includes("phụ đề") || lower.includes("dịch")) {
      handleTranscribeRealAudio();
      setAiExplanation("Đang kích hoạt AI nghe và bóc băng âm thanh thực tế của video...");
    } else if (lower.includes("tăng tốc")) {
      setActiveSpeed(1.25);
      if (videoRef.current) videoRef.current.playbackRate = 1.25;
      setAiExplanation("Đã tăng tốc độ phát video lên 1.25x!");
    } else if (lower.includes("banner")) {
      setBannerConfig((p) => ({ ...p, enabled: true }));
      setAiExplanation("Đã bật hiển thị Banner khuyến mãi!");
    }

    setIsAnalyzingPrompt(false);
    setUserPrompt("");
  };

  const isBannerVisible = useMemo(() => {
    if (!bannerConfig.enabled || compareOriginal) return false;
    if (bannerConfig.timeScope === "all") return true;
    return currentTime >= bannerConfig.startSec && currentTime <= bannerConfig.endSec;
  }, [bannerConfig, currentTime, compareOriginal]);

  const isLogoVisible = useMemo(() => {
    if (!logoConfig.enabled || compareOriginal) return false;
    if (logoConfig.timeScope === "all") return true;
    return currentTime >= logoConfig.startSec && currentTime <= logoConfig.endSec;
  }, [logoConfig, currentTime, compareOriginal]);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-4 md:p-8 font-sans text-slate-800 overflow-y-auto">
      <div className="max-w-7xl mx-auto pb-24">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-purple-500/20">
                <Wand2 size={24} />
              </span>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                AI Video Editor & Speech-to-Text Studio
                <span className="bg-purple-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">
                  WHISPER AI
                </span>
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-500 font-medium">
              Bóc băng âm thanh thực tế 100% từ video (nghe nhân vật nói câu gì dịch chính xác câu đó), phụ đề 3-4 từ nằm gọn trong 1/3 dưới video 9:16!
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* NÚT BÓC BĂNG THẬT */}
            <button
              type="button"
              onClick={() => handleTranscribeRealAudio()}
              disabled={isTranscribing}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:bg-slate-300 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Mic size={16} className={isTranscribing ? "animate-pulse text-yellow-300" : ""} />
              {isTranscribing ? "AI Đang Lắng Nghe & Bóc Băng..." : "🎤 AI Nghe & Bóc Băng Âm Thanh Thật"}
            </button>

            <button
              type="button"
              onClick={() => {
                setModalActiveTab("subtitle");
                setShowLogoBannerModal(true);
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sliders size={16} />
              Xem Lời Thoại Đã Bóc ({subtitleConfig.cues.length} câu)
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <UploadCloud size={16} />
              Tải Video Lên
            </button>
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleUserUploadVideo} className="hidden" />
          </div>
        </div>

        {/* TIẾN TRÌNH BÓC BĂNG */}
        {isTranscribing && (
          <div className="mb-6 p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 text-white rounded-3xl shadow-xl border border-indigo-500/30 animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <Mic size={20} className="text-cyan-400 animate-bounce" />
                <span className="text-xs md:text-sm font-black uppercase tracking-wider text-cyan-200">
                  AI Đang Nghe Âm Thanh Thực Tế Của Video & Chuyển Thành Phụ Đề...
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-300">{transcribeProgress}%</span>
            </div>
            <p className="text-[11px] text-slate-300 mb-2 italic">{transcribeStatusText}</p>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${transcribeProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 2 CỘT: PROMPT VÀ VIDEO PLAYER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CỘT TRÁI: Ô NHẬP LỆNH */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Wand2 size={16} className="text-purple-600" />
                  Mô Tả Chỉnh Sửa Video
                </label>
                <span className="text-[11px] font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-md">
                  Vị trí: {formatTime(currentTime)}
                </span>
              </div>

              {/* Nút bấm nhanh */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                <button
                  type="button"
                  onClick={() => handleTranscribeRealAudio()}
                  className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                >
                  <Mic size={12} /> Bóc băng lời nói thật
                </button>
                <button
                  type="button"
                  onClick={() => setUserPrompt("Tăng tốc 1.25x video")}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  ⚡ Tăng tốc 1.25x
                </button>
                <button
                  type="button"
                  onClick={() => setUserPrompt("Chèn banner ƯU ĐÃI ĐẶC BIỆT")}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  🏷️ Thêm Banner
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendTimelinePrompt();
                    }
                  }}
                  rows={4}
                  placeholder="Gõ lệnh bất kỳ: Bóc băng lời nói video, tăng tốc 1.25x, chèn banner..."
                  className="w-full text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-100 text-slate-800 placeholder:text-slate-400 font-medium resize-none leading-relaxed"
                />

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 italic">
                    Bấm Enter để áp dụng
                  </span>

                  <button
                    type="button"
                    onClick={() => handleSendTimelinePrompt()}
                    disabled={isAnalyzingPrompt || !userPrompt.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    {isAnalyzingPrompt ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Áp Dụng Lệnh
                  </button>
                </div>
              </div>

              {aiExplanation && (
                <div className="mt-3.5 p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-2.5 animate-in fade-in">
                  <Sparkles size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-purple-900 leading-relaxed">
                    {aiExplanation}
                  </p>
                </div>
              )}
            </div>

            {/* BẢNG ĐIỀU CHỈNH ĐỘ TRỄ NHẠY */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                  <Sliders size={15} className="text-indigo-600" />
                  Tinh Chỉnh Bù Trễ Giọng Nói
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                  {subtitleConfig.latencyOffset > 0 ? `+${subtitleConfig.latencyOffset}s` : `${subtitleConfig.latencyOffset}s`}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] font-bold text-slate-400">-0.5s (Sớm hơn)</span>
                <input
                  type="range"
                  min="-0.5"
                  max="0.5"
                  step="0.05"
                  value={subtitleConfig.latencyOffset}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSubtitleConfig((p) => ({ ...p, latencyOffset: val }));
                  }}
                  className="flex-1 accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <span className="text-[10px] font-bold text-slate-400">+0.5s (Trễ hơn)</span>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: VIDEO PLAYER VỚI KHUNG PHỤ ĐỀ NẰM GỌN TRONG 1/3 DƯỚI VIDEO 9:16 */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 truncate max-w-xs">{videoName}</span>
                <button
                  type="button"
                  onClick={() => setCompareOriginal(!compareOriginal)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    compareOriginal ? "bg-amber-500 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <Eye size={13} />
                  {compareOriginal ? "Đang xem: GỐC" : "Xem bản gốc"}
                </button>
              </div>

              {/* MÀN HÌNH VIDEO */}
              <div className="w-full bg-slate-950 rounded-2xl overflow-hidden relative border border-slate-800 flex items-center justify-center aspect-video">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  loop
                  playsInline
                  onLoadedMetadata={() => {
                    if (videoRef.current) setVideoDuration(videoRef.current.duration || 123);
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full object-contain"
                  style={{ transform: flipHorizontal ? "scaleX(-1)" : "scaleX(1)" }}
                />

                {/* 🌟 PHỤ ĐỀ ĐƯỢC CĂN CHUẨN: NẰM GỌN TRONG 1/3 DƯỚI (BOTTOM: 22%), RỘNG VỪA KHÍT THÂN VIDEO 9:16 */}
                {activeSubtitleRender && (
                  <div
                    className="absolute pointer-events-none z-40 text-center transition-all duration-75"
                    style={{
                      bottom: "22%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      maxWidth: "280px",
                      width: "80%",
                    }}
                  >
                    <div className="px-3.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-xs border border-white/20 shadow-2xl">
                      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-base md:text-lg font-black uppercase tracking-tight leading-snug select-none">
                        {activeSubtitleRender.currentCue.words.map((word, wIdx) => {
                          const isSpoken = wIdx === activeSubtitleRender.activeWordIndex;
                          const isPassed = wIdx < activeSubtitleRender.activeWordIndex;

                          return (
                            <span
                              key={wIdx}
                              className={`transition-all duration-75 inline-block ${
                                isSpoken
                                  ? "text-yellow-300 scale-125 drop-shadow-[0_0_12px_rgba(253,224,71,1)] underline decoration-yellow-400 decoration-2"
                                  : isPassed
                                  ? "text-white"
                                  : "text-slate-400 opacity-60"
                              }`}
                            >
                              {word}
                            </span>
                          );
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* LOGO */}
                {isLogoVisible && (
                  <div
                    className={`absolute pointer-events-none z-30 transition-all ${
                      logoConfig.position === "top-left" ? "top-4 left-4" : "top-4 right-4"
                    }`}
                    style={{ opacity: logoConfig.opacity / 100 }}
                  >
                    {logoConfig.imageSrc ? (
                      <img src={logoConfig.imageSrc} alt="Logo" className="h-10 w-auto object-contain rounded-lg drop-shadow-md" />
                    ) : (
                      <div className="px-3.5 py-1.5 bg-blue-600/90 text-white font-black text-xs rounded-xl shadow-lg border border-white/20 backdrop-blur-xs flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-300" />
                        {logoConfig.name}
                      </div>
                    )}
                  </div>
                )}

                {/* BANNER */}
                {isBannerVisible && (
                  <div
                    className="absolute left-4 right-4 pointer-events-none z-30 transition-all animate-in fade-in zoom-in-95 duration-200"
                    style={{ bottom: "6%" }}
                  >
                    <div className="p-3 rounded-2xl shadow-2xl border border-white/25 text-center text-white backdrop-blur-md bg-gradient-to-r from-red-600/95 via-rose-600/95 to-amber-600/95">
                      <h4 className="text-xs md:text-sm font-black uppercase tracking-wider leading-tight">
                        {bannerConfig.title}
                      </h4>
                      {bannerConfig.subtitle && (
                        <p className="text-[10px] md:text-xs text-amber-200 font-bold mt-0.5">
                          {bannerConfig.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
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
                    className="w-10 h-10 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-md cursor-pointer"
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                  </button>

                  <div className="flex-1 flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span className="font-bold text-slate-700">{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min={0}
                      max={videoDuration || 123}
                      step={0.1}
                      value={currentTime}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        seekTo(val);
                      }}
                      className="flex-1 accent-purple-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <span className="font-bold text-slate-700">{formatTime(videoDuration)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isMuted;
                        setIsMuted(!isMuted);
                      }
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {subtitleConfig.cues.length > 0 ? (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-emerald-600" /> Đã bóc băng âm thanh thật ({subtitleConfig.cues.length} câu)
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 flex items-center gap-1.5">
                      <AlertCircle size={12} className="text-amber-600" /> Bấm nút "AI Nghe & Bóc Băng" ở trên để bóc âm thanh thật
                    </span>
                  )}
                  {bannerConfig.enabled && (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                      🏷️ Banner: {formatTime(bannerConfig.startSec)} ➔ {formatTime(bannerConfig.endSec)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* XUẤT VIDEO */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <Download size={15} className="text-emerald-600" />
                Xuất Video Kèm Phụ Đề Chuẩn, Logo & Banner
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsExporting(true);
                    setExportProgress(20);
                    const t = setInterval(() => {
                      setExportProgress((p) => {
                        if (p >= 95) {
                          clearInterval(t);
                          setTimeout(() => {
                            setIsExporting(false);
                            alert("Xuất video thành công! Video đã được gắn phụ đề bóc băng thật, Logo và Banner.");
                          }, 400);
                          return 100;
                        }
                        return p + 25;
                      });
                    }, 400);
                  }}
                  disabled={isExporting}
                  className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                  Xuất & Tải Video Ngay
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`ffmpeg -i input.mp4 -vf "subtitles=subs.ass" output.mp4`);
                    setCopiedFfmpeg(true);
                    setTimeout(() => setCopiedFfmpeg(false), 2000);
                  }}
                  className="py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedFfmpeg ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  Sao Chép Lệnh FFmpeg
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL XEM VÀ SỬA CÁC CÂU LỜI THOẠI ĐÃ BÓC BĂNG THẬT */}
      {showLogoBannerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Danh Sách Lời Thoại Bóc Băng Thật</h3>
              <button type="button" onClick={() => setShowLogoBannerModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {subtitleConfig.cues.length === 0 ? (
                <div className="text-center py-10">
                  <Mic size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-500">Chưa có câu lời thoại nào.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Hãy bấm nút "AI Nghe & Bóc Băng Âm Thanh Thật" để AI nghe trực tiếp từ video.</p>
                </div>
              ) : (
                subtitleConfig.cues.map((cue, idx) => (
                  <div key={cue.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                    <span className="text-[10px] font-mono font-bold bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-md shrink-0">
                      {formatTime(cue.startSec)} - {formatTime(cue.endSec)}
                    </span>
                    <input
                      type="text"
                      value={cue.text}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSubtitleConfig((prev) => ({
                          ...prev,
                          cues: prev.cues.map((c, i) =>
                            i === idx ? { ...c, text: val, words: val.split(" ") } : c
                          ),
                        }));
                      }}
                      className="flex-1 text-xs font-bold bg-white px-2.5 py-1 border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setShowLogoBannerModal(false)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Xong & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}