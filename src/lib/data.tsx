import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { indexEntries, trackingSince, type EntryIndex } from "./scoring";
import { buildSeed } from "./seed";
import { newId, type Store } from "./store";
import {
  emptyDB,
  type Area,
  type DB,
  type Kpi,
  type Milestone,
  type Reflection,
  type Settings,
  type TableName,
  type Tables,
  type WeeklyReview,
} from "./types";
import { todayISO, type WeekStart } from "./periods";

interface DataContextValue {
  db: DB;
  idx: EntryIndex;
  ws: WeekStart;
  /** First day anything was logged; scores don't count days before it. */
  since: string;
  ready: boolean;
  error: string | null;
  store: Store;
  clearError(): void;
  setEntry(kpiId: string, date: string, value: number): void;
  saveArea(a: Area): void;
  deleteArea(id: string): void;
  saveKpi(k: Kpi): void;
  deleteKpi(id: string): void;
  saveMilestone(m: Milestone): void;
  deleteMilestone(id: string): void;
  saveReflection(r: Omit<Reflection, "id">): void;
  saveReview(r: Omit<WeeklyReview, "id">): void;
  saveSettings(s: Settings): void;
}

// One in-flight initial load per store, so a re-run effect (React StrictMode) can't seed twice.
const initialLoads = new WeakMap<Store, Promise<DB>>();

function initialLoad(store: Store) {
  let p = initialLoads.get(store);
  if (!p) {
    p = (async () => {
      const data = await store.loadAll();
      if (data.areas.length) return data;
      const seed = buildSeed();
      for (const a of seed.areas) await store.upsert("areas", a);
      for (const k of seed.kpis) await store.upsert("kpis", k);
      return store.loadAll();
    })();
    p.catch(() => initialLoads.delete(store));
    initialLoads.set(store, p);
  }
  return p;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ store, children }: { store: Store; children: ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDB);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dbRef = useRef(db);
  dbRef.current = db;

  const reload = useCallback(async () => {
    try {
      setDb(await store.loadAll());
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [store]);

  // Initial load; seed starter areas/KPIs for a brand-new account.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await initialLoad(store);
        if (!cancelled) setDb(data);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  useEffect(() => store.subscribe(reload), [store, reload]);

  const run = useCallback(
    (op: Promise<void>) => {
      op.catch((e) => {
        setError(errorMessage(e));
        void reload();
      });
    },
    [reload],
  );

  const put = useCallback(
    <T extends TableName>(table: T, row: Tables[T]) => {
      setDb((prev) => {
        const rows = prev[table] as Tables[T][];
        const exists = rows.some((r) => r.id === row.id);
        return { ...prev, [table]: exists ? rows.map((r) => (r.id === row.id ? row : r)) : [...rows, row] };
      });
      run(store.upsert(table, row));
    },
    [store, run],
  );

  const del = useCallback(
    (table: TableName, id: string) => {
      setDb((prev) => ({ ...prev, [table]: (prev[table] as { id: string }[]).filter((r) => r.id !== id) }));
      // Reload afterwards so cascaded deletes (KPIs, entries) are reflected.
      run(store.remove(table, id).then(reload));
    },
    [store, run, reload],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      db,
      idx: indexEntries(db.entries),
      ws: db.settings.week_starts_on,
      since: trackingSince(db.entries, todayISO()),
      ready,
      error,
      store,
      clearError: () => setError(null),
      setEntry(kpiId, date, value) {
        const existing = dbRef.current.entries.find((e) => e.kpi_id === kpiId && e.date === date);
        put("entries", { id: existing?.id ?? newId(), kpi_id: kpiId, date, value, note: existing?.note ?? "" });
      },
      saveArea: (a) => put("areas", a),
      deleteArea: (id) => del("areas", id),
      saveKpi: (k) => put("kpis", k),
      deleteKpi: (id) => del("kpis", id),
      saveMilestone: (m) => put("milestones", m),
      deleteMilestone: (id) => del("milestones", id),
      saveReflection(r) {
        const existing = dbRef.current.reflections.find((x) => x.date === r.date);
        put("reflections", { ...r, id: existing?.id ?? newId() });
      },
      saveReview(r) {
        const existing = dbRef.current.weekly_reviews.find((x) => x.week_start === r.week_start);
        put("weekly_reviews", { ...r, id: existing?.id ?? newId() });
      },
      saveSettings(s) {
        setDb((prev) => ({ ...prev, settings: s }));
        run(store.saveSettings(s));
      },
    }),
    [db, ready, error, store, put, del, run],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}

function errorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}
