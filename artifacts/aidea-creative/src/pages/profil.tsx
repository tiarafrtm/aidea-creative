import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CalendarCheck,
  ClipboardList,
  Loader2,
  LogOut,
  MessageSquare,
  Save,
  Star,
  Upload,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type BookingRow = {
  id: string;
  kode_booking: string;
  tanggal_sesi: string;
  jam_sesi: string;
  status: string;
  total_harga: number;
  nama_pemesan?: string;
  catatan_pelanggan?: string;
};

type PesananRow = {
  id: string;
  kode_pesanan: string;
  status: string;
  total_harga: number;
  created_at: string;
};

type TestimoniRow = {
  id: string;
  rating: number;
  komentar: string;
  is_approved: boolean;
  created_at: string;
};

const STATUS_BOOKING: Record<string, { label: string; className: string }> = {
  menunggu:    { label: "Menunggu",    className: "bg-amber-100 text-amber-800 border border-amber-200" },
  dikonfirmasi:{ label: "Dikonfirmasi",className: "bg-blue-100 text-blue-800 border border-blue-200" },
  selesai:     { label: "Selesai",     className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  dibatalkan:  { label: "Dibatalkan",  className: "bg-red-100 text-red-800 border border-red-200" },
};

const STATUS_PESANAN: Record<string, { label: string; className: string }> = {
  pending:    { label: "Menunggu",   className: "bg-amber-100 text-amber-800 border border-amber-200" },
  processing: { label: "Diproses",   className: "bg-blue-100 text-blue-800 border border-blue-200" },
  shipped:    { label: "Dikirim",    className: "bg-violet-100 text-violet-800 border border-violet-200" },
  completed:  { label: "Selesai",    className: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  cancelled:  { label: "Dibatalkan", className: "bg-red-100 text-red-800 border border-red-200" },
};

function StatusBadge({ status, map }: { status: string; map: Record<string, { label: string; className: string }> }) {
  const s = map[status];
  if (!s) return <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">{status}</span>;
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${s.className}`}>{s.label}</span>;
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
      <Icon className="h-10 w-10 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function formatTanggal(str: string) {
  try {
    return format(new Date(str + "T00:00:00"), "EEEE, dd MMMM yyyy", { locale: idLocale });
  } catch {
    return str;
  }
}

export default function Profil() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();

  const [namaLengkap, setNamaLengkap] = useState("");
  const [noTelepon, setNoTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const [fotoProfil, setFotoProfil] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [booking, setBooking] = useState<BookingRow[]>([]);
  const [pesanan, setPesanan] = useState<PesananRow[]>([]);
  const [testimoni, setTestimoni] = useState<TestimoniRow[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setNamaLengkap(profile.nama_lengkap ?? "");
    setNoTelepon(profile.no_telepon ?? "");
    setAlamat(profile.alamat ?? "");
    setFotoProfil(profile.foto_profil ?? "");
  }, [profile]);

  useEffect(() => {
    if (!supabase || !user) return;
    setDataLoading(true);
    Promise.all([
      supabase
        .from("booking")
        .select("id,kode_booking,tanggal_sesi,jam_sesi,status,total_harga,nama_pemesan,catatan_pelanggan")
        .eq("pelanggan_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("pesanan_produk")
        .select("id,kode_pesanan,status,total_harga,created_at")
        .eq("pelanggan_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("testimoni")
        .select("id,rating,komentar,is_approved,created_at")
        .eq("pelanggan_id", user.id)
        .order("created_at", { ascending: false }),
    ]).then(([b, p, t]) => {
      if (!b.error) setBooking((b.data ?? []) as BookingRow[]);
      if (!p.error) setPesanan((p.data ?? []) as PesananRow[]);
      if (!t.error) setTestimoni((t.data ?? []) as TestimoniRow[]);
      setDataLoading(false);
    });
  }, [user]);

  const saveProfile = async () => {
    if (!supabase || !user) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nama_lengkap: namaLengkap,
        no_telepon: noTelepon || null,
        alamat: alamat || null,
        foto_profil: fotoProfil || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    setIsSaving(false);
    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
      return;
    }
    await refreshProfile();
    toast({ title: "Profil tersimpan", description: "Data profil berhasil diperbarui." });
  };

  const uploadAvatar = async (file: File) => {
    if (!supabase || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Ukuran terlalu besar", description: "Maksimal 5MB.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
    if (uploadError) {
      setIsUploading(false);
      const msg = /not.found|bucket/i.test(uploadError.message)
        ? "Bucket 'avatars' belum dibuat di Supabase Storage."
        : uploadError.message;
      toast({ title: "Upload gagal", description: msg, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setFotoProfil(data.publicUrl);
    await supabase.from("profiles").update({ foto_profil: data.publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id);
    setIsUploading(false);
    await refreshProfile();
    toast({ title: "Foto profil diperbarui" });
  };

  const initials = namaLengkap
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AC";

  const joinDate = user?.created_at
    ? format(new Date(user.created_at), "MMMM yyyy", { locale: idLocale })
    : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-10 max-w-4xl space-y-6">

        {/* ── Account header ── */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative shrink-0">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={fotoProfil} />
                <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:bg-primary/90 disabled:opacity-50 transition"
                title="Ganti foto profil"
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold truncate">{namaLengkap || "—"}</h1>
                {profile?.role === "admin" && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">Admin</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              {joinDate && <p className="text-xs text-muted-foreground mt-0.5">Bergabung sejak {joinDate}</p>}
            </div>
            <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 shrink-0">
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-lg font-bold leading-none">{booking.length}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Booking</p>
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{pesanan.length}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Pesanan</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Main tabs ── */}
        <Tabs defaultValue="booking" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-auto">
            <TabsTrigger value="profil" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Profil</span>
              <span className="sm:hidden">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="booking" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Booking</span>
              {booking.filter(b => b.status === "menunggu" || b.status === "dikonfirmasi").length > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {booking.filter(b => b.status === "menunggu" || b.status === "dikonfirmasi").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pesanan" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Pesanan</span>
            </TabsTrigger>
            <TabsTrigger value="testimoni" className="gap-1.5 py-2.5 text-xs sm:text-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Testimoni</span>
              <span className="sm:hidden">Review</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Profil tab ── */}
          <TabsContent value="profil" className="mt-4">
            <Card>
              <CardContent className="p-6 space-y-5">
                <h2 className="font-semibold text-base">Data Diri</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="namaLengkap">Nama Lengkap</Label>
                    <Input id="namaLengkap" value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noTelepon">No Telepon / WhatsApp</Label>
                    <Input id="noTelepon" value={noTelepon} onChange={(e) => setNoTelepon(e.target.value)} placeholder="08xxxxxxxxxx" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="alamat">Alamat</Label>
                    <Textarea id="alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} className="resize-none" rows={3} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveProfile} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Simpan Perubahan
                  </Button>
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">Keluar dari Akun</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Sesi di perangkat ini akan diakhiri.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsSigningOut(true);
                      try { await signOut(); } finally { setIsSigningOut(false); }
                    }}
                    disabled={isSigningOut}
                    className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground self-start sm:self-auto"
                  >
                    {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                    Keluar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Booking tab ── */}
          <TabsContent value="booking" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {dataLoading ? (
                  <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : booking.length === 0 ? (
                  <EmptyState icon={CalendarCheck} text="Belum ada booking. Yuk buat booking pertamamu!" />
                ) : (
                  <ul className="divide-y divide-border">
                    {booking.map((item) => (
                      <li key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm font-mono">{item.kode_booking}</span>
                            <StatusBadge status={item.status} map={STATUS_BOOKING} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatTanggal(item.tanggal_sesi)} · {item.jam_sesi}
                          </p>
                          {item.catatan_pelanggan && (
                            <p className="text-xs text-muted-foreground truncate max-w-sm italic">"{item.catatan_pelanggan}"</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-bold text-base">Rp {item.total_harga.toLocaleString("id-ID")}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Pesanan tab ── */}
          <TabsContent value="pesanan" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {dataLoading ? (
                  <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : pesanan.length === 0 ? (
                  <EmptyState icon={ClipboardList} text="Belum ada pesanan produk." />
                ) : (
                  <ul className="divide-y divide-border">
                    {pesanan.map((item) => (
                      <li key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm font-mono">{item.kode_pesanan}</span>
                            <StatusBadge status={item.status} map={STATUS_PESANAN} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(item.created_at), "dd MMMM yyyy", { locale: idLocale })}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-bold text-base">Rp {item.total_harga.toLocaleString("id-ID")}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Testimoni tab ── */}
          <TabsContent value="testimoni" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {dataLoading ? (
                  <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : testimoni.length === 0 ? (
                  <EmptyState icon={MessageSquare} text="Belum ada testimoni yang dikirim." />
                ) : (
                  <ul className="divide-y divide-border">
                    {testimoni.map((item) => (
                      <li key={item.id} className="p-5 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < item.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
                              />
                            ))}
                            <span className="ml-1 text-sm font-medium">{item.rating}/5</span>
                          </div>
                          <Badge variant={item.is_approved ? "default" : "outline"} className="text-xs">
                            {item.is_approved ? "Ditampilkan" : "Menunggu Review"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">"{item.komentar}"</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), "dd MMMM yyyy", { locale: idLocale })}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
