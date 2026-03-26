import { Bell, LayoutTemplate, Library, MoonStar, Search, Settings2, SunMedium, User2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { projectThemeMap, type ProjectAppearance, type ProjectThemeId } from "@/lib/design/themes";
import { teamPersonaDefinitions, type TeamPersonaId } from "@/lib/personas/team-personas";
import { cn } from "@/lib/utils";

interface SidebarProject {
  id: string;
  name: string;
}

interface WorkspaceAppSidebarProps {
  projects: SidebarProject[];
  activeProjectId: string;
  activeProjectName: string;
  activePersonaId: TeamPersonaId;
  criticalAlerts: number;
  resolvedAppearance: ProjectAppearance;
  resolvedThemeId: ProjectThemeId;
  isCatalogOpen: boolean;
  isCommandOpen: boolean;
  onProjectChange: (projectId: string) => void;
  onPersonaChange: (personaId: TeamPersonaId) => void;
  onOpenCatalog: () => void;
  onOpenCommand: () => void;
  onOpenAlerts: () => void;
  onOpenSettings: () => void;
  onToggleAppearance: () => void;
}

export function WorkspaceAppSidebar({
  projects,
  activeProjectId,
  activeProjectName,
  activePersonaId,
  criticalAlerts,
  resolvedAppearance,
  resolvedThemeId,
  isCatalogOpen,
  isCommandOpen,
  onProjectChange,
  onPersonaChange,
  onOpenCatalog,
  onOpenCommand,
  onOpenAlerts,
  onOpenSettings,
  onToggleAppearance,
}: WorkspaceAppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const themeLabel = projectThemeMap[resolvedThemeId].label;
  const projectInitials = activeProjectName
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/80">
      <SidebarHeader className="gap-3 border-b border-sidebar-border/80 p-3">
        <div className={cn("flex items-center gap-3 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/40 p-2.5", collapsed && "justify-center") }>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sidebar-border/80 bg-sidebar text-xs font-semibold uppercase tracking-[0.22em] text-sidebar-foreground">
            {projectInitials || "LY"}
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">{activeProjectName}</p>
              <p className="text-xs text-sidebar-foreground/70">{themeLabel} • {resolvedAppearance}</p>
            </div>
          ) : null}
        </div>

        {!collapsed ? (
          <div className="space-y-2">
            <Select value={activeProjectId} onValueChange={onProjectChange}>
              <SelectTrigger className="h-10 rounded-2xl border-sidebar-border/80 bg-sidebar-accent/35 text-left text-sidebar-foreground">
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activePersonaId} onValueChange={(value) => onPersonaChange(value as TeamPersonaId)}>
              <SelectTrigger className="h-10 rounded-2xl border-sidebar-border/80 bg-sidebar-accent/35 text-left text-sidebar-foreground">
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
          </div>
        ) : null}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={false} tooltip="Canvas workspace">
                  <span>Canvas</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={isCatalogOpen} onClick={onOpenCatalog} tooltip="Catalogo">
                  <Library className="h-4 w-4" />
                  <span>Catalogo</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={isCommandOpen} onClick={onOpenCommand} tooltip="Buscar">
                  <Search className="h-4 w-4" />
                  <span>Buscar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={criticalAlerts > 0} onClick={onOpenAlerts} tooltip="Alertas">
                  <Bell className="h-4 w-4" />
                  <span>Alertas</span>
                </SidebarMenuButton>
                {criticalAlerts > 0 ? <Badge className="pointer-events-none absolute right-2 top-1.5 rounded-full">{criticalAlerts}</Badge> : null}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenSettings} tooltip="Configuracoes">
                  <Settings2 className="h-4 w-4" />
                  <span>Configuracoes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/80 p-3">
        <div className={cn("flex items-center gap-3 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/35 p-2.5", collapsed && "justify-center")}>
          <Avatar className="h-10 w-10 border border-sidebar-border/80 bg-sidebar">
            <AvatarFallback className="bg-transparent text-sidebar-foreground">
              <User2 className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground">Workspace owner</p>
              <p className="text-xs text-sidebar-foreground/70">Projeto ativo • {themeLabel}</p>
            </div>
          ) : null}
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={onToggleAppearance}>
            {resolvedAppearance === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

