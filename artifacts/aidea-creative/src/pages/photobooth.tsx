import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Download, RefreshCw, Sparkles, Zap, ZapOff } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

type Theme = {
  id: string;
  name: string;
  stripBg: string;
  headerBg: string;
  headerText: string;
  borderColor: string;
  footerBg: string;
  footerText: string;
  accentColor: string;
  accentText: string;
  cardClass: string;
  selectedClass: string;
};

const THEMES: Theme[] = [
  {
    id: "classic",
    name: "Classic White",
    stripBg: "#FFFFFF",
    headerBg: "#1e3a8a",
    headerText: "#FFFFFF",
    borderColor: "#1e3a8a",
    footerBg: "#1e3a8a",
    footerText: "#FFFFFF",
    accentColor: "#1e3a8a",
    accentText: "#FFFFFF",
    cardClass: "bg-blue-50 border-blue-100",
    selectedClass: "ring-2 ring-blue-700 border-blue-700",
  },
  {
    id: "pink",
    name: "Pink Blossom",
    stripBg: "#FFF0F6",
    headerBg: "#db2777",
    headerText: "#FFFFFF",
    borderColor: "#db2777",
    footerBg: "#db2777",
    footerText: "#FFFFFF",
    accentColor: "#db2777",
    accentText: "#FFFFFF",
    cardClass: "bg-pink-50 border-pink-100",
    selectedClass: "ring-2 ring-pink-600 border-pink-600",
  },
  {
    id: "dark",
    name: "Midnight",
    stripBg: "#111827",
    headerBg: "#f59e0b",
    headerText: "#111111",
    borderColor: "#f59e0b",
    footerBg: "#f59e0b",
    footerText: "#111111",
    accentColor: "#1f2937",
    accentText: "#f59e0b",
    cardClass: "bg-gray-100 border-gray-200",
    selectedClass: "ring-2 ring-gray-800 border-gray-800",
  },
  {
    id: "gold",
    name: "Gold Wedding",
    stripBg: "#FEFCF3",
    headerBg: "#92400e",
    headerText: "#FDE68A",
    borderColor: "#b45309",
    footerBg: "#92400e",
    footerText: "#FDE68A",
    accentColor: "#92400e",
    accentText: "#FDE68A",
    cardClass: "bg-amber-50 border-amber-100",
    selectedClass: "ring-2 ring-amber-700 border-amber-700",
  },
  {
    id: "teal",
    name: "Teal Fresh",
    stripBg: "#F0FDFA",
    headerBg: "#0f766e",
    headerText: "#FFFFFF",
    borderColor: "#0f766e",
    footerBg: "#0f766e",
    footerText: "#FFFFFF",
    accentColor: "#0f766e",
    accentText: "#FFFFFF",
    cardClass: "bg-teal-50 border-teal-100",
    selectedClass: "ring-2 ring-teal-700 border-teal-700",
  },
  {
    id: "purple",
    name: "Purple Dream",
    stripBg: "#FAF5FF",
    headerBg: "#6d28d9",
    headerText: "#FFFFFF",
    borderColor: "#6d28d9",
    footerBg: "#6d28d9",
    footerText: "#FFFFFF",
    accentColor: "#6d28d9",
    accentText: "#FFFFFF",
    cardClass: "bg-violet-50 border-violet-100",
    selectedClass: "ring-2 ring-violet-700 border-violet-700",
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

    ctx.fillStyle = theme.stripBg;
    ctx.fillRect(0, 0, STRIP_W, STRIP_H);

    ctx.fillStyle = theme.borderColor;
    ctx.fillRect(0, 0, 6, STRIP_H);
    ctx.fillRect(STRIP_W - 6, 0, 6, STRIP_H);

    ctx.fillStyle = theme.headerBg;
    ctx.fillRect(0, 0, STRIP_W, STRIP_HEADER_H);
    ctx.fillStyle = theme.headerText;
    ctx.font = "bold 18px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AideaCreative Studio Foto", STRIP_W / 2, STRIP_HEADER_H / 2 - 6);
    ctx.font = "12px Arial, sans-serif";
    ctx.fillStyle = theme.headerText + "BB";
    ctx.fillText(
      `${theme.name}  ·  ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`,
      STRIP_W / 2,
      STRIP_HEADER_H / 2 + 12
    );

    const loadAndDraw = async () => {
      for (let i = 0; i < photos.length; i++) {
        const img = new Image();
        await new Promise<void>((res) => {
          img.onload = () => {
            const x = STRIP_PAD_X;
            const y = STRIP_HEADER_H + i * (PHOTO_H + STRIP_GAP);
            ctx.fillStyle = theme.borderColor;
            ctx.fillRect(x - 4, y - 4, PHOTO_W + 8, PHOTO_H + 8);
            ctx.save();
            drawRoundRect(ctx, x, y, PHOTO_W, PHOTO_H, 2);
            ctx.clip();
            const sw = img.naturalWidth, sh = img.naturalHeight;
            const targetRatio = PHOTO_W / PHOTO_H;
            const srcRatio = sw / sh;
            let sx = 0, sy = 0, sW = sw, sH = sh;
            if (srcRatio > targetRatio) { sW = sh * targetRatio; sx = (sw - sW) / 2; }
            else { sH = sw / targetRatio; sy = (sh - sH) / 2; }
            ctx.drawImage(img, sx, sy, sW, sH, x, y, PHOTO_W, PHOTO_H);
            ctx.restore();
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

      const fy = STRIP_H - STRIP_FOOTER_H;
      ctx.fillStyle = theme.footerBg;
      ctx.fillRect(0, fy, STRIP_W, STRIP_FOOTER_H);
      ctx.fillStyle = theme.footerText;
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Web Photobooth - AideaCreative", STRIP_W / 2, fy + 20);
      ctx.font = "11px Arial";
      ctx.fillStyle = theme.footerText + "CC";
      ctx.fillText("Studio Foto Pringsewu, Lampung", STRIP_W / 2, fy + 40);

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
    } catch {
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
    const vw = video.videoWidth, vh = video.videoHeight;
    const targetRatio = PHOTO_W / PHOTO_H;
    const srcRatio = vw / vh;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (srcRatio > targetRatio) { sw = vh * targetRatio; sx = (vw - sw) / 2; }
    else { sh = vw / targetRatio; sy = (vh - sh) / 2; }
    if (mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
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

  const retake = useCallback(() => {
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
    <div className="bg-muted/30 min-h-screen">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">

        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary mb-4">
            <Camera className="h-3 w-3" /> Web Photobooth
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Photobooth Virtual
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl">
            Pilih tema frame, klik Mulai — countdown otomatis 3-2-1 dan 4 foto diambil berturut-turut.
            Download hasilnya sebagai photo strip!
          </p>
        </div>

        {/* ── SETUP SCREEN ── */}
        {step === "setup" && (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1 min-w-0 space-y-6">

              {/* Theme picker */}
              <div className="bg-background rounded-2xl border border-border p-5 shadow-sm">
                <p className="text-sm font-semibold mb-4">Pilih Tema Frame</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t)}
                      className={`relative rounded-xl p-3 text-left border-2 transition-all ${
                        theme.id === t.id
                          ? `${t.selectedClass} ${t.cardClass}`
                          : "border-border bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      {theme.id === t.id && (
                        <div
                          className="absolute top-2 right-2 h-4 w-4 rounded-full flex items-center justify-center"
                          style={{ background: t.accentColor }}
                        >
                          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                      {/* Mini strip preview */}
                      <div
                        className="w-full h-14 rounded-md mb-2 overflow-hidden relative"
                        style={{ background: t.stripBg, border: `2px solid ${t.borderColor}` }}
                      >
                        <div className="absolute inset-x-0 top-0 h-2.5" style={{ background: t.headerBg }} />
                        <div className="absolute inset-x-0 bottom-0 h-2.5" style={{ background: t.footerBg }} />
                        <div className="absolute inset-x-1.5 top-2.5 bottom-2.5 flex flex-col gap-0.5">
                          {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex-1 rounded-sm" style={{ background: t.borderColor + "25" }} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mirror toggle */}
              <div className="bg-background rounded-2xl border border-border p-5 shadow-sm flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Mode Mirror</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Flip kamera horizontal seperti selfie</p>
                </div>
                <button
                  onClick={() => setMirror(!mirror)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all border ${
                    mirror
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                  }`}
                >
                  {mirror ? <Zap className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
                  {mirror ? "Aktif" : "Nonaktif"}
                </button>
              </div>

              {camError && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                  {camError}
                </p>
              )}

              <Button
                onClick={startSession}
                className="w-full h-13 rounded-2xl text-base font-semibold gap-2"
                size="lg"
              >
                <Camera className="h-5 w-5" />
                Mulai Sesi Foto
              </Button>
            </div>

            {/* Strip preview card */}
            <div className="lg:w-[200px] shrink-0">
              <div className="bg-background rounded-2xl border border-border p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Preview Strip</p>
                <div
                  className="rounded-xl overflow-hidden shadow-md"
                  style={{ border: `3px solid ${theme.borderColor}` }}
                >
                  <div className="py-2 px-2 text-center" style={{ background: theme.headerBg }}>
                    <p className="text-[9px] font-bold leading-tight" style={{ color: theme.headerText }}>
                      AideaCreative Studio
                    </p>
                    <p className="text-[8px] opacity-80" style={{ color: theme.headerText }}>{theme.name}</p>
                  </div>
                  <div className="px-2 py-2 flex flex-col gap-1" style={{ background: theme.stripBg }}>
                    {[...Array(TOTAL_SHOTS)].map((_, i) => (
                      <div
                        key={i}
                        className="w-full rounded flex items-center justify-center"
                        style={{
                          aspectRatio: "4/3",
                          background: theme.borderColor + "15",
                          border: `1.5px solid ${theme.borderColor}`,
                        }}
                      >
                        <Camera className="h-4 w-4 opacity-20" style={{ color: theme.borderColor }} />
                      </div>
                    ))}
                  </div>
                  <div className="py-2 px-2 text-center" style={{ background: theme.footerBg }}>
                    <p className="text-[8px]" style={{ color: theme.footerText }}>Web Photobooth</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CAPTURE SCREEN ── */}
        {isCapturing && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-full max-w-2xl">
              <div
                className="relative rounded-2xl overflow-hidden shadow-xl"
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

                <AnimatePresence>
                  {step === "flash" && (
                    <motion.div
                      className="absolute inset-0 bg-white"
                      initial={{ opacity: 0.95 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {step === "countdown" && (
                    <motion.div
                      key={countdown}
                      className="absolute inset-0 flex flex-col items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.4)" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        key={countdown}
                        initial={{ scale: 1.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="text-[110px] font-black leading-none drop-shadow-2xl"
                        style={{ color: "white" }}
                      >
                        {countdown}
                      </motion.div>
                      <p className="text-white/90 font-semibold text-lg mt-2 drop-shadow">
                        Foto {shotIdx + 1} dari {TOTAL_SHOTS}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {step === "between" && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <div className="text-center">
                      <p className="text-white font-bold text-xl">Foto {photos.length} selesai!</p>
                      <p className="text-white/70 text-sm mt-1">Bersiap untuk foto {photos.length + 1}…</p>
                    </div>
                  </div>
                )}

                {step === "done" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="text-center">
                      <Sparkles className="h-8 w-8 text-white mx-auto mb-2 animate-spin" />
                      <p className="text-white font-bold">Membuat photo strip…</p>
                    </div>
                  </div>
                )}

                {step !== "done" && (
                  <div
                    className="absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold shadow"
                    style={{ background: theme.accentColor, color: theme.accentText }}
                  >
                    {photos.length} / {TOTAL_SHOTS}
                  </div>
                )}

                <div className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-[11px] font-medium bg-black/50 text-white shadow">
                  {theme.name}
                </div>
              </div>

              {/* Thumbnail strip */}
              <div className="mt-4 flex gap-2 justify-center">
                {[...Array(TOTAL_SHOTS)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg overflow-hidden bg-muted"
                    style={{
                      width: 72,
                      height: 54,
                      border: `2px solid ${i < photos.length ? theme.accentColor : "hsl(var(--border))"}`,
                    }}
                  >
                    {photos[i] ? (
                      <img src={photos[i]} className="w-full h-full object-cover" alt={`foto ${i + 1}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground font-semibold">
                        {i + 1}
                      </div>
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
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row gap-10 items-start"
          >
            {/* Strip image */}
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Photo Strip</p>
              <div
                className="rounded-2xl overflow-hidden shadow-lg"
                style={{ border: `3px solid ${theme.borderColor}` }}
              >
                <img
                  src={stripUrl}
                  alt="photo strip"
                  className="block w-auto"
                  style={{ maxHeight: "68vh", maxWidth: "min(380px, 88vw)" }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex-1 max-w-sm space-y-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-700 border border-green-200 px-3 py-1 text-xs font-semibold mb-3">
                  Sesi selesai!
                </div>
                <h2 className="text-2xl font-bold mb-1">Strip siap didownload</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  4 foto sudah digabung jadi satu strip dengan tema <span className="font-semibold text-foreground">{theme.name}</span>. Download dan bagikan ke media sosial!
                </p>
              </div>

              {/* Thumbnails */}
              <div className="grid grid-cols-4 gap-2">
                {photos.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-lg overflow-hidden aspect-[4/3]"
                    style={{ border: `2px solid ${theme.borderColor}` }}
                  >
                    <img src={p} className="w-full h-full object-cover" alt={`foto ${i + 1}`} />
                  </div>
                ))}
              </div>

              <div className="space-y-2.5">
                <Button onClick={downloadStrip} className="w-full h-11 rounded-xl font-semibold gap-2" size="lg">
                  <Download className="h-4 w-4" />
                  Download Strip PNG
                </Button>
                <Button
                  onClick={retake}
                  variant="outline"
                  className="w-full h-11 rounded-xl font-semibold gap-2"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sesi Baru / Ganti Tema
                </Button>

                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    Suka hasilnya? Yuk booking sesi foto sungguhan!
                  </p>
                  <Link href="/booking">
                    <Button variant="outline" className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                      Booking Studio Sekarang
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
