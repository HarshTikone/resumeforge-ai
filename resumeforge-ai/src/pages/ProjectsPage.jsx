// src/pages/ProjectsPage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuthStore } from "../store/useAuthStore";

const emptyProject = {
  id: null,
  project_name: "",
  description: "",
  technologies_text: "",
  github_url: "",
  live_url: "",
  impact: "",
};

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(emptyProject);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadProjects() {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("Failed to load projects.");
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startNew() {
    setForm(emptyProject);
    setMessage("");
  }

  function startEdit(p) {
    setForm({
      id: p.id,
      project_name: p.project_name || "",
      description: p.description || "",
      technologies_text: (p.technologies || []).join(", "),
      github_url: p.github_url || "",
      live_url: p.live_url || "",
      impact: p.impact || "",
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
      project_name: form.project_name.trim(),
      description: form.description.trim(),
      technologies: form.technologies_text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      github_url: form.github_url.trim() || null,
      live_url: form.live_url.trim() || null,
      impact: form.impact.trim(),
    };

    try {
      if (form.id) {
        const { error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", form.id)
          .eq("user_id", user.id);
        if (error) throw error;
        setMessage("Project updated.");
      } else {
        const { error } = await supabase.from("projects").insert(payload);
        if (error) throw error;
        setMessage("Project added.");
      }
      setForm(emptyProject);
      await loadProjects();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Failed to save project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this project?")) return;
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      setMessage("Project deleted.");
      await loadProjects();
    } catch (err) {
      console.error(err);
      setMessage("Failed to delete project.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-slate-400 mt-1">
            Add the ML/AI and software projects you want ResumeForge to pull
            from when tailoring resumes.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium px-3 py-2"
        >
          + Add project
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
          <label className="text-xs text-slate-300">Project name</label>
          <input
            type="text"
            name="project_name"
            value={form.project_name}
            onChange={handleChange}
            required
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Hybrid Movie Recommendation System (LightGCN)"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-300">
            Short description (what it does)
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="w-full min-h-[80px] rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Explain the problem, your approach, and the outcome."
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
            placeholder="Python, PyTorch, Streamlit, LightGCN"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-300">GitHub URL</label>
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
            <label className="text-xs text-slate-300">Live demo URL</label>
            <input
              type="url"
              name="live_url"
              value={form.live_url}
              onChange={handleChange}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-300">
            Impact / result (1–2 sentences)
          </label>
          <textarea
            name="impact"
            value={form.impact}
            onChange={handleChange}
            className="w-full min-h-[60px] rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="What changed because of this project? Any metrics or outcomes?"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-sky-600 hover:bg-sky-500 text-sm font-medium px-4 py-2 disabled:opacity-60"
        >
          {saving ? "Saving…" : form.id ? "Update project" : "Add project"}
        </button>
      </form>

      {/* List */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Saved projects
        </h2>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-slate-500">
            No projects yet. Add at least 2–3 key projects; they’re extremely
            powerful in resumes.
          </p>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <div
                key={p.id}
                className="border border-slate-800 rounded-lg p-3 flex justify-between gap-4 bg-slate-900/40"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {p.project_name}
                  </div>
                  {p.description && (
                    <p className="text-xs text-slate-400">
                      {p.description}
                    </p>
                  )}
                  {p.impact && (
                    <p className="text-[11px] text-slate-400">
                      Impact: {p.impact}
                    </p>
                  )}
                  {p.technologies?.length > 0 && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      Tech: {p.technologies.join(", ")}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 text-[11px] mt-1">
                    {p.github_url && (
                      <a
                        href={p.github_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-sky-300"
                      >
                        GitHub
                      </a>
                    )}
                    {p.live_url && (
                      <a
                        href={p.live_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-sky-300"
                      >
                        Live demo
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-[11px]">
                  <button
                    onClick={() => startEdit(p)}
                    className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
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
