import { create } from "zustand";
import { dashboardClient } from "@/lib/http/client";
import type { CreateProjectInput, ProjectSettings, ProjectSummary } from "@/lib/data/types";

interface ProjectsStore {
  projects: ProjectSummary[];
  settingsByProject: Record<string, ProjectSettings>;
  isLoading: boolean;
  isSettingsLoading: Record<string, boolean>;
  hydrated: boolean;
  hydrate: () => Promise<ProjectSummary[]>;
  createProject: (input: CreateProjectInput) => Promise<ProjectSummary>;
  updateProject: (projectId: string, input: Partial<CreateProjectInput>) => Promise<ProjectSummary>;
  loadSettings: (projectId: string) => Promise<ProjectSettings>;
  updateSettings: (projectId: string, input: Partial<ProjectSettings>) => Promise<ProjectSettings>;
}

export const useProjectsStore = create<ProjectsStore>((set, get) => ({
  projects: [],
  settingsByProject: {},
  isLoading: false,
  isSettingsLoading: {},
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated && get().projects.length > 0) {
      return get().projects;
    }

    set({ isLoading: true });

    try {
      const projects = await dashboardClient.projects.list();
      set({ projects, hydrated: true, isLoading: false });
      return projects;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  createProject: async (input) => {
    const project = await dashboardClient.projects.create(input);
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },
  updateProject: async (projectId, input) => {
    const project = await dashboardClient.projects.update(projectId, input);
    set((state) => ({
      projects: state.projects.map((item) => (item.id === projectId ? project : item)),
    }));
    return project;
  },
  loadSettings: async (projectId) => {
    set((state) => ({
      isSettingsLoading: { ...state.isSettingsLoading, [projectId]: true },
    }));

    try {
      const settings = await dashboardClient.projects.getSettings(projectId);
      set((state) => ({
        settingsByProject: { ...state.settingsByProject, [projectId]: settings },
        isSettingsLoading: { ...state.isSettingsLoading, [projectId]: false },
      }));
      return settings;
    } catch (error) {
      set((state) => ({
        isSettingsLoading: { ...state.isSettingsLoading, [projectId]: false },
      }));
      throw error;
    }
  },
  updateSettings: async (projectId, input) => {
    const settings = await dashboardClient.projects.updateSettings(projectId, input);
    set((state) => ({
      settingsByProject: { ...state.settingsByProject, [projectId]: settings },
      projects: state.projects.map((item) =>
        item.id === projectId ? { ...item, website: settings.website, updatedAt: new Date().toISOString() } : item,
      ),
    }));
    return settings;
  },
}));
