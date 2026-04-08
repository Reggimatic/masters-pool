"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { GrRefresh } from "react-icons/gr";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const ADMIN_PASSWORD = "augusta2025";
const GOLD = "#c9a84c";

const ESPN_FLAG_CODES = {
  NI: "nir", ENG: "eng", SCO: "sco", WAL: "wal"
};

function countryFlag(code) {
  if (!code) return null;
  const upper = code.toUpperCase().trim();
  if (!upper) return null;
  const espnCode = ESPN_FLAG_CODES[upper];
  if (espnCode) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`https://a.espncdn.com/combiner/i?img=/i/teamlogos/countries/500/${espnCode}.png&h=40&w=40`} alt={upper} style={{ width: 15, height: 15, objectFit: "contain" }} />;
  }
  if (upper.length !== 2) return null;
  return String.fromCodePoint(
    ...upper.split("").map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

// ─── Picker Page ────────────────────────────────────────────────────────────

function PickerPage({ onSelect }) {
  const [tournaments, setTournaments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: g }] = await Promise.all([
        supabase.from("tournaments").select("*").order("created_at", { ascending: false }),
        supabase.from("groups").select("*").order("created_at")
      ]);
      setTournaments(t || []);
      setGroups(g || []);
      if (t?.length === 1) setSelectedTournament(t[0].id);
      if (g?.length === 1) setSelectedGroup(g[0].id);
      setLoading(false);
    })();
  }, []);

  const canGo = selectedTournament && selectedGroup;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #22563C 0%, #173C29 100%)",
      color: "#e8dfc4",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>⛳</div>
      <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "clamp(24px, 5vw, 40px)", color: "#fff", margin: "0 0 40px", fontWeight: 400, textAlign: "center" }}>
        Select Your Pool
      </h1>

      {loading ? (
        <div style={{ color: "#555" }}>Loading...</div>
      ) : (
        <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Tournament selector */}
          <div>
            <label style={{ fontSize: 11, color: "rgb(233, 255, 194)", letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Tournament
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tournaments.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTournament(t.id)}
                  style={{
                    background: selectedTournament === t.id ? "rgb(55, 128, 91)" : "rgb(14, 39, 26)",
                    border: selectedTournament === t.id ? "1px solid rgb(91, 211, 151)" : "none",
                    borderRadius: 10, padding: "14px 18px", cursor: "pointer",
                    color: selectedTournament === t.id ? "#fff" : "rgb(156, 163, 175)",
                    fontSize: 16, textAlign: "left",
                    transition: "all 0.2s",
                  }}
                >
                  {t.display_name}
                </button>
              ))}
            </div>
          </div>

          {/* Group selector */}
          <div>
            <label style={{ fontSize: 11, color: "rgb(233, 255, 194)", letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Group
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g.id)}
                  style={{
                    background: selectedGroup === g.id ? "rgb(55, 128, 91)" : "rgb(14, 39, 26)",
                    border: selectedGroup === g.id ? "1px solid rgb(91, 211, 151)" : "none",
                    borderRadius: 10, padding: "14px 18px", cursor: "pointer",
                    color: selectedGroup === g.id ? "#fff" : "rgb(156, 163, 175)",
                    fontSize: 16, textAlign: "left",
                    transition: "all 0.2s",
                  }}
                >
                  {g.display_name}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => canGo && onSelect(selectedTournament, selectedGroup)}
            disabled={!canGo}
            style={{
              marginTop: 8,
              background: canGo ? "rgb(252, 227, 0)" : "none",
              border: canGo ? "none" : "1px solid rgb(67, 170, 119)",
              borderRadius: 10, padding: "14px",
              color: canGo ? "rgb(13, 31, 20)" : "rgb(71, 137, 104)",
              fontSize: 16, fontWeight: 700,
              cursor: canGo ? "pointer" : "default",
              transition: "all 0.2s",
            }}
          >
            View Leader Board →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Shared UI Components ────────────────────────────────────────────────────

function NextUpdateTimer({ lastUpdated, onRefresh }) {
  const [remaining, setRemaining] = useState(5 * 60);
  useEffect(() => {
    const calc = () => Math.max(0, 5 * 60 - Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    setRemaining(calc());
    const interval = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);
  const mins = Math.ceil(remaining / 60);
  return (
    <span style={{ color: "#5BD397", fontSize: 11 }}>
      Next update: {mins}m
      <button onClick={onRefresh} style={{ background: "rgb(26, 68, 46)", border: "1px solid rgb(51, 124, 87)", color: "#ffffff", borderRadius: 4, padding: "3px 5px", marginLeft: 8, fontSize: 12, cursor: "pointer", lineHeight: 1, display: "inline-flex", alignItems: "center" }}><GrRefresh size={11} /></button>
    </span>
  );
}

function ScoreDisplay({ relative, isScoring }) {
  if (relative === null || relative === undefined) return <span style={{ color: "#999" }}>—</span>;
  const color = relative < 0 ? "#BA0C2F" : "#2E7450";
  const label = relative === 0 ? "E" : relative > 0 ? `+${relative}` : `${relative}`;
  return <span style={{ color, fontWeight: isScoring ? 700 : 400 }}>{label}</span>;
}

function GolferRow({ golfer, isCut, isWithdrawn, isPenalty, isDropped, onClick, isExpandable, isExpanded }) {
  const flag = isPenalty ? "" : countryFlag(golfer.country);
  const inactive = isCut || isWithdrawn;
  return (
    <div onClick={isExpandable ? onClick : undefined} style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 12px 6px 8px",
      background: (isDropped || inactive) ? "rgb(243, 240, 236)" : "transparent",
      borderBottom: "1px solid #D8D8D8",
      cursor: isExpandable ? "pointer" : "default",
    }}>
      <span style={{ fontSize: 10, width: 10, flexShrink: 0, color: "#807D7B", textAlign: "center", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.25s", display: "inline-block", lineHeight: 1 }}>
        {isExpandable ? "▼" : ""}
      </span>
      <span style={{ fontSize: 13, color: "#408C64", minWidth: 34, textAlign: "right", fontFamily: "monospace", textDecoration: isCut ? "line-through" : "none", flexShrink: 0 }}>
        {inactive || isPenalty ? "—" : (golfer.position || "—")}
      </span>
      <span style={{ fontSize: 15, minWidth: 20, textAlign: "center", flexShrink: 0, lineHeight: 1 }}>{flag}</span>
      <span style={{ flex: 1, fontSize: 13, color: inactive ? "#8B8885" : isPenalty ? "#999" : isDropped ? "#8B8885" : "#63605E", fontStyle: (inactive || isPenalty) ? "italic" : "normal", letterSpacing: 0.2, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {isPenalty ? "Missed cut penalty" : golfer.name}
        {inactive && !isPenalty && <span style={{ fontSize: 11, marginLeft: 6, color: "#8B8885" }}>{isWithdrawn ? "(WD)" : "(MC)"}</span>}
      </span>
      <span style={{ fontSize: 13, minWidth: 36, textAlign: "right", fontFamily: "monospace", flexShrink: 0 }}>
        {!inactive && !isPenalty && golfer.today !== null && golfer.today !== undefined
          ? <span style={{ color: golfer.today < 0 ? "#BA0C2F" : "#2E7450", fontWeight: 400 }}>
              {golfer.today === 0 ? "E" : golfer.today > 0 ? `+${golfer.today}` : `${golfer.today}`}
            </span>
          : <span style={{ color: "#ccc" }}>{isWithdrawn ? "—" : "—"}</span>}
      </span>
      <span style={{ fontSize: 13, minWidth: 28, textAlign: "right", fontFamily: "monospace", color: "#63605E", flexShrink: 0 }}>
        {!inactive && !isPenalty ? (golfer.thru || "—") : ""}
      </span>
      <span style={{ fontSize: 13, minWidth: 36, textAlign: "right", flexShrink: 0 }}>
        {!inactive && <ScoreDisplay relative={golfer.relative} isScoring={!isDropped && !inactive && !isPenalty} />}
      </span>
    </div>
  );
}

function GolferRowHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px 6px 12px", borderBottom: "2px solid #1a472a" }}>
      <span style={{ fontSize: 12, color: "#888", minWidth: 34, textAlign: "right", flexShrink: 0, fontWeight: 600, letterSpacing: 1 }}>POS</span>
      <span style={{ fontSize: 12, color: "#888", minWidth: 20, flexShrink: 0 }}></span>
      <span style={{ flex: 1, fontSize: 12, color: "#888", fontWeight: 600, letterSpacing: 1 }}>PLAYER</span>
      <span style={{ fontSize: 10, color: "#888", minWidth: 36, textAlign: "right", flexShrink: 0, fontWeight: 600, letterSpacing: 1 }}>TODAY</span>
      <span style={{ fontSize: 10, color: "#888", minWidth: 28, textAlign: "right", flexShrink: 0, fontWeight: 600, letterSpacing: 1 }}>THRU</span>
      <span style={{ fontSize: 10, color: "#888", minWidth: 36, textAlign: "right", flexShrink: 0, fontWeight: 600, letterSpacing: 1 }}>SCORE</span>
    </div>
  );
}

const bioCache = {};

function Scorecard({ holeScores, coursePar, golferName, espnId, country }) {
  const hasHoleData = holeScores && holeScores.length > 0;
  const [bio, setBio] = useState(bioCache[espnId] || null);

  useEffect(() => {
    if (!espnId || bioCache[espnId]) return;
    fetch(`https://site.web.api.espn.com/apis/common/v3/sports/golf/pga/athletes/${espnId}`)
      .then(r => r.json())
      .then(d => {
        const a = d.athlete || d;
        // Reformat DOB from ESPN's d/m/yyyy to m/d/yyyy
        let dob = a.displayDOB || null;
        if (dob) {
          const parts = dob.split("/");
          if (parts.length === 3) dob = `${parts[1]}/${parts[0]}/${parts[2]}`;
        }
        const info = {
          headshot: a.headshot?.href || null,
          dob,
          age: a.age || null,
          college: a.college?.name || null,
          turnedPro: a.turnedPro || null,
          flagUrl: a.flag?.href || null,
          country: a.flag?.alt || null,
        };
        bioCache[espnId] = info;
        setBio(info);
      })
      .catch(() => {});
  }, [espnId]);

  const cellW = 27;
  const labelW = 42;

  const getCellBg = (toPar) => {
    if (toPar <= -2) return "rgba(252, 227, 0, 0.35)";
    if (toPar === -1) return "rgba(91, 211, 151, 0.3)";
    if (toPar === 1) return "rgba(220, 60, 60, 0.25)";
    if (toPar >= 2) return "rgba(220, 60, 60, 0.45)";
    return "transparent";
  };

  const cellStyle = (toPar) => ({
    width: cellW, minWidth: cellW, textAlign: "center", fontSize: 11,
    padding: "4px 0", background: getCellBg(toPar), color: "rgb(99, 96, 94)", fontWeight: 400,
  });

  const headerCell = {
    width: cellW, minWidth: cellW, textAlign: "center", fontSize: 11,
    padding: "4px 0", color: "rgb(65, 65, 65)", fontWeight: 700,
  };

  const subtotalCell = () => ({
    width: cellW + 4, minWidth: cellW + 4, textAlign: "center", fontSize: 11,
    padding: "4px 0", color: "rgb(99, 96, 94)", fontWeight: 400,
  });

  const borderR = "1px solid #ddd";

  const labelStyle = {
    width: labelW, minWidth: labelW, fontSize: 11, fontWeight: 700,
    padding: "4px 4px", color: "rgb(65, 65, 65)", textAlign: "left",
    position: "sticky", left: 0, background: "#fff", zIndex: 1,
    borderRight: borderR,
  };

  // Derive par from coursePar or from holeScores
  const par = hasHoleData ? (coursePar || (() => {
    for (const r of holeScores) {
      if (r.holes.length === 18) return r.holes.map(h => h.par);
    }
    return null;
  })()) : null;

  const parOut = par ? par.slice(0, 9).reduce((s, v) => s + v, 0) : null;
  const parIn = par ? par.slice(9, 18).reduce((s, v) => s + v, 0) : null;
  const parTotal = par ? parOut + parIn : null;

  const subtotalHeaderCell = { ...headerCell, width: cellW + 4, minWidth: cellW + 4, borderLeft: borderR };
  const subtotalDataCell = { ...subtotalCell(), borderLeft: borderR };

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <div style={{ background: "#fff", borderBottom: "1px solid rgb(42, 170, 106)", padding: "0 0 6px" }}>
      {espnId && bio && (
        <div style={{ display: "flex", gap: 12, padding: "10px 12px" }}>
          {bio.headshot && (
            <img
              src={`https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/${espnId}.png&w=96&h=70`}
              alt={golferName}
              style={{ width: 96, height: 70, objectFit: "cover", borderRadius: 4, background: "#eee", flexShrink: 0 }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          )}
          <div style={{ fontSize: 11, color: "#63605E", lineHeight: 1.7, marginTop: -2 }}>
            {bio.country && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <span style={{ fontSize: 15 }}>{countryFlag(country)}</span>
                {bio.country}
              </div>
            )}
            {bio.dob && <div style={{ fontSize: 10, marginTop: -2 }}><span style={{ color: "#63605E" }}>Birthdate:</span> <span style={{ color: "#999" }}>{bio.dob}{bio.age ? ` (${bio.age})` : ""}</span></div>}
            {bio.college && <div style={{ fontSize: 10 }}><span style={{ color: "#63605E" }}>College:</span> <span style={{ color: "#999" }}>{bio.college}</span></div>}
            {bio.turnedPro && <div style={{ fontSize: 10 }}><span style={{ color: "#63605E" }}>Turned Pro:</span> <span style={{ color: "#999" }}>{bio.turnedPro}</span></div>}
          </div>
        </div>
      )}
      {hasHoleData && (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", fontSize: 11 }}>
          <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap", minWidth: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #d8d8d8" }}>
                <td style={labelStyle}>HOLE</td>
                {holes.slice(0, 9).map(h => <td key={h} style={headerCell}>{h}</td>)}
                <td style={{ ...subtotalHeaderCell, borderRight: borderR }}>OUT</td>
                {holes.slice(9, 18).map(h => <td key={h} style={headerCell}>{h}</td>)}
                <td style={subtotalHeaderCell}>IN</td>
                <td style={subtotalHeaderCell}>TOT</td>
              </tr>
              {par && (
                <tr style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ ...labelStyle, color: "rgb(99, 96, 94)", fontWeight: 400 }}>PAR</td>
                  {par.slice(0, 9).map((p, i) => <td key={i} style={cellStyle(0)}>{p}</td>)}
                  <td style={{ ...subtotalDataCell, borderRight: borderR }}>{parOut}</td>
                  {par.slice(9, 18).map((p, i) => <td key={i + 9} style={cellStyle(0)}>{p}</td>)}
                  <td style={subtotalDataCell}>{parIn}</td>
                  <td style={subtotalDataCell}>{parTotal}</td>
                </tr>
              )}
            </thead>
            <tbody>
              {holeScores.map((round) => {
                const holeMap = new Map(round.holes.map(h => [h.hole, h]));
                return (
                  <tr key={round.round} style={{ borderTop: "1px solid #eee", background: "rgb(250, 250, 250)" }}>
                    <td style={{ ...labelStyle, color: "rgb(99, 96, 94)", fontWeight: 400, background: "rgb(250, 250, 250)" }}>R{round.round}</td>
                    {holes.slice(0, 9).map(h => {
                      const d = holeMap.get(h);
                      return <td key={h} style={cellStyle(d?.toPar ?? 0)}>{d?.strokes ?? ""}</td>;
                    })}
                    <td style={{ ...subtotalDataCell, borderRight: borderR }}>{round.out ?? ""}</td>
                    {holes.slice(9, 18).map(h => {
                      const d = holeMap.get(h);
                      return <td key={h} style={cellStyle(d?.toPar ?? 0)}>{d?.strokes ?? ""}</td>;
                    })}
                    <td style={subtotalDataCell}>{round.in ?? ""}</td>
                    <td style={subtotalDataCell}>{round.total ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, rank, cutHappened, worstMadeCut, expanded, onToggle, avatarUrl, chartColor, expandedGolfers, onGolferToggle, coursePar, isArchived }) {
  const madeCut = team.golfers.filter(g => !g.missedCut);
  const missedCut = team.golfers.filter(g => g.missedCut);
  let scoringGolfers = [], droppedGolfers = [], penaltySlots = 0;

  if (!cutHappened) {
    const eligible = team.golfers.filter(g => !g.withdrawn);
    const withdrawn = team.golfers.filter(g => g.withdrawn);
    const sorted = [...eligible].sort((a, b) => {
      if (a.relative === null && b.relative === null) return 0;
      if (a.relative === null) return 1;
      if (b.relative === null) return -1;
      return a.relative - b.relative;
    });
    scoringGolfers = sorted.slice(0, 4);
    droppedGolfers = [...sorted.slice(4), ...withdrawn];
  } else {
    const sortedMadeCut = [...madeCut].sort((a, b) => {
      if (a.relative === null && b.relative === null) return 0;
      if (a.relative === null) return 1;
      if (b.relative === null) return -1;
      return a.relative - b.relative;
    });
    scoringGolfers = sortedMadeCut.slice(0, 4);
    penaltySlots = Math.max(0, 4 - scoringGolfers.length);
    droppedGolfers = [...sortedMadeCut.slice(4), ...missedCut];
  }

  const total = scoringGolfers.reduce((sum, g) => sum + (g.relative ?? 0), 0) + penaltySlots * (worstMadeCut ?? 0);
  const totalLabel = total === 0 ? "E" : total > 0 ? `+${total}` : `${total}`;
  const totalColor = total < 0 ? "#BA0C2F" : "#2E7450";
  const formatScore = (s) => s === null || s === undefined ? "" : s === 0 ? "E" : s > 0 ? `+${s}` : `${s}`;
  const previewItems = scoringGolfers.map((g, i) => {
    const lastName = g.name.split(" ").pop();
    return <span key={i}>{i > 0 && ", "}{lastName}</span>;
  });

  return (
    <div style={{ background: expanded ? "#fff" : "rgb(243, 240, 236)", borderRadius: 7, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", overflow: "hidden" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer", userSelect: "none", background: "rgb(243, 240, 236)", borderRadius: expanded ? "7px 7px 0 0" : 7 }}>
        <div style={{ width: 7, height: 44, borderRadius: 2, background: chartColor, flexShrink: 0, marginLeft: -5, marginRight: -2 }} />
        {avatarUrl ? (
          <img src={avatarUrl} alt={team.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 8, background: "#1a472a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>
            ⛳
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: expanded ? 24 : 18, color: "#143625", fontWeight: 700, letterSpacing: 0.5 }}>{team.name}</div>
          {!expanded && previewItems.length > 0 && (
            <div style={{ fontSize: 11, color: "#888", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {previewItems}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: totalColor }}>{totalLabel}</div>
          <span style={{ color: "#807D7B", fontSize: 12, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s", display: "inline-block", lineHeight: 1 }}>▼</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateRows: expanded ? "1fr" : "0fr", transition: "grid-template-rows 0.25s ease" }}>
        <div style={{ overflow: "hidden" }}>
        <div style={{ padding: 10 }}>
          <div>
            <GolferRowHeader />
            {scoringGolfers.map(g => (
              <div key={g.name}>
                <GolferRow golfer={g} isCut={false} isPenalty={false} isDropped={false} onClick={() => onGolferToggle?.(g.name)} isExpandable={!isArchived && (g.holeScores?.length > 0 || g.espnId)} isExpanded={expandedGolfers?.has(g.name)} />
                {expandedGolfers?.has(g.name) && <Scorecard holeScores={g.holeScores} coursePar={coursePar} golferName={g.name} espnId={g.espnId} country={g.country} />}
              </div>
            ))}
            {Array.from({ length: penaltySlots }).map((_, i) => <GolferRow key={`penalty-${i}`} golfer={{ relative: worstMadeCut }} isCut={false} isPenalty={true} isDropped={false} />)}
            {droppedGolfers.map(g => (
              <div key={g.name}>
                <GolferRow golfer={g} isCut={cutHappened && g.missedCut} isWithdrawn={g.withdrawn} isPenalty={false} isDropped={true} onClick={() => onGolferToggle?.(g.name)} isExpandable={!isArchived && (g.holeScores?.length > 0 || g.espnId)} isExpanded={expandedGolfers?.has(g.name)} />
                {expandedGolfers?.has(g.name) && <Scorecard holeScores={g.holeScores} coursePar={coursePar} golferName={g.name} espnId={g.espnId} country={g.country} />}
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

// ─── Golfer Combobox ─────────────────────────────────────────────────────────

function GolferCombobox({ value, onChange, roster, selectedGolfers, inputStyle, placeholder }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const ref = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = roster.length > 0 && query.length > 0
    ? roster.filter(g =>
        !selectedGolfers.has(g.name) &&
        g.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 12)
    : [];

  // Reset highlight when filtered list changes
  useEffect(() => { setHighlightIdx(-1); }, [filtered.length, query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIdx];
      if (item) item.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx]);

  const handleSelect = (golfer) => {
    setQuery(golfer.name);
    setOpen(false);
    setHighlightIdx(-1);
    onChange(golfer.name, golfer.country);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(val.length > 0 && roster.length > 0);
    // If cleared, also clear the country
    if (!val) onChange("", "");
  };

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx(i => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx(i => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if ((e.key === "Enter" || e.key === "Tab" || e.key === " ") && highlightIdx >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIdx]);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <input
        style={{ ...inputStyle, width: "100%" }}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (query.length > 0 && roster.length > 0) setOpen(true); }}
      />
      {open && filtered.length > 0 && (
        <div ref={listRef} style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 60,
          background: "#0d1f14", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 6,
          maxHeight: 200, overflowY: "auto", marginTop: 2, boxShadow: "0 4px 16px rgba(0,0,0,0.4)"
        }}>
          {filtered.map((g, i) => (
            <div
              key={g.name}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(g); }}
              style={{
                padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#e8dfc4",
                display: "flex", alignItems: "center", gap: 8,
                borderBottom: "1px solid rgba(201,168,76,0.08)",
                background: i === highlightIdx ? "rgba(201,168,76,0.15)" : "transparent"
              }}
              onMouseEnter={() => setHighlightIdx(i)}
              onMouseLeave={() => setHighlightIdx(-1)}
            >
              <span style={{ fontSize: 16, minWidth: 22, textAlign: "center" }}>{countryFlag(g.country)}</span>
              <span>{g.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Admin Panel ─────────────────────────────────────────────────────────────

function EditableName({ value, onSave, style }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
    else setDraft(value);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        style={{ ...style, background: "rgb(14, 39, 26)", border: "none", borderRadius: 4, padding: "2px 6px", outline: "none", width: "100%" }}
      />
    );
  }

  return (
    <div onClick={() => { setDraft(value); setEditing(true); }} style={{ ...style, cursor: "pointer" }} title="Click to edit">
      {value}
    </div>
  );
}

function AdminPanel({ picks, tournament, group, tournamentName, groupName, allGroups, onSave, onClose, avatars, onAvatarsChange, onWithdrawalsChange }) {
  const emptyGolfer = { name: "", country: "" };
  const [tab, setTab] = useState("picks");
  const [activeGroup, setActiveGroup] = useState(group);
  const activeGroupName = (allGroups || []).find(g => g.id === activeGroup)?.display_name || activeGroup;
  const [teams, setTeams] = useState(
    picks.length > 0
      ? picks.map(p => ({ name: p.name, golfers: [...p.golfers.map(g => ({ name: g.name || g, country: g.country || "" })), ...Array(6).fill(null).map(() => ({ ...emptyGolfer }))].slice(0, 6) }))
      : [{ name: "", golfers: Array(6).fill(null).map(() => ({ ...emptyGolfer })) }]
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);

  // Reload picks when switching groups
  useEffect(() => {
    if (activeGroup === group) return; // initial group already loaded via props
    (async () => {
      const { data } = await supabase.from("picks").select("*").eq("tournament", tournament).eq("group_name", activeGroup);
      if (data && data.length > 0) {
        setTeams(data.map(p => ({
          name: p.participant,
          golfers: [...(Array.isArray(p.golfers) ? p.golfers.map(g => typeof g === "string" ? { name: g, country: "" } : g) : []), ...Array(6).fill(null).map(() => ({ ...emptyGolfer }))].slice(0, 6)
        })));
      } else {
        setTeams([{ name: "", golfers: Array(6).fill(null).map(() => ({ ...emptyGolfer })) }]);
      }
    })();
  }, [activeGroup]);

  const uploadAvatar = async (participantName, file) => {
    if (!participantName.trim()) return;
    setUploading(participantName);
    const ext = file.name.split(".").pop();
    const path = `${participantName.trim().toLowerCase().replace(/\s+/g, "-")}.${ext}`;
    // Remove old file if it exists
    await supabase.storage.from("avatars").remove([path]);
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadErr) { console.error("Upload error:", uploadErr.message); setUploading(null); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = publicUrl + "?v=" + Date.now();
    await supabase.from("avatars").upsert({ participant: participantName.trim(), image_url: url });
    onAvatarsChange(prev => ({ ...prev, [participantName.trim()]: url }));
    setUploading(null);
  };

  const removeAvatar = async (participantName) => {
    setUploading(participantName);
    const currentUrl = avatars[participantName];
    if (currentUrl) {
      const urlPath = currentUrl.split("/avatars/")[1]?.split("?")[0];
      if (urlPath) await supabase.storage.from("avatars").remove([urlPath]);
    }
    await supabase.from("avatars").delete().eq("participant", participantName);
    onAvatarsChange(prev => { const next = { ...prev }; delete next[participantName]; return next; });
    setUploading(null);
  };

  // Tournament/group management
  const [tournaments, setTournaments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [newTournamentId, setNewTournamentId] = useState("");
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  // Withdrawals
  const [withdrawals, setWithdrawals] = useState([]);
  const [newWithdrawal, setNewWithdrawal] = useState("");

  // Archive
  const [archiving, setArchiving] = useState(false);
  const [isAlreadyArchived, setIsAlreadyArchived] = useState(false);

  // Golfer roster
  const [roster, setRoster] = useState([]);
  const [refreshingRoster, setRefreshingRoster] = useState(false);

  useEffect(() => {
    if ((tab === "picks" || tab === "withdrawals") && roster.length === 0) {
      supabase.from("golfers").select("name, country").order("name").then(({ data }) => {
        setRoster(data || []);
      });
    }
  }, [tab, roster.length]);

  useEffect(() => {
    if (tab === "withdrawals") {
      (async () => {
        const { data } = await supabase.from("withdrawals").select("*").eq("tournament", tournamentName);
        setWithdrawals(data || []);
      })();
    }
  }, [tab, tournamentName]);

  const addWithdrawal = async () => {
    if (!newWithdrawal.trim()) return;
    await supabase.from("withdrawals").insert({ tournament: tournamentName, golfer_name: newWithdrawal.trim() });
    setNewWithdrawal("");
    const { data } = await supabase.from("withdrawals").select("*").eq("tournament", tournamentName);
    setWithdrawals(data || []);
    if (onWithdrawalsChange) onWithdrawalsChange();
  };

  const removeWithdrawal = async (golferName) => {
    await supabase.from("withdrawals").delete().eq("tournament", tournamentName).eq("golfer_name", golferName);
    setWithdrawals(w => w.filter(x => x.golfer_name !== golferName));
    if (onWithdrawalsChange) onWithdrawalsChange();
  };

  useEffect(() => {
    if (tab === "manage") {
      (async () => {
        const [{ data: t }, { data: g }, { data: ar }] = await Promise.all([
          supabase.from("tournaments").select("*").order("created_at", { ascending: false }),
          supabase.from("groups").select("*").order("created_at"),
          supabase.from("tournament_results").select("tournament").eq("tournament", tournament).single()
        ]);
        setTournaments(t || []);
        setGroups(g || []);
        setIsAlreadyArchived(!!ar);
      })();
    }
  }, [tab, tournament]);

  const addTournament = async () => {
    if (!newTournamentId.trim() || !newTournamentName.trim()) return;
    await supabase.from("tournaments").insert({ id: newTournamentId.trim().toLowerCase().replace(/\s+/g, "-"), display_name: newTournamentName.trim() });
    setNewTournamentId(""); setNewTournamentName("");
    const { data } = await supabase.from("tournaments").select("*").order("created_at", { ascending: false });
    setTournaments(data || []);
  };

  const addGroup = async () => {
    if (!newGroupId.trim() || !newGroupName.trim()) return;
    await supabase.from("groups").insert({ id: newGroupId.trim().toLowerCase().replace(/\s+/g, "-"), display_name: newGroupName.trim() });
    setNewGroupId(""); setNewGroupName("");
    const { data } = await supabase.from("groups").select("*").order("created_at");
    setGroups(data || []);
  };

  const deleteTournament = async (id) => {
    await supabase.from("tournaments").delete().eq("id", id);
    setTournaments(t => t.filter(x => x.id !== id));
  };

  const deleteGroup = async (id) => {
    await supabase.from("groups").delete().eq("id", id);
    setGroups(g => g.filter(x => x.id !== id));
  };

  const renameTournament = async (id, newName) => {
    if (!newName.trim()) return;
    await supabase.from("tournaments").update({ display_name: newName.trim() }).eq("id", id);
    setTournaments(t => t.map(x => x.id === id ? { ...x, display_name: newName.trim() } : x));
  };

  const renameGroup = async (id, newName) => {
    if (!newName.trim()) return;
    await supabase.from("groups").update({ display_name: newName.trim() }).eq("id", id);
    setGroups(g => g.map(x => x.id === id ? { ...x, display_name: newName.trim() } : x));
  };

  const handleArchive = async () => {
    const msg = isAlreadyArchived
      ? `Re-archive "${tournamentName}"? This will overwrite the previously saved results with a fresh snapshot from ESPN.`
      : `Archive "${tournamentName}"?\n\nMake sure the tournament is fully complete before archiving. This will snapshot the current ESPN scores as the final results.\n\nOnce archived, this tournament will show stored results instead of fetching live data.`;
    if (!confirm(msg)) return;
    setArchiving(true);
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: tournament, tournamentName })
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { error: text || `Server returned ${res.status}` }; }
      if (!res.ok || data.error) { alert("Archive failed: " + (data.error || `Status ${res.status}`)); return; }
      setIsAlreadyArchived(true);
      alert("Tournament archived successfully! Final scores have been saved.");
    } catch (e) {
      alert("Archive failed: " + e.message);
    } finally {
      setArchiving(false);
    }
  };

  const handleRefreshRoster = async () => {
    setRefreshingRoster(true);
    try {
      const res = await fetch("/api/seed-golfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentName })
      });
      const data = await res.json();
      if (data.error) { alert("Refresh failed: " + data.error); return; }
      // Reload roster
      const { data: updated } = await supabase.from("golfers").select("name, country").order("name");
      setRoster(updated || []);
      alert(`Roster updated! ${data.count} golfers loaded from ${data.tournament}.`);
    } catch (e) {
      alert("Refresh failed: " + e.message);
    } finally {
      setRefreshingRoster(false);
    }
  };

  // Derive set of all currently-selected golfer names (for filtering combobox)
  const selectedGolfers = new Set(teams.flatMap(t => t.golfers.map(g => g.name).filter(Boolean)));

  // Picks tab
  const addTeam = () => setTeams(t => [...t, { name: "", golfers: Array(6).fill(null).map(() => ({ ...emptyGolfer })) }]);
  const removeTeam = (i) => setTeams(t => t.filter((_, idx) => idx !== i));
  const updateTeamName = (i, val) => setTeams(t => t.map((team, idx) => idx === i ? { ...team, name: val } : team));
  const updateGolferField = (ti, gi, field, val) => setTeams(t => t.map((team, idx) =>
    idx === ti ? { ...team, golfers: team.golfers.map((g, j) => j === gi ? { ...g, [field]: val } : g) } : team
  ));

  const handleSave = async () => {
    setSaving(true);
    const clean = teams.filter(t => t.name.trim()).map(t => ({
      name: t.name.trim(),
      golfers: t.golfers.filter(g => g.name.trim()).map(g => ({ name: g.name.trim(), country: g.country.trim().toUpperCase() }))
    }));
    // Save directly to the active group
    await supabase.from("picks").delete().eq("tournament", tournament).eq("group_name", activeGroup);
    for (const p of clean) {
      await supabase.from("picks").insert({ participant: p.name, golfers: p.golfers, tournament, group_name: activeGroup });
    }
    setSaving(false);
    onClose();
  };

  const inputStyle = { background: "rgb(14, 39, 26)", border: "none", borderRadius: 6, color: "#fff", padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" };
  const nameInputStyle = { ...inputStyle, background: "#fff", border: "1px solid rgb(91, 211, 151)", color: "rgb(34, 86, 60)" };
  const removeBtnStyle = { background: "rgb(163, 3, 3)", border: "1px solid rgb(217, 128, 128)", color: "#fff", borderRadius: 6, cursor: "pointer" };

  const tabStyle = (active) => ({
    flex: 1, background: "none", border: "none",
    borderBottom: `2px solid ${active ? "rgb(252, 227, 0)" : "transparent"}`,
    color: active ? "rgb(252, 227, 0)" : "#e9ffc2", padding: "10px", cursor: "pointer",
    fontSize: 13, letterSpacing: 1, textTransform: "uppercase"
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "rgb(34, 86, 60)", border: "1px solid rgb(91, 211, 151)", borderRadius: 16, padding: 28, maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ color: "#fff", fontSize: 22, margin: 0, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Admin</h2>
          <button onClick={onClose} style={{ background: "rgb(61, 153, 107)", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: "0 6px", borderRadius: 3 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(201,168,76,0.15)", marginBottom: 20 }}>
          <button style={tabStyle(tab === "picks")} onClick={() => setTab("picks")}>Picks</button>
          <button style={tabStyle(tab === "withdrawals")} onClick={() => setTab("withdrawals")}>Withdrawals</button>
          <button style={tabStyle(tab === "manage")} onClick={() => setTab("manage")}>Manage</button>
        </div>

        {tab === "picks" && (
          <>
            <div style={{ fontSize: 12, color: "rgb(91, 211, 151)", marginBottom: 16, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
              <strong style={{ color: "rgb(233, 255, 194)", textTransform: "uppercase" }}>Tournament:</strong> {tournamentName || tournament} &nbsp;&nbsp;
              <strong style={{ color: "rgb(233, 255, 194)", textTransform: "uppercase" }}>Group:</strong>
              {allGroups && allGroups.length > 1 ? (
                <select
                  value={activeGroup}
                  onChange={e => setActiveGroup(e.target.value)}
                  style={{ background: "rgb(14, 39, 26)", color: "rgb(91, 211, 151)", border: "1px solid rgb(47, 121, 84)", borderRadius: 4, padding: "2px 6px", fontSize: 12, outline: "none", cursor: "pointer" }}
                >
                  {allGroups.map(g => <option key={g.id} value={g.id}>{g.display_name}</option>)}
                </select>
              ) : (
                <span>{activeGroupName}</span>
              )}
            </div>
            {teams.map((team, ti) => (
              <div key={ti} style={{ background: "rgb(26, 66, 46)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <input style={{ ...nameInputStyle, fontSize: 15, fontWeight: 600, flex: 1 }} placeholder="Participant name" value={team.name} onChange={e => updateTeamName(ti, e.target.value)} />
                  <button onClick={() => removeTeam(ti)} style={{ ...removeBtnStyle, marginLeft: 10, padding: "4px 10px", fontSize: 12 }}>Remove</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 0", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                  {avatars[team.name] ? (
                    <img src={avatars[team.name]} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 6, background: "#1a472a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⛳</div>
                  )}
                  <label style={{ background: "#337b57", border: "1px solid rgb(91, 211, 151)", color: "#fff", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>
                    {uploading === team.name ? "Uploading..." : avatars[team.name] ? "Replace" : "Upload Image"}
                    <input type="file" accept="image/*" hidden onChange={e => { if (e.target.files[0] && team.name.trim()) uploadAvatar(team.name, e.target.files[0]); }} />
                  </label>
                  {avatars[team.name] && (
                    <button onClick={() => removeAvatar(team.name)} style={{ ...removeBtnStyle, padding: "4px 10px", fontSize: 11 }}>Remove</button>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {team.golfers.map((g, gi) => (
                    <div key={gi} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 18, minWidth: 24, textAlign: "center", flexShrink: 0 }}>{countryFlag(g.country) || <span style={{ color: "#333" }}>🏳</span>}</span>
                      <GolferCombobox
                        value={g.name}
                        onChange={(name, country) => {
                          updateGolferField(ti, gi, "name", name);
                          if (country !== undefined) updateGolferField(ti, gi, "country", country);
                        }}
                        roster={roster}
                        selectedGolfers={selectedGolfers}
                        inputStyle={inputStyle}
                        placeholder={`Golfer ${gi + 1}${gi >= 4 ? " (reserve)" : ""}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={addTeam} style={{ flex: 1, background: "none", border: "1px solid rgb(252, 227, 0)", color: "rgb(252, 227, 0)", borderRadius: 8, padding: "10px", cursor: "pointer", fontSize: 14 }}>+ Add Participant</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: "rgb(252, 227, 0)", border: "none", color: "#0d1f14", borderRadius: 8, padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>{saving ? "Saving..." : "Save Picks"}</button>
            </div>
          </>
        )}

        {tab === "withdrawals" && (
          <div>
            <p style={{ color: "#fff", fontSize: 11, marginBottom: 16 }}>Mark golfers as withdrawn for <strong style={{ color: "rgb(91, 211, 151)" }}>{tournamentName}</strong>. Withdrawn golfers are treated like missed-cut players for scoring. This feature can also be used for players who have been disqualified.</p>
            {withdrawals.map(w => (
              <div key={w.golfer_name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgb(51, 123, 87)" }}>
                <span style={{ color: "rgb(233, 255, 194)", fontSize: 14 }}>{w.golfer_name}</span>
                <button onClick={() => removeWithdrawal(w.golfer_name)} style={{ ...removeBtnStyle, padding: "3px 8px", fontSize: 11 }}>Remove</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <GolferCombobox
                  value={newWithdrawal}
                  onChange={(name) => setNewWithdrawal(name)}
                  roster={roster}
                  selectedGolfers={new Set()}
                  inputStyle={inputStyle}
                  placeholder="Golfer name (e.g. Rory McIlroy)"
                />
              </div>
              <button onClick={addWithdrawal} style={{ background: "rgb(252, 227, 0)", border: "none", color: "#0d1f14", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Add</button>
            </div>
          </div>
        )}

        {tab === "manage" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Tournaments */}
            <div style={{ background: "rgb(26, 66, 46)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <h3 style={{ color: "rgb(252, 227, 0)", fontSize: 16, margin: "0 0 12px", fontWeight: 700, textTransform: "uppercase" }}>Tournaments</h3>
              {tournaments.map(t => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgb(51, 123, 87)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <EditableName value={t.display_name} onSave={(name) => renameTournament(t.id, name)} style={{ color: "rgb(233, 255, 194)", fontSize: 14 }} />
                    <div style={{ color: "rgb(91, 211, 151)", fontSize: 11, fontFamily: "monospace" }}>{t.id}</div>
                  </div>
                  <button onClick={() => deleteTournament(t.id)} style={{ ...removeBtnStyle, padding: "3px 8px", fontSize: 11 }}>Delete</button>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                <input style={{ ...inputStyle, width: "100%" }} placeholder='ID e.g. "us-open-2025"' value={newTournamentId} onChange={e => setNewTournamentId(e.target.value)} />
                <input style={{ ...inputStyle, width: "100%" }} placeholder='Name e.g. "US Open 2025"' value={newTournamentName} onChange={e => setNewTournamentName(e.target.value)} />
              </div>
              <button onClick={addTournament} style={{ marginTop: 8, width: "100%", background: "none", border: "1px solid rgb(252, 227, 0)", color: "rgb(252, 227, 0)", borderRadius: 8, padding: "8px", cursor: "pointer", fontSize: 13 }}>+ Add Tournament</button>
            </div>

            {/* Groups */}
            <div style={{ background: "rgb(26, 66, 46)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <h3 style={{ color: "rgb(252, 227, 0)", fontSize: 16, margin: "0 0 12px", fontWeight: 700, textTransform: "uppercase" }}>Groups</h3>
              {groups.map(g => (
                <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgb(51, 123, 87)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <EditableName value={g.display_name} onSave={(name) => renameGroup(g.id, name)} style={{ color: "rgb(233, 255, 194)", fontSize: 14 }} />
                    <div style={{ color: "rgb(91, 211, 151)", fontSize: 11, fontFamily: "monospace" }}>{g.id}</div>
                  </div>
                  <button onClick={() => deleteGroup(g.id)} style={{ ...removeBtnStyle, padding: "3px 8px", fontSize: 11 }}>Delete</button>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                <input style={{ ...inputStyle, width: "100%" }} placeholder='ID e.g. "college-friends"' value={newGroupId} onChange={e => setNewGroupId(e.target.value)} />
                <input style={{ ...inputStyle, width: "100%" }} placeholder='Name e.g. "College Friends"' value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
              </div>
              <button onClick={addGroup} style={{ marginTop: 8, width: "100%", background: "none", border: "1px solid rgb(252, 227, 0)", color: "rgb(252, 227, 0)", borderRadius: 8, padding: "8px", cursor: "pointer", fontSize: 13 }}>+ Add Group</button>
            </div>

            {/* Archive */}
            <div style={{ background: "rgb(26, 66, 46)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <h3 style={{ color: "rgb(252, 227, 0)", fontSize: 16, margin: "0 0 12px", fontWeight: 700, textTransform: "uppercase" }}>Archive Tournament</h3>
              <p style={{ color: "#fff", fontSize: 12, marginBottom: 6, lineHeight: 1.5 }}>
                Snapshot final scores for <strong style={{ color: "rgb(91, 211, 151)" }}>{tournamentName}</strong> so they can be viewed after the tournament leaves ESPN.
              </p>
              <p style={{ color: "rgb(255, 114, 114)", fontSize: 11, marginBottom: 12, lineHeight: 1.5 }}>
                ⚠️ Only archive after the tournament is fully complete. ESPN data is only available for a limited time after the event ends.
              </p>
              <button
                onClick={handleArchive}
                disabled={archiving}
                style={{
                  width: "100%", background: archiving ? "#555" : isAlreadyArchived ? "none" : "rgb(252, 227, 0)",
                  border: isAlreadyArchived ? "1px solid rgb(252, 227, 0)" : "none",
                  color: archiving ? "#888" : isAlreadyArchived ? "rgb(252, 227, 0)" : "#0d1f14",
                  borderRadius: 8, padding: "10px", cursor: archiving ? "default" : "pointer",
                  fontSize: 13, fontWeight: 700,
                }}
              >
                {archiving ? "Archiving..." : isAlreadyArchived ? "Re-Archive Tournament" : "Archive Tournament"}
              </button>
            </div>

            {/* Golfer Roster */}
            <div style={{ background: "rgb(26, 66, 46)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <h3 style={{ color: "rgb(252, 227, 0)", fontSize: 16, margin: "0 0 12px", fontWeight: 700, textTransform: "uppercase" }}>Golfer Roster</h3>
              <p style={{ color: "#fff", fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
                Pull the latest field from ESPN to update the golfer search list used when entering picks.
                {roster.length > 0 && <span style={{ color: "#5BD397" }}> Currently {roster.length} golfers in roster.</span>}
              </p>
              <button
                onClick={handleRefreshRoster}
                disabled={refreshingRoster}
                style={{
                  width: "100%", background: "none",
                  border: "1px solid rgb(252, 227, 0)", color: "rgb(252, 227, 0)",
                  borderRadius: 8, padding: "10px", cursor: refreshingRoster ? "default" : "pointer",
                  fontSize: 13, fontWeight: 700, opacity: refreshingRoster ? 0.5 : 1,
                }}
              >
                {refreshingRoster ? "Refreshing..." : "Refresh Roster from ESPN"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordModal({ onSuccess, onClose }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [biometricErr, setBiometricErr] = useState(false);

  // Check if WebAuthn is available and a credential is enrolled
  useEffect(() => {
    if (typeof window !== "undefined" && window.PublicKeyCredential && localStorage.getItem("webauthn_cred_id")) {
      setHasBiometric(true);
    }
  }, []);

  const attempt = () => {
    if (val === ADMIN_PASSWORD) {
      // Check if biometric is available but not enrolled — offer enrollment
      if (typeof window !== "undefined" && window.PublicKeyCredential && !localStorage.getItem("webauthn_cred_id")) {
        setShowEnroll(true);
      } else {
        onSuccess();
      }
    } else {
      setErr(true);
      setVal("");
    }
  };

  const enrollBiometric = async () => {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Masters Pool", id: window.location.hostname },
          user: {
            id: new TextEncoder().encode("admin"),
            name: "admin",
            displayName: "Admin",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      });
      if (credential) {
        const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        localStorage.setItem("webauthn_cred_id", credId);
      }
    } catch (e) {
      console.error("WebAuthn enrollment failed:", e);
    }
    onSuccess();
  };

  const authenticateBiometric = async () => {
    setBiometricErr(false);
    try {
      const credId = localStorage.getItem("webauthn_cred_id");
      const rawId = Uint8Array.from(atob(credId), c => c.charCodeAt(0));
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ id: rawId, type: "public-key", transports: ["internal"] }],
          userVerification: "required",
          timeout: 60000,
        },
      });
      if (assertion) onSuccess();
    } catch (e) {
      console.error("WebAuthn auth failed:", e);
      setBiometricErr(true);
    }
  };

  if (showEnroll) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "rgb(34, 86, 60)", border: "1px solid rgb(91, 211, 151)", borderRadius: 16, padding: 36, maxWidth: 340, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
          <h2 style={{ color: "rgb(252, 227, 0)", marginBottom: 12, fontWeight: 700, fontSize: 18 }}>Enable Biometric Login?</h2>
          <p style={{ color: "#e9ffc2", fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>Use Touch ID or Face ID to access the admin panel next time.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onSuccess} style={{ flex: 1, background: "none", border: "1px solid rgb(67, 170, 119)", borderRadius: 8, padding: "11px", fontSize: 15, color: "rgb(67, 170, 119)", cursor: "pointer" }}>Skip</button>
            <button onClick={enrollBiometric} style={{ flex: 1, background: "rgb(252, 227, 0)", border: "none", borderRadius: 8, padding: "11px", fontSize: 15, fontWeight: 700, color: "#0d1f14", cursor: "pointer" }}>Enable</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "rgb(34, 86, 60)", border: "1px solid rgb(91, 211, 151)", borderRadius: 16, padding: 36, maxWidth: 340, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⛳</div>
        <h2 style={{ color: "rgb(252, 227, 0)", marginBottom: 20, fontWeight: 700 }}>Admin Access</h2>
        {hasBiometric && (
          <>
            <button onClick={authenticateBiometric} style={{ width: "100%", background: "rgb(252, 227, 0)", border: "none", borderRadius: 8, padding: "12px", fontSize: 15, fontWeight: 700, color: "#0d1f14", cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              🔐 Use Touch ID / Face ID
            </button>
            {biometricErr && <p style={{ color: "#e05252", fontSize: 13, margin: "0 0 8px" }}>Biometric auth failed. Use password instead.</p>}
            <div style={{ color: "rgb(233, 255, 194)", fontSize: 11, marginBottom: 12 }}>or enter password</div>
          </>
        )}
        <input type="password" value={val} onChange={e => { setVal(e.target.value); setErr(false); }} onKeyDown={e => e.key === "Enter" && attempt()} placeholder="Password"
          style={{ width: "100%", boxSizing: "border-box", background: "#ffffff", border: `2px solid ${err ? "#e05252" : "rgb(91, 211, 151)"}`, borderRadius: 8, color: "#333", padding: "10px 14px", fontSize: 15, outline: "none", marginBottom: 8 }} />
        {err && <p style={{ color: "#e05252", fontSize: 13, margin: "0 0 10px" }}>Incorrect password</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: "1px solid rgb(67, 170, 119)", borderRadius: 8, padding: "11px", fontSize: 15, color: "rgb(67, 170, 119)", cursor: "pointer" }}>Cancel</button>
          <button onClick={attempt} style={{ flex: 1, background: "rgb(252, 227, 0)", border: "none", borderRadius: 8, padding: "11px", fontSize: 15, fontWeight: 700, color: "#0d1f14", cursor: "pointer" }}>Enter</button>
        </div>
      </div>
    </div>
  );
}

// ─── Score Trend Chart ───────────────────────────────────────────────────────

const TEAM_COLORS = ["#BA0C2F", "#2E7450", "#1a6dd4", "#e6a817", "#9b59b6", "#e67e22", "#1abc9c", "#e74c3c", "#3498db", "#2ecc71"];

function ScoreTrendChart({ teams, liveScores, cutHappened, worstMadeCut, allMadeCutNineScores }) {
  const ALL_LABELS = ["R1-Out", "R1-Tot", "R2-Out", "R2-Tot", "R3-Out", "R3-Tot", "R4-Out", "R4-Tot"];

  // Determine the maximum number of 9-hole checkpoints any golfer has completed
  const allNineScores = teams.flatMap(t => t.golfers.map(g => {
    const name = g.name || g;
    return liveScores[name]?.nineScores || [];
  }));
  const maxCheckpoints = Math.max(...allNineScores.map(s => s.length), 0);

  if (maxCheckpoints < 1) return null;

  // A checkpoint is "locked in" only when ALL golfers have completed it.
  // The LIVE point always reflects the current team card totals.
  const allGolferNames = [...new Set(teams.flatMap(t => t.golfers.map(g => g.name || g)))];
  let plottableCheckpoints = 0;
  for (let i = 0; i < maxCheckpoints; i++) {
    const isPostCut = i >= 4 && cutHappened;
    const allComplete = allGolferNames.every(name => {
      const missedCut = liveScores[name]?.missedCut ?? false;
      const withdrawn = liveScores[name]?.withdrawn ?? false;
      if (withdrawn) return true;
      if (isPostCut && missedCut) return true;
      const scores = liveScores[name]?.nineScores || [];
      return scores.length > i;
    });
    if (allComplete) plottableCheckpoints = i + 1;
    else break;
  }

  // Numeric x positions: Start=0, R1-Out=1, R1-Tot=2, R2-Out=3, R2-Tot=4, R3-Out=5, R3-Tot=6, R4-Out=7, R4-Tot=8
  const CHECKPOINT_X = [1, 2, 3, 4, 5, 6, 7, 8];
  const ROUND_TICKS = [0, 2, 4, 6, 8]; // Start, R1, R2, R3, R4
  const ROUND_LABELS = { 0: "Start", 2: "R1", 4: "R2", 6: "R3", 8: "Final" };

  // Start with everyone at E
  const chartData = [{ x: 0 }];
  teams.forEach(team => { chartData[0][team.name] = 0; });

  // Build data for each plottable checkpoint
  for (let i = 0; i < plottableCheckpoints; i++) {
    const point = { x: CHECKPOINT_X[i] };

    teams.forEach(team => {
      const golferScores = team.golfers.map(g => {
        const name = g.name || g;
        const scores = liveScores[name]?.nineScores || [];
        const missedCut = liveScores[name]?.missedCut ?? false;
        return { name, score: scores[i]?.cumulative ?? null, missedCut };
      });

      const isCutCheckpoint = i >= 4 && cutHappened;
      const eligible = isCutCheckpoint ? golferScores.filter(g => !g.missedCut) : golferScores.filter(g => !liveScores[g.name]?.withdrawn);
      const withScores = eligible.filter(g => g.score !== null);
      const sorted = [...withScores].sort((a, b) => a.score - b.score);
      const scoring = sorted.slice(0, 4);

      if (scoring.length === 0) return;

      let total = scoring.reduce((sum, g) => sum + g.score, 0);
      if (isCutCheckpoint) {
        const penaltySlots = Math.max(0, 4 - scoring.length);
        const worstAtCheckpoint = allMadeCutNineScores.reduce((max, scores) => {
          const val = scores[i];
          return val !== undefined && val > max ? val : max;
        }, -Infinity);
        const penalty = worstAtCheckpoint > -Infinity ? worstAtCheckpoint : (worstMadeCut ?? 0);
        total += penaltySlots * penalty;
      }
      point[team.name] = total;
    });
    chartData.push(point);
  }

  // Add "LIVE" point — always shown unless tournament is complete (all 8 checkpoints locked).
  // Positioned halfway between the last locked checkpoint and the next one.
  // Uses team.total which matches exactly what the team cards display.
  const isComplete = plottableCheckpoints >= 8;
  let liveX = null;
  if (!isComplete && maxCheckpoints >= 1) {
    const lastX = plottableCheckpoints > 0 ? CHECKPOINT_X[plottableCheckpoints - 1] : 0;
    const nextX = CHECKPOINT_X[plottableCheckpoints] ?? lastX + 1;
    liveX = (lastX + nextX) / 2;
    const nowPoint = { x: liveX };
    teams.forEach(team => { nowPoint[team.name] = team.total; });
    chartData.push(nowPoint);
  }

  // Sort by x so recharts plots in order
  chartData.sort((a, b) => a.x - b.x);

  const teamNames = teams.map(t => t.name);

  const formatScore = (val) => {
    if (val === 0) return "E";
    if (val > 0) return `+${val}`;
    return `${val}`;
  };


  return (
    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 7, padding: "16px 8px 8px", marginBottom: 12 }}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 18, right: 20, left: 5, bottom: 5 }}>
          <XAxis dataKey="x" type="number" domain={[0, 8]} ticks={ROUND_TICKS} interval={0} allowDataOverflow tick={({ x, y, payload }) => {
            const label = ROUND_LABELS[payload.value];
            if (!label) return null;
            return (
              <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill="#e8dfc4">
                {label}
              </text>
            );
          }} axisLine={{ stroke: "#337B57" }} tickLine={false} />
          <YAxis tick={{ fill: "#e8dfc4", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatScore} width={35} reversed />
          <Tooltip
            contentStyle={{ background: "#ffffff", border: "1px solid #D8D8D8", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#143625", marginBottom: 4, fontWeight: 700 }}
            formatter={(value, name) => [formatScore(value), name]}
            labelFormatter={(val) => {
              const ALL_TOOLTIP_LABELS = { 1: "R1 Front", 2: "R1", 3: "R2 Front", 4: "R2", 5: "R3 Front", 6: "R3", 7: "R4 Front", 8: "Final" };
              return ALL_TOOLTIP_LABELS[val] || "";
            }}
            itemSorter={(item) => item.value}
            content={({ active, payload, label }) => {
              // Show tooltip on locked checkpoints and LIVE point
              const lockedXValues = CHECKPOINT_X.slice(0, plottableCheckpoints);
              const validXValues = [...lockedXValues, ...(liveX !== null ? [liveX] : [])];
              if (!active || !payload || !validXValues.includes(label)) return null;
              const ALL_TOOLTIP_LABELS = { 1: "R1 Front", 2: "R1", 3: "R2 Front", 4: "R2", 5: "R3 Front", 6: "R3", 7: "R4 Front", 8: "Final" };
              const sorted = [...payload].filter(p => p.value != null).sort((a, b) => a.value - b.value);
              return (
                <div style={{ background: "#ffffff", border: "1px solid #D8D8D8", borderRadius: 8, fontSize: 12, padding: "8px 12px" }}>
                  <div style={{ color: "#143625", marginBottom: 4, fontWeight: 700 }}>{label === liveX ? "LIVE" : ALL_TOOLTIP_LABELS[label] || ""}</div>
                  {sorted.map((entry, i) => (
                    <div key={i} style={{ color: entry.color, padding: "1px 0" }}>
                      {formatScore(entry.value)} — {entry.name}
                    </div>
                  ))}
                </div>
              );
            }}
          />
          {liveX !== null && <ReferenceLine x={liveX} stroke="rgb(252, 227, 0)" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: "LIVE", position: "top", fill: "rgb(252, 227, 0)", fontSize: 11, fontWeight: 700 }} />}
          {teamNames.map((name, i) => (
            <Line
              key={name}

              type="monotone"
              dataKey={name}
              stroke={TEAM_COLORS[i % TEAM_COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 4, fill: TEAM_COLORS[i % TEAM_COLORS.length] }}
              activeDot={{ r: 6 }}
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-in-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

function InlineDropdown({ label, items, currentId, onSelect, color, style, align = "left" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-block", ...style }}>
      <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color, padding: 0, cursor: "pointer", font: "inherit", fontSize: "inherit", fontFamily: "inherit", letterSpacing: "inherit", textTransform: "inherit" }}>
        <span style={{ fontSize: "0.75em", marginRight: 4, opacity: 0.7 }}>▾</span>{label}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", ...(align === "center" ? { left: "50%", transform: "translateX(-50%)" } : { left: 0 }), marginTop: 6, background: "#143625", border: "1px solid #337B57", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", zIndex: 50, minWidth: 180, overflow: "hidden" }}>
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => { onSelect(item.id); setOpen(false); }}
              style={{ padding: "10px 16px", fontSize: 13, color: item.id === currentId ? "#FCE300" : "#e8dfc4", cursor: "pointer", borderBottom: "1px solid rgba(51,123,87,0.3)", whiteSpace: "nowrap" }}
              onMouseEnter={e => { if (item.id !== currentId) e.target.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; }}
            >
              {item.display_name}
            </div>
          ))}
        </div>
      )}
    </span>
  );
}

function Leaderboard({ tournament, group, tournamentName, groupName, allTournaments, allGroups, onSwitch }) {
  const [picks, setPicks] = useState([]);
  const [liveScores, setLiveScores] = useState({});
  const [cutHappened, setCutHappened] = useState(false);
  const [worstMadeCut, setWorstMadeCut] = useState(null);
  const [worstMadeCutName, setWorstMadeCutName] = useState(null);
  const [allMadeCutNineScores, setAllMadeCutNineScores] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState(null);
  const [isArchived, setIsArchived] = useState(false);
  const [roundStatus, setRoundStatus] = useState(null);
  const [worstMadeCutGolfers, setWorstMadeCutGolfers] = useState([]);
  const [showCutDialog, setShowCutDialog] = useState(false);
  const [coursePar, setCoursePar] = useState(null);
  const [expandedGolfers, setExpandedGolfers] = useState(new Set());
  const [espnIds, setEspnIds] = useState({});

  const expandedTeams = useRef(new Set());
  const skipReorderAnim = useRef(false);
  const [, forceUpdate] = useState(0);
  const toggleTeam = (name) => {
    skipReorderAnim.current = true;
    if (expandedTeams.current.has(name)) expandedTeams.current.delete(name);
    else expandedTeams.current.add(name);
    forceUpdate(n => n + 1);
  };

  const [avatars, setAvatars] = useState({});

  const loadAvatars = useCallback(async (names) => {
    if (!names.length) return;
    const { data } = await supabase.from("avatars").select("*").in("participant", names);
    if (data) {
      const map = {};
      data.forEach(row => { map[row.participant] = row.image_url; });
      setAvatars(map);
    }
  }, []);

  const loadPicks = useCallback(async () => {
    const { data } = await supabase.from("picks").select("*").eq("tournament", tournament).eq("group_name", group);
    if (data) {
      const mapped = data.map(row => ({
        name: row.participant,
        golfers: Array.isArray(row.golfers) ? row.golfers.map(g => typeof g === "string" ? { name: g, country: "" } : g) : []
      }));
      setPicks(mapped);
      loadAvatars(mapped.map(p => p.name));
      // Load ESPN IDs for headshots
      const allNames = [...new Set(mapped.flatMap(p => p.golfers.map(g => g.name)))];
      if (allNames.length > 0) {
        const { data: golferData } = await supabase.from("golfers").select("name, espn_id").in("name", allNames);
        if (golferData) {
          const idMap = {};
          golferData.forEach(g => { if (g.espn_id) idMap[g.name] = g.espn_id; });
          setEspnIds(idMap);
        }
      }
    }
  }, [tournament, group, loadAvatars]);

  useEffect(() => { loadPicks(); }, [loadPicks]);

  const savePicks = async (newPicks) => {
    await supabase.from("picks").delete().eq("tournament", tournament).eq("group_name", group);
    for (const p of newPicks) {
      await supabase.from("picks").insert({ participant: p.name, golfers: p.golfers, tournament, group_name: group });
    }
    await loadPicks();
  };

  const fetchScores = useCallback(async (isBackground = false) => {
    if (picks.length === 0) return;
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const allGolfers = [...new Set(picks.flatMap(p => p.golfers.map(g => g.name || g)))].sort();
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ golferNames: allGolfers, tournamentName, tournamentId: tournament })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Only update state when data actually changes to avoid unnecessary re-renders
      const newGolfers = data.golfers || {};
      const newCutHappened = data.cutHappened || false;
      const newWorstMadeCut = data.worstMadeCutScore ?? null;
      const newWorstMadeCutName = data.worstMadeCutName ?? null;
      const newAllMadeCutNineScores = data.allMadeCutNineScores || [];
      setLiveScores(prev => JSON.stringify(prev) === JSON.stringify(newGolfers) ? prev : newGolfers);
      setCutHappened(prev => prev === newCutHappened ? prev : newCutHappened);
      setWorstMadeCut(prev => prev === newWorstMadeCut ? prev : newWorstMadeCut);
      setWorstMadeCutName(prev => prev === newWorstMadeCutName ? prev : newWorstMadeCutName);
      setAllMadeCutNineScores(prev => JSON.stringify(prev) === JSON.stringify(newAllMadeCutNineScores) ? prev : newAllMadeCutNineScores);
      setIsArchived(data.archived || false);
      // Compute round status display
      if (data.statusState === "pre" && data.eventStartDate && data.eventEndDate) {
        const fmt = (iso) => {
          const d = new Date(iso);
          return d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
        };
        const start = fmt(data.eventStartDate);
        const endDay = new Date(data.eventEndDate).toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
        setRoundStatus(`${start}–${endDay}`);
      } else if (data.statusDetail) {
        setRoundStatus(data.statusDetail);
      } else {
        setRoundStatus(null);
      }
      setWorstMadeCutGolfers(data.worstMadeCutGolfers || []);
      if (data.coursePar) setCoursePar(data.coursePar);
      setLastUpdated(new Date());
    } catch (e) { console.error("fetchScores error:", e.message); setError(`Could not fetch live scores: ${e.message}`); }
    if (!isBackground) setLoading(false);
  }, [picks, tournamentName]);

  useEffect(() => {
    if (picks.length > 0) {
      fetchScores();
      if (!isArchived) {
        const interval = setInterval(() => fetchScores(true), 5 * 60 * 1000);
        return () => clearInterval(interval);
      }
    }
  }, [picks, fetchScores, isArchived]);

  const rankedTeams = picks.map(team => {
    const withScores = team.golfers.map(g => {
      const name = g.name || g;
      return { name, country: g.country || "", espnId: espnIds[name] || null, relative: liveScores[name]?.relative ?? null, today: liveScores[name]?.today ?? null, thru: liveScores[name]?.thru ?? null, position: liveScores[name]?.position ?? null, positionChange: liveScores[name]?.positionChange ?? null, missedCut: liveScores[name]?.missedCut ?? false, withdrawn: liveScores[name]?.withdrawn ?? false, holeScores: liveScores[name]?.holeScores || [] };
    });
    let total = 0;
    if (!cutHappened) {
      const eligible = withScores.filter(g => !g.withdrawn);
      const sorted = [...eligible].sort((a, b) => { if (a.relative === null && b.relative === null) return 0; if (a.relative === null) return 1; if (b.relative === null) return -1; return a.relative - b.relative; });
      total = sorted.slice(0, 4).reduce((sum, g) => sum + (g.relative ?? 0), 0);
    } else {
      const madeCut = withScores.filter(g => !g.missedCut);
      const sorted = [...madeCut].sort((a, b) => { if (a.relative === null && b.relative === null) return 0; if (a.relative === null) return 1; if (b.relative === null) return -1; return a.relative - b.relative; });
      const scoring = sorted.slice(0, 4);
      total = scoring.reduce((sum, g) => sum + (g.relative ?? 0), 0) + Math.max(0, 4 - scoring.length) * (worstMadeCut ?? 0);
    }
    return { ...team, golfers: withScores, total };
  }).sort((a, b) => a.total - b.total);

  const cardRefs = useRef({});
  const prevPositions = useRef({});
  useEffect(() => {
    const newPositions = {};
    rankedTeams.forEach(team => { const el = cardRefs.current[team.name]; if (el) newPositions[team.name] = el.getBoundingClientRect().top; });
    if (!skipReorderAnim.current) {
      rankedTeams.forEach(team => {
        const el = cardRefs.current[team.name]; const prev = prevPositions.current[team.name]; const next = newPositions[team.name];
        if (el && prev !== undefined && Math.abs(prev - next) > 2) {
          const delta = prev - next;
          el.style.transition = "none"; el.style.transform = `translateY(${delta}px)`;
          requestAnimationFrame(() => { el.style.transition = "transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)"; el.style.transform = "translateY(0)"; });
        }
      });
    }
    skipReorderAnim.current = false;
    prevPositions.current = newPositions;
  });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #22563C 0%, #173C29 100%)", color: "#e8dfc4" }}>
      <div style={{ padding: "16px 18px 12px", textAlign: "center", background: "#143625", borderBottom: "1px solid #337B57" }}>
        <div style={{ fontSize: 13, fontFamily: "var(--font-source-serif), Georgia, serif", fontWeight: 300, color: "#FCE300", letterSpacing: 3, textTransform: "uppercase", marginBottom: 2 }}>
          <InlineDropdown label={tournamentName} items={allTournaments} currentId={tournament} onSelect={(id) => onSwitch(id, group)} color="#FCE300" align="center" />
        </div>
        <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "clamp(36px, 6vw, 48px)", color: "#ffffff", margin: "0 0 4px", fontWeight: 300, letterSpacing: 2, textTransform: "uppercase" }}>Leader Board</h1>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "18px 16px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <InlineDropdown label={groupName} items={allGroups} currentId={group} onSelect={(id) => onSwitch(tournament, id)} color="#FCE300" style={{ fontSize: 13, fontFamily: "var(--font-source-serif), Georgia, serif", fontWeight: 300, textTransform: "uppercase", letterSpacing: 3 }} />
          {picks.length > 0 && (
            <div onClick={() => setShowChart(!showChart)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
              <span style={{ fontSize: 13, color: "#5BD397", letterSpacing: 0.5 }}>Tournament Flow</span>
              <div style={{ width: 32, height: 18, borderRadius: 9, background: showChart ? "#5BD397" : "rgb(51, 124, 87)", position: "relative", transition: "background 0.2s" }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: "#fff", position: "absolute", top: 2, left: showChart ? 16 : 2, transition: "left 0.2s" }} />
              </div>
            </div>
          )}
        </div>
        {error && <div style={{ background: "rgba(224,82,82,0.1)", border: "1px solid #e05252", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#e05252" }}>{error}</div>}

        {picks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⛳</div>
            <p style={{ color: "#ffffff", fontSize: 16 }}>No picks entered yet for this pool.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {showChart && <ScoreTrendChart teams={rankedTeams} liveScores={liveScores} cutHappened={cutHappened} worstMadeCut={worstMadeCut} allMadeCutNineScores={allMadeCutNineScores} />}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
              <div style={{ color: "#5BD397", position: "relative" }}>
                {cutHappened && worstMadeCut !== null && worstMadeCutName && (
                  <><span onClick={() => setShowCutDialog(!showCutDialog)} style={{ cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}>Lowest made cut:</span>{" "}{worstMadeCut > 0 ? `+${worstMadeCut}` : worstMadeCut === 0 ? "E" : worstMadeCut}{` (${worstMadeCutName.split(" ").length > 1 ? `${worstMadeCutName[0]}. ${worstMadeCutName.split(" ").slice(1).join(" ")}` : worstMadeCutName})`}</>
                )}
                {showCutDialog && worstMadeCutGolfers.length > 0 && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, background: "#fff", border: "1px solid #D8D8D8", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 50, minWidth: 320, overflow: "hidden" }}>
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid #D8D8D8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#143625", fontWeight: 700, fontSize: 13 }}>Lowest Made Cut Scores</span>
                      <button onClick={(e) => { e.stopPropagation(); setShowCutDialog(false); }} style={{ background: "none", border: "none", color: "#888", fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    {worstMadeCutGolfers.map((g, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderBottom: i < worstMadeCutGolfers.length - 1 ? "1px solid #D8D8D8" : "none" }}>
                        <span style={{ fontSize: 16, minWidth: 24, textAlign: "center", flexShrink: 0 }}>{countryFlag(g.country)}</span>
                        <span style={{ flex: 1, fontSize: 13, color: "#63605E", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
                        <span style={{ fontSize: 12, color: "#408C64", minWidth: 28, textAlign: "right" }}>{g.today !== null ? (g.today === 0 ? "E" : g.today > 0 ? `+${g.today}` : g.today) : "—"}</span>
                        <span style={{ fontSize: 12, color: "#408C64", minWidth: 20, textAlign: "right" }}>{g.thru || "—"}</span>
                        <span style={{ minWidth: 32, textAlign: "right" }}><ScoreDisplay relative={g.relative} isScoring={true} /></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ color: "#5BD397" }}>
                {isArchived ? (
                  <span style={{ background: "rgb(252, 227, 0)", border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "rgb(13, 31, 20)", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>Final</span>
                ) : roundStatus || null}
              </div>
            </div>
            {rankedTeams.map((team, i) => (
              <div key={team.name} ref={el => cardRefs.current[team.name] = el}>
                <TeamCard team={team} rank={i + 1} cutHappened={cutHappened} worstMadeCut={worstMadeCut} expanded={expandedTeams.current.has(team.name)} onToggle={() => toggleTeam(team.name)} avatarUrl={avatars[team.name]} chartColor={TEAM_COLORS[i % TEAM_COLORS.length]} expandedGolfers={expandedGolfers} onGolferToggle={(name) => { skipReorderAnim.current = true; setExpandedGolfers(prev => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); return next; }); }} coursePar={coursePar} isArchived={isArchived} />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 11, color: "#5BD397", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {isArchived ? null
              : loading ? <span style={{ color: "#5BD397" }}>Scores updating...</span>
              : lastUpdated ? <NextUpdateTimer lastUpdated={lastUpdated} onRefresh={fetchScores} />
              : <span style={{ color: "#555" }}>—</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <a href={`/rules?tournament=${tournament}&group=${group}`} style={{ color: "#5BD397", textDecoration: "underline" }}>Rules</a>
            <span style={{ color: "#5BD397" }}>|</span>
            <a onClick={() => authed ? setShowAdmin(true) : setShowPasswordModal(true)} style={{ color: "#5BD397", cursor: "pointer", textDecoration: "underline" }}>Admin</a>
          </div>
        </div>
      </div>

      {showPasswordModal && <PasswordModal onSuccess={() => { setAuthed(true); setShowPasswordModal(false); setShowAdmin(true); }} onClose={() => setShowPasswordModal(false)} />}
      {showAdmin && <AdminPanel picks={picks} tournament={tournament} group={group} tournamentName={tournamentName} groupName={groupName} allGroups={allGroups} onSave={savePicks} onClose={() => { setShowAdmin(false); loadPicks(); }} avatars={avatars} onAvatarsChange={setAvatars} onWithdrawalsChange={fetchScores} />}
    </div>
  );
}

// ─── App Shell (handles URL params) ─────────────────────────────────────────

function AppShell() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tournamentMeta, setTournamentMeta] = useState(null);
  const [groupMeta, setGroupMeta] = useState(null);
  const [allTournaments, setAllTournaments] = useState([]);
  const [allGroups, setAllGroups] = useState([]);

  const tournament = searchParams.get("tournament");
  const group = searchParams.get("group");

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: g }] = await Promise.all([
        supabase.from("tournaments").select("*").order("created_at", { ascending: false }),
        supabase.from("groups").select("*").order("created_at")
      ]);
      setAllTournaments(t || []);
      setAllGroups(g || []);
    })();
  }, []);

  useEffect(() => {
    if (tournament && group && allTournaments.length && allGroups.length) {
      setTournamentMeta(allTournaments.find(t => t.id === tournament) || null);
      setGroupMeta(allGroups.find(g => g.id === group) || null);
    }
  }, [tournament, group, allTournaments, allGroups]);

  const handleSelect = (t, g) => {
    router.push(`?tournament=${t}&group=${g}`);
  };

  const handleSwitch = (t, g) => {
    router.push(`?tournament=${t}&group=${g}`);
  };

  if (!tournament || !group) {
    return <PickerPage onSelect={handleSelect} />;
  }

  if (!tournamentMeta || !groupMeta) {
    return (
      <div style={{ minHeight: "100vh", background: "#173C29", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
        Loading...
      </div>
    );
  }

  return (
    <Leaderboard
      tournament={tournament}
      group={group}
      tournamentName={tournamentMeta.display_name}
      groupName={groupMeta.display_name}
      allTournaments={allTournaments}
      allGroups={allGroups}
      onSwitch={handleSwitch}
    />
  );
}

export default function MastersPool() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#173C29", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
        Loading...
      </div>
    }>
      <AppShell />
    </Suspense>
  );
}
