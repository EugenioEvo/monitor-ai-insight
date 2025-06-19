
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { 
  Home, 
  BarChart3, 
  Zap, 
  Users, 
  FileText, 
  AlertTriangle, 
  Bot,
  MessageSquare,
  Settings
} from "lucide-react"
import { Link } from "react-router-dom"

// Menu items.
const items = [
  {
    title: "Início",
    url: "/",
    icon: Home,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Usinas",
    url: "/plants",
    icon: Zap,
  },
  {
    title: "Clientes",
    url: "/customers",
    icon: Users,
  },
  {
    title: "Faturas",
    url: "/invoices",
    icon: FileText,
  },
  {
    title: "Alertas",
    url: "/alerts",
    icon: AlertTriangle,
  },
  {
    title: "Agentes IA",
    url: "/agents",
    icon: Bot,
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Configurações",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Monitor AI Insight</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
