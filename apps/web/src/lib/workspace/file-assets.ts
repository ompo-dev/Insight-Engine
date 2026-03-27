export type WorkspaceFileAssetStatus = "ready" | "processing" | "error" | "missing";
export type WorkspaceFilePreviewKind =
  | "markdown"
  | "text"
  | "table"
  | "image"
  | "pdf"
  | "document"
  | "slides"
  | "unknown";
export type WorkspaceFileViewerType = "document" | "image" | "table" | "text";

export interface WorkspaceFileTableSheet {
  name: string;
  columns: string[];
  rows: string[][];
}

export interface WorkspaceFilePreview {
  kind: WorkspaceFilePreviewKind;
  text?: string;
  html?: string;
  sheets?: WorkspaceFileTableSheet[];
  slideTexts?: string[][];
  error?: string | null;
}

function previewHasError(preview: WorkspaceFilePreview) {
  return Boolean(preview.kind === "unknown" && preview.error);
}

export interface WorkspaceFileAsset {
  id: string;
  projectId: string;
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  status: WorkspaceFileAssetStatus;
  blob: Blob;
  preview?: WorkspaceFilePreview | null;
  metadata?: {
    title?: string | null;
    pageCount?: number | null;
    width?: number | null;
    height?: number | null;
  } | null;
}

const DB_NAME = "lynx-workspace-assets";
const DB_VERSION = 1;
const STORE_NAME = "assets";
const PROJECT_INDEX = "projectId";

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionToPromise(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  });
}

async function openWorkspaceAssetDatabase() {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex(PROJECT_INDEX, PROJECT_INDEX, { unique: false });
    }
  };

  return requestToPromise(request);
}

async function withAssetStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => Promise<T>) {
  const db = await openWorkspaceAssetDatabase();
  const transaction = db.transaction(STORE_NAME, mode);
  const store = transaction.objectStore(STORE_NAME);

  try {
    const result = await work(store);
    await transactionToPromise(transaction);
    db.close();
    return result;
  } catch (error) {
    db.close();
    throw error;
  }
}

export async function listWorkspaceFileAssets(projectId: string) {
  return withAssetStore("readonly", async (store) => {
    const request = store.index(PROJECT_INDEX).getAll(projectId);
    const assets = await requestToPromise(request);
    return assets.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  });
}

export async function putWorkspaceFileAsset(asset: WorkspaceFileAsset) {
  return withAssetStore("readwrite", async (store) => {
    store.put(asset);
    return asset;
  });
}

export async function removeWorkspaceFileAsset(assetId: string) {
  return withAssetStore("readwrite", async (store) => {
    store.delete(assetId);
  });
}

export function getWorkspaceFileExtension(name: string) {
  const segments = name.toLowerCase().split(".");
  return segments.length > 1 ? segments.at(-1) ?? "" : "";
}

function normalizeMimeType(file: File) {
  if (file.type) return file.type;

  const extension = getWorkspaceFileExtension(file.name);
  if (extension === "md") return "text/markdown";
  if (extension === "txt") return "text/plain";
  if (extension === "csv") return "text/csv";
  if (extension === "pdf") return "application/pdf";
  if (extension === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (extension === "pptx") {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (extension === "xlsx") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return "application/octet-stream";
}

function decodeXmlEntities(input: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<root>${input}</root>`, "text/xml");
  return doc.documentElement.textContent ?? input;
}

function sanitizeTableSheet(name: string, rows: unknown[][]): WorkspaceFileTableSheet {
  const normalizedRows = rows
    .filter((row) => Array.isArray(row) && row.some((cell) => cell !== null && cell !== undefined && `${cell}`.trim().length))
    .map((row) => row.map((cell) => `${cell ?? ""}`));

  const header = normalizedRows[0] ?? [];
  const body = normalizedRows.slice(1, 41);

  return {
    name,
    columns: header.length ? header : body[0]?.map((_, index) => `Column ${index + 1}`) ?? [],
    rows: body,
  };
}

async function buildWorkbookPreview(buffer: ArrayBuffer) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheets = workbook.SheetNames.slice(0, 8).map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
    }) as unknown[][];

    return sanitizeTableSheet(sheetName, rows);
  });

  return {
    kind: "table" as const,
    sheets,
  };
}

async function buildDocxPreview(buffer: ArrayBuffer) {
  const mammoth = await import("mammoth/mammoth.browser");
  const [{ value: html }, { value: rawText }] = await Promise.all([
    mammoth.convertToHtml({ arrayBuffer: buffer }),
    mammoth.extractRawText({ arrayBuffer: buffer }),
  ]);

  return {
    kind: "document" as const,
    html,
    text: rawText.trim(),
  };
}

async function buildPptxPreview(buffer: ArrayBuffer) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const slideTexts = await Promise.all(
    slideNames.map(async (slideName) => {
      const xml = await zip.file(slideName)?.async("text");
      if (!xml) return [];
      return Array.from(xml.matchAll(/<a:t>(.*?)<\/a:t>/g)).map((match) => decodeXmlEntities(match[1] ?? ""));
    }),
  );

  return {
    kind: "slides" as const,
    slideTexts,
    text: slideTexts.map((slide, index) => `Slide ${index + 1}: ${slide.join(" ")}`).join("\n"),
  };
}

async function buildTextPreview(file: File, extension: string) {
  const text = await file.text();
  return {
    kind: extension === "md" ? "markdown" as const : "text" as const,
    text,
  };
}

async function buildPreviewForFile(file: File, extension: string, mimeType: string) {
  if (["md", "txt"].includes(extension)) {
    return buildTextPreview(file, extension);
  }

  if (extension === "csv") {
    return buildWorkbookPreview(await file.arrayBuffer());
  }

  if (["xls", "xlsx"].includes(extension)) {
    return buildWorkbookPreview(await file.arrayBuffer());
  }

  if (extension === "docx") {
    return buildDocxPreview(await file.arrayBuffer());
  }

  if (extension === "pptx") {
    return buildPptxPreview(await file.arrayBuffer());
  }

  if (mimeType.startsWith("image/")) {
    return { kind: "image" as const };
  }

  if (extension === "pdf" || mimeType === "application/pdf") {
    return { kind: "pdf" as const };
  }

  return {
    kind: "unknown" as const,
    error: "Preview interno ainda nao disponivel para este formato.",
  };
}

export async function createWorkspaceFileAsset(projectId: string, file: File): Promise<WorkspaceFileAsset> {
  const now = new Date().toISOString();
  const extension = getWorkspaceFileExtension(file.name);
  const mimeType = normalizeMimeType(file);
  const assetId = crypto.randomUUID();

  try {
    const preview = await buildPreviewForFile(file, extension, mimeType);

    return {
      id: assetId,
      projectId,
      name: file.name,
      extension,
      mimeType,
      size: file.size,
      createdAt: now,
      updatedAt: now,
      status: previewHasError(preview) ? "error" : "ready",
      blob: file,
      preview,
      metadata: {
        title: file.name,
      },
    };
  } catch (error) {
    return {
      id: assetId,
      projectId,
      name: file.name,
      extension,
      mimeType,
      size: file.size,
      createdAt: now,
      updatedAt: now,
      status: "error",
      blob: file,
      preview: {
        kind: "unknown",
        error: error instanceof Error ? error.message : "Falha ao gerar preview interno.",
      },
      metadata: {
        title: file.name,
      },
    };
  }
}

export function resolveAssetViewerType(asset: WorkspaceFileAsset): WorkspaceFileViewerType {
  if (asset.preview?.kind === "image") return "image";
  if (asset.preview?.kind === "table") return "table";
  if (asset.preview?.kind === "markdown" || asset.preview?.kind === "text") return "text";
  return "document";
}

export function resolveOpenModeForAsset(asset: WorkspaceFileAsset) {
  if (asset.extension === "md" || asset.extension === "txt") return "markdown" as const;
  if (["csv", "xls", "xlsx"].includes(asset.extension)) return "file-viewer" as const;
  return "file-viewer" as const;
}
