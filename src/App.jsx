import { useState, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const INCOME_CATS = [
  { id: "gaji",      label: "Gaji",       icon: "💼", color: "#34D399" },
  { id: "freelance", label: "Freelance",  icon: "💻", color: "#60A5FA" },
  { id: "bisnis",    label: "Bisnis",     icon: "🏪", color: "#FBBF24" },
  { id: "investasi", label: "Investasi",  icon: "📈", color: "#A78BFA" },
  { id: "hadiah",    label: "Hadiah",     icon: "🎁", color: "#F472B6" },
  { id: "lainnya_in",label: "Lainnya",   icon: "✦",  color: "#94A3B8" },
];

const EXPENSE_CATS = [
  { id: "makanan",   label: "Makanan",    icon: "🍜", color: "#FB923C" },
  { id: "transport", label: "Transport",  icon: "🚗", color: "#60A5FA" },
  { id: "belanja",   label: "Belanja",    icon: "🛍️", color: "#F472B6" },
  { id: "tagihan",   label: "Tagihan",    icon: "📋", color: "#F87171" },
  { id: "hiburan",   label: "Hiburan",    icon: "🎮", color: "#A78BFA" },
  { id: "kesehatan", label: "Kesehatan",  icon: "🏥", color: "#34D399" },
  { id: "pendidikan",label: "Pendidikan", icon: "📚", color: "#FBBF24" },
  { id: "lainnya_ex",label: "Lainnya",   icon: "✦",  color: "#94A3B8" },
];

const ALL_CATS = [...INCOME_CATS, ...EXPENSE_CATS];

const SAMPLE = [
  { id: 1, type: "income",  catId: "gaji",      desc: "Gaji bulan Juni",          amount: 8500000,  date: "2026-06-01" },
  { id: 2, type: "expense", catId: "makanan",   desc: "Makan siang & dinner",      amount: 125000,   date: "2026-06-02" },
  { id: 3, type: "expense", catId: "transport", desc: "Bensin motor",              amount: 80000,    date: "2026-06-03" },
  { id: 4, type: "income",  catId: "freelance", desc: "Project website client",    amount: 2500000,  date: "2026-06-04" },
  { id: 5, type: "expense", catId: "belanja",   desc: "Beli baju di mall",         amount: 450000,   date: "2026-06-05" },
  { id: 6, type: "expense", catId: "tagihan",   desc: "Tagihan listrik PLN",       amount: 320000,   date: "2026-06-05" },
  { id: 7, type: "expense", catId: "hiburan",   desc: "Nonton bioskop",            amount: 75000,    date: "2026-06-06" },
  { id: 8, type: "expense", catId: "makanan",   desc: "Groceries minggu ini",      amount: 280000,   date: "2026-06-07" },
  { id: 9, type: "income",  catId: "investasi", desc: "Dividen saham BBRI",        amount: 350000,   date: "2026-06-08" },
  { id: 10,type: "expense", catId: "kesehatan", desc: "Vitamin & suplemen",        amount: 145000,   date: "2026-06-08" },
  { id: 11,type: "expense", catId: "transport", desc: "Grab & ojol",               amount: 95000,    date: "2026-06-09" },
  { id: 12,type: "expense", catId: "pendidikan",desc: "Langganan kursus online",   amount: 199000,   date: "2026-06-09" },
];

function fmt(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

function fmtShort(n) {
  if (n >= 1_000_000) return "Rp " + (n / 1_000_000).toFixed(1).replace(".0", "") + "jt";
  if (n >= 1_000) return "Rp " + (n / 1_000).toFixed(0) + "rb";
  return "Rp " + n;
}

function fmtDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [txns, setTxns, txnsReady]   = useStorage("keuangan-txns-v1", SAMPLE);
  const [dark, setDark, darkReady]   = useStorage("keuangan-dark-v1", true);

  const [tab, setTab]         = useState("dashboard"); // dashboard | add | history
  const [filterType, setFT]   = useState("all");
  const [filterCat, setFC]    = useState("all");
  const [deletingId, setDel]  = useState(null);
  const [showSuccess, setSuc] = useState(false);

  // form
  const [type, setType]       = useState("expense");
  const [amount, setAmount]   = useState("");
  const [desc, setDesc]       = useState("");
  const [catId, setCatId]     = useState("makanan");
  const [date, setDate]       = useState(todayStr());
  const [formErr, setFormErr] = useState("");
  const amountRef             = useRef(null);

  const dm = dark;
  const ready = txnsReady && darkReady;

  const totalIncome  = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;

  const filtered = txns
    .filter(t => filterType === "all" || t.type === filterType)
    .filter(t => filterCat === "all" || t.catId === filterCat)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // expense breakdown for chart
  const expBreakdown = EXPENSE_CATS.map(c => ({
    ...c,
    total: txns.filter(t => t.type === "expense" && t.catId === c.id).reduce((s, t) => s + t.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  function addTxn() {
    const n = parseFloat(amount.replace(/\./g, "").replace(",", "."));
    if (!n || n <= 0) { setFormErr("Nominal tidak valid"); return; }
    if (!desc.trim())  { setFormErr("Keterangan wajib diisi"); return; }
    setFormErr("");
    setTxns(prev => [{ id: Date.now(), type, catId, desc: desc.trim(), amount: n, date }, ...prev]);
    setAmount(""); setDesc(""); setDate(todayStr());
    setSuc(true); setTimeout(() => setSuc(false), 2200);
  }

  function deleteTxn(id) {
    setDel(id);
    setTimeout(() => { setTxns(prev => prev.filter(t => t.id !== id)); setDel(null); }, 350);
  }

  function handleAmountKey(e) {
    if (e.key === "Enter") { e.target.blur(); }
  }

  // ─── Theme ──────────────────────────────────────────────────────────────────
  const C = dm ? {
    bg:        "linear-gradient(160deg, #0D0B1E 0%, #12102A 50%, #0D1520 100%)",
    surface:   "#13111F",
    card:      "rgba(255,255,255,0.04)",
    cardHov:   "rgba(255,255,255,0.08)",
    border:    "rgba(255,255,255,0.08)",
    text:      "#F1F5F9",
    muted:     "#94A3B8",
    dim:       "#475569",
    input:     "rgba(255,255,255,0.07)",
    inputBdr:  "rgba(255,255,255,0.10)",
    navBg:     "rgba(13,11,30,0.90)",
    modalBg:   "#16132C",
  } : {
    bg:        "linear-gradient(160deg, #EEF2FF 0%, #F5F3FF 50%, #EFF6FF 100%)",
    surface:   "#FFFFFF",
    card:      "rgba(255,255,255,0.75)",
    cardHov:   "#FFFFFF",
    border:    "rgba(0,0,0,0.07)",
    text:      "#1E1B4B",
    muted:     "#6B7280",
    dim:       "#9CA3AF",
    input:     "#F8F9FB",
    inputBdr:  "rgba(0,0,0,0.10)",
    navBg:     "rgba(238,242,255,0.92)",
    modalBg:   "#FFFFFF",
  };

  const accent = "#7C3AED";
  const accentG = "linear-gradient(135deg, #7C3AED, #EC4899)";
  const greenG  = "linear-gradient(135deg, #059669, #34D399)";
  const redG    = "linear-gradient(135deg, #DC2626, #F87171)";

  const balanceColor = balance >= 0
    ? "linear-gradient(135deg, #34D399, #059669)"
    : "linear-gradient(135deg, #F87171, #DC2626)";

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        input, button, select { font-family: inherit; }
        input:focus, select:focus { outline: none; }
        button { cursor: pointer; }
        ::placeholder { color: ${C.dim}; }

        .orb-a {
          position: fixed; top: -100px; right: -80px; pointer-events: none; z-index: 0;
          width: 350px; height: 350px; border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.18), transparent 70%);
          animation: orb 9s ease-in-out infinite;
        }
        .orb-b {
          position: fixed; bottom: 60px; left: -60px; pointer-events: none; z-index: 0;
          width: 280px; height: 280px; border-radius: 50%;
          background: radial-gradient(circle, rgba(236,72,153,0.14), transparent 70%);
          animation: orb 12s ease-in-out infinite reverse;
        }
        @keyframes orb { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-20px)} }

        .page { position: relative; z-index: 1; max-width: 480px; margin: 0 auto; padding: 0 16px; }

        .card {
          background: ${C.card};
          border: 1px solid ${C.border};
          border-radius: 18px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .card-solid {
          background: ${C.surface};
          border: 1px solid ${C.border};
          border-radius: 18px;
          box-shadow: 0 4px 24px rgba(0,0,0,${dm ? "0.3" : "0.08"});
        }

        .txn-row {
          background: ${C.card};
          border: 1px solid ${C.border};
          border-radius: 14px;
          transition: background 0.2s, transform 0.15s;
        }
        .txn-row:hover { background: ${C.cardHov}; transform: translateX(2px); }
        .txn-row.removing { animation: rowOut 0.35s ease forwards; }
        @keyframes rowOut {
          to { opacity: 0; transform: translateX(20px); max-height: 0; padding: 0; margin: 0; border: none; }
        }
        .txn-row .del { opacity: 0; transition: opacity 0.2s; }
        .txn-row:hover .del { opacity: 1; }

        .chip {
          transition: all 0.18s cubic-bezier(.34,1.56,.64,1);
          cursor: pointer;
        }
        .chip:hover { transform: translateY(-2px); }

        .type-toggle { display: flex; border-radius: 12px; overflow: hidden; border: 1px solid ${C.border}; }
        .type-btn {
          flex: 1; padding: 11px; border: none; font-size: 13px; font-weight: 600;
          transition: background 0.2s, color 0.2s;
        }

        .nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
          background: ${C.navBg};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid ${C.border};
          display: flex; justify-content: space-around; align-items: center;
          padding: 10px 0 max(10px, env(safe-area-inset-bottom));
        }
        .nav-item {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          padding: 6px 20px; border-radius: 12px; border: none;
          background: transparent; transition: background 0.2s;
          font-size: 10px; font-weight: 600; letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .nav-item:hover { background: rgba(124,58,237,0.1); }

        .fab {
          background: ${accentG};
          box-shadow: 0 4px 20px rgba(124,58,237,0.5);
          border: none; border-radius: 18px;
          width: 56px; height: 56px;
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; color: #fff; font-weight: 300;
          transform: translateY(-10px);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .fab:hover { transform: translateY(-14px); box-shadow: 0 8px 30px rgba(124,58,237,0.6); }
        .fab.active-tab { background: ${accentG}; box-shadow: 0 4px 20px rgba(124,58,237,0.7); }

        .btn-primary {
          width: 100%; padding: 14px;
          background: ${accentG}; color: #fff; border: none;
          border-radius: 14px; font-size: 15px; font-weight: 700;
          box-shadow: 0 4px 20px rgba(124,58,237,0.4);
          transition: opacity 0.2s, transform 0.2s;
        }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary:active { transform: translateY(0); }

        .input-field {
          width: 100%; padding: 13px 16px;
          background: ${C.input}; border: 1.5px solid ${C.inputBdr};
          border-radius: 12px; color: ${C.text}; font-size: 15px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-field:focus {
          border-color: ${accent};
          box-shadow: 0 0 0 3px rgba(124,58,237,0.15);
        }

        .success-toast {
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
          background: linear-gradient(135deg,#059669,#34D399);
          color: #fff; padding: 12px 24px; border-radius: 50px;
          font-size: 13px; font-weight: 600; z-index: 999;
          box-shadow: 0 8px 24px rgba(5,150,105,0.4);
          animation: toastIn 0.3s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes toastIn {
          from { opacity:0; transform:translateX(-50%) translateY(-10px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }

        .bar-fill { transition: width 0.6s cubic-bezier(.4,0,.2,1); }
        .progress-bg {
          height: 6px; border-radius: 6px;
          background: ${dm ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"};
          overflow: hidden;
        }
      `}</style>

      <div className="orb-a" />
      <div className="orb-b" />

      {showSuccess && <div className="success-toast">✓ Transaksi berhasil disimpan</div>}

      {!ready ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: C.muted }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            border: `3px solid ${C.border}`, borderTopColor: accent,
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px",
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div className="page">

          {/* ── Header ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 20px" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.muted, textTransform: "uppercase", marginBottom: 4 }}>Catatan</div>
              <h1 style={{
                fontSize: 30, fontWeight: 900, lineHeight: 1,
                background: accentG,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>Keuangan</h1>
            </div>
            <button
              onClick={() => setDark(!dm)}
              style={{
                background: dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                border: `1px solid ${C.border}`,
                borderRadius: 50, padding: "7px 14px",
                display: "flex", alignItems: "center", gap: 7,
                color: C.muted, fontSize: 12, fontWeight: 600,
              }}
            >
              {dm ? "🌙" : "☀️"} {dm ? "Gelap" : "Terang"}
            </button>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              TAB: DASHBOARD
          ══════════════════════════════════════════════════════════════════ */}
          {tab === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Balance card */}
              <div style={{
                background: balanceColor,
                borderRadius: 22,
                padding: "28px 24px",
                boxShadow: `0 16px 48px ${balance >= 0 ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: -30, right: -30,
                  width: 150, height: 150, borderRadius: "50%",
                  background: "rgba(255,255,255,0.07)",
                }} />
                <div style={{
                  position: "absolute", bottom: -20, left: 30,
                  width: 100, height: 100, borderRadius: "50%",
                  background: "rgba(255,255,255,0.05)",
                }} />
                <div style={{ position: "relative" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", marginBottom: 10 }}>
                    Saldo Bersih
                  </div>
                  <div style={{ fontSize: 38, fontWeight: 900, color: "#fff", letterSpacing: -1, marginBottom: 20 }}>
                    {fmt(Math.abs(balance))}
                    {balance < 0 && <span style={{ fontSize: 16, marginLeft: 6, opacity: 0.7 }}>defisit</span>}
                  </div>
                  <div style={{ display: "flex", gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: 1, marginBottom: 3 }}>↑ MASUK</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{fmtShort(totalIncome)}</div>
                    </div>
                    <div style={{ width: 1, background: "rgba(255,255,255,0.2)" }} />
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: 1, marginBottom: 3 }}>↓ KELUAR</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{fmtShort(totalExpense)}</div>
                    </div>
                    <div style={{ width: 1, background: "rgba(255,255,255,0.2)" }} />
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: 1, marginBottom: 3 }}>TRANSAKSI</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{txns.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spending breakdown */}
              {expBreakdown.length > 0 && (
                <div className="card-solid" style={{ padding: "20px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase", marginBottom: 16 }}>
                    Pengeluaran per Kategori
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {expBreakdown.slice(0, 5).map(c => {
                      const pct = totalExpense > 0 ? Math.round((c.total / totalExpense) * 100) : 0;
                      return (
                        <div key={c.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 16 }}>{c.icon}</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.label}</span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtShort(c.total)}</span>
                              <span style={{ fontSize: 10, color: C.dim, marginLeft: 6 }}>{pct}%</span>
                            </div>
                          </div>
                          <div className="progress-bg">
                            <div className="bar-fill" style={{ height: "100%", width: `${pct}%`, background: c.color, borderRadius: 6 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent transactions */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>Transaksi Terakhir</span>
                  <button
                    onClick={() => setTab("history")}
                    style={{ fontSize: 12, fontWeight: 600, color: accent, background: "rgba(124,58,237,0.10)", border: "none", padding: "4px 12px", borderRadius: 50 }}
                  >
                    Lihat semua
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {txns.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map(t => (
                    <TxnRow key={t.id} t={t} C={C} deleting={deletingId === t.id} onDelete={deleteTxn} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB: ADD
          ══════════════════════════════════════════════════════════════════ */}
          {tab === "add" && (
            <div className="card-solid" style={{ padding: "24px 22px", marginTop: 4 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 22 }}>Tambah Transaksi</h2>

              {/* Type toggle */}
              <div className="type-toggle" style={{ marginBottom: 20, background: C.input }}>
                <button
                  className="type-btn"
                  onClick={() => { setType("expense"); setCatId("makanan"); }}
                  style={{
                    background: type === "expense" ? redG : "transparent",
                    color: type === "expense" ? "#fff" : C.muted,
                  }}
                >
                  ↓ Pengeluaran
                </button>
                <button
                  className="type-btn"
                  onClick={() => { setType("income"); setCatId("gaji"); }}
                  style={{
                    background: type === "income" ? greenG : "transparent",
                    color: type === "income" ? "#fff" : C.muted,
                  }}
                >
                  ↑ Pemasukan
                </button>
              </div>

              {/* Amount */}
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Nominal</label>
              <div style={{ position: "relative", marginBottom: 16 }}>
                <span style={{
                  position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                  fontSize: 14, fontWeight: 700, color: C.muted,
                }}>Rp</span>
                <input
                  ref={amountRef}
                  className="input-field"
                  value={amount}
                  onChange={e => { setAmount(e.target.value.replace(/[^0-9]/g, "")); setFormErr(""); }}
                  onKeyDown={handleAmountKey}
                  placeholder="0"
                  inputMode="numeric"
                  style={{ paddingLeft: 44, fontSize: 20, fontWeight: 700 }}
                />
              </div>

              {/* Quick amounts */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {[10000,25000,50000,100000,500000,1000000].map(v => (
                  <button
                    key={v}
                    onClick={() => setAmount(String(v))}
                    style={{
                      padding: "5px 12px", borderRadius: 50,
                      background: amount === String(v)
                        ? (type === "expense" ? redG : greenG)
                        : (dm ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"),
                      border: `1px solid ${C.border}`,
                      color: amount === String(v) ? "#fff" : C.muted,
                      fontSize: 11, fontWeight: 600,
                    }}
                  >
                    {fmtShort(v)}
                  </button>
                ))}
              </div>

              {/* Description */}
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Keterangan</label>
              <input
                className="input-field"
                value={desc}
                onChange={e => { setDesc(e.target.value); setFormErr(""); }}
                onKeyDown={e => e.key === "Enter" && addTxn()}
                placeholder="Contoh: Makan siang di warteg"
                style={{ marginBottom: 16 }}
              />

              {/* Category */}
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase", display: "block", marginBottom: 10 }}>Kategori</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {cats.map(c => (
                  <button
                    key={c.id}
                    className="chip"
                    onClick={() => setCatId(c.id)}
                    style={{
                      padding: "7px 14px", borderRadius: 50, border: "none",
                      background: catId === c.id ? c.color : (dm ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"),
                      color: catId === c.id ? "#fff" : C.muted,
                      fontSize: 12, fontWeight: 600,
                      boxShadow: catId === c.id ? `0 4px 14px ${c.color}55` : "none",
                    }}
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>

              {/* Date */}
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Tanggal</label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ marginBottom: 20, colorScheme: dm ? "dark" : "light" }}
              />

              {formErr && (
                <div style={{ fontSize: 12, color: "#F87171", marginBottom: 12, padding: "10px 14px", background: "rgba(248,113,113,0.10)", borderRadius: 10, border: "1px solid rgba(248,113,113,0.2)" }}>
                  ⚠ {formErr}
                </div>
              )}

              <button className="btn-primary" onClick={addTxn}>
                Simpan Transaksi
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              TAB: HISTORY
          ══════════════════════════════════════════════════════════════════ */}
          {tab === "history" && (
            <div>
              {/* Summary pills */}
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <div style={{
                  flex: 1, padding: "14px", borderRadius: 16,
                  background: "linear-gradient(135deg,#059669,#34D399)",
                  boxShadow: "0 4px 16px rgba(5,150,105,0.3)",
                }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>PEMASUKAN</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{fmtShort(totalIncome)}</div>
                </div>
                <div style={{
                  flex: 1, padding: "14px", borderRadius: 16,
                  background: "linear-gradient(135deg,#DC2626,#F87171)",
                  boxShadow: "0 4px 16px rgba(220,38,38,0.3)",
                }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>PENGELUARAN</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{fmtShort(totalExpense)}</div>
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {[["all","Semua"],["income","Masuk"],["expense","Keluar"]].map(([v,l]) => (
                  <button
                    key={v}
                    className="chip"
                    onClick={() => setFT(v)}
                    style={{
                      padding: "6px 14px", borderRadius: 50, border: "none",
                      background: filterType === v
                        ? (v === "income" ? greenG : v === "expense" ? redG : accentG)
                        : (dm ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"),
                      color: filterType === v ? "#fff" : C.muted,
                      fontSize: 12, fontWeight: 600,
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* List */}
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "56px 0", color: C.dim }}>
                  <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📭</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>Tidak ada transaksi</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filtered.map(t => (
                    <TxnRow key={t.id} t={t} C={C} deleting={deletingId === t.id} onDelete={deleteTxn} />
                  ))}
                </div>
              )}

              {txns.some(t => t.done) && null}
            </div>
          )}

        </div>
      )}

      {/* ── Bottom Nav ── */}
      {ready && (
        <nav className="nav">
          <button
            className="nav-item"
            onClick={() => setTab("dashboard")}
            style={{ color: tab === "dashboard" ? accent : C.dim }}
          >
            <span style={{ fontSize: 22 }}>◈</span>
            <span>Ringkasan</span>
          </button>

          <button className={`fab ${tab === "add" ? "active-tab" : ""}`} onClick={() => setTab("add")}>
            <span style={{ fontSize: tab === "add" ? 20 : 28, transition: "font-size 0.2s" }}>
              {tab === "add" ? "✕" : "+"}
            </span>
          </button>

          <button
            className="nav-item"
            onClick={() => setTab("history")}
            style={{ color: tab === "history" ? accent : C.dim }}
          >
            <span style={{ fontSize: 22 }}>≡</span>
            <span>Riwayat</span>
          </button>
        </nav>
      )}
    </div>
  );
}

// ─── Transaction Row Component ────────────────────────────────────────────────

function TxnRow({ t, C, deleting, onDelete }) {
  const cat = ALL_CATS.find(c => c.id === t.catId) || { icon: "✦", color: "#94A3B8", label: "Lainnya" };
  return (
    <div className={`txn-row${deleting ? " removing" : ""}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
      {/* Icon */}
      <div style={{
        width: 42, height: 42, borderRadius: 13, flexShrink: 0,
        background: `${cat.color}22`,
        border: `1.5px solid ${cat.color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20,
      }}>
        {cat.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {t.desc}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 50,
            background: `${cat.color}22`, color: cat.color, letterSpacing: 0.5,
          }}>
            {cat.label}
          </span>
          <span style={{ fontSize: 10, color: C.dim }}>{fmtDate(t.date)}</span>
        </div>
      </div>

      {/* Amount */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 800,
          color: t.type === "income" ? "#34D399" : "#F87171",
        }}>
          {t.type === "income" ? "+" : "-"}{fmtShort(t.amount)}
        </div>
      </div>

      {/* Delete */}
      <button
        className="del"
        onClick={() => onDelete(t.id)}
        style={{
          width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(248,113,113,0.25)",
          background: "rgba(248,113,113,0.10)", color: "#F87171",
          fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >×</button>
    </div>
  );
}
