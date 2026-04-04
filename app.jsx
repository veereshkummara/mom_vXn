import { useState, useEffect, useRef } from "react";
import {
  Mic, Square, Play, Pause, Settings, Plus, FileAudio, Clock,
  ChevronRight, ChevronDown, Copy, Check, RotateCcw, X, Upload,
  Moon, Sun, Shield, Cpu, Zap, Globe, Search,
  Trash2, Calendar, Users, MessageSquare,
  Headphones, Speaker, ChevronUp, Sparkles, FileText,
  AlertCircle, CheckCircle2, Loader2, Hash, Brain, Eye, Edit3, Pencil
} from "lucide-react";

// ─── Config — Google Gemini API (100% FREE) ───
// Get your free key: https://aistudio.google.com/apikey
// No credit card. No payment. Just a Google account.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const AI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`;
const hasKey = API_KEY && API_KEY !== "your-gemini-key-here" && API_KEY.length > 10;

// ─── Constants ───
const AI_PROVIDERS = [
  { id: "gemini", name: "Gemini (Free)", icon: "🟢", desc: "Google Gemini 2.0 Flash — FREE tier", local: false },
  { id: "ollama", name: "Ollama (Local)", icon: "🦙", desc: "Run locally with Ollama", local: true },
  { id: "claude", name: "Claude (Anthropic)", icon: "🟣", desc: "Anthropic Claude API", local: false },
  { id: "groq", name: "Groq", icon: "⚡", desc: "Groq Cloud API", local: false },
  { id: "custom", name: "Custom OpenAI", icon: "🔧", desc: "OpenAI-compatible endpoint", local: false },
];
const WHISPER_MODELS = [
  { id: "tiny", name: "Tiny", size: "75 MB", speed: "~32x", accuracy: "Low" },
  { id: "base", name: "Base", size: "142 MB", speed: "~16x", accuracy: "Medium" },
  { id: "small", name: "Small", size: "466 MB", speed: "~6x", accuracy: "Good" },
  { id: "medium", name: "Medium", size: "1.5 GB", speed: "~2x", accuracy: "High" },
  { id: "large-v3", name: "Large V3", size: "2.9 GB", speed: "~1x", accuracy: "Best" },
];
const OLLAMA_MODELS = ["llama3.2:3b", "llama3.1:8b", "mistral:7b", "gemma2:9b", "phi3:mini", "qwen2:7b"];

const SUMMARY_TEMPLATES = {
  default: {
    name: "Default Summary", desc: "Sections, decisions, and action items",
    prompt: `You are an expert meeting analyst. Analyze the following meeting transcript and produce a structured JSON summary. Be specific, accurate, and reference actual content from the transcript. Do NOT invent or fabricate any information. Only summarize what was actually said.\n\nReturn ONLY valid JSON with exactly this structure (no markdown, no backticks, no preamble):\n{"sections":"A thorough 2-4 sentence summary of the main topics discussed, referencing specific subjects and participants","decisions":"Specific decisions that were made during the meeting, citing who agreed to what","actions":"Concrete action items with responsible persons and deadlines if mentioned"}`,
  },
  standup: {
    name: "Standup Notes", desc: "Yesterday, today, blockers format",
    prompt: `You are an expert meeting analyst. Analyze the following standup/sync meeting transcript in standup format. Be specific, only reference what was actually discussed. Do NOT invent information.\n\nReturn ONLY valid JSON (no markdown, no backticks, no preamble):\n{"sections":"What was accomplished/discussed — reference specific updates each person shared","decisions":"What the team agreed to work on next — specific tasks and priorities mentioned","actions":"Blockers identified and who is responsible for resolving them, with specifics"}`,
  },
  technical: {
    name: "Technical Review", desc: "Architecture decisions, code changes, follow-ups",
    prompt: `You are an expert technical meeting analyst. Analyze the following technical meeting transcript. Be precise about technical details mentioned. Do NOT invent information.\n\nReturn ONLY valid JSON (no markdown, no backticks, no preamble):\n{"sections":"Technical topics and architecture discussions covered, referencing specific technologies or components mentioned","decisions":"Technical decisions made — what approaches were chosen and why","actions":"Technical follow-ups — who needs to implement what, code reviews needed, with specifics"}`,
  },
  sales: {
    name: "Sales Call", desc: "Pain points, objections, next steps",
    prompt: `You are an expert sales call analyst. Analyze the following sales/client call transcript. Be specific about client needs and concerns. Do NOT invent information.\n\nReturn ONLY valid JSON (no markdown, no backticks, no preamble):\n{"sections":"Client pain points and needs expressed during the call, with specific references","decisions":"Key objections raised, agreements reached on pricing/scope/timeline","actions":"Next steps — follow-up meetings, proposals to send, demos to schedule, with responsible persons"}`,
  },
};

const SAMPLE_MEETINGS = [
  {
    id: "m1", title: "Product Strategy Meeting", date: "2026-04-01T14:30:00", duration: 2700, status: "completed", source: "recording",
    transcript: [
      { time: "00:00:12", speaker: "Sarah", text: "Let's kick off the product strategy session. We have some exciting updates to discuss about our Q2 roadmap." },
      { time: "00:00:28", speaker: "Mike", text: "I've prepared the Q2 roadmap slides. The data shows our user engagement is up 34% since we launched the new onboarding flow." },
      { time: "00:00:45", speaker: "Sarah", text: "That's great to hear. Let's start with the feature prioritization for the next sprint. We have four major items on the board." },
      { time: "00:01:15", speaker: "Mike", text: "Our top priorities are the real-time collaboration feature, the new dashboard redesign, the API v2 migration, and improving our search infrastructure." },
      { time: "00:01:42", speaker: "Lisa", text: "I think we should also consider the mobile app improvements. We've received over 200 support tickets about the iOS performance issues last month alone." },
      { time: "00:02:10", speaker: "Sarah", text: "Good point Lisa. That's significant. Let's add mobile to the discussion. Mike, can you walk us through the estimated timelines for each?" },
      { time: "00:02:35", speaker: "Mike", text: "Sure. The collaboration feature is estimated at 3 weeks with 2 engineers. Dashboard redesign needs 2 weeks with the design team. API migration is our biggest effort at 4 weeks." },
      { time: "00:03:01", speaker: "Lisa", text: "For mobile, we need about 2 weeks for the critical iOS performance fixes and another 3 weeks for the new features like offline mode and push notifications." },
      { time: "00:03:28", speaker: "Sarah", text: "Given the 200 support tickets, I think we should prioritize the mobile fixes alongside the collaboration feature. We can't afford to lose iOS users." },
      { time: "00:03:55", speaker: "Mike", text: "I agree. I'll restructure the sprint to front-load mobile fixes and collaboration. Dashboard and API can move to Sprint 2." },
      { time: "00:04:12", speaker: "Lisa", text: "I'll have the detailed iOS bug triage ready by Wednesday so we can plan the fix sprint properly." },
      { time: "00:04:30", speaker: "Sarah", text: "Perfect. Let's reconvene Friday to review the updated sprint plan. Mike, please update the stakeholder deck by then too." },
    ], summary: null
  },
  {
    id: "m2", title: "Q1 Planning Session", date: "2026-03-31T10:00:00", duration: 4500, status: "completed", source: "recording",
    transcript: [
      { time: "00:00:05", speaker: "Alex", text: "Welcome everyone to our Q1 planning session. Let's review how Q4 went and set our goals for this quarter." },
      { time: "00:00:22", speaker: "Jordan", text: "I have the metrics from last quarter ready. Revenue hit $4.2M, up 23% year over year. Our best quarter yet." },
      { time: "00:00:48", speaker: "Alex", text: "That's excellent growth. What about user acquisition numbers? I know we had some challenges there." },
      { time: "00:01:05", speaker: "Jordan", text: "We added 15,000 new users, which was below our target of 18,000. The gap was about 17% below goal." },
      { time: "00:01:30", speaker: "Casey", text: "The shortfall was mainly due to the delayed marketing campaign. We launched in February instead of January, losing 3 weeks of our peak season." },
      { time: "00:01:55", speaker: "Alex", text: "That's a lesson learned. For Q1, I want to increase the marketing budget by 15% and make sure campaigns launch on schedule." },
      { time: "00:02:20", speaker: "Jordan", text: "I'd also recommend we launch a referral program. Our NPS is 72, which means users love us — we should leverage that." },
      { time: "00:02:45", speaker: "Casey", text: "I can have the referral program designed and ready to launch by end of January. We'll offer $20 credit per referral." },
      { time: "00:03:10", speaker: "Alex", text: "Great. Jordan, get me the detailed Q4 report by next Monday. Casey, finalize the Q1 marketing calendar this week." },
    ], summary: null
  },
  {
    id: "m3", title: "Team Sync", date: "2026-03-30T15:00:00", duration: 1800, status: "completed", source: "recording",
    transcript: [
      { time: "00:00:03", speaker: "Dev1", text: "Quick sync everyone. Let's go around — any blockers or updates?" },
      { time: "00:00:12", speaker: "Dev2", text: "I'm blocked on the authentication module. I need the OAuth API keys from the infra team to test the SSO integration." },
      { time: "00:00:25", speaker: "Dev3", text: "I'll get those keys to you by end of day today. I just finished rotating them this morning." },
      { time: "00:00:38", speaker: "Dev1", text: "Good. What about the CI pipeline issue we had yesterday?" },
      { time: "00:00:50", speaker: "Dev3", text: "Fixed. The CI pipeline is green now. The issue was a stale Docker image cache causing test failures. I added a cache-bust step." },
      { time: "00:01:05", speaker: "Dev2", text: "Nice. Once I get the keys, I estimate the SSO integration will take 2 more days to complete and test." },
      { time: "00:01:18", speaker: "Dev1", text: "Perfect. Let's target Thursday for the SSO PR review then. Everyone keep pushing on the sprint goals." },
    ], summary: null
  },
];

// ─── Utilities ───
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const fmtDur = (s) => s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min` : `${Math.floor(s / 60)} min`;
const fmtDate = (d) => {
  const dt = new Date(d), now = new Date(), diff = Math.floor((now - dt) / 86400000);
  const time = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Yesterday, ${time}`;
  return dt.toLocaleDateString([], { month: "short", day: "numeric" }) + `, ${time}`;
};

// ─── Transcript Parser ───
const parseTranscriptFile = (content, fileName) => {
  const ext = fileName.split(".").pop().toLowerCase();
  const lines = content.split("\n").filter((l) => l.trim());
  const segments = [];
  if (ext === "srt") {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("-->")) {
        const tm = lines[i].match(/(\d{2}:\d{2}:\d{2})/); const time = tm ? tm[1] : "00:00:00"; const tl = [];
        let j = i + 1; while (j < lines.length && !lines[j].match(/^\d+$/) && !lines[j].includes("-->")) { if (lines[j].trim()) tl.push(lines[j].trim()); j++; }
        if (tl.length > 0) { const sp = tl[0].match(/^([A-Za-z\s]+?):\s*(.*)/); segments.push(sp ? { time: time.substring(0, 7), speaker: sp[1].trim(), text: sp[2] + (tl.length > 1 ? " " + tl.slice(1).join(" ") : "") } : { time: time.substring(0, 7), speaker: "Speaker", text: tl.join(" ") }); }
      }
    }
  } else if (ext === "vtt") {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("-->")) {
        const tm = lines[i].match(/(\d{2}:\d{2}[:.]\d{2})/); const time = tm ? tm[1].replace(".", ":").substring(0, 7) : "00:00:00"; const tl = [];
        let j = i + 1; while (j < lines.length && lines[j].trim() && !lines[j].includes("-->")) { tl.push(lines[j].trim()); j++; }
        if (tl.length > 0) { const vt = tl[0].match(/^<v\s+([^>]+)>(.*)/); const ct = tl[0].match(/^([A-Za-z\s]+?):\s*(.*)/);
          if (vt) segments.push({ time, speaker: vt[1].trim(), text: vt[2] }); else if (ct) segments.push({ time, speaker: ct[1].trim(), text: ct[2] }); else segments.push({ time, speaker: "Speaker", text: tl.join(" ") }); }
      }
    }
  } else if (ext === "json") {
    try { const data = JSON.parse(content); const arr = Array.isArray(data) ? data : data.segments || data.transcript || data.results || [];
      arr.forEach((item, idx) => segments.push({ time: item.time || item.timestamp || fmt(idx * 15), speaker: item.speaker || item.name || "Speaker", text: item.text || item.content || "" }));
    } catch { segments.push({ time: "00:00", speaker: "Speaker", text: content.substring(0, 500) }); }
  } else {
    lines.forEach((line, idx) => {
      const ts = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(.*)/); const sp = line.match(/^([A-Za-z0-9\s._-]+?):\s*(.*)/);
      if (ts) { const inner = ts[2].match(/^([A-Za-z0-9\s._-]+?):\s*(.*)/); segments.push(inner ? { time: ts[1], speaker: inner[1].trim(), text: inner[2] } : { time: ts[1], speaker: "Speaker", text: ts[2] }); }
      else if (sp) segments.push({ time: fmt(idx * 10), speaker: sp[1].trim(), text: sp[2] });
      else if (line.trim().length > 2) segments.push({ time: fmt(idx * 10), speaker: "Speaker", text: line.trim() });
    });
  }
  return segments.length > 0 ? segments : [{ time: "00:00", speaker: "Speaker", text: content.substring(0, 1000) }];
};

// ──────────────────────────────────────────────────────────────
//  REAL AI SUMMARIZATION — Google Gemini API (100% FREE)
//  No proxy needed. No credit card. No payment. Ever.
//  Get key: https://aistudio.google.com/apikey
// ──────────────────────────────────────────────────────────────
const summarizeWithAI = async (transcript, templateId) => {
  const template = SUMMARY_TEMPLATES[templateId] || SUMMARY_TEMPLATES.default;
  const text = transcript.map((t) => `[${t.time}] ${t.speaker}: ${t.text}`).join("\n");
  if (!hasKey) {
    throw new Error(
      "Google Gemini API key not found.\n\n" +
      "It's 100% FREE — no credit card needed:\n\n" +
      "1. Go to: https://aistudio.google.com/apikey\n" +
      "2. Sign in with any Google account\n" +
      "3. Click 'Create API key'\n" +
      "4. Paste into .env file:\n" +
      "   VITE_GEMINI_API_KEY=AIzaSy...\n" +
      "5. Restart: npm run dev"
    );
  }
  const res = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: `${template.prompt}\n\nMeeting transcript:\n\n${text}` }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 1024 } }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    if (res.status === 400) throw new Error("Invalid API key.\nGet a free one: https://aistudio.google.com/apikey");
    if (res.status === 429) throw new Error("Rate limited (free tier: ~15 req/min).\nWait a moment and retry.");
    if (res.status === 403) throw new Error("Key lacks Gemini access.\nCreate a new one: https://aistudio.google.com/apikey");
    throw new Error(`Gemini error ${res.status}: ${err.substring(0, 200)}`);
  }
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    const p = JSON.parse(clean);
    return { sections: p.sections || "—", decisions: p.decisions || "—", actions: p.actions || "—" };
  } catch {
    if (raw.length > 50) return { sections: raw.substring(0, 500), decisions: "Could not parse structured output.", actions: "Try regenerating with a different template." };
    throw new Error("Gemini returned an unparseable response. Try again.");
  }
};

// ─── LocalStorage ───
const SKEY = { meetings: "meetily_meetings", settings: "meetily_settings", sidebar: "meetily_sidebar", last: "meetily_last_active" };
const load = (k, fb) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : fb; } catch { return fb; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const getInitMeetings = () => { const s = load(SKEY.meetings, null); if (s?.length > 0) return s; save(SKEY.meetings, SAMPLE_MEETINGS); return SAMPLE_MEETINGS; };
const DEF_SETTINGS = { aiProvider: "gemini", ollamaModel: "llama3.2:3b", whisperModel: "small", language: "en", micDevice: "default", systemDevice: "default", theme: "dark", autoSave: true, gpu: true };

// ─── Modal ───
const Modal = ({ open, onClose, children, title, wide }) => {
  if (!open) return null;
  return (<div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div onClick={(e) => e.stopPropagation()} className={`relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl ${wide ? "w-full max-w-3xl" : "w-full max-w-lg"} max-h-[90vh] overflow-hidden flex flex-col`}>
      <div className="flex items-center justify-between p-5 border-b border-gray-700/50"><h2 className="text-lg font-semibold text-white">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"><X size={18} /></button></div>
      <div className="overflow-y-auto flex-1 p-5">{children}</div>
    </div></div>);
};

// ─── Settings Modal ───
const SettingsModal = ({ open, onClose, settings, setSettings }) => {
  const [tab, setTab] = useState("ai");
  const tabs = [{ id: "ai", label: "AI Provider", icon: Brain }, { id: "transcription", label: "Transcription", icon: Mic }, { id: "audio", label: "Audio", icon: Headphones }, { id: "general", label: "General", icon: Settings }];
  return (<Modal open={open} onClose={onClose} title="Settings" wide><div className="flex gap-5 min-h-[420px]">
    <div className="w-44 shrink-0 space-y-1">{tabs.map((t) => (
      <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"}`}><t.icon size={16} /> {t.label}</button>))}</div>
    <div className="flex-1 min-w-0">
      {tab === "ai" && (<div className="space-y-4"><p className="text-sm text-gray-400 mb-3">AI provider for meeting summaries</p>
        <div className={`p-3 rounded-xl border ${hasKey ? "bg-green-500/10 border-green-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
          <p className={`text-xs flex items-center gap-1.5 font-medium ${hasKey ? "text-green-400" : "text-amber-400"}`}>
            {hasKey ? <><CheckCircle2 size={12} /> Gemini API key configured (FREE tier — no cost)</> : <><AlertCircle size={12} /> Free key needed → <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="underline hover:text-amber-300">aistudio.google.com/apikey</a></>}</p></div>
        <div className="grid grid-cols-1 gap-2">{AI_PROVIDERS.map((p) => (
          <button key={p.id} onClick={() => setSettings((s) => ({ ...s, aiProvider: p.id }))}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${settings.aiProvider === p.id ? "border-indigo-500 bg-indigo-500/10" : "border-gray-700 hover:border-gray-600 bg-gray-800/50"}`}>
            <span className="text-xl">{p.icon}</span><div className="flex-1"><div className="text-sm font-medium text-white flex items-center gap-2">{p.name}
              {p.local && <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full font-medium">LOCAL</span>}
              {p.id === "gemini" && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">FREE</span>}
            </div><div className="text-xs text-gray-500">{p.desc}</div></div>
            {settings.aiProvider === p.id && <CheckCircle2 size={16} className="text-indigo-400" />}</button>))}</div>
        {settings.aiProvider === "ollama" && (<div className="mt-4 space-y-3"><label className="text-xs text-gray-400 font-medium">Ollama Model</label>
          <div className="grid grid-cols-2 gap-2">{OLLAMA_MODELS.map((m) => (<button key={m} onClick={() => setSettings((s) => ({ ...s, ollamaModel: m }))}
            className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all ${settings.ollamaModel === m ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-gray-700 text-gray-400 hover:border-gray-600"}`}>{m}</button>))}</div></div>)}
      </div>)}
      {tab === "transcription" && (<div className="space-y-4"><p className="text-sm text-gray-400 mb-3">Transcription model (processed locally)</p>
        <div className="space-y-2">{WHISPER_MODELS.map((m) => (<button key={m.id} onClick={() => setSettings((s) => ({ ...s, whisperModel: m.id }))}
          className={`w-full flex items-center gap-4 p-3 rounded-xl border text-left transition-all ${settings.whisperModel === m.id ? "border-indigo-500 bg-indigo-500/10" : "border-gray-700 hover:border-gray-600 bg-gray-800/50"}`}>
          <div className="flex-1"><div className="text-sm font-medium text-white">{m.name}</div><div className="text-xs text-gray-500">{m.size} · Speed: {m.speed}</div></div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${m.accuracy === "Best" ? "bg-green-500/20 text-green-400" : m.accuracy === "High" ? "bg-blue-500/20 text-blue-400" : m.accuracy === "Good" ? "bg-yellow-500/20 text-yellow-400" : "bg-gray-700 text-gray-400"}`}>{m.accuracy}</span>
          {settings.whisperModel === m.id && <CheckCircle2 size={16} className="text-indigo-400" />}</button>))}</div>
        <div className="mt-4"><label className="text-xs text-gray-400 font-medium block mb-1.5">Language</label>
          <select value={settings.language || "en"} onChange={(e) => setSettings((s) => ({ ...s, language: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
            <option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="ja">Japanese</option><option value="zh">Chinese</option><option value="hi">Hindi</option><option value="ta">Tamil</option><option value="auto">Auto Detect</option>
          </select></div></div>)}
      {tab === "audio" && (<div className="space-y-4"><p className="text-sm text-gray-400 mb-3">Configure audio input devices</p>
        <div><label className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mb-2"><Mic size={13} /> Microphone</label>
          <select value={settings.micDevice || "default"} onChange={(e) => setSettings((s) => ({ ...s, micDevice: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
            <option value="default">Default - Built-in Microphone</option><option value="airpods">AirPods Pro</option><option value="usb">USB Condenser Microphone</option></select></div>
        <div><label className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mb-2"><Speaker size={13} /> System Audio</label>
          <select value={settings.systemDevice || "default"} onChange={(e) => setSettings((s) => ({ ...s, systemDevice: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
            <option value="default">Default - System Audio</option><option value="blackhole">BlackHole 2ch</option><option value="virtual">Virtual Audio Cable</option></select></div>
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"><p className="text-xs text-yellow-400 flex items-center gap-1.5"><AlertCircle size={13} /> System audio capture may require a virtual audio device.</p></div></div>)}
      {tab === "general" && (<div className="space-y-4">
        <div><label className="text-xs text-gray-400 font-medium block mb-2">Theme</label>
          <div className="flex gap-2">{[{ id: "dark", name: "Dark", icon: Moon }, { id: "light", name: "Light", icon: Sun }].map((t) => (
            <button key={t.id} onClick={() => setSettings((s) => ({ ...s, theme: t.id }))} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${settings.theme === t.id ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-gray-700 text-gray-400 hover:border-gray-600"}`}><t.icon size={15} /> {t.name}</button>))}</div></div>
        <div className="p-3 bg-gray-800 rounded-xl border border-gray-700 space-y-3">
          {[{ label: "Auto-save recordings", key: "autoSave" }, { label: "GPU Acceleration", key: "gpu" }].map(({ label, key }) => (
            <div key={key} className="flex items-center justify-between"><span className="text-sm text-gray-300">{label}</span>
              <button onClick={() => setSettings((s) => ({ ...s, [key]: !s[key] }))} className={`w-10 h-5 rounded-full transition-colors relative ${settings[key] ? "bg-indigo-500" : "bg-gray-600"}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${settings[key] ? "left-5" : "left-0.5"}`} /></button></div>))}</div>
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-1"><Shield size={14} /> Privacy First</div>
          <p className="text-xs text-green-400/70">All data stored in your browser's localStorage. Nothing leaves your device.</p></div>
        <div className="p-3 bg-gray-800 rounded-xl border border-gray-700"><div className="flex items-center justify-between">
          <div><p className="text-sm text-gray-300">Clear All Local Data</p><p className="text-xs text-gray-500 mt-0.5">Remove all meetings, transcripts, and settings</p></div>
          <button onClick={() => { if (window.confirm("Delete all meetings and reset everything?")) { Object.values(SKEY).forEach((k) => localStorage.removeItem(k)); window.location.reload(); }}}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-colors">Clear Data</button></div></div>
      </div>)}
    </div></div></Modal>);
};

// ─── Import Audio Modal ───
const ImportModal = ({ open, onClose, onImport }) => {
  const [file, setFile] = useState(null); const [dragOver, setDragOver] = useState(false);
  return (<Modal open={open} onClose={onClose} title="Import Audio File"><div className="space-y-4">
    <p className="text-sm text-gray-400">Import an audio file to create a new meeting with transcripts</p>
    <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${dragOver ? "border-indigo-500 bg-indigo-500/10" : file ? "border-green-500/50 bg-green-500/5" : "border-gray-700 hover:border-gray-600"}`}
      onClick={() => { const i = document.createElement("input"); i.type = "file"; i.accept = "audio/*,video/*"; i.onchange = (e) => { if (e.target.files[0]) setFile(e.target.files[0]); }; i.click(); }}>
      {file ? (<div className="space-y-2"><CheckCircle2 size={40} className="mx-auto text-green-400" /><p className="text-sm text-white font-medium">{file.name}</p><p className="text-xs text-gray-500">{(file.size / 1048576).toFixed(1)} MB</p></div>)
        : (<div className="space-y-3"><Upload size={40} className="mx-auto text-gray-500" /><p className="text-sm text-gray-300">Drop audio file here or click to browse</p><p className="text-xs text-gray-600">MP4, M4A, WAV, MP3, FLAC, OGG, AAC</p></div>)}
    </div>
    <div className="flex gap-3 justify-end">
      <button onClick={() => { setFile(null); onClose(); }} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
      <button onClick={() => { if (file) { onImport(file.name); setFile(null); onClose(); } }} disabled={!file} className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${file ? "bg-indigo-500 hover:bg-indigo-600 text-white" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}>Import & Transcribe</button>
    </div></div></Modal>);
};

// ─── Summary Config Modal ───
const SummaryModal = ({ open, onClose, settings, onGenerate }) => {
  const [template, setTemplate] = useState("default");
  return (<Modal open={open} onClose={onClose} title="Generate AI Summary"><div className="space-y-4">
    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl border border-gray-700">
      <span className="text-lg">🟢</span><div><div className="text-sm font-medium text-white">Gemini 2.0 Flash</div><div className="text-xs text-gray-500">Google AI — Free tier</div></div>
      <span className="ml-auto text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">FREE</span></div>
    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
      <p className="text-xs text-indigo-300 flex items-center gap-1.5"><Sparkles size={12} /> Real-time analysis by Google Gemini — your actual transcript will be summarized.</p></div>
    <div><label className="text-xs text-gray-400 font-medium block mb-2">Summary Template</label>
      <div className="space-y-2">{Object.entries(SUMMARY_TEMPLATES).map(([id, t]) => (
        <button key={id} onClick={() => setTemplate(id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${template === id ? "border-indigo-500 bg-indigo-500/10" : "border-gray-700 hover:border-gray-600 bg-gray-800/50"}`}>
          <div className="flex-1"><div className="text-sm font-medium text-white">{t.name}</div><div className="text-xs text-gray-500">{t.desc}</div></div>
          {template === id && <CheckCircle2 size={16} className="text-indigo-400" />}</button>))}</div></div>
    <div className="flex gap-3 justify-end pt-2">
      <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
      <button onClick={() => { onGenerate(template); onClose(); }} className="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-all flex items-center gap-2"><Sparkles size={14} /> Generate Summary</button>
    </div></div></Modal>);
};

// ─── Transcript Upload Modal ───
const TranscriptUploadModal = ({ open, onClose, onUpload }) => {
  const [file, setFile] = useState(null); const [dragOver, setDragOver] = useState(false); const [segs, setSegs] = useState([]); const [title, setTitle] = useState(""); const [showP, setShowP] = useState(false); const [autoSum, setAutoSum] = useState(true); const [parsing, setParsing] = useState(false);
  const handleFile = (f) => { setFile(f); setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ")); setParsing(true);
    const r = new FileReader(); r.onload = (e) => { setSegs(parseTranscriptFile(e.target.result, f.name)); setParsing(false); }; r.readAsText(f); };
  const reset = () => { setFile(null); setSegs([]); setTitle(""); setShowP(false); setAutoSum(true); };
  return (<Modal open={open} onClose={() => { reset(); onClose(); }} title="Upload Transcript for Summarization" wide><div className="space-y-4">
    <div className="flex items-start gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
      <FileText size={18} className="text-indigo-400 mt-0.5 shrink-0" />
      <div><p className="text-sm text-indigo-300 font-medium">Upload an existing transcript file</p>
        <p className="text-xs text-indigo-400/60 mt-0.5">Upload from Zoom, Teams, Otter, or any source — Gemini AI will analyze and summarize it for free.</p></div></div>
    {!file ? (
      <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${dragOver ? "border-indigo-500 bg-indigo-500/10" : "border-gray-700 hover:border-gray-600"}`}
        onClick={() => { const i = document.createElement("input"); i.type = "file"; i.accept = ".txt,.srt,.vtt,.md,.json,.csv,.log"; i.onchange = (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }; i.click(); }}>
        <div className="space-y-3"><div className="w-14 h-14 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto"><FileText size={24} className="text-gray-500" /></div>
          <p className="text-sm text-gray-300">Drop transcript file or click to browse</p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">{["SRT","VTT","TXT","JSON","MD"].map((e) => (<span key={e} className="text-[10px] px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-md text-gray-500 font-mono">.{e.toLowerCase()}</span>))}</div></div></div>
    ) : (<div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl border border-gray-700">
        <div className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0"><CheckCircle2 size={18} className="text-green-400" /></div>
        <div className="flex-1 min-w-0"><p className="text-sm text-white font-medium truncate">{file.name}</p><p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB · {segs.length} segments</p></div>
        <button onClick={reset} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-500 hover:text-red-400 transition-colors"><X size={15} /></button></div>
      <div><label className="text-xs text-gray-400 font-medium block mb-1.5">Meeting Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter meeting title..." className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" /></div>
      <div><button onClick={() => setShowP(!showP)} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white font-medium transition-colors mb-2"><Eye size={13} /> {showP ? "Hide" : "Show"} Preview {showP ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button>
        {showP && (<div className="max-h-48 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800/50">
          {parsing ? (<div className="flex items-center justify-center gap-2 py-8 text-gray-500"><Loader2 size={16} className="animate-spin" /> Parsing...</div>)
            : (<div className="divide-y divide-gray-800">{segs.slice(0, 15).map((s, i) => (<div key={i} className="flex gap-3 px-3 py-2 text-xs"><span className="text-gray-600 font-mono w-14 shrink-0">{s.time}</span><span className="text-indigo-400 font-semibold w-20 shrink-0 truncate">{s.speaker}</span><span className="text-gray-300 flex-1">{s.text}</span></div>))}
              {segs.length > 15 && <div className="px-3 py-2 text-xs text-gray-600 text-center">... and {segs.length - 15} more</div>}</div>)}</div>)}</div>
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl border border-gray-700">
        <div className="flex items-center gap-2.5"><Sparkles size={15} className="text-indigo-400" /><div><p className="text-sm text-gray-200 font-medium">Auto-generate AI summary</p><p className="text-xs text-gray-500 mt-0.5">Real-time analysis via Gemini (Free)</p></div></div>
        <button onClick={() => setAutoSum(!autoSum)} className={`w-10 h-5 rounded-full transition-colors relative ${autoSum ? "bg-indigo-500" : "bg-gray-600"}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${autoSum ? "left-5" : "left-0.5"}`} /></button></div>
      <div className="grid grid-cols-3 gap-3">{[{ label: "Segments", value: segs.length, icon: Hash }, { label: "Speakers", value: [...new Set(segs.map((s) => s.speaker))].length, icon: Users }, { label: "Words", value: segs.reduce((a, s) => a + s.text.split(" ").length, 0).toLocaleString(), icon: FileText }].map(({ label, value, icon: I }) => (
        <div key={label} className="p-2.5 bg-gray-800/50 rounded-xl border border-gray-700/50 text-center"><I size={14} className="mx-auto text-gray-500 mb-1" /><p className="text-base font-semibold text-white">{value}</p><p className="text-[10px] text-gray-500">{label}</p></div>))}</div>
    </div>)}
    <div className="flex gap-3 justify-end pt-2 border-t border-gray-800">
      <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
      <button onClick={() => { if (file && segs.length > 0) { onUpload({ title: title || file.name, segments: segs, autoSummarize: autoSum }); reset(); onClose(); } }} disabled={!file || segs.length === 0}
        className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${file && segs.length > 0 ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}>
        {autoSum ? <><Sparkles size={14} /> Upload & Summarize</> : <><Upload size={14} /> Upload Transcript</>}</button>
    </div></div></Modal>);
};

// ─── Main App ───
export default function App() {
  const [meetings, setMeetings] = useState(getInitMeetings);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState([]);
  const [activeTab, setActiveTab] = useState("transcript");
  const [copied, setCopied] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => load(SKEY.sidebar, false));
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [transcriptUploadOpen, setTranscriptUploadOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [genProgress, setGenProgress] = useState("");
  const [liveLevel, setLiveLevel] = useState(0);
  const [settings, setSettings] = useState(() => load(SKEY.settings, DEF_SETTINGS));
  // ─── Rename state ───
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef(null);
  const timerRef = useRef(null);
  const levelRef = useRef(null);

  // ─── Persist ───
  useEffect(() => { save(SKEY.meetings, meetings); }, [meetings]);
  useEffect(() => { save(SKEY.settings, settings); }, [settings]);
  useEffect(() => { save(SKEY.sidebar, sidebarCollapsed); }, [sidebarCollapsed]);
  useEffect(() => { if (activeMeeting) save(SKEY.last, activeMeeting.id); }, [activeMeeting]);
  useEffect(() => { const id = load(SKEY.last, null); if (id) { const f = meetings.find((m) => m.id === id); if (f) { setActiveMeeting(f); setActiveTab("transcript"); } } }, []);

  // ─── Recording ───
  useEffect(() => {
    if (recording && !paused) { timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000); levelRef.current = setInterval(() => setLiveLevel(Math.random() * 0.8 + 0.1), 120); }
    else { clearInterval(timerRef.current); clearInterval(levelRef.current); if (!recording) setLiveLevel(0); }
    return () => { clearInterval(timerRef.current); clearInterval(levelRef.current); };
  }, [recording, paused]);
  useEffect(() => {
    if (!recording || paused) return;
    const phrases = ["Let me share my thoughts on this topic.", "I think we should prioritize the user experience.", "The metrics from last quarter show promising growth.", "We need to address the technical debt before the release.", "Can everyone review the design mockups by Friday?", "The customer feedback has been overwhelmingly positive."];
    const iv = setInterval(() => { setLiveTranscript((prev) => [...prev, { time: fmt(elapsed), speaker: ["Sarah", "Mike", "Lisa", "Alex"][Math.floor(Math.random() * 4)], text: phrases[Math.floor(Math.random() * phrases.length)] }]); }, 4000 + Math.random() * 3000);
    return () => clearInterval(iv);
  }, [recording, paused, elapsed]);

  // ─── Rename focus ───
  useEffect(() => { if (renamingId && renameInputRef.current) renameInputRef.current.focus(); }, [renamingId]);

  // ─── Actions ───
  const startRecording = () => { setRecording(true); setPaused(false); setElapsed(0); setLiveTranscript([]); setActiveMeeting(null); setActiveTab("transcript"); };
  const stopRecording = () => {
    setRecording(false); setPaused(false);
    const m = { id: `m${Date.now()}`, title: `Meeting ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`, date: new Date().toISOString(), duration: elapsed, status: "completed", source: "recording", transcript: liveTranscript, summary: null };
    setMeetings((p) => [m, ...p]); setActiveMeeting(m); setElapsed(0);
  };
  const handleImport = (fn) => {
    const m = { id: `m${Date.now()}`, title: fn.replace(/\.[^.]+$/, ""), date: new Date().toISOString(), duration: Math.floor(Math.random() * 3600) + 600, status: "completed", source: "audio-import", transcript: [{ time: "00:00:05", speaker: "Speaker 1", text: "Imported audio transcript." }], summary: null };
    setMeetings((p) => [m, ...p]); setActiveMeeting(m);
  };
  const handleTranscriptUpload = ({ title, segments, autoSummarize }) => {
    const m = { id: `m${Date.now()}`, title, date: new Date().toISOString(), duration: segments.length * 12, status: "completed", source: "transcript-upload", transcript: segments, summary: null };
    setMeetings((p) => [m, ...p]); setActiveMeeting(m); setActiveTab("transcript");
    if (autoSummarize) setTimeout(() => doSummary(m.id, "default", segments), 600);
  };

  // ─── RENAME ───
  const startRename = (id, currentTitle) => { setRenamingId(id); setRenameValue(currentTitle); };
  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      setMeetings((p) => p.map((m) => m.id === renamingId ? { ...m, title: renameValue.trim() } : m));
      if (activeMeeting?.id === renamingId) setActiveMeeting((p) => p ? { ...p, title: renameValue.trim() } : p);
    }
    setRenamingId(null); setRenameValue("");
  };
  const cancelRename = () => { setRenamingId(null); setRenameValue(""); };

  // ─── Summarize ───
  const doSummary = async (id, template, transcriptOverride) => {
    const meeting = meetings.find((m) => m.id === id);
    const transcript = transcriptOverride || meeting?.transcript;
    if (!transcript?.length) { setGenError("No transcript to summarize."); return; }
    setGenerating(true); setGenError(null); setActiveTab("summary"); setGenProgress("Sending to Gemini AI...");
    try {
      setGenProgress("Analyzing transcript...");
      const summ = await summarizeWithAI(transcript, template);
      setMeetings((p) => p.map((m) => m.id === id ? { ...m, summary: summ } : m));
      setActiveMeeting((p) => p?.id === id ? { ...p, summary: summ } : p);
    } catch (err) { setGenError(err.message); } finally { setGenerating(false); setGenProgress(""); }
  };
  const generateSummary = (t) => { if (activeMeeting) doSummary(activeMeeting.id, t); };
  const handleCopy = (t) => { navigator.clipboard?.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const deleteMeeting = (id) => { setMeetings((p) => p.filter((m) => m.id !== id)); if (activeMeeting?.id === id) setActiveMeeting(null); };

  const filtered = meetings.filter((m) => m.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const curT = recording ? liveTranscript : activeMeeting?.transcript || [];
  const curS = activeMeeting?.summary;
  const srcBadge = (s) => { if (s === "transcript-upload") return { text: "Transcript", c: "text-purple-400 bg-purple-500/15 border-purple-500/30" }; if (s === "audio-import") return { text: "Imported", c: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30" }; return null; };
  const AudioBars = ({ level, count = 5 }) => (<div className="flex items-end gap-0.5 h-4">{Array.from({ length: count }).map((_, i) => (<div key={i} className="w-[3px] rounded-full bg-indigo-400 transition-all duration-100" style={{ height: `${Math.max(15, (level > i / count ? level * 100 : 15))}%`, opacity: level > i / count ? 1 : 0.3 }} />))}</div>);

  return (
    <div className="h-screen w-full bg-gray-950 text-white flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="h-13 border-b border-gray-800/80 flex items-center px-4 gap-3 shrink-0 bg-gray-950/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"><Mic size={14} /></div>
          <span className="text-sm font-bold tracking-tight">Meetily</span><span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded font-semibold">CLONE</span></div>
        <div className="flex-1" />
        {recording && (<div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/15 border border-red-500/30 rounded-full animate-pulse"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-xs font-medium text-red-400">{fmt(elapsed)}</span><AudioBars level={liveLevel} count={4} /></div>)}
        <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"><Settings size={17} /></button>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${hasKey ? "bg-green-500/10 border border-green-500/20" : "bg-yellow-500/10 border border-yellow-500/20"}`}>
          <Shield size={12} className={hasKey ? "text-green-400" : "text-yellow-400"} />
          <span className={`text-[10px] font-medium ${hasKey ? "text-green-400" : "text-yellow-400"}`}>{hasKey ? "FREE" : "NO KEY"}</span></div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarCollapsed ? "w-14" : "w-72"} border-r border-gray-800/80 flex flex-col shrink-0 bg-gray-950 transition-all duration-300`}>
          <div className="p-3 space-y-1.5">
            {!sidebarCollapsed ? (<>
              <button onClick={startRecording} disabled={recording} className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${recording ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"}`}><Plus size={15} /> New Meeting</button>
              <div className="flex gap-1.5">
                <button onClick={() => setImportOpen(true)} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white transition-all"><FileAudio size={13} /> Audio</button>
                <button onClick={() => setTranscriptUploadOpen(true)} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-medium border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-all bg-purple-500/5"><FileText size={13} /> Transcript</button></div>
            </>) : (<div className="space-y-1.5">
              <button onClick={startRecording} disabled={recording} className="w-full p-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white flex justify-center"><Plus size={16} /></button>
              <button onClick={() => setImportOpen(true)} className="w-full p-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white flex justify-center"><FileAudio size={16} /></button>
              <button onClick={() => setTranscriptUploadOpen(true)} className="w-full p-2 rounded-xl border border-purple-500/30 text-purple-400 flex justify-center bg-purple-500/5"><FileText size={16} /></button></div>)}
          </div>
          {!sidebarCollapsed && (<div className="px-3 mb-2"><div className="relative"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search meetings..." className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50" /></div></div>)}
          <div className="flex-1 overflow-y-auto px-2">
            {!sidebarCollapsed && (<div className="space-y-0.5"><p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider px-2 py-2">Previous Meetings</p>
              {filtered.map((m) => { const badge = srcBadge(m.source); const isRenaming = renamingId === m.id; return (
                <div key={m.id} onClick={() => { if (!isRenaming) { setActiveMeeting(m); setActiveTab("transcript"); setGenError(null); } }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all group cursor-pointer ${activeMeeting?.id === m.id ? "bg-indigo-500/15 border border-indigo-500/30" : "hover:bg-gray-800/60"}`}>
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <input ref={renameInputRef} type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") cancelRename(); }}
                          onBlur={commitRename} onClick={(e) => e.stopPropagation()}
                          className="w-full bg-gray-800 border border-indigo-500 rounded px-1.5 py-0.5 text-sm text-white focus:outline-none" />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-medium truncate ${activeMeeting?.id === m.id ? "text-indigo-300" : "text-gray-200"}`}>{m.title}</span>
                          {badge && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border shrink-0 ${badge.c}`}>{badge.text}</span>}
                          {m.summary && <CheckCircle2 size={10} className="text-green-400 shrink-0" />}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-0.5"><span className="text-[11px] text-gray-500">{fmtDate(m.date)}</span><span className="text-[11px] text-gray-600">·</span><span className="text-[11px] text-gray-500">{fmtDur(m.duration)}</span></div>
                    </div>
                    {!isRenaming && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); startRename(m.id, m.title); }} className="p-1 rounded hover:bg-indigo-500/20 text-gray-500 hover:text-indigo-400 transition-all" title="Rename"><Pencil size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteMeeting(m.id); }} className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all" title="Delete"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                </div>); })}
              {filtered.length === 0 && <p className="text-xs text-gray-600 text-center py-8">No meetings found</p>}
            </div>)}
          </div>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 border-t border-gray-800/80 text-gray-500 hover:text-white hover:bg-gray-800/50 transition-colors flex justify-center">
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} className="rotate-90" />}</button>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Meeting Header */}
          <div className="border-b border-gray-800/80 px-5 py-3 flex items-center gap-3 shrink-0">
            {recording ? (
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" /><span className="text-sm font-semibold text-red-400">Recording</span><span className="text-sm text-gray-400 font-mono">{fmt(elapsed)}</span></div>
                <div className="flex-1" />
                <button onClick={() => setPaused(!paused)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors">{paused ? <><Play size={13} /> Resume</> : <><Pause size={13} /> Pause</>}</button>
                <button onClick={stopRecording} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-colors"><Square size={13} /> Stop</button>
              </div>
            ) : activeMeeting ? (
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1 min-w-0">
                  {/* ─── Clickable title for inline rename ─── */}
                  <div className="flex items-center gap-2">
                    {renamingId === activeMeeting.id ? (
                      <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") cancelRename(); }}
                        onBlur={commitRename} autoFocus
                        className="bg-gray-800 border border-indigo-500 rounded-lg px-2 py-1 text-base font-semibold text-white focus:outline-none max-w-xs" />
                    ) : (
                      <h1 onClick={() => startRename(activeMeeting.id, activeMeeting.title)}
                        className="text-base font-semibold text-white truncate cursor-pointer hover:text-indigo-300 transition-colors group flex items-center gap-1.5" title="Click to rename">
                        {activeMeeting.title}<Pencil size={12} className="text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                      </h1>
                    )}
                    {(() => { const b = srcBadge(activeMeeting.source); return b ? <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border shrink-0 ${b.c}`}>{b.text}</span> : null; })()}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(activeMeeting.date)}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {fmtDur(activeMeeting.duration)}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={11} /> {activeMeeting.transcript?.length || 0} seg</span>
                    <span className="flex items-center gap-1"><Users size={11} /> {[...new Set(activeMeeting.transcript?.map((t) => t.speaker) || [])].length}</span>
                  </div>
                </div>
                <button onClick={() => setSummaryModalOpen(true)} disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 transition-colors">
                  {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {generating ? "Generating..." : "AI Summary"}</button>
              </div>
            ) : (<div className="flex-1 text-center"><p className="text-sm text-gray-500">Select a meeting or start a new recording</p></div>)}
          </div>

          {/* Tabs */}
          {(recording || activeMeeting) && (<div className="border-b border-gray-800/80 px-5 flex gap-0 shrink-0">{["transcript", "summary"].map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? "border-indigo-500 text-indigo-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              {t === "transcript" ? "Transcription" : "AI Summary"}</button>))}</div>)}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {!recording && !activeMeeting ? (
              <div className="h-full flex items-center justify-center"><div className="text-center max-w-md space-y-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center mx-auto"><Mic size={32} className="text-indigo-400" /></div>
                <div><h2 className="text-lg font-semibold text-white mb-1">Ready to Record</h2><p className="text-sm text-gray-500">Start a new meeting, import audio, or upload a transcript for AI summarization.</p></div>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={startRecording} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition-all"><Mic size={15} /> Start Recording</button>
                  <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-700 text-gray-300 hover:bg-gray-800 transition-all"><FileAudio size={15} /> Import Audio</button>
                  <button onClick={() => setTranscriptUploadOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-all bg-purple-500/5"><FileText size={15} /> Upload Transcript</button></div>
                {!hasKey && (<div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl max-w-sm mx-auto"><p className="text-xs text-amber-400 text-center">Get your <b>free</b> Gemini API key (no credit card) at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="underline font-medium">aistudio.google.com/apikey</a></p></div>)}
                <div className="flex items-center justify-center gap-4 pt-2">{[{ icon: Shield, label: "Privacy-First" }, { icon: Cpu, label: "GPU Accelerated" }, { icon: Globe, label: "Multi-language" }].map(({ icon: I, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600"><I size={12} /> {label}</div>))}</div>
              </div></div>
            ) : activeTab === "transcript" ? (
              <div className="p-5 space-y-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {recording && <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live</span>}
                    {activeMeeting?.source === "transcript-upload" && <span className="flex items-center gap-1.5 text-xs text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full"><FileText size={11} /> Uploaded</span>}
                    <span className="text-xs text-gray-500">{curT.length} segments</span></div>
                  <button onClick={() => handleCopy(curT.map((t) => `[${t.time}] ${t.speaker}: ${t.text}`).join("\n"))}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700/50 transition-colors">
                    {copied ? <><Check size={12} className="text-green-400" /> Copied</> : <><Copy size={12} /> Copy</>}</button></div>
                {curT.length === 0 ? (<div className="flex flex-col items-center justify-center py-20 text-gray-600"><Mic size={28} className="mb-3 opacity-50" /><p className="text-sm">{recording ? "Listening..." : "No transcript"}</p></div>)
                  : (<div className="space-y-1">{curT.map((t, i) => (<div key={i} className="flex gap-3 py-2 px-3 rounded-lg hover:bg-gray-800/40 transition-colors">
                    <span className="text-[11px] text-gray-600 font-mono w-14 shrink-0 pt-0.5">{t.time}</span>
                    <div className="flex-1"><span className="text-xs font-semibold text-indigo-400 mr-2">{t.speaker}</span><span className="text-sm text-gray-300 leading-relaxed">{t.text}</span></div></div>))}
                    {recording && <div className="flex items-center gap-3 py-3 px-3 text-gray-600"><Loader2 size={14} className="animate-spin" /><span className="text-xs">Listening...</span></div>}</div>)}
              </div>
            ) : (
              <div className="p-5">
                {generating ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center"><Sparkles size={28} className="text-indigo-400 animate-pulse" /></div>
                    <div className="text-center"><p className="text-sm font-medium text-white mb-1">Generating AI Summary</p><p className="text-xs text-gray-500">{genProgress}</p></div>
                    <div className="w-48 h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: genProgress.includes("Analyzing") ? "60%" : "30%" }} /></div></div>
                ) : genError ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center"><AlertCircle size={28} className="text-red-400" /></div>
                    <div className="text-center max-w-md"><p className="text-sm font-medium text-red-400 mb-2">Summary Failed</p><p className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed">{genError}</p></div>
                    <button onClick={() => { setGenError(null); setSummaryModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-all"><RotateCcw size={14} /> Try Again</button></div>
                ) : curS ? (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Sparkles size={14} className="text-indigo-400" /> AI Enhanced Summary</h3>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleCopy(`## Summary\n${curS.sections}\n\n## Decisions\n${curS.decisions}\n\n## Action Items\n${curS.actions}`)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700/50 transition-colors">
                          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />} Markdown</button>
                        <button onClick={() => setSummaryModalOpen(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700/50 transition-colors"><RotateCcw size={12} /> Regenerate</button></div></div>
                    <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-lg"><p className="text-[11px] text-emerald-400/70 flex items-center gap-1.5"><Brain size={11} /> Generated by Gemini 2.0 Flash (Free) · {activeMeeting?.transcript?.length} segments analyzed</p></div>
                    {[{ title: "Section Summary", content: curS.sections, color: "indigo" }, { title: "Key Decisions", content: curS.decisions, color: "amber" }, { title: "Action Items", content: curS.actions, color: "green" }].map(({ title, content, color }) => (
                      <div key={title} className={`p-4 rounded-xl border bg-gray-800/30 ${color === "indigo" ? "border-indigo-500/20" : color === "amber" ? "border-amber-500/20" : "border-green-500/20"}`}>
                        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${color === "indigo" ? "text-indigo-400" : color === "amber" ? "text-amber-400" : "text-green-400"}`}>{title}</h4>
                        <p className="text-sm text-gray-300 leading-relaxed">{content}</p></div>))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center"><Sparkles size={28} className="text-gray-600" /></div>
                    <div className="text-center"><p className="text-sm font-medium text-gray-300 mb-1">No summary yet</p><p className="text-xs text-gray-600">Click "AI Summary" to generate from your transcript</p></div>
                    <button onClick={() => setSummaryModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-all"><Sparkles size={14} /> Generate Summary</button></div>
                )}
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div className="border-t border-gray-800/80 px-5 py-2 flex items-center gap-4 text-[11px] text-gray-600 shrink-0">
            <span className="flex items-center gap-1"><Cpu size={11} /> Whisper {settings.whisperModel}</span>
            <span>🟢 Gemini 2.0 Flash (Free)</span>
            {settings.gpu && <span className="flex items-center gap-1"><Zap size={11} className="text-yellow-500" /> GPU</span>}
            <span className="flex items-center gap-1"><Shield size={11} className="text-green-500" /> Local Storage</span>
            <div className="flex-1" /><span>{meetings.length} meetings</span></div>
        </main>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} setSettings={setSettings} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
      <SummaryModal open={summaryModalOpen} onClose={() => setSummaryModalOpen(false)} settings={settings} onGenerate={generateSummary} />
      <TranscriptUploadModal open={transcriptUploadOpen} onClose={() => setTranscriptUploadOpen(false)} onUpload={handleTranscriptUpload} />
    </div>
  );
}
