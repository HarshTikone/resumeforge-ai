// src/pages/AuthPage.jsx
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthPage() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function ensureProfile(user) {
    if (!user) return;
    try {
      await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email,
        },
        { onConflict: "id" }
      );
    } catch (e) {
      console.warn("Profile upsert failed (non-fatal):", e.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Ensure profile row exists once the user logs in
        await ensureProfile(data.user);

        // Redirect into the app – AppLayout will pick up the session
        window.location.href = "/dashboard";
      } else {
        // SIGN UP flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // Most setups have "Email confirmations" enabled.
        // In that case, Supabase sends a verification link.
        setInfo(
          `We’ve sent a verification link to ${email}. Please confirm your email, then come back here and log in with the same credentials.`
        );
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        {/* Brand */}
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-300">
            <span className="text-sky-400">ResumeForge</span>{" "}
            <span className="text-amber-300">AI</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Human-like, ATS-optimized resumes and cover letters.
          </p>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-xl font-semibold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sign in or sign up using{" "}
            <span className="font-medium text-slate-200">
              just your email and password
            </span>
            . You’ll manage everything from a single workspace.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Password</label>
            <input
              type="password"
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
            />
          </div>

          {error && (
            <div className="text-xs text-red-300 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {info && (
            <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded-md px-3 py-2">
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium py-2 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? mode === "login"
                ? "Signing you in…"
                : "Creating your account…"
              : mode === "login"
              ? "Log In"
              : "Sign Up"}
          </button>
        </form>

        {/* Toggle */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {mode === "login"
              ? "Don’t have an account yet?"
              : "Already have an account?"}
          </span>
          <button
            type="button"
            className="text-sky-300 hover:text-sky-200 underline underline-offset-4"
            onClick={() => {
              setMode((m) => (m === "login" ? "signup" : "login"));
              setError("");
              setInfo("");
            }}
          >
            {mode === "login" ? "Create one" : "Log in instead"}
          </button>
        </div>

        <p className="text-[10px] text-slate-500">
          Tip: In Supabase, make sure{" "}
          <span className="font-semibold">email confirmations</span> are enabled
          if you want users to verify their address before logging in.
        </p>
      </div>
    </div>
  );
}
