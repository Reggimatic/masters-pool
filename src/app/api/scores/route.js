import { supabase } from "@/lib/supabase";

export async function POST(request) {
  const { golferNames, tournamentName } = await request.json();

  const espnRes = await fetch(
    "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
    { next: { revalidate: 0 } }
  );
  if (!espnRes.ok) {
    return Response.json(
      { error: `ESPN API returned ${espnRes.status}` },
      { status: 502 }
    );
  }

  const espn = await espnRes.json();

  // Find the matching event (or use the first/only one)
  const events = espn.events || [];
  const event =
    events.find((e) =>
      e.name?.toLowerCase().includes(tournamentName?.toLowerCase())
    ) || events[0];

  if (!event) {
    return Response.json({ error: "No active tournament found on ESPN" }, { status: 404 });
  }

  const competition = event.competitions?.[0];
  if (!competition) {
    return Response.json({ error: "No competition data found" }, { status: 404 });
  }

  const competitors = competition.competitors || [];

  // Determine current round from the competition status
  const statusDetail = competition.status?.type?.detail || "";
  const roundMatch = statusDetail.match(/Round (\d)/i);
  let round = roundMatch ? parseInt(roundMatch[1]) : 1;

  // Also check period from status
  if (competition.status?.period) {
    round = Math.max(round, competition.status.period);
  }

  // Build a name-lookup map: normalize names for fuzzy matching
  const normalize = (n) =>
    n?.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();

  const competitorMap = new Map();
  competitors.forEach((c) => {
    const athlete = c.athlete || {};
    const fullName = athlete.displayName || athlete.shortName || "";
    competitorMap.set(normalize(fullName), { competitor: c, fullName });
    // Also index by last name for partial matches
    const lastName = fullName.split(" ").pop();
    if (lastName && !competitorMap.has(normalize(lastName))) {
      competitorMap.set(normalize(lastName), { competitor: c, fullName });
    }
  });

  // Determine positions with tie detection
  // ESPN competitors are sorted by score, so we can derive position
  const sortedCompetitors = [...competitors].sort((a, b) => {
    const aScore = parseScore(a.score);
    const bScore = parseScore(b.score);
    if (aScore === null && bScore === null) return 0;
    if (aScore === null) return 1;
    if (bScore === null) return -1;
    return aScore - bScore;
  });

  const positionMap = new Map();
  sortedCompetitors.forEach((c, idx) => {
    const score = parseScore(c.score);
    // Count how many have the same score for tie detection
    let pos = idx + 1;
    if (score !== null) {
      const firstWithScore = sortedCompetitors.findIndex(
        (x) => parseScore(x.score) === score
      );
      pos = firstWithScore + 1;
      const countWithScore = sortedCompetitors.filter(
        (x) => parseScore(x.score) === score
      ).length;
      const name = c.athlete?.displayName || c.athlete?.shortName || "";
      positionMap.set(normalize(name), countWithScore > 1 ? `T${pos}` : `${pos}`);
    }
  });

  // Fetch manual withdrawals from Supabase
  const { data: withdrawalData } = await supabase
    .from("withdrawals")
    .select("golfer_name")
    .eq("tournament", tournamentName);
  const withdrawnNames = new Set((withdrawalData || []).map((w) => normalize(w.golfer_name)));

  // Determine cut status
  let cutHappened = false;
  let worstMadeCutScore = null;
  let worstMadeCutName = null;

  // Check if any competitor has explicit status indicating they missed the cut
  const hasCutIndicators = competitors.some((c) => {
    const status = c.status?.type?.name?.toLowerCase() || "";
    return status === "cut" || status === "missed cut";
  });

  // Helper: determine if a competitor made the cut (and is still active)
  const didMakeCut = (c) => {
    const name = c.athlete?.displayName || c.athlete?.shortName || "";
    if (withdrawnNames.has(normalize(name))) return false;
    const status = c.status?.type?.name?.toLowerCase() || "";
    if (status === "cut" || status === "missed cut") return false;
    if (status === "wd" || status === "dq") return false;
    if (hasCutIndicators) return true;

    // No explicit cut statuses — infer from linescore count.
    // Players who made the cut have R3/R4 linescore entries (4 total);
    // players who missed the cut only have R1/R2 (2 total).
    if (round >= 3) {
      return (c.linescores || []).length > 2;
    }
    return true;
  };

  if (hasCutIndicators || round >= 3) {
    cutHappened = true;
    const madeCutCompetitors = competitors.filter((c) => didMakeCut(c));
    const madeCutScores = madeCutCompetitors
      .map((c) => parseScore(c.score))
      .filter((s) => s !== null);
    if (madeCutScores.length > 0) {
      worstMadeCutScore = Math.max(...madeCutScores);
      const worstPlayer = madeCutCompetitors.find((c) => parseScore(c.score) === worstMadeCutScore);
      worstMadeCutName = worstPlayer?.athlete?.displayName || worstPlayer?.athlete?.shortName || null;
    }
  }

  // Compute 9-hole checkpoint scores for all made-cut competitors (for chart penalty calculation)
  const allMadeCutNineScores = [];
  if (cutHappened) {
    competitors.filter((c) => didMakeCut(c)).forEach((c) => {
      const ls = c.linescores || [];
      const scores = [];
      let cum = 0;
      for (let r = 1; r <= 4; r++) {
        const rs = ls.find((l) => l.period === r);
        const holes = rs?.linescores || [];
        if (holes.length === 0) break;
        const front9 = holes.slice(0, 9);
        const back9 = holes.slice(9, 18);
        if (front9.length === 9) {
          cum += front9.reduce((sum, h) => sum + parseRelativeHole(h.scoreType?.displayValue), 0);
          scores.push(cum);
        } else break;
        if (back9.length === 9) {
          cum += back9.reduce((sum, h) => sum + parseRelativeHole(h.scoreType?.displayValue), 0);
          scores.push(cum);
        } else break;
      }
      allMadeCutNineScores.push(scores);
    });
  }

  // Build golfer results
  const golfers = {};
  for (const name of golferNames) {
    const norm = normalize(name);
    const match = competitorMap.get(norm);

    if (!match) {
      golfers[name] = { relative: null, today: null, thru: null, position: null, missedCut: false };
      continue;
    }

    const { competitor: c } = match;
    const relative = parseScore(c.score);

    // Compute "today" from the current round's linescore only
    const linescores = c.linescores || [];
    let today = null;
    const currentRoundScore = linescores.find((ls) => ls.period === round);
    if (currentRoundScore?.displayValue != null && currentRoundScore.displayValue !== "") {
      today = parseScore(String(currentRoundScore.displayValue));
    }

    // Compute "thru" from hole count in the current round
    let thru = null;
    if (currentRoundScore) {
      const holesPlayed = currentRoundScore.linescores?.length || 0;
      if (holesPlayed === 18) thru = "F";
      else if (holesPlayed > 0) thru = String(holesPlayed);
      // 0 holes = not started, leave as null
    }

    // Compute cumulative score at each 9-hole checkpoint
    const nineScores = [];
    let cumulative = 0;
    for (let r = 1; r <= 4; r++) {
      const rs = linescores.find((ls) => ls.period === r);
      const holes = rs?.linescores || [];
      if (holes.length === 0) break;

      const front9 = holes.slice(0, 9);
      const back9 = holes.slice(9, 18);

      if (front9.length === 9) {
        const front9Rel = front9.reduce((sum, h) => sum + parseRelativeHole(h.scoreType?.displayValue), 0);
        cumulative += front9Rel;
        nineScores.push({ label: `R${r}-Out`, cumulative, holes: 9 });
      } else if (front9.length > 0) {
        // Partial front 9 — in progress, don't plot
        break;
      } else {
        break;
      }

      if (back9.length === 9) {
        const back9Rel = back9.reduce((sum, h) => sum + parseRelativeHole(h.scoreType?.displayValue), 0);
        cumulative += back9Rel;
        nineScores.push({ label: `R${r}-Tot`, cumulative, holes: 18 });
      } else {
        // Partial back 9 — in progress, don't plot
        break;
      }
    }

    // Missed cut / withdrawn detection
    const withdrawn = withdrawnNames.has(norm);
    const missedCut = (cutHappened && !didMakeCut(c)) || withdrawn;

    const position = positionMap.get(norm) || c.status?.position?.displayName || null;

    golfers[name] = { relative, today, thru, position, missedCut, withdrawn, nineScores };
  }

  return Response.json({
    round,
    cutHappened,
    worstMadeCutScore,
    worstMadeCutName,
    allMadeCutNineScores,
    golfers,
    tournamentName: event.name || tournamentName,
  });
}

function parseRelativeHole(displayValue) {
  if (!displayValue) return 0;
  const s = String(displayValue).trim();
  if (s === "E") return 0;
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function parseScore(scoreStr) {
  if (scoreStr === undefined || scoreStr === null || scoreStr === "") return null;
  const s = String(scoreStr).trim();
  if (s === "E" || s === "even" || s === "Even") return 0;
  const num = parseInt(s, 10);
  return isNaN(num) ? null : num;
}
