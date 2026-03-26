import { type ReactNode, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { FolderKanban, LayoutTemplate, MoonStar, Settings2, SunMedium, User2 } from "lucide-react";
import { useListProjects } from "@/lib/data/hooks";
import { projectThemeMap } from "@/lib/design/themes";
import { teamPersonaDefinitions, teamPersonaMap, type TeamPersonaId } from "@/lib/personas/team-personas";
import { useProjectStore } from "@/store/use-project-store";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/projects/:projectId/*");
  const routeProjectId = match ? params?.projectId ?? null : null;
  const { data: projects } = useListProjects();
  const {
    selectedProjectId,
    defaultAppearance,
    defaultThemeId,
    defaultTeamPersonaId,
    appearanceByProject,
    themeByProject,
    teamPersonaByProject,
    setSelectedProjectId,
    setDefaultTeamPersonaId,
    setProjectTeamPersona,
    toggleProjectAppearance,
  } = useProjectStore();

  const activeProject =
    projects?.find((project) => project.id === routeProjectId || project.slug === routeProjectId) ??
    projects?.find((project) => project.id === selectedProjectId || project.slug === selectedProjectId) ??
    null;
  const scopeProjectId = activeProject?.id ?? routeProjectId ?? selectedProjectId ?? null;
  const resolvedThemeId = scopeProjectId ? themeByProject[scopeProjectId] ?? defaultThemeId : defaultThemeId;
  const resolvedAppearance = scopeProjectId
    ? appearanceByProject[scopeProjectId] ?? defaultAppearance
    : defaultAppearance;
  const resolvedPersonaId = scopeProjectId
    ? teamPersonaByProject[scopeProjectId] ?? defaultTeamPersonaId
    : defaultTeamPersonaId;
  const activePersona = teamPersonaMap[resolvedPersonaId];

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.uiTheme = resolvedThemeId;
    root.classList.toggle("dark", resolvedAppearance === "dark");
  }, [resolvedAppearance, resolvedThemeId]);

  useEffect(() => {
    if (activeProject?.id) {
      setSelectedProjectId(activeProject.id);
    }
  }, [activeProject?.id, setSelectedProjectId]);

  const handleProjectChange = (nextProjectId: string) => {
    setSelectedProjectId(nextProjectId);
    if (location.startsWith("/projects/") && location.endsWith("/settings")) {
      setLocation(`/projects/${nextProjectId}/settings`);
      return;
    }

    setLocation(`/projects/${nextProjectId}/workspace`);
  };

  const handlePersonaChange = (personaId: TeamPersonaId) => {
    if (scopeProjectId) {
      setProjectTeamPersona(scopeProjectId, personaId);
      return;
    }

    setDefaultTeamPersonaId(personaId);
  };

  const navItems = [
    {
      label: "Workspace",
      href: scopeProjectId ? `/projects/${scopeProjectId}/workspace` : "/",
      icon: LayoutTemplate,
      active: location.includes("/workspace"),
      disabled: !scopeProjectId,
    },
    {
      label: "Projetos",
      href: "/projects",
      icon: FolderKanban,
      active: location === "/projects",
      disabled: false,
    },
    {
      label: "Settings",
      href: scopeProjectId ? `/projects/${scopeProjectId}/settings` : "/projects",
      icon: Settings2,
      active: location.includes("/settings"),
      disabled: !scopeProjectId,
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#090d16] text-slate-50">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 rounded-[28px] border border-white/8 bg-[#0d111c] px-4 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                {activeProject?.name.slice(0, 2).toUpperCase() ?? "LY"}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace OS</div>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-semibold tracking-tight text-white">
                    {activeProject?.name ?? "Biblioteca de projetos"}
                  </h1>
                  <Badge variant="outline" className="border-white/10 bg-transparent text-slate-400">
                    {activePersona.shortLabel}
                  </Badge>
                  <Badge variant="outline" className="border-white/10 bg-transparent text-slate-400">
                    {projectThemeMap[resolvedThemeId].label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
              <nav className="flex flex-wrap items-center gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => !item.disabled && setLocation(item.href)}
                    className={cn(
                      "inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-medium transition-colors",
                      item.active
                        ? "border-white/15 bg-white/10 text-white"
                        : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white",
                      item.disabled && "cursor-not-allowed opacity-50 hover:bg-white/[0.03] hover:text-slate-400",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={activeProject?.id ?? scopeProjectId ?? undefined} onValueChange={handleProjectChange}>
                  <SelectTrigger className="w-full min-w-[210px] rounded-2xl border-white/10 bg-white/5 text-left text-slate-100 sm:w-[240px]">
                    <SelectValue placeholder="Projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={resolvedPersonaId} onValueChange={(value) => handlePersonaChange(value as TeamPersonaId)}>
                  <SelectTrigger className="w-full min-w-[180px] rounded-2xl border-white/10 bg-white/5 text-left text-slate-100 sm:w-[210px]">
                    <SelectValue placeholder="Cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamPersonaDefinitions.map((persona) => (
                      <SelectItem key={persona.id} value={persona.id}>
                        {persona.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-2xl text-slate-300 hover:bg-white/5 hover:text-white"
                  onClick={() => toggleProjectAppearance(scopeProjectId)}
                >
                  {resolvedAppearance === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                </Button>

                <Avatar className="h-11 w-11 border border-white/10 bg-white/5">
                  <AvatarFallback className="bg-transparent font-semibold text-slate-200">
                    <User2 className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 rounded-[28px] border border-white/8 bg-[#0d111c] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
