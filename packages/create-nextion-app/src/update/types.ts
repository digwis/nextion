export type UnifiedUpdateRisk = "safe" | "conflict";

export type UnifiedUpdateKind = "file" | "notion" | "cloudflare";

export interface UnifiedUpdateEntry {
  label: string;
  kind: UnifiedUpdateKind;
  risk: UnifiedUpdateRisk;
  group: "codeTemplate" | "notionContent" | "cloudflareBinding";
  apply(): Promise<void>;
}

export interface UnifiedUpdatePlan {
  safe: UnifiedUpdateEntry[];
  conflicts: UnifiedUpdateEntry[];
  conflictGroups: {
    codeTemplate: UnifiedUpdateEntry[];
    notionContent: UnifiedUpdateEntry[];
    cloudflareBinding: UnifiedUpdateEntry[];
  };
}

export interface UnifiedUpdateSummary {
  appliedSafe: UnifiedUpdateEntry[];
  appliedConflicts: UnifiedUpdateEntry[];
  conflictsRemaining: UnifiedUpdateEntry[];
  needsInstall: boolean;
  compatibilityPreserved: boolean;
}
