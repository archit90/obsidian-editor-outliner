// What the e2e runners share besides the CDP client: the sandbox's environment (Obsidian's version, the plugins
// and core plugins enabled, which a case's needs are checked against), and Editor Multiple Lanes' settings while
// a suite runs (saved first and restored at the end; nothing without Lanes).
// @ts-check

/**
 * @typedef {import("./cdp.mjs").CdpJson} CdpJson
 * @typedef {{ ev: (expr: string) => Promise<CdpJson> }} Evaluator
 * @typedef {{ obsidian: string, plugins: string[], core: string[] }} Env
 */

export const LANES = "editor-multiple-lanes";

/**
 * The plugins (by id) and core plugins (core:<id>) enabled in the sandbox, and the environment for the results.
 * @param {Evaluator} c
 * @returns {Promise<{ loaded: Set<string>, env: Env }>}
 */
export async function environment(c) {
  /** @type {Env} */
  const env = await c.ev(`(() => {
    const plugins = Object.values(app.plugins.plugins).map(p => p.manifest.id + "@" + p.manifest.version).sort();
    const core = Object.keys(app.internalPlugins.plugins).filter(id => app.internalPlugins.getEnabledPluginById(id)).sort();
    const obsidian = (navigator.userAgent.match(/obsidian\\/([\\d.]+)/i) || [])[1] || "unknown";
    return { obsidian, plugins, core };
  })()`);
  const loaded = new Set([
    ...env.plugins.map(p => p.slice(0, p.lastIndexOf("@"))),
    ...env.core.map(id => "core:" + id),
  ]);
  return { loaded, env };
}

/** The ids E2E_REQUIRE lists: a case that needs one of them fails instead of being skipped when it's missing. */
export const required = () => new Set((process.env.E2E_REQUIRE || "").split(",").filter(Boolean));

/**
 * What a case or check that needs these ids should do here: run (null), be skipped (its missing ids), or fail
 * (the missing ids E2E_REQUIRE asks for, as { fail }).
 * @param {Set<string>} loaded
 * @param {string[] | undefined} needs
 * @returns {null | { skip: string[] } | { fail: string[] }}
 */
export function verdict(loaded, needs) {
  const missing = (needs ?? []).filter(id => !loaded.has(id));
  if (!missing.length) return null;
  const req = required();
  const must = missing.filter(id => req.has(id));
  return must.length ? { fail: must } : { skip: missing };
}

/** One line for the results: Obsidian's version and the plugins and core plugins enabled. @param {Env | null} env */
export const envLine = env =>
  env
    ? `Obsidian ${env.obsidian}; community plugins: ${env.plugins.join(", ") || "none"}; core plugins: ${env.core.join(", ")}.`
    : "";

/**
 * Editor Multiple Lanes, when it's enabled: lanesOnly on (a note opened goes into a lanes card) and the suite's
 * normal-tab folder _test/tab/ as a routing exception, through its test contract (settings.lanesOnly /
 * routeExceptions and settingsChanged("routing")). Returns what to restore; null without Lanes.
 * @param {Evaluator} c
 * @returns {Promise<CdpJson>}
 */
export async function lanesForSuite(c) {
  return c.ev(`(async () => {
    const lp = app.plugins.plugins["${LANES}"];
    if (!lp) return null;
    if (typeof lp.settings?.routeExceptions !== "string" || typeof lp.settingsChanged !== "function")
      throw new Error("Editor Multiple Lanes has no settings.routeExceptions / settingsChanged: its test contract changed");
    const old = { lanesOnly: lp.settings.lanesOnly, routeExceptions: lp.settings.routeExceptions };
    lp.settings.lanesOnly = true;
    if (!old.routeExceptions.split("\\n").some(l => l.trim() === "_test/tab/"))
      lp.settings.routeExceptions = (old.routeExceptions ? old.routeExceptions + "\\n" : "") + "_test/tab/";
    await lp.settingsChanged("routing");
    return old;
  })()`);
}

/**
 * Puts back what lanesForSuite changed.
 * @param {Evaluator} c
 * @param {CdpJson} old
 */
export async function lanesRestore(c, old) {
  if (!old) return;
  await c.ev(`(async () => {
    const lp = app.plugins.plugins["${LANES}"];
    if (!lp) return 0;
    Object.assign(lp.settings, ${JSON.stringify(old)});
    await lp.settingsChanged("routing");
    return 1;
  })()`);
}
