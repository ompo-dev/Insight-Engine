import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FileWarning, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceMarkdownPreview } from "@/components/workspace/WorkspaceMarkdownPreview";
import { WorkspaceNodeDataTable } from "@/components/workspace/WorkspaceNodeDataTable";
import type {
  WorkspaceFileAsset,
  WorkspaceFileTableSheet,
} from "@/lib/workspace/file-assets";
import { cn } from "@/lib/utils";

interface WorkspaceFilePreviewProps {
  asset?: WorkspaceFileAsset | null;
  className?: string;
  activeSheet?: string | null;
  onSelectSheet?: (sheetName: string) => void;
  compact?: boolean;
}

export function WorkspaceFilePreview({
  asset,
  className,
  activeSheet,
  onSelectSheet,
  compact = false,
}: WorkspaceFilePreviewProps) {
  const objectUrl = useBlobObjectUrl(asset?.blob ?? null);
  const preview = asset?.preview;

  const selectedSheet = useMemo(() => {
    if (!preview?.sheets?.length) return null;
    return (
      preview.sheets.find((sheet) => sheet.name === activeSheet) ??
      preview.sheets[0] ??
      null
    );
  }, [activeSheet, preview?.sheets]);

  if (!asset) {
    return (
      <PreviewEmptyState
        className={className}
        text="Selecione um arquivo para visualizar."
      />
    );
  }

  if (asset.status === "processing") {
    return (
      <PreviewEmptyState
        className={className}
        icon={<Loader2 className="h-4 w-4 animate-spin" />}
        text="Gerando preview interno do arquivo..."
      />
    );
  }

  if (asset.status === "missing") {
    return (
      <PreviewEmptyState
        className={className}
        icon={<FileWarning className="h-4 w-4" />}
        text="O arquivo foi removido do inventario local."
      />
    );
  }

  if (!preview) {
    return (
      <PreviewEmptyState
        className={className}
        text="Nenhum preview disponivel para este arquivo."
      />
    );
  }

  if (preview.kind === "markdown") {
    return (
      <div
        className={cn(
          "overflow-auto rounded-[18px] border border-white/8 bg-[#0f141b] p-4",
          className,
        )}
      >
        <WorkspaceMarkdownPreview
          source={preview.text ?? ""}
          compact={compact}
        />
      </div>
    );
  }

  if (preview.kind === "text") {
    return (
      <div
        className={cn(
          "overflow-auto rounded-[18px] border border-white/8 bg-[#0f141b] p-4",
          className,
        )}
      >
        <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-white/74">
          {compact ? (preview.text ?? "").slice(0, 1800) : (preview.text ?? "")}
        </pre>
      </div>
    );
  }

  if (preview.kind === "table") {
    if (!selectedSheet) {
      return (
        <PreviewEmptyState
          className={className}
          text="Nenhuma sheet disponivel neste arquivo."
        />
      );
    }

    return (
      <div className={cn("flex h-full min-h-0 flex-col gap-3", className)}>
        {preview.sheets && preview.sheets.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {preview.sheets.map((sheet) => (
              <Button
                key={sheet.name}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onSelectSheet?.(sheet.name)}
                className={cn(
                  "h-8 rounded-full border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08]",
                  selectedSheet.name === sheet.name &&
                    "border-white/10 bg-[#16181d] text-white shadow-[0_0_0_1px_rgba(125,211,252,0.12)]",
                )}
              >
                {sheet.name}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden rounded-[18px] border border-white/8 bg-[#0f141b]">
          <WorkspaceNodeDataTable
            title={asset.name}
            preview={toTablePreview(selectedSheet, compact)}
          />
        </div>
      </div>
    );
  }

  if (preview.kind === "image") {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-[18px] border border-white/8 bg-[#0f141b]",
          className,
        )}
      >
        {objectUrl ? (
          <img
            src={objectUrl}
            alt={asset.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <PreviewEmptyState
            icon={<ImageIcon className="h-4 w-4" />}
            text="Nao foi possivel carregar a imagem."
          />
        )}
      </div>
    );
  }

  if (preview.kind === "pdf") {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-[18px] border border-white/8 bg-[#0f141b]",
          className,
        )}
      >
        {objectUrl ? (
          <iframe
            data-workspace-control="true"
            title={asset.name}
            src={objectUrl}
            className="h-full min-h-[320px] w-full bg-white"
          />
        ) : (
          <PreviewEmptyState text="Nao foi possivel abrir o PDF internamente." />
        )}
      </div>
    );
  }

  if (preview.kind === "document") {
    return (
      <div
        className={cn(
          "overflow-auto rounded-[18px] border border-white/8 bg-[#0f141b] p-4",
          className,
        )}
      >
        {preview.html ? (
          <div
            className="prose prose-invert max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-white/74">
            {preview.text ?? "Documento sem preview textual."}
          </pre>
        )}
      </div>
    );
  }

  if (preview.kind === "slides") {
    return (
      <div
        className={cn(
          "space-y-3 overflow-auto rounded-[18px] border border-white/8 bg-[#0f141b] p-4",
          className,
        )}
      >
        {(preview.slideTexts ?? []).map((slide, index) => (
          <div
            key={`${asset.id}:slide:${index}`}
            className="rounded-[16px] border border-white/8 bg-[#10141a] p-4"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/34">
              Slide {index + 1}
            </p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-white/76">
              {slide.length ? (
                slide.map((line, lineIndex) => (
                  <p key={`${index}:${lineIndex}`}>{line}</p>
                ))
              ) : (
                <p>Sem texto extraido.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <PreviewEmptyState
      className={className}
      icon={<FileWarning className="h-4 w-4" />}
      text={
        preview.error ||
        "Preview interno ainda nao disponivel para este formato."
      }
    />
  );
}

function useBlobObjectUrl(blob: Blob | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setObjectUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(blob);
    setObjectUrl(nextUrl);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [blob]);

  return objectUrl;
}

function toTablePreview(sheet: WorkspaceFileTableSheet, compact: boolean) {
  return {
    columns: sheet.columns,
    rows: compact ? sheet.rows.slice(0, 10) : sheet.rows,
  };
}

function PreviewEmptyState({
  text,
  icon,
  className,
}: {
  text: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[220px] items-center justify-center rounded-[18px] border border-dashed border-white/10 bg-[#0f141b] px-4 py-8 text-center text-sm text-white/48",
        className,
      )}
    >
      <div className="space-y-3">
        {icon ? (
          <div className="flex justify-center text-white/40">{icon}</div>
        ) : null}
        <p>{text}</p>
      </div>
    </div>
  );
}
