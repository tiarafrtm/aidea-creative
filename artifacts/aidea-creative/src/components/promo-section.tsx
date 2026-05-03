import { useEffect, useRef, useState, useCallback } from "react";
import { Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { useListPromo } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

export function PromoSection() {
  const { data } = useListPromo();
  const now = Date.now();
  const items = (Array.isArray(data) ? data : []).filter((p) => {
    if (!p.isAktif) return false;
    if (p.tanggalMulai && new Date(p.tanggalMulai).getTime() > now) return false;
    if (p.tanggalBerakhir && new Date(p.tanggalBerakhir).getTime() < now) return false;
    return true;
  });

  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHovered = useRef(false);

  const goTo = useCallback((idx: number, dir?: number) => {
    setDirection(dir ?? (idx > active ? 1 : -1));
    setActive(idx);
  }, [active]);

  const next = useCallback(() => {
    const nextIdx = (active + 1) % items.length;
    goTo(nextIdx, 1);
  }, [active, items.length, goTo]);

  const prev = useCallback(() => {
    const prevIdx = (active - 1 + items.length) % items.length;
    goTo(prevIdx, -1);
  }, [active, items.length, goTo]);

  useEffect(() => {
    if (items.length <= 1) return;
    const start = () => {
      autoTimer.current = setInterval(() => {
        if (!isHovered.current) next();
      }, 4000);
    };
    start();
    return () => { if (autoTimer.current) clearInterval(autoTimer.current); };
  }, [next, items.length]);

  if (items.length === 0) return null;

  const getSlots = () => {
    if (items.length === 1) return [{ item: items[0], slot: "center" as const, idx: 0 }];
    const prev = (active - 1 + items.length) % items.length;
    const next = (active + 1) % items.length;
    if (items.length === 2) {
      return [
        { item: items[active], slot: "center" as const, idx: active },
        { item: items[next], slot: "right" as const, idx: next },
      ];
    }
    return [
      { item: items[prev], slot: "left" as const, idx: prev },
      { item: items[active], slot: "center" as const, idx: active },
      { item: items[next], slot: "right" as const, idx: next },
    ];
  };

  const slots = getSlots();

  const slotStyles: Record<string, React.CSSProperties> = {
    left: {
      transform: "translateX(-8%) scale(0.82)",
      opacity: 0.55,
      zIndex: 1,
      filter: "blur(1px)",
    },
    center: {
      transform: "translateX(0) scale(1)",
      opacity: 1,
      zIndex: 10,
      filter: "none",
    },
    right: {
      transform: "translateX(8%) scale(0.82)",
      opacity: 0.55,
      zIndex: 1,
      filter: "blur(1px)",
    },
  };

  return (
    <section className="py-16 md:py-20 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
              <Tag className="h-3.5 w-3.5" /> Promo Berjalan
            </div>
            <h2 className="text-3xl md:text-4xl font-sans font-bold text-foreground">Penawaran Spesial</h2>
            <p className="text-muted-foreground mt-2 max-w-xl">Jangan lewatkan promo terbatas dari AideaCreative untuk paket foto dan produk pilihan.</p>
          </div>
        </div>

        <div
          className="relative flex items-center justify-center"
          style={{ minHeight: 380 }}
          onMouseEnter={() => { isHovered.current = true; }}
          onMouseLeave={() => { isHovered.current = false; }}
        >
          {/* Cards row */}
          <div className="relative w-full flex items-center justify-center" style={{ height: 360 }}>
            {slots.map(({ item: p, slot, idx }) => (
              <div
                key={p.id + slot}
                onClick={() => slot !== "center" && goTo(idx)}
                style={{
                  position: "absolute",
                  width: "clamp(240px, 38vw, 440px)",
                  transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease, filter 0.5s ease",
                  cursor: slot !== "center" ? "pointer" : "default",
                  ...slotStyles[slot],
                }}
              >
                <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-lg group">
                  {p.gambarUrl ? (
                    <div className="aspect-[16/9] overflow-hidden bg-muted">
                      <img
                        src={p.gambarUrl}
                        alt={p.judul}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div
                      className="aspect-[16/9] flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--primary)/0.05))",
                      }}
                    >
                      <Tag className="h-12 w-12 text-primary/30" />
                    </div>
                  )}
                  <div className="p-5">
                    {p.badge && (
                      <Badge className="mb-2 bg-primary text-primary-foreground">{p.badge}</Badge>
                    )}
                    <h3 className="text-base font-semibold text-foreground mb-1 line-clamp-1">{p.judul}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{p.deskripsi}</p>
                    {p.tanggalBerakhir && (
                      <p className="text-[11px] text-muted-foreground/70 mt-3">
                        Berlaku s/d{" "}
                        {new Date(p.tanggalBerakhir).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Prev / Next arrows */}
          {items.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-0 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-background/80 border border-border shadow hover:bg-background transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-0 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-background/80 border border-border shadow hover:bg-background transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Dot indicators */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                style={{
                  transition: "all 0.35s ease",
                  width: i === active ? 24 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: i === active
                    ? "hsl(var(--primary))"
                    : "hsl(var(--foreground)/0.2)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
