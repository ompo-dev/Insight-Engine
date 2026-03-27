import type { WorkspaceRemoteState } from "@workspace/contracts";
import type { CustomTelemetryItemDefinition } from "@/lib/telemetry/items";
import type { WorkspaceDefinition } from "@/lib/workspace/types";

export interface WorkspaceRemoteStateSnapshot extends Omit<WorkspaceRemoteState, "definition" | "customItems"> {
  definition: WorkspaceDefinition | null;
  customItems: CustomTelemetryItemDefinition[];
}
