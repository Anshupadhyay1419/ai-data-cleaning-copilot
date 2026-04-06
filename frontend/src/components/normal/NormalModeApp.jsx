import React, { useState } from "react";
import { BarChart2, AlertTriangle, Wand2, Activity, Download, Database, RefreshCw } from "lucide-react";
import { cn } from "../../utils";
import { API_URL } from "../../config";
import Step1Upload from "./Step1Upload";
import Step2Profile from "./Step2Profile";
import Step3MissingValues from "./Step3MissingValues";
import Step4FlashFill from "./Step4FlashFill";
import Step5Anomalies from "./Step5Anomalies";
import Step6Export from "./Step6Export";

const TABS = [
  { id: "profile",   label: "Profile",   icon: BarChart2 },
  { id: "missing",   label: "Missing",   icon: AlertTriangle },
  { id: "transform", label: "Transform", icon: Wand2 },
  { id: "anomalies", label: "Anomalies", icon: Activity },
  { id: "export",    label: "Export",    icon: Download },
];

const TYPE_COLOR = { numeric:"badge-blue", categorical:"badge-green", text:"badge-slate", datetime:"badge-amber", email:"badge-blue", phone:"badge-green", url:"badge-slate", boolean:"badge-amber", id:"badge-slate" };

export default function NormalModeApp() {
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [colTypes, setColTypes] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");

  const onUpload = (data) => {
    setDatasetInfo({ filename: data.filename, rows: data.rows, columns: data.columns });
    setPreviewData(data.preview);
    setColTypes(data.col_types);
    setProfileData(null);
    setActiveTab("profile");
  };

  if (!datasetInfo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(79,70,229,0.2))", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Database style={{ width: "24px", height: "24px", color: "#a78bfa" }} />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 600, color: "white", marginBottom: "6px" }}>Upload a dataset</h2>
          <p style={{ fontSize: "13px", color: "#475569" }}>Start your data cleaning journey with a CSV file</p>
        </div>
        <Step1Upload apiUrl={API_URL} onSuccess={onUpload} />
      </div>
    );
  }

  const cols = colTypes ? Object.keys(colTypes) : [];

  return (
    <div style={{ display: "flex", gap: "16px", height: "calc(100vh - 116px)" }}>
      {/* LEFT — Table */}
      <div className="card-flat" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <Database style={{ width: "14px", height: "14px", color: "#7c3aed", flexShrink: 0 }} />
            <span style={{ fontWeight: 500, color: "#e2e8f0", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{datasetInfo.filename}</span>
            <span style={{ fontSize: "11px", color: "#475569", flexShrink: 0 }}>{datasetInfo.rows.toLocaleString()} rows</span>
          </div>
          <button className="btn-ghost" style={{ fontSize: "11px" }} onClick={() => { setDatasetInfo(null); setColTypes(null); setPreviewData([]); setProfileData(null); }}>
            <RefreshCw style={{ width: "12px", height: "12px" }} />New file
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {previewData.length > 0 ? (
            <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "rgba(7,7,15,0.95)", backdropFilter: "blur(8px)" }}>
                <tr>
                  {cols.map(c => (
                    <th key={c} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#64748b", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className={TYPE_COLOR[colTypes[c]?.type] || "badge-slate"} style={{ fontSize: "9px" }}>{colTypes[c]?.type?.slice(0,3)}</span>
                        {c}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {cols.map(c => (
                      <td key={c} style={{ padding: "8px 16px", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", color: (!row[c] && row[c] !== 0) ? "#334155" : "#94a3b8" }}>
                        {(!row[c] && row[c] !== 0) ? "null" : String(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#334155", fontSize: "13px" }}>No preview</div>
          )}
        </div>
      </div>

      {/* RIGHT — Tools */}
      <div className="card-flat" style={{ width: "320px", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2px", padding: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "6px 10px", borderRadius: "8px",
                fontSize: "11px", fontWeight: 500, cursor: "pointer",
                whiteSpace: "nowrap", transition: "all 0.15s", border: "none",
                ...(activeTab === t.id ? {
                  background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.3))",
                  color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)"
                } : {
                  background: "transparent", color: "#475569"
                })
              }}
              onMouseEnter={e => { if (activeTab !== t.id) e.currentTarget.style.color = "#94a3b8"; }}
              onMouseLeave={e => { if (activeTab !== t.id) e.currentTarget.style.color = "#475569"; }}>
              <t.icon style={{ width: "11px", height: "11px" }} />
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {activeTab === "profile"   && <Step2Profile apiUrl={API_URL} profileData={profileData} setProfileData={setProfileData} colTypes={colTypes} datasetInfo={datasetInfo} setDatasetInfo={setDatasetInfo} />}
          {activeTab === "missing"   && <Step3MissingValues apiUrl={API_URL} colTypes={colTypes} profileData={profileData} setProfileData={setProfileData} />}
          {activeTab === "transform" && <Step4FlashFill apiUrl={API_URL} colTypes={colTypes} setColTypes={setColTypes} />}
          {activeTab === "anomalies" && <Step5Anomalies apiUrl={API_URL} colTypes={colTypes} setDatasetInfo={setDatasetInfo} />}
          {activeTab === "export"    && <Step6Export apiUrl={API_URL} datasetInfo={datasetInfo} />}
        </div>
      </div>
    </div>
  );
}
