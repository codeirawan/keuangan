import { useState, useEffect, useRef } from "react";
import { auth, db, loginGoogle, logoutUser, onAuthStateChanged } from "./firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";

// ─── Constants ────────────────────────────────────────────────────────────────

const INCOME_CATS = [
  { id: "gaji",       label: "Gaji",       icon: "💼", color: "#34D399" },
  { id: "freelance",  label: "Freelance",  icon: "💻", color: "#60A5FA" },
  { id: "bisnis",     label: "Bisnis",     icon: "🏪", color: "#FBBF24" },
  { id: "investasi",  label: "Investasi",  icon: "📈", color: "#A78BFA" },
  { id: "hadiah",     label: "Hadiah",     icon: "🎁", color: "#F472B6" },
  { id: "lainnya_in", label: "Lainnya",    icon: "✦",  color: "#94A3B8" },
];

const EXPENSE_CATS = [
  { id: "makanan",    label: "Makanan",    icon: "🍜", color: "#FB923C" },
  { id: "transport",  label: "Transport",  icon: "🚗", color: "#60A5FA" },
  { id: "belanja",    label: "Belanja",    icon: "🛍️", color: "#F472B6" },
  { id: "tagihan",    label: "Tagihan",    icon: "📋", color: "#F87171" },
  { id: "hiburan",    label: "Hiburan",    icon: "🎮", color: "#A78BFA" },
  { id: "kesehatan",  label: "Kesehatan",  icon: "🏥", color: "#34D399" },
  { id: "pendidikan", label: "Pendidikan", icon: "📚", color: "#FBBF24" },
  { id: "lainnya_ex", label: "Lainnya",    icon: "✦",  color: "#94A3B8" },
];

const ALL_CATS = [...INCOME_CATS, ...EXPENSE_CATS];

const SAMPLE = [
  { id: 1,  type: "income",  catId: "gaji",       desc: "Gaji bulan Juni",           amount: 8500000, date: "2026-06-01" },
  { id: 2,  type: "expense", catId: "makanan",    desc: "Makan siang & dinner",       amount: 125000,  date: "2026-06-02" },
  { id: 3,  type: "expense", catId: "transport",  desc: "Bensin motor",               amount: 80000,   date: "2026-06-03" },
  { id: 4,  type: "income",  catId: "freelance",  desc: "Project website client",     amount: 2500000, date: "2026-06-04" },
  { id: 5,  type: "expense", catId: "belanja",    desc: "Beli baju di mall",          amount: 450000,  date: "2026-06-05" },
  { id: 6,  type: "expense", catId: "tagihan",    desc: "Tagihan listrik PLN",        amount: 320000,  date: "2026-06-05" },
  { id: 7,  type: "expense", catId: "hiburan",    desc: "Nonton bioskop",             amount: 75000,   date: "2026-06-06" },
  { id: 8,  type: "expense", catId: "makanan",    desc: "Groceries minggu ini",       amount: 280000,  date: "2026-06-07" },
  { id: 9,  type: "income",  catId: "investasi",  desc: "Dividen saham BBRI",         amount: 350000,  date: "2026-06-08" },
  { id: 10, type: "expense", catId: "kesehatan",  desc: "Vitamin & suplemen",         amount: 145000,  date: "2026-06-08" },
  { id: 11, type: "expense", catId: "transport",  desc: "Grab & ojol",                amount: 95000,   date: "2026-06-09" },
  { id: 12, type: "expense", catId: "pendidikan", desc: "Langganan kursus online",    amount: 199000,  date: "2026-06-09" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n)      { return "Rp " + n.toLocaleString("id-ID"); }
function fmtShort(n) {
  if (n >= 1_000_000) return "Rp " + (n / 1_000_000).toFixed(1).replace(".0","") + "jt";
  if (n >= 1_000)     return "Rp " + (n / 1_000).toFixed(0) + "rb";
  return "Rp " + n;
}
function fmtDate(str) {
  return new Date(str + "T00:00:00").toLocaleDateString("id-ID", { day:"numeric", month:"short", year:"numeric" });
}
function fmtDateShort(str) {
  return new Date(str + "T00:00:00").toLocaleDateString("id-ID", { day:"numeric", month:"short" });
}
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayStr() { return toDateStr(new Date()); }
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return toDateStr(d);
}

// Returns {start, end} as YYYY-MM-DD strings for a week (Mon–Sun) at offset weeks from now
function getWeekRange(offset = 0) {
  const now = new Date();
  const dow = now.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon + offset * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: toDateStr(mon),
    end:   toDateStr(sun),
    label: `${fmtDateShort(toDateStr(mon))} – ${fmtDateShort(toDateStr(sun))}`,
  };
}

// Returns {start, end} as YYYY-MM-DD strings for a month at offset months from now
function getMonthRange(offset = 0) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offset;
  const start = new Date(y, m, 1);
  const end   = new Date(y, m + 1, 0);
  return {
    start: toDateStr(start),
    end:   toDateStr(end),
    label: start.toLocaleDateString("id-ID", { month:"long", year:"numeric" }),
  };
}

function inRange(date, start, end) { return date >= start && date <= end; }

// Build 7-day bars for weekly summary (Mon=0 … Sun=6)
function buildDayBars(txns, range) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(range.start + "T00:00:00");
    d.setDate(d.getDate() + i);
    const ds = toDateStr(d);
    const dayTxns = txns.filter(t => t.date === ds);
    days.push({
      label: d.toLocaleDateString("id-ID", { weekday:"short" }).slice(0,3),
      date: ds,
      expense: dayTxns.filter(t => t.type==="expense").reduce((s,t)=>s+t.amount,0),
      income:  dayTxns.filter(t => t.type==="income").reduce((s,t)=>s+t.amount,0),
    });
  }
  return days;
}

// Build 4–5 week rows for monthly summary
function buildWeekRows(txns, range) {
  const rows = [];
  let cur = new Date(range.start + "T00:00:00");
  const endDate = new Date(range.end + "T00:00:00");
  let weekNum = 1;
  while (cur <= endDate) {
    const wStart = toDateStr(cur);
    const wEnd = new Date(cur); wEnd.setDate(cur.getDate() + 6);
    if (wEnd > endDate) wEnd.setTime(endDate.getTime());
    const wEndStr = toDateStr(wEnd);
    const wTxns = txns.filter(t => t.date >= wStart && t.date <= wEndStr);
    rows.push({
      label: `Minggu ${weekNum}`,
      sub: `${fmtDateShort(wStart)} – ${fmtDateShort(wEndStr)}`,
      expense: wTxns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0),
      income:  wTxns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),
    });
    cur.setDate(cur.getDate() + 7);
    weekNum++;
  }
  return rows;
}

function groupTxnsByDate(txns) {
  const map = {};
  txns.forEach(t => { (map[t.date] = map[t.date] || []).push(t); });
  return Object.entries(map).sort(([a],[b]) => b.localeCompare(a));
}

function useStorage(key, fallback) {
  const [val, setVal] = useState(fallback);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const r = localStorage.getItem(key); if (r) setVal(JSON.parse(r)); } catch (_) {}
    setReady(true);
  }, [key]);
  function save(v) {
    const r = typeof v === "function" ? v(val) : v;
    setVal(r);
    try { localStorage.setItem(key, JSON.stringify(r)); } catch (_) {}
  }
  return [val, save, ready];
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ dm }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  async function handleLogin() {
    setLoading(true); setErr("");
    try { await loginGoogle(); } catch (e) { setErr("Login gagal. Coba lagi."); setLoading(false); }
  }
  const bg = dm
    ? "linear-gradient(160deg,#0D0B1E 0%,#12102A 50%,#0D1520 100%)"
    : "linear-gradient(160deg,#EDE9FE 0%,#EEF2FF 50%,#E0F2FE 100%)";
  const cardBg  = dm ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.85)";
  const border  = dm ? "rgba(255,255,255,.10)" : "rgba(0,0,0,.08)";
  const textCol = dm ? "#F1F5F9" : "#1E1B4B";
  const subCol  = dm ? "rgba(255,255,255,.45)" : "rgba(0,0,0,.45)";
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:bg, fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ textAlign:"center", padding:"40px 32px", background:cardBg, borderRadius:28, border:`1px solid ${border}`, backdropFilter:"blur(20px)", maxWidth:320, width:"90%" }}>
        <div style={{ fontSize:52, marginBottom:16 }}>💰</div>
        <h1 style={{ fontSize:28, fontWeight:900, lineHeight:1, background:"linear-gradient(135deg,#7C3AED,#2DD4BF)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", marginBottom:8 }}>Sisa Uang</h1>
        <p style={{ color:subCol, fontSize:13, marginBottom:28, lineHeight:1.5 }}>Login untuk sync data<br/>di semua perangkat kamu</p>
        <button onClick={handleLogin} disabled={loading} style={{ display:"flex", alignItems:"center", gap:10, justifyContent:"center", width:"100%", padding:"13px 20px", borderRadius:14, border:`1px solid ${border}`, background:dm?"rgba(255,255,255,.10)":"#fff", color:textCol, fontSize:14, fontWeight:600, cursor:loading?"wait":"pointer", transition:"opacity .2s", opacity:loading?.6:1 }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {loading ? "Menghubungkan..." : "Login dengan Google"}
        </button>
        {err && <p style={{ marginTop:12, color:"#F87171", fontSize:12 }}>{err}</p>}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]                       = useState(null);
  const [authLoading, setAuthLoad]            = useState(true);
  const [localTxns, setLocalTxns, localReady] = useStorage("keuangan-txns-v1", SAMPLE);
  const [cloudTxns, setCloudTxns]             = useState([]);
  const [cloudReady, setCloudReady]           = useState(false);
  const [dark, setDark, darkReady]            = useStorage("keuangan-dark-v1", true);

  const [tab, setTab]       = useState("dashboard");
  const [filterType, setFT] = useState("all");
  const [deletingId, setDel] = useState(null);
  const [showSuccess, setSuc] = useState(false);

  // summary
  const [sumMode, setSumMode]     = useState("week");   // week | month
  const [sumOffset, setSumOffset] = useState(0);

  // form
  const [type, setType]     = useState("expense");
  const [amount, setAmount] = useState("");
  const [desc, setDesc]     = useState("");
  const [catId, setCatId]   = useState("makanan");
  const [date, setDate]     = useState(todayStr());
  const [formErr, setFormErr] = useState("");
  const amountRef = useRef(null);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthLoad(false);
      if (!u) { setCloudTxns([]); setCloudReady(false); }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "users", user.uid, "txns"), snap => {
      const data = snap.docs.map(d => d.data());
      data.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
      setCloudTxns(data);
      setCloudReady(true);
    });
    return unsub;
  }, [user]);

  const txns      = user ? cloudTxns : localTxns;
  const txnsReady = user ? cloudReady : localReady;
  const dm        = dark;
  const ready     = darkReady && txnsReady && !authLoading;

  const totalIncome  = txns.filter(t => t.type==="income").reduce((s,t) => s+t.amount, 0);
  const totalExpense = txns.filter(t => t.type==="expense").reduce((s,t) => s+t.amount, 0);
  const balance      = totalIncome - totalExpense;

  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;

  const filtered = txns
    .filter(t => filterType === "all" || t.type === filterType)
    .sort((a,b) => b.date.localeCompare(a.date));

  const expBreakdown = EXPENSE_CATS
    .map(c => ({ ...c, total: txns.filter(t=>t.type==="expense"&&t.catId===c.id).reduce((s,t)=>s+t.amount,0) }))
    .filter(c => c.total > 0).sort((a,b) => b.total - a.total);

  // Period summary
  const period = sumMode === "week" ? getWeekRange(sumOffset) : getMonthRange(sumOffset);
  const periodTxns = txns.filter(t => inRange(t.date, period.start, period.end));
  const pIncome  = periodTxns.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const pExpense = periodTxns.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const pBalance = pIncome - pExpense;
  const dayBars  = sumMode === "week" ? buildDayBars(txns, period) : [];
  const weekRows = sumMode === "month" ? buildWeekRows(txns, period) : [];
  const maxBarVal = Math.max(...(sumMode==="week" ? dayBars.map(d=>d.expense) : weekRows.map(w=>w.expense)), 1);

  async function addTxn() {
    const n = parseFloat(amount.replace(/\./g,"").replace(",","."));
    if (!n || n <= 0) { setFormErr("Nominal tidak valid"); return; }
    if (!desc.trim())  { setFormErr("Keterangan wajib diisi"); return; }
    setFormErr("");
    const txn = { id: Date.now(), type, catId, desc: desc.trim(), amount: n, date };
    if (user) {
      await setDoc(doc(db, "users", user.uid, "txns", String(txn.id)), txn);
    } else {
      setLocalTxns(prev => [txn, ...prev]);
    }
    setAmount(""); setDesc(""); setDate(todayStr());
    setSuc(true); setTimeout(() => setSuc(false), 2200);
  }

  function deleteTxn(id) {
    setDel(id);
    setTimeout(async () => {
      if (user) {
        await deleteDoc(doc(db, "users", user.uid, "txns", String(id)));
      } else {
        setLocalTxns(prev => prev.filter(t => t.id !== id));
      }
      setDel(null);
    }, 350);
  }

  // ─── Theme ──────────────────────────────────────────────────────────────────
  const C = dm ? {
    bg:      "linear-gradient(160deg, #0D0B1E 0%, #12102A 50%, #0D1520 100%)",
    surface: "#13111F",
    card:    "rgba(255,255,255,0.04)",
    cardHov: "rgba(255,255,255,0.08)",
    border:  "rgba(255,255,255,0.08)",
    text:    "#F1F5F9",
    muted:   "#94A3B8",
    dim:     "#475569",
    input:   "rgba(255,255,255,0.07)",
    inputBdr:"rgba(255,255,255,0.10)",
    navBg:   "rgba(13,11,30,0.92)",
    sep:     "rgba(255,255,255,0.05)",
  } : {
    bg:      "linear-gradient(160deg, #EEF2FF 0%, #F5F3FF 50%, #EFF6FF 100%)",
    surface: "#FFFFFF",
    card:    "rgba(255,255,255,0.75)",
    cardHov: "#FFFFFF",
    border:  "rgba(0,0,0,0.07)",
    text:    "#1E1B4B",
    muted:   "#6B7280",
    dim:     "#9CA3AF",
    input:   "#F8F9FB",
    inputBdr:"rgba(0,0,0,0.10)",
    navBg:   "rgba(238,242,255,0.92)",
    sep:     "rgba(0,0,0,0.05)",
  };

  const accent  = "#7C3AED";
  const accentG = "linear-gradient(135deg, #7C3AED, #EC4899)";
  const greenG  = "linear-gradient(135deg, #059669, #34D399)";
  const redG    = "linear-gradient(135deg, #DC2626, #F87171)";
  const balG    = balance >= 0
    ? "linear-gradient(135deg, #34D399, #059669)"
    : "linear-gradient(135deg, #F87171, #DC2626)";

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Inter',system-ui,sans-serif", paddingBottom:84 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { margin:0; }
        input,button,select { font-family:inherit; }
        input:focus,select:focus { outline:none; }
        button { cursor:pointer; }
        ::placeholder { color:${C.dim}; }

        .orb-a { position:fixed; top:-100px; right:-80px; pointer-events:none; z-index:0;
          width:350px; height:350px; border-radius:50%;
          background:radial-gradient(circle,rgba(124,58,237,.18),transparent 70%);
          animation:orb 9s ease-in-out infinite; }
        .orb-b { position:fixed; bottom:60px; left:-60px; pointer-events:none; z-index:0;
          width:280px; height:280px; border-radius:50%;
          background:radial-gradient(circle,rgba(236,72,153,.14),transparent 70%);
          animation:orb 12s ease-in-out infinite reverse; }
        @keyframes orb { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-20px)} }

        .page { position:relative; z-index:1; max-width:480px; margin:0 auto; padding:0 16px; }

        .card-solid {
          background:${C.surface}; border:1px solid ${C.border}; border-radius:18px;
          box-shadow:0 4px 24px rgba(0,0,0,${dm?"0.3":"0.08"});
        }
        .card-glass {
          background:${C.card}; border:1px solid ${C.border}; border-radius:16px;
          backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
        }

        .txn-row {
          background:${C.card}; border:1px solid ${C.border}; border-radius:14px;
          transition:background .2s,transform .15s;
        }
        .txn-row:hover { background:${C.cardHov}; transform:translateX(2px); }
        .txn-row.removing { animation:rowOut .35s ease forwards; }
        @keyframes rowOut { to{opacity:0;transform:translateX(20px);max-height:0;padding:0;margin:0;border:none;} }
        .txn-row .del { opacity:0; transition:opacity .2s; }
        .txn-row:hover .del { opacity:1; }

        .chip { transition:all .18s cubic-bezier(.34,1.56,.64,1); cursor:pointer; }
        .chip:hover { transform:translateY(-2px); }

        .type-toggle { display:flex; border-radius:12px; overflow:hidden; border:1px solid ${C.border}; }
        .type-btn { flex:1; padding:11px; border:none; font-size:13px; font-weight:600; transition:background .2s,color .2s; }

        .nav { position:fixed; bottom:0; left:50%; right:auto; transform:translateX(-50%); max-width:480px; width:100%; z-index:100;
          background:${C.navBg}; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
          border-top:1px solid ${C.border};
          display:flex; justify-content:space-around; align-items:center;
          padding:10px 0 max(10px,env(safe-area-inset-bottom)); }
        .nav-item { display:flex; flex-direction:column; align-items:center; gap:3px;
          padding:6px 16px; border-radius:12px; border:none; background:transparent;
          transition:background .2s; font-size:10px; font-weight:600; letter-spacing:.5px; text-transform:uppercase; }
        .nav-item:hover { background:rgba(124,58,237,.1); }

        .fab { background:${accentG}; box-shadow:0 4px 20px rgba(124,58,237,.5);
          border:none; border-radius:18px; width:56px; height:56px;
          display:flex; align-items:center; justify-content:center;
          font-size:26px; color:#fff; font-weight:300; transform:translateY(-10px);
          transition:transform .2s,box-shadow .2s; }
        .fab:hover { transform:translateY(-14px); box-shadow:0 8px 30px rgba(124,58,237,.6); }

        .btn-primary { width:100%; padding:14px; background:${accentG}; color:#fff; border:none;
          border-radius:14px; font-size:15px; font-weight:700;
          box-shadow:0 4px 20px rgba(124,58,237,.4); transition:opacity .2s,transform .2s; }
        .btn-primary:hover { opacity:.9; transform:translateY(-1px); }
        .btn-primary:active { transform:translateY(0); }

        .input-field { width:100%; padding:13px 16px;
          background:${C.input}; border:1.5px solid ${C.inputBdr};
          border-radius:12px; color:${C.text}; font-size:15px;
          transition:border-color .2s,box-shadow .2s; }
        .input-field:focus { border-color:${accent}; box-shadow:0 0 0 3px rgba(124,58,237,.15); }

        .success-toast { position:fixed; top:20px; left:50%; transform:translateX(-50%);
          background:linear-gradient(135deg,#059669,#34D399); color:#fff;
          padding:12px 24px; border-radius:50px; font-size:13px; font-weight:600; z-index:999;
          box-shadow:0 8px 24px rgba(5,150,105,.4); animation:toastIn .3s cubic-bezier(.34,1.56,.64,1); }
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

        .bar-fill  { transition:width .6s cubic-bezier(.4,0,.2,1); }
        .bar-fill2 { transition:height .6s cubic-bezier(.4,0,.2,1); }
        .progress-bg { height:6px; border-radius:6px; background:${dm?"rgba(255,255,255,.07)":"rgba(0,0,0,.06)"}; overflow:hidden; }

        .period-nav { display:flex; align-items:center; gap:10px; }
        .period-nav button { width:30px; height:30px; border-radius:8px; border:1px solid ${C.border};
          background:${dm?"rgba(255,255,255,.06)":"rgba(0,0,0,.04)"}; color:${C.muted}; font-size:14px;
          display:flex; align-items:center; justify-content:center; transition:background .15s; }
        .period-nav button:hover { background:rgba(124,58,237,.15); color:${accent}; }

        .date-shortcut { padding:6px 14px; border-radius:50px; border:1px solid ${C.border}; font-size:12px; font-weight:600;
          transition:all .15s; background:transparent; }
        .date-shortcut:hover { border-color:${accent}; color:${accent}; }
        .date-shortcut.active { background:${accentG}; color:#fff; border-color:transparent;
          box-shadow:0 3px 12px rgba(124,58,237,.35); }

        .date-group-label { font-size:11px; font-weight:700; letter-spacing:.5px; color:${C.muted};
          text-transform:uppercase; margin:16px 0 8px; display:flex; align-items:center; gap:8px; }
        .date-group-label::after { content:''; flex:1; height:1px; background:${C.border}; }

        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      <div className="orb-a" /><div className="orb-b" />
      {showSuccess && <div className="success-toast">✓ Transaksi berhasil disimpan</div>}

      {!ready ? (
        <div style={{ textAlign:"center", padding:"80px 0", color:C.muted }}>
          <div style={{ width:36,height:36,borderRadius:"50%",border:`3px solid ${C.border}`,borderTopColor:accent,animation:"spin .8s linear infinite",margin:"0 auto 12px" }} />
        </div>
      ) : (
        <div className="page">

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"24px 0 20px" }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:3, color:C.muted, textTransform:"uppercase", marginBottom:4 }}>Dompet</div>
              <h1 style={{ fontSize:30, fontWeight:900, lineHeight:1, background:accentG, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>Sisa Uang</h1>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={() => setDark(!dm)} style={{ background:dm?"rgba(255,255,255,.08)":"rgba(0,0,0,.06)", border:`1px solid ${C.border}`, borderRadius:50, padding:"6px 12px", display:"flex", alignItems:"center", gap:6, color:C.muted, fontSize:12, fontWeight:600 }}>
                {dm?"🌙":"☀️"}
              </button>
              {user ? (
                <button onClick={() => logoutUser()} title="Logout" style={{ width:36, height:36, borderRadius:"50%", border:`2px solid ${C.border}`, overflow:"hidden", padding:0, cursor:"pointer", background:C.surface, flexShrink:0 }}>
                  {user.photoURL
                    ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <span style={{ fontSize:16 }}>👤</span>}
                </button>
              ) : (
                <button onClick={() => loginGoogle()} disabled={authLoading} style={{ background:dm?"rgba(255,255,255,.08)":"rgba(0,0,0,.06)", border:`1px solid ${C.border}`, borderRadius:50, padding:"6px 12px", color:C.muted, fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                  <svg width="13" height="13" viewBox="0 0 18 18">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Sync
                </button>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              DASHBOARD
          ══════════════════════════════════════════════════════════ */}
          {tab === "dashboard" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              {/* Balance card */}
              <div style={{ background:balG, borderRadius:22, padding:"28px 24px", boxShadow:`0 16px 48px ${balance>=0?"rgba(52,211,153,.3)":"rgba(248,113,113,.3)"}`, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:-30, right:-30, width:150, height:150, borderRadius:"50%", background:"rgba(255,255,255,.07)" }} />
                <div style={{ position:"absolute", bottom:-20, left:30, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,.05)" }} />
                <div style={{ position:"relative" }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:"rgba(255,255,255,.7)", textTransform:"uppercase", marginBottom:10 }}>Saldo Bersih</div>
                  <div style={{ fontSize:36, fontWeight:900, color:"#fff", letterSpacing:-1, marginBottom:20 }}>
                    {fmt(Math.abs(balance))}
                    {balance < 0 && <span style={{ fontSize:15, marginLeft:6, opacity:.7 }}>defisit</span>}
                  </div>
                  <div style={{ display:"flex", gap:18 }}>
                    {[["↑ MASUK", fmtShort(totalIncome)],["↓ KELUAR", fmtShort(totalExpense)],["TRANSAKSI", txns.length]].map(([l,v]) => (
                      <div key={l}>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,.6)", fontWeight:600, letterSpacing:1, marginBottom:3 }}>{l}</div>
                        <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Period Summary ── */}
              <div className="card-solid" style={{ padding:"20px" }}>
                {/* Header row */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase" }}>Ringkasan</span>
                  {/* Mode toggle */}
                  <div style={{ display:"flex", background:dm?"rgba(255,255,255,.06)":"rgba(0,0,0,.05)", borderRadius:8, padding:3, gap:2 }}>
                    {[["week","Minggu"],["month","Bulan"]].map(([m,l]) => (
                      <button key={m} onClick={() => { setSumMode(m); setSumOffset(0); }} style={{ padding:"4px 10px", borderRadius:6, border:"none", fontSize:11, fontWeight:700, background: sumMode===m ? (dm?"rgba(255,255,255,.12)":"#fff") : "transparent", color: sumMode===m ? C.text : C.dim, boxShadow: sumMode===m ? "0 1px 4px rgba(0,0,0,.15)" : "none" }}>{l}</button>
                    ))}
                  </div>
                </div>
                {/* Period nav row */}
                <div className="period-nav" style={{ justifyContent:"center", marginBottom:16 }}>
                  <button onClick={() => setSumOffset(o => o-1)}>‹</button>
                  <span style={{ fontSize:13, fontWeight:700, color:C.text, minWidth:140, textAlign:"center" }}>{period.label}</span>
                  <button onClick={() => setSumOffset(o => o+1)} disabled={sumOffset >= 0} style={{ opacity: sumOffset >= 0 ? .35 : 1, cursor: sumOffset >= 0 ? "default" : "pointer" }}>›</button>
                </div>

                {/* Stats row */}
                <div style={{ display:"flex", gap:10, marginBottom:18 }}>
                  {[
                    { label:"Pemasukan", val:pIncome,  grad:greenG, glow:"rgba(52,211,153,.25)" },
                    { label:"Pengeluaran",val:pExpense, grad:redG,   glow:"rgba(248,113,113,.25)" },
                    { label:"Selisih",   val:Math.abs(pBalance), grad: pBalance>=0?greenG:redG, glow:"rgba(124,58,237,.2)", prefix: pBalance>=0?"+":"-" },
                  ].map(({ label, val, grad, glow, prefix="" }) => (
                    <div key={label} style={{ flex:1, background:grad, borderRadius:12, padding:"12px 10px", boxShadow:`0 4px 16px ${glow}` }}>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,.7)", fontWeight:700, letterSpacing:1, marginBottom:4, textTransform:"uppercase" }}>{label}</div>
                      <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>{prefix}{fmtShort(val)}</div>
                    </div>
                  ))}
                </div>

                {/* Weekly bar chart (Mon–Sun) */}
                {sumMode === "week" && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", marginBottom:12 }}>Pengeluaran Harian</div>
                    <div style={{ display:"flex", gap:6 }}>
                      {dayBars.map((d, i) => {
                        const BAR_H = 60;
                        const h = maxBarVal > 0 ? Math.max(4, Math.round((d.expense / maxBarVal) * BAR_H)) : 4;
                        const isToday = d.date === todayStr();
                        return (
                          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                            {/* fixed-height slot so label doesn't overlap bar */}
                            <div style={{ height:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <span style={{ fontSize:8, fontWeight:700, color: d.expense>0?C.text:C.dim, whiteSpace:"nowrap" }}>
                                {d.expense>0 ? fmtShort(d.expense) : ""}
                              </span>
                            </div>
                            {/* bar container — fixed height, bar grows from bottom */}
                            <div style={{ width:"100%", height:BAR_H, borderRadius:6, overflow:"hidden", display:"flex", alignItems:"flex-end", background:dm?"rgba(255,255,255,.05)":"rgba(0,0,0,.05)" }}>
                              <div className="bar-fill2" style={{ width:"100%", height:h, background: isToday ? accentG : "#7C3AED66", borderRadius:6 }} />
                            </div>
                            <div style={{ fontSize:9, fontWeight:700, color: isToday ? accent : C.dim }}>{d.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Monthly week-row breakdown */}
                {sumMode === "month" && weekRows.length > 0 && (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", marginBottom:12 }}>Per Minggu</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {weekRows.map((w, i) => {
                        const pct = maxBarVal > 0 ? Math.round((w.expense / maxBarVal) * 100) : 0;
                        return (
                          <div key={i}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                              <div>
                                <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{w.label}</span>
                                <span style={{ fontSize:10, color:C.dim, marginLeft:8 }}>{w.sub}</span>
                              </div>
                              <div style={{ textAlign:"right" }}>
                                <span style={{ fontSize:12, fontWeight:700, color:"#F87171" }}>-{fmtShort(w.expense)}</span>
                                {w.income > 0 && <span style={{ fontSize:10, color:"#34D399", marginLeft:6 }}>+{fmtShort(w.income)}</span>}
                              </div>
                            </div>
                            <div className="progress-bg">
                              <div className="bar-fill" style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#7C3AED,#EC4899)", borderRadius:6 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {periodTxns.length === 0 && (
                  <div style={{ textAlign:"center", padding:"20px 0", color:C.dim, fontSize:12 }}>Tidak ada transaksi periode ini</div>
                )}
              </div>

              {/* Spending breakdown */}
              {expBreakdown.length > 0 && (
                <div className="card-solid" style={{ padding:"20px" }}>
                  <div style={{ fontSize:12, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", marginBottom:16 }}>Pengeluaran per Kategori</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {expBreakdown.slice(0,5).map(c => {
                      const pct = totalExpense>0 ? Math.round((c.total/totalExpense)*100) : 0;
                      return (
                        <div key={c.id}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ fontSize:16 }}>{c.icon}</span>
                              <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{c.label}</span>
                            </div>
                            <div>
                              <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{fmtShort(c.total)}</span>
                              <span style={{ fontSize:10, color:C.dim, marginLeft:6 }}>{pct}%</span>
                            </div>
                          </div>
                          <div className="progress-bg">
                            <div className="bar-fill" style={{ height:"100%", width:`${pct}%`, background:c.color, borderRadius:6 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontSize:12, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase" }}>Transaksi Terakhir</span>
                  <button onClick={() => setTab("history")} style={{ fontSize:12, fontWeight:600, color:accent, background:"rgba(124,58,237,.10)", border:"none", padding:"4px 12px", borderRadius:50 }}>Lihat semua</button>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {txns.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(t => (
                    <TxnRow key={t.id} t={t} C={C} deleting={deletingId===t.id} onDelete={deleteTxn} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              ADD
          ══════════════════════════════════════════════════════════ */}
          {tab === "add" && (
            <div className="card-solid" style={{ padding:"24px 22px", marginTop:4 }}>
              <h2 style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:22 }}>Tambah Transaksi</h2>

              {/* Type toggle */}
              <div className="type-toggle" style={{ marginBottom:20, background:C.input }}>
                <button className="type-btn" onClick={() => { setType("expense"); setCatId("makanan"); }} style={{ background:type==="expense"?redG:"transparent", color:type==="expense"?"#fff":C.muted }}>↓ Pengeluaran</button>
                <button className="type-btn" onClick={() => { setType("income");  setCatId("gaji"); }}    style={{ background:type==="income"?greenG:"transparent", color:type==="income"?"#fff":C.muted }}>↑ Pemasukan</button>
              </div>

              {/* Amount */}
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", display:"block", marginBottom:8 }}>Nominal</label>
              <div style={{ position:"relative", marginBottom:10 }}>
                <span style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", fontSize:14, fontWeight:700, color:C.muted }}>Rp</span>
                <input ref={amountRef} className="input-field" value={amount}
                  onChange={e => { setAmount(e.target.value.replace(/[^0-9]/g,"")); setFormErr(""); }}
                  onKeyDown={e => e.key==="Enter" && e.target.blur()}
                  placeholder="0" inputMode="numeric"
                  style={{ paddingLeft:44, fontSize:20, fontWeight:700 }} />
              </div>
              <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
                {[10000,25000,50000,100000,500000,1000000].map(v => (
                  <button key={v} onClick={() => setAmount(String(v))} style={{ padding:"5px 12px", borderRadius:50, background:amount===String(v)?(type==="expense"?redG:greenG):(dm?"rgba(255,255,255,.07)":"rgba(0,0,0,.05)"), border:`1px solid ${C.border}`, color:amount===String(v)?"#fff":C.muted, fontSize:11, fontWeight:600 }}>
                    {fmtShort(v)}
                  </button>
                ))}
              </div>

              {/* Description */}
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", display:"block", marginBottom:8 }}>Keterangan</label>
              <input className="input-field" value={desc}
                onChange={e => { setDesc(e.target.value); setFormErr(""); }}
                onKeyDown={e => e.key==="Enter" && addTxn()}
                placeholder="Contoh: Makan siang di warteg"
                style={{ marginBottom:16 }} />

              {/* Category */}
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", display:"block", marginBottom:10 }}>Kategori</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
                {cats.map(c => (
                  <button key={c.id} className="chip" onClick={() => setCatId(c.id)} style={{ padding:"7px 14px", borderRadius:50, border:"none", background:catId===c.id?c.color:(dm?"rgba(255,255,255,.07)":"rgba(0,0,0,.05)"), color:catId===c.id?"#fff":C.muted, fontSize:12, fontWeight:600, boxShadow:catId===c.id?`0 4px 14px ${c.color}55`:"none" }}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>

              {/* Date — with shortcuts */}
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", display:"block", marginBottom:10 }}>Tanggal Transaksi</label>
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                {[
                  { label:"Hari ini",  val: todayStr() },
                  { label:"Kemarin",   val: yesterdayStr() },
                ].map(s => (
                  <button key={s.val} className={`date-shortcut${date===s.val?" active":""}`}
                    onClick={() => setDate(s.val)}
                    style={{ color: date===s.val?"#fff":C.muted }}>
                    {s.label}
                  </button>
                ))}
              </div>
              <input type="date" className="input-field" value={date}
                onChange={e => setDate(e.target.value)}
                style={{ marginBottom:20, colorScheme:dm?"dark":"light" }} />

              {formErr && (
                <div style={{ fontSize:12, color:"#F87171", marginBottom:12, padding:"10px 14px", background:"rgba(248,113,113,.10)", borderRadius:10, border:"1px solid rgba(248,113,113,.2)" }}>⚠ {formErr}</div>
              )}
              <button className="btn-primary" onClick={addTxn}>Simpan Transaksi</button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              HISTORY
          ══════════════════════════════════════════════════════════ */}
          {tab === "history" && (
            <div>
              {/* Summary pills */}
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ flex:1, padding:"14px", borderRadius:16, background:greenG, boxShadow:"0 4px 16px rgba(5,150,105,.3)" }}>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.7)", fontWeight:600, letterSpacing:1, marginBottom:4 }}>PEMASUKAN</div>
                  <div style={{ fontSize:18, fontWeight:800, color:"#fff" }}>{fmtShort(totalIncome)}</div>
                </div>
                <div style={{ flex:1, padding:"14px", borderRadius:16, background:redG, boxShadow:"0 4px 16px rgba(220,38,38,.3)" }}>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.7)", fontWeight:600, letterSpacing:1, marginBottom:4 }}>PENGELUARAN</div>
                  <div style={{ fontSize:18, fontWeight:800, color:"#fff" }}>{fmtShort(totalExpense)}</div>
                </div>
              </div>

              {/* Filters */}
              <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
                {[["all","Semua"],["income","Masuk"],["expense","Keluar"]].map(([v,l]) => (
                  <button key={v} className="chip" onClick={() => setFT(v)} style={{ padding:"6px 14px", borderRadius:50, border:"none", background:filterType===v?(v==="income"?greenG:v==="expense"?redG:accentG):(dm?"rgba(255,255,255,.07)":"rgba(0,0,0,.05)"), color:filterType===v?"#fff":C.muted, fontSize:12, fontWeight:600 }}>
                    {l}
                  </button>
                ))}
              </div>

              {/* Grouped list */}
              {filtered.length === 0 ? (
                <div style={{ textAlign:"center", padding:"56px 0", color:C.dim }}>
                  <div style={{ fontSize:40, marginBottom:12, opacity:.4 }}>📭</div>
                  <div style={{ fontSize:14, fontWeight:600, color:C.muted }}>Tidak ada transaksi</div>
                </div>
              ) : (
                groupTxnsByDate(filtered).map(([dateStr, items]) => {
                  const isToday     = dateStr === todayStr();
                  const isYesterday = dateStr === yesterdayStr();
                  const dayIncome  = items.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
                  const dayExpense = items.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
                  return (
                    <div key={dateStr}>
                      <div className="date-group-label">
                        <span>{isToday ? "Hari ini" : isYesterday ? "Kemarin" : fmtDate(dateStr)}</span>
                        <span style={{ marginLeft:"auto", fontWeight:600, fontSize:10, letterSpacing:.5 }}>
                          {dayIncome > 0 && <span style={{ color:"#34D399" }}>+{fmtShort(dayIncome)} </span>}
                          {dayExpense > 0 && <span style={{ color:"#F87171" }}>-{fmtShort(dayExpense)}</span>}
                        </span>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:4 }}>
                        {items.map(t => (
                          <TxnRow key={t.id} t={t} C={C} deleting={deletingId===t.id} onDelete={deleteTxn} />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      )}

      {/* Bottom Nav */}
      {ready && (
        <nav className="nav">
          <button className="nav-item" onClick={() => setTab("dashboard")} style={{ color:tab==="dashboard"?accent:C.dim }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
              </svg><span>Ringkasan</span>
          </button>
          <button className={`fab${tab==="add"?" active-tab":""}`} onClick={() => setTab(tab === "add" ? "dashboard" : "add")}>
            <span style={{ fontSize:tab==="add"?20:28, transition:"font-size .2s" }}>{tab==="add"?"✕":"+"}</span>
          </button>
          <button className="nav-item" onClick={() => setTab("history")} style={{ color:tab==="history"?accent:C.dim }}>
            <span style={{ fontSize:22 }}>≡</span><span>Riwayat</span>
          </button>
        </nav>
      )}
    </div>
  );
}

// ─── TxnRow ───────────────────────────────────────────────────────────────────

function TxnRow({ t, C, deleting, onDelete }) {
  const cat = ALL_CATS.find(c => c.id === t.catId) || { icon:"✦", color:"#94A3B8", label:"Lainnya" };
  return (
    <div className={`txn-row${deleting?" removing":""}`} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 14px" }}>
      <div style={{ width:42, height:42, borderRadius:13, flexShrink:0, background:`${cat.color}22`, border:`1.5px solid ${cat.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
        {cat.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.desc}</div>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
          <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:50, background:`${cat.color}22`, color:cat.color, letterSpacing:.5 }}>{cat.label}</span>
          <span style={{ fontSize:10, color:C.dim }}>{fmtDate(t.date)}</span>
        </div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontSize:15, fontWeight:800, color:t.type==="income"?"#34D399":"#F87171" }}>
          {t.type==="income"?"+":"-"}{fmtShort(t.amount)}
        </div>
      </div>
      <button className="del" onClick={() => onDelete(t.id)} style={{ width:28, height:28, borderRadius:8, border:"1px solid rgba(248,113,113,.25)", background:"rgba(248,113,113,.10)", color:"#F87171", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>×</button>
    </div>
  );
}
