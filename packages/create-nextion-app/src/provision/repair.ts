import { DEFAULT_ANSWERS, type Answers } from "../prompt.js";
import type { ProjectContext } from "../project-context.js";
import { provision } from "./index.js";
import { defaultProvisionMode } from "./options.js";
import { inspectProvisionRepair } from "./inspect.js";

export { inspectProvisionRepair } from "./inspect.js";

export function buildRepairAnswers(context: ProjectContext): Answers {
  return {
    projectName: context.metadata.projectName,
    targetDir: context.projectDir,
    defaultLocale: context.metadata.defaultLocale,
    supportedLocales: [...context.metadata.supportedLocales],
    nextionSource: context.metadata.nextionSource,
    enableSiteSettings: context.metadata.enableSiteSettings ?? true,
    contentSource: {
      id: context.metadata.contentSource.id,
      title: context.metadata.contentSource.title,
      fields: context.metadata.contentSource.fields.map((field) => ({
        key: field.key,
        notionName: field.notionName,
      })),
    },
    adminEmail: DEFAULT_ANSWERS.adminEmail,
    adminPassword: DEFAULT_ANSWERS.adminPassword,
    notionParentPage: DEFAULT_ANSWERS.notionParentPage,
    notionSeedCount: DEFAULT_ANSWERS.notionSeedCount,
  };
}

export async function runProvisionRepair(
  context: ProjectContext,
  answers: Answers = buildRepairAnswers(context),
  options: { conflictChoice?: "apply-all" | "safe-only" } = {}
) {
  if (options.conflictChoice) {
    const entries = await inspectProvisionRepair(context);
    const applicable = entries.filter((entry) =>
      options.conflictChoice === "apply-all" ? true : entry.risk === "safe"
    );

    for (const entry of applicable) {
      await entry.apply();
    }

    return { answers, appliedEntries: applicable };
  }

  return provision(answers, context.projectDir, {
    interactive: false,
    mode: defaultProvisionMode("repair"),
  });
}
