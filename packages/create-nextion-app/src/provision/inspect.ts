import type { ProjectContext } from "../project-context.js";
import type { UnifiedUpdateEntry } from "../update/types.js";

export async function inspectProvisionRepair(
  context: ProjectContext
): Promise<UnifiedUpdateEntry[]> {
  return [
    {
      label: "cloudflare:repair-bindings",
      kind: "cloudflare",
      group: "cloudflareBinding",
      risk: "safe",
      async apply() {
        void context;
      },
    },
  ];
}
