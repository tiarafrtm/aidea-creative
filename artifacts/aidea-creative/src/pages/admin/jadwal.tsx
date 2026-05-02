import { useEffect, useState } from "react";
import { Save, Loader2, Clock, Calendar as CalendarIcon, Plus, Trash2, BanIcon } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { adminFetch } from "@/lib/admin-api";

type DayRule = {
  isBuka: boolean;
  jamBuka: string;
  jamTutup: string;
  slotMenit: number;
};

type Rules = Record<string, DayRule>;

type BlacklistEntry = {
  tanggal: string;
  alasan: string;
};

type AturanResponse = {
  rules: Rules;
  hariLabel: string[];
};

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const FALLBACK_LABELS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function timeToMinutes(t: string): number {
  const [h, m] = (t || "00:00").split(":").map((n) => Number(n));
  return (h || 0) * 60 + (m || 0);
}

function previewSlots(rule: DayRule): string[] {
  if (!rule.isBuka) return [];
  const start = timeToMinutes(rule.jamBuka);
  const end = timeToMinutes(rule.jamTutup);
  const dur = Math.max(15, rule.slotMenit || 120);
  if (end <= start) return [];
  const out: string[] = [];
  for (let t = start; t + dur <= end; t += dur) {
    const h1 = String(Math.floor(t / 60)).padStart(2, "0");
    const m1 = String(t % 60).padStart(2, "0");
    const h2 = String(Math.floor((t + dur) / 60)).padStart(2, "0");
    const m2 = String((t + dur) % 60).padStart(2, "0");
    out.push(`${h1}:${m1}–${h2}:${m2}`);
  }
  return out;
}

function formatDisplayDate(tgl: string): string {
  try {
    const [y, m, d] = tgl.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const date = new Date(`${tgl}T12:00:00`);
    return `${days[date.getDay()]}, ${d} ${months[Number(m) - 1]} ${y}`;
  } catch {
    return tgl;
  }
}

const PRESETS: { label: string; description: string; build: () => Rules }[] = [
  {
    label: "Sen–Kam reguler · Jum–Min extended",
    description: "Sen–Kam 09–17 · Jum–Min 09–20, slot 2 jam.",
    build: () => {
      const r: Rules = {} as any;
      for (let i = 0; i < 7; i++) {
        const weekend = i === 0 || i === 5 || i === 6;
        r[String(i)] = { isBuka: true, jamBuka: "09:00", jamTutup: weekend ? "20:00" : "17:00", slotMenit: 120 };
      }
      return r;
    },
  },
  {
    label: "Tutup hari Minggu",
    description: "Sen–Sab buka 09–18, Minggu tutup, slot 90 menit.",
    build: () => {
      const r: Rules = {} as any;
      for (let i = 0; i < 7; i++) {
        r[String(i)] = { isBuka: i !== 0, jamBuka: "09:00", jamTutup: "18:00", slotMenit: 90 };
      }
      return r;
    },
  },
  {
    label: "Akhir pekan saja",
    description: "Hanya Jum, Sab, Min — 09–20, slot 2 jam.",
    build: () => {
      const r: Rules = {} as any;
      for (let i = 0; i < 7; i++) {
        r[String(i)] = { isBuka: i === 0 || i === 5 || i === 6, jamBuka: "09:00", jamTutup: "20:00", slotMenit: 120 };
      }
      return r;
    },
  },
];

export default function AdminJadwal() {
  const { toast } = useToast();
  const [labels, setLabels] = useState<string[]>(FALLBACK_LABELS);
  const [rules, setRules] = useState<Rules | null>(null);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTanggal, setNewTanggal] = useState("");
  const [newAlasan, setNewAlasan] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [aturanData, blacklistData] = await Promise.all([
        fetch(`${API_BASE}/api/jadwal/aturan`).then((r) => r.json()) as Promise<AturanResponse>,
        fetch(`${API_BASE}/api/jadwal/blackout`).then((r) => r.json()) as Promise<BlacklistEntry[]>,
      ]);
      setRules(aturanData.rules ?? null);
      if (Array.isArray(aturanData.hariLabel) && aturanData.hariLabel.length === 7) setLabels(aturanData.hariLabel);
      setBlacklist(Array.isArray(blacklistData) ? blacklistData : []);
    } catch (err: any) {
      toast({ title: "Gagal memuat aturan", description: err?.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (i: number, patch: Partial<DayRule>) => {
    setRules((cur) => {
      if (!cur) return cur;
      const key = String(i);
      return { ...cur, [key]: { ...cur[key], ...patch } };
    });
  };

  const applyPreset = (build: () => Rules) => {
    setRules(build());
    toast({ title: "Preset diterapkan", description: "Klik 'Simpan' untuk mengaktifkan." });
  };

  const addBlacklist = () => {
    if (!newTanggal || !/^\d{4}-\d{2}-\d{2}$/.test(newTanggal)) {
      toast({ title: "Tanggal tidak valid", variant: "destructive" });
      return;
    }
    if (blacklist.some((b) => b.tanggal === newTanggal)) {
      toast({ title: "Tanggal sudah ada dalam daftar", variant: "destructive" });
      return;
    }
    setBlacklist((prev) => [...prev, { tanggal: newTanggal, alasan: newAlasan }].sort((a, b) => a.tanggal.localeCompare(b.tanggal)));
    setNewTanggal("");
    setNewAlasan("");
  };

  const removeBlacklist = (tanggal: string) => {
    setBlacklist((prev) => prev.filter((b) => b.tanggal !== tanggal));
  };

  const save = async () => {
    if (!rules) return;
    setSaving(true);
    try {
      await Promise.all([
        adminFetch("/admin/jadwal/aturan", {
          method: "PUT",
          body: JSON.stringify({ rules }),
        }),
        adminFetch("/admin/jadwal/blackout", {
          method: "PUT",
          body: JSON.stringify({ dates: blacklist }),
        }),
      ]);
      toast({ title: "Jadwal disimpan", description: "Slot pelanggan langsung mengikuti aturan baru." });
    } catch (err: any) {
      toast({ title: "Gagal menyimpan", description: err?.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading || !rules) {
    return (
      <AdminLayout title="Jadwal Studio" subtitle="Atur jam buka per hari dalam seminggu.">
        <Skeleton className="h-96 w-full" />
      </AdminLayout>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AdminLayout
      title="Jadwal Studio"
      subtitle="Atur jam buka per hari dalam seminggu — slot booking pelanggan otomatis menyesuaikan."
    >
      <div className="space-y-6 max-w-4xl">
        {/* Preset */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" /> Preset cepat
            </CardTitle>
            <CardDescription>Pilih salah satu untuk memulai, lalu sesuaikan per hari.</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.build)}
                className="text-left rounded-lg border border-border p-3 hover:border-primary/50 hover:bg-muted/40 transition"
              >
                <div className="font-medium text-sm">{p.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Aturan per hari */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Aturan per Hari</CardTitle>
            <CardDescription>Atur jam buka, jam tutup, dan durasi tiap sesi (menit).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => {
              const key = String(i);
              const r = rules[key];
              if (!r) return null;
              const slots = previewSlots(r);
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-4 transition ${r.isBuka ? "border-border bg-card" : "border-border bg-muted/30"}`}
                >
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={r.isBuka}
                        onCheckedChange={(v) => update(i, { isBuka: v })}
                        aria-label={`Aktifkan ${labels[i]}`}
                      />
                      <div>
                        <div className="font-semibold">{labels[i]}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.isBuka ? `${slots.length} slot tersedia` : "Tutup"}
                        </div>
                      </div>
                    </div>
                    {!r.isBuka && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Tidak menerima booking
                      </Badge>
                    )}
                  </div>

                  {r.isBuka && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                        <div>
                          <Label className="text-xs">Jam Buka</Label>
                          <Input
                            type="time"
                            value={r.jamBuka}
                            onChange={(e) => update(i, { jamBuka: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Jam Tutup</Label>
                          <Input
                            type="time"
                            value={r.jamTutup}
                            onChange={(e) => update(i, { jamTutup: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Durasi Slot (menit)</Label>
                          <Input
                            type="number"
                            min={15}
                            step={15}
                            value={r.slotMenit}
                            onChange={(e) => update(i, { slotMenit: Number(e.target.value) || 120 })}
                          />
                        </div>
                      </div>
                      {slots.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {slots.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/50 text-muted-foreground"
                            >
                              <Clock className="h-3 w-3" /> {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-destructive">
                          Jam tutup harus lebih besar dari jam buka.
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Tanggal Libur / Blokir */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BanIcon className="h-4 w-4 text-destructive" /> Tanggal Libur & Blokir
            </CardTitle>
            <CardDescription>
              Blokir tanggal tertentu — libur nasional, maintenance studio, atau tanggal sudah penuh.
              Pelanggan tidak dapat memilih tanggal ini saat booking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Label className="text-xs mb-1 block">Tanggal</Label>
                <Input
                  type="date"
                  value={newTanggal}
                  min={today}
                  onChange={(e) => setNewTanggal(e.target.value)}
                />
              </div>
              <div className="flex-[2]">
                <Label className="text-xs mb-1 block">Alasan (opsional)</Label>
                <Input
                  placeholder="Contoh: Libur Idul Fitri, Studio maintenance..."
                  value={newAlasan}
                  onChange={(e) => setNewAlasan(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addBlacklist()}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addBlacklist} variant="outline" className="gap-1">
                  <Plus className="h-4 w-4" /> Tambah
                </Button>
              </div>
            </div>

            {blacklist.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                Belum ada tanggal yang diblokir.
              </div>
            ) : (
              <div className="space-y-2">
                {blacklist.map((entry) => (
                  <div
                    key={entry.tanggal}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
                  >
                    <div className="flex items-center gap-3">
                      <BanIcon className="h-4 w-4 text-destructive shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{formatDisplayDate(entry.tanggal)}</div>
                        {entry.alasan && (
                          <div className="text-xs text-muted-foreground">{entry.alasan}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeBlacklist(entry.tanggal)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end sticky bottom-4">
          <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Simpan Jadwal
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
