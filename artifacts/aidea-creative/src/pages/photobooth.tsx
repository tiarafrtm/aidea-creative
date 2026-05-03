import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Download, RefreshCw, Sparkles, ChevronLeft, ZapOff, Zap } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

type Theme = {
  id: string;
  name: string;
  emoji: string;
  stripBg: string;
  headerBg: string;
  headerText: string;
  borderColor: string;
  footerBg: string;
  footerText: string;
  accentColor: string;
  previewBorder: string;
  cardBg: string;
  cardBorder: string;
};

const THEMES: Theme[] = [
  {
    id: "classic",
    name: "Classic White",
    emoji: "🤍",
    stripBg: "#FFFFFF",
    headerBg: "#1e3a8a",
    headerText: "#FFFFFF",
    borderColor: "#1e3a8a",
    footerBg: "#1e3a8a",
    footerText: "#FFFFFF",
    accentColor: "#1e3a8a",
    previewBorder: "border-[#1e3a8a]",
    cardBg: "bg-blue-50",
    cardBorder: "border-blue-200",
  },
  {
    id: "pink",
    name: "Pink Blossom",
    emoji: "🌸",
    stripBg: "#FFF0F6",
    headerBg: "#db2777",
    headerText: "#FFFFFF",
    borderColor: "#db2777",
    footerBg: "#db2777",
    footerText: "#FFFFFF",
    accentColor: "#db2777",
    previewBorder: "border-pink-500",
    cardBg: "bg-pink-50",
    cardBorder: "border-pink-200",
  },
  {
    id: "dark",
    name: "Midnight",
    emoji: "🖤",
    stripBg: "#111827",
    headerBg: "#f59e0b",
    headerText: "#111111",
    borderColor: "#f59e0b",
    footerBg: "#f59e0b",
    footerText: "#111111",
    accentColor: "#f59e0b",
    previewBorder: "border-amber-400",
    cardBg: "bg-gray-900",
    cardBorder: "border-gray-700",
  },
  {
    id: "gold",
    name: "Gold Wedding",
    emoji: "✨",
    stripBg: "#FEFCF3",
    headerBg: "#92400e",
    headerText: "#FDE68A",
    borderColor: "#b45309",
    footerBg: "#92400e",
    footerText: "#FDE68A",
    accentColor: "#b45309",
    previewBorder: "border-amber-700",
    cardBg: "bg-amber-50",
    cardBorder: "border-amber-200",
  },
  {
    id: "teal",
    name: "Teal Fresh",
    emoji: "🩵",
    stripBg: "#F0FDFA",
    headerBg: "#0f766e",
    headerText: "#FFFFFF",
    borderColor: "#0f766e",
    footerBg: "#0f766e",
    footerText: "#FFFFFF",
    accentColor: "#0f766e",
    previewBorder: "border-teal-700",
    cardBg: "bg-teal-50",
    cardBorder: "border-teal-200",
  },
  {
    id: "purple",
    name: "Purple Dream",
    emoji: "💜",
    stripBg: "#FAF5FF",
    headerBg: "#6d28d9",
    headerText: "#FFFFFF",
    borderColor: "#6d28d9",
    footerBg: "#6d28d9",
    footerText: "#FFFFFF",
    accentColor: "#6d28d9",
    previewBorder: "border-violet-700",
    cardBg: "bg-violet-50",
    cardBorder: "border-violet-200",
  },
];

const TOTAL_SHOTS = 4;
const PHOTO_W = 360;
const PHOTO_H = 270;
const STRIP_PAD_X = 20;
const STRIP_GAP = 10;
const STRIP_HEADER_H = 52;
const STRIP_FOOTER_H = 58;
const STRIP_W = PHOTO_W + STRIP_PAD_X * 2;
const STRIP_H = STRIP_HEADER_H + TOTAL_SHOTS * PHOTO_H + (TOTAL_SHOTS - 1) * STRIP_GAP + STRIP_FOOTER_H;

type Step = "setup" | "ready" | "countdown" | "flash" | "between" | "done" | "result";

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function generateStrip(photos: string[], theme: Theme): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = STRIP_W;
    canvas.height = STRIP_H;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = theme.stripBg;
    ctx.fillRect(0, 0, STRIP_W, STRIP_H);

    // Left & right border lines
    ctx.fillStyle = theme.borderColor;
    ctx.fillRect(0, 0, 6, STRIP_H);
    ctx.fillRect(STRIP_W - 6, 0, 6, STRIP_H);

    // Header
    ctx.fillStyle = theme.headerBg;
    ctx.fillRect(0, 0, STRIP_W, STRIP_HEADER_H);
    ctx.fillStyle = theme.headerText;
    ctx.font = "bold 18px 'Arial', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AideaCreative Studio Foto", STRIP_W / 2, STRIP_HEADER_H / 2 - 6);
    ctx.font = "12px 'Arial', sans-serif";
    ctx.fillStyle = theme.headerText + "BB";
    ctx.fillText(`Tema: ${theme.name}  ·  ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`, STRIP_W / 2, STRIP_HEADER_H / 2 + 12);

    const loadAndDraw = async () => {
      for (let i = 0; i < photos.length; i++) {
        const img = new Image();
        await new Promise<void>((res) => {
          img.onload = () => {
            const x = STRIP_PAD_X;
            const y = STRIP_HEADER_H + i * (PHOTO_H + STRIP_GAP);
            // photo border frame
            ctx.fillStyle = theme.borderColor;
            ctx.fillRect(x - 4, y - 4, PHOTO_W + 8, PHOTO_H + 8);
            // clip & draw photo
            ctx.save();
            drawRoundRect(ctx, x, y, PHOTO_W, PHOTO_H, 2);
            ctx.clip();
            // Center-crop the image to fill photo slot
            const sw = img.naturalWidth;
            const sh = img.naturalHeight;
            const targetRatio = PHOTO_W / PHOTO_H;
            const srcRatio = sw / sh;
            let sx = 0, sy = 0, sW = sw, sH = sh;
            if (srcRatio > targetRatio) {
              sW = sh * targetRatio;
              sx = (sw - sW) / 2;
            } else {
              sH = sw / targetRatio;
              sy = (sh - sH) / 2;
            }
            ctx.drawImage(img, sx, sy, sW, sH, x, y, PHOTO_W, PHOTO_H);
            ctx.restore();
            // Shot number badge
            ctx.fillStyle = theme.borderColor;
            ctx.beginPath();
            ctx.arc(x + 18, y + 18, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = theme.headerText;
            ctx.font = "bold 12px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${i + 1}`, x + 18, y + 18);
            res();
          };
          img.src = photos[i];
        });
      }

      // Footer
      const fy = STRIP_H - STRIP_FOOTER_H;
      ctx.fillStyle = theme.footerBg;
      ctx.fillRect(0, fy, STRIP_W, STRIP_FOOTER_H);
      ctx.fillStyle = theme.footerText;
      ctx.font = "bold 15px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📷  Web Photobooth", STRIP_W / 2, fy + 20);
      ctx.font = "11px Arial";
      ctx.fillStyle = theme.footerText + "CC";
      ctx.fillText("aidea-creative.replit.app  ·  Pringsewu, Lampung", STRIP_W / 2, fy + 40);

      resolve(canvas.toDataURL("image/png"));
    };

    loadAndDraw();
  });
}

export default function Photobooth() {
  const [step, setStep] = useState<Step>("setup");
  const [theme, setTheme] = useState<Theme>(THEMES[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [shotIdx, setShotIdx] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [mirror, setMirror] = useState(true);
  const [camError, setCamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosRef = useRef<string[]>([]);
  photosRef.current = photos;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const startCamera = useCallback(async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: any) {
      setCamError("Kamera tidak bisa diakses. Pastikan izin kamera sudah diberikan di browser.");
    }
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = PHOTO_W * 2;
    canvas.height = PHOTO_H * 2;
    const ctx = canvas.getContext("2d")!;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetRatio = PHOTO_W / PHOTO_H;
    const srcRatio = vw / vh;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (srcRatio > targetRatio) { sw = vh * targetRatio; sx = (vw - sw) / 2; }
    else { sh = vw / targetRatio; sy = (vh - sh) / 2; }
    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  }, [mirror]);

  const runCountdown = useCallback((idx: number) => {
    setStep("countdown");
    setShotIdx(idx);
    setCountdown(3);
    let c = 3;
    const tick = () => {
      c--;
      if (c > 0) {
        setCountdown(c);
        timerRef.current = setTimeout(tick, 1000);
      } else {
        // Flash + capture
        setStep("flash");
        timerRef.current = setTimeout(() => {
          const dataUrl = captureFrame();
          if (dataUrl) {
            const next = [...photosRef.current, dataUrl];
            setPhotos(next);
            if (next.length < TOTAL_SHOTS) {
              setStep("between");
              timerRef.current = setTimeout(() => runCountdown(next.length), 1800);
            } else {
              setStep("done");
              generateStrip(next, theme).then((url) => {
                setStripUrl(url);
                stopCamera();
                setStep("result");
              });
            }
          }
        }, 200);
      }
    };
    timerRef.current = setTimeout(tick, 1000);
  }, [captureFrame, stopCamera, theme]);

  const startSession = useCallback(async () => {
    setPhotos([]);
    setStripUrl(null);
    setShotIdx(0);
    setStep("ready");
    await startCamera();
    timerRef.current = setTimeout(() => runCountdown(0), 1500);
  }, [startCamera, runCountdown]);

  const retake = useCallback(async () => {
    stopCamera();
    setPhotos([]);
    setStripUrl(null);
    setShotIdx(0);
    setStep("setup");
  }, [stopCamera]);

  const downloadStrip = () => {
    if (!stripUrl) return;
    const a = document.createElement("a");
    a.href = stripUrl;
    a.download = `photobooth-${theme.id}-${Date.now()}.png`;
    a.click();
  };

  useEffect(() => () => stopCamera(), [stopCamera]);

  const isCapturing = step === "ready" || step === "countdown" || step === "flash" || step === "between" || step === "done";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar strip */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <Link href="/">
          <button className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4" /> Kembali
          </button>
        </Link>
        <div className="h-4 w-px bg-white/20" />
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Web Photobooth</span>
        </div>
        <div className="ml-auto text-xs text-white/40">AideaCreative Studio Foto</div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">

        {/* ── SETUP SCREEN ── */}
        {step === "setup" && (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Left: instructions + theme picker */}
            <div className="flex-1 min-w-0">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/20 text-primary px-3 py-1 text-xs font-bold">
                  <Sparkles className="h-3 w-3" /> PHOTOBOOTH VIRTUAL
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">
                  Abadikan momen<br />
                  <span className="text-primary">dalam 4 foto.</span>
                </h1>
                <p className="text-white/60 text-sm mb-8 leading-relaxed">
                  Pilih tema frame, klik Mulai — kamera aktif otomatis.<br />
                  Countdown 3-2-1, foto diambil 4x berturut-turut, lalu download strip-nya!
                </p>

                {/* Theme grid */}
                <div className="mb-6">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Pilih Tema Frame</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t)}
                        className={`relative rounded-2xl p-3 text-left border-2 transition-all ${
                          theme.id === t.id
                            ? `${t.cardBorder} ${t.cardBg} border-2 shadow-lg scale-[1.02]`
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        {theme.id === t.id && (
                          <div className="absolute top-2 right-2 h-4 w-4 rounded-full flex items-center justify-center" style={{ background: t.accentColor }}>
                            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </div>
                        )}
                        {/* Mini preview strip */}
                        <div className="w-full h-16 rounded-lg mb-2 overflow-hidden relative" style={{ background: t.stripBg }}>
                          <div className="absolute inset-x-0 top-0 h-3" style={{ background: t.headerBg }} />
                          <div className="absolute inset-x-0 bottom-0 h-3" style={{ background: t.footerBg }} />
                          <div className="absolute inset-x-1 top-3 bottom-3 flex flex-col gap-0.5">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="flex-1 rounded-sm" style={{ background: t.borderColor + "30" }} />
                            ))}
                          </div>
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: t.borderColor }} />
                          <div className="absolute right-0 top-0 bottom-0 w-1" style={{ background: t.borderColor }} />
                        </div>
                        <p className="text-xs font-semibold text-white truncate">{t.emoji} {t.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mirror toggle */}
                <div className="flex items-center justify-between mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-sm font-medium">Mode Mirror (Selfie)</p>
                    <p className="text-xs text-white/50">Flip kamera horizontal seperti cermin</p>
                  </div>
                  <button
                    onClick={() => setMirror(!mirror)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                      mirror ? "bg-primary text-white" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {mirror ? <Zap className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
                    {mirror ? "Aktif" : "Nonaktif"}
                  </button>
                </div>

                <Button
                  onClick={startSession}
                  className="w-full h-14 rounded-2xl text-base font-bold gap-2"
                  style={{ background: theme.accentColor }}
                >
                  <Camera className="h-5 w-5" />
                  Mulai Sesi Foto {theme.emoji}
                </Button>

                {camError && (
                  <p className="mt-3 text-sm text-red-400 text-center">{camError}</p>
                )}
              </motion.div>
            </div>

            {/* Right: strip preview */}
            <div className="lg:w-[220px] shrink-0">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Preview Strip</p>
              <div
                className="rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: theme.stripBg, border: `3px solid ${theme.borderColor}` }}
              >
                {/* Header */}
                <div className="py-2 px-3 text-center" style={{ background: theme.headerBg }}>
                  <p className="text-[10px] font-bold" style={{ color: theme.headerText }}>AideaCreative Studio</p>
                  <p className="text-[9px]" style={{ color: theme.headerText + "99" }}>{theme.name}</p>
                </div>
                {/* Photo slots */}
                <div className="px-2 py-2 flex flex-col gap-1">
                  {[...Array(TOTAL_SHOTS)].map((_, i) => (
                    <div
                      key={i}
                      className="w-full rounded overflow-hidden flex items-center justify-center"
                      style={{ aspectRatio: "4/3", background: theme.borderColor + "18", border: `2px solid ${theme.borderColor}` }}
                    >
                      <Camera className="h-5 w-5 opacity-20" style={{ color: theme.borderColor }} />
                    </div>
                  ))}
                </div>
                {/* Footer */}
                <div className="py-2 px-3 text-center" style={{ background: theme.footerBg }}>
                  <p className="text-[9px]" style={{ color: theme.footerText }}>📷 Web Photobooth</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CAPTURE SCREEN ── */}
        {isCapturing && (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-xl">
              {/* Camera frame with theme border */}
              <div
                className="relative rounded-2xl overflow-hidden shadow-2xl"
                style={{ aspectRatio: "4/3", border: `5px solid ${theme.accentColor}` }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: mirror ? "scaleX(-1)" : "none" }}
                />

                {/* Flash overlay */}
                <AnimatePresence>
                  {step === "flash" && (
                    <motion.div
                      className="absolute inset-0 bg-white"
                      initial={{ opacity: 0.9 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                    />
                  )}
                </AnimatePresence>

                {/* Countdown overlay */}
                <AnimatePresence mode="wait">
                  {step === "countdown" && (
                    <motion.div
                      key={countdown}
                      className="absolute inset-0 flex flex-col items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.35)" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        key={countdown}
                        initial={{ scale: 1.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="text-[120px] font-black leading-none drop-shadow-2xl"
                        style={{ color: theme.accentColor }}
                      >
                        {countdown}
                      </motion.div>
                      <p className="text-white/90 font-semibold text-lg mt-2">Foto {shotIdx + 1} dari {TOTAL_SHOTS}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Between shots */}
                {step === "between" && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <div className="text-center">
                      <div className="text-4xl mb-2">✅</div>
                      <p className="text-white font-bold text-lg">Foto {photos.length} disimpan!</p>
                      <p className="text-white/70 text-sm">Bersiap untuk foto {photos.length + 1}…</p>
                    </div>
                  </div>
                )}

                {/* Done processing */}
                {step === "done" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <div className="text-center">
                      <div className="text-4xl mb-2 animate-spin">⚙️</div>
                      <p className="text-white font-bold">Membuat photo strip…</p>
                    </div>
                  </div>
                )}

                {/* Shot counter pill */}
                {step !== "done" && (
                  <div
                    className="absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: theme.accentColor, color: theme.headerText }}
                  >
                    {photos.length} / {TOTAL_SHOTS}
                  </div>
                )}

                {/* Theme name badge */}
                <div className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-[10px] font-semibold bg-black/50 text-white">
                  {theme.emoji} {theme.name}
                </div>
              </div>

              {/* Thumbnail row */}
              <div className="mt-4 flex gap-2 justify-center">
                {[...Array(TOTAL_SHOTS)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg overflow-hidden"
                    style={{
                      width: 64, height: 48,
                      border: `2px solid ${i < photos.length ? theme.accentColor : "rgba(255,255,255,0.15)"}`,
                      background: i < photos.length ? "transparent" : "rgba(255,255,255,0.05)",
                    }}
                  >
                    {photos[i] ? (
                      <img src={photos[i]} className="w-full h-full object-cover" alt={`foto ${i + 1}`} style={{ transform: "none" }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-white/30 font-bold">{i + 1}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <canvas ref={captureCanvasRef} className="hidden" />
          </div>
        )}

        {/* ── RESULT SCREEN ── */}
        {step === "result" && stripUrl && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row gap-10 items-start justify-center"
          >
            {/* Strip preview */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Photo Strip Kamu</p>
              <div
                className="rounded-2xl overflow-hidden shadow-2xl max-h-[70vh]"
                style={{ border: `3px solid ${theme.accentColor}` }}
              >
                <img
                  src={stripUrl}
                  alt="photo strip"
                  className="block max-h-[70vh] w-auto"
                  style={{ maxWidth: "min(400px, 90vw)" }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex-1 max-w-sm">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-green-500/20 text-green-400 px-3 py-1 text-xs font-bold">
                🎉 Sesi Selesai!
              </div>
              <h2 className="text-2xl font-bold mb-2">Strip siap didownload!</h2>
              <p className="text-white/60 text-sm mb-6 leading-relaxed">
                4 foto sudah digabung jadi satu strip dengan tema <strong>{theme.name}</strong>. Download sekarang dan bagikan ke sosial media!
              </p>

              {/* Thumbnails */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {photos.map((p, i) => (
                  <div key={i} className="rounded-lg overflow-hidden aspect-[4/3]" style={{ border: `2px solid ${theme.accentColor}` }}>
                    <img src={p} className="w-full h-full object-cover" alt={`foto ${i + 1}`} />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={downloadStrip}
                  className="h-12 rounded-2xl font-bold gap-2 w-full"
                  style={{ background: theme.accentColor }}
                >
                  <Download className="h-4 w-4" />
                  Download Strip PNG
                </Button>

                <Button
                  onClick={retake}
                  variant="outline"
                  className="h-12 rounded-2xl font-bold gap-2 w-full border-white/20 text-white hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sesi Baru / Ganti Tema
                </Button>

                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-white/40 text-center mb-3">Suka hasilnya? Booking sesi foto sungguhan yuk!</p>
                  <Link href="/booking">
                    <Button variant="outline" className="w-full rounded-2xl border-primary/40 text-primary hover:bg-primary hover:text-white transition-colors">
                      📅 Booking Studio Sekarang
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
