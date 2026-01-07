// src/pages/EducationPage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuthStore } from "../store/useAuthStore";

const emptyEdu = {
  id: null,
  degree: "",
  major: "",
  university: "",
  location: "",
  graduation_date: "",
  gpa: "",
  coursework_text: "",
};

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function EducationPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyEdu);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadEdu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadEdu() {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("education")
      .select("*")
      .eq("user_id", user.id)
      .order("graduation_date", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("Failed to load education.");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startNew() {
    setForm(emptyEdu);
    setMessage("");
  }

  function startEdit(ed) {
    setForm({
      id: ed.id,
      degree: ed.degree || "",
      major: ed.major || "",
      university: ed.university || "",
      location: ed.location || "",
      graduation_date: ed.graduation_date || "",
      gpa: ed.gpa || "",
      coursework_text: (ed.relevant_coursework || []).join(", "),
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
      degree: form.degree.trim(),
      major: form.major.trim() || null,
      university: form.university.trim(),
      location: form.location.trim() || null,
      graduation_date: form.graduation_date || null,
      gpa: form.gpa ? Number(form.gpa) : null,
      relevant_coursework: form.coursework_text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      if (form.id) {
        const { error } = await supabase
          .from("education")
          .update(payload)
          .eq("id", form.id)
          .eq("user_id", user.id);
        if (error) throw error;
        setMessage("Education updated.");
      } else {
        const { error } = await supabase.from("education").insert(payload);
        if (error) throw error;
        setMessage("Education added.");
      }
      setForm(emptyEdu);
      await loadEdu();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Failed to save education.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this education entry?")) return;
    try {
      const { error } = await supabase
        .from("education")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      setMessage("Education deleted.");
      await loadEdu();
    } catch (err) {
      console.error(err);
      setMessage("Failed to delete.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Education</h1>
          <p className="text-sm text-slate-400 mt-1">
            Add your degrees so we can build a clean education section for each resume.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium px-3 py-2"
        >
          + Add degree
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
        <div className="space-y-1">
          <label className="text-xs text-slate-300">Degree</label>
          <input
            type="text"
            name="degree"
            value={form.degree}
            onChange={handleChange}
            required
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="B.E., B.Tech., M.S., etc."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Major</label>
            <input
              type="text"
              name="major"
              value={form.major}
              onChange={handleChange}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Computer Science, AI, etc."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-300">University</label>
            <input
              type="text"
              name="university"
              value={form.university}
              onChange={handleChange}
              required
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="University at Buffalo"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Graduation date</label>
            <input
              type="date"
              name="graduation_date"
              value={form.graduation_date}
              onChange={handleChange}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-300">GPA (optional)</label>
            <input
              type="number"
              step="0.01"
              name="gpa"
              value={form.gpa}
              onChange={handleChange}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="3.75"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-300">
            Relevant coursework (comma-separated)
          </label>
          <textarea
            name="coursework_text"
            value={form.coursework_text}
            onChange={handleChange}
            className="w-full min-h-[60px] rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Machine Learning, Data Mining, Algorithms..."
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium px-4 py-2 disabled:opacity-60"
        >
          {saving ? "Saving…" : form.id ? "Update education" : "Add education"}
        </button>
      </form>

      {/* List */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Saved education
        </h2>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">
            No education entries yet. Add your main degree.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((ed) => (
              <div
                key={ed.id}
                className="border border-slate-800 rounded-lg p-3 flex justify-between gap-4 bg-slate-900/40 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-medium text-slate-100">
                    {ed.degree}
                    {ed.major && (
                      <span className="text-slate-300">
                        {" "}
                        · {ed.major}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {ed.university}
                    {ed.location && ` · ${ed.location}`}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {ed.graduation_date &&
                      `Graduated ${formatDateShort(ed.graduation_date)}`}
                    {ed.gpa && ` · GPA ${ed.gpa}`}
                  </div>
                  {ed.relevant_coursework?.length > 0 && (
                    <div className="text-[11px] text-slate-500">
                      Coursework: {ed.relevant_coursework.join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 text-[11px]">
                  <button
                    onClick={() => handleDelete(ed.id)}
                    className="px-2 py-1 rounded border border-red-900 text-red-300 hover:bg-red-950/50"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => startEdit(ed)}
                    className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
                  >
                    Edit
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
