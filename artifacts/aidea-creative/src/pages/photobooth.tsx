import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, Download, RefreshCw, ChevronLeft } from "lucide-react";
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
  dot: string;
};

const THEMES: Theme[] = [
  {
    id: "classic",
    name: "Classic Blue",
    stripBg: "#FFFFFF",
    headerBg: "#1e3a8a",
    headerText: "#FFFFFF",
    borderColor: "#1e3a8a",
    footerBg: "#1e3a8a",
    footerText: "#FFFFFF",
    dot: "bg-blue-800",
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
    dot: "bg-pink-600",
  },
  {
    id: "sage",
    name: "Sage Green",
    stripBg: "#F6FAF7",
    headerBg: "#15803d",
    headerText: "#FFFFFF",
    borderColor: "#15803d",
    footerBg: "#15803d",
    footerText: "#FFFFFF",
    dot: "bg-green-700",
  },
  {
    id: "gold",
    name: "Gold Wedding",
    stripBg: "#FFFBF0",
    headerBg: "#92400e",
    headerText: "#FDE68A",
    borderColor: "#b45309",
    footerBg: "#92400e",
    footerText: "#FDE68A",
    dot: "bg-amber-800",
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
    dot: "bg-teal-700",
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
    dot: "bg-violet-700",
  },
];

const TOTAL_SHOTS = 4;

// Capture size (used by captureCanvas)
const PHOTO_W = 360;
const PHOTO_H = 270;

type Step = "preview" | "countdown" | "flash" | "between" | "processing" | "edit";

// ── Strip drawing helpers ──────────────────────────────────────────────────

function rrect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
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

function filledStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, outerR: number, innerR: number, color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function dot(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function generateStrip(photos: string[], theme: Theme): Promise<string> {
  return new Promise((resolve) => {
    // ── Layout constants ──
    const SW = 420;                // strip width
    const MX = 22;                 // horizontal margin
    const PW = SW - MX * 2;       // photo display width  = 376
    const PH = Math.round(PW * 3 / 4); // photo height 4:3 = 282
    const PTOP = 10;               // padding above photo inside polaroid card
    const PBOT = 30;               // polaroid bottom (handwriting area)
    const FRAME_H = PTOP + PH + PBOT;
    const GAP = 22;                // gap between polaroid cards
    const TOP_STRIPE = 24;        // colorful stripe at very top
    const TOP_PAD = 18;           // space after stripe before first card
    const BOT_PAD = 16;           // space before footer
    const FOOTER_H = 72;
    const SH = TOP_STRIPE + TOP_PAD + 4 * FRAME_H + 3 * GAP + BOT_PAD + FOOTER_H;

    const canvas = document.createElement("canvas");
    canvas.width = SW;
    canvas.height = SH;
    const ctx = canvas.getContext("2d")!;

    // ── Background (light tint) ──
    ctx.fillStyle = theme.stripBg;
    ctx.fillRect(0, 0, SW, SH);

    // ── Subtle dot-grid background ──
    const accent = hexToRgba(theme.borderColor, 0.09);
    for (let gy = 14; gy < SH - FOOTER_H; gy += 20) {
      for (let gx = 12; gx < SW; gx += 20) {
        dot(ctx, gx, gy, 1.2, accent);
      }
    }

    // ── Left / right colored border lines ──
    ctx.fillStyle = theme.borderColor;
    ctx.fillRect(0, 0, 7, SH);
    ctx.fillRect(SW - 7, 0, 7, SH);

    // ── Top stripe ──
    ctx.fillStyle = theme.headerBg;
    ctx.fillRect(7, 0, SW - 14, TOP_STRIPE);
    // dot pattern inside stripe
    for (let dx = 18; dx < SW - 14; dx += 18) {
      dot(ctx, dx, TOP_STRIPE / 2, 2.5, "rgba(255,255,255,0.30)");
    }
    // Stars on stripe corners
    filledStar(ctx, 22, TOP_STRIPE / 2, 5, 2.5, "rgba(255,255,255,0.55)");
    filledStar(ctx, SW - 22, TOP_STRIPE / 2, 5, 2.5, "rgba(255,255,255,0.55)");

    const loadAndDraw = async () => {
      for (let i = 0; i < photos.length; i++) {
        const frameY = TOP_STRIPE + TOP_PAD + i * (FRAME_H + GAP);
        const photoY = frameY + PTOP;

        // Polaroid shadow (slight offset underneath)
        ctx.fillStyle = hexToRgba(theme.borderColor, 0.12);
        rrect(ctx, MX + 3, frameY + 4, PW, FRAME_H, 8);
        ctx.fill();

        // Polaroid white card
        ctx.fillStyle = "#FFFFFF";
        rrect(ctx, MX, frameY, PW, FRAME_H, 8);
        ctx.fill();

        // Thin colored top accent bar on card
        ctx.fillStyle = theme.headerBg;
        ctx.save();
        rrect(ctx, MX, frameY, PW, 5, 8);
        ctx.fill();
        ctx.fillRect(MX, frameY + 3, PW, 2);
        ctx.restore();

        // Photo
        const img = new Image();
        await new Promise<void>((res) => {
          img.onload = () => {
            ctx.save();
            rrect(ctx, MX, photoY, PW, PH, 4);
            ctx.clip();
            const sw = img.naturalWidth, sh = img.naturalHeight;
            const targetRatio = PW / PH;
            const srcRatio = sw / sh;
            let sx = 0, sy = 0, sW = sw, sH = sh;
            if (srcRatio > targetRatio) { sW = sh * targetRatio; sx = (sw - sW) / 2; }
            else { sH = sw / targetRatio; sy = (sh - sH) / 2; }
            ctx.drawImage(img, sx, sy, sW, sH, MX, photoY, PW, PH);
            ctx.restore();
            res();
          };
          img.src = photos[i];
        });

        // Photo number badge (bottom-left of polaroid)
        const badgeX = MX + 12;
        const badgeY = photoY + PH + PBOT / 2;
        dot(ctx, badgeX, badgeY, 11, theme.headerBg);
        ctx.fillStyle = theme.headerText;
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${i + 1}`, badgeX, badgeY);

        // Decorative separator between cards (not after last)
        if (i < 3) {
          const sepY = frameY + FRAME_H + GAP / 2;
          const cx = SW / 2;

          // Center star
          filledStar(ctx, cx, sepY, 6, 3, hexToRgba(theme.borderColor, 0.55));
          // Flanking dots
          dot(ctx, cx - 20, sepY, 3, hexToRgba(theme.borderColor, 0.35));
          dot(ctx, cx + 20, sepY, 3, hexToRgba(theme.borderColor, 0.35));
          dot(ctx, cx - 38, sepY, 2, hexToRgba(theme.borderColor, 0.20));
          dot(ctx, cx + 38, sepY, 2, hexToRgba(theme.borderColor, 0.20));
          // Side mini-stars
          filledStar(ctx, cx - 56, sepY, 3.5, 1.8, hexToRgba(theme.borderColor, 0.25));
          filledStar(ctx, cx + 56, sepY, 3.5, 1.8, hexToRgba(theme.borderColor, 0.25));
        }
      }

      // ── Footer ──
      const fy = SH - FOOTER_H;

      // Footer background
      ctx.fillStyle = theme.footerBg;
      ctx.fillRect(7, fy, SW - 14, FOOTER_H);

      // Stars in footer corners
      filledStar(ctx, 28, fy + 18, 6, 3, hexToRgba(theme.headerText, 0.45));
      filledStar(ctx, SW - 28, fy + 18, 6, 3, hexToRgba(theme.headerText, 0.45));
      filledStar(ctx, 42, fy + 50, 3.5, 1.8, hexToRgba(theme.headerText, 0.25));
      filledStar(ctx, SW - 42, fy + 50, 3.5, 1.8, hexToRgba(theme.headerText, 0.25));

      // Separator line
      ctx.fillStyle = hexToRgba(theme.headerText, 0.18);
      ctx.fillRect(28, fy + 1, SW - 56, 1);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Studio name
      ctx.fillStyle = theme.footerText;
      ctx.font = "bold 16px Arial";
      ctx.fillText("AideaCreative Studio Foto", SW / 2, fy + 22);

      // Theme name + date
      ctx.font = "11px Arial";
      ctx.fillStyle = hexToRgba(theme.footerText, 0.75);
      ctx.fillText(theme.name, SW / 2, fy + 41);

      // Bottom info
      ctx.font = "10px Arial";
      ctx.fillStyle = hexToRgba(theme.footerText, 0.55);
      ctx.fillText(
        `Web Photobooth  •  ${new Date().toLocaleDateString("id-ID", {
          day: "2-digit", month: "long", year: "numeric",
        })}`,
        SW / 2,
        fy + 58
      );

      resolve(canvas.toDataURL("image/png"));
    };

    loadAndDraw();
  });
}

export default function Photobooth() {
  const [step, setStep] = useState<Step>("preview");
  const [theme, setTheme] = useState<Theme>(THEMES[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [shotIdx, setShotIdx] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [stripLoading, setStripLoading] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [camError, setCamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosRef = useRef<string[]>([]);
  photosRef.current = photos;

  // ── Camera management ──
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
      setCamError("Kamera tidak bisa diakses. Berikan izin kamera di browser lalu muat ulang halaman.");
    }
  }, []);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ── Capture ──
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
              setStep("processing");
            }
          }
        }, 200);
      }
    };
    timerRef.current = setTimeout(tick, 1000);
  }, [captureFrame]);

  const startCapture = useCallback(() => {
    setPhotos([]);
    setStripUrl(null);
    setShotIdx(0);
    timerRef.current = setTimeout(() => runCountdown(0), 300);
  }, [runCountdown]);

  // ── Strip generation — auto-regenerates when theme changes in edit mode ──
  useEffect(() => {
    if (step === "processing" && photosRef.current.length === TOTAL_SHOTS) {
      setStripLoading(true);
      generateStrip(photosRef.current, theme).then((url) => {
        setStripUrl(url);
        setStripLoading(false);
        stopCamera();
        setStep("edit");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== "edit" || photos.length < TOTAL_SHOTS) return;
    setStripLoading(true);
    generateStrip(photos, theme).then((url) => {
      setStripUrl(url);
      setStripLoading(false);
    });
  }, [theme, step, photos]);

  const retake = useCallback(async () => {
    setPhotos([]);
    setStripUrl(null);
    setShotIdx(0);
    setStep("preview");
    await startCamera();
  }, [startCamera]);

  const downloadStrip = () => {
    if (!stripUrl) return;
    const a = document.createElement("a");
    a.href = stripUrl;
    a.download = `photobooth-${theme.id}-${Date.now()}.png`;
    a.click();
  };

  const isCapturing =
    step === "countdown" || step === "flash" || step === "between" || step === "processing";
  const showCamera = step === "preview" || isCapturing;

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">

        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary mb-4">
            <Camera className="h-3 w-3" />
            Web Photobooth
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Photobooth Virtual
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl">
            {step === "preview" || isCapturing
              ? "Posisikan diri kamu, lalu klik Mulai Foto — countdown 3-2-1 otomatis dimulai."
              : "Foto berhasil diambil! Pilih tema frame dan download photo strip kamu."}
          </p>
        </div>

        {/* ── CAMERA SCREEN (preview + capture) ── */}
        {showCamera && (
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-full max-w-2xl">

              {/* Video frame */}
              <div
                className="relative rounded-2xl overflow-hidden shadow-xl bg-muted"
                style={{ aspectRatio: "4/3", border: "4px solid hsl(var(--border))" }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: mirror ? "scaleX(-1)" : "none" }}
                />

                {/* Camera error */}
                {camError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/90 px-6">
                    <p className="text-sm text-center text-muted-foreground">{camError}</p>
                  </div>
                )}

                {/* Flash */}
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

                {/* Countdown */}
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
                      <motion.span
                        key={countdown}
                        initial={{ scale: 1.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="text-[110px] font-black leading-none text-white drop-shadow-2xl"
                      >
                        {countdown}
                      </motion.span>
                      <p className="text-white/90 font-semibold text-lg mt-2 drop-shadow">
                        Foto {shotIdx + 1} dari {TOTAL_SHOTS}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Between shots */}
                {step === "between" && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.4)" }}
                  >
                    <div className="text-center">
                      <p className="text-white font-bold text-xl drop-shadow">
                        Foto {photos.length} selesai
                      </p>
                      <p className="text-white/70 text-sm mt-1">
                        Bersiap foto {photos.length + 1}...
                      </p>
                    </div>
                  </div>
                )}

                {/* Processing */}
                {step === "processing" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <p className="text-white font-semibold">Membuat photo strip...</p>
                  </div>
                )}

                {/* Shot counter */}
                {isCapturing && step !== "processing" && (
                  <div className="absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold bg-white/90 text-foreground shadow">
                    {photos.length} / {TOTAL_SHOTS}
                  </div>
                )}

                {/* Preview controls overlay */}
                {step === "preview" && (
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-5 gap-2 bg-gradient-to-t from-black/30 to-transparent pt-8">
                    <Button
                      onClick={startCapture}
                      size="lg"
                      className="h-12 px-10 rounded-full font-semibold shadow-lg"
                    >
                      Mulai Foto
                    </Button>
                  </div>
                )}
              </div>

              {/* Mirror toggle + instructions below camera */}
              {step === "preview" && (
                <div className="mt-3 flex items-center justify-between px-1">
                  <p className="text-xs text-muted-foreground">
                    4 foto akan diambil otomatis secara berurutan
                  </p>
                  <button
                    onClick={() => setMirror(!mirror)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                      mirror
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    Mirror {mirror ? "On" : "Off"}
                  </button>
                </div>
              )}

              {/* Thumbnail row during capture */}
              {isCapturing && step !== "processing" && (
                <div className="mt-4 flex gap-2 justify-center">
                  {[...Array(TOTAL_SHOTS)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-lg overflow-hidden bg-muted"
                      style={{
                        width: 72, height: 54,
                        border: `2px solid ${i < photos.length ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
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
              )}
            </div>

            <canvas ref={captureCanvasRef} className="hidden" />
          </div>
        )}

        {/* ── EDIT SCREEN ── */}
        {step === "edit" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row gap-8 items-start"
          >
            {/* Left: captured photos + theme picker */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* 4 captured thumbnails */}
              <div className="bg-background rounded-2xl border border-border p-5 shadow-sm">
                <p className="text-sm font-semibold mb-3">Hasil Foto</p>
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-xl overflow-hidden aspect-[4/3] bg-muted ring-1 ring-border"
                    >
                      <img src={p} className="w-full h-full object-cover" alt={`foto ${i + 1}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme picker */}
              <div className="bg-background rounded-2xl border border-border p-5 shadow-sm">
                <p className="text-sm font-semibold mb-4">Pilih Tema Frame</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEMES.map((t) => {
                    const selected = theme.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t)}
                        className={`relative rounded-xl p-3 text-left border-2 transition-all ${
                          selected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-muted/40 hover:bg-muted"
                        }`}
                      >
                        {selected && (
                          <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        )}
                        {/* Mini strip preview */}
                        <div className="w-full h-14 rounded-md mb-2.5 overflow-hidden bg-white border border-border relative">
                          <div className="absolute inset-x-0 top-0 h-3" style={{ background: t.headerBg }} />
                          <div className="absolute inset-x-0 bottom-0 h-3" style={{ background: t.footerBg }} />
                          <div className="absolute inset-x-2 top-3 bottom-3 flex flex-col gap-0.5">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="flex-1 rounded-sm" style={{ background: t.borderColor + "20" }} />
                            ))}
                          </div>
                          <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: t.borderColor }} />
                          <div className="absolute right-0 top-0 bottom-0 w-1.5" style={{ background: t.borderColor }} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${t.dot}`} />
                          <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={downloadStrip}
                  disabled={stripLoading || !stripUrl}
                  className="flex-1 h-11 rounded-xl font-semibold gap-2"
                >
                  <Download className="h-4 w-4" />
                  {stripLoading ? "Memproses..." : "Download Strip PNG"}
                </Button>
                <Button
                  onClick={retake}
                  variant="outline"
                  className="h-11 rounded-xl font-semibold gap-2 px-5"
                >
                  <RefreshCw className="h-4 w-4" />
                  Foto Ulang
                </Button>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Suka hasilnya? Yuk booking sesi foto sungguhan di studio kami!
                </p>
                <Link href="/booking">
                  <Button variant="outline" className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                    Booking Studio Sekarang
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: strip preview */}
            <div className="lg:w-[220px] shrink-0 sticky top-24">
              <div className="bg-background rounded-2xl border border-border p-4 shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  Preview Strip
                </p>
                {stripLoading ? (
                  <div className="flex flex-col gap-1.5">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-full aspect-[4/3] rounded-lg bg-muted animate-pulse" />
                    ))}
                    <p className="text-[10px] text-muted-foreground text-center mt-1">Memproses...</p>
                  </div>
                ) : stripUrl ? (
                  <div
                    className="rounded-xl overflow-hidden shadow-md"
                    style={{ border: `3px solid ${theme.borderColor}` }}
                  >
                    <img
                      src={stripUrl}
                      alt="photo strip preview"
                      className="block w-full"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
