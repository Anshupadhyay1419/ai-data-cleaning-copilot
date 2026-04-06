import React, { useState } from "react";
import axios from "axios";
import { Send, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

const MODELS = [
  { value: "smart",    label: "Auto-Route (Smart Predict)" },
  { value: "all",      label: "Run All Models" },
  { value: "misinfo",  label: "Misinformation Detector" },
  { value: "fakenews", label: "Fake News Classifier" },
  { value: "emosen",   label: "Sentiment Analysis" },
  { value: "text",     label: "Text Analysis Only" },
];

function ConfBar({ value, color = "#7c3aed" }) {
  return (
    <div className="progress-bar" style={{ marginTop: "8px" }}>
      <div className="progress-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

function ResultSection({ title, children }) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ padding: "8px 14px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</p>
      </div>
      <div style={{ padding: "14px" }}>{children}</div>
    </div>
  );
}

function MisinfoResult({ data }) {
  const isInfo = data.label === "misinfo";
  return (
    <ResultSection title="Misinformation">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontWeight: 600, fontSize: "13px", color: isInfo ? "#f87171" : "#34d399" }}>
          {isInfo ? "⚠️ Misinformation" : "✅ Not Misinformation"}
        </span>
        <span style={{ fontSize: "11px", color: "#475569", fontFamily: "JetBrains Mono, monospace" }}>{data.confidence}%</span>
      </div>
      <ConfBar value={data.confidence} color={isInfo ? "#ef4444" : "#10b981"} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
        <div className="stat-card" style={{ padding: "10px" }}><span style={{ fontSize: "10px", color: "#475569" }}>Misinfo</span><span style={{ fontSize: "14px", fontWeight: 600, color: "#f87171" }}>{data.prob_misinfo}%</span></div>
        <div className="stat-card" style={{ padding: "10px" }}><span style={{ fontSize: "10px", color: "#475569" }}>Non-Misinfo</span><span style={{ fontSize: "14px", fontWeight: 600, color: "#34d399" }}>{data.prob_nonmisinfo}%</span></div>
      </div>
    </ResultSection>
  );
}

function FakeNewsResult({ data }) {
  const colors = { true:"#34d399", "mostly true":"#6ee7b7", mix:"#fbbf24", misleading:"#f59e0b", "mostly fake":"#f87171", fake:"#ef4444" };
  return (
    <ResultSection title="Fake News">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontWeight: 600, fontSize: "13px", textTransform: "capitalize", color: colors[data.label] || "#e2e8f0" }}>{data.emoji} {data.label}</span>
        <span style={{ fontSize: "11px", color: "#475569", fontFamily: "JetBrains Mono, monospace" }}>{data.confidence}%</span>
      </div>
      <ConfBar value={data.confidence} />
      {data.all_scores && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {Object.entries(data.all_scores).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#475569", width: "90px", textTransform: "capitalize" }}>{k}</span>
              <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${v}%`, background: "rgba(124,58,237,0.6)" }} /></div>
              <span style={{ fontSize: "10px", fontFamily: "JetBrains Mono, monospace", color: "#475569", width: "36px", textAlign: "right" }}>{v}%</span>
            </div>
          ))}
        </div>
      )}
    </ResultSection>
  );
}

function SentimentResult({ data }) {
  const colors = { positive: "#34d399", neutral: "#94a3b8", negative: "#f87171" };
  return (
    <ResultSection title="Sentiment">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontWeight: 600, fontSize: "13px", textTransform: "capitalize", color: colors[data.label?.toLowerCase()] || "#e2e8f0" }}>{data.emoji} {data.label}</span>
        <span style={{ fontSize: "11px", color: "#475569", fontFamily: "JetBrains Mono, monospace" }}>{data.confidence}%</span>
      </div>
      <ConfBar value={data.confidence} />
      {data.all_scores && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {Object.entries(data.all_scores).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#475569", width: "70px", textTransform: "capitalize" }}>{k}</span>
              <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${v}%`, background: "rgba(124,58,237,0.6)" }} /></div>
              <span style={{ fontSize: "10px", fontFamily: "JetBrains Mono, monospace", color: "#475569", width: "36px", textAlign: "right" }}>{v}%</span>
            </div>
          ))}
        </div>
      )}
    </ResultSection>
  );
}

function TextAnalysis({ data }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", cursor: "pointer", border: "none" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>Text Analysis</p>
        {open ? <ChevronUp style={{ width: "13px", height: "13px", color: "#475569" }} /> : <ChevronDown style={{ width: "13px", height: "13px", color: "#475569" }} />}
      </button>
      {open && (
        <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div className="stat-card" style={{ padding: "10px" }}><span style={{ fontSize: "10px", color: "#475569" }}>Words</span><span style={{ fontSize: "18px", fontWeight: 600, color: "#e2e8f0" }}>{data.text_stats?.word_count}</span></div>
            <div className="stat-card" style={{ padding: "10px" }}><span style={{ fontSize: "10px", color: "#475569" }}>Code-Mix</span><span style={{ fontSize: "18px", fontWeight: 600, color: "#a78bfa" }}>{(data.code_mix_ratio * 100).toFixed(0)}%</span></div>
          </div>
          {data.languages_detected?.length > 0 && (
            <div>
              <p style={{ fontSize: "10px", color: "#475569", marginBottom: "6px" }}>Languages</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>{data.languages_detected.map(l => <span key={l} className="badge-blue">{l}</span>)}</div>
            </div>
          )}
          {data.slang_analysis?.internet_slang?.length > 0 && (
            <div>
              <p style={{ fontSize: "10px", color: "#475569", marginBottom: "6px" }}>Slang</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>{data.slang_analysis.internet_slang.map(s => <span key={s} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "rgba(245,158,11,0.1)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}>{s}</span>)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SingleTextAnalysis({ apiUrl }) {
  const [text, setText] = useState("");
  const [model, setModel] = useState("smart");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const analyse = async () => {
    if (text.trim().length < 3) { setError("Please enter at least a few words."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await axios.post(`${apiUrl}/predict/${model}`, { text });
      setResult(res.data);
    } catch (e) { setError(e.response?.data?.detail || e.response?.data?.error || "Analysis failed."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", gap: "16px", height: "100%" }}>
      {/* Input */}
      <div className="card-flat" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontWeight: 500, color: "#e2e8f0", fontSize: "13px" }}>Text Input</p>
          <p style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>Supports English, Hinglish, and Code-Mix</p>
        </div>
        <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Enter text, tweet, or news headline here..."
            className="input" style={{ flex: 1, resize: "none", minHeight: "140px", fontFamily: "JetBrains Mono, monospace", lineHeight: 1.6 }} />
          <select value={model} onChange={e => setModel(e.target.value)} className="select">
            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {error && <p style={{ color: "#f87171", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}><AlertCircle style={{ width: "12px", height: "12px" }} />{error}</p>}
          <button className="btn-primary" onClick={analyse} disabled={loading || !text.trim()}>
            {loading ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <Send style={{ width: "14px", height: "14px" }} />}
            Analyse
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="card-flat" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontWeight: 500, color: "#e2e8f0", fontSize: "13px" }}>Results</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {!result && !loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "8px", color: "#1e293b" }}>
              <Send style={{ width: "32px", height: "32px" }} />
              <p style={{ fontSize: "13px" }}>Run an analysis to see results</p>
            </div>
          )}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "8px" }}>
              <Loader2 style={{ width: "24px", height: "24px", color: "#7c3aed", animation: "spin 1s linear infinite" }} />
              <p style={{ fontSize: "13px", color: "#475569" }}>Analysing...</p>
            </div>
          )}
          {result && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {result.misinfo  && <MisinfoResult data={result.misinfo} />}
              {result.fakenews && <FakeNewsResult data={result.fakenews} />}
              {result.label !== undefined && result.emoji !== undefined && !result.misinfo && <SentimentResult data={result} />}
              {result.text_analysis && <TextAnalysis data={result.text_analysis} />}
              {result.routed_to && <p style={{ fontSize: "11px", color: "#334155", textAlign: "center" }}>Routed to: <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#7c3aed" }}>{result.routed_to}</span></p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
