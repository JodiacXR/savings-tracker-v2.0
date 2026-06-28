import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, Plus, Trash2, Target, Calendar, Coins, Sparkles } from "lucide-react";

const GOAL = 50000;
const END_DATE = "2026-07-26";
const DAILY_EXPENSE = 180;
const EUR_TO_KES = 147.5;
const SESSION_RATE_EUR = 10;
const STORAGE_KEY = "savings-tracker-entries";

function daysBetween(a, b) {
  const ms = new Date(b) - new Date(a);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function formatKES(n) {
  return "KSh " + Math.round(n).toLocaleString();
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthLabel(dateString) {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en", { month: "short", year: "numeric" });
}

export default function SavingsTracker() {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [sessions, setSessions] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch (e) {
      // no entries yet, or corrupted — start fresh
    } finally {
      setLoaded(true);
    }
  }, []);

  const persist = useCallback((next) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      setError("Couldn't save — your browser may be blocking storage.");
    }
  }, []);

  const addEntry = () => {
    const n = parseFloat(sessions);
    if (!n || n <= 0) {
      setError("Enter how many sessions you did this week.");
      return;
    }
    setError("");
    const earnedEUR = n * SESSION_RATE_EUR;
    const earnedKES = earnedEUR * EUR_TO_KES;
    const expensesKES = DAILY_EXPENSE * 7;
    const netKES = earnedKES - expensesKES;

    const entry = {
      id: Date.now(),
      date: todayISO(),
      sessions: n,
      earnedKES: Math.round(earnedKES),
      expensesKES: Math.round(expensesKES),
      netKES: Math.round(netKES),
      note: note.trim(),
    };

    const next = [entry, ...entries];
    setEntries(next);
    persist(next);
    setSessions("");
    setNote("");
  };

  const removeEntry = (id) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    persist(next);
  };

  const totalSaved = entries.reduce((sum, e) => sum + e.netKES, 0);
  const progress = Math.max(0, Math.min(100, (totalSaved / GOAL) * 100));
  const remaining = Math.max(0, GOAL - totalSaved);

  const today = todayISO();
  const daysLeft = Math.max(0, daysBetween(today, END_DATE));
  const weeksLeft = Math.max(0.5, daysLeft / 7);
  const weeklyNeeded = remaining / weeksLeft;
  const sessionsNeeded = weeklyNeeded / (SESSION_RATE_EUR * EUR_TO_KES);
  const onTrack = remaining <= 0 || weeklyNeeded <= SESSION_RATE_EUR * EUR_TO_KES * 9.5;
  const statusLabel = remaining <= 0 ? "Goal reached" : onTrack ? "On pace" : "Needs a push";
  const statusTone = remaining <= 0 || onTrack ? "text-[#7FBF8A]" : "text-[#D98A6B]";

  const chartData = entries
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .reduce((acc, entry) => {
      const previous = acc[acc.length - 1];
      const cumulative = (previous ? previous.cumulative : 0) + entry.netKES;
      acc.push({ ...entry, cumulative });
      return acc;
    }, []);

  const chartMax = Math.max(GOAL, ...chartData.map((point) => point.cumulative), 1);
  const chartWidth = 320;
  const chartHeight = 160;
  const chartPadding = 24;
  const chartPoints = chartData.map((point, index) => {
    const x = chartPadding + (chartData.length === 1 ? chartWidth / 2 - chartPadding : (index / (chartData.length - 1)) * (chartWidth - chartPadding * 2));
    const y = chartPadding + (1 - point.cumulative / chartMax) * (chartHeight - chartPadding * 2);
    return { x, y };
  });
  const linePath = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = chartPoints.length > 0
    ? `M ${chartPoints[0].x},${chartHeight - chartPadding} L ${chartPoints.map((point) => `${point.x},${point.y}`).join(" L ")} L ${chartPoints[chartPoints.length - 1].x},${chartHeight - chartPadding} Z`
    : "";

  const monthlySummary = entries.reduce((acc, entry) => {
    const label = monthLabel(entry.date);
    const current = acc[label] || { label, total: 0, weeks: 0 };
    current.total += entry.netKES;
    current.weeks += 1;
    acc[label] = current;
    return acc;
  }, {});

  const sortedMonths = Object.values(monthlySummary).sort((a, b) => new Date(b.label) - new Date(a.label));
  const currentMonth = sortedMonths[0];
  const bestWeek = entries.reduce((best, entry) => (entry.netKES > best.netKES ? entry : best), entries[0] || { netKES: 0 });
  const averageWeek = entries.length > 0 ? Math.round(totalSaved / entries.length) : 0;

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F1410]">
        <div className="text-sm tracking-wide text-[#7A8C7E]">Loading your tracker…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(201,162,75,0.16),_transparent_30%),linear-gradient(135deg,_#071009_0%,_#0F1410_100%)] pb-10 text-[#E8EDE6] font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        .tabular { font-variant-numeric: tabular-nums; }
      `}</style>

      <div className="font-body mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-[#273129] bg-[#0F1510]/90 shadow-[0_20px_80px_rgba(0,0,0,0.4)] backdrop-blur">
          <div className="border-b border-[#212A22] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Coins size={18} className="text-[#C9A24B]" />
                  <span className="font-display text-[11px] uppercase tracking-[0.24em] text-[#7A8C7E]">
                    Savings Goal
                  </span>
                </div>
                <h1 className="font-display text-3xl font-bold tabular sm:text-4xl">
                  {formatKES(GOAL)}
                </h1>
                <p className="mt-2 text-sm text-[#7A8C7E]">
                  by 26 July 2026 &middot; {daysLeft} day{daysLeft === 1 ? "" : "s"} left
                </p>
              </div>

              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] ${remaining <= 0 || onTrack ? "border-[#2A4030] bg-[#15211A] text-[#7FBF8A]" : "border-[#43281F] bg-[#241915] text-[#D98A6B]"}`}>
                <Sparkles size={12} />
                {statusLabel}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#232C24] bg-[#161D17] p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#7A8C7E]">Saved so far</div>
                <div className="mt-2 font-display text-xl font-semibold text-[#C9A24B] tabular">
                  {formatKES(totalSaved)}
                </div>
              </div>
              <div className="rounded-2xl border border-[#232C24] bg-[#161D17] p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#7A8C7E]">Still needed</div>
                <div className="mt-2 font-display text-xl font-semibold text-[#E8EDE6] tabular">
                  {formatKES(remaining)}
                </div>
              </div>
              <div className="rounded-2xl border border-[#232C24] bg-[#161D17] p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[#7A8C7E]">This week</div>
                <div className="mt-2 font-display text-xl font-semibold text-[#7FBF8A] tabular">
                  {sessionsNeeded.toFixed(1)}x
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <div className="rounded-[24px] border border-[#232C24] bg-[#161D17] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-[#7A8C7E]">Progress</div>
                    <div className="mt-1 font-display text-2xl font-semibold text-[#C9A24B] tabular">
                      {progress.toFixed(0)}%
                    </div>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-sm ${statusTone}`}>
                    {remaining > 0 ? `${formatKES(remaining)} left` : "Complete"}
                  </div>
                </div>

                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#0F1410]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#5C7A5E] to-[#C9A24B] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[#9AA89C]">
                  {remaining > 0
                    ? `${formatKES(remaining)} to go before your target date.`
                    : "Goal reached — nice work."}
                </p>
              </div>

              <div className="rounded-[24px] border border-[#232C24] bg-[#161D17] p-5">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp size={15} className="text-[#C9A24B]" />
                  <span className="font-display text-[11px] uppercase tracking-[0.24em] text-[#9AA89C]">
                    Trend
                  </span>
                </div>

                {chartData.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#232C24] py-8 text-center text-sm text-[#5E6E60]">
                    Add a week to see your trend chart.
                  </div>
                ) : (
                  <div>
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-40 w-full">
                      <line x1={chartPadding} x2={chartWidth - chartPadding} y1={chartHeight - chartPadding} y2={chartHeight - chartPadding} stroke="#2A3A2C" strokeWidth="1" />
                      <line x1={chartPadding} x2={chartPadding} y1={chartPadding} y2={chartHeight - chartPadding} stroke="#2A3A2C" strokeWidth="1" />
                      <path d={areaPath} fill="rgba(201, 162, 75, 0.16)" />
                      <polyline points={linePath} fill="none" stroke="#C9A24B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      {chartPoints.map((point, index) => (
                        <circle key={index} cx={point.x} cy={point.y} r="4.5" fill="#E8EDE6" stroke="#C9A24B" strokeWidth="2" />
                      ))}
                    </svg>
                    <div className="mt-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[#7A8C7E]">
                      <span>{chartData[0]?.date || "—"}</span>
                      <span>{chartData[chartData.length - 1]?.date || "—"}</span>
                    </div>
                  </div>
                )}
              </div>

              {remaining > 0 && (
                <div className={`rounded-[24px] border p-5 ${onTrack ? "border-[#2A4030] bg-[#15201A]" : "border-[#43281F] bg-[#241915]"}`}>
                  <div className="flex items-center gap-2">
                    <Target size={15} className={onTrack ? "text-[#7FBF8A]" : "text-[#D98A6B]"} />
                    <span className="font-display text-[11px] uppercase tracking-[0.24em] text-[#9AA89C]">
                      Pace check
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[#E8EDE6]">
                    You need about <span className="font-semibold tabular">{sessionsNeeded.toFixed(1)} sessions/week</span> (≈ {formatKES(weeklyNeeded)}/week) for the rest of this stretch.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-[24px] border border-[#232C24] bg-[#161D17] p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Calendar size={14} className="text-[#7A8C7E]" />
                  <span className="font-display text-[11px] uppercase tracking-[0.24em] text-[#7A8C7E]">
                    Monthly summary
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[#232C24] bg-[#111713] p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#7A8C7E]">Best week</div>
                    <div className="mt-1 font-display text-lg font-semibold text-[#7FBF8A] tabular">
                      {bestWeek ? formatKES(bestWeek.netKES) : formatKES(0)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#232C24] bg-[#111713] p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#7A8C7E]">Avg / week</div>
                    <div className="mt-1 font-display text-lg font-semibold text-[#C9A24B] tabular">
                      {formatKES(averageWeek)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#232C24] bg-[#111713] p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#7A8C7E]">This month</div>
                    <div className="mt-1 font-display text-lg font-semibold text-[#E8EDE6] tabular">
                      {currentMonth ? formatKES(currentMonth.total) : formatKES(0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#232C24] bg-[#161D17] p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Plus size={15} className="text-[#7A8C7E]" />
                  <span className="font-display text-[11px] uppercase tracking-[0.24em] text-[#7A8C7E]">
                    Log this week
                  </span>
                </div>

                <label className="mb-1 block text-xs text-[#7A8C7E]">Sessions completed</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={sessions}
                  onChange={(e) => setSessions(e.target.value)}
                  placeholder="e.g. 9"
                  className="mb-3 w-full rounded-xl border border-[#2A3A2C] bg-[#0F1410] px-4 py-3 text-lg text-[#E8EDE6] outline-none transition focus:border-[#C9A24B] tabular"
                />

                <label className="mb-1 block text-xs text-[#7A8C7E]">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. picked up extra client"
                  className="mb-3 w-full rounded-xl border border-[#2A3A2C] bg-[#0F1410] px-4 py-3 text-[#E8EDE6] outline-none transition focus:border-[#C9A24B]"
                />

                {error && <p className="mb-3 text-xs text-[#D98A6B]">{error}</p>}

                <button
                  onClick={addEntry}
                  className="w-full rounded-xl bg-[#C9A24B] py-3 font-display font-semibold tracking-wide text-[#0F1410] transition-transform active:scale-[0.98]"
                >
                  Add week
                </button>

                <p className="mt-3 text-[10px] leading-relaxed text-[#5E6E60]">
                  Auto-calculates at {SESSION_RATE_EUR}€/session, {EUR_TO_KES} KSh/€, minus {formatKES(DAILY_EXPENSE)}/day expenses.
                </p>
              </div>

              <div className="rounded-[24px] border border-[#232C24] bg-[#161D17] p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Calendar size={14} className="text-[#7A8C7E]" />
                  <span className="font-display text-[11px] uppercase tracking-[0.24em] text-[#7A8C7E]">
                    History
                  </span>
                </div>

                {entries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#232C24] py-8 text-center text-sm text-[#5E6E60]">
                    No weeks logged yet.<br />Add your first one above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entries.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between rounded-xl border border-[#232C24] bg-[#111713] px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-medium tabular">
                            {e.sessions} sessions &middot; {e.date}
                          </div>
                          {e.note && <div className="mt-0.5 text-xs text-[#7A8C7E]">{e.note}</div>}
                          <div className="mt-0.5 text-xs text-[#5E6E60] tabular">
                            +{formatKES(e.earnedKES)} − {formatKES(e.expensesKES)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-display font-semibold tabular ${e.netKES >= 0 ? "text-[#7FBF8A]" : "text-[#D98A6B]"}`}>
                            {e.netKES >= 0 ? "+" : ""}
                            {formatKES(e.netKES)}
                          </span>
                          <button
                            onClick={() => removeEntry(e.id)}
                            className="p-1 text-[#5E6E60] transition hover:text-[#D98A6B]"
                            aria-label="Delete entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 border-t border-[#212A22] px-6 py-5 text-[10px] text-[#3F4D41] sm:px-8">
            <TrendingUp size={11} />
            <span>Saved in your browser &middot; only you can see this</span>
          </div>
        </div>
      </div>
    </div>
  );
}