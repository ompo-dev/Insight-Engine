import { redirect } from "next/navigation";
import { getDefaultProject } from "@workspace/domain";

export default async function HomePage() {
  const project = await getDefaultProject();
  redirect(project ? `/projects/${project.id}` : "/projects/proj_orbit");
}
