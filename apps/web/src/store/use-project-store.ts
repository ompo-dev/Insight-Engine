import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  defaultProjectAppearance,
  defaultProjectThemeId,
  type ProjectAppearance,
  type ProjectThemeId,
} from "@/lib/design/themes";

interface ProjectStore {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  desktopSidebarCollapsed: boolean;
  setDesktopSidebarCollapsed: (collapsed: boolean) => void;
  toggleDesktopSidebar: () => void;
  defaultThemeId: ProjectThemeId;
  setDefaultThemeId: (themeId: ProjectThemeId) => void;
  themeByProject: Record<string, ProjectThemeId>;
  setProjectTheme: (projectId: string, themeId: ProjectThemeId) => void;
  defaultAppearance: ProjectAppearance;
  setDefaultAppearance: (appearance: ProjectAppearance) => void;
  appearanceByProject: Record<string, ProjectAppearance>;
  setProjectAppearance: (projectId: string, appearance: ProjectAppearance) => void;
  toggleProjectAppearance: (projectId?: string | null) => void;
  dateRange: { from: string; to: string };
  setDateRange: (range: { from: string; to: string }) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      selectedProjectId: null,
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
      desktopSidebarCollapsed: false,
      setDesktopSidebarCollapsed: (collapsed) => set({ desktopSidebarCollapsed: collapsed }),
      toggleDesktopSidebar: () =>
        set((state) => ({
          desktopSidebarCollapsed: !state.desktopSidebarCollapsed,
        })),
      defaultThemeId: defaultProjectThemeId,
      setDefaultThemeId: (themeId) => set({ defaultThemeId: themeId }),
      themeByProject: {},
      setProjectTheme: (projectId, themeId) =>
        set((state) => ({
          themeByProject: {
            ...state.themeByProject,
            [projectId]: themeId,
          },
        })),
      defaultAppearance: defaultProjectAppearance,
      setDefaultAppearance: (appearance) => set({ defaultAppearance: appearance }),
      appearanceByProject: {},
      setProjectAppearance: (projectId, appearance) =>
        set((state) => ({
          appearanceByProject: {
            ...state.appearanceByProject,
            [projectId]: appearance,
          },
        })),
      toggleProjectAppearance: (projectId) => {
        const state = get();
        const currentAppearance = projectId
          ? state.appearanceByProject[projectId] ?? state.defaultAppearance
          : state.defaultAppearance;
        const nextAppearance: ProjectAppearance = currentAppearance === "dark" ? "light" : "dark";

        if (projectId) {
          set({
            appearanceByProject: {
              ...state.appearanceByProject,
              [projectId]: nextAppearance,
            },
          });
          return;
        }

        set({ defaultAppearance: nextAppearance });
      },
      dateRange: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
      setDateRange: (range) => set({ dateRange: range }),
    }),
    {
      name: "lynx-project-storage",
      partialize: (state) => ({
        selectedProjectId: state.selectedProjectId,
        desktopSidebarCollapsed: state.desktopSidebarCollapsed,
        defaultThemeId: state.defaultThemeId,
        themeByProject: state.themeByProject,
        defaultAppearance: state.defaultAppearance,
        appearanceByProject: state.appearanceByProject,
        dateRange: state.dateRange,
      }),
    },
  ),
);
