import { create } from "zustand";
import { dashboardClient } from "@/lib/http/client";
import type {
  CreateBoardItemInput,
  DeliveryBoard,
  DeliveryBoardItem,
  EngineeringOverview,
  UpdateBoardItemInput,
} from "@/lib/data/types";

interface EngineeringStore {
  overviewByProject: Record<string, EngineeringOverview>;
  boardByProject: Record<string, DeliveryBoard>;
  loading: Record<string, boolean>;
  loadOverview: (projectId: string) => Promise<EngineeringOverview>;
  loadBoard: (projectId: string) => Promise<DeliveryBoard>;
  createBoardItem: (projectId: string, data: CreateBoardItemInput) => Promise<DeliveryBoardItem>;
  updateBoardItem: (projectId: string, itemId: string, data: UpdateBoardItemInput) => Promise<DeliveryBoardItem>;
}

export const useEngineeringStore = create<EngineeringStore>((set) => ({
  overviewByProject: {},
  boardByProject: {},
  loading: {},
  loadOverview: async (projectId) => {
    const key = `engineering-overview:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.engineering.overview(projectId);
    set((state) => ({
      overviewByProject: { ...state.overviewByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  loadBoard: async (projectId) => {
    const key = `engineering-board:${projectId}`;
    set((state) => ({ loading: { ...state.loading, [key]: true } }));
    const data = await dashboardClient.engineering.board(projectId);
    set((state) => ({
      boardByProject: { ...state.boardByProject, [projectId]: data },
      loading: { ...state.loading, [key]: false },
    }));
    return data;
  },
  createBoardItem: async (projectId, data) => {
    const item = await dashboardClient.engineering.createBoardItem(projectId, data);
    const board = await dashboardClient.engineering.board(projectId);
    set((state) => ({
      boardByProject: { ...state.boardByProject, [projectId]: board },
    }));
    return item;
  },
  updateBoardItem: async (projectId, itemId, data) => {
    const item = await dashboardClient.engineering.updateBoardItem(projectId, itemId, data);
    const board = await dashboardClient.engineering.board(projectId);
    set((state) => ({
      boardByProject: { ...state.boardByProject, [projectId]: board },
    }));
    return item;
  },
}));
