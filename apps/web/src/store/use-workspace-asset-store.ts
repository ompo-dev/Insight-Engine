import { create } from "zustand";
import {
  createWorkspaceFileAsset,
  listWorkspaceFileAssets,
  putWorkspaceFileAsset,
  removeWorkspaceFileAsset,
  type WorkspaceFileAsset,
} from "@/lib/workspace/file-assets";

interface WorkspaceAssetStore {
  assetsByProject: Record<string, WorkspaceFileAsset[]>;
  loadedProjectIds: string[];
  loadProjectAssets: (projectId: string, force?: boolean) => Promise<void>;
  addFiles: (projectId: string, files: File[]) => Promise<WorkspaceFileAsset[]>;
  updateAsset: (
    projectId: string,
    assetId: string,
    patch: Partial<WorkspaceFileAsset>,
  ) => Promise<WorkspaceFileAsset | null>;
  deleteAsset: (projectId: string, assetId: string) => Promise<void>;
}

function sortAssets(assets: WorkspaceFileAsset[]) {
  return [...assets].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export const useWorkspaceAssetStore = create<WorkspaceAssetStore>((set, get) => ({
  assetsByProject: {},
  loadedProjectIds: [],
  loadProjectAssets: async (projectId, force = false) => {
    if (!force && get().loadedProjectIds.includes(projectId)) return;

    const assets = await listWorkspaceFileAssets(projectId);
    set((state) => ({
      assetsByProject: {
        ...state.assetsByProject,
        [projectId]: sortAssets(assets),
      },
      loadedProjectIds: force
        ? Array.from(new Set([...state.loadedProjectIds, projectId]))
        : state.loadedProjectIds.includes(projectId)
          ? state.loadedProjectIds
          : [...state.loadedProjectIds, projectId],
    }));
  },
  addFiles: async (projectId, files) => {
    const created = await Promise.all(files.map((file) => createWorkspaceFileAsset(projectId, file)));
    await Promise.all(created.map((asset) => putWorkspaceFileAsset(asset)));

    set((state) => ({
      assetsByProject: {
        ...state.assetsByProject,
        [projectId]: sortAssets([...(state.assetsByProject[projectId] ?? []), ...created]),
      },
      loadedProjectIds: state.loadedProjectIds.includes(projectId)
        ? state.loadedProjectIds
        : [...state.loadedProjectIds, projectId],
    }));

    return created;
  },
  updateAsset: async (projectId, assetId, patch) => {
    const current = (get().assetsByProject[projectId] ?? []).find((asset) => asset.id === assetId);
    if (!current) return null;

    const nextAsset: WorkspaceFileAsset = {
      ...current,
      ...patch,
      id: current.id,
      projectId,
      updatedAt: new Date().toISOString(),
    };

    await putWorkspaceFileAsset(nextAsset);

    set((state) => ({
      assetsByProject: {
        ...state.assetsByProject,
        [projectId]: sortAssets(
          (state.assetsByProject[projectId] ?? []).map((asset) => (asset.id === assetId ? nextAsset : asset)),
        ),
      },
    }));

    return nextAsset;
  },
  deleteAsset: async (projectId, assetId) => {
    await removeWorkspaceFileAsset(assetId);

    set((state) => ({
      assetsByProject: {
        ...state.assetsByProject,
        [projectId]: (state.assetsByProject[projectId] ?? []).filter((asset) => asset.id !== assetId),
      },
    }));
  },
}));
