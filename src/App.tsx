import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DataProvider } from "./lib/data";
import { LocalStore, SupabaseStore, supabase } from "./lib/store";
import Dashboard from "./pages/Dashboard";
import Goals from "./pages/Goals";
import Login from "./pages/Login";
import SettingsPage from "./pages/Settings";
import Today from "./pages/Today";
import WeeklyReview from "./pages/WeeklyReview";

export default function App() {
  return supabase ? <CloudApp /> : <TrackerApp store={useMemo(() => new LocalStore(), [])} />;
}

function CloudApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase!.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase!.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  const userId = session?.user.id;
  const store = useMemo(() => (userId ? new SupabaseStore(supabase!, userId) : null), [userId]);

  if (session === undefined) return <Splash />;
  if (!store) return <Login />;
  return <TrackerApp key={userId} store={store} />;
}

function TrackerApp({ store }: { store: LocalStore | SupabaseStore }) {
  return (
    <DataProvider store={store}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Today />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="goals" element={<Goals />} />
          <Route path="review" element={<WeeklyReview />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}

export function Splash() {
  return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
}
