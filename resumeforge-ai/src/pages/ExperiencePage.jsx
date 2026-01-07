// src/pages/ExperiencePage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuthStore } from "../store/useAuthStore";

const emptyForm = {
  id: null,
  company_name: "",
  job_title: "",
  location: "",
  start_date: "",
  end_date: "",
  is_current: false,
  description_text: "", // textarea version of description[]
  technologies_text: "", // comma-separated
};

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  }); // e.g., "Jan 2024"
}


export default function ExperiencePage() {
  const { user } = useAuthStore();
  const [experiences, setExperiences] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    loadExperiences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadExperiences() {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("work_experiences")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("Failed to load experiences.");
    } else {
      setExperiences(data || []);
    }
    setLoading(false);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startNew() {
    setForm(emptyForm);
    setMessage("");
  }

  function startEdit(exp) {
    setForm({
      id: exp.id,
      company_name: exp.company_name || "",
      job_title: exp.job_title || "",
      location: exp.location || "",
      start_date: exp.start_date || "",
      end_date: exp.end_date || "",
      is_current: exp.is_current || false,
      description_text: (exp.description || []).join("\n"),
      technologies_text: (exp.technologies || []).join(", "),
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
      company_name: form.company_name.trim(),
      job_title: form.job_title.trim(),
      location: form.location.trim(),
      start_date: form.start_date || null,
      end_date: form.is_current ? null : form.end_date || null,
      is_current: form.is_current,
      description: form.description_text
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      technologies: form.technologies_text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      if (form.id) {
        const { error } = await supabase
          .from("work_experiences")
          .update(payload)
          .eq("id", form.id)
          .eq("user_id", user.id);

        if (error) throw error;
        setMessage("Experience updated.");
      } else {
        const { error } = await supabase
          .from("work_experiences")
          .insert(payload);
        if (error) throw error;
        setMessage("Experience added.");
      }

      setForm(emptyForm);
      await loadExperiences();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Failed to save experience.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this experience?")) return;
    try {
      const { error } = await supabase
        .from("work_experiences")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      setMessage("Experience deleted.");
      await loadExperiences();
    } catch (err) {
      console.error(err);
      setMessage("Failed to delete.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Work Experience</h1>
          <p className="text-sm text-slate-400 mt-1">
            Add the roles you actually want to show recruiters. The AI will
            rank and select from here based on each job description.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium px-3 py-2"
        >
          + Add new
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Job title</label>
            <input
              type="text"
              name="job_title"
              value={form.job_title}
              onChange={handleChange}
              required
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Machine Learning Engineer"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Company</label>
            <input
              type="text"
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              required
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="XYZ Labs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Location</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Buffalo, NY"
            />
          </div>
          <div className="flex gap-3">
            <div className="space-y-1 flex-1">
              <label className="text-xs text-slate-300">Start date</label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                required
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            {!form.is_current && (
              <div className="space-y-1 flex-1">
                <label className="text-xs text-slate-300">End date</label>
                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleChange}
                  className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <input
            id="is_current"
            type="checkbox"
            name="is_current"
            checked={form.is_current}
            onChange={handleChange}
            className="rounded border-slate-600 bg-slate-950"
          />
          <label htmlFor="is_current">This is my current role</label>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-300">
            Bullet points (one per line)
          </label>
          <textarea
            name="description_text"
            value={form.description_text}
            onChange={handleChange}
            className="w-full min-h-[120px] rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="- Built a LightGCN-based recommender...\n- Deployed models on AWS Lambda..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-300">
            Technologies (comma-separated)
          </label>
          <input
            type="text"
            name="technologies_text"
            value={form.technologies_text}
            onChange={handleChange}
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Python, PyTorch, LightGCN, AWS"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium px-4 py-2 disabled:opacity-60"
        >
          {saving
            ? "Saving…"
            : form.id
            ? "Update experience"
            : "Add experience"}
        </button>
      </form>

      {/* List */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Saved experiences
        </h2>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : experiences.length === 0 ? (
          <p className="text-sm text-slate-500">
            No experiences yet. Add at least one role so your resume has
            something to work with.
          </p>
        ) : (
          <div className="space-y-2">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="border border-slate-800 rounded-lg p-3 flex justify-between gap-4 bg-slate-900/40"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {exp.job_title} ·{" "}
                    <span className="text-slate-300">
                      {exp.company_name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {exp.location && <span>{exp.location} · </span>}
                    {formatDateShort(exp.start_date) || "Start"} –{" "}
                    {exp.is_current
                      ? "Present"
                      : formatDateShort(exp.end_date) || "End"}
                  </div>
                  <ul className="text-xs text-slate-400 list-disc list-inside mt-1">
                    {(exp.description || []).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                  {exp.technologies?.length > 0 && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      Tech: {exp.technologies.join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 text-[11px]">
                  <button
                    onClick={() => startEdit(exp)}
                    className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(exp.id)}
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
