"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_PASSWORD = "augusta2025";
const GOLD = "#c9a84c";

function LastUpdatedTimer({ lastUpdated }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 10000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const format = (secs) => {
    if (secs < 60) return "just now";
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  };

  const nextRefresh = Math.max(0, 5 - Math.floor(elapsed / 60));

  return (
    <span>
      <span style={{ color: "#888" }}>Updated {format(elapsed)}</span>
      <span style={{ color: "#555", marginLeft: 10 }}>·</span>
      <span style={{ color: "#555", marginLeft: 10 }}>Next refresh in ~{nextRefresh}m</span>
    </span>
  );
}

function ScoreDisplay({ relative }) {
  if (relative === null || relative === undefined) return <span style={{ color: "#888" }}>—</span>;
  const color = relative < 0 ? "#e05252" : relative > 0 ? "#aaa" : "#c9a84c";
  const label = relative === 0 ? "E" : relative > 0 ? `+${relative}` : `${relative}`;
  return <span style={{ color, fontWeight: 600 }}>{label}</span>;
}

function GolferRow({ golfer, isCut, isPenalty }) {
  const thruLabel = isPenalty || isCut ? "" : (golfer.thru ?? "—");

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      opacity: isCut ? 0.35 : 1,
      padding: "4px 0",
      borderBottom: "1px solid rgba(201,168,76,0.08)"
    }}>
      {/* Position */}
      <span style={{
        fontSize: 11, color: GOLD, minWidth: 20, textAlign: "right",
        fontFamily: "monospace",
        textDecoration: isCut ? "line-through" : "none",
        flexShrink: 0,
      }}>
        {isCut || isPenalty ? "—" : (golfer.position || "—")}
      </span>

      {/* Name */}
      <span style={{
        flex: 1, fontSize: 13,
        color: isCut ? "#666" : isPenalty ? "#888" : "#e8dfc4",
        fontStyle: (isCut || isPenalty) ? "italic" : "normal",
        letterSpacing: 0.2,
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {isPenalty ? "Penalty (missed cut)" : golfer.name}
        {isCut && !isPenalty && <span style={{ fontSize: 10, marginLeft: 6, color: "#555" }}>(missed cut)</span>}
      </span>

      {/* Thru */}
      <span style={{
        fontSize: 11, color: "#555", minWidth: 28, textAlign: "right",
        fontFamily: "monospace", flexShrink: 0,
      }}>
        {isCut
          ? <span style={{ color: "#555", fontSize: 11 }}>MC</span>
          : isPenalty
            ? ""
            : (thruLabel === "F" ? <span style={{ color: "#666" }}>F</span> : thruLabel)
        }
      </span>

      {/* Score */}
      <span style={{ fontSize: 13, minWidth: 36, textAlign: "right", flexShrink: 0 }}>
        {isPenalty
          ? <ScoreDisplay relative={golfer.relative} />
          : isCut
            ? null
            : <ScoreDisplay relative={golfer.relative} />
        }
      </span>
    </div>
  );
}

// Column headers for expanded view
function GolferRowHeader() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 0 4px",
      borderBottom: "1px solid rgba(201,168,76,0.15)",
      marginBottom: 2,
    }}>
      <span style={{ fontSize: 10, color: "#444", minWidth: 20, textAlign: "right", flexShrink: 0 }}>POS</span>
      <span style={{ flex: 1, fontSize: 10, color: "#444" }}>PLAYER</span>
      <span style={{ fontSize: 10, color: "#444", minWidth: 28, textAlign: "right", flexShrink: 0 }}>THRU</span>
      <span style={{ fontSize: 10, color: "#444", minWidth: 36, textAlign: "right", flexShrink: 0 }}>SCORE</span>
    </div>
  );
}

function TeamCard({ team, rank, cutHappened, worstMadeCut, expanded, onToggle }) {
  const madeCut = team.golfers.filter(g => !g.missedCut);
  const missedCut = team.golfers.filter(g => g.missedCut);

  let scoringGolfers = [];
  let droppedGolfers = [];
  let penaltySlots = 0;

  if (!cutHappened) {
    const sorted = [...team.golfers].sort((a, b) => {
      if (a.relative === null && b.relative === null) return 0;
      if (a.relative === null) return 1;
      if (b.relative === null) return -1;
      return a.relative - b.relative;
    });
    scoringGolfers = sorted.slice(0, 4);
    droppedGolfers = sorted.slice(4);
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

  const scoringTotal = scoringGolfers.reduce((sum, g) => sum + (g.relative ?? 0), 0);
  const penaltyTotal = penaltySlots * (worstMadeCut ?? 0);
  const total = scoringTotal + penaltyTotal;

  const totalLabel = total === 0 ? "E" : total > 0 ? `+${total}` : `${total}`;
  const totalColor = total < 0 ? "#e05252" : total > 0 ? "#aaa" : "#c9a84c";
  const medals = ["🥇", "🥈", "🥉"];

  const topNames = scoringGolfers.slice(0, 4).map(g => g.name.split(" ").pop()).join(", ");

  return (
    <div style={{
      background: "linear-gradient(160deg, #12261a 0%, #0d1f14 100%)",
      border: `1px solid ${rank === 1 ? GOLD : "rgba(201,168,76,0.2)"}`,
      borderRadius: 12,
      boxShadow: rank === 1 ? `0 0 24px rgba(201,168,76,0.18)` : "0 2px 12px rgba(0,0,0,0.4)",
      overflow: "hidden",
      transition: "box-shadow 0.3s",
    }}>
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "16px 20px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 18, minWidth: 26 }}>{medals[rank - 1] || rank}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 17, color: "#e8dfc4", letterSpacing: 0.5 }}>
            {team.name}
          </div>
          {!expanded && topNames && (
            <div style={{ fontSize: 11, color: "#666", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {topNames}{penaltySlots > 0 ? ` + ${penaltySlots} penalty` : ""}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: totalColor, fontFamily: "monospace", letterSpacing: 1 }}>
            {totalLabel}
          </div>
          <span style={{
            color: "#555", fontSize: 12,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.25s",
            display: "inline-block",
            lineHeight: 1,
          }}>▼</span>
        </div>
      </div>

      <div style={{
        maxHeight: expanded ? "600px" : "0px",
        overflow: "hidden",
        transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div style={{ padding: "0 20px 16px", borderTop: "1px solid rgba(201,168,76,0.1)" }}>
          <div style={{ paddingTop: 6 }}>
            <GolferRowHeader />
            {scoringGolfers.map(g => (
              <GolferRow key={g.name} golfer={g} isCut={false} isPenalty={false} />
            ))}
            {Array.from({ length: penaltySlots }).map((_, i) => (
              <GolferRow
                key={`penalty-${i}`}
                golfer={{ relative: worstMadeCut }}
                isCut={false}
                isPenalty={true}
              />
            ))}
            {droppedGolfers.map(g => (
              <GolferRow key={g.name} golfer={g} isCut={cutHappened && g.missedCut} isPenalty={false} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ picks, onSave, onClose }) {
  const [teams, setTeams] = useState(
    picks.length > 0
      ? picks.map(p => ({ name: p.name, golfers: [...p.golfers, ...Array(6).fill("")].slice(0, 6) }))
      : [{ name: "", golfers: ["", "", "", "", "", ""] }]
  );
  const [saving, setSaving] = useState(false);

  const addTeam = () => setTeams(t => [...t, { name: "", golfers: ["", "", "", "", "", ""] }]);
  const removeTeam = (i) => setTeams(t => t.filter((_, idx) => idx !== i));
  const updateName = (i, val) => setTeams(t => t.map((team, idx) => idx === i ? { ...team, name: val } : team));
  const updateGolfer = (ti, gi, val) => setTeams(t => t.map((team, idx) =>
    idx === ti ? { ...team, golfers: team.golfers.map((g, j) => j === gi ? val : g) } : team
  ));

  const handleSave = async () => {
    setSaving(true);
    const clean = teams.filter(t => t.name.trim()).map(t => ({
      name: t.name.trim(),
      golfers: t.golfers.map(g => g.trim()).filter(Boolean)
    }));
    await onSave(clean);
    setSaving(false);
    onClose();
  };

  const inputStyle = {
    background: "#0d1f14", border: "1px solid rgba(201,168,76,0.3)",
    borderRadius: 6, color: "#e8dfc4", padding: "6px 10px",
    fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box"
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{
        background: "#12261a", border: `1px solid ${GOLD}`, borderRadius: 16,
        padding: 28, maxWidth: 600, width: "100%", maxHeight: "90vh", overflowY: "auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 22, margin: 0 }}>Manage Picks</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>

        {teams.map((team, ti) => (
          <div key={ti} style={{
            background: "#0d1f14", borderRadius: 10, padding: 16, marginBottom: 16,
            border: "1px solid rgba(201,168,76,0.15)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <input
                style={{ ...inputStyle, fontSize: 15, fontWeight: 600 }}
                placeholder="Participant name"
                value={team.name}
                onChange={e => updateName(ti, e.target.value)}
              />
              <button onClick={() => removeTeam(ti)} style={{
                marginLeft: 10, background: "none", border: "1px solid #e05252",
                color: "#e05252", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12
              }}>Remove</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {team.golfers.map((g, gi) => (
                <input
                  key={gi}
                  style={inputStyle}
                  placeholder={`Golfer ${gi + 1}${gi >= 4 ? " (reserve)" : ""}`}
                  value={g}
                  onChange={e => updateGolfer(ti, gi, e.target.value)}
                />
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={addTeam} style={{
            flex: 1, background: "none", border: `1px solid ${GOLD}`, color: GOLD,
            borderRadius: 8, padding: "10px", cursor: "pointer", fontSize: 14
          }}>+ Add Participant</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, background: GOLD, border: "none", color: "#0d1f14",
            borderRadius: 8, padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700
          }}>{saving ? "Saving..." : "Save Picks"}</button>
        </div>
        <p style={{ color: "#666", fontSize: 11, marginTop: 12, textAlign: "center" }}>
          Golfer names must match PGA Tour listings. Golfers 5 & 6 are reserves — worst 2 scores dropped automatically.
        </p>
      </div>
    </div>
  );
}

function PasswordModal({ onSuccess, onClose }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const attempt = () => {
    if (val === ADMIN_PASSWORD) { onSuccess(); }
    else { setErr(true); setVal(""); }
  };
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#12261a", border: `1px solid ${GOLD}`, borderRadius: 16,
        padding: 36, maxWidth: 340, width: "100%", textAlign: "center"
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⛳</div>
        <h2 style={{ color: GOLD, fontFamily: "Georgia, serif", marginBottom: 20 }}>Admin Access</h2>
        <input
          type="password"
          value={val}
          onChange={e => { setVal(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && attempt()}
          placeholder="Password"
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#0d1f14", border: `1px solid ${err ? "#e05252" : "rgba(201,168,76,0.4)"}`,
            borderRadius: 8, color: "#e8dfc4", padding: "10px 14px", fontSize: 15, outline: "none", marginBottom: 8
          }}
        />
        {err && <p style={{ color: "#e05252", fontSize: 13, margin: "0 0 10px" }}>Incorrect password</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, background: "none", border: "1px solid #555", borderRadius: 8,
            padding: "11px", fontSize: 15, color: "#888", cursor: "pointer"
          }}>Cancel</button>
          <button onClick={attempt} style={{
            flex: 1, background: GOLD, border: "none", borderRadius: 8,
            padding: "11px", fontSize: 15, fontWeight: 700, color: "#0d1f14", cursor: "pointer"
          }}>Enter</button>
        </div>
      </div>
    </div>
  );
}

export default function MastersPool() {
  const [picks, setPicks] = useState([]);
  const [liveScores, setLiveScores] = useState({});
  const [cutHappened, setCutHappened] = useState(false);
  const [worstMadeCut, setWorstMadeCut] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState(null);

  const expandedTeams = useRef(new Set());
  const [, forceUpdate] = useState(0);

  const toggleTeam = (name) => {
    if (expandedTeams.current.has(name)) {
      expandedTeams.current.delete(name);
    } else {
      expandedTeams.current.add(name);
    }
    forceUpdate(n => n + 1);
  };

  const loadPicks = useCallback(async () => {
    const { data, error } = await supabase.from("picks").select("*");
    if (!error && data) {
      setPicks(data.map(row => ({ name: row.participant, golfers: row.golfers })));
    }
  }, []);

  useEffect(() => { loadPicks(); }, [loadPicks]);

  const savePicks = async (newPicks) => {
    await supabase.from("picks").delete().neq("id", 0);
    for (const p of newPicks) {
      await supabase.from("picks").insert({ participant: p.name, golfers: p.golfers });
    }
    await loadPicks();
  };

  const fetchScores = useCallback(async () => {
    if (picks.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const allGolfers = [...new Set(picks.flatMap(p => p.golfers))];
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: `You are a golf scoring assistant with access to live PGA Tour data.
Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "round": <current round number 1-4>,
  "cutHappened": <true if the cut has been made, false if still in rounds 1-2>,
  "worstMadeCutScore": <the highest (worst) score relative to par among ALL players who made the cut on the PGA Tour leaderboard, or null if cut hasn't happened>,
  "golfers": {
    "<golfer name>": {
      "relative": <score relative to par as integer, 0=even, negative=under par, or null if not started>,
      "position": <leaderboard position string like "T4" or null>,
      "missedCut": <true if player missed the cut, false otherwise>,
      "thru": <hole number they have played through as a string e.g. "12", or "F" if finished, or null if not started>
    }
  }
}`,
          messages: [{
            role: "user",
            content: `Get current Masters Tournament 2025 scores for these golfers: ${allGolfers.join(", ")}. Include what hole each player is through in the current round. Also determine if the cut has happened and the worst score among all players who made the cut. Return only the JSON object.`
          }],
          tools: [{ type: "web_search_20250305", name: "web_search" }]
        })
      });
      const data = await response.json();
      const textBlock = data.content?.find(b => b.type === "text");
      if (textBlock) {
        const clean = textBlock.text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        setLiveScores(parsed.golfers || {});
        setCutHappened(parsed.cutHappened || false);
        setWorstMadeCut(parsed.worstMadeCutScore ?? null);
        setLastUpdated(new Date());
      }
    } catch (e) {
      setError("Could not fetch live scores. Will retry shortly.");
    }
    setLoading(false);
  }, [picks]);

  useEffect(() => {
    if (picks.length > 0) {
      fetchScores();
      const interval = setInterval(fetchScores, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [picks, fetchScores]);

  const rankedTeams = picks.map(team => {
    const withScores = team.golfers.map(name => ({
      name,
      relative: liveScores[name]?.relative ?? null,
      position: liveScores[name]?.position ?? null,
      missedCut: liveScores[name]?.missedCut ?? false,
      thru: liveScores[name]?.thru ?? null,
    }));

    let total = 0;
    if (!cutHappened) {
      const sorted = [...withScores].sort((a, b) => {
        if (a.relative === null && b.relative === null) return 0;
        if (a.relative === null) return 1;
        if (b.relative === null) return -1;
        return a.relative - b.relative;
      });
      total = sorted.slice(0, 4).reduce((sum, g) => sum + (g.relative ?? 0), 0);
    } else {
      const madeCut = withScores.filter(g => !g.missedCut);
      const sorted = [...madeCut].sort((a, b) => {
        if (a.relative === null && b.relative === null) return 0;
        if (a.relative === null) return 1;
        if (b.relative === null) return -1;
        return a.relative - b.relative;
      });
      const scoring = sorted.slice(0, 4);
      const penaltySlots = Math.max(0, 4 - scoring.length);
      total = scoring.reduce((sum, g) => sum + (g.relative ?? 0), 0)
        + penaltySlots * (worstMadeCut ?? 0);
    }

    return { ...team, golfers: withScores, total };
  }).sort((a, b) => a.total - b.total);

  // FLIP animation
  const cardRefs = useRef({});
  const prevPositions = useRef({});

  useEffect(() => {
    const newPositions = {};
    rankedTeams.forEach(team => {
      const el = cardRefs.current[team.name];
      if (el) newPositions[team.name] = el.getBoundingClientRect().top;
    });
    rankedTeams.forEach(team => {
      const el = cardRefs.current[team.name];
      const prev = prevPositions.current[team.name];
      const next = newPositions[team.name];
      if (el && prev !== undefined && Math.abs(prev - next) > 2) {
        const delta = prev - next;
        el.style.transition = "none";
        el.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => {
          el.style.transition = "transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
          el.style.transform = "translateY(0)";
        });
      }
    });
    prevPositions.current = newPositions;
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0a1a0f 0%, #0d2015 60%, #081510 100%)",
      fontFamily: "Georgia, serif",
      color: "#e8dfc4"
    }}>
      <div style={{
        borderBottom: `1px solid rgba(201,168,76,0.3)`,
        padding: "28px 24px 20px",
        textAlign: "center",
        position: "relative",
        background: "linear-gradient(180deg, rgba(201,168,76,0.06) 0%, transparent 100%)"
      }}>
        <div style={{ fontSize: 13, color: GOLD, letterSpacing: 4, textTransform: "uppercase", marginBottom: 6 }}>
          The Masters 2025
        </div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px, 6vw, 48px)", color: "#e8dfc4", margin: 0, fontWeight: 400, letterSpacing: 1 }}>
          Office Pool Leaderboard
        </h1>
        {cutHappened && worstMadeCut !== null && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
            Cut made · Penalty score: <span style={{ color: "#888" }}>{worstMadeCut > 0 ? `+${worstMadeCut}` : worstMadeCut}</span>
          </div>
        )}
        <div style={{ marginTop: 6, fontSize: 13 }}>
          {loading ? (
            <span style={{ color: GOLD }}>⟳ Updating scores...</span>
          ) : lastUpdated ? (
            <LastUpdatedTimer lastUpdated={lastUpdated} />
          ) : (
            <span style={{ color: "#666" }}>Awaiting scores...</span>
          )}
        </div>
        <div style={{ position: "absolute", top: 24, right: 20 }}>
          <button onClick={fetchScores} disabled={loading} style={{
            background: "none", border: `1px solid rgba(201,168,76,0.4)`, borderRadius: 8,
            color: GOLD, padding: "6px 14px", fontSize: 12, cursor: "pointer"
          }}>{loading ? "..." : "↻ Refresh"}</button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 48px" }}>
        {error && (
          <div style={{
            background: "rgba(224,82,82,0.1)", border: "1px solid #e05252",
            borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#e05252"
          }}>{error}</div>
        )}

        {picks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⛳</div>
            <p style={{ color: "#666", fontSize: 16 }}>No picks entered yet.</p>
            <p style={{ color: "#555", fontSize: 14 }}>Click <strong style={{ color: GOLD }}>Admin</strong> below to add participants and their golfer picks.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rankedTeams.map((team, i) => (
              <div key={team.name} ref={el => cardRefs.current[team.name] = el}>
                <TeamCard
                  team={team}
                  rank={i + 1}
                  cutHappened={cutHappened}
                  worstMadeCut={worstMadeCut}
                  expanded={expandedTeams.current.has(team.name)}
                  onToggle={() => toggleTeam(team.name)}
                />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 28, textAlign: "center", fontSize: 12, color: "#444", marginBottom: 16 }}>
          {cutHappened
            ? "Post-cut: best 4 survivors score · missed cut spots filled with penalty score"
            : "Top 4 of 6 golfers score · Worst 2 dropped automatically · Scores update every 5 minutes"
          }
        </div>

        <div style={{ textAlign: "center" }}>
          <button onClick={() => authed ? setShowAdmin(true) : setShowPasswordModal(true)} style={{
            background: "none", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 8,
            color: "#555", padding: "8px 20px", fontSize: 12, cursor: "pointer", letterSpacing: 1
          }}>⚙ Admin</button>
        </div>
      </div>

      {showPasswordModal && (
        <PasswordModal
          onSuccess={() => { setAuthed(true); setShowPasswordModal(false); setShowAdmin(true); }}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
      {showAdmin && (
        <AdminPanel picks={picks} onSave={savePicks} onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
}
