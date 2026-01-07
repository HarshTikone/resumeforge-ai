// src/pages/ProfilePage.jsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuthStore } from "../store/useAuthStore";

const toneOptions = [
  { value: "neutral", label: "Neutral professional" },
  { value: "techie", label: "Techie / engineer" },
  { value: "casual", label: "Friendly casual" },
  { value: "executive", label: "Executive / leadership" },
  { value: "minimal", label: "Minimal / concise" },
];

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [autosaveMsg, setAutosaveMsg] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    city: "",
    state: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    professional_summary: "",
    preferred_tone: "techie",
    writing_sample: "",
  });

  const hasLoadedRef = useRef(false);
  const dirtyRef = useRef(false); // track if user has edited after load

  useEffect(() => {
    if (!user) return;

    async function loadProfile() {
      setLoading(true);
      setMessage("");
      setAutosaveMsg("");

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading profile:", error.message);
      } else if (data) {
        setForm((prev) => ({
          ...prev,
          ...data,
        }));
      }

      // we just loaded from DB, not user edits yet
      dirtyRef.current = false;
      hasLoadedRef.current = true;
      setLoading(false);
    }

    loadProfile();
  }, [user]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    dirtyRef.current = true;
    setAutosaveMsg(""); // clear old autosave message
  }

  async function saveProfile(manual = false) {
    if (!user) return;
    setSaving(true);
    if (manual) {
      setMessage("");
    }

    try {
      const payload = {
        id: user.id,
        email: user.email,
        ...form,
      };

      const { error } = await supabase.from("users").upsert(payload);

      if (error) throw error;

      dirtyRef.current = false;

      if (manual) {
        setMessage("Profile saved successfully. This will power all your resumes.");
      } else {
        setAutosaveMsg("Changes saved.");
      }
    } catch (err) {
      console.error(err);
      if (manual) {
        setMessage(err.message || "Something went wrong while saving.");
      } else {
        setAutosaveMsg("Autosave failed, please click Save profile.");
      }
    } finally {
      setSaving(false);
    }
  }

  // 🔁 Auto-save when user stops typing for ~1s
  useEffect(() => {
    if (!user) return;
    if (!hasLoadedRef.current) return; // don't autosave during initial load
    if (!dirtyRef.current) return; // nothing changed

    const timeout = setTimeout(() => {
      // background autosave, don't show big loading state
      saveProfile(false);
    }, 1000); // 1 second after they stop typing

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, user]);

  async function handleSubmit(e) {
    e.preventDefault();
    await saveProfile(true); // manual, big button save
  }

  if (loading) {
    return (
      <div className="text-sm text-slate-400">Loading your profile…</div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-slate-400 mt-1">
            This profile is the single source of truth for your resume and cover
            letter content. Keep it honest and detailed — the AI will tailor it
            per job.
          </p>
        </div>
        {autosaveMsg && (
          <div className="text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded-md px-2 py-1">
            {autosaveMsg}
          </div>
        )}
      </div>

      {message && (
        <div className="text-xs bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-200">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Basic information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Full name</label>
              <input
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Harsh Tikone"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300">Phone</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300">City</label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Buffalo"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300">State / Region</label>
              <input
                type="text"
                name="state"
                value={form.state}
                onChange={handleChange}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="NY"
              />
            </div>
          </div>
        </section>

        {/* Links */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Links</h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-300">LinkedIn</label>
              <input
                type="url"
                name="linkedin_url"
                value={form.linkedin_url}
                onChange={handleChange}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="https://www.linkedin.com/in/..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-300">GitHub</label>
              <input
                type="url"
                name="github_url"
                value={form.github_url}
                onChange={handleChange}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="https://github.com/..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-300">
                Portfolio / Website
              </label>
              <input
                type="url"
                name="portfolio_url"
                value={form.portfolio_url}
                onChange={handleChange}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="https://..."
              />
            </div>
          </div>
        </section>

        {/* Summary & tone */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">
            Summary & writing style
          </h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-300">
                Base professional summary
              </label>
              <textarea
                name="professional_summary"
                value={form.professional_summary}
                onChange={handleChange}
                className="w-full min-h-[80px] rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="1–3 sentences about who you are as an engineer."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300">Preferred tone</label>
              <select
                name="preferred_tone"
                value={form.preferred_tone}
                onChange={handleChange}
                className="w-full md:w-64 rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              >
                {toneOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                We’ll use this tone when humanizing your bullets and cover
                letters so they sound like you.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300">
                Optional writing sample (for voice mimicking)
              </label>
              <textarea
                name="writing_sample"
                value={form.writing_sample}
                onChange={handleChange}
                className="w-full min-h-[100px] rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Paste 1–2 paragraphs you’ve written in your own words (LinkedIn About, past cover letter, etc.). This helps the AI match your natural style."
              />
            </div>
          </div>
        </section>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving profile…" : "Save profile"}
          </button>
          <span className="text-[11px] text-slate-500">
            Autosave is on. You can safely switch tabs; your latest changes are
            stored in the cloud.
          </span>
        </div>
      </form>
    </div>
  );
}
