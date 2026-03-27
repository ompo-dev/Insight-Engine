import type { Metadata } from "next";
import "./globals.css";
import { WebProviders } from "@/components/providers/web-providers";

export const metadata: Metadata = {
  title: "Unified Canvas",
  description: "Unified canvas workspace rebuilt on Next.js, Bun, Elysia and Prisma."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <WebProviders>{children}</WebProviders>
      </body>
    </html>
  );
}
