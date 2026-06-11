// packages/create-nextion-app/src/provision/index.ts
//
// Orchestrates the post-render provisioning flow:
//   1. Verify wrangler auth (required)
//   2. Create / reuse D1, KV, R2 (idempotent)
//   3. Create D1 tables locally via `d1 migrations apply --local`
//   4. Turnstile, Resend, and Google OAuth are intentionally
//      skipped here — users wire them up manually after scaffold.
//   5. Create Notion data source if `NOTION_API_TOKEN` is set,
//      otherwise prompt (interactive mode only)
//   6. Wire everything into `wrangler.jsonc` + `.dev.vars` +
//      `wrangler secret put` for secrets
//   7. Print a status card with ✅ / ⚠️ per item + repair commands
//
// Every step is best-effort and degrades gracefully. The scaffolded
// project is usable even if all optional steps are skipped — the user
// can re-run individual commands from the printed status card.

import * as p from "@clack/prompts";
import type { Answers } from "../prompt.js";
import { runOrThrow } from "./shell.js";
import {
  requireWranglerAuth,
  ensureD1,
  ensureKV,
  ensureR2,
  setWorkerSecret,
} from "./cloudflare.js";
import {
  isNtnAvailable,
  verifyNotionToken,
  ensureNotionDatabase,
} from "./notion.js";
import { promptNotion } from "./prompts.js";
import { patchWranglerJsonc, writeDevVars, type WireInputs } from "./wire.js";
import { ensureDependencies } from "./dependencies.js";
import {
  readNtnToken,
  isNtnLoggedIn,
  describeNtnSource,
  type NtnCredential,
} from "./ntn-credentials.js";

export interface ProvisionResult {
  d1: { ok: boolean; id?: string; message?: string; created?: boolean };
  kv: { ok: boolean; id?: string; message?: string; created?: boolean };
  r2: { ok: boolean; name?: string; message?: string; created?: boolean };
  turnstile: {
    ok: boolean;
    sitekey?: string;
    secret?: string;
    message?: string;
    skipped?: boolean;
  };
  notion: {
    ok: boolean;
    dataSourceId?: string;
    message?: string;
    skipped?: boolean;
    seeded?: number;
  };
  resend: { ok: boolean; enabled: boolean; message?: string };
  google: { ok: boolean; enabled: boolean; message?: string };
  migrationsApplied: boolean;
  // Internal carriers for the wire step — never printed in the
  // status card.
  _turnstileSecret?: string;
  _notionToken?: string;
}

export async function provision(
  answers: Answers,
  projectDir: string,
  options: { interactive: boolean }
): Promise<ProvisionResult> {
  const result: ProvisionResult = {
    d1: { ok: false },
    kv: { ok: false },
    r2: { ok: false },
    turnstile: { ok: false },
    notion: { ok: false },
    resend: { ok: false, enabled: false },
    google: { ok: false, enabled: false },
    migrationsApplied: false,
  };

  // The project uses kebab-case for resource names.
  const slug = answers.projectName.toLowerCase();
  const d1Name = `${slug}-db`;
  const r2Name = `${slug}-assets`;

  // ---- 0. External CLI tools (wrangler, ntn) ----
  // Make sure wrangler/ntn are on PATH at a usable version before we
  // try to drive them. Missing tools get installed (with a prompt in
  // interactive mode).
  const deps = await ensureDependencies(undefined, {
    interactive: options.interactive,
  });
  for (const dep of deps) {
    if (!dep.available) {
      p.log.warn(
        `${dep.name}: unavailable — related steps will be skipped.`
      );
    } else if (dep.needsUpgrade) {
      p.log.warn(
        `${dep.name} ${dep.version} is older than required ${dep.minVersion} — some steps may fail.`
      );
    } else if (dep.installedNow) {
      p.log.success(
        `${dep.name} ${dep.version ?? ""} ready${dep.installedNow ? " (just installed)" : ""}.`
      );
    } else if (dep.version) {
      p.log.success(`${dep.name} ${dep.version} ready.`);
    }
  }

  // ---- 1. Wrangler auth ----
  try {
    const acc = await requireWranglerAuth();
    p.log.success(`Cloudflare: logged in (account ${acc.id.slice(0, 8)}…)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    p.log.error(`Cloudflare: ${message}`);
    p.log.info(
      "Re-run after `wrangler login`. You can still use the project; just create D1/KV/R2 by hand."
    );
    return finalize(result, projectDir, slug);
  }

  // ---- 2-3. D1 / KV / R2 ----
  try {
    const r = await ensureD1(d1Name);
    result.d1 = { ok: true, id: r.databaseId, created: r.created };
    p.log.success(
      `D1: ${r.created ? "created" : "reused"} ${d1Name} (${r.databaseId.slice(0, 8)}…)`
    );
  } catch (err) {
    result.d1 = {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
    p.log.error(`D1: ${result.d1.message}`);
  }

  try {
    const r = await ensureKV("CONTENT_CACHE");
    result.kv = { ok: true, id: r.namespaceId, created: r.created };
    p.log.success(
      `KV: ${r.created ? "created" : "reused"} CONTENT_CACHE (${r.namespaceId.slice(0, 8)}…)`
    );
  } catch (err) {
    result.kv = {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
    p.log.error(`KV: ${result.kv.message}`);
  }

  try {
    const r = await ensureR2(r2Name);
    result.r2 = { ok: true, name: r.bucketName, created: r.created };
    p.log.success(
      `R2: ${r.created ? "created" : "reused"} ${r2Name}`
    );
  } catch (err) {
    result.r2 = {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
    p.log.error(`R2: ${result.r2.message}`);
  }

  // ---- 3b. Apply D1 migrations locally (best-effort, no project deps required) ----
  if (result.d1.ok && result.d1.id) {
    try {
      // Local D1 apply: wrangler reads the binding from wrangler.jsonc
      // and uses the local sqlite-backed miniflare store. This works
      // even before `pnpm install`.
      await runOrThrow(
        "wrangler",
        ["d1", "migrations", "apply", d1Name, "--local"],
        { cwd: projectDir }
      );
      result.migrationsApplied = true;
      p.log.success(`D1 migrations: applied to local store`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      p.log.warn(`D1 migrations: ${msg}`);
    }
  }

  // ---- 4. Turnstile ----
  // Skipped silently during scaffolding. The generated project still
  // ships with full Turnstile support — an unset secret is a no-op
  // in the auth flow. Users can wire the widget manually later (see
  // README) or set CLOUDFLARE_API_TOKEN and re-run the relevant
  // helper. No log, no prompt, no auto-create here.
  result.turnstile = {
    ok: false,
    skipped: true,
    message: "skipped during scaffolding (configure manually later)",
  };

  // ---- 5. Notion ----
  // Token resolution order:
  //   1. `NOTION_API_TOKEN` env var (explicit, highest priority)
  //   2. `ntn` CLI's local credentials (keychain / auth.json)
  //   3. Interactive `secret_…` paste (only when interactive and no
  //      auto-source found)
  // Regardless of source, we still need a parent page id, which we
  // always prompt for interactively.
  try {
    const envToken = process.env.NOTION_API_TOKEN?.trim();
    let autoToken: NtnCredential | null = null;
    let resolvedToken: string | null = envToken || null;

    if (!resolvedToken) {
      autoToken = await readNtnToken();
      if (autoToken) {
        resolvedToken = autoToken.token;
        p.log.success(
          `Notion: auto-detected credentials (${describeNtnSource(autoToken.source)})`
        );
      } else {
        // Give a useful hint about the fastest path forward.
        const ntnLoggedIn = await isNtnLoggedIn();
        if (!ntnLoggedIn) {
          p.log.info(
            "Notion: no credentials detected. Run `ntn login` once to skip the token prompt, or paste a `secret_…` token below."
          );
        }
      }
    }

    if (resolvedToken) {
      const ok = await verifyNotionToken(resolvedToken);
      if (!ok) throw new Error("Notion token failed verification");
      const ntn = await isNtnAvailable();
      if (!ntn) {
        throw new Error("`ntn` CLI not installed. Run: npm i -g ntn@latest");
      }
      // Skip the token question, but still need parent page + seed count.
      const notion = await promptNotion(
        { interactive: options.interactive },
        answers.contentSource.fields,
        resolvedToken
      );
      if (notion) {
        const r = await ensureNotionDatabase({
          apiToken: notion.apiToken,
          parentPageId: notion.parentPageId,
          title: answers.contentSource.title,
          fields: answers.contentSource.fields,
          seedCount: notion.seedCount,
        });
        result.notion = {
          ok: true,
          dataSourceId: r.dataSourceId,
          seeded: r.seeded,
          ...(autoToken
            ? { message: `token from ${describeNtnSource(autoToken.source)}` }
            : {}),
        };
        p.log.success(
          `Notion: database created (${r.dataSourceId.slice(0, 8)}…), seeded ${r.seeded} pages.`
        );
        result._notionToken = resolvedToken;
      } else {
        result.notion = {
          ok: false,
          skipped: true,
          message: "Notion: token present but no parent page provided.",
        };
        p.log.warn("Notion: skipped (no parent page id).");
      }
    } else {
      // No env, no auto-detected ntn credentials. Fall back to the
      // interactive paste prompt.
      const notion = await promptNotion(
        { interactive: options.interactive },
        answers.contentSource.fields
      );
      if (notion) {
        const r = await ensureNotionDatabase({
          apiToken: notion.apiToken,
          parentPageId: notion.parentPageId,
          title: answers.contentSource.title,
          fields: answers.contentSource.fields,
          seedCount: notion.seedCount,
        });
        result.notion = {
          ok: true,
          dataSourceId: r.dataSourceId,
          seeded: r.seeded,
        };
        p.log.success(
          `Notion: database created (${r.dataSourceId.slice(0, 8)}…), seeded ${r.seeded} pages.`
        );
        result._notionToken = notion.apiToken;
      } else {
        result.notion = {
          ok: false,
          skipped: true,
          message:
            "Notion: set NOTION_API_TOKEN (and rerun), or run `ntn login` once to skip the prompt.",
        };
        p.log.warn("Notion: skipped.");
      }
    }
  } catch (err) {
    result.notion = {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
    p.log.error(`Notion: ${result.notion.message}`);
  }

  // ---- 6. Optional Resend + Google ----
  // Skipped during scaffolding — no prompt, no auto-create. Users
  // wire these up manually after the project is generated (see the
  // project README). Result rows are still surfaced in the status
  // card so the operator knows the integration is intentionally
  // disabled.
  result.resend = { ok: true, enabled: false, message: "skipped (configure manually later)" };
  result.google = { ok: true, enabled: false, message: "skipped (configure manually later)" };

  // ---- 7. Wire everything into wrangler.jsonc + .dev.vars ----
  if (result.d1.ok && result.kv.ok) {
    const wireInputs: WireInputs = {
      d1DatabaseId: result.d1.id!,
      kvNamespaceId: result.kv.id!,
      turnstileSitekey: result.turnstile.sitekey,
      turnstileSecret: result.turnstile.ok ? result.turnstile.secret : undefined,
      notionToken: result._notionToken,
      notionDataSourceId: result.notion.dataSourceId,
    };
    try {
      await patchWranglerJsonc(projectDir, wireInputs);
      await writeDevVars(projectDir, wireInputs);
      p.log.success(`Wired: wrangler.jsonc + .dev.vars updated.`);
    } catch (err) {
      p.log.error(
        `Wiring failed: ${err instanceof Error ? err.message : err}`
      );
    }

    // Set the Turnstile secret on the worker (best-effort, requires
    // the worker to be deployable — i.e. `pnpm install` must have
    // happened). Skip silently if wrangler secret put fails because
    // the worker hasn't been built yet.
    if (wireInputs.turnstileSecret) {
      try {
        await setWorkerSecret(
          "TURNSTILE_SECRET_KEY",
          wireInputs.turnstileSecret,
          projectDir,
          [wireInputs.turnstileSecret]
        );
        p.log.success(`Worker secret: TURNSTILE_SECRET_KEY set.`);
      } catch {
        p.log.info(
          "Worker secret: skipped (run `pnpm install && pnpm exec wrangler secret put TURNSTILE_SECRET_KEY` after install)."
        );
      }
    }
  }

  return finalize(result, projectDir, slug);
}

function finalize(
  result: ProvisionResult,
  _projectDir: string,
  slug: string
): ProvisionResult {
  // ---- 8. Status card ----
  p.outro("Provisioning summary");
  console.log("");
  const row = (label: string, status: "ok" | "warn" | "fail", detail: string) => {
    const icon = status === "ok" ? "✅" : status === "warn" ? "⚠️ " : "❌";
    console.log(`  ${icon}  ${label.padEnd(20)} ${detail}`);
  };
  row("D1", result.d1.ok ? "ok" : "fail", result.d1.ok ? `${slug}-db (${result.d1.id?.slice(0, 8)}…)` : (result.d1.message ?? "failed"));
  row("KV", result.kv.ok ? "ok" : "fail", result.kv.ok ? `CONTENT_CACHE (${result.kv.id?.slice(0, 8)}…)` : (result.kv.message ?? "failed"));
  row("R2", result.r2.ok ? "ok" : "fail", result.r2.ok ? `${slug}-assets` : (result.r2.message ?? "failed"));
  row("Migrations", result.migrationsApplied ? "ok" : "warn", result.migrationsApplied ? "applied locally" : "skipped or failed (run `pnpm run migrate:local` after install)");
  row(
    "Turnstile",
    result.turnstile.ok ? "ok" : result.turnstile.skipped ? "warn" : "fail",
    result.turnstile.ok
      ? `${result.turnstile.sitekey?.slice(0, 12)}…`
      : result.turnstile.skipped
        ? "skipped (configure manually — see README)"
        : (result.turnstile.message ?? "failed")
  );
  row(
    "Notion",
    result.notion.ok ? "ok" : result.notion.skipped ? "warn" : "fail",
    result.notion.ok
      ? `data source ${result.notion.dataSourceId?.slice(0, 8)}…, seeded ${result.notion.seeded ?? 0} pages${result.notion.message ? " (" + result.notion.message + ")" : ""}`
      : result.notion.skipped
        ? "skipped (set NOTION_API_TOKEN or run `ntn login` to auto-create)"
        : (result.notion.message ?? "failed")
  );
  row("Resend", result.resend.enabled ? "ok" : "warn", result.resend.enabled ? "enabled" : "skipped (configure manually — see README)");
  row("Google", result.google.enabled ? "ok" : "warn", result.google.enabled ? "enabled" : "skipped (configure manually — see README)");

  return result;
}
