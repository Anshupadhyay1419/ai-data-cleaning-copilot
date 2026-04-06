import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { RefreshCw, WifiOff, Loader2, Wifi } from "lucide-react";
import { NLP_API_URL } from "../../config";
import SingleTextAnalysis from "./SingleTextAnalysis";
import BatchAnalysis from "./BatchAnalysis";

export default function CodeMixApp() {
  const [status, setStatus] = useState("checking");
  const [activeTab, setActiveTab] = useState("single");

  const checkStatus = useCallback(async (retries = 5) => {
    setStatus("checking");
    for (let i = 0; i < retries; i++) {
      try {
        const res = await axios.get(`${NLP_API_URL}/health`, { timeout: 20000 });
        if (res.status === 200) { setStatus("online"); return; }
      } catch (err) {
        if (err?.response?.status === 503 && i < retries - 1) {
          await new Promise(r => setTimeout(r, 6000));
          continue;
        }
      }
    }
    setStatus("offline");
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const statusStyle = {
    online:   { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)",  color: "#34d399" },
    checking: { bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)",  color: "#fbbf24" },
    offline:  { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)",   color: "#f87171" },
  }[status];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "calc(100vh - 116px)" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}>
          {[{ id: "single", label: "Single Text" }, { id: "batch", label: "Batch CSV" }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                padding: "6px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500,
                cursor: "pointer", transition: "all 0.15s", border: "none",
                ...(activeTab === t.id ? {
                  background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(79,70,229,0.35))",
                  color: "white", border: "1px solid rgba(139,92,246,0.3)",
                  boxShadow: "0 0 16px -4px rgba(139,92,246,0.4)"
                } : { background: "transparent", color: "#64748b" })
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button className="btn-ghost" style={{ fontSize: "12px" }} onClick={() => checkStatus()}>
            <RefreshCw style={{ width: "13px", height: "13px" }} />Refresh
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "9999px", fontSize: "12px", fontWeight: 500, background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color }}>
            {status === "online"   && <><span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", animation: "pulse 2s infinite" }} />Models Online</>}
            {status === "checking" && <><Loader2 style={{ width: "12px", height: "12px", animation: "spin 1s linear infinite" }} />Waking up...</>}
            {status === "offline"  && <><WifiOff style={{ width: "12px", height: "12px" }} />Offline</>}
          </div>
        </div>
      </div>

      {status === "checking" && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", borderRadius: "12px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", color: "#fbbf24", fontSize: "12px" }}>
          <Loader2 style={{ width: "13px", height: "13px", flexShrink: 0, animation: "spin 1s linear infinite" }} />
          HuggingFace Space is waking up — this may take 20–30 seconds on first load.
        </div>
      )}

      {status === "offline" && (
        <div style={{ padding: "14px 16px", borderRadius: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#f87171", marginBottom: "4px" }}>Models Offline</p>
          <p style={{ fontSize: "12px", color: "#ef4444" }}>
            The HuggingFace Space may be sleeping. Click Refresh or{" "}
            <a href="https://huggingface.co/spaces/anant-ai/backend" target="_blank" rel="noreferrer" style={{ color: "#a78bfa", textDecoration: "underline" }}>visit the Space</a> to wake it up.
          </p>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, opacity: status !== "online" ? 0.3 : 1, pointerEvents: status !== "online" ? "none" : "auto", transition: "opacity 0.2s" }}>
        {activeTab === "single" ? <SingleTextAnalysis apiUrl={NLP_API_URL} /> : <BatchAnalysis />}
      </div>
    </div>
  );
}
