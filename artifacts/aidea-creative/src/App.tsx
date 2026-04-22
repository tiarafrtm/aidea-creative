import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AiChatbot } from "@/components/ai-chatbot";
import { ProtectedRoute } from "@/components/protected-route";
import { AuthProvider } from "@/lib/auth";

import Home from "@/pages/home";
import Portfolio from "@/pages/portfolio";
import Paket from "@/pages/paket";
import Layanan from "@/pages/layanan";
import LayananDetail from "@/pages/layanan-detail";
import Toko from "@/pages/toko";
import Booking from "@/pages/booking";
import Testimoni from "@/pages/testimoni";
import Login from "@/pages/login";
import Register from "@/pages/register";
import AdminLogin from "@/pages/admin-login";
import Profil from "@/pages/profil";
import AdminBeranda from "@/pages/admin/beranda";
import AdminBookings from "@/pages/admin/bookings";
import AdminProduk from "@/pages/admin/produk";
import AdminPortfolio from "@/pages/admin/portfolio";
import AdminJadwal from "@/pages/admin/jadwal";
import AdminTestimoni from "@/pages/admin/testimoni";
import AdminChat from "@/pages/admin/chat";
import AdminLaporan from "@/pages/admin/laporan";
import AdminUsers from "@/pages/admin/users";
import AdminLanding from "@/pages/admin/landing";
import AdminPromo from "@/pages/admin/promo";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function MainRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/portfolio" component={Portfolio} />
        <Route path="/layanan" component={Layanan} />
        <Route path="/layanan/:slug" component={LayananDetail} />
        <Route path="/paket" component={Paket} />
        <Route path="/toko" component={Toko} />
        <Route path="/booking">
          <ProtectedRoute>
            <Booking />
          </ProtectedRoute>
        </Route>
        <Route path="/testimoni" component={Testimoni} />
        <Route path="/profil">
          <ProtectedRoute>
            <Profil />
          </ProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
      <AiChatbot />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard/login" component={AdminLogin} />
      <Route path="/dashboard"><ProtectedRoute requireAdmin><AdminBeranda /></ProtectedRoute></Route>
      <Route path="/dashboard/booking"><ProtectedRoute requireAdmin><AdminBookings /></ProtectedRoute></Route>
      <Route path="/dashboard/produk"><ProtectedRoute requireAdmin><AdminProduk /></ProtectedRoute></Route>
      <Route path="/dashboard/portfolio"><ProtectedRoute requireAdmin><AdminPortfolio /></ProtectedRoute></Route>
      <Route path="/dashboard/jadwal"><ProtectedRoute requireAdmin><AdminJadwal /></ProtectedRoute></Route>
      <Route path="/dashboard/testimoni"><ProtectedRoute requireAdmin><AdminTestimoni /></ProtectedRoute></Route>
      <Route path="/dashboard/promo"><ProtectedRoute requireAdmin><AdminPromo /></ProtectedRoute></Route>
      <Route path="/dashboard/users"><ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute></Route>
      <Route path="/dashboard/landing"><ProtectedRoute requireAdmin><AdminLanding /></ProtectedRoute></Route>
      <Route path="/dashboard/chat"><ProtectedRoute requireAdmin><AdminChat /></ProtectedRoute></Route>
      <Route path="/dashboard/laporan"><ProtectedRoute requireAdmin><AdminLaporan /></ProtectedRoute></Route>
      <Route>
        <MainRoutes />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
