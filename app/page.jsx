"use client";
import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

const CATEGORIES = [
  { key: "cash",  label: "Cash / Épargne",   color: "#4ADE80", icon: "💰" },
  { key: "btc",   label: "BTC / Crypto",      color: "#F59E0B", icon: "₿"  },
  { key: "etf",   label: "ETF / Actions",     color: "#60A5FA", icon: "📈" },
  { key: "immo",  label: "Immobilier",        color: "#A78BFA", icon: "🏠" },
  { key: "autre", label: "Autre",             color: "#F472B6", icon: "✦" },
];

const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

const GOALS = [
  { label: "10k — Premier immo",      amount: 10000   },
  { label: "50k — Capital sérieux",   amount: 50000   },
  { label: "100k — Accélération",     amount: 100000  },
  { label: "400k — Apport villa",     amount: 400000  },
];

function formatK(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M€";
  if (n >= 1_000)     return (n / 1_000).toFixed(1)     + "k€";
  return n + "€";
}

function getMonthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

const now          = new Date();
const currentYear  = now.getFullYear();
const currentMonth = now.getMonth();

export default function App() {
  const [months,        setMonths]        = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(currentYear, currentMonth));
  const [editing,       setEditing]       = useState({});
  const [activeTab,     setActiveTab]     = useState("overview");
  const [loaded,        setLoaded]        = useState(false);
  const [btcPrice,      setBtcPrice]      = useState(null);
  const [btcAmount,     setBtcAmount]     = useState("");

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("patrimoine-data");
      if (raw) {
        const data = JSON.parse(raw);
        setMonths(data.months || []);
        setBtcAmount(data.btcAmount || "");
      }
    } catch {}
    setLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("patrimoine-data", JSON.stringify({ months, btcAmount }));
  }, [months, btcAmount, loaded]);

  // Fetch BTC price
  useEffect(() => {
    async function fetchBTC() {
      try {
        const res  = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur");
        const data = await res.json();
        setBtcPrice(data.bitcoin.eur);
      } catch {}
    }
    fetchBTC();
    const interval = setInterval(fetchBTC, 60000);
    return () => clearInterval(interval);
  }, []);

  function getMonthData(key) {
    return months.find(m => m.key === key) || { key, entries: {}, noteMois: "" };
  }

  function updateEntry(monthKey, catKey, value) {
    setMonths(prev => {
      const exists = prev.find(m => m.key === monthKey);
      const numVal = parseFloat(value) || 0;
      if (exists) return prev.map(m => m.key === monthKey
        ? { ...m, entries: { ...m.entries, [catKey]: numVal } } : m);
      return [...prev, { key: monthKey, entries: { [catKey]: numVal }, noteMois: "" }];
    });
  }

  function updateNoteMois(monthKey, val) {
    setMonths(prev => {
      const exists = prev.find(m => m.key === monthKey);
      if (exists) return prev.map(m => m.key === monthKey ? { ...m, noteMois: val } : m);
      return [...prev, { key: monthKey, entries: {}, noteMois: val }];
    });
  }

  function totalPatrimoine(key) {
    const d = getMonthData(key);
    return Object.values(d.entries).reduce((a, b) => a + (b || 0), 0);
  }

  function buildChartData() {
    const result = [];
    for (let i = 11; i >= 0; i--) {
      const d     = new Date(currentYear, currentMonth - i, 1);
      const key   = getMonthKey(d.getFullYear(), d.getMonth());
      const label = MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2);
      const data  = getMonthData(key);
      const entry = { label, key };
      CATEGORIES.forEach(c => { entry[c.key] = data.entries[c.key] || 0; });
      entry.total = CATEGORIES.reduce((a, c) => a + (data.entries[c.key] || 0), 0);
      result.push(entry);
    }
    return result;
  }

  const chartData    = buildChartData();
  const currentData  = getMonthData(selectedMonth);
  const currentTotal = totalPatrimoine(selectedMonth);

  const prevDate  = new Date(currentYear, currentMonth - 1, 1);
  const prevKey   = getMonthKey(prevDate.getFullYear(), prevDate.getMonth());
  const prevTotal = totalPatrimoine(prevKey);
  const delta     = currentTotal - prevTotal;

  const nextGoal    = GOALS.find(g => g.amount > currentTotal);
  const prevGoal    = GOALS.filter(g => g.amount <= currentTotal).slice(-1)[0];
  const goalProgress = nextGoal
    ? ((currentTotal - (prevGoal?.amount || 0)) / (nextGoal.amount - (prevGoal?.amount || 0))) * 100
    : 100;

  const monthOptions = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - i, 1);
    monthOptions.push({
      key:   getMonthKey(d.getFullYear(), d.getMonth()),
      label: MONTHS[d.getMonth()] + " " + d.getFullYear(),
    });
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:"#0f0f0f", border:"1px solid #222", borderRadius:12, padding:"12px 16px" }}>
        <div style={{ color:"#888", fontSize:11, marginBottom:8 }}>{label}</div>
        {CATEGORIES.map(c => (
          <div key={c.key} style={{ display:"flex", justifyContent:"space-between", gap:24, marginBottom:4 }}>
            <span style={{ color:c.color, fontSize:12 }}>{c.icon} {c.label}</span>
            <span style={{ color:"#fff", fontSize:12, fontWeight:600 }}>{formatK(payload[0]?.payload[c.key] || 0)}</span>
          </div>
        ))}
        <div style={{ borderTop:"1px solid #222", marginTop:8, paddingTop:8, display:"flex", justifyContent:"space-between" }}>
          <span style={{ color:"#888", fontSize:12 }}>Total</span>
          <span style={{ color:"#fff", fontSize:13, fontWeight:700 }}>{formatK(payload[0]?.payload.total || 0)}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background:"#080808", minHeight:"100vh", fontFamily:"'DM Mono','Courier New',monospace", color:"#fff", padding:0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#333; border-radius:2px; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        input,textarea { outline:none; }
        textarea { resize:none; }
        .tab-btn { cursor:pointer; transition:all 0.2s; }
        .tab-btn:hover { color:#fff !important; }
        .month-card { cursor:pointer; transition:all 0.15s; }
        .cat-row:hover { background:#111 !important; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fadein { animation:fadeIn 0.3s ease forwards; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom:"1px solid #161616", padding:"20px 28px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:"Syne,sans-serif", fontSize:18, fontWeight:800, letterSpacing:"-0.5px" }}>
            PATRIMOINE<span style={{ color:"#4ADE80" }}>.</span>
          </div>
          <div style={{ color:"#444", fontSize:10, marginTop:2 }}>SUIVI PERSONNEL — {currentYear}</div>
        </div>
        {btcPrice && (
          <div style={{ background:"#F59E0B15", border:"1px solid #F59E0B30", borderRadius:8, padding:"6px 12px", fontSize:11, color:"#F59E0B" }}>
            ₿ {btcPrice.toLocaleString("fr-FR")} €
          </div>
        )}
        <div style={{ display:"flex", gap:6 }}>
          {["overview","saisie","objectifs"].map(tab => (
            <button key={tab} className="tab-btn" onClick={() => setActiveTab(tab)} style={{
              background: activeTab===tab ? "#fff" : "transparent",
              color:      activeTab===tab ? "#000" : "#555",
              border:"1px solid", borderColor: activeTab===tab ? "#fff" : "#222",
              borderRadius:8, padding:"6px 14px", fontSize:11,
              fontFamily:"inherit", fontWeight: activeTab===tab ? 600 : 400,
              textTransform:"uppercase", letterSpacing:"0.5px",
            }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"24px 28px" }}>

        {/* OVERVIEW */}
        {activeTab==="overview" && (
          <div className="fadein">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:24 }}>

              <div style={{ background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:16, padding:"20px 24px" }}>
                <div style={{ color:"#444", fontSize:10, textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>Patrimoine total</div>
                <div style={{ fontFamily:"Syne,sans-serif", fontSize:32, fontWeight:800, letterSpacing:"-1px" }}>{formatK(currentTotal)}</div>
                <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:11, color: delta>=0 ? "#4ADE80" : "#F87171", fontWeight:600 }}>
                    {delta>=0?"▲":"▼"} {formatK(Math.abs(delta))}
                  </span>
                  <span style={{ fontSize:10, color:"#444" }}>vs mois dernier</span>
                </div>
              </div>

              <div style={{ background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:16, padding:"20px 24px" }}>
                <div style={{ color:"#444", fontSize:10, textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>Prochain objectif</div>
                {nextGoal ? (
                  <>
                    <div style={{ fontFamily:"Syne,sans-serif", fontSize:18, fontWeight:700, color:"#4ADE80", marginBottom:8 }}>{nextGoal.label}</div>
                    <div style={{ background:"#161616", borderRadius:100, height:6, overflow:"hidden" }}>
                      <div style={{ height:"100%", background:"linear-gradient(90deg,#4ADE80,#22D3EE)", borderRadius:100, width:`${Math.min(goalProgress,100)}%`, transition:"width 0.5s ease" }} />
                    </div>
                    <div style={{ color:"#444", fontSize:10, marginTop:6 }}>{Math.round(goalProgress)}% — manque {formatK(nextGoal.amount-currentTotal)}</div>
                  </>
                ) : (
                  <div style={{ color:"#4ADE80", fontFamily:"Syne", fontSize:18, fontWeight:700 }}>Tous objectifs atteints 🎯</div>
                )}
              </div>

              <div style={{ background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:16, padding:"20px 24px" }}>
                <div style={{ color:"#444", fontSize:10, textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>Répartition</div>
                {CATEGORIES.map(c => {
                  const val = currentData.entries[c.key] || 0;
                  const pct = currentTotal>0 ? (val/currentTotal*100).toFixed(0) : 0;
                  return val>0 ? (
                    <div key={c.key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:6, height:6, borderRadius:"50%", background:c.color }} />
                        <span style={{ fontSize:11, color:"#666" }}>{c.label}</span>
                      </div>
                      <span style={{ fontSize:11, color:c.color, fontWeight:600 }}>{pct}%</span>
                    </div>
                  ) : null;
                })}
                {currentTotal===0 && <div style={{ color:"#333", fontSize:12 }}>Aucune donnée</div>}
              </div>
            </div>

            <div style={{ background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:16, padding:"20px 24px", marginBottom:24 }}>
              <div style={{ color:"#444", fontSize:10, textTransform:"uppercase", letterSpacing:"1px", marginBottom:20 }}>Évolution 12 mois</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#4ADE80" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4ADE80" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill:"#333", fontSize:10, fontFamily:"DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatK} tick={{ fill:"#333", fontSize:10, fontFamily:"DM Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#4ADE80" strokeWidth={2} fill="url(#totalGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ color:"#444", fontSize:10, textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>Historique mensuel</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8 }}>
              {[...monthOptions].reverse().map(m => {
                const t          = totalPatrimoine(m.key);
                const isSelected = m.key===selectedMonth;
                return (
                  <div key={m.key} className="month-card"
                    onClick={() => { setSelectedMonth(m.key); setActiveTab("saisie"); }}
                    style={{ background: isSelected?"#fff":"#0d0d0d", border:"1px solid", borderColor: isSelected?"#fff":"#1a1a1a", borderRadius:12, padding:"14px 12px", textAlign:"center" }}>
                    <div style={{ fontSize:10, color: isSelected?"#000":"#444", marginBottom:6, textTransform:"uppercase" }}>{m.label}</div>
                    <div style={{ fontFamily:"Syne,sans-serif", fontSize:14, fontWeight:700, color: isSelected?"#000":(t>0?"#4ADE80":"#333") }}>
                      {t>0 ? formatK(t) : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SAISIE */}
        {activeTab==="saisie" && (
          <div className="fadein">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ fontFamily:"Syne,sans-serif", fontSize:20, fontWeight:700 }}>Saisie mensuelle</div>
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{
                background:"#0d0d0d", color:"#fff", border:"1px solid #222", borderRadius:8,
                padding:"8px 12px", fontSize:12, fontFamily:"inherit", cursor:"pointer"
              }}>
                {monthOptions.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>

            {/* BTC auto-calc */}
            {btcPrice && (
              <div style={{ background:"#F59E0B08", border:"1px solid #F59E0B20", borderRadius:12, padding:"16px 20px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ color:"#F59E0B", fontSize:11, marginBottom:4 }}>₿ Calcul BTC automatique</div>
                  <div style={{ color:"#666", fontSize:11 }}>1 BTC = {btcPrice.toLocaleString("fr-FR")} €</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <input
                    type="number"
                    value={btcAmount}
                    onChange={e => {
                      setBtcAmount(e.target.value);
                      const val = parseFloat(e.target.value) * btcPrice;
                      if (!isNaN(val)) updateEntry(selectedMonth, "btc", val.toFixed(0));
                    }}
                    placeholder="Combien de BTC ?"
                    style={{ background:"#111", border:"1px solid #F59E0B40", borderRadius:8, color:"#fff", padding:"8px 12px", width:160, fontSize:13, fontFamily:"inherit", textAlign:"right" }}
                  />
                  {btcAmount && (
                    <div style={{ color:"#F59E0B", fontSize:14, fontWeight:700, minWidth:80 }}>
                      = {formatK(Math.round(parseFloat(btcAmount) * btcPrice))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:16, overflow:"hidden", marginBottom:16 }}>
              {CATEGORIES.map((c, i) => {
                const val       = currentData.entries[c.key] || "";
                const isEditing = editing[c.key];
                return (
                  <div key={c.key} className="cat-row" style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"18px 24px", borderBottom: i<CATEGORIES.length-1?"1px solid #111":"none", background:"transparent"
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:c.color+"15", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                        {c.icon}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500 }}>{c.label}</div>
                        <div style={{ fontSize:10, color:"#444", marginTop:2 }}>Valeur totale en portefeuille</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      {isEditing ? (
                        <input autoFocus type="number" defaultValue={val}
                          onBlur={e => { updateEntry(selectedMonth, c.key, e.target.value); setEditing(p => ({...p,[c.key]:false})); }}
                          onKeyDown={e => { if(e.key==="Enter") e.target.blur(); }}
                          style={{ background:"#161616", border:"1px solid "+c.color, borderRadius:8, color:"#fff", padding:"8px 12px", width:140, fontSize:14, fontFamily:"inherit", textAlign:"right" }}
                          placeholder="0"
                        />
                      ) : (
                        <div onClick={() => setEditing(p => ({...p,[c.key]:true}))} style={{
                          background:"#111", borderRadius:8, padding:"8px 16px", fontSize:14, fontWeight:600,
                          color: val ? c.color : "#333", cursor:"pointer", minWidth:120, textAlign:"right", border:"1px solid #1a1a1a"
                        }}>
                          {val ? formatK(Number(val)) : "Cliquer pour saisir"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background:"#0d0d0d", border:"1px solid #222", borderRadius:16, padding:"20px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:13, color:"#666" }}>Total — {monthOptions.find(m=>m.key===selectedMonth)?.label}</div>
              <div style={{ fontFamily:"Syne,sans-serif", fontSize:28, fontWeight:800 }}>{formatK(currentTotal)}</div>
            </div>

            <div style={{ background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:16, padding:"20px 24px" }}>
              <div style={{ color:"#444", fontSize:10, textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>Note du mois</div>
              <textarea value={currentData.noteMois||""} onChange={e => updateNoteMois(selectedMonth, e.target.value)}
                placeholder="Ce qui s'est passé ce mois-ci — trades, décisions, mindset..."
                style={{ width:"100%", background:"transparent", border:"none", color:"#888", fontSize:13, fontFamily:"inherit", lineHeight:1.7, minHeight:80 }}
              />
            </div>
          </div>
        )}

        {/* OBJECTIFS */}
        {activeTab==="objectifs" && (
          <div className="fadein">
            <div style={{ fontFamily:"Syne,sans-serif", fontSize:20, fontWeight:700, marginBottom:20 }}>Objectifs de vie</div>
            {GOALS.map((g, i) => {
              const done = currentTotal>=g.amount;
              const pct  = Math.min((currentTotal/g.amount)*100, 100);
              return (
                <div key={i} style={{ background:"#0d0d0d", border:"1px solid", borderColor: done?"#4ADE8030":"#1a1a1a", borderRadius:16, padding:"20px 24px", marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                    <div>
                      <div style={{ fontFamily:"Syne,sans-serif", fontSize:16, fontWeight:700, color: done?"#4ADE80":"#fff" }}>{g.label}</div>
                      <div style={{ color:"#444", fontSize:11, marginTop:4 }}>{formatK(g.amount)} cible</div>
                    </div>
                    <div style={{ background: done?"#4ADE8020":"#161616", color: done?"#4ADE80":"#444", borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:600 }}>
                      {done?"✓ ATTEINT":`${pct.toFixed(0)}%`}
                    </div>
                  </div>
                  <div style={{ background:"#111", borderRadius:100, height:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:100, width:`${pct}%`, background: done?"#4ADE80":"linear-gradient(90deg,#F59E0B,#4ADE80)", transition:"width 0.8s ease" }} />
                  </div>
                  {!done && <div style={{ color:"#555", fontSize:11, marginTop:8 }}>Manque {formatK(g.amount-currentTotal)}</div>}
                </div>
              );
            })}

            <div style={{ marginTop:24, background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:16, padding:"20px 24px" }}>
              <div style={{ color:"#444", fontSize:10, textTransform:"uppercase", letterSpacing:"1px", marginBottom:16 }}>Ta vision</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[
                  { icon:"🏎️", label:"Range Rover SVR",       detail:"130 000 – 160 000€" },
                  { icon:"🌊", label:"Villa vue mer PACA",     detail:"~2 000 000€"        },
                  { icon:"🏨", label:"Hôtel 4⭐ Nice",         detail:"~4 000 000€"        },
                  { icon:"💎", label:"Liberté financière",     detail:"à 28-30 ans"        },
                ].map((obj,i) => (
                  <div key={i} style={{ background:"#111", borderRadius:12, padding:16 }}>
                    <div style={{ fontSize:24, marginBottom:8 }}>{obj.icon}</div>
                    <div style={{ fontSize:13, fontWeight:600 }}>{obj.label}</div>
                    <div style={{ fontSize:11, color:"#555", marginTop:4 }}>{obj.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
