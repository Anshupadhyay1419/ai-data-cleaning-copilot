import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Database, Globe } from "lucide-react";
import { cn } from "./utils";
import NormalModeApp from "./components/normal/NormalModeApp";
import CodeMixApp from "./components/codemix/CodeMixApp";

const MODES = [
  { id: "normal",  label: "Data Cleaning", icon: Database },
  { id: "codemix", label: "Code-Mix NLP",  icon: Globe },
];

export default function App() {
  const [mode, setMode] = useState("normal");
  return (
    <div style={{ minHeight: "100vh", background: "#07070f" }}>
      {/* Ambient glows */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-160px", left: "-160px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", top: "40%", right: "-120px", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: "-100px", left: "30%", width: "400px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(7,7,15,0.85)", backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 1.25rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px -4px rgba(139,92,246,0.6)" }}>
              <Sparkles style={{ width: "15px", height: "15px", color: "white" }} />
            </div>
            <div>
              <span style={{ fontWeight: 600, color: "white", fontSize: "14px" }}>AI Data Copilot</span>
              <span style={{ marginLeft: "8px", fontSize: "10px", color: "#334155", fontFamily: "JetBrains Mono, monospace" }}>v2.0</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "6px 14px", borderRadius: "8px",
                  fontSize: "13px", fontWeight: 500, cursor: "pointer",
                  transition: "all 0.2s", border: "none",
                  ...(mode === m.id ? {
                    background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(79,70,229,0.35))",
                    color: "white",
                    border: "1px solid rgba(139,92,246,0.35)",
                    boxShadow: "0 0 16px -4px rgba(139,92,246,0.4)"
                  } : {
                    background: "transparent", color: "#64748b"
                  })
                }}>
                <m.icon style={{ width: "14px", height: "14px" }} />
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1152px", margin: "0 auto", padding: "20px 20px", position: "relative", zIndex: 10 }}>
        <AnimatePresence mode="wait">
          {mode === "normal" ? (
            <motion.div key="normal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <NormalModeApp />
            </motion.div>
          ) : (
            <motion.div key="codemix" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <CodeMixApp />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
