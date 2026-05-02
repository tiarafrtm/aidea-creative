import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListPaket, useCreateBooking } from "@workspace/api-client-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarIcon, Loader2, CheckCircle2, Clock, PartyPopper, Copy, MessageCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type JadwalSlot = { tanggal: string; jamMulai: string; jamSelesai: string };
type DayRule = { isBuka: boolean; jamBuka: string; jamTutup: string; slotMenit: number };
type BlacklistEntry = { tanggal: string; alasan: string };
type BookedResult = {
  kodeBooking: string;
  namaPaket: string;
  tanggalSesi: Date;
  jamSesi: string;
  totalHarga: number;
};

const bookingSchema = z.object({
  namaPemesan: z.string().min(2, "Nama lengkap harus diisi"),
  email: z.string().email("Format email tidak valid"),
  telepon: z.string().min(10, "Nomor telepon tidak valid"),
  paketId: z.string().min(1, "Silakan pilih paket"),
  tanggalSesi: z.date({ required_error: "Pilih tanggal sesi" }),
  jamSesi: z.string().min(1, "Pilih jam sesi"),
  catatanPelanggan: z.string().optional(),
  konsepFoto: z.string().optional(),
});

export default function Booking() {
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const { data: paketList, isLoading: loadingPaket } = useListPaket();
  const createBooking = useCreateBooking();

  const [jamTersedia, setJamTersedia] = useState<string[]>([]);
  const [loadingJam, setLoadingJam] = useState(false);
  const [bookedResult, setBookedResult] = useState<BookedResult | null>(null);
  const [closedDays, setClosedDays] = useState<Set<number>>(new Set());
  const [blacklistDates, setBlacklistDates] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetch(`${API_BASE}/api/jadwal/aturan`)
      .then((r) => r.json())
      .then((data) => {
        const closed = new Set<number>();
        if (data.rules) {
          Object.entries(data.rules).forEach(([day, rule]: [string, any]) => {
            if (!rule.isBuka) closed.add(Number(day));
          });
        }
        setClosedDays(closed);
      })
      .catch(() => {});

    fetch(`${API_BASE}/api/jadwal/blackout`)
      .then((r) => r.json())
      .then((data: BlacklistEntry[]) => {
        if (Array.isArray(data)) {
          setBlacklistDates(new Map(data.map((d) => [d.tanggal, d.alasan])));
        }
      })
      .catch(() => {});
  }, []);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      namaPemesan: "",
      email: "",
      telepon: "",
      catatanPelanggan: "",
      konsepFoto: "",
      paketId: "",
      jamSesi: "",
    },
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paketIdParam = searchParams.get("paket");
    if (paketIdParam) form.setValue("paketId", paketIdParam);
  }, [form]);

  useEffect(() => {
    if (!user) return;
    if (profile?.nama_lengkap) form.setValue("namaPemesan", profile.nama_lengkap);
    if (profile?.no_telepon) form.setValue("telepon", profile.no_telepon);
    if (user.email) form.setValue("email", user.email);
  }, [user, profile, form]);

  const selectedTanggal = form.watch("tanggalSesi");

  useEffect(() => {
    if (!selectedTanggal) {
      setJamTersedia([]);
      return;
    }
    const tanggalStr = format(selectedTanggal, "yyyy-MM-dd");
    setLoadingJam(true);
    fetch(`${API_BASE}/api/jadwal?tanggal=${tanggalStr}`)
      .then((r) => r.json())
      .then((data: JadwalSlot[]) => {
        const slots = Array.isArray(data)
          ? data.map((j) => `${j.jamMulai} - ${j.jamSelesai}`)
          : [];
        setJamTersedia(slots);
      })
      .catch(() => setJamTersedia([]))
      .finally(() => setLoadingJam(false));
  }, [selectedTanggal]);

  const onSubmit = (values: z.infer<typeof bookingSchema>) => {
    createBooking.mutate(
      {
        data: {
          namaPemesan: values.namaPemesan,
          email: values.email,
          telepon: values.telepon,
          paketId: values.paketId,
          tanggalSesi: format(values.tanggalSesi, "yyyy-MM-dd"),
          jamSesi: values.jamSesi,
          catatanPelanggan: values.catatanPelanggan || undefined,
          konsepFoto: values.konsepFoto || undefined,
        },
      },
      {
        onSuccess: (data) => {
          const paket = Array.isArray(paketList)
            ? paketList.find((p) => p.id === values.paketId)
            : undefined;
          setBookedResult({
            kodeBooking: data.kodeBooking,
            namaPaket: (data as any).namaPaket ?? paket?.namaPaket ?? "—",
            tanggalSesi: values.tanggalSesi,
            jamSesi: values.jamSesi,
            totalHarga: Number((data as any).totalHarga ?? paket?.harga ?? 0),
          });
        },
        onError: () => {
          toast({
            title: "Gagal",
            description: "Terjadi kesalahan saat memproses booking Anda. Silakan coba lagi.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const selectedPaketId = form.watch("paketId");
  const selectedPaket = Array.isArray(paketList)
    ? paketList.find((p) => p.id === selectedPaketId)
    : undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDateDisabled = (date: Date) => {
    if (date < today) return true;
    if (closedDays.has(date.getDay())) return true;
    const dateStr = format(date, "yyyy-MM-dd");
    if (blacklistDates.has(dateStr)) return true;
    return false;
  };

  const selectedTanggalStr = selectedTanggal ? format(selectedTanggal, "yyyy-MM-dd") : null;
  const isDayClosed = selectedTanggal ? closedDays.has(selectedTanggal.getDay()) : false;
  const isDateBlocked = selectedTanggalStr ? blacklistDates.has(selectedTanggalStr) : false;
  const blockedAlasan = selectedTanggalStr ? blacklistDates.get(selectedTanggalStr) : undefined;

  if (bookedResult) {
    const waNumber = "6285279232879";
    const waText = encodeURIComponent(
      `Halo AideaCreative! Saya baru saja melakukan booking.\nKode: *${bookedResult.kodeBooking}*\nPaket: ${bookedResult.namaPaket}\nTanggal: ${format(bookedResult.tanggalSesi, "EEEE, dd MMMM yyyy", { locale: idLocale })}\nJam: ${bookedResult.jamSesi}\n\nMohon konfirmasinya, terima kasih.`
    );

    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl min-h-screen flex items-center justify-center">
        <Card className="w-full border-border shadow-lg text-center">
          <div className="bg-emerald-500/10 p-8 border-b border-border flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <PartyPopper className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-serif font-bold text-emerald-700">Booking Berhasil!</CardTitle>
            <CardDescription className="text-base">
              Terima kasih! Admin kami akan menghubungi Anda dalam 1×24 jam untuk konfirmasi.
            </CardDescription>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="bg-muted rounded-xl p-6 space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Kode Booking Anda</div>
              <div className="text-3xl font-mono font-bold tracking-widest text-primary">{bookedResult.kodeBooking}</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(bookedResult.kodeBooking);
                  toast({ title: "Disalin!", description: "Kode booking berhasil disalin." });
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
              >
                <Copy className="h-3 w-3" /> Salin kode
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-left">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Paket</div>
                <div className="font-semibold">{bookedResult.namaPaket}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Total</div>
                <div className="font-semibold">Rp {bookedResult.totalHarga.toLocaleString("id-ID")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Tanggal Sesi</div>
                <div className="font-semibold">
                  {format(bookedResult.tanggalSesi, "EEEE, dd MMM yyyy", { locale: idLocale })}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Jam Sesi</div>
                <div className="font-semibold">{bookedResult.jamSesi}</div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Simpan kode booking di atas sebagai referensi. Kami akan menghubungi Anda via WhatsApp untuk konfirmasi jadwal dan informasi pembayaran.
            </p>

            <a
              href={`https://wa.me/${waNumber}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                <MessageCircle className="h-4 w-4" /> Konfirmasi via WhatsApp
              </Button>
            </a>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = "/"}>
              Kembali ke Beranda
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl min-h-screen flex items-center justify-center">
      <Card className="w-full border-border shadow-lg">
        <div className="bg-primary/5 p-8 border-b border-border text-center">
          <CardTitle className="text-3xl font-serif font-bold mb-2">Booking Jadwal</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Isi formulir di bawah ini untuk mereservasi jadwal pemotretan Anda.
          </CardDescription>
        </div>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Informasi Kontak */}
                <div className="space-y-6">
                  <h3 className="font-serif font-semibold text-lg border-b border-border pb-2">
                    Informasi Kontak
                  </h3>

                  <FormField
                    control={form.control}
                    name="namaPemesan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Lengkap</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alamat Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telepon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nomor WhatsApp/Telepon</FormLabel>
                        <FormControl>
                          <Input placeholder="081234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="konsepFoto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Konsep Foto (Opsional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Contoh: Rustic, Minimalis, Outdoor"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Detail Reservasi */}
                <div className="space-y-6">
                  <h3 className="font-serif font-semibold text-lg border-b border-border pb-2">
                    Detail Reservasi
                  </h3>

                  <FormField
                    control={form.control}
                    name="paketId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pilih Paket</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={loadingPaket}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  loadingPaket ? "Memuat paket..." : "Pilih Paket Foto"
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(paketList) &&
                              paketList.map((paket) => (
                                <SelectItem key={paket.id} value={paket.id}>
                                  {paket.namaPaket} — Rp {paket.harga.toLocaleString("id-ID")}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tanggalSesi"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Pemotretan</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "EEEE, dd MMMM yyyy", {
                                    locale: idLocale,
                                  })
                                ) : (
                                  <span>Pilih Tanggal</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0 rounded-2xl shadow-xl border-border overflow-hidden"
                            align="start"
                          >
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                form.setValue("jamSesi", "");
                              }}
                              disabled={isDateDisabled}
                              className="min-w-[300px]"
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="jamSesi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jam Sesi</FormLabel>
                        {loadingJam ? (
                          <div className="flex items-center gap-2 h-10 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Memuat jadwal...
                          </div>
                        ) : isDayClosed || isDateBlocked ? (
                          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                            <div>
                              Studio tutup pada tanggal ini.
                              {blockedAlasan && <span className="block text-xs mt-0.5">{blockedAlasan}</span>}
                              <span className="block text-xs mt-0.5">Silakan pilih tanggal lain.</span>
                            </div>
                          </div>
                        ) : jamTersedia.length > 0 ? (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih jam tersedia" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {jamTersedia.map((jam) => (
                                <SelectItem key={jam} value={jam}>
                                  <div className="flex items-center gap-2">
                                    <Clock size={14} /> {jam}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <FormControl>
                            <Input
                              placeholder={
                                selectedTanggal
                                  ? "Belum ada jadwal tersedia — hubungi kami"
                                  : "Pilih tanggal terlebih dahulu"
                              }
                              readOnly={!!selectedTanggal}
                              {...field}
                            />
                          </FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="catatanPelanggan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catatan Khusus (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tema khusus, lokasi outdoor, kostum, dll."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {selectedPaket && (
                <div className="bg-muted p-4 rounded-lg flex justify-between items-center border border-border">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Pembayaran</div>
                    <div className="font-bold text-2xl">
                      Rp {selectedPaket.harga.toLocaleString("id-ID")}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-sm font-medium">{selectedPaket.namaPaket}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedPaket.durasiSesi} menit · {selectedPaket.jumlahFoto} foto
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-14 text-lg"
                disabled={createBooking.isPending}
              >
                {createBooking.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Konfirmasi Booking
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
