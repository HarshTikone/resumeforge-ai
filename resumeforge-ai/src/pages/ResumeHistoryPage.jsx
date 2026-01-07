// src/pages/ResumeHistoryPage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuthStore } from "../store/useAuthStore";

function formatDateTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResumeHistoryPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadHistory() {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("generated_resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMessage("Failed to load history.");
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Resume history</h1>
        <p className="text-sm text-slate-400 mt-1">
          Every time you save a tailored resume, it shows up here with the
          target role and company so you can track where you applied.
        </p>
      </div>

      {message && (
        <div className="text-xs bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-200">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">
          No saved resumes yet. Generate one on the <span className="text-sky-300">New Resume</span> page and click
          “Save to history”.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div
              key={r.id}
              className="border border-slate-800 rounded-lg p-3 bg-slate-900/40 text-xs"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-medium text-slate-100">
                    {r.job_title || "Untitled role"}
                    {r.company_name && (
                      <span className="text-slate-300">
                        {" "}
                        @ {r.company_name}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Saved {formatDateTime(r.created_at)}
                  </div>
                </div>
                {r.ats_score != null && (
                  <div className="text-[11px] text-emerald-300">
                    ATS score (approx): {r.ats_score}/100
                  </div>
                )}
              </div>

              {r.keyword_matches?.length > 0 && (
                <div className="mt-2">
                  <div className="text-[11px] text-slate-400 mb-1">
                    Keywords used:
                  </div>
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    {r.keyword_matches.map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-1 rounded-full bg-slate-950 border border-slate-700 text-slate-200"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {r.job_description && (
                <div className="mt-2">
                  <div className="text-[11px] text-slate-400 mb-1">
                    Job description (snippet):
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-3 whitespace-pre-wrap">
                    {r.job_description.slice(0, 400)}
                    {r.job_description.length > 400 ? "…" : ""}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
