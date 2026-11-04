import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/useAuthStore";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DebugToggle } from "@/components/DebugToggle";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import ConcorrenciasPage from "./pages/ConcorrenciasPage";
import PedidosPage from "./pages/PedidosPage";
import ContratosPage from "./pages/ContratosPage";
import CreqPage from "./pages/CreqPage";
import OnePagePage from "./pages/OnePagePage";
import GestaoFornecedoresPage from "./pages/GestaoFornecedoresPage";
import PlanilhasPage from "./pages/PlanilhasPage";
import GestaoAcessosPage from "./pages/GestaoAcessosPage";
import GestaoObrasPage from "./pages/GestaoObrasPage";
import IndicadoresMercadoPage from "./pages/IndicadoresMercadoPage";
import IndicadoresSustentabilidadePage from "./pages/IndicadoresSustentabilidadePage";
import LancamentoSustentabilidadePage from "./pages/LancamentoSustentabilidadePage";
import LogsPage from "./pages/LogsPage";
import AprovacaoSustentabilidadePage from "./pages/AprovacaoSustentabilidadePage";

import ChangePasswordPage from "./pages/ChangePasswordPage";
import RelatorioGestaoSuprimentos from "./pages/RelatorioGestaoSuprimentos";
import RelatorioGestaoFornecedores from "./pages/RelatorioGestaoFornecedores";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import RelatorioSustentabilidade from "./pages/RelatorioSustentabilidade";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isOnePage = location.pathname === '/one-page';
  const refreshProfile = useAuthStore(s => s.refreshProfile);
  useEffect(() => { refreshProfile(); }, [location.pathname, refreshProfile]);
  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="flex justify-end items-center px-6 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <DebugToggle />
            <ThemeToggle disabled={isOnePage} title={isOnePage ? 'ONE Page sempre em modo claro' : undefined} />
          </div>
        </div>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const init = useAuthStore(s => s.init);
  const initialized = useAuthStore(s => s.initialized);

  useEffect(() => { init(); }, [init]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthInitializer>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/" element={<Index />} />
              <Route path="/concorrencias" element={
                <AppLayout><ProtectedRoute path="/concorrencias"><ConcorrenciasPage /></ProtectedRoute></AppLayout>
              } />
              <Route path="/pedidos" element={
                <AppLayout><ProtectedRoute path="/pedidos"><PedidosPage /></ProtectedRoute></AppLayout>
              } />
              <Route path="/contratos" element={
                <AppLayout><ProtectedRoute path="/contratos"><ContratosPage /></ProtectedRoute></AppLayout>
              } />
              <Route path="/creq" element={
                <AppLayout><ProtectedRoute path="/creq"><CreqPage /></ProtectedRoute></AppLayout>
              } />
              <Route path="/one-page" element={
                <AppLayout><ProtectedRoute path="/one-page"><OnePagePage /></ProtectedRoute></AppLayout>
              } />
              <Route path="/relatorio/gestao-suprimentos" element={
                <ProtectedRoute path="/one-page"><RelatorioGestaoSuprimentos /></ProtectedRoute>
              } />
              <Route path="/relatorio/gestao-fornecedores" element={
                <ProtectedRoute path="/gestao-fornecedores"><RelatorioGestaoFornecedores /></ProtectedRoute>
              } />
              <Route path="/gestao-fornecedores" element={
                <AppLayout><ProtectedRoute path="/gestao-fornecedores"><GestaoFornecedoresPage /></ProtectedRoute></AppLayout>
              } />
              <Route path="/planilhas" element={
                <AppLayout><ProtectedRoute path="/planilhas"><PlanilhasPage /></ProtectedRoute></AppLayout>
              } />
              <Route path="/admin/acessos" element={
                <AppLayout><ProtectedRoute path="/admin/acessos"><GestaoAcessosPage /></ProtectedRoute></AppLayout>
              } />
              <Route path="/gestao-obras" element={
                <AppLayout><ProtectedRoute path="/gestao-obras"><GestaoObrasPage /></ProtectedRoute></AppLayout>
              } />
              <Route path="/indicadores-mercado" element={
                <AppLayout><ProtectedRoute path="/indicadores-mercado"><IndicadoresMercadoPage /></ProtectedRoute></AppLayout>
              } />
              <Route path="/relatorio/sustentabilidade" element={
                <ProtectedRoute path="/indicadores-sustentabilidade"><RelatorioSustentabilidade /></ProtectedRoute>
              } />
              <Route path="/indicadores-sustentabilidade" element={
                <AppLayout><ProtectedRoute path="/indicadores-sustentabilidade"><IndicadoresSustentabilidadePage /></ProtectedRoute></AppLayout>
              } />
              <Route path="/lancamento-sustentabilidade" element={
                <AppLayout><ProtectedRoute path="/lancamento-sustentabilidade"><LancamentoSustentabilidadePage /></ProtectedRoute></AppLayout>
              } />
              <Route path="/aprovacao-sustentabilidade" element={
                <AppLayout><ProtectedRoute path="/aprovacao-sustentabilidade"><AprovacaoSustentabilidadePage /></ProtectedRoute></AppLayout>
              } />
              <Route path="/logs" element={
                <AppLayout><ProtectedRoute path="/logs"><LogsPage /></ProtectedRoute></AppLayout>
              } />


              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthInitializer>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
