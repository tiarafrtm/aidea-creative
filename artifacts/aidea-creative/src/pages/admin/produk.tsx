import { useState } from "react";
import { useListProduk, getListProdukQueryKey, useCreateProduk, useUpdateProduk, useDeleteProduk, useAiChat } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Sparkles, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const kategoriOptions = ["album", "frame", "cetak", "aksesoris", "lainnya"];

export default function AdminProduk() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useListProduk({ query: { queryKey: getListProdukQueryKey() } });
  const createM = useCreateProduk();
  const updateM = useUpdateProduk();
  const deleteM = useDeleteProduk();
  const aiChat = useAiChat();
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ namaProduk: "", deskripsi: "", harga: 0, stok: 0, kategori: "album", gambarUrl: [], isAktif: true });

  const items = Array.isArray(data) ? data : [];

  const openNew = () => { setEditing(null); setForm({ namaProduk: "", deskripsi: "", harga: 0, stok: 0, kategori: "album", gambarUrl: [], isAktif: true }); setOpen(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ ...p }); setOpen(true); };

  const save = () => {
    const payload = { ...form, harga: Number(form.harga), stok: Number(form.stok) };
    const onSuccess = () => { toast({ title: editing ? "Produk diperbarui" : "Produk ditambahkan" }); qc.invalidateQueries({ queryKey: getListProdukQueryKey() }); setOpen(false); };
    if (editing) updateM.mutate({ id: editing.id, data: payload }, { onSuccess });
    else createM.mutate({ data: payload }, { onSuccess });
  };

  const remove = (id: string) => {
    if (!confirm("Hapus produk ini?")) return;
    deleteM.mutate({ id }, { onSuccess: () => { toast({ title: "Produk dihapus" }); qc.invalidateQueries({ queryKey: getListProdukQueryKey() }); } });
  };

  const generateDesc = () => {
    if (!form.namaProduk) { toast({ title: "Isi nama produk dulu", variant: "destructive" }); return; }
    aiChat.mutate(
      { data: { message: `Buat deskripsi produk studio foto untuk "${form.namaProduk}" (kategori ${form.kategori}) dalam 2-3 kalimat bahasa Indonesia yang menarik, casual, & persuasif. Langsung deskripsi saja tanpa pembuka.` } },
      { onSuccess: (r: any) => setForm((f: any) => ({ ...f, deskripsi: r?.reply ?? r?.message ?? f.deskripsi })) }
    );
  };

  return (
    <AdminLayout title="Manajemen Produk" subtitle="Kelola produk toko + AI pembuat deskripsi.">
      <div className="flex justify-end mb-4"><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Tambah Produk</Button></div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? <div className="p-6 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Kategori</TableHead><TableHead>Harga</TableHead><TableHead>Stok</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Belum ada produk.</TableCell></TableRow> :
                  items.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell><div className="font-medium">{p.namaProduk}</div><div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{p.deskripsi}</div></TableCell>
                      <TableCell className="capitalize">{p.kategori}</TableCell>
                      <TableCell>Rp {Number(p.harga).toLocaleString("id-ID")}</TableCell>
                      <TableCell>{p.stok}</TableCell>
                      <TableCell>{p.isAktif ? <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20" variant="outline">Aktif</Badge> : <Badge variant="outline">Nonaktif</Badge>}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-red-600" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Produk" : "Tambah Produk"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama Produk</Label><Input value={form.namaProduk} onChange={(e) => setForm({ ...form, namaProduk: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kategori</Label>
                <Select value={form.kategori} onValueChange={(v) => setForm({ ...form, kategori: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{kategoriOptions.map((k) => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Harga (Rp)</Label><Input type="number" value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Stok</Label><Input type="number" value={form.stok} onChange={(e) => setForm({ ...form, stok: e.target.value })} /></div>
              <div><Label>Ukuran</Label><Input value={form.ukuran ?? ""} onChange={(e) => setForm({ ...form, ukuran: e.target.value })} placeholder="10x15, A4, dll" /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1"><Label>Deskripsi</Label>
                <Button type="button" size="sm" variant="ghost" onClick={generateDesc} disabled={aiChat.isPending}>
                  {aiChat.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />} AI Generate
                </Button>
              </div>
              <Textarea rows={4} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={createM.isPending || updateM.isPending}>
              {(createM.isPending || updateM.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
