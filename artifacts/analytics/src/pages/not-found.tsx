import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-muted/20 px-4 py-10">
      <Card className="w-full max-w-md border-border/50 shadow-subtle">
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10">
              <AlertCircle className="h-6 w-6 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Pagina nao encontrada</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            A rota que voce tentou abrir nao existe ou ainda nao foi conectada ao app principal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
