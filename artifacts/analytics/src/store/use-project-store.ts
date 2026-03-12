import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProjectStore {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  dateRange: { from: string; to: string };
  setDateRange: (range: { from: string; to: string }) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      selectedProjectId: null,
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
      theme: "light",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
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
        theme: state.theme,
        dateRange: state.dateRange,
      }),
    }
  )
);
