import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { UploadCloud, AlertCircle, Loader2 } from "lucide-react";

export default function Step1Upload({ apiUrl, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onDrop = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) { setError("File exceeds 200MB limit."); return; }
    setLoading(true); setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await axios.post(`${apiUrl}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed.");
    } finally { setLoading(false); }
  }, [apiUrl, onSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "text/csv": [".csv"] }, multiple: false, disabled: loading,
  });

  return (
    <div style={{ width: "100%", maxWidth: "420px" }}>
      <div {...getRootProps()} style={{
        border: `2px dashed ${isDragActive ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: "16px", padding: "48px 32px", textAlign: "center", cursor: "pointer",
        background: isDragActive ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)",
        transition: "all 0.2s", opacity: loading ? 0.6 : 1,
      }}>
        <input {...getInputProps()} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: isDragActive ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {loading
              ? <Loader2 style={{ width: "22px", height: "22px", color: "#a78bfa", animation: "spin 1s linear infinite" }} />
              : <UploadCloud style={{ width: "22px", height: "22px", color: isDragActive ? "#a78bfa" : "#475569" }} />
            }
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 500, color: isDragActive ? "#c4b5fd" : "#94a3b8" }}>
              {loading ? "Uploading..." : isDragActive ? "Drop to upload" : "Drop your CSV here"}
            </p>
            <p style={{ fontSize: "12px", color: "#334155", marginTop: "4px" }}>or click to browse · max 200MB</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "#34d399" }}>.csv</span>
          </div>
        </div>
      </div>
      {error && (
        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: "13px" }}>
          <AlertCircle style={{ width: "14px", height: "14px", flexShrink: 0 }} />{error}
        </div>
      )}
    </div>
  );
}
