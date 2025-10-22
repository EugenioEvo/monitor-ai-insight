
import { Calendar, Home, Zap, FileText, Wrench, AlertTriangle, BarChart3, MessageSquare, Settings, Bot, Users, TrendingUp, Cpu } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    badge: null,
    color: "text-primary"
  },
  {
    title: "Plantas",
    url: "/plants",
    icon: Zap,
    badge: null,
    color: "text-secondary"
  },
  {
    title: "Clientes",
    url: "/customers",
    icon: Users,
    badge: null,
    color: "text-info"
  },
  {
    title: "Faturas",
    url: "/invoices", 
    icon: FileText,
    badge: "3",
    color: "text-accent"
  },
  {
    title: "O&M Dashboard",
    url: "/om-dashboard",
    icon: Wrench,
    badge: "2",
    color: "text-warning"
  },
  {
    title: "Manutenção",
    url: "/maintenance",
    icon: Wrench,
    badge: null,
    color: "text-warning"
  },
  {
    title: "Alertas",
    url: "/alerts",
    icon: AlertTriangle,
    badge: "5",
    color: "text-destructive"
  },
  {
    title: "Anomalias",
    url: "/anomalies",
    icon: TrendingUp,
    badge: null,
    color: "text-primary"
  },
  {
    title: "Relatórios",
    url: "/reports",
    icon: BarChart3,
    badge: null,
    color: "text-success"
  }
];

const aiMenuItems = [
  {
    title: "Chat Solar",
    url: "/chat",
    icon: MessageSquare,
    badge: null,
    color: "text-primary",
    special: "online"
  },
  {
    title: "Agentes IA",
    url: "/agents",
    icon: Bot,
    badge: "4",
    color: "text-secondary",
    special: null
  }
];

export function AppSidebar() {
  const location = useLocation();

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar className="border-r-0 bg-sidebar shadow-xl">
      <SidebarHeader className="border-b border-sidebar-border/50 p-6 bg-gradient-to-br from-sidebar-background to-sidebar-accent/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-solar rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all duration-300">
              <Zap className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="font-display font-bold text-2xl bg-gradient-solar bg-clip-text text-transparent">
              Monitor.ai
            </span>
          </div>
          <UserMenu />
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-6 space-y-8">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold text-sidebar-foreground/70 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Gestão Solar
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={`group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md ${
                      isActive(item.url) 
                        ? 'bg-gradient-to-r from-sidebar-accent to-sidebar-accent/50 text-sidebar-primary shadow-inner-glow' 
                        : 'hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <Link to={item.url} className="flex items-center gap-4 px-4 py-3 rounded-xl">
                      <item.icon className={`w-5 h-5 ${isActive(item.url) ? 'text-sidebar-primary' : item.color} group-hover:scale-110 transition-transform`} />
                      <span className={`font-semibold ${isActive(item.url) ? 'text-sidebar-primary' : 'text-sidebar-foreground'} group-hover:text-sidebar-primary transition-colors`}>
                        {item.title}
                      </span>
                      {item.badge && (
                        <Badge className={`ml-auto text-xs ${
                          item.title === 'Faturas' ? 'bg-accent text-accent-foreground' :
                          item.title === 'O&M' ? 'bg-warning text-warning-foreground' :
                          'bg-destructive text-destructive-foreground'
                        } animate-pulse-glow`}>
                          {item.badge}
                        </Badge>
                      )}
                      
                      {/* Active indicator */}
                      {isActive(item.url) && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-primary rounded-l-full shadow-glow" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold text-sidebar-foreground/70 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Inteligência Artificial
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {aiMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className={`group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md ${
                      isActive(item.url) 
                        ? 'bg-gradient-to-r from-sidebar-accent to-sidebar-accent/50 text-sidebar-primary shadow-inner-glow' 
                        : 'hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <Link to={item.url} className="flex items-center gap-4 px-4 py-3 rounded-xl">
                      <item.icon className={`w-5 h-5 ${isActive(item.url) ? 'text-sidebar-primary' : item.color} group-hover:scale-110 transition-transform`} />
                      <span className={`font-semibold ${isActive(item.url) ? 'text-sidebar-primary' : 'text-sidebar-foreground'} group-hover:text-sidebar-primary transition-colors`}>
                        {item.title}
                      </span>
                      
                      {item.badge && (
                        <Badge className="ml-auto bg-secondary text-secondary-foreground text-xs animate-pulse-glow">
                          {item.badge}
                        </Badge>
                      )}
                      
                      {item.special === "online" && (
                        <div className="ml-auto w-3 h-3 bg-success rounded-full animate-pulse shadow-glow"></div>
                      )}
                      
                      {/* Active indicator */}
                      {isActive(item.url) && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-secondary rounded-l-full shadow-glow" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-6 bg-gradient-to-br from-sidebar-accent/30 to-sidebar-background">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className={`group rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md ${
                isActive('/settings') 
                  ? 'bg-gradient-to-r from-sidebar-accent to-sidebar-accent/50 text-sidebar-primary shadow-inner-glow' 
                  : 'hover:bg-sidebar-accent/50'
              }`}
            >
              <Link to="/settings" className="flex items-center gap-4 px-4 py-3 rounded-xl">
                <Settings className={`w-5 h-5 ${isActive('/settings') ? 'text-sidebar-primary' : 'text-muted-foreground'} group-hover:scale-110 group-hover:text-sidebar-primary transition-all`} />
                <span className={`font-semibold ${isActive('/settings') ? 'text-sidebar-primary' : 'text-sidebar-foreground'} group-hover:text-sidebar-primary transition-colors`}>
                  Configurações
                </span>
                
                {/* Active indicator */}
                {isActive('/settings') && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-primary rounded-l-full shadow-glow" />
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
