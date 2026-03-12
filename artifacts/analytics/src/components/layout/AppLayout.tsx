import { ReactNode, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  Activity,
  ChevronDown,
  Contact,
  CreditCard,
  Database,
  Filter,
  FlaskConical,
  Globe,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sparkles,
  Sun,
  TerminalSquare,
  ToggleLeft,
  TrendingUp,
  Users,
} from "lucide-react";
import { useListProjects } from "@/lib/data/hooks";
import { useProjectStore } from "@/store/use-project-store";
import { cn, formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/projects/:projectId/*");
  const projectId = match ? params?.projectId : null;
  const { theme, toggleTheme, setSelectedProjectId } = useProjectStore();
  const { data: projects } = useListProjects();
  const activeProject = projects?.find(
    (project) => project.id === projectId || project.slug === projectId,
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId, setSelectedProjectId]);

  const navGroups = [
    {
      label: "PRODUTO",
      items: [
        { icon: LayoutDashboard, label: "Visao geral", path: `/projects/${projectId}/overview` },
        { icon: Activity, label: "Eventos", path: `/projects/${projectId}/events` },
        { icon: Users, label: "Sessoes", path: `/projects/${projectId}/sessions` },
        { icon: Filter, label: "Funis", path: `/projects/${projectId}/funnels` },
      ],
    },
    {
      label: "RECEITA",
      items: [
        { icon: TrendingUp, label: "Metricas SaaS", path: `/projects/${projectId}/metrics`, highlight: true },
        { icon: Contact, label: "Clientes", path: `/projects/${projectId}/customers` },
        { icon: CreditCard, label: "Transacoes", path: `/projects/${projectId}/revenue` },
      ],
    },
    {
      label: "PRODUTO AVANCADO",
      items: [
        { icon: FlaskConical, label: "Experimentos A/B", path: `/projects/${projectId}/experiments` },
        { icon: ToggleLeft, label: "Feature Flags", path: `/projects/${projectId}/feature-flags` },
        { icon: Sparkles, label: "Insights IA", path: `/projects/${projectId}/insights` },
      ],
    },
    {
      label: "DEVTOOLS",
      items: [
        { icon: TerminalSquare, label: "Logs", path: `/projects/${projectId}/logs` },
        { icon: Globe, label: "Requisicoes", path: `/projects/${projectId}/requests` },
        { icon: Database, label: "Datastore", path: `/projects/${projectId}/datastore` },
      ],
    },
  ];

  const currentSection =
    navGroups.flatMap((group) => group.items).find((item) => location.startsWith(item.path))?.label ??
    "Visao geral";

  if (!projectId) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Lynx" className="h-8 w-8 rounded" />
            <span className="text-xl font-bold tracking-tight text-primary">Lynx</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Avatar className="h-9 w-9 cursor-pointer border transition-opacity hover:opacity-80">
              <AvatarFallback className="bg-primary/10 font-medium text-primary">ME</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="mx-auto flex-1 w-full max-w-7xl p-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex w-64 flex-shrink-0 flex-col border-r bg-sidebar transition-all duration-300">
        <div className="flex items-center justify-between border-b p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-primary/10 font-bold text-primary">
                  {activeProject?.name.substring(0, 2).toUpperCase() || "LY"}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="truncate text-sm font-medium text-sidebar-foreground">
                    {activeProject?.name || "Carregando..."}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {activeProject ? formatMoney(activeProject.mrr) : "..."} MRR
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Seus projetos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {projects?.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => setLocation(`/projects/${project.id}/overview`)}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span>{project.name}</span>
                    <span className="text-xs text-muted-foreground">{formatMoney(project.mrr)}</span>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/")} className="cursor-pointer font-medium text-primary">
                Ver todos os projetos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h4>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? item.highlight
                            ? "bg-primary/10 text-primary"
                            : "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                        item.highlight && !isActive && "hover:bg-primary/5 hover:text-primary",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          isActive
                            ? item.highlight
                              ? "text-primary"
                              : "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground",
                          item.highlight && "text-primary/70 group-hover:text-primary",
                        )}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-4">
          <Link
            href={`/projects/${projectId}/settings`}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              location.includes("/settings")
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Configuracoes
          </Link>
          <button className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Sair
          </button>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-sm">
          <div className="flex items-center text-sm text-muted-foreground">
            {activeProject?.name} <span className="mx-2">/</span>{" "}
            <span className="font-medium text-foreground">{currentSection}</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Avatar className="h-8 w-8 cursor-pointer border transition-opacity hover:opacity-80">
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">ME</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-muted/20 p-6 md:p-8">
          <div className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 pb-20 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
