
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Plants from "./pages/Plants";
import PlantDashboard from "./pages/PlantDashboard";
import Customers from "./pages/Customers";
import CustomerDashboard from "./pages/CustomerDashboard";
import Invoices from "./pages/Invoices";
import Alerts from "./pages/Alerts";
import Agents from "./pages/Agents";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <AppSidebar />
              <main className="flex-1 overflow-auto">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/plants" element={<Plants />} />
                  <Route path="/plants/:id" element={<PlantDashboard />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/:id" element={<CustomerDashboard />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
