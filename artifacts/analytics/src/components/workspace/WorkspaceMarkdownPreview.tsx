import { cn } from "@/lib/utils";

type MarkdownBlock =
  | { type: "heading"; level: number; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; items: string[] }
  | { type: "blockquote"; items: string[] }
  | { type: "code"; language: string; content: string };

export function WorkspaceMarkdownPreview({
  source,
  compact = false,
  className,
}: {
  source: string;
  compact?: boolean;
  className?: string;
}) {
  const blocks = parseMarkdownBlocks(source);

  return (
    <div className={cn("space-y-3 text-white/84", className)}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const headingClassName =
            block.level === 1
              ? "text-[22px] font-semibold tracking-tight text-white"
              : block.level === 2
                ? "text-base font-semibold text-white"
                : "text-sm font-semibold uppercase tracking-[0.12em] text-white/70";

          return (
            <p key={`heading:${index}`} className={headingClassName}>
              {block.content}
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list:${index}`} className="space-y-1.5 pl-4 text-sm leading-6 text-white/72">
              {block.items.slice(0, compact ? 3 : block.items.length).map((item) => (
                <li key={item} className="list-disc">
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "blockquote") {
          return (
            <div
              key={`quote:${index}`}
              className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/68"
            >
              {block.items.slice(0, compact ? 2 : block.items.length).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          );
        }

        if (block.type === "code") {
          return (
            <div
              key={`code:${index}`}
              className="overflow-hidden rounded-[18px] border border-white/8 bg-[#0b1015]"
            >
              <div className="border-b border-white/8 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/34">
                {block.language || "code"}
              </div>
              <pre className="overflow-auto px-3 py-3 text-[12px] leading-6 text-white/74">
                <code>{block.content}</code>
              </pre>
            </div>
          );
        }

        return (
          <p
            key={`paragraph:${index}`}
            className={cn(
              "text-sm leading-6 text-white/72",
              compact && "line-clamp-3",
            )}
          >
            {block.content}
          </p>
        );
      })}
    </div>
  );
}

function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const normalized = source.trim();
  if (!normalized) {
    return [{ type: "paragraph", content: "Documento markdown vazio." }];
  }

  const lines = normalized.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let quoteItems: string[] = [];
  let inCode = false;
  let codeLanguage = "";
  let codeLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    blocks.push({ type: "paragraph", content: paragraphLines.join(" ") });
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push({ type: "list", items: [...listItems] });
    listItems = [];
  };

  const flushQuote = () => {
    if (!quoteItems.length) return;
    blocks.push({ type: "blockquote", items: [...quoteItems] });
    quoteItems = [];
  };

  const flushCode = () => {
    if (!codeLines.length && !inCode) return;
    blocks.push({ type: "code", language: codeLanguage, content: codeLines.join("\n") });
    codeLanguage = "";
    codeLines = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushList();
      flushQuote();
      if (inCode) {
        inCode = false;
        flushCode();
        return;
      }
      inCode = true;
      codeLanguage = trimmed.slice(3).trim();
      codeLines = [];
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      flushQuote();
      return;
    }

    if (trimmed.startsWith("#")) {
      flushParagraph();
      flushList();
      flushQuote();
      const match = trimmed.match(/^(#+)\s+(.*)$/);
      blocks.push({
        type: "heading",
        level: match?.[1].length ?? 1,
        content: match?.[2] ?? trimmed.replace(/^#+/, "").trim(),
      });
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      flushQuote();
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      flushQuote();
      listItems.push(trimmed.replace(/^\d+\.\s+/, ""));
      return;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      flushList();
      quoteItems.push(trimmed.replace(/^>\s?/, ""));
      return;
    }

    flushList();
    flushQuote();
    paragraphLines.push(trimmed);
  });

  flushParagraph();
  flushList();
  flushQuote();
  if (inCode) flushCode();

  return blocks.length ? blocks : [{ type: "paragraph", content: normalized }];
}
