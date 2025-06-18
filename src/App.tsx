
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import Plants from "./pages/Plants";
import PlantDashboard from "./pages/PlantDashboard";
import Chat from "./pages/Chat";
import Agents from "./pages/Agents";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-gradient-to-br from-blue-50/50 to-green-50/50">
            <AppSidebar />
            <main className="flex-1">
              <div className="border-b border-border/50 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-4 px-6 py-4">
                  <SidebarTrigger />
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">U</span>
                    </div>
                    <span className="text-sm font-medium">Usuário Admin</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/plants" element={<Plants />} />
                  <Route path="/plants/:id/dashboard" element={<PlantDashboard />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
