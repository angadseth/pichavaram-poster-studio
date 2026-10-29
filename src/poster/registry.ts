import { velvetStage } from "./templates/velvet-stage";
import type { Template } from "./types";

export const TEMPLATES: Template[] = [velvetStage];

export function getTemplate(id: string): Template {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown template: ${id}`);
  return t;
}
