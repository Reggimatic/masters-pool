"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { GrRefresh } from "react-icons/gr";
import { IoSettingsOutline } from "react-icons/io5";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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
      background: "linear-gradient(180deg, #22563C 0%, #173C29 100%)",
      color: "#e8dfc4",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⛳</div>
      <div style={{ fontSize: 13, color: GOLD, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
        Golf Pool
      </div>
      <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "clamp(24px, 5vw, 40px)", color: "#e8dfc4", margin: "0 0 40px", fontWeight: 400, textAlign: "center" }}>
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
              background: canGo ? GOLD : "rgba(201,168,76,0.15)",
              border: "none", borderRadius: 10, padding: "14px",
              color: canGo ? "#0d1f14" : "#555",
              fontSize: 16, fontWeight: 700,
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
    <span style={{ color: "#5BD397", fontSize: 12 }}>
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

function GolferRow({ golfer, isCut, isPenalty, isDropped }) {
  const flag = isPenalty ? "" : countryFlag(golfer.country);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 12px",
      background: (isDropped || isCut) ? "#E8E8E8" : "transparent",
      borderBottom: "1px solid #D8D8D8"
    }}>
      <span style={{ fontSize: 13, color: "#408C64", minWidth: 24, textAlign: "right", fontFamily: "monospace", textDecoration: isCut ? "line-through" : "none", flexShrink: 0 }}>
        {isCut || isPenalty ? "—" : (golfer.position || "—")}
      </span>
      <span style={{ fontSize: 15, minWidth: 20, textAlign: "center", flexShrink: 0, lineHeight: 1 }}>{flag}</span>
      <span style={{ flex: 1, fontSize: 13, color: isCut ? "#8B8885" : isPenalty ? "#999" : isDropped ? "#8B8885" : "#63605E", fontStyle: (isCut || isPenalty) ? "italic" : "normal", letterSpacing: 0.2, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {isPenalty ? "Missed cut penalty" : golfer.name}
        {isCut && !isPenalty && <span style={{ fontSize: 11, marginLeft: 6, color: "#8B8885" }}>(missed cut)</span>}
      </span>
      <span style={{ fontSize: 13, minWidth: 36, textAlign: "right", fontFamily: "monospace", flexShrink: 0 }}>
        {!isCut && !isPenalty && golfer.today !== null && golfer.today !== undefined
          ? <span style={{ color: golfer.today < 0 ? "#BA0C2F" : "#2E7450", fontWeight: 400 }}>
              {golfer.today === 0 ? "E" : golfer.today > 0 ? `+${golfer.today}` : `${golfer.today}`}
            </span>
          : <span style={{ color: "#ccc" }}>—</span>}
      </span>
      <span style={{ fontSize: 13, minWidth: 28, textAlign: "right", fontFamily: "monospace", color: "#63605E", flexShrink: 0 }}>
        {!isCut && !isPenalty ? (golfer.thru || "—") : ""}
      </span>
      <span style={{ fontSize: 13, minWidth: 36, textAlign: "right", flexShrink: 0 }}>
        {!isCut && <ScoreDisplay relative={golfer.relative} isScoring={!isDropped && !isCut && !isPenalty} />}
      </span>
    </div>
  );
}

function GolferRowHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px 6px 12px", borderBottom: "2px solid #1a472a" }}>
      <span style={{ fontSize: 12, color: "#888", minWidth: 24, textAlign: "right", flexShrink: 0, fontWeight: 600, letterSpacing: 1 }}>POS</span>
      <span style={{ fontSize: 12, color: "#888", minWidth: 20, flexShrink: 0 }}></span>
      <span style={{ flex: 1, fontSize: 12, color: "#888", fontWeight: 600, letterSpacing: 1 }}>PLAYER</span>
      <span style={{ fontSize: 10, color: "#888", minWidth: 36, textAlign: "right", flexShrink: 0, fontWeight: 600, letterSpacing: 1 }}>TODAY</span>
      <span style={{ fontSize: 10, color: "#888", minWidth: 28, textAlign: "right", flexShrink: 0, fontWeight: 600, letterSpacing: 1 }}>THRU</span>
      <span style={{ fontSize: 10, color: "#888", minWidth: 36, textAlign: "right", flexShrink: 0, fontWeight: 600, letterSpacing: 1 }}>SCORE</span>
    </div>
  );
}

function TeamCard({ team, rank, cutHappened, worstMadeCut, expanded, onToggle, avatarUrl, chartColor }) {
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
  const totalColor = total < 0 ? "#BA0C2F" : "#2E7450";
  const formatScore = (s) => s === null || s === undefined ? "" : s === 0 ? "E" : s > 0 ? `+${s}` : `${s}`;
  const previewText = scoringGolfers.map(g => g.name.split(" ").pop()).join(", ");

  return (
    <div style={{ background: expanded ? "#fff" : "#E8E8E8", borderRadius: 7, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", overflow: "hidden" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", cursor: "pointer", userSelect: "none", background: "#E8E8E8", borderRadius: expanded ? "7px 7px 0 0" : 7 }}>
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
          {!expanded && previewText && (
            <div style={{ fontSize: 11, color: "#888", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {previewText}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: totalColor }}>{totalLabel}</div>
          <span style={{ color: "#807D7B", fontSize: 12, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s", display: "inline-block", lineHeight: 1 }}>▼</span>
        </div>
      </div>
      <div style={{ maxHeight: expanded ? "600px" : "0px", overflow: "hidden", transition: "max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <div style={{ padding: 10 }}>
          <div>
            <GolferRowHeader />
            {scoringGolfers.map(g => <GolferRow key={g.name} golfer={g} isCut={false} isPenalty={false} isDropped={false} />)}
            {Array.from({ length: penaltySlots }).map((_, i) => <GolferRow key={`penalty-${i}`} golfer={{ relative: worstMadeCut }} isCut={false} isPenalty={true} isDropped={false} />)}
            {droppedGolfers.map(g => <GolferRow key={g.name} golfer={g} isCut={cutHappened && g.missedCut} isPenalty={false} isDropped={true} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Panel ─────────────────────────────────────────────────────────────

const COUNTRY_HINT = "2-letter code: US, GB, AU, IE, ZA, ES, JP, SE, NO, DE, CA, AR, KR...";

function AdminPanel({ picks, tournament, group, onSave, onClose, avatars, onAvatarsChange }) {
  const emptyGolfer = { name: "", country: "" };
  const [tab, setTab] = useState("picks");
  const [teams, setTeams] = useState(
    picks.length > 0
      ? picks.map(p => ({ name: p.name, golfers: [...p.golfers.map(g => ({ name: g.name || g, country: g.country || "" })), ...Array(6).fill(null).map(() => ({ ...emptyGolfer }))].slice(0, 6) }))
      : [{ name: "", golfers: Array(6).fill(null).map(() => ({ ...emptyGolfer })) }]
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);

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
          <h2 style={{ color: GOLD, fontSize: 22, margin: 0, fontWeight: 700 }}>Admin</h2>
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
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 0", borderBottom: "1px solid rgba(201,168,76,0.1)" }}>
                  {avatars[team.name] ? (
                    <img src={avatars[team.name]} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 6, background: "#1a472a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⛳</div>
                  )}
                  <label style={{ background: "none", border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>
                    {uploading === team.name ? "Uploading..." : avatars[team.name] ? "Replace" : "Upload Image"}
                    <input type="file" accept="image/*" hidden onChange={e => { if (e.target.files[0] && team.name.trim()) uploadAvatar(team.name, e.target.files[0]); }} />
                  </label>
                  {avatars[team.name] && (
                    <button onClick={() => removeAvatar(team.name)} style={{ background: "none", border: "1px solid #e05252", color: "#e05252", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>Remove</button>
                  )}
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
              <h3 style={{ color: GOLD, fontSize: 16, margin: "0 0 12px", fontWeight: 700 }}>Tournaments</h3>
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
              <h3 style={{ color: GOLD, fontSize: 16, margin: "0 0 12px", fontWeight: 700 }}>Groups</h3>
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
      <div style={{ background: "rgb(20, 54, 37)", border: "1px solid rgb(51, 124, 87)", borderRadius: 16, padding: 36, maxWidth: 340, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⛳</div>
        <h2 style={{ color: "rgb(252, 227, 0)", marginBottom: 20, fontWeight: 700 }}>Admin Access</h2>
        <input type="password" value={val} onChange={e => { setVal(e.target.value); setErr(false); }} onKeyDown={e => e.key === "Enter" && attempt()} placeholder="Password"
          style={{ width: "100%", boxSizing: "border-box", background: "#ffffff", border: `2px solid ${err ? "#e05252" : "rgb(91, 211, 151)"}`, borderRadius: 8, color: "#333", padding: "10px 14px", fontSize: 15, outline: "none", marginBottom: 8 }} />
        {err && <p style={{ color: "#e05252", fontSize: 13, margin: "0 0 10px" }}>Incorrect password</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, background: "none", border: "1px solid #555", borderRadius: 8, padding: "11px", fontSize: 15, color: "#888", cursor: "pointer" }}>Cancel</button>
          <button onClick={attempt} style={{ flex: 1, background: "rgb(252, 227, 0)", border: "none", borderRadius: 8, padding: "11px", fontSize: 15, fontWeight: 700, color: "#0d1f14", cursor: "pointer" }}>Enter</button>
        </div>
      </div>
    </div>
  );
}

// ─── Score Trend Chart ───────────────────────────────────────────────────────

const TEAM_COLORS = ["#BA0C2F", "#2E7450", "#1a6dd4", "#e6a817", "#9b59b6", "#e67e22", "#1abc9c", "#e74c3c", "#3498db", "#2ecc71"];

function ScoreTrendChart({ teams, liveScores, cutHappened, worstMadeCut, allMadeCutNineScores }) {
  // Determine the maximum number of 9-hole checkpoints any golfer has completed
  const allNineScores = teams.flatMap(t => t.golfers.map(g => {
    const name = g.name || g;
    return liveScores[name]?.nineScores || [];
  }));
  const maxCheckpoints = Math.max(...allNineScores.map(s => s.length), 0);

  if (maxCheckpoints < 1) return null;

  // Build checkpoint labels from the first golfer that has the most data
  const longestScores = allNineScores.reduce((a, b) => a.length >= b.length ? a : b, []);
  const labels = longestScores.map(s => s.label);

  // Only plot a checkpoint if ALL relevant golfers across all teams have completed it
  // For R3+ checkpoints (index >= 4), only golfers who made the cut are relevant
  const allGolferNames = [...new Set(teams.flatMap(t => t.golfers.map(g => g.name || g)))];
  let plottableCheckpoints = 0;
  for (let i = 0; i < maxCheckpoints; i++) {
    const isPostCut = i >= 4 && cutHappened;
    const allComplete = allGolferNames.every(name => {
      const missedCut = liveScores[name]?.missedCut ?? false;
      if (isPostCut && missedCut) return true; // missed-cut golfers are irrelevant post-cut
      const scores = liveScores[name]?.nineScores || [];
      return scores.length > i;
    });
    if (allComplete) plottableCheckpoints = i + 1;
    else break;
  }

  if (plottableCheckpoints < 1) return null;

  // Start with everyone at E
  const chartData = [{ checkpoint: "Start" }];
  teams.forEach(team => { chartData[0][team.name] = 0; });

  // Build data for each plottable checkpoint
  for (let i = 0; i < plottableCheckpoints; i++) {
    const label = labels[i] || `${i + 1}`;
    const point = { checkpoint: label };

    teams.forEach(team => {
      const golferScores = team.golfers.map(g => {
        const name = g.name || g;
        const scores = liveScores[name]?.nineScores || [];
        const missedCut = liveScores[name]?.missedCut ?? false;
        return { name, score: scores[i]?.cumulative ?? null, missedCut };
      });

      // Determine if this checkpoint is post-cut (R3 or later = index >= 4)
      const isCutCheckpoint = i >= 4 && cutHappened;
      const eligible = isCutCheckpoint ? golferScores.filter(g => !g.missedCut) : golferScores;
      const withScores = eligible.filter(g => g.score !== null);
      const sorted = [...withScores].sort((a, b) => a.score - b.score);
      const scoring = sorted.slice(0, 4);

      if (scoring.length === 0) return;

      let total = scoring.reduce((sum, g) => sum + g.score, 0);
      if (isCutCheckpoint) {
        const penaltySlots = Math.max(0, 4 - scoring.length);
        // Compute worst-made-cut score at this specific checkpoint
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

  // Add "Now" point with current live totals (unless tournament is complete — all 8 checkpoints plotted)
  if (plottableCheckpoints < 8) {
    const nowPoint = { checkpoint: "LIVE" };
    teams.forEach(team => { nowPoint[team.name] = team.total; });
    chartData.push(nowPoint);
  }

  const teamNames = teams.map(t => t.name);

  const formatScore = (val) => {
    if (val === 0) return "E";
    if (val > 0) return `+${val}`;
    return `${val}`;
  };

  return (
    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 7, padding: "16px 8px 8px", marginBottom: 12 }}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
          <XAxis dataKey="checkpoint" tick={({ x, y, payload }) => (
            <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fill={payload.value === "LIVE" ? "rgb(252, 227, 0)" : "#e8dfc4"} fontWeight={payload.value === "LIVE" ? 700 : 400}>
              {payload.value}
            </text>
          )} axisLine={{ stroke: "#337B57" }} tickLine={false} />
          <YAxis tick={{ fill: "#e8dfc4", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatScore} width={35} reversed />
          <Tooltip
            contentStyle={{ background: "#ffffff", border: "1px solid #D8D8D8", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#143625", marginBottom: 4, fontWeight: 700 }}
            formatter={(value, name) => [formatScore(value), name]}
            itemSorter={(item) => item.value}
          />
          {teamNames.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={TEAM_COLORS[i % TEAM_COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 4, fill: TEAM_COLORS[i % TEAM_COLORS.length] }}
              activeDot={{ r: 6 }}
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

  const expandedTeams = useRef(new Set());
  const [, forceUpdate] = useState(0);
  const toggleTeam = (name) => {
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

  const fetchScores = useCallback(async () => {
    if (picks.length === 0) return;
    setLoading(true); setError(null);
    try {
      const allGolfers = [...new Set(picks.flatMap(p => p.golfers.map(g => g.name || g)))].sort();
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ golferNames: allGolfers, tournamentName })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setLiveScores(data.golfers || {});
      setCutHappened(data.cutHappened || false);
      setWorstMadeCut(data.worstMadeCutScore ?? null);
      setWorstMadeCutName(data.worstMadeCutName ?? null);
      setAllMadeCutNineScores(data.allMadeCutNineScores || []);
      setLastUpdated(new Date());
    } catch (e) { console.error("fetchScores error:", e.message); setError(`Could not fetch live scores: ${e.message}`); }
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
      return { name, country: g.country || "", relative: liveScores[name]?.relative ?? null, today: liveScores[name]?.today ?? null, thru: liveScores[name]?.thru ?? null, position: liveScores[name]?.position ?? null, missedCut: liveScores[name]?.missedCut ?? false };
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
            <button onClick={() => setShowChart(!showChart)} style={{ background: showChart ? "transparent" : "rgb(26, 68, 46)", border: "1px solid rgb(51, 124, 87)", color: showChart ? "#5BD397" : "#ffffff", borderRadius: 5, padding: "5px 12px", fontSize: 11, cursor: "pointer", letterSpacing: 0.5 }}>
              {showChart ? "Hide Event Flow" : "Show Event Flow"}
            </button>
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
              <div style={{ color: "#5BD397" }}>
                {cutHappened && worstMadeCut !== null && worstMadeCutName && (
                  <>Lowest made cut score: {worstMadeCut > 0 ? `+${worstMadeCut}` : worstMadeCut === 0 ? "E" : worstMadeCut} ({worstMadeCutName})</>
                )}
              </div>
              <div>
                {loading ? <span style={{ color: "#5BD397" }}>Scores updating...</span>
                  : lastUpdated ? <NextUpdateTimer lastUpdated={lastUpdated} onRefresh={fetchScores} />
                  : <span style={{ color: "#555" }}>—</span>}
              </div>
            </div>
            {rankedTeams.map((team, i) => (
              <div key={team.name} ref={el => cardRefs.current[team.name] = el}>
                <TeamCard team={team} rank={i + 1} cutHappened={cutHappened} worstMadeCut={worstMadeCut} expanded={expandedTeams.current.has(team.name)} onToggle={() => toggleTeam(team.name)} avatarUrl={avatars[team.name]} chartColor={TEAM_COLORS[i % TEAM_COLORS.length]} />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 12, color: "#5BD397", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href={`/rules?tournament=${tournament}&group=${group}`} style={{ color: "#5BD397", textDecoration: "underline" }}>Rules</a>
          <a onClick={() => authed ? setShowAdmin(true) : setShowPasswordModal(true)} style={{ color: "rgb(51, 124, 87)", cursor: "pointer", display: "flex", alignItems: "center" }}><IoSettingsOutline size={18} /></a>
        </div>
      </div>

      {showPasswordModal && <PasswordModal onSuccess={() => { setAuthed(true); setShowPasswordModal(false); setShowAdmin(true); }} onClose={() => setShowPasswordModal(false)} />}
      {showAdmin && <AdminPanel picks={picks} tournament={tournament} group={group} onSave={savePicks} onClose={() => setShowAdmin(false)} avatars={avatars} onAvatarsChange={setAvatars} />}
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
