// frontend/src/pages/Analytics.jsx
// Analytics dashboard. Uses wagmi useAccount (same as App.jsx and Dashboard.jsx),
// VITE_API_URL (already ends in /api, same as Dashboard.jsx), and dependency-free SVG charts.
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import NavBar from "../components/Layout/NavBar";
import Footer from "../components/Layout/Footer";

const GOLD = "#d4af37";
const PALETTE = ["#d4af37", "#b8962e", "#8c7424", "#e6c75c", "#6b5a1c", "#f0dc9a", "#a08a3c", "#c9a227"];

const short = (w) => (w ? `${w.slice(0, 6)}…${w.slice(-4)}` : "");
const usd = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function useApi(path) {
  const [state, setState] = useState({ data: null, loading: !!path, error: null });
  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || "";
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(`${API}${path}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => live && setState({ data, loading: false, error: null }))
      .catch((error) => live && setState({ data: null, loading: false, error }));
    return () => {
      live = false;
    };
  }, [path]);
  return state;
}

/* ---------- Small presentational pieces ---------- */

function Card({ dark, title, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${
        dark ? "border-[#d4af37]/20 bg-[#121412]" : "border-[#d4af37]/30 bg-[#f7f6f0]"
      } ${className}`}
    >
      {title && (
        <h2 className={`mb-4 text-base font-bold tracking-tight ${dark ? "text-white" : "text-[#111111]"}`}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function Stat({ dark, label, value }) {
  return (
    <div className="min-w-0 flex-1 basis-[130px]">
      <p className={`text-[11px] font-semibold uppercase tracking-wider ${dark ? "text-white/50" : "text-black/50"}`}>
        {label}
      </p>
      <p
        className={`mt-1 break-words text-xl font-black sm:text-2xl ${dark ? "text-white" : "text-[#111111]"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Empty({ dark, children }) {
  return (
    <p className={`py-6 text-center text-sm ${dark ? "text-white/50" : "text-black/50"}`}>{children}</p>
  );
}

/* ---------- SVG charts (viewBox scales to any width, so 375px works) ---------- */

// Line chart: x labels every ~7 points, y ticks at 0, half, max.
function LineChart({ dark, data, xKey, yKey, height = 180 }) {
  if (!data || data.length === 0) return null;
  const W = 320;
  const H = height;
  const pad = { l: 34, r: 8, t: 10, b: 26 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const values = data.map((d) => Number(d[yKey]) || 0);
  const max = Math.max(...values, 1);
  const x = (i) => pad.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => pad.t + innerH - (v / max) * innerH;
  const points = data.map((d, i) => `${x(i)},${y(Number(d[yKey]) || 0)}`).join(" ");
  const area = `${pad.l},${pad.t + innerH} ${points} ${x(data.length - 1)},${pad.t + innerH}`;
  const step = Math.max(1, Math.ceil(data.length / 6));
  const grid = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const text = dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Line chart">
      {[0, 0.5, 1].map((t) => {
        const val = Math.round(max * t);
        const yy = y(val);
        return (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={yy} y2={yy} stroke={grid} />
            <text x={pad.l - 6} y={yy + 4} textAnchor="end" fontSize="10" fill={text}>
              {val}
            </text>
          </g>
        );
      })}
      <polygon points={area} fill={GOLD} opacity="0.12" />
      <polyline points={points} fill="none" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) =>
        i % step === 0 || i === data.length - 1 ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={text}>
            {String(d[xKey]).slice(5)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

// Donut chart with a legend list underneath (legend is what makes it readable on phones)
function Donut({ dark, items, valueKey, labelKey }) {
  const total = items.reduce((a, b) => a + (Number(b[valueKey]) || 0), 0);
  if (!total) return <Empty dark={dark}>No data yet.</Empty>;
  const R = 60;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const text = dark ? "text-white" : "text-[#111111]";
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0" role="img" aria-label="Donut chart">
        <circle cx="80" cy="80" r={R} fill="none" stroke={dark ? "#222" : "#e9e6dd"} strokeWidth="22" />
        {items.map((it, i) => {
          const frac = (Number(it[valueKey]) || 0) / total;
          const len = frac * C;
          const el = (
            <circle
              key={it[labelKey]}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth="22"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 80 80)"
            />
          );
          offset += len;
          return el;
        })}
        <text x="80" y="78" textAnchor="middle" fontSize="18" fontWeight="700" className={text} fill={dark ? "#fff" : "#111"}>
          {total}
        </text>
        <text x="80" y="96" textAnchor="middle" fontSize="10" fill={dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)"}>
          submissions
        </text>
      </svg>
      <ul className="w-full min-w-0 space-y-2">
        {items.map((it, i) => (
          <li key={it[labelKey]} className="flex min-w-0 items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-sm"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              <span className={`truncate ${dark ? "text-white/85" : "text-black/80"}`}>{it[labelKey]}</span>
            </span>
            <span className={`shrink-0 font-semibold ${text}`}>
              {it[valueKey]} ({Math.round((it[valueKey] / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Horizontal bars for the conversion funnel
function Funnel({ dark, funnel }) {
  const steps = [
    ["Enrollments", funnel.enrollments],
    ["Submissions", funnel.submissions],
    ["Winners", funnel.winners],
  ];
  const max = Math.max(...steps.map((s) => s[1]), 1);
  return (
    <div className="space-y-4">
      {steps.map(([label, n], i) => {
        const prev = i ? steps[i - 1][1] : null;
        const pct = prev ? Math.round((n / prev) * 100) : null;
        return (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className={dark ? "text-white/80" : "text-black/80"}>{label}</span>
              <span className={`font-semibold ${dark ? "text-white" : "text-[#111111]"}`}>
                {n}
                {pct !== null ? ` · ${pct}% of previous` : ""}
              </span>
            </div>
            <div className={`h-3 w-full overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-black/10"}`}>
              <div
                className="h-full rounded-full bg-[#d4af37] transition-all duration-500"
                style={{ width: `${(n / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className={`text-xs ${dark ? "text-white/45" : "text-black/50"}`}>
        Views are not tracked, so the funnel starts at enrollment.
      </p>
    </div>
  );
}

/* ---------- Page ---------- */

function Analytics({ dark, setDark }) {
  const { address, isConnected } = useAccount();
  const w = address?.toLowerCase();
  const platform = useApi("/analytics/platform");
  const creator = useApi(w ? `/analytics/creator/${w}` : null);
  const contributor = useApi(w ? `/analytics/contributor/${w}` : null);

  const p = platform.data;
  const c = creator.data;
  const k = contributor.data;

  const muted = dark ? "text-white/60" : "text-black/60";
  const heading = dark ? "text-white" : "text-[#111111]";

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        dark ? "bg-[#080908] text-white" : "bg-[#f6f5ef] text-[#111111]"
      }`}
    >
      <NavBar dark={dark} setDark={setDark} />

      <main className="relative z-10 min-h-screen pb-20 pt-24">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-10">
          <header className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]">Analytics</p>
            <h1 className={`mt-2 text-3xl font-black tracking-tight sm:text-4xl ${heading}`}>Dashboard</h1>
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${muted}`}>
              Platform totals, your bounties as a creator, and your record as a contributor.
            </p>
            <div className="mt-6 h-px bg-gradient-to-r from-[#d4af37]/60 via-[#d4af37]/25 to-transparent" />
          </header>

          {!isConnected && (
            <Card dark={dark} className="mb-6">
              <Empty dark={dark}>Connect a wallet to see your creator and contributor analytics.</Empty>
            </Card>
          )}

          {platform.error && (
            <Card dark={dark} className="mb-6">
              <p className={`text-sm ${muted}`}>Could not load platform stats. Refresh to try again.</p>
            </Card>
          )}

          {/* PLATFORM */}
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card dark={dark} title="Platform totals">
              {platform.loading ? (
                <Empty dark={dark}>Loading…</Empty>
              ) : (
                p && (
                  <div className="flex flex-wrap gap-6">
                    <Stat dark={dark} label="USDC distributed" value={usd(p.totalDistributed)} />
                    <Stat dark={dark} label="Active bounties" value={p.activeBounties} />
                    <Stat dark={dark} label="Completed bounties" value={p.completedBounties} />
                  </div>
                )
              )}
            </Card>

            <Card dark={dark} title="Top earners">
              {platform.loading ? (
                <Empty dark={dark}>Loading…</Empty>
              ) : p && p.topEarners.length ? (
                <ol className="space-y-3">
                  {p.topEarners.map((t, i) => (
                    <li key={t.wallet} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="w-5 shrink-0 text-right font-bold text-[#d4af37]">{i + 1}</span>
                        <span className="truncate font-mono">{short(t.wallet)}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-semibold">{usd(t.earned)}</span>
                        <span className={`block text-xs ${muted}`}>
                          {t.wins} win{t.wins === 1 ? "" : "s"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                p && <Empty dark={dark}>No payouts yet.</Empty>
              )}
            </Card>
          </div>

          <Card dark={dark} title="Submissions, last 30 days" className="mb-6">
            {platform.loading ? (
              <Empty dark={dark}>Loading…</Empty>
            ) : p ? (
              <LineChart dark={dark} data={p.submissionsOverTime} xKey="date" yKey="count" />
            ) : null}
          </Card>

          <Card dark={dark} title="Submissions by category" className="mb-6">
            {platform.loading ? (
              <Empty dark={dark}>Loading…</Empty>
            ) : p ? (
              <Donut dark={dark} items={p.categories} valueKey="submissions" labelKey="category" />
            ) : null}
          </Card>

          {/* CREATOR */}
          {isConnected && (
            <Card dark={dark} title="Your bounties (creator)" className="mb-6">
              {creator.loading ? (
                <Empty dark={dark}>Loading…</Empty>
              ) : c && c.bountyCount === 0 ? (
                <Empty dark={dark}>Post a bounty to see how it performs.</Empty>
              ) : (
                c && (
                  <div className="space-y-8">
                    <div className="flex flex-wrap gap-6">
                      <Stat dark={dark} label="Bounties posted" value={c.bountyCount} />
                      <Stat dark={dark} label="Avg. time to first submission" value={`${c.avgHoursToFirstSubmission}h`} />
                      <Stat
                        dark={dark}
                        label="Avg. time to claim"
                        value={c.avgHoursToClaim == null ? "n/a" : `${c.avgHoursToClaim}h`}
                      />
                    </div>

                    <div>
                      <h3 className={`mb-3 text-sm font-bold ${heading}`}>Conversion funnel</h3>
                      <Funnel dark={dark} funnel={c.funnel} />
                    </div>

                    <div>
                      <h3 className={`mb-3 text-sm font-bold ${heading}`}>Unclaimed rewards</h3>
                      {c.unclaimed == null ? (
                        <Empty dark={dark}>Claim data is unavailable right now. Refresh to try again.</Empty>
                      ) : c.unclaimed.length ? (
                        <ul className="space-y-2 text-sm">
                          {c.unclaimed.map((u, i) => (
                            <li key={i} className="flex items-center justify-between gap-3">
                              <span className="min-w-0 truncate">{u.title}</span>
                              <span className="shrink-0 font-semibold">{usd(u.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Empty dark={dark}>No rewards are sitting idle.</Empty>
                      )}
                    </div>
                  </div>
                )
              )}
            </Card>
          )}

          {/* CONTRIBUTOR */}
          {isConnected && (
            <Card dark={dark} title="Your record (contributor)" className="mb-6">
              {contributor.loading ? (
                <Empty dark={dark}>Loading…</Empty>
              ) : k && k.submissions === 0 ? (
                <Empty dark={dark}>Submit to a bounty to start building your record.</Empty>
              ) : (
                k && (
                  <div className="space-y-8">
                    <div className="flex flex-wrap gap-6">
                      <Stat dark={dark} label="Acceptance rate" value={`${k.acceptanceRate}%`} />
                      <Stat dark={dark} label="Total earned" value={usd(k.totalEarned)} />
                      <Stat dark={dark} label="Avg. reward per win" value={usd(k.avgRewardPerWin)} />
                    </div>

                    <div>
                      <h3 className={`mb-3 text-sm font-bold ${heading}`}>Cumulative earnings</h3>
                      {k.earningsTrend.length ? (
                        <LineChart dark={dark} data={k.earningsTrend} xKey="date" yKey="cumulative" height={160} />
                      ) : (
                        <Empty dark={dark}>No wins yet.</Empty>
                      )}
                    </div>

                    <div>
                      <h3 className={`mb-3 text-sm font-bold ${heading}`}>Where you win</h3>
                      {k.topCategories.length ? (
                        <Donut
                          dark={dark}
                          items={k.topCategories}
                          valueKey="wins"
                          labelKey="category"
                        />
                      ) : (
                        <Empty dark={dark}>No wins yet.</Empty>
                      )}
                    </div>
                  </div>
                )
              )}
            </Card>
          )}
        </div>
      </main>

      <Footer dark={dark} />
    </div>
  );
}

export default Analytics;
