import { SectionEyebrow, Surface } from "@workspace/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <Surface className="cq-shell max-w-xl p-8 text-center">
        <SectionEyebrow>Unified Canvas</SectionEyebrow>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Rota nao encontrada</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          A aplicacao agora vive no canvas. Use uma rota de projeto valida para abrir o workspace.
        </p>
      </Surface>
    </main>
  );
}
