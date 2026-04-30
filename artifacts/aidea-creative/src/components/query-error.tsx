import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  error: unknown;
  onRetry?: () => void;
  title?: string;
};

export function QueryError({ error, onRetry, title = "Gagal memuat data" }: Props) {
  const message =
    (error as any)?.message ??
    (typeof error === "string" ? error : "Terjadi kesalahan jaringan.");
  return (
    <div className="border border-destructive/30 bg-destructive/5 text-destructive rounded-xl p-5 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="text-xs opacity-90 mt-1 break-words">{message}</p>
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3 h-8 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={onRetry}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Coba lagi
          </Button>
        )}
      </div>
    </div>
  );
}
