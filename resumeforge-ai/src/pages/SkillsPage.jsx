// src/pages/SkillsPage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuthStore } from "../store/useAuthStore";

const emptySkill = {
  id: null,
  category: "",
  skill_name: "",
  proficiency_level: "",
  years_experience: "",
};

const PROFICIENCY_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Expert"];

export default function SkillsPage() {
  const { user } = useAuthStore();
  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState(emptySkill);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadSkills() {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .eq("user_id", user.id)
      .order("category", { ascending: true })
      .order("skill_name", { ascending: true });

    if (error) {
      console.error(error);
      setMessage("Failed to load skills.");
    } else {
      setSkills(data || []);
    }
    setLoading(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startNew() {
    setForm(emptySkill);
    setMessage("");
  }

  function startEdit(s) {
    setForm({
      id: s.id,
      category: s.category || "",
      skill_name: s.skill_name || "",
      proficiency_level: s.proficiency_level || "",
      years_experience: s.years_experience || "",
    });
    setMessage("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage("");

    const payload = {
      user_id: user.id,
      category: form.category.trim() || null,
      skill_name: form.skill_name.trim(),
      proficiency_level: form.proficiency_level || null,
      years_experience: form.years_experience
        ? Number(form.years_experience)
        : null,
    };

    try {
      if (form.id) {
        const { error } = await supabase
          .from("skills")
          .update(payload)
          .eq("id", form.id)
          .eq("user_id", user.id);
        if (error) throw error;
        setMessage("Skill updated.");
      } else {
        const { error } = await supabase.from("skills").insert(payload);
        if (error) throw error;
        setMessage("Skill added.");
      }
      setForm(emptySkill);
      await loadSkills();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Failed to save skill.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this skill?")) return;
    try {
      const { error } = await supabase
        .from("skills")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      setMessage("Skill deleted.");
      await loadSkills();
    } catch (err) {
      console.error(err);
      setMessage("Failed to delete skill.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Skills</h1>
          <p className="text-sm text-slate-400 mt-1">
            Add your technical and soft skills. ResumeForge will prioritize and
            format them per job.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium px-3 py-2"
        >
          + Add skill
        </button>
      </div>

      {message && (
        <div className="text-xs bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-200">
          {message}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs text-slate-300">Skill name</label>
            <input
              type="text"
              name="skill_name"
              value={form.skill_name}
              onChange={handleChange}
              required
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="PyTorch, React, SQL..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Category</label>
            <input
              type="text"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="ML, Backend, Frontend, Soft"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Proficiency</label>
            <select
              name="proficiency_level"
              value={form.proficiency_level}
              onChange={handleChange}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Select…</option>
              {PROFICIENCY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full md:w-40 space-y-1">
          <label className="text-xs text-slate-300">
            Years of experience (approx.)
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            name="years_experience"
            value={form.years_experience}
            onChange={handleChange}
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="1.5"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium px-4 py-2 disabled:opacity-60"
        >
          {saving ? "Saving…" : form.id ? "Update skill" : "Add skill"}
        </button>
      </form>

      {/* List */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Saved skills</h2>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : skills.length === 0 ? (
          <p className="text-sm text-slate-500">
            No skills yet. Add the tools and concepts you want to highlight.
          </p>
        ) : (
          <div className="space-y-1">
            {skills.map((s) => (
              <div
                key={s.id}
                className="border border-slate-800 rounded-lg px-3 py-2 flex justify-between items-center bg-slate-900/40 text-xs"
              >
                <div>
                  <div className="font-medium text-slate-100">
                    {s.skill_name}
                    {s.category && (
                      <span className="text-slate-400"> · {s.category}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {s.proficiency_level && `${s.proficiency_level}`}
                    {s.years_experience != null &&
                      s.years_experience !== "" &&
                      ` · ${s.years_experience} yrs`}
                  </div>
                </div>
                <div className="flex gap-2 text-[11px]">
                  <button
                    onClick={() => startEdit(s)}
                    className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-2 py-1 rounded border border-red-900 text-red-300 hover:bg-red-950/50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
