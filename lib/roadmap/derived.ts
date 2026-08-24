import { getActiveWorkspaceStatuses } from "@/lib/workspace-statuses/queries";
import {
  listRoadmapByStatuses,
  type RoadmapSort,
  type RoadmapStatusColumn,
} from "./queries";

// Build the derived (Sync ON) roadmap. Columns are ONLY the active feedback
// statuses explicitly flagged `showOnRoadmap` (Planned / In Progress / Completed
// by default), in the workspace's status order. Intake/internal statuses — Open,
// Under Review, Closed, and anything custom — are never columns, so Draft/Open
// can never appear on the roadmap. "Rejected/Closed" appear only when a Brand
// Admin turns their roadmap flag on.
export async function getDerivedRoadmap(
  workspaceId: string,
  opts: {
    isAdmin?: boolean;
    userId?: string;
    search?: string;
    categoryId?: string;
    sort?: RoadmapSort;
  } = {}
): Promise<RoadmapStatusColumn[]> {
  const statuses = await getActiveWorkspaceStatuses(workspaceId);
  const columns = statuses
    .filter((s) => s.showOnRoadmap)
    .map((s) => ({ id: s.id, name: s.name, slug: s.slug, color: s.color }));
  return listRoadmapByStatuses(workspaceId, columns, opts);
}
