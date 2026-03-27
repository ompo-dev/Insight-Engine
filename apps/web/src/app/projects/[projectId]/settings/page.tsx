import { redirect } from "next/navigation";

export default async function LegacySettingsRedirectPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}`);
}
