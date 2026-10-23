import { useState } from "react";
import { Card, inputCls, primaryBtnCls } from "../components/ui";
import { supabase } from "../lib/store";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { data, error } =
      mode === "signin"
        ? await supabase!.auth.signInWithPassword({ email, password })
        : await supabase!.auth.signUp({ email, password });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === "signup" && !data.session) setMsg("Check your email to confirm your account, then sign in.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <h1 className="text-xl font-bold">Life Tracker</h1>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input
            className={inputCls}
            type="password"
            placeholder="Password (6+ characters)"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className={`${primaryBtnCls} py-2`} disabled={busy}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
          {msg && <p className="text-sm text-amber-300">{msg}</p>}
          <button
            type="button"
            className="text-sm text-slate-400 hover:text-white"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "No account yet? Create one" : "Have an account? Sign in"}
          </button>
        </form>
      </Card>
    </div>
  );
}
