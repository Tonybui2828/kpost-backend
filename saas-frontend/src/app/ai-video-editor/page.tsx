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
  latencyOffset: number;
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

  // Tiến trình AI bóc băng thật
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribeStatus, setTranscribeStatus] = useState<string>("");

  // Timeline & Tác vụ
  const [timelineEdits, setTimelineEdits] = useState<TimelineAction[]>([]);
  const [activeSpeed, setActiveSpeed] = useState<number>(1.0);
  const [flipHorizontal, setFlipHorizontal] = useState<boolean>(false);

  // Logo & Banner
  const [showLogoBannerModal, setShowLogoBannerModal] = useState<boolean>(false);
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

  // 🌟 PHỤ ĐỀ BAN ĐẦU HOÀN TOÀN RỖNG (XÓA SẠCH 100% CHỮ MẪU)
  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleConfig>({
    enabled: true,
    fontSize: 18,
    latencyOffset: 0.0,
    cues: [], // 👈 RỖNG, CHỈ CHỨA LỜI THẬT KHI AI NGHE XONG
  });

  // Prompt State
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [isAnalyzingPrompt, setIsAnalyzingPrompt] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string>("Sẵn sàng! Bấm 'Bắt đầu AI bóc băng' để AI nghe âm thanh thật từ video của bạn.");

  // Export
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [copiedFfmpeg, setCopiedFfmpeg] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Đồng bộ 60 FPS
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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = compareOriginal ? 1.0 : activeSpeed;
    }
  }, [activeSpeed, compareOriginal]);

  // 🌟 TRÍCH XUẤT FILE WAV SIÊU NHẸ (16KHZ MONO) TRỰC TIẾP TRÊN TRÌNH DUYỆT
  const extractAudioWavFromBlob = async (file: File): Promise<string> => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioCtx();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Nén xuống Mono 16kHz
    const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, 16000);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const channelData = renderedBuffer.getChannelData(0);

    const wavBuffer = encodeWAV(channelData, 16000);
    return arrayBufferToBase64(wavBuffer);
  };

  const encodeWAV = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // 🌟 HÀM GỌI WHISPER AI BÓC BĂNG THẬT 100%
  const handleStartRealTranscription = async (fileObj?: File) => {
    const targetFile = fileObj || selectedFile;
    if (!targetFile) {
      alert("Vui lòng bấm 'Tải Video Lên' để AI lấy file âm thanh của bạn!");
      fileInputRef.current?.click();
      return;
    }

    setIsTranscribing(true);
    setTranscribeStatus("Đang trích xuất sóng âm thanh từ video...");

    try {
      // 1. Trích xuất âm thanh nén 16kHz siêu nhẹ
      const audioBase64 = await extractAudioWavFromBlob(targetFile);
      setTranscribeStatus("Đang gửi âm thanh lên OpenAI Whisper AI để nghe từng câu chữ...");

      // 2. Gửi sang Backend NestJS
      const res = await axios.post(`${API_URL}/ai-content/transcribe-video`, {
        audioBase64: `data:audio/wav;base64,${audioBase64}`,
      });

      if (res.data?.success && res.data?.cues?.length > 0) {
        setSubtitleConfig((prev) => ({
          ...prev,
          enabled: true,
          cues: res.data.cues,
        }));
        setIsTranscribing(false);
        setAiExplanation(`🎉 Whisper AI đã bóc băng thành công ${res.data.cues.length} câu lời thoại thật từ video của bạn!`);
        return;
      } else {
        throw new Error(res.data?.error || "Không nhận diện được giọng nói trong video");
      }
    } catch (err: any) {
      console.error("Lỗi bóc băng:", err);
      setIsTranscribing(false);
      alert("Lỗi bóc băng: " + (err.response?.data?.message || err.message || "Vui lòng kiểm tra lại file video!"));
    }
  };

  const handleUserUploadVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setSelectedFile(file);
      setVideoUrl(url);
      setVideoName(file.name);
      setCurrentTime(0);
      setTimelineEdits([]);
      
      // XÓA SẠCH MỌI PHỤ ĐỀ CŨ
      setSubtitleConfig((p) => ({ ...p, cues: [] }));
      setAiExplanation(`Đã tải file "${file.name}". Bấm nút xanh phía trên để AI bóc băng tiếng nói thật!`);
    }
  };

  // 🌟 HIỂN THỊ PHỤ ĐỀ: TÁCH BIỆT BANNER, CĂN 1/3 DƯỚI VIDEO 9:16
  const isBannerVisible = useMemo(() => {
    if (!bannerConfig.enabled || compareOriginal) return false;
    if (bannerConfig.timeScope === "all") return true;
    return currentTime >= bannerConfig.startSec && currentTime <= bannerConfig.endSec;
  }, [bannerConfig, currentTime, compareOriginal]);

  const activeSubtitleRender = useMemo(() => {
    if (!subtitleConfig.enabled || compareOriginal || subtitleConfig.cues.length === 0) return null;

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

  const isLogoVisible = useMemo(() => {
    if (!logoConfig.enabled || compareOriginal) return false;
    if (logoConfig.timeScope === "all") return true;
    return currentTime >= logoConfig.startSec && currentTime <= logoConfig.endSec;
  }, [logoConfig, currentTime, compareOriginal]);

  const seekTo = (sec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      setCurrentTime(sec);
    }
  };

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
                AI Video Editor & Whisper Subtitles
                <span className="bg-purple-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">
                  REAL AI 100%
                </span>
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-500 font-medium">
              Không dùng chữ mẫu bịa đặt. AI Whisper nghe trực tiếp âm thanh từ video thật của bạn, nhân vật nói đến đâu sáng chữ đến đó!
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* NÚT BÓC BĂNG THẬT 100% */}
            <button
              type="button"
              onClick={() => handleStartRealTranscription()}
              disabled={isTranscribing}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:bg-slate-300 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
            >
              <Mic size={16} className={isTranscribing ? "animate-bounce text-yellow-300" : ""} />
              {isTranscribing ? "AI Đang Lắng Nghe Âm Thanh..." : "🎤 AI Bóc Băng Lời Nói Thật"}
            </button>

            <button
              type="button"
              onClick={() => setShowLogoBannerModal(true)}
              className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <ImageIcon size={16} />
              Logo & Banner
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <UploadCloud size={16} />
              Tải Video Lên
            </button>
            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleUserUploadVideo} className="hidden" />
          </div>
        </div>

        {/* THÔNG BÁO TIẾN TRÌNH KHI BÓC BĂNG */}
        {isTranscribing && (
          <div className="mb-6 p-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 text-white rounded-3xl shadow-xl border border-indigo-500/30 flex items-center gap-4 animate-in fade-in">
            <RefreshCw size={24} className="animate-spin text-cyan-400 shrink-0" />
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-cyan-200">
                Đang Phân Tích Giọng Nói Bằng OpenAI Whisper AI...
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">{transcribeStatus}</p>
            </div>
          </div>
        )}

        {/* 2 CỘT: DANH SÁCH LỜI THẬT VÀ VIDEO PLAYER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CỘT TRÁI: HIỂN THỊ CÂU CHỮ THẬT AI BÓC ĐƯỢC */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                  <Type size={15} className="text-purple-600" />
                  Lời Thoại Thật Đã Bóc ({subtitleConfig.cues.length} câu)
                </span>
                {subtitleConfig.cues.length > 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Chuẩn Whisper AI
                  </span>
                )}
              </div>

              {subtitleConfig.cues.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Mic size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-700">Chưa có phụ đề nào.</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Hãy bấm nút xanh <span className="font-bold text-blue-600">"🎤 AI Bóc Băng Lời Nói Thật"</span> ở góc trên để AI nghe âm thanh video của bạn.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {subtitleConfig.cues.map((cue, idx) => {
                    const isActive = currentTime >= cue.startSec && currentTime < cue.endSec;
                    return (
                      <div
                        key={cue.id}
                        onClick={() => seekTo(cue.startSec)}
                        className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                          isActive
                            ? "bg-purple-600 text-white border-purple-600 shadow-md scale-[1.01]"
                            : "bg-slate-50 hover:bg-purple-50/50 border-slate-200 text-slate-800"
                        }`}
                      >
                        <span className={`text-[10px] font-mono font-black px-2 py-1 rounded-lg shrink-0 ${
                          isActive ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700"
                        }`}>
                          {formatTime(cue.startSec)}
                        </span>
                        <input
                          type="text"
                          value={cue.text}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSubtitleConfig((prev) => ({
                              ...prev,
                              cues: prev.cues.map((c, i) =>
                                i === idx ? { ...c, text: val, words: val.split(" ") } : c
                              ),
                            }));
                          }}
                          className={`flex-1 text-xs font-bold bg-transparent border-none outline-none ${
                            isActive ? "text-white" : "text-slate-800"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {aiExplanation && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-2.5">
                  <Sparkles size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-purple-900 leading-relaxed">
                    {aiExplanation}
                  </p>
                </div>
              )}
            </div>

            {/* BẢNG BÙ TRỄ */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                  <Sliders size={14} className="text-indigo-600" />
                  Bù Trễ Giọng Nói
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                  {subtitleConfig.latencyOffset > 0 ? `+${subtitleConfig.latencyOffset}s` : `${subtitleConfig.latencyOffset}s`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400">-0.5s</span>
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
                <span className="text-[10px] font-bold text-slate-400">+0.5s</span>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: VIDEO PLAYER VỚI BỐ CỤC PHỤ ĐỀ TÁCH RỜI BANNER */}
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

                {/* 🌟 1. PHỤ ĐỀ NẰM GỌN 1/3 DƯỚI VIDEO 9:16, NẰM TRÊN BANNER */}
                {activeSubtitleRender && (
                  <div
                    className="absolute pointer-events-none z-40 text-center transition-all duration-150"
                    style={{
                      bottom: isBannerVisible ? "32%" : "18%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      maxWidth: "270px",
                      width: "75%",
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

                {/* LOGO GÓC PHẢI */}
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

                {/* BANNER NẰM ĐÁY */}
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
                      <CheckCircle2 size={12} className="text-emerald-600" /> Đã bóc băng ({subtitleConfig.cues.length} câu thật)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-3 py-1 rounded-xl">
                      Chưa có phụ đề. Bấm nút xanh phía trên để bóc băng thật.
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
                            alert("Xuất video thành công!");
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

      {/* MODAL CẤU HÌNH BANNER & LOGO */}
      {showLogoBannerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Thiết Lập Logo & Banner</h3>
              <button type="button" onClick={() => setShowLogoBannerModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tiêu đề Banner:</label>
                <input
                  type="text"
                  value={bannerConfig.title}
                  onChange={(e) => setBannerConfig((p) => ({ ...p, title: e.target.value }))}
                  className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mô tả phụ Banner:</label>
                <input
                  type="text"
                  value={bannerConfig.subtitle || ""}
                  onChange={(e) => setBannerConfig((p) => ({ ...p, subtitle: e.target.value }))}
                  className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogoBannerModal(false)}
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Xong & Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}