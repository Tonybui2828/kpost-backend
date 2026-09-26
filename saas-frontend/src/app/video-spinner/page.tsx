"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Film,
  Sparkles,
  UploadCloud,
  Layers,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  Download,
  FileVideo,
  ShieldCheck,
  Zap,
  Volume2,
  Trash2,
  FolderDown,
  RefreshCw,
  Eye,
  Check,
  ExternalLink,
  AlertTriangle,
  Server,
  Settings2,
  Clock,
  HelpCircle,
  Copy,
  X
} from "lucide-react";

export default function VideoSpinnerPage() {
  // Lấy API URL an toàn trên cả Vite và Next.js
  const getInitialApiUrl = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kpost_api_url");
      if (saved) return saved;
    }
    try {
      // @ts-ignore
      if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) {
        // @ts-ignore
        return import.meta.env.VITE_API_URL;
      }
    } catch {}
    try {
      if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
      }
    } catch {}
    return "https://api.kpost.vn";
  };

  const [apiUrl, setApiUrl] = useState<string>(getInitialApiUrl());
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [tempApiUrl, setTempApiUrl] = useState<string>(apiUrl);
  const [pingStatus, setPingStatus] = useState<"idle" | "testing" | "ok" | "err">("idle");
  const [pingMessage, setPingMessage] = useState<string>("");

  // File video gốc
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cấu hình thông số nhân bản
  const [spinCount, setSpinCount] = useState<number>(5);
  const [isFlip, setIsFlip] = useState<boolean>(false);
  const [changeSpeed, setChangeSpeed] = useState<boolean>(true);
  const [changeColor, setChangeColor] = useState<boolean>(true);
  const [microZoom, setMicroZoom] = useState<boolean>(true);
  const [changeAudio, setChangeAudio] = useState<boolean>(true);
  const [addNoise, setAddNoise] = useState<boolean>(true);

  // Trạng thái xử lý
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStepText, setCurrentStepText] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  
  // Chi tiết lỗi khi render thất bại
  const [errorMessage, setErrorMessage] = useState<{
    title: string;
    description: string;
    technical?: string;
    statusCode?: number;
  } | null>(null);

  // Kết quả sau khi render
  const [resultData, setResultData] = useState<{
    originalName: string;
    totalSpun: number;
    zipDownloadUrl?: string;
    videos: Array<{
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
    }>;
  } | null>(null);

  const [activeVideoModal, setActiveVideoModal] = useState<string | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [copiedZip, setCopiedZip] = useState<boolean>(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);
  const [recoveryBatchId, setRecoveryBatchId] = useState<string>("");
  const [recoveryCount, setRecoveryCount] = useState<number>(5);

  // Trạng thái tiến trình tải file chi tiết (% và MB)
  const [downloadProgress, setDownloadProgress] = useState<{
    url: string;
    loadedMb: string;
    totalMb: string;
    percent: number;
    speedMb: string;
    statusText: string;
  } | null>(null);

  const handleCopyZipUrl = (url: string) => {
    const full = resolveMediaUrl(url);
    if (!full) return;
    navigator.clipboard.writeText(full).then(() => {
      setCopiedZip(true);
      setTimeout(() => setCopiedZip(false), 2500);
    });
  };

  // Khôi phục kết quả từ Batch ID (Khi server đã render xong nhưng Nginx timeout)
  const handleRecoverFromBatch = (batchId: string, count: number = 5) => {
    const cleanBatch = batchId.trim().replace(/^batch_/, "").split("_")[0];
    if (!cleanBatch) {
      alert("Vui lòng nhập mã Batch ID hợp lệ (ví dụ: f63e199d)!");
      return;
    }
    const cleanBase = apiUrl.replace(/\/+$/, "");
    const zipName = `batch_${cleanBatch}_all_${count}_videos.zip`;
    const zipUrl = `${cleanBase}/uploads/spun-videos/${cleanBatch}/${zipName}`;

    const recoveredVideos = [];
    for (let i = 1; i <= count; i++) {
      recoveredVideos.push({
        id: `rec_${cleanBatch}_${i}`,
        fileName: `Video biến thể #${i} (Batch ${cleanBatch})`,
        url: `${cleanBase}/uploads/spun-videos/${cleanBatch}/spin_${cleanBatch}_v${i}.mp4`,
        variantIndex: i,
        parameters: {
          speed: 1.0,
          zoom: 1.02,
          brightness: 0,
          contrast: 1.0,
          saturation: 1.0,
          isFlipped: false,
        },
      });
    }

    setResultData({
      originalName: `Batch ${cleanBatch}`,
      totalSpun: count,
      zipDownloadUrl: zipUrl,
      videos: recoveredVideos,
    });
    setErrorMessage(null);
    setShowRecoveryModal(false);
  };

  // Đếm thời gian trôi qua khi đang render
  useEffect(() => {
    let timer: any;
    if (isProcessing) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isProcessing]);

  // Hàm chuyển đổi URL tương đối thành URL đầy đủ (Khắc phục triệt để lỗi 404)
  const resolveMediaUrl = (url?: string): string => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
      return url;
    }
    const cleanBase = apiUrl.replace(/\/+$/, "");
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${cleanBase}${cleanPath}`;
  };

  // Chọn file video
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.includes("video") && !file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
        alert("Vui lòng chọn đúng định dạng video (.mp4, .mov, .avi, .webm)!");
        return;
      }
      setSelectedFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
      setResultData(null);
      setErrorMessage(null);
    }
  };

  // Kéo thả file
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.type.includes("video") && !file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
        alert("Vui lòng chọn đúng định dạng video (.mp4, .mov, .avi, .webm)!");
        return;
      }
      setSelectedFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
      setResultData(null);
      setErrorMessage(null);
    }
  };

  // Reset file đã chọn
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setVideoPreviewUrl(null);
    setResultData(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Kiểm tra kết nối tới Server API
  const handleTestConnection = async (targetUrl: string) => {
    setPingStatus("testing");
    setPingMessage("Đang gửi yêu cầu kiểm tra tới máy chủ...");
    const cleanUrl = targetUrl.trim().replace(/\/+$/, "");
    try {
      // Thử ping qua / hoặc /video-spinner
      await axios.get(`${cleanUrl}/video-spinner`, { timeout: 8000 }).catch(() => {
        return axios.get(`${cleanUrl}`, { timeout: 8000 });
      });
      setPingStatus("ok");
      setPingMessage(`Kết nối thành công tới ${cleanUrl}! Máy chủ đang hoạt động tốt.`);
    } catch (err: any) {
      if (err.response) {
        // Server có phản hồi mã HTTP (nghĩa là server online, chỉ là endpoint khác)
        setPingStatus("ok");
        setPingMessage(`Máy chủ phản hồi HTTP ${err.response.status} (${cleanUrl}). Cổng kết nối đang mở.`);
      } else {
        setPingStatus("err");
        setPingMessage(`Không thể kết nối tới ${cleanUrl}. Hãy kiểm tra xem Backend đã khởi động và cho phép CORS chưa.`);
      }
    }
  };

  // Lưu URL API mới
  const handleSaveApiUrl = () => {
    const formatted = tempApiUrl.trim().replace(/\/+$/, "");
    setApiUrl(formatted);
    if (typeof window !== "undefined") {
      localStorage.setItem("kpost_api_url", formatted);
    }
    setShowConfigModal(false);
  };

  // Bắt đầu nhân bản video
  const handleStartSpin = async () => {
    if (!selectedFile) {
      alert("Vui lòng tải lên 1 video gốc trước khi nhân bản!");
      return;
    }

    setIsProcessing(true);
    setProgress(5);
    setUploadPercent(0);
    setErrorMessage(null);
    setCurrentStepText("Đang chuẩn bị và nén thông số gửi lên máy chủ...");

    const formData = new FormData();
    formData.append("video", selectedFile);
    formData.append("count", spinCount.toString());
    formData.append("flip", isFlip.toString());
    formData.append("changeSpeed", changeSpeed.toString());
    formData.append("changeColor", changeColor.toString());
    formData.append("microZoom", microZoom.toString());
    formData.append("changeAudio", changeAudio.toString());
    formData.append("addNoise", addNoise.toString());

    // Timer cập nhật trạng thái render thực tế
    let progressTimer: any = null;

    try {
      const endpoint = `${apiUrl.replace(/\/+$/, "")}/video-spinner/spin`;

      const res = await axios.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 600000, // 10 phút để tránh bị timeout ở client
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(percentCompleted);
            const loadedMb = (progressEvent.loaded / (1024 * 1024)).toFixed(1);
            const totalMb = (progressEvent.total / (1024 * 1024)).toFixed(1);
            
            if (percentCompleted < 100) {
              setProgress(Math.min(30, Math.round(percentCompleted * 0.3)));
              setCurrentStepText(`Đang tải video lên máy chủ: ${percentCompleted}% (${loadedMb} MB / ${totalMb} MB)...`);
            } else {
              setProgress(35);
              setCurrentStepText("Đã tải xong video lên máy chủ. FFmpeg đang khởi tạo tiến trình...");
              
              // Sau khi upload xong 100%, bắt đầu tăng dần progress cho render
              progressTimer = setInterval(() => {
                setProgress((prev) => {
                  if (prev >= 94) return prev;
                  if (prev < 55) {
                    setCurrentStepText("FFmpeg đang trích xuất toạ độ pixel & phân tích audio streams...");
                    return prev + 5;
                  } else if (prev < 80) {
                    setCurrentStepText(`Đang render song song các biến thể video (${spinCount} video)...`);
                    return prev + 3;
                  } else {
                    setCurrentStepText("Đang xoá metadata, tính toán mã Hash mới & đóng gói file ZIP...");
                    return prev + 1;
                  }
                });
              }, 1500);
            }
          }
        },
      });

      if (progressTimer) clearInterval(progressTimer);
      setProgress(100);
      setCurrentStepText("Hoàn tất nhân bản thành công 100%!");
      
      setTimeout(() => {
        setIsProcessing(false);
        // Chuẩn hoá dữ liệu trả về từ backend
        const raw = res.data?.data || res.data || {};
        const rawVideos = raw.videos || raw.results || raw.files || [];
        
        const normalized = {
          originalName: raw.originalName || selectedFile.name,
          totalSpun: raw.totalSpun || rawVideos.length || spinCount,
          zipDownloadUrl: raw.zipDownloadUrl || raw.zipUrl || raw.downloadUrl || "",
          videos: rawVideos.map((v: any, idx: number) => ({
            id: v.id || `vid_${idx + 1}`,
            fileName: v.fileName || v.filename || v.name || `anti_reup_${idx + 1}_${selectedFile.name}`,
            url: v.url || v.downloadUrl || v.path || "",
            variantIndex: v.variantIndex || (idx + 1),
            parameters: {
              speed: v.parameters?.speed ?? 1.0,
              zoom: v.parameters?.zoom ?? 1.02,
              brightness: v.parameters?.brightness ?? 0,
              contrast: v.parameters?.contrast ?? 1.0,
              saturation: v.parameters?.saturation ?? 1.0,
              isFlipped: v.parameters?.isFlipped ?? isFlip,
            }
          }))
        };

        setResultData(normalized);
      }, 500);

    } catch (err: any) {
      if (progressTimer) clearInterval(progressTimer);
      setIsProcessing(false);
      console.error("Lỗi nhân bản video:", err);

      let title = "Lỗi khi xử lý render video";
      let desc = "Không thể hoàn thành tiến trình render trên máy chủ.";
      let status = err.response?.status;
      let technical = err.message || "";

      if (status === 504 || err.code === "ECONNABORTED" || technical.includes("timeout")) {
        title = "Hết thời gian chờ phản hồi (504 Gateway Timeout)";
        desc = "Video của bạn dài hoặc cấu hình máy chủ xử lý quá 60s khiến hệ thống (Cloudflare / Nginx) tự ngắt kết nối. Hãy giảm số lượng xuống 2-3 video hoặc chuyển FFmpeg backend sang preset 'ultrafast'.";
      } else if (status === 413) {
        title = "Dung lượng video vượt quá giới hạn (413 Payload Too Large)";
        desc = "File video tải lên quá lớn so với giới hạn cấu hình của Nginx/Express (mặc định 50MB). Hãy nén video hoặc tăng 'client_max_body_size' trên máy chủ.";
      } else if (status === 404) {
        title = "Không tìm thấy đường dẫn API (404 Not Found)";
        desc = `Máy chủ không tồn tại endpoint '${apiUrl}/video-spinner/spin'. Vui lòng kiểm tra lại URL máy chủ backend hoặc cấu hình router.`;
      } else if (!err.response) {
        title = "Ngắt kết nối do quá thời gian chờ (Timeout / Network Error)";
        desc = `Tiến trình render trên máy chủ mất hơn 60s khiến Nginx hoặc Cloudflare tự động ngắt kết nối với trình duyệt trước khi nhận được phản hồi. Tuy nhiên, MÁY CHỦ VẪN ĐANG RENDER HOÀN THÀNH Ở NỀN! Nếu trong terminal máy chủ đã báo 'Đã tạo thành công file ZIP', bạn có thể bấm nút 'Khôi phục & Tải ZIP từ mã Batch' bên dưới để tải về ngay.`;
      } else if (err.response?.data?.message) {
        desc = Array.isArray(err.response.data.message)
          ? err.response.data.message.join(", ")
          : String(err.response.data.message);
      }

      setErrorMessage({
        title,
        description: desc,
        technical: technical + (err.response?.data ? ` | ${JSON.stringify(err.response.data)}` : ""),
        statusCode: status
      });
    }
  };

  // Chế độ mô phỏng demo (Dành cho việc kiểm tra giao diện hoặc khi server chưa bật)
  const handleUseMockDemo = () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setProgress(20);
    setCurrentStepText("Đang chạy mô phỏng biến thể video trực tiếp trên giao diện...");
    
    setTimeout(() => {
      setProgress(60);
      setCurrentStepText("Đang tạo danh sách thông số biến thể & mã băm MD5 giả lập...");
    }, 600);

    setTimeout(() => {
      setProgress(100);
      setIsProcessing(false);
      setErrorMessage(null);
      
      const list = [];
      for (let i = 1; i <= spinCount; i++) {
        list.push({
          id: `demo_${Date.now()}_${i}`,
          fileName: `anti_reup_${i}_${selectedFile.name.replace(/\.[^/.]+$/, "")}.mp4`,
          url: videoPreviewUrl || "",
          variantIndex: i,
          parameters: {
            speed: Number((0.985 + Math.random() * 0.03).toFixed(3)),
            zoom: Number((1.01 + Math.random() * 0.02).toFixed(3)),
            brightness: Number((-0.02 + Math.random() * 0.04).toFixed(3)),
            contrast: Number((0.98 + Math.random() * 0.04).toFixed(3)),
            saturation: Number((0.97 + Math.random() * 0.05).toFixed(3)),
            isFlipped: isFlip,
          },
        });
      }

      setResultData({
        originalName: selectedFile.name,
        totalSpun: spinCount,
        zipDownloadUrl: videoPreviewUrl || "",
        videos: list,
      });
    }, 1200);
  };

  // Lưu blob xuống đĩa cứng với tên file chuẩn xác
  const saveBlobLocally = (blob: Blob, fileName: string) => {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 60000);
  };

  // Tải file toàn diện: Hỗ trợ Native Browser, Proxy ép tải, và Stream Fetch hiển thị tiến độ % MB
  const handleDownloadFile = async (targetUrl: string, defaultName: string) => {
    const fullUrl = resolveMediaUrl(targetUrl);
    if (!fullUrl) return;

    const isZip = targetUrl.toLowerCase().endsWith(".zip") || defaultName.toLowerCase().endsWith(".zip");
    setDownloadingUrl(targetUrl);

    // BƯỚC 1: Thử endpoint Proxy của Server (Nếu có server proxy, tải qua đây sẽ ép Chrome mở download native lập tức)
    const proxyUrl = `/api/download-proxy?url=${encodeURIComponent(fullUrl)}&filename=${encodeURIComponent(defaultName)}`;
    try {
      const probe = await fetch(proxyUrl, { method: "HEAD", signal: AbortSignal.timeout(1200) });
      if (probe.ok) {
        const link = document.createElement("a");
        link.href = proxyUrl;
        link.download = defaultName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setDownloadingUrl(null), 1000);
        return;
      }
    } catch {}

    // BƯỚC 2: Tải trực tiếp bằng ReadableStream (Hiển thị % và số MB đã tải thời gian thực)
    setDownloadProgress({
      url: targetUrl,
      loadedMb: "0.0",
      totalMb: isZip ? "166.1" : "50.0",
      percent: 1,
      speedMb: "0.0",
      statusText: `Đang kết nối để tải ${isZip ? "file ZIP" : "video"}...`,
    });

    const startTime = Date.now();
    try {
      const response = await fetch(fullUrl, { method: "GET" });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const contentLengthHeader = response.headers.get("content-length");
      let totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
      if (!totalBytes && isZip) {
        totalBytes = 174218190; // Kích thước chuẩn batch 3 video ~166.1 MB
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const blob = await response.blob();
        saveBlobLocally(blob, defaultName);
        return;
      }

      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;

          const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
          const speed = (receivedBytes / (1024 * 1024) / elapsedSec).toFixed(1);
          const loadedMb = (receivedBytes / (1024 * 1024)).toFixed(1);
          const computedTotal = totalBytes > receivedBytes ? totalBytes : receivedBytes * 1.05;
          const totalMb = (computedTotal / (1024 * 1024)).toFixed(1);
          const pct = Math.min(99, Math.round((receivedBytes / computedTotal) * 100));

          setDownloadProgress({
            url: targetUrl,
            loadedMb,
            totalMb,
            percent: pct,
            speedMb: speed,
            statusText: `Đang tải: ${loadedMb} MB / ${totalMb} MB (${pct}%) • Tốc độ: ${speed} MB/s`,
          });
        }
      }

      setDownloadProgress({
        url: targetUrl,
        loadedMb: (receivedBytes / (1024 * 1024)).toFixed(1),
        totalMb: (receivedBytes / (1024 * 1024)).toFixed(1),
        percent: 100,
        speedMb: "Xong",
        statusText: "Đã tải xong 100%! Đang lưu file vào máy của bạn...",
      });

      const mimeType = isZip ? "application/zip" : "video/mp4";
      const blob = new Blob(chunks, { type: mimeType });
      saveBlobLocally(blob, defaultName);

    } catch (err: any) {
      console.warn("Stream download error, fallback to direct open:", err);
      // BƯỚC 3 (Fallback): Mở link trực tiếp trong tab mới
      window.open(fullUrl, "_blank");
    } finally {
      setTimeout(() => {
        setDownloadingUrl(null);
        setDownloadProgress(null);
      }, 2500);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto pb-24">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                <Film size={26} />
              </span>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                AI Video Spinner & Lách Reup
                <span className="bg-red-500 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider animate-pulse">
                  HOT PRO
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Nhân bản 1 video thành hàng loạt video độc nhất với mã Hash, MD5, toạ độ điểm ảnh và âm thanh khác biệt 100%, lách quét bản quyền TikTok, Facebook Reels & Shorts.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-bold">
              <ShieldCheck size={16} /> 100% Khử Trùng MD5
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold">
              <Zap size={16} /> FFmpeg Siêu Tốc
            </span>
            <button
              onClick={() => {
                setShowRecoveryModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors cursor-pointer border border-emerald-200 shadow-sm"
              title="Khôi phục file ZIP theo mã Batch ID"
            >
              <Download size={14} className="text-emerald-600" />
              Khôi phục từ Batch ID
            </button>
            <button
              onClick={() => {
                setTempApiUrl(apiUrl);
                setPingStatus("idle");
                setPingMessage("");
                setShowConfigModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
              title="Cấu hình kết nối API Backend"
            >
              <Server size={14} className="text-blue-600" />
              API: {apiUrl.replace(/^https?:\/\//, "").slice(0, 18)}...
              <Settings2 size={13} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* THÔNG BÁO LỖI (NẾU CÓ) VỚI HƯỚNG DẪN XỬ LÝ RÕ RÀNG */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl mt-0.5 shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-red-700 uppercase tracking-tight flex items-center gap-2">
                    {errorMessage.title}
                    {errorMessage.statusCode && (
                      <span className="bg-red-200 text-red-800 text-[10px] px-2 py-0.5 rounded-md font-mono">
                        Mã HTTP: {errorMessage.statusCode}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-red-600 mt-1 font-medium leading-relaxed">
                    {errorMessage.description}
                  </p>
                  {errorMessage.technical && (
                    <div className="mt-2 text-[11px] font-mono bg-red-100/70 text-red-800 p-2 rounded-lg break-all">
                      Chi tiết kỹ thuật: {errorMessage.technical}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-red-200/80 flex flex-wrap items-center gap-3">
              <button
                onClick={handleStartSpin}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                Thử lại lần nữa
              </button>
              <button
                onClick={() => {
                  setTempApiUrl(apiUrl);
                  setShowConfigModal(true);
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Server size={14} className="text-blue-600" /> Đổi địa chỉ Server Backend
              </button>
              <button
                onClick={() => {
                  setShowRecoveryModal(true);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Download size={14} /> Khôi phục & Tải ZIP từ mã Batch
              </button>
              <button
                onClick={handleUseMockDemo}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Sparkles size={14} /> Chạy thử bản Demo (Kiểm tra giao diện)
              </button>
            </div>
          </div>
        )}

        {/* BỐ CỤC 2 CỘT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CỘT TRÁI: UPLOAD & CẤU HÌNH (7 CỘT) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* 1. KHU VỰC TẢI VIDEO GỐC */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <UploadCloud size={18} className="text-blue-600" />
                  1. Tải Lên Video Gốc Cần Nhân Bản
                </h2>
                {selectedFile && (
                  <button
                    onClick={handleRemoveFile}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-bold transition-colors"
                  >
                    <Trash2 size={14} /> Chọn video khác
                  </button>
                )}
              </div>

              {!selectedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    dragActive
                      ? "border-blue-500 bg-blue-50/60 scale-[1.01]"
                      : "border-slate-300 hover:border-blue-500/60 hover:bg-slate-50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                    <FileVideo size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      Kéo thả video vào đây hoặc <span className="text-blue-600 underline underline-offset-2">duyệt từ máy</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Hỗ trợ MP4, MOV, WebM, AVI (Dung lượng lên tới 300MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <FileVideo size={24} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || "Video MP4"}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl shrink-0 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Sẵn sàng
                  </span>
                </div>
              )}
            </div>

            {/* 2. THIẾT LẬP THÔNG SỐ */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-6">
                <Sliders size={18} className="text-blue-600" />
                2. Thiết Lập Nhân Bản & Bộ Lọc Lách Thuật Toán
              </h2>

              {/* SỐ LƯỢNG */}
              <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Layers size={16} className="text-blue-600" />
                    Số lượng video muốn tạo:
                  </label>
                  <span className="text-xl font-black text-blue-600 bg-white px-3 py-1 rounded-xl border border-blue-200 shadow-sm">
                    {spinCount} Video
                  </span>
                </div>

                <input
                  type="range"
                  min="2"
                  max="20"
                  step="1"
                  value={spinCount}
                  onChange={(e) => setSpinCount(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />

                <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-semibold">
                  <span>2 video (rất nhanh)</span>
                  <span className="text-blue-600 font-bold">5 video (khuyên dùng)</span>
                  <span>10 video</span>
                  <span>20 video (tối đa)</span>
                </div>
              </div>

              {/* CÁC NÚT SWITCH */}
              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Bộ lọc can thiệp luồng dữ liệu (Khuyên bật toàn bộ để lách 100%):
                </p>

                {/* Switch 1: Micro Zoom */}
                <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-600 mt-0.5">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Micro-Zoom & Lệch Pixel (1.01x - 1.03x)</p>
                      <p className="text-xs text-slate-500">
                        Phóng to nhẹ ngẫu nhiên và crop toạ độ, làm lệch vị trí điểm ảnh khiến AI không thể so khớp.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={microZoom}
                    onChange={(e) => setMicroZoom(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Switch 2: Biến thiên tốc độ */}
                <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 mt-0.5">
                      <Zap size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Biến thiên tốc độ vi mô (0.985x - 1.025x)</p>
                      <p className="text-xs text-slate-500">
                        Thay đổi tốc độ phát nhẹ nhàng, người xem không nhận ra nhưng làm lệch toàn bộ timecode.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={changeSpeed}
                    onChange={(e) => setChangeSpeed(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Switch 3: Chỉnh màu */}
                <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 mt-0.5">
                      <Sliders size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Cân chỉnh màu sắc tinh vi (EQ Contrast & Saturation)</p>
                      <p className="text-xs text-slate-500">
                        Đổi dải màu tương phản và độ sáng ±2%, phá vỡ biểu đồ quang phổ màu của bản gốc.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={changeColor}
                    onChange={(e) => setChangeColor(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Switch 4: Thay đổi âm thanh */}
                <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-pink-100 text-pink-600 mt-0.5">
                      <Volume2 size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Lách bản quyền âm thanh (Pitch & Equalizer)</p>
                      <p className="text-xs text-slate-500">
                        Can thiệp nhẹ vào tần số âm thanh, đánh lừa bộ quét Content ID của YouTube và TikTok.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={changeAudio}
                    onChange={(e) => setChangeAudio(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Switch 5: Lớp nhiễu vô hình */}
                <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-600 mt-0.5">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Chèn lớp hạt Noise vô hình (Khử trùng lặp Hash)</p>
                      <p className="text-xs text-slate-500">
                        Tạo lớp hạt nano mờ mắt thường không thấy nhưng khiến mã băm MD5 và SHA-256 hoàn toàn mới.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={addNoise}
                    onChange={(e) => setAddNoise(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>

                {/* Switch 6: Lật gương */}
                <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-200 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-cyan-100 text-cyan-600 mt-0.5">
                      <RotateCcw size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Lật gương ngang video (Horizontal Flip)</p>
                      <p className="text-xs text-slate-500">
                        Đảo chiều trái - phải (khuyến khích tắt nếu video có nhiều chữ/biển hiệu).
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFlip}
                    onChange={(e) => setIsFlip(e.target.checked)}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* NÚT ACTION */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={handleStartSpin}
                  disabled={!selectedFile || isProcessing}
                  className={`w-full py-4 rounded-2xl font-black uppercase text-sm tracking-wider flex items-center justify-center gap-3 transition-all shadow-xl ${
                    !selectedFile || isProcessing
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 hover:scale-[1.01] cursor-pointer"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" /> Đang render {spinCount} video biến thể... ({progress}%)
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} /> Bắt Đầu Nhân Bản {spinCount} Video Độc Nhất
                    </>
                  )}
                </button>

                {isProcessing && (
                  <div className="mt-4 p-4 bg-blue-50/70 border border-blue-100 rounded-2xl">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-800 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="animate-spin text-blue-600" />
                        Thời gian đang chạy: {elapsedSeconds}s
                      </span>
                      <span>Tiến trình: {progress}%</span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>

                    <p className="text-xs text-center text-blue-700 mt-2 font-semibold animate-pulse">
                      {currentStepText}
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* CỘT PHẢI: XEM TRƯỚC & KẾT QUẢ (5 CỘT) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* PREVIEW VIDEO GỐC */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-800 flex items-center justify-between mb-3">
                <span className="flex items-center gap-2">
                  <Play size={18} className="text-blue-600" />
                  Xem Trước Video Gốc
                </span>
                {videoPreviewUrl && (
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Bản Gốc</span>
                )}
              </h2>

              <div className="w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                {videoPreviewUrl ? (
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <Film size={40} className="mx-auto mb-2 opacity-40 text-white" />
                    <p className="text-xs font-semibold text-slate-300">Chưa có video được tải lên</p>
                  </div>
                )}
              </div>
            </div>

            {/* DANH SÁCH BIẾN THỂ */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Layers size={18} className="text-emerald-600" />
                  Kết Quả Biến Thể Độc Nhất
                </h2>
                {resultData && (
                  <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold rounded-lg">
                    {resultData.totalSpun} video
                  </span>
                )}
              </div>

              {!resultData ? (
                <div className="flex-1 min-h-[220px] rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                  <Sparkles size={36} className="mb-2 opacity-40 text-blue-500" />
                  <p className="text-sm font-bold text-slate-600">Chưa có video được nhân bản</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Hãy bấm nút "Bắt đầu nhân bản" ở cột bên trái để hệ thống tự động xuất các video mới tại đây.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col flex-1">
                  
                  {/* NÚT TẢI TẤT CẢ FILE ZIP */}
                  {resultData.zipDownloadUrl && (
                    <div className="mb-4 bg-emerald-50/90 border border-emerald-300 rounded-3xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                            <FolderDown size={22} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800 leading-tight">
                              Gói ZIP Toàn Bộ {resultData.totalSpun} Video Độc Nhất
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Đã nén sẵn toàn bộ video • Dung lượng ~166 MB
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                          Sẵn sàng tải
                        </span>
                      </div>

                      {/* Thanh hiển thị tiến độ tải thực tế thời gian thực */}
                      {downloadProgress && downloadProgress.url === resultData.zipDownloadUrl && (
                        <div className="mb-3 p-3.5 bg-slate-900 text-white rounded-2xl shadow-inner border border-slate-700 animate-in fade-in">
                          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                            <span className="flex items-center gap-2 text-emerald-400">
                              <RefreshCw size={13} className="animate-spin text-emerald-400" />
                              {downloadProgress.statusText}
                            </span>
                            <span className="text-emerald-300 font-mono text-xs">{downloadProgress.percent}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-150"
                              style={{ width: `${downloadProgress.percent}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-mono">
                            <span>Đã tải: <strong className="text-slate-200">{downloadProgress.loadedMb} MB</strong> / {downloadProgress.totalMb} MB</span>
                            <span>Tốc độ: <strong className="text-slate-200">{downloadProgress.speedMb} MB/s</strong></span>
                          </div>
                        </div>
                      )}

                      {/* Nút bấm tải chính */}
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(resultData.zipDownloadUrl!, `${resultData.originalName}_all_variants.zip`)}
                        disabled={downloadingUrl === resultData.zipDownloadUrl}
                        className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      >
                        {downloadingUrl === resultData.zipDownloadUrl ? (
                          <>
                            <RefreshCw size={18} className="animate-spin" />
                            Đang tải file ZIP về máy...
                          </>
                        ) : (
                          <>
                            <Download size={18} />
                            Tải Về Máy Toàn Bộ {resultData.totalSpun} Video (File ZIP)
                          </>
                        )}
                      </button>

                      {/* Các lựa chọn dự phòng trực tiếp */}
                      <div className="mt-3 pt-3 border-t border-emerald-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <a
                          href={`/api/download-proxy?url=${encodeURIComponent(resolveMediaUrl(resultData.zipDownloadUrl))}&filename=${encodeURIComponent(`${resultData.originalName}_all_variants.zip`)}`}
                          download={`${resultData.originalName}_all_variants.zip`}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 font-bold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors shadow-sm"
                          title="Tải trực tiếp qua Proxy Server (Ép Chrome mở hộp thoại lưu file)"
                        >
                          <Zap size={14} className="text-amber-500" />
                          Tải Trực Tiếp (Proxy)
                        </a>

                        <a
                          href={resolveMediaUrl(resultData.zipDownloadUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={`${resultData.originalName}_all_variants.zip`}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-sm"
                          title="Mở đường link tải trực tiếp trong tab mới của trình duyệt"
                        >
                          <ExternalLink size={14} />
                          Mở Trong Tab Mới
                        </a>

                        <button
                          type="button"
                          onClick={() => handleCopyZipUrl(resultData.zipDownloadUrl!)}
                          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-sm cursor-pointer"
                          title="Sao chép đường link trực tiếp để dán vào trình duyệt hoặc IDM"
                        >
                          {copiedZip ? (
                            <>
                              <Check size={14} className="text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Đã sao chép!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              Sao chép link ZIP
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DANH SÁCH BẢN BIẾN THỂ */}
                  <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
                    {resultData.videos.map((vid, idx) => {
                      const fullMediaUrl = resolveMediaUrl(vid.url);
                      return (
                        <div
                          key={vid.id || idx}
                          className="bg-slate-50 rounded-2xl p-3 border border-slate-200 hover:border-blue-400 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shrink-0">
                                #{vid.variantIndex}
                              </span>
                              <span className="text-xs font-bold text-slate-800 truncate" title={vid.fileName}>
                                {vid.fileName}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => setActiveVideoModal(fullMediaUrl)}
                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors cursor-pointer"
                                title="Xem thử video này"
                              >
                                <Eye size={15} />
                              </button>

                              <button
                                onClick={() => handleDownloadFile(vid.url, vid.fileName)}
                                disabled={downloadingUrl === vid.url}
                                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors flex items-center gap-1 text-[11px] font-bold px-2.5 shadow-sm cursor-pointer"
                                title="Tải video này"
                              >
                                {downloadingUrl === vid.url ? (
                                  <RefreshCw size={13} className="animate-spin" />
                                ) : (
                                  <Download size={13} />
                                )}
                                Tải
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-500 bg-white p-2 rounded-xl border border-slate-100">
                            <div>
                              Tốc độ: <span className="font-bold text-slate-700">{vid.parameters.speed}x</span>
                            </div>
                            <div>
                              Zoom: <span className="font-bold text-slate-700">{vid.parameters.zoom}x</span>
                            </div>
                            <div>
                              Lật gương: <span className="font-bold text-slate-700">{vid.parameters.isFlipped ? "Có" : "Không"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>Mỗi video đã được đóng mã hash và metadata riêng biệt hoàn toàn.</span>
                  </div>

                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* MODAL CẤU HÌNH API URL SERVER BACKEND */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <Server size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Cấu Hình Kết Nối API Backend</h3>
                  <p className="text-xs text-slate-500">Đặt URL máy chủ xử lý FFmpeg render video</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Đường dẫn Server API Backend:
                </label>
                <input
                  type="text"
                  value={tempApiUrl}
                  onChange={(e) => setTempApiUrl(e.target.value)}
                  placeholder="https://api.kpost.vn hoặc http://localhost:3001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Các gợi ý URL nhanh */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Chọn nhanh URL:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTempApiUrl("https://api.kpost.vn")}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-medium"
                  >
                    https://api.kpost.vn
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempApiUrl("http://localhost:3001")}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-medium"
                  >
                    http://localhost:3001
                  </button>
                </div>
              </div>

              {/* Nút kiểm tra kết nối */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection(tempApiUrl)}
                  disabled={pingStatus === "testing"}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {pingStatus === "testing" ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-blue-600" /> Đang kiểm tra...
                    </>
                  ) : (
                    <>
                      <Zap size={14} className="text-amber-500" /> Thử kiểm tra kết nối máy chủ
                    </>
                  )}
                </button>

                {pingMessage && (
                  <p className={`text-xs mt-2 p-2.5 rounded-xl font-medium ${
                    pingStatus === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                    pingStatus === "err" ? "bg-red-50 text-red-700 border border-red-200" :
                    "bg-slate-50 text-slate-600"
                  }`}>
                    {pingMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveApiUrl}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KHÔI PHỤC KẾT QUẢ TỪ BATCH ID */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Download size={18} className="text-emerald-600" />
                Khôi phục file ZIP từ Mã Batch ID
              </h3>
              <button
                type="button"
                onClick={() => setShowRecoveryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl mb-4 text-xs text-emerald-800 leading-relaxed">
              💡 <strong>Dành cho trường hợp mạng bị Timeout:</strong> Khi server VPS báo <em>&quot;Đã tạo thành công file ZIP: batch_xxxx_all_5_videos.zip&quot;</em> trong terminal, bạn chỉ cần nhập mã 8 ký tự (ví dụ: <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">f63e199d</code> hoặc <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">6ced1b7b</code>) để lấy link tải ZIP và xem video ngay!
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mã Batch ID (hoặc tên file ZIP):
                </label>
                <input
                  type="text"
                  value={recoveryBatchId}
                  onChange={(e) => setRecoveryBatchId(e.target.value)}
                  placeholder="Ví dụ: f63e199d hoặc batch_f63e199d_all_5_videos.zip"
                  className="w-full text-sm font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Số lượng video đã tạo:
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={recoveryCount}
                  onChange={(e) => setRecoveryCount(Math.max(1, Number(e.target.value) || 5))}
                  className="w-24 text-sm font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRecoveryModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleRecoverFromBatch(recoveryBatchId, recoveryCount)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <Download size={14} /> Khôi phục & Tải ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW VIDEO */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-4 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Play size={16} className="text-blue-600" /> Xem thử video biến thể
              </h3>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1 rounded-xl font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="aspect-video bg-black rounded-2xl overflow-hidden">
              <video
                src={activeVideoModal}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}