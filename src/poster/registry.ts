import { groupA } from "./templates/group-a";
import { groupB } from "./templates/group-b";
import { groupC } from "./templates/group-c";
import { velvetStage } from "./templates/velvet-stage";
import type { Template } from "./types";

export const TEMPLATES: Template[] = [velvetStage, ...groupA, ...groupB, ...groupC];

export function getTemplate(id: string): Template {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown template: ${id}`);
  return t;
}
