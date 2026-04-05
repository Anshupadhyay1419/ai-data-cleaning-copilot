import React, { useState } from 'react';
import axios from 'axios';
import { Send, Zap, MessageSquareQuote, ShieldAlert, AlertCircle, Smile } from 'lucide-react';
import { cn } from '../../utils';

export default function SingleTextAnalysis({ apiUrl }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyse = async () => {
    if (text.trim().length < 3) {
      setError("Please enter at least a few words.");
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Create a CSV blob from the text input and send to /categorical/process
      const csvContent = `text\n"${text.replace(/"/g, '""')}"`;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', blob, 'input.csv');

      const res = await axios.post(`${apiUrl}/process`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult({
        model_used: res.data.model_used,
        result: res.data.result,
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const renderConfidenceBar = (score, colorClass) => (
    <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 overflow-hidden border border-slate-200">
      <div className={`h-2.5 rounded-full ${colorClass}`} style={{ width: `${score}%` }}></div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Left Pane - Input */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center">
          <MessageSquareQuote className="w-5 h-5 text-indigo-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">Text Input</h2>
        </div>

        <div className="p-6 flex-1 flex flex-col gap-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text, tweet, or news headline here (supports Hinglish/Code-Mix)..."
            className="w-full flex-1 bg-white border border-slate-300 rounded-xl p-5 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none font-medium shadow-inner"
          />

        <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleAnalyse}
              disabled={loading || !text.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center"
            >
              {loading ? (
                <><Zap className="w-5 h-5 mr-2 fill-current animate-pulse" /> Analysing...</>
              ) : (
                <><Send className="w-5 h-5 mr-2" /> Analyse</>
              )}
            </button>
          </div>

          {error && <div className="text-rose-600 bg-rose-50 border border-rose-200 px-4 py-3 rounded-lg font-bold flex items-center shadow-sm"><AlertCircle className="w-5 h-5 mr-2"/>{error}</div>}
        </div>
      </div>

      {/* Right Pane - Results */}
      <div className="w-full md:w-[450px] lg:w-[500px] flex flex-col bg-slate-50 rounded-xl shadow-inner border border-slate-200 overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
           <h2 className="text-lg font-bold text-slate-800">Analysis Results</h2>
           {result && result.routed_to && (
             <span className="text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100">
               Routed: {result.routed_to}
             </span>
           )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
           {!result ? (
             <div className="h-full flex items-center justify-center text-slate-400 font-medium">
               Run an analysis to see results here.
             </div>
           ) : (
             <div className="animate-in slide-in-from-right-4 fade-in duration-500 space-y-6">
               <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                 <div className="flex items-center justify-between mb-4">
                   <h4 className="font-bold text-slate-700">Model Used</h4>
                   <span className="text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
                     {result.model_used}
                   </span>
                 </div>
                 <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                   <pre className="text-xs text-slate-700 overflow-auto whitespace-pre-wrap break-words font-mono">
                     {JSON.stringify(result.result, null, 2)}
                   </pre>
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
