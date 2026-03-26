export type ProjectThemeId = "lynx" | "sprout" | "paper" | "repo";
export type ProjectAppearance = "light" | "dark";

export interface ProjectThemeDefinition {
  id: ProjectThemeId;
  label: string;
  description: string;
  accent: string;
  surface: string;
  canvas: string;
}

export const projectThemeDefinitions: ProjectThemeDefinition[] = [
  {
    id: "lynx",
    label: "Lynx",
    description: "Azul claro, foco e contraste suave para dashboards vivos.",
    accent: "#2f7df7",
    surface: "#e6f0ff",
    canvas: "#f6f9ff",
  },
  {
    id: "sprout",
    label: "Sprout",
    description: "Energia de produto com pegada playful e leitura direta.",
    accent: "#4fa527",
    surface: "#eef9dc",
    canvas: "#fbfef5",
  },
  {
    id: "paper",
    label: "Paper",
    description: "Base editorial inspirada em workspace, limpa e silenciosa.",
    accent: "#77634a",
    surface: "#f2eadf",
    canvas: "#fcf8f2",
  },
  {
    id: "repo",
    label: "Repo",
    description: "Tons slate de engenharia com cara de ferramenta robusta.",
    accent: "#0969da",
    surface: "#e7edf5",
    canvas: "#f5f8fc",
  },
];

export const projectThemeMap = Object.fromEntries(
  projectThemeDefinitions.map((theme) => [theme.id, theme]),
) as Record<ProjectThemeId, ProjectThemeDefinition>;

export const defaultProjectThemeId: ProjectThemeId = "repo";
export const defaultProjectAppearance: ProjectAppearance = "dark";
