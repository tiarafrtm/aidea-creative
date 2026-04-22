import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const [location, setLocation] = useLocation();
  const { user, profile, isLoading, profileChecked } = useAuth();

  // Wait until we've actually attempted to load the profile so we don't
  // prematurely redirect admins to /profil while /api/me is in flight.
  const profilePending = Boolean(user) && !profileChecked;
  const effectiveLoading = isLoading || profilePending;

  useEffect(() => {
    if (effectiveLoading) return;
    if (!user) {
      setLocation(`/login?redirect=${encodeURIComponent(location)}`);
      return;
    }
    if (requireAdmin && profile?.role !== "admin") {
      setLocation("/profil");
    }
  }, [effectiveLoading, user, profile, requireAdmin, location, setLocation]);

  if (effectiveLoading || !user || (requireAdmin && profile?.role !== "admin")) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Memeriksa akses...
      </div>
    );
  }

  return <>{children}</>;
}