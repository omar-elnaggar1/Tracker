import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emptyDB, type DB, type Settings, type TableName, type Tables } from "./types";

/** Everything the app needs from a backend. Both implementations hold one user's data. */
export interface Store {
  mode: "local" | "cloud";
  loadAll(): Promise<DB>;
  upsert<T extends TableName>(table: T, row: Tables[T]): Promise<void>;
  remove(table: TableName, id: string): Promise<void>;
  saveSettings(s: Settings): Promise<void>;
  /** Calls `onChange` when data changes elsewhere (another tab or device). Returns unsubscribe. */
  subscribe(onChange: () => void): () => void;
}

const TABLES: TableName[] = ["areas", "kpis", "entries", "milestones", "reflections", "weekly_reviews"];

// ---------------------------------------------------------------- local

const LOCAL_KEY = "life-tracker:db";

export class LocalStore implements Store {
  mode = "local" as const;

  private read(): DB {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return { ...emptyDB(), ...JSON.parse(raw) };
    } catch {
      /* fall through to empty */
    }
    return emptyDB();
  }

  private write(db: DB) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(db));
  }

  async loadAll() {
    return this.read();
  }

  async upsert<T extends TableName>(table: T, row: Tables[T]) {
    const db = this.read();
    const rows = db[table] as Tables[T][];
    const i = rows.findIndex((r) => r.id === row.id);
    if (i >= 0) rows[i] = row;
    else rows.push(row);
    this.write(db);
  }

  async remove(table: TableName, id: string) {
    const db = this.read();
    // Mirror the ON DELETE CASCADE foreign keys of the SQL schema.
    if (table === "areas") {
      const kpiIds = new Set(db.kpis.filter((k) => k.area_id === id).map((k) => k.id));
      db.kpis = db.kpis.filter((k) => !kpiIds.has(k.id));
      db.entries = db.entries.filter((e) => !kpiIds.has(e.kpi_id));
      db.milestones = db.milestones.filter((m) => !kpiIds.has(m.kpi_id));
    }
    if (table === "kpis") {
      db.entries = db.entries.filter((e) => e.kpi_id !== id);
      db.milestones = db.milestones.filter((m) => m.kpi_id !== id);
    }
    (db[table] as { id: string }[]) = (db[table] as { id: string }[]).filter((r) => r.id !== id);
    this.write(db);
  }

  async saveSettings(s: Settings) {
    const db = this.read();
    db.settings = s;
    this.write(db);
  }

  subscribe(onChange: () => void) {
    const handler = (e: StorageEvent) => e.key === LOCAL_KEY && onChange();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }
}

// ---------------------------------------------------------------- supabase

export class SupabaseStore implements Store {
  mode = "cloud" as const;
  constructor(
    public client: SupabaseClient,
    private userId: string,
  ) {}

  async loadAll() {
    const db = emptyDB();
    const results = await Promise.all(TABLES.map((t) => this.client.from(t).select("*")));
    results.forEach((res, i) => {
      if (res.error) throw res.error;
      (db[TABLES[i]] as unknown[]) = res.data ?? [];
    });
    const s = await this.client.from("settings").select("*").maybeSingle();
    if (s.error) throw s.error;
    if (s.data) {
      db.settings = {
        week_starts_on: s.data.week_starts_on,
        checkin_time: s.data.checkin_time,
        notifications: s.data.notifications,
      };
    }
    return db;
  }

  async upsert<T extends TableName>(table: T, row: Tables[T]) {
    const { error } = await this.client.from(table).upsert(row);
    if (error) throw error;
  }

  async remove(table: TableName, id: string) {
    const { error } = await this.client.from(table).delete().eq("id", id);
    if (error) throw error;
  }

  async saveSettings(s: Settings) {
    const { error } = await this.client.from("settings").upsert({ user_id: this.userId, ...s });
    if (error) throw error;
  }

  subscribe(onChange: () => void) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(onChange, 250);
    };
    const channel = this.client.channel("life-tracker-changes");
    for (const table of [...TABLES, "settings"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, debounced);
    }
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      void this.client.removeChannel(channel);
    };
  }
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Shared Supabase client, or null when the app runs in local mode. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

export const newId = () => crypto.randomUUID();
