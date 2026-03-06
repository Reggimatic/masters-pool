"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_PASSWORD = "augusta2025";
const GOLD = "#c9a84c";

function countryFlag(code) {
  if (!code) return "";
  const upper = code.toUpperCase().trim();
  if (upper.length !== 2) return "";
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
      background: "linear-gradient(180deg, #0a1a0f 0%, #0d2015 60%, #081510 100%)",
      fontFamily: "Georgia, serif",
      color: "#e8dfc4",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⛳</div>
      <div style={{ fontSize: 13, color: GOLD, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
        Golf Pool
      </div>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(24px, 5vw, 40px)", color: "#e8dfc4", margin: "0 0 40px", fontWeight: 400, textAlign: "center" }}>
        Select Your Pool
      </h1>

      {loading ? (
        <div style={{ color: "#555" }}>Loading...</div>
      ) : (
        <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Tournament selector */}
          <div>
            <label style={{ fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Tournament
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tournaments.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTournament(t.id)}
                  style={{
                    background: selectedTournament === t.id ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedTournament === t.id ? GOLD : "rgba(201,168,76,0.2)"}`,
                    borderRadius: 10, padding: "14px 18px", cursor: "pointer",
                    color: selectedTournament === t.id ? "#e8dfc4" : "#888",
                    fontFamily: "Georgia, serif", fontSize: 16, textAlign: "left",
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
            <label style={{ fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Group
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g.id)}
                  style={{
                    background: selectedGroup === g.id ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${selectedGroup === g.id ? GOLD : "rgba(201,168,76,0.2)"}`,
                    borderRadius: 10, padding: "14px 18px", cursor: "pointer",
                    color: selectedGroup === g.id ? "#e8dfc4" : "#888",
                    fontFamily: "Georgia, serif", fontSize: 16, textAlign: "left",
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
              background: canGo ? GOLD : "rgba(201,168,76,0.15)",
              border: "none", borderRadius: 10, padding: "14px",
              color: canGo ? "#0d1f14" : "#555",
              fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700,
              cursor: canGo ? "pointer" : "default",
              transition: "all 0.2s",
            }}
          >
            View Leaderboard →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Shared UI Components ────────────────────────────────────────────────────

function LastUpdatedTimer({ lastUpdated }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 10000);
    return () => clearInterval(interval);
  }, [lastUpdated]);
  const format = (secs) => secs < 60 ? "just now" : `${Math.floor(secs / 60)}m ago`;
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
  const flag = isPenalty || isCut ? "" : countryFlag(golfer.country);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      opacity: isCut ? 0.35 : 1,
      padding: "4px 0",
      borderBottom: "1px solid rgba(201,168,76,0.08)"
    }}>
      <span style={{ fontSize: 11, color: GOLD, minWidth: 20, textAlign: "right", fontFamily: "monospace", textDecoration: isCut ? "line-through" : "none", flexShrink: 0 }}>
        {isCut || isPenalty ? "—" : (golfer.position || "—")}
      </span>
      <span style={{ fontSize: 14, minWidth: 20, textAlign: "center", flexShrink: 0, lineHeight: 1 }}>{flag}</span>
      <span style={{ flex: 1, fontSize: 13, color: isCut ? "#666" : isPenalty ? "#888" : "#e8dfc4", fontStyle: (isCut || isPenalty) ? "italic" : "normal", letterSpacing: 0.2, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {isPenalty ? "Penalty (missed cut)" : golfer.name}
        {isCut && !isPenalty && <span style={{ fontSize: 10, marginLeft: 6, color: "#555" }}>(missed cut)</span>}
      </span>
      <span style={{ fontSize: 11, color: "#555", minWidth: 28, textAlign: "right", fontFamily: "monospace", flexShrink: 0 }}>
        {isCut ? <span style={{ color: "#555", fontSize: 11 }}>MC</span>
          : isPenalty ? ""
          : (golfer.thru === "F" ? <span style={{ color: "#666" }}>F</span> : (golfer.thru ?? "—"))}
      </span>
      <span style={{ fontSize: 13, minWidth: 36, textAlign: "right", flexShrink: 0 }}>
        {!isCut && <ScoreDisplay relative={golfer.relative} />}
      </span>
    </div>
  );
}

function GolferRowHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0 4px", borderBottom: "1px solid rgba(201,168,76,0.15)", marginBottom: 2 }}>
      <span style={{ fontSize: 10, color: "#444", minWidth: 20, textAlign: "right", flexShrink: 0 }}>POS</span>
      <span style={{ fontSize: 10, color: "#444", minWidth: 20, flexShrink: 0 }}></span>
      <span style={{ flex: 1, fontSize: 10, color: "#444" }}>PLAYER</span>
      <span style={{ fontSize: 10, color: "#444", minWidth: 28, textAlign: "right", flexShrink: 0 }}>THRU</span>
      <span style={{ fontSize: 10, color: "#444", minWidth: 36, textAlign: "right", flexShrink: 0 }}>SCORE</span>
    </div>
  );
}

function TeamCard({ team, rank, cutHappened, worstMadeCut, expanded, onToggle }) {
  const madeCut = team.golfers.filter(g => !g.missedCut);
  const missedCut = team.golfers.filter(g => g.missedCut);
  let scoringGolfers = [], droppedGolfers = [], penaltySlots = 0;

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

  const total = scoringGolfers.reduce((sum, g) => sum + (g.relative ?? 0), 0) + penaltySlots * (worstMadeCut ?? 0);
  const totalLabel = total === 0 ? "E" : total > 0 ? `+${total}` : `${total}`;
  const totalColor = total < 0 ? "#e05252" : total > 0 ? "#aaa" : "#c9a84c";
  const medals = ["🥇", "🥈", "🥉"];
  const topNames = scoringGolfers.slice(0, 4).map(g => `${countryFlag(g.country)} ${g.name.split(" ").pop()}`.trim()).join("  ");

  return (
    <div style={{ background: "linear-gradient(160deg, #12261a 0%, #0d1f14 100%)", border: `1px solid ${rank === 1 ? GOLD : "rgba(201,168,76,0.2)"}`, borderRadius: 12, boxShadow: rank === 1 ? `0 0 24px rgba(201,168,76,0.18)` : "0 2px 12px rgba(0,0,0,0.4)", overflow: "hidden" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 20px", cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 18, minWidth: 26 }}>{medals[rank - 1] || rank}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 17, color: "#e8dfc4", letterSpacing: 0.5 }}>{team.name}</div>
          {!expanded && topNames && (
            <div style={{ fontSize: 11, color: "#666", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {topNames}{penaltySlots > 0 ? `  + ${penaltySlots} penalty` : ""}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: totalColor, fontFamily: "monospace", letterSpacing: 1 }}>{totalLabel}</div>
          <span style={{ color: "#555", fontSize: 12, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s", display: "inline-block", lineHeight: 1 }}>▼</span>
        </div>
      </div>
      <div style={{ maxHeight: expanded ? "600px" : "0px", overflow: "hidden", transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <div style={{ padding: "0 20px 16px", borderTop: "1px solid rgba(201,168,76,0.1)" }}>
          <div style={{ paddingTop: 6 }}>
            <GolferRowHeader />
            {scoringGolfers.map(g => <GolferRow key={g.name} golfer={g} isCut={false} isPenalty={false} />)}
            {Array.from({ length: penaltySlots }).map((_, i) => <GolferRow key={`penalty-${i}`} golfer={{ relative: worstMadeCut }} isCut={false} isPenalty={true} />)}
            {droppedGolfers.map(g => <GolferRow key={g.name} golfer={g} isCut={cutHappened && g.missedCut} isPenalty={false} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Panel ─────────────────────────────────────────────────────────────

const COUNTRY_HINT = "2-letter code: US, GB, AU, IE, ZA, ES, JP, SE, NO, DE, CA, AR, KR...";

function AdminPanel({ picks, tournament, group, onSave, onClose }) {
  const emptyGolfer = { name: "", country: "" };
  const [tab, setTab] = useState("picks");
  const [teams, setTeams] = useState(
    picks.length > 0
      ? picks.map(p => ({ name: p.name, golfers: [...p.golfers.map(g => ({ name: g.name || g, country: g.country || "" })), ...Array(6).fill(null).map(() => ({ ...emptyGolfer }))].slice(0, 6) }))
      : [{ name: "", golfers: Array(6).fill(null).map(() => ({ ...emptyGolfer })) }]
  );
  const [saving, setSaving] = useState(false);

  // Tournament/group management
  const [tournaments, setTournaments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [newTournamentId, setNewTournamentId] = useState("");
  const [newTournamentName, setNewTournamentName] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    if (tab === "manage") {
      (async () => {
        const [{ data: t }, { data: g }] = await Promise.all([
          supabase.from("tournaments").select("*").order("created_at", { ascending: false }),
          supabase.from("groups").select("*").order("created_at")
        ]);
        setTournaments(t || []);
        setGroups(g || []);
      })();
    }
  }, [tab]);

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
    await onSave(clean);
    setSaving(false);
    onClose();
  };

  const inputStyle = { background: "#0d1f14", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 6, color: "#e8dfc4", padding: "6px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" };

  const tabStyle = (active) => ({
    flex: 1, background: "none", border: "none",
    borderBottom: `2px solid ${active ? GOLD : "transparent"}`,
    color: active ? GOLD : "#555", padding: "10px", cursor: "pointer",
    fontSize: 13, letterSpacing: 1, textTransform: "uppercase"
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#12261a", border: `1px solid ${GOLD}`, borderRadius: 16, padding: 28, maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 22, margin: 0 }}>Admin</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
          {tournaments.find ? "" : ""}{group} · {tournament}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(201,168,76,0.15)", marginBottom: 20 }}>
          <button style={tabStyle(tab === "picks")} onClick={() => setTab("picks")}>Picks</button>
          <button style={tabStyle(tab === "manage")} onClick={() => setTab("manage")}>Tournaments & Groups</button>
        </div>

        {tab === "picks" && (
          <>
            <p style={{ color: "#555", fontSize: 11, marginBottom: 16 }}>{COUNTRY_HINT}</p>
            {teams.map((team, ti) => (
              <div key={ti} style={{ background: "#0d1f14", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid rgba(201,168,76,0.15)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <input style={{ ...inputStyle, fontSize: 15, fontWeight: 600, flex: 1 }} placeholder="Participant name" value={team.name} onChange={e => updateTeamName(ti, e.target.value)} />
                  <button onClick={() => removeTeam(ti)} style={{ marginLeft: 10, background: "none", border: "1px solid #e05252", color: "#e05252", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Remove</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 52px", gap: 6, marginBottom: 4, padding: "0 2px" }}>
                  <span style={{ fontSize: 10, color: "#444" }}>GOLFER NAME</span>
                  <span style={{ fontSize: 10, color: "#444", textAlign: "center" }}>FLAG</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {team.golfers.map((g, gi) => (
                    <div key={gi} style={{ display: "grid", gridTemplateColumns: "1fr 52px", gap: 6, alignItems: "center" }}>
                      <input style={{ ...inputStyle, width: "100%" }} placeholder={`Golfer ${gi + 1}${gi >= 4 ? " (reserve)" : ""}`} value={g.name} onChange={e => updateGolferField(ti, gi, "name", e.target.value)} />
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input style={{ ...inputStyle, width: "100%", textAlign: "center", textTransform: "uppercase", letterSpacing: 2, padding: "6px 4px" }} placeholder="US" maxLength={2} value={g.country} onChange={e => updateGolferField(ti, gi, "country", e.target.value)} />
                        <span style={{ fontSize: 18, minWidth: 24, textAlign: "center" }}>{countryFlag(g.country)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={addTeam} style={{ flex: 1, background: "none", border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 8, padding: "10px", cursor: "pointer", fontSize: 14 }}>+ Add Participant</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: GOLD, border: "none", color: "#0d1f14", borderRadius: 8, padding: "10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>{saving ? "Saving..." : "Save Picks"}</button>
            </div>
          </>
        )}

        {tab === "manage" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Tournaments */}
            <div>
              <h3 style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 16, margin: "0 0 12px" }}>Tournaments</h3>
              {tournaments.map(t => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
                  <div>
                    <div style={{ color: "#e8dfc4", fontSize: 14 }}>{t.display_name}</div>
                    <div style={{ color: "#555", fontSize: 11, fontFamily: "monospace" }}>{t.id}</div>
                  </div>
                  <button onClick={() => deleteTournament(t.id)} style={{ background: "none", border: "1px solid #e05252", color: "#e05252", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>Delete</button>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                <input style={{ ...inputStyle, width: "100%" }} placeholder='ID e.g. "us-open-2025"' value={newTournamentId} onChange={e => setNewTournamentId(e.target.value)} />
                <input style={{ ...inputStyle, width: "100%" }} placeholder='Name e.g. "US Open 2025"' value={newTournamentName} onChange={e => setNewTournamentName(e.target.value)} />
              </div>
              <button onClick={addTournament} style={{ marginTop: 8, width: "100%", background: "none", border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 8, padding: "8px", cursor: "pointer", fontSize: 13 }}>+ Add Tournament</button>
            </div>

            {/* Groups */}
            <div>
              <h3 style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 16, margin: "0 0 12px" }}>Groups</h3>
              {groups.map(g => (
                <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
                  <div>
                    <div style={{ color: "#e8dfc4", fontSize: 14 }}>{g.display_name}</div>
                    <div style={{ color: "#555", fontSize: 11, fontFamily: "monospace" }}>{g.id}</div>
                  </div>
                  <button onClick={() => deleteGroup(g.id)} style={{ background: "none", border: "1px solid #e05252", color: "#e05252", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>Delete</button>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                <input style={{ ...inputStyle, width: "100%" }} placeholder='ID e.g. "college-friends"' value={newGroupId} onChange={e => setNewGroupId(e.target.value)} />
                <input style={{ ...inputStyle, width: "100%" }} placeholder='Name e.g. "College Friends"' value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
              </div>
              <button onClick={addGroup} style={{ marginTop: 8, width: "100%", background: "none", border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 8, padding: "8px", cursor: "pointer", fontSize: 13 }}>+ Add Group</button>
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
  const attempt = () => { if (val === ADMIN_PASSWORD) { onSuccess(); } else { setErr(true); setVal(""); } };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#12261a", border: `1px solid ${GOLD}`, borderRadius: 16, padding: 36, maxWidth: 340, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⛳</div>
        <h2 style={{ color: GOLD, fontFamily: "Georgia, serif", marginBottom: 20 }}>Admin Access</h2>
        <input type="password" value={val} onChange={e => { setVal(e.target.value); setErr(false); }} onKeyDown={e => e.key === "Enter" && attempt()} placeholder="Password"
          style={{ width: "100%", boxSizing: "border-box", background: "#0d1f14", border: `1px solid ${err ? "#e05252" : "rgba(201,168,76,0.4)"}`, borderRadius: 8, color: "#e8dfc4", padding: "10px 14px", fontSize: 15, outline: "none", marginBottom: 8 }} />
        {err && <p style={{ color: "#e05252", fontSize: 13, margin: "0 0 10px" }}>Incorrect password</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: "1px solid #555", borderRadius: 8, padding: "11px", fontSize: 15, color: "#888", cursor: "pointer" }}>Cancel</button>
          <button onClick={attempt} style={{ flex: 1, background: GOLD, border: "none", borderRadius: 8, padding: "11px", fontSize: 15, fontWeight: 700, color: "#0d1f14", cursor: "pointer" }}>Enter</button>
        </div>
      </div>
    </div>
  );
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

function Leaderboard({ tournament, group, tournamentName, groupName, onBack }) {
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
    if (expandedTeams.current.has(name)) expandedTeams.current.delete(name);
    else expandedTeams.current.add(name);
    forceUpdate(n => n + 1);
  };

  const loadPicks = useCallback(async () => {
    const { data } = await supabase.from("picks").select("*").eq("tournament", tournament).eq("group_name", group);
    if (data) setPicks(data.map(row => ({
      name: row.participant,
      golfers: Array.isArray(row.golfers) ? row.golfers.map(g => typeof g === "string" ? { name: g, country: "" } : g) : []
    })));
  }, [tournament, group]);

  useEffect(() => { loadPicks(); }, [loadPicks]);

  const savePicks = async (newPicks) => {
    await supabase.from("picks").delete().eq("tournament", tournament).eq("group_name", group);
    for (const p of newPicks) {
      await supabase.from("picks").insert({ participant: p.name, golfers: p.golfers, tournament, group_name: group });
    }
    await loadPicks();
  };

  const fetchScores = useCallback(async () => {
    if (picks.length === 0) return;
    setLoading(true); setError(null);
    try {
      const allGolfers = [...new Set(picks.flatMap(p => p.golfers.map(g => g.name || g)))];
      const response = await fetch("/api/scores", {
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
          messages: [{ role: "user", content: `Get current ${tournamentName} scores for these golfers: ${allGolfers.join(", ")}. Include what hole each player is through in the current round. Also determine if the cut has happened and the worst score among all players who made the cut. Return only the JSON object.` }],
          tools: [{ type: "web_search_20250305", name: "web_search" }]
        })
      });
      const data = await response.json();
      const textBlock = data.content?.find(b => b.type === "text");
      if (textBlock) {
        const raw = textBlock.text;
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");
        const parsed = JSON.parse(jsonMatch[0]);
        setLiveScores(parsed.golfers || {});
        setCutHappened(parsed.cutHappened || false);
        setWorstMadeCut(parsed.worstMadeCutScore ?? null);
        setLastUpdated(new Date());
      }
    } catch (e) { setError("Could not fetch live scores. Will retry shortly."); }
    setLoading(false);
  }, [picks, tournamentName]);

  useEffect(() => {
    if (picks.length > 0) {
      fetchScores();
      const interval = setInterval(fetchScores, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [picks, fetchScores]);

  const rankedTeams = picks.map(team => {
    const withScores = team.golfers.map(g => {
      const name = g.name || g;
      return { name, country: g.country || "", relative: liveScores[name]?.relative ?? null, position: liveScores[name]?.position ?? null, missedCut: liveScores[name]?.missedCut ?? false, thru: liveScores[name]?.thru ?? null };
    });
    let total = 0;
    if (!cutHappened) {
      const sorted = [...withScores].sort((a, b) => { if (a.relative === null && b.relative === null) return 0; if (a.relative === null) return 1; if (b.relative === null) return -1; return a.relative - b.relative; });
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
    rankedTeams.forEach(team => {
      const el = cardRefs.current[team.name]; const prev = prevPositions.current[team.name]; const next = newPositions[team.name];
      if (el && prev !== undefined && Math.abs(prev - next) > 2) {
        const delta = prev - next;
        el.style.transition = "none"; el.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => { el.style.transition = "transform 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)"; el.style.transform = "translateY(0)"; });
      }
    });
    prevPositions.current = newPositions;
  });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #0a1a0f 0%, #0d2015 60%, #081510 100%)", fontFamily: "Georgia, serif", color: "#e8dfc4" }}>
      <div style={{ borderBottom: `1px solid rgba(201,168,76,0.3)`, padding: "28px 24px 20px", textAlign: "center", position: "relative", background: "linear-gradient(180deg, rgba(201,168,76,0.06) 0%, transparent 100%)" }}>
        <button onClick={onBack} style={{ position: "absolute", top: 24, left: 20, background: "none", border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 8, color: "#666", padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>← Back</button>
        <div style={{ fontSize: 13, color: GOLD, letterSpacing: 4, textTransform: "uppercase", marginBottom: 4 }}>{tournamentName}</div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(24px, 5vw, 42px)", color: "#e8dfc4", margin: "0 0 2px", fontWeight: 400, letterSpacing: 1 }}>Leaderboard</h1>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>{groupName}</div>
        {cutHappened && worstMadeCut !== null && <div style={{ fontSize: 12, color: "#666" }}>Cut made · Penalty: <span style={{ color: "#888" }}>{worstMadeCut > 0 ? `+${worstMadeCut}` : worstMadeCut}</span></div>}
        <div style={{ marginTop: 6, fontSize: 13 }}>
          {loading ? <span style={{ color: GOLD }}>⟳ Updating scores...</span>
            : lastUpdated ? <LastUpdatedTimer lastUpdated={lastUpdated} />
            : <span style={{ color: "#666" }}>Awaiting scores...</span>}
        </div>
        <div style={{ position: "absolute", top: 24, right: 20 }}>
          <button onClick={fetchScores} disabled={loading} style={{ background: "none", border: `1px solid rgba(201,168,76,0.4)`, borderRadius: 8, color: GOLD, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>{loading ? "..." : "↻ Refresh"}</button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 48px" }}>
        {error && <div style={{ background: "rgba(224,82,82,0.1)", border: "1px solid #e05252", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#e05252" }}>{error}</div>}

        {picks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⛳</div>
            <p style={{ color: "#666", fontSize: 16 }}>No picks entered yet for this pool.</p>
            <p style={{ color: "#555", fontSize: 14 }}>Click <strong style={{ color: GOLD }}>Admin</strong> below to add participants.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rankedTeams.map((team, i) => (
              <div key={team.name} ref={el => cardRefs.current[team.name] = el}>
                <TeamCard team={team} rank={i + 1} cutHappened={cutHappened} worstMadeCut={worstMadeCut} expanded={expandedTeams.current.has(team.name)} onToggle={() => toggleTeam(team.name)} />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 28, textAlign: "center", fontSize: 12, color: "#444", marginBottom: 16 }}>
          {cutHappened ? "Post-cut: best 4 survivors score · missed cut spots filled with penalty score" : "Top 4 of 6 golfers score · Worst 2 dropped automatically · Scores update every 5 minutes"}
        </div>
        <div style={{ textAlign: "center" }}>
          <button onClick={() => authed ? setShowAdmin(true) : setShowPasswordModal(true)} style={{ background: "none", border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 8, color: "#555", padding: "8px 20px", fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>⚙ Admin</button>
        </div>
      </div>

      {showPasswordModal && <PasswordModal onSuccess={() => { setAuthed(true); setShowPasswordModal(false); setShowAdmin(true); }} onClose={() => setShowPasswordModal(false)} />}
      {showAdmin && <AdminPanel picks={picks} tournament={tournament} group={group} onSave={savePicks} onClose={() => setShowAdmin(false)} />}
    </div>
  );
}

// ─── App Shell (handles URL params) ─────────────────────────────────────────

function AppShell() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tournamentMeta, setTournamentMeta] = useState(null);
  const [groupMeta, setGroupMeta] = useState(null);

  const tournament = searchParams.get("tournament");
  const group = searchParams.get("group");

  useEffect(() => {
    if (tournament && group) {
      (async () => {
        const [{ data: t }, { data: g }] = await Promise.all([
          supabase.from("tournaments").select("*").eq("id", tournament).single(),
          supabase.from("groups").select("*").eq("id", group).single()
        ]);
        setTournamentMeta(t);
        setGroupMeta(g);
      })();
    }
  }, [tournament, group]);

  const handleSelect = (t, g) => {
    router.push(`?tournament=${t}&group=${g}`);
  };

  const handleBack = () => {
    router.push("/");
    setTournamentMeta(null);
    setGroupMeta(null);
  };

  if (!tournament || !group) {
    return <PickerPage onSelect={handleSelect} />;
  }

  if (!tournamentMeta || !groupMeta) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a1a0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontFamily: "Georgia, serif" }}>
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
      onBack={handleBack}
    />
  );
}

export default function MastersPool() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a1a0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontFamily: "Georgia, serif" }}>
        Loading...
      </div>
    }>
      <AppShell />
    </Suspense>
  );
}
