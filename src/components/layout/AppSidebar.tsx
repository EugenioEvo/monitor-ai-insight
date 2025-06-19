
import { Calendar, Home, Zap, FileText, Wrench, AlertTriangle, BarChart3, MessageSquare, Settings, Bot, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { UserMenu } from "./UserMenu";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    badge: null
  },
  {
    title: "Plantas",
    url: "/plants",
    icon: Zap,
    badge: null
  },
  {
    title: "Clientes",
    url: "/customers",
    icon: Users,
    badge: null
  },
  {
    title: "Faturas",
    url: "/invoices", 
    icon: FileText,
    badge: "3"
  },
  {
    title: "O&M",
    url: "/maintenance",
    icon: Wrench,
    badge: "2"
  },
  {
    title: "Alertas",
    url: "/alerts",
    icon: AlertTriangle,
    badge: "5"
  },
  {
    title: "Relatórios",
    url: "/reports",
    icon: BarChart3,
    badge: null
  }
];

const aiMenuItems = [
  {
    title: "Chat Solar",
    url: "/chat",
    icon: MessageSquare,
    badge: null
  },
  {
    title: "Agentes IA",
    url: "/agents",
    icon: Bot,
    badge: "4"
  }
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="border-b border-border/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Monitor.ai
            </span>
          </div>
          <UserMenu />
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Gestão Solar
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`hover:bg-accent hover:text-accent-foreground transition-colors ${
                      location.pathname === item.url ? 'bg-accent text-accent-foreground' : ''
                    }`}
                  >
                    <Link to={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                      <item.icon className="w-4 h-4" />
                      <span className="font-medium">{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-8">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Inteligência Artificial
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {aiMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className={`hover:bg-accent hover:text-accent-foreground transition-colors ${
                      location.pathname === item.url ? 'bg-accent text-accent-foreground' : ''
                    }`}
                  >
                    <Link to={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                      <item.icon className="w-4 h-4" />
                      <span className="font-medium">{item.title}</span>
                      {item.badge && (
                        <span className="ml-auto bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                      {item.title === "Chat Solar" && (
                        <span className="ml-auto w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-accent hover:text-accent-foreground transition-colors">
              <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg">
                <Settings className="w-4 h-4" />
                <span className="font-medium">Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
