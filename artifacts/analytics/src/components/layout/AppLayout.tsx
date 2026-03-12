import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  BarChart3, Activity, Users, Filter, FlaskConical, 
  TerminalSquare, ArrowLeftRight, Database, LayoutDashboard,
  LogOut, Plus, ChevronDown, Check
} from "lucide-react";
import { useProjectStore } from "@/store/use-project-store";
import { useListProjects } from "@workspace/api-client-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { activeProjectId, setActiveProjectId } = useProjectStore();
  const { data: projects = [], isLoading } = useListProjects();

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const navigation = [
    { name: "Overview", href: `/projects/${activeProject?.id}/overview`, icon: BarChart3 },
    { name: "Events", href: `/projects/${activeProject?.id}/events`, icon: Activity },
    { name: "Sessions", href: `/projects/${activeProject?.id}/sessions`, icon: Users },
    { name: "Funnels", href: `/projects/${activeProject?.id}/funnels`, icon: Filter },
    { name: "Experiments", href: `/projects/${activeProject?.id}/experiments`, icon: FlaskConical },
    { name: "Logs", href: `/projects/${activeProject?.id}/logs`, icon: TerminalSquare },
    { name: "Requests", href: `/projects/${activeProject?.id}/requests`, icon: ArrowLeftRight },
    { name: "Datastore", href: `/projects/${activeProject?.id}/datastore`, icon: Database },
    { name: "Dashboards", href: `/projects/${activeProject?.id}/dashboards`, icon: LayoutDashboard },
  ];

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col hidden md:flex">
        <div className="h-14 flex items-center px-4 border-b border-sidebar-border gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground tracking-tight">Lynx Analytics</span>
        </div>

        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center justify-between bg-background border border-border rounded-md px-3 py-2 text-sm hover:bg-muted/50 transition-colors focus:outline-none">
              <span className="truncate font-medium">{activeProject?.name || "Select Project"}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[224px]">
              <DropdownMenuLabel>Projects</DropdownMenuLabel>
              {projects.map((p) => (
                <DropdownMenuItem 
                  key={p.id}
                  onClick={() => {
                    setActiveProjectId(p.id);
                    setLocation(`/projects/${p.id}/overview`);
                  }}
                  className="flex items-center justify-between"
                >
                  {p.name}
                  {p.id === activeProject?.id && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/")}>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location.startsWith(item.href.split('?')[0]);
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className={`w-4 h-4 mr-3 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button className="flex items-center w-full px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors">
            <LogOut className="w-4 h-4 mr-3 text-muted-foreground" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 md:hidden">
           <div className="font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary-foreground" />
              </div>
              Lynx
           </div>
           <Avatar className="h-8 w-8">
             <AvatarFallback>U</AvatarFallback>
           </Avatar>
        </header>

        <div className="flex-1 overflow-auto bg-muted/20">
          <div className="max-w-[1400px] mx-auto p-4 md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
