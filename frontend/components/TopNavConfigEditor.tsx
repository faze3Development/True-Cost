"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SIDEBAR_NAV_LINKS,
  createDefaultTopNavRuntimeConfig,
  getAllTopNavCandidates,
  parseTopNavRuntimeConfig,
  resolveTopNavSetKey,
  type Route,
  type TopNavRuntimeConfig,
} from "@/routes";

type SaveState = "idle" | "saving" | "saved" | "error";

interface TopNavConfigEditorProps {
  savedConfig?: unknown;
  onSaveConfig: (config: TopNavRuntimeConfig) => Promise<void>;
}

interface NavContext {
  label: string;
  prefix: string;
}

interface DragSource {
  zone: "visible" | "hidden";
  index: number;
}

const cloneConfig = (config: TopNavRuntimeConfig): TopNavRuntimeConfig => ({
  sets: Object.fromEntries(
    Object.entries(config.sets).map(([key, routes]) => [
      key,
      routes.map((route) => ({ ...route })),
    ])
  ),
  pageRules: config.pageRules.map((rule) => ({ ...rule })),
});

const parseSavedConfig = (savedConfig: unknown): TopNavRuntimeConfig | null => {
  if (!savedConfig) {
    return null;
  }

  if (typeof savedConfig === "string") {
    return parseTopNavRuntimeConfig(savedConfig);
  }

  try {
    return parseTopNavRuntimeConfig(JSON.stringify(savedConfig));
  } catch {
    return null;
  }
};

export default function TopNavConfigEditor({ savedConfig, onSaveConfig }: TopNavConfigEditorProps) {
  const fallbackConfig = useMemo(() => createDefaultTopNavRuntimeConfig(), []);
  const candidates = useMemo(() => getAllTopNavCandidates(), []);

  const [selectedPrefix, setSelectedPrefix] = useState<string>("/");
  const [config, setConfig] = useState<TopNavRuntimeConfig>(fallbackConfig);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [newSetName, setNewSetName] = useState<string>("");
  const [newRulePrefix, setNewRulePrefix] = useState<string>("");
  const [newRuleSet, setNewRuleSet] = useState<string>("default");

  useEffect(() => {
    const fromSaved = parseSavedConfig(savedConfig);

    if (fromSaved) {
      setConfig(cloneConfig(fromSaved));
      return;
    }

    setConfig(cloneConfig(fallbackConfig));
  }, [savedConfig, fallbackConfig]);

  const contexts = useMemo(() => {
    const contextMap = new Map<string, string>();

    contextMap.set("/", "Global Default");

    for (const link of SIDEBAR_NAV_LINKS) {
      contextMap.set(link.href, link.label);
    }

    for (const rule of config.pageRules) {
      if (contextMap.has(rule.prefix)) {
        continue;
      }

      contextMap.set(rule.prefix, `Custom (${rule.prefix})`);
    }

    return Array.from(contextMap.entries()).map(([prefix, label]) => ({ label, prefix }));
  }, [config.pageRules]);

  useEffect(() => {
    const hasSelected = contexts.some((context) => context.prefix === selectedPrefix);
    if (!hasSelected) {
      setSelectedPrefix(contexts[0]?.prefix ?? "/");
    }
  }, [contexts, selectedPrefix]);

  const selectedRule = useMemo(
    () => config.pageRules.find((rule) => rule.prefix === selectedPrefix),
    [config.pageRules, selectedPrefix]
  );

  const selectedSetKey = useMemo(
    () => selectedRule?.set ?? resolveTopNavSetKey(selectedPrefix, config.pageRules),
    [selectedRule, selectedPrefix, config.pageRules]
  );

  const availableSetKeys = useMemo(() => {
    return Object.keys(config.sets).sort((a, b) => a.localeCompare(b));
  }, [config.sets]);

  const selectedSet = useMemo<Route[]>(() => {
    return (config.sets[selectedSetKey] ?? []).map((route) => ({ ...route }));
  }, [config.sets, selectedSetKey]);

  const hiddenCandidates = useMemo(() => {
    const visibleHrefs = new Set(selectedSet.map((route) => route.href));
    return candidates.filter((candidate) => !visibleHrefs.has(candidate.href));
  }, [selectedSet, candidates]);

  useEffect(() => {
    if (!availableSetKeys.includes(newRuleSet)) {
      setNewRuleSet(availableSetKeys[0] ?? "default");
    }
  }, [availableSetKeys, newRuleSet]);

  const setSelectedSet = (nextSet: Route[]) => {
    setConfig((prev) => ({
      ...prev,
      sets: {
        ...prev.sets,
        [selectedSetKey]: nextSet,
      },
    }));
  };

  const handleAssignSetToContext = (nextSetKey: string) => {
    setConfig((prev) => {
      const existingRuleIndex = prev.pageRules.findIndex((rule) => rule.prefix === selectedPrefix);
      const nextRules = [...prev.pageRules];

      if (existingRuleIndex >= 0) {
        nextRules[existingRuleIndex] = {
          ...nextRules[existingRuleIndex],
          set: nextSetKey,
        };
      } else {
        nextRules.push({
          prefix: selectedPrefix,
          set: nextSetKey,
        });
      }

      return {
        ...prev,
        pageRules: nextRules,
      };
    });
  };

  const handleCreateSetFromCurrent = () => {
    const normalized = newSetName.trim().replace(/\s+/g, "-");
    if (!normalized) {
      setSaveState("error");
      setSaveMessage("Set name cannot be empty.");
      return;
    }

    if (config.sets[normalized]) {
      setSaveState("error");
      setSaveMessage(`Set \"${normalized}\" already exists.`);
      return;
    }

    setConfig((prev) => ({
      ...prev,
      sets: {
        ...prev.sets,
        [normalized]: selectedSet.map((route) => ({ ...route })),
      },
      pageRules: [
        ...prev.pageRules.filter((rule) => rule.prefix !== selectedPrefix),
        { prefix: selectedPrefix, set: normalized },
      ],
    }));

    setSaveState("saved");
    setSaveMessage(`Created set \"${normalized}\" and mapped it to ${selectedPrefix}.`);
    setNewSetName("");
  };

  const handleDragStart = (zone: DragSource["zone"], index: number) => {
    setDragSource({ zone, index });
  };

  const handleDropOnVisible = (targetIndex: number) => {
    if (!dragSource) {
      return;
    }

    if (dragSource.zone === "visible") {
      if (dragSource.index === targetIndex) {
        setDragSource(null);
        return;
      }

      const next = [...selectedSet];
      const [moved] = next.splice(dragSource.index, 1);
      next.splice(targetIndex, 0, moved);
      setSelectedSet(next);
      setDragSource(null);
      return;
    }

    const sourceRoute = hiddenCandidates[dragSource.index];
    if (!sourceRoute) {
      setDragSource(null);
      return;
    }

    const next = [...selectedSet];
    next.splice(targetIndex, 0, {
      label: sourceRoute.label,
      href: sourceRoute.href,
      type: sourceRoute.type,
    });
    setSelectedSet(next);
    setDragSource(null);
  };

  const handleDropOnHidden = () => {
    if (!dragSource || dragSource.zone !== "visible") {
      setDragSource(null);
      return;
    }

    const route = selectedSet[dragSource.index];
    if (!route) {
      setDragSource(null);
      return;
    }

    handleHideRoute(route.href);
    setDragSource(null);
  };

  const handleAddRoute = (route: Route) => {
    if (selectedSet.some((item) => item.href === route.href)) {
      return;
    }

    setSelectedSet([
      ...selectedSet,
      {
        label: route.label,
        href: route.href,
        type: route.type,
      },
    ]);
  };

  const handleHideRoute = (href: string) => {
    setSelectedSet(selectedSet.filter((route) => route.href !== href));
  };

  const handleRenameRoute = (href: string, label: string) => {
    setSelectedSet(
      selectedSet.map((route) =>
        route.href === href
          ? {
              ...route,
              label,
            }
          : route
      )
    );
  };

  const handleAddRule = () => {
    const prefix = newRulePrefix.trim();
    if (!prefix || !prefix.startsWith("/")) {
      setSaveState("error");
      setSaveMessage("Rule prefix must start with '/'.");
      return;
    }

    if (!availableSetKeys.includes(newRuleSet)) {
      setSaveState("error");
      setSaveMessage("Choose a valid nav set for the new rule.");
      return;
    }

    setConfig((prev) => {
      const existingIndex = prev.pageRules.findIndex((rule) => rule.prefix === prefix);
      const nextRules = [...prev.pageRules];

      if (existingIndex >= 0) {
        nextRules[existingIndex] = { ...nextRules[existingIndex], set: newRuleSet };
      } else {
        nextRules.push({ prefix, set: newRuleSet });
      }

      return {
        ...prev,
        pageRules: nextRules,
      };
    });

    setSelectedPrefix(prefix);
    setNewRulePrefix("");
    setSaveState("saved");
    setSaveMessage(`Rule saved for ${prefix}.`);
  };

  const handleUpdateRulePrefix = (index: number, prefix: string) => {
    setConfig((prev) => {
      const nextRules = [...prev.pageRules];
      if (!nextRules[index]) {
        return prev;
      }

      nextRules[index] = {
        ...nextRules[index],
        prefix,
      };

      return {
        ...prev,
        pageRules: nextRules,
      };
    });
  };

  const handleUpdateRuleSet = (index: number, set: string) => {
    setConfig((prev) => {
      const nextRules = [...prev.pageRules];
      if (!nextRules[index]) {
        return prev;
      }

      nextRules[index] = {
        ...nextRules[index],
        set,
      };

      return {
        ...prev,
        pageRules: nextRules,
      };
    });
  };

  const handleMoveRule = (index: number, direction: "up" | "down") => {
    setConfig((prev) => {
      const nextRules = [...prev.pageRules];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (!nextRules[index] || targetIndex < 0 || targetIndex >= nextRules.length) {
        return prev;
      }

      const [rule] = nextRules.splice(index, 1);
      nextRules.splice(targetIndex, 0, rule);

      return {
        ...prev,
        pageRules: nextRules,
      };
    });
  };

  const handleRemoveRule = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      pageRules: prev.pageRules.filter((_, ruleIndex) => ruleIndex !== index),
    }));
  };

  const handleReset = () => {
    const reset = createDefaultTopNavRuntimeConfig();
    setConfig(cloneConfig(reset));
    setSaveState("saved");
    setSaveMessage("Reset to default navigation layout.");
  };

  const handleSave = async () => {
    setSaveState("saving");
    setSaveMessage("");

    try {
      await onSaveConfig(config);
      setSaveState("saved");
      setSaveMessage("Navigation layout saved. Header updates are now live.");
    } catch {
      setSaveState("error");
      setSaveMessage("Could not save to profile. Please try again.");
    }
  };

  return (
    <section className="space-y-6">
      <h4 className="flex items-center gap-4 text-sm font-black uppercase tracking-widest text-on-surface-variant">
        <span className="h-1 w-12 bg-secondary/20" aria-hidden />
        Top Nav Layout Manager
      </h4>

      <div className="space-y-6 bg-surface-container p-8 shadow-ambient">
        <div className="space-y-3 rounded-lg bg-surface-container-lowest p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Rule Priority (First Match Wins)
          </p>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant" htmlFor="new-rule-prefix">
                Prefix
              </label>
              <input
                id="new-rule-prefix"
                value={newRulePrefix}
                onChange={(event) => setNewRulePrefix(event.target.value)}
                placeholder="/pages/admin"
                className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/60"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant" htmlFor="new-rule-set">
                Nav Set
              </label>
              <select
                id="new-rule-set"
                value={newRuleSet}
                onChange={(event) => setNewRuleSet(event.target.value)}
                className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/60"
              >
                {availableSetKeys.map((setKey) => (
                  <option key={setKey} value={setKey}>
                    {setKey}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddRule}
              className="rounded-lg bg-surface-container-highest px-4 py-3 text-xs font-black uppercase tracking-widest text-on-surface transition hover:bg-white"
            >
              Add Rule
            </button>
          </div>

          <ul className="space-y-2">
            {config.pageRules.map((rule, index) => (
              <li key={`${rule.prefix}-${index}`} className="grid gap-3 rounded-lg bg-white p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                <input
                  value={rule.prefix}
                  onChange={(event) => handleUpdateRulePrefix(index, event.target.value)}
                  className="rounded-md bg-surface-container-lowest px-3 py-2 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/60"
                  aria-label={`Rule prefix ${index + 1}`}
                />
                <select
                  value={rule.set}
                  onChange={(event) => handleUpdateRuleSet(index, event.target.value)}
                  className="rounded-md bg-surface-container-lowest px-3 py-2 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/60"
                  aria-label={`Rule set ${index + 1}`}
                >
                  {availableSetKeys.map((setKey) => (
                    <option key={setKey} value={setKey}>
                      {setKey}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveRule(index, "up")}
                    className="rounded-md px-2 py-2 text-on-surface-variant transition hover:bg-surface-container-lowest hover:text-on-surface"
                    aria-label={`Move rule ${index + 1} up`}
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden>
                      keyboard_arrow_up
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveRule(index, "down")}
                    className="rounded-md px-2 py-2 text-on-surface-variant transition hover:bg-surface-container-lowest hover:text-on-surface"
                    aria-label={`Move rule ${index + 1} down`}
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden>
                      keyboard_arrow_down
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(index)}
                    className="rounded-md px-2 py-2 text-on-surface-variant transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove rule ${index + 1}`}
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden>
                      delete
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant" htmlFor="top-nav-context">
              1) Select Sidebar/Page Context
            </label>
            <select
              id="top-nav-context"
              value={selectedPrefix}
              onChange={(event) => setSelectedPrefix(event.target.value)}
              className="w-full rounded-lg bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/60"
            >
              {contexts.map((context) => (
                <option key={context.prefix} value={context.prefix}>
                  {context.label} ({context.prefix})
                </option>
              ))}
            </select>
            <p className="text-xs text-on-surface-variant">
              This context currently uses nav set <span className="font-bold text-on-surface">{selectedSetKey}</span>.
            </p>

            <div className="grid gap-3 pt-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="space-y-2">
                <label
                  className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                  htmlFor="top-nav-set-selector"
                >
                  Active Nav Set For This Context
                </label>
                <select
                  id="top-nav-set-selector"
                  value={selectedSetKey}
                  onChange={(event) => handleAssignSetToContext(event.target.value)}
                  className="w-full rounded-lg bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/60"
                >
                  {availableSetKeys.map((setKey) => (
                    <option key={setKey} value={setKey}>
                      {setKey}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant"
                  htmlFor="top-nav-new-set"
                >
                  Create New Set
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="top-nav-new-set"
                    value={newSetName}
                    onChange={(event) => setNewSetName(event.target.value)}
                    placeholder="e.g. leasing-team"
                    className="w-full rounded-lg bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-secondary/60"
                  />
                  <button
                    type="button"
                    onClick={handleCreateSetFromCurrent}
                    className="rounded-lg bg-surface-container-lowest px-4 py-3 text-xs font-black uppercase tracking-widest text-on-surface transition hover:bg-white"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg bg-surface-container-lowest px-4 py-3 text-xs font-black uppercase tracking-widest text-on-surface transition hover:bg-white"
            >
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === "saving"}
              className="rounded-lg bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saveState === "saving" ? "Saving..." : "Save Layout"}
            </button>
          </div>
        </div>

        {saveMessage ? (
          <p className={`text-xs font-semibold ${saveState === "error" ? "text-red-600" : "text-secondary"}`}>
            {saveMessage}
          </p>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <div
            className="space-y-3 rounded-lg bg-surface-container-lowest p-4"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDropOnVisible(selectedSet.length)}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              2) Visible In Top Nav (Drag To Reorder)
            </p>

            {selectedSet.length === 0 ? (
              <div className="rounded-lg border border-dashed border-outline/40 p-4 text-sm text-on-surface-variant">
                No visible pages yet. Add from the hidden list.
              </div>
            ) : (
              <ul className="space-y-2">
                {selectedSet.map((route, index) => (
                  <li
                    key={`${route.href}-${index}`}
                    draggable
                    onDragStart={() => handleDragStart("visible", index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDropOnVisible(index)}
                    className="rounded-lg bg-white p-3 shadow-sm"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm" aria-hidden>
                          drag_indicator
                        </span>
                        {route.href}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleHideRoute(route.href)}
                        className="text-xs font-black uppercase tracking-widest text-on-surface-variant transition hover:text-red-600"
                      >
                        Hide
                      </button>
                    </div>
                    <input
                      value={route.label}
                      onChange={(event) => handleRenameRoute(route.href, event.target.value)}
                      className="w-full rounded-md bg-surface-container-lowest px-3 py-2 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/60"
                      aria-label={`Label for ${route.href}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div
            className="space-y-3 rounded-lg bg-surface-container-lowest p-4"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropOnHidden}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
              3) Hidden/Available Pages (Drop Here To Hide)
            </p>
            <ul className="space-y-2">
              {hiddenCandidates.map((route, index) => (
                <li
                  key={route.href}
                  draggable
                  onDragStart={() => handleDragStart("hidden", index)}
                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{route.label}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{route.href}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddRoute(route)}
                    className="rounded-md bg-secondary/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-secondary transition hover:bg-secondary/20"
                  >
                    Show
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
