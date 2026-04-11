import { supabase } from "@/lib/supabase";

/**
 * Fetch live scores from ESPN and compute golfer results.
 * Shared by the scores API route and the archive endpoint.
 *
 * @param {string[]} golferNames - Array of golfer names to look up
 * @param {string} tournamentName - Tournament display name for ESPN matching
 * @returns {{ error?: string, status?: number, ...results }} - Computed scores or error
 */
export async function computeScores(golferNames, tournamentName) {
  const espnRes = await fetch(
    "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
    { next: { revalidate: 0 } }
  );
  if (!espnRes.ok) {
    return { error: `ESPN API returned ${espnRes.status}`, status: 502 };
  }

  const espn = await espnRes.json();

  // Find the matching event — strip leading year (e.g. "2026 Masters" → "Masters")
  const events = espn.events || [];
  const stripYear = (s) => (s || "").replace(/^\d{4}\s+/, "").toLowerCase();
  const needle = stripYear(tournamentName);
  const event = events.find((e) => {
    const espnName = (e.name || "").toLowerCase();
    return espnName.includes(needle) || stripYear(e.name).includes(needle);
  });

  if (!event) {
    return { error: "Tournament not yet available on ESPN", status: 404 };
  }

  const competition = event.competitions?.[0];
  if (!competition) {
    return { error: "No competition data found", status: 404 };
  }

  const competitors = competition.competitors || [];

  // Determine current round from the competition status
  const statusDetail = competition.status?.type?.detail || "";
  const statusState = competition.status?.type?.state || "";
  const eventStartDate = event.date || "";
  const eventEndDate = event.endDate || "";
  const roundMatch = statusDetail.match(/Round (\d)/i);
  let round = roundMatch ? parseInt(roundMatch[1]) : 1;

  // Also check period from status
  if (competition.status?.period) {
    round = Math.max(round, competition.status.period);
  }

  // Cap round at 4 — playoff holes should not affect pool scoring
  if (round > 4) round = 4;

  // "Round 2 - Play Complete" means the cut has been made but ESPN hasn't
  // advanced the round counter yet. ESPN also doesn't tag individual
  // competitors as cut on the scoreboard endpoint, so we must compute the
  // made-cut set ourselves (see below).
  const round2Completed =
    round === 2 &&
    (competition.status?.type?.completed === true || /complete/i.test(statusDetail));

  // Try to fetch per-hole par from ESPN's core API (authoritative course data).
  let coursePar = null;
  try {
    const coreRes = await fetch(
      `https://sports.core.api.espn.com/v2/sports/golf/leagues/pga/events/${event.id}?lang=en`,
      { next: { revalidate: 3600 } }
    );
    if (coreRes.ok) {
      const coreData = await coreRes.json();
      const holes = coreData?.courses?.[0]?.holes;
      if (Array.isArray(holes) && holes.length === 18) {
        const sorted = [...holes].sort((a, b) => a.number - b.number);
        coursePar = sorted.map((h) => h.shotsToPar);
      }
    }
  } catch {
    // Fall through to linescore-based derivation
  }

  // Fallback: merge partial hole data across competitors.
  if (!coursePar) {
    const parByHole = {};
    for (const c of competitors) {
      const ls = c.linescores || [];
      for (const roundLs of ls) {
        const holes = roundLs.linescores || [];
        for (const h of holes) {
          if (parByHole[h.period] != null) continue;
          const rel = parseRelativeHole(h.scoreType?.displayValue);
          if (rel == null || h.value == null) continue;
          parByHole[h.period] = h.value - rel;
        }
      }
    }
    const partial = [];
    let any = false;
    for (let i = 1; i <= 18; i++) {
      const p = parByHole[i] ?? null;
      partial.push(p);
      if (p != null) any = true;
    }
    if (any) coursePar = partial;
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

  // Compute regulation score (R1-R4 only, excluding playoff holes)
  const getRegulationScore = (c) => {
    const ls = c.linescores || [];
    let total = 0;
    let hasAny = false;
    for (let r = 1; r <= 4; r++) {
      const rs = ls.find((l) => l.period === r);
      if (rs?.displayValue != null && rs.displayValue !== "") {
        const val = parseScore(String(rs.displayValue));
        if (val !== null) {
          total += val;
          hasAny = true;
        }
      }
    }
    return hasAny ? total : null;
  };

  // R1+R2 total — used for cut determination and for sorting missed-cut
  // players (whose "final" regulation score is locked after round 2).
  const getR1R2Score = (c) => {
    const ls = c.linescores || [];
    let total = 0;
    let hasAny = false;
    for (let r = 1; r <= 2; r++) {
      const rs = ls.find((l) => l.period === r);
      if (rs?.displayValue != null && rs.displayValue !== "") {
        const val = parseScore(String(rs.displayValue));
        if (val !== null) {
          total += val;
          hasAny = true;
        }
      }
    }
    return hasAny ? total : null;
  };

  // Fetch manual withdrawals from Supabase
  const { data: withdrawalData } = await supabase
    .from("withdrawals")
    .select("golfer_name")
    .eq("tournament", tournamentName);
  const withdrawnNames = new Set((withdrawalData || []).map((w) => normalize(w.golfer_name)));

  // Check if any competitor has explicit status indicating they missed the cut
  const hasCutIndicators = competitors.some((c) => {
    const status = c.status?.type?.name?.toLowerCase() || "";
    return status === "cut" || status === "missed cut";
  });

  // ESPN does not tag individual competitors as cut on the scoreboard
  // endpoint, and eagerly adds an empty round-3 linescore entry to every
  // player as soon as round 3 is scheduled — which breaks our old
  // "linescores.length > 2 → made cut" heuristic. Compute the made-cut set
  // ourselves using the Masters top-50-and-ties rule whenever the cut has
  // been made. The cut is based on R1+R2 totals only — using live regulation
  // scores would let mid-R3 play slide players across the cut line.
  // TODO: make the cut rule per-tournament (see project_cut_rules_per_tournament.md).
  let computedMadeCutIds = null;
  if (!hasCutIndicators && (round2Completed || round >= 3)) {
    const CUT_RANK = 50;
    const eligible = competitors
      .filter((c) => !withdrawnNames.has(normalize(c.athlete?.displayName || c.athlete?.shortName || "")))
      .map((c) => ({ c, score: getR1R2Score(c) }))
      .filter((x) => x.score != null)
      .sort((a, b) => a.score - b.score);
    if (eligible.length > 0) {
      const cutLineScore =
        eligible.length >= CUT_RANK
          ? eligible[CUT_RANK - 1].score
          : eligible[eligible.length - 1].score;
      computedMadeCutIds = new Set(
        eligible.filter((x) => x.score <= cutLineScore).map((x) => x.c.id)
      );
    }
  }

  // Helper: determine if a competitor made the cut (and is still active)
  const didMakeCut = (c) => {
    const name = c.athlete?.displayName || c.athlete?.shortName || "";
    if (withdrawnNames.has(normalize(name))) return false;
    const status = c.status?.type?.name?.toLowerCase() || "";
    if (status === "cut" || status === "missed cut") return false;
    if (status === "wd" || status === "dq") return false;
    if (hasCutIndicators) return true;
    if (computedMadeCutIds) return computedMadeCutIds.has(c.id);

    // No explicit cut statuses — infer from linescore count.
    if (round >= 3) {
      return (c.linescores || []).length > 2;
    }
    return true;
  };

  const cutHappened = hasCutIndicators || round >= 3 || round2Completed;

  // Sort competitors for display. When the cut has happened, missed-cut
  // players are tiered below made-cut players regardless of live R3+ scores
  // — otherwise a made-cut player's mid-round progress could visually push
  // them below a missed-cut player whose final R1+R2 total is lower.
  const isMissedOut = (c) => cutHappened && !didMakeCut(c);
  const sortedCompetitors = [...competitors].sort((a, b) => {
    const aMissed = isMissedOut(a);
    const bMissed = isMissedOut(b);
    if (aMissed !== bMissed) return aMissed ? 1 : -1;
    // Missed-cut players compare by R1+R2 (their locked final regulation
    // score); made-cut / pre-cut players compare by live regulation score.
    const aScore = aMissed ? getR1R2Score(a) : getRegulationScore(a);
    const bScore = bMissed ? getR1R2Score(b) : getRegulationScore(b);
    if (aScore === null && bScore === null) return 0;
    if (aScore === null) return 1;
    if (bScore === null) return -1;
    return aScore - bScore;
  });

  // Build position map. Missed-cut players don't get positions (they show
  // "CUT" in the score column) — and including them would corrupt tie
  // detection for made-cut players who happen to share a live score with
  // a missed-cut player's R1+R2 total.
  const positionMap = new Map();
  const rankedForPositions = cutHappened
    ? sortedCompetitors.filter((c) => didMakeCut(c))
    : sortedCompetitors;
  rankedForPositions.forEach((c) => {
    const score = getRegulationScore(c);
    if (score === null) return;
    const firstWithScore = rankedForPositions.findIndex(
      (x) => getRegulationScore(x) === score
    );
    const countWithScore = rankedForPositions.filter(
      (x) => getRegulationScore(x) === score
    ).length;
    const pos = firstWithScore + 1;
    const name = c.athlete?.displayName || c.athlete?.shortName || "";
    positionMap.set(normalize(name), countWithScore > 1 ? `T${pos}` : `${pos}`);
  });

  let worstMadeCutScore = null;
  let worstMadeCutName = null;
  let worstMadeCutGolfers = [];
  if (cutHappened) {
    const madeCutCompetitors = competitors.filter((c) => didMakeCut(c));
    const madeCutScores = madeCutCompetitors
      .map((c) => getRegulationScore(c))
      .filter((s) => s !== null);
    if (madeCutScores.length > 0) {
      worstMadeCutScore = Math.max(...madeCutScores);
      const worstPlayer = madeCutCompetitors.find((c) => getRegulationScore(c) === worstMadeCutScore);
      worstMadeCutName = worstPlayer?.athlete?.displayName || worstPlayer?.athlete?.shortName || null;

      // Build bottom 5 made-cut golfers for the cut line dialog
      const withScores = madeCutCompetitors
        .map((c) => ({ competitor: c, score: getRegulationScore(c) }))
        .filter((x) => x.score !== null)
        .sort((a, b) => b.score - a.score);
      worstMadeCutGolfers = withScores.slice(0, 5).map(({ competitor: c, score }) => {
        const name = c.athlete?.displayName || c.athlete?.shortName || "";
        const country = espnFlagToCode(c.athlete?.flag?.href);
        const position = positionMap.get(normalize(name)) || c.status?.position?.displayName || null;
        const linescores = c.linescores || [];
        const currentRoundScore = linescores.find((ls) => ls.period === round);
        let today = null;
        if (currentRoundScore?.displayValue != null && currentRoundScore.displayValue !== "") {
          today = parseScore(String(currentRoundScore.displayValue));
        }
        let thru = null;
        if (currentRoundScore) {
          const holesPlayed = currentRoundScore.linescores?.length || 0;
          if (holesPlayed === 18) thru = "F";
          else if (holesPlayed > 0) thru = String(holesPlayed);
        }
        return { name, country, position, relative: score, today, thru };
      });
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

  // Compute previous-round positions for position change arrows
  const prevPositionMap = new Map();
  if (round >= 2) {
    const prevRoundScores = competitors
      .filter((c) => {
        const ls = c.linescores || [];
        const prevRound = ls.find((l) => l.period === round - 1);
        return prevRound && prevRound.displayValue != null && prevRound.displayValue !== "";
      })
      .map((c) => {
        const ls = c.linescores || [];
        let cumScore = 0;
        for (let r = 1; r < round; r++) {
          const rs = ls.find((l) => l.period === r);
          if (rs?.displayValue != null) cumScore += parseScore(String(rs.displayValue)) || 0;
        }
        const name = c.athlete?.displayName || c.athlete?.shortName || "";
        return { name: normalize(name), score: cumScore };
      })
      .sort((a, b) => a.score - b.score);

    prevRoundScores.forEach((entry, idx) => {
      const firstWithScore = prevRoundScores.findIndex((x) => x.score === entry.score);
      const pos = firstWithScore + 1;
      prevPositionMap.set(entry.name, pos);
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
    const relative = getRegulationScore(c);

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
    }

    // Compute cumulative score at each 9-hole checkpoint + hole-by-hole scores
    const nineScores = [];
    const holeScores = [];
    let cumulative = 0;
    for (let r = 1; r <= 4; r++) {
      const rs = linescores.find((ls) => ls.period === r);
      const holes = rs?.linescores || [];
      if (holes.length === 0) break;

      // Extract hole-by-hole data for this round
      const sorted = [...holes].sort((a, b) => a.period - b.period);
      const roundHoles = sorted.map((h) => {
        const rel = parseRelativeHole(h.scoreType?.displayValue);
        return { hole: h.period, strokes: h.value, toPar: rel, par: h.value - rel };
      });
      const front9Holes = roundHoles.filter((h) => h.hole <= 9);
      const back9Holes = roundHoles.filter((h) => h.hole >= 10);
      const outStrokes = front9Holes.reduce((s, h) => s + h.strokes, 0);
      const inStrokes = back9Holes.reduce((s, h) => s + h.strokes, 0);
      holeScores.push({
        round: r,
        holes: roundHoles,
        out: front9Holes.length === 9 ? outStrokes : null,
        in: back9Holes.length === 9 ? inStrokes : null,
        total: rs.value || (front9Holes.length === 9 && back9Holes.length === 9 ? outStrokes + inStrokes : null),
      });

      const front9 = holes.slice(0, 9);
      const back9 = holes.slice(9, 18);

      if (front9.length === 9) {
        const front9Rel = front9.reduce((sum, h) => sum + parseRelativeHole(h.scoreType?.displayValue), 0);
        cumulative += front9Rel;
        nineScores.push({ label: `R${r}-Out`, cumulative, holes: 9 });
      } else if (front9.length > 0) {
        break;
      } else {
        break;
      }

      if (back9.length === 9) {
        const back9Rel = back9.reduce((sum, h) => sum + parseRelativeHole(h.scoreType?.displayValue), 0);
        cumulative += back9Rel;
        nineScores.push({ label: `R${r}-Tot`, cumulative, holes: 18 });
      } else {
        break;
      }
    }

    // Missed cut / withdrawn detection
    const withdrawn = withdrawnNames.has(norm);
    const missedCut = (cutHappened && !didMakeCut(c)) || withdrawn;

    const position = positionMap.get(norm) || c.status?.position?.displayName || null;

    // Position change: compare current numeric position to previous round
    let positionChange = null;
    const currentPos = parseInt(String(position).replace("T", ""), 10);
    const prevPos = prevPositionMap.get(norm);
    if (!isNaN(currentPos) && prevPos) {
      if (currentPos < prevPos) positionChange = "up";
      else if (currentPos > prevPos) positionChange = "down";
    }

    golfers[name] = { relative, today, thru, position, positionChange, missedCut, withdrawn, nineScores, holeScores };
  }

  // Build the full field list for the drawer view — every competitor in the event,
  // sorted by current position. Owner overlay is applied client-side.
  const field = sortedCompetitors.map((c) => {
    const name = c.athlete?.displayName || c.athlete?.shortName || "";
    const norm = normalize(name);
    const country = espnFlagToCode(c.athlete?.flag?.href);
    const position = positionMap.get(norm) || c.status?.position?.displayName || null;
    const relative = getRegulationScore(c);
    const ls = c.linescores || [];
    const currentRoundScore = ls.find((l) => l.period === round);
    let today = null;
    if (currentRoundScore?.displayValue != null && currentRoundScore.displayValue !== "") {
      today = parseScore(String(currentRoundScore.displayValue));
    }
    let thru = null;
    if (currentRoundScore) {
      const holesPlayed = currentRoundScore.linescores?.length || 0;
      if (holesPlayed === 18) thru = "F";
      else if (holesPlayed > 0) thru = String(holesPlayed);
    }
    const withdrawn = withdrawnNames.has(norm);
    const missedCut = (cutHappened && !didMakeCut(c)) || withdrawn;
    return { name, country, position, relative, today, thru, missedCut, withdrawn };
  });

  return {
    round,
    statusDetail,
    statusState,
    eventStartDate,
    eventEndDate,
    coursePar,
    cutHappened,
    worstMadeCutScore,
    worstMadeCutName,
    worstMadeCutGolfers,
    allMadeCutNineScores,
    golfers,
    field,
    tournamentName: event.name || tournamentName,
  };
}

// ESPN 3-letter flag codes → 2-letter codes used by the app
const ESPN_TO_ISO = {
  usa: "US", can: "CA", aus: "AU", eng: "ENG", sct: "SCO", nir: "NI", wal: "WAL",
  irl: "IE", rsa: "ZA", kor: "KR", jpn: "JP", swe: "SE", nor: "NO", den: "DK",
  ger: "DE", fra: "FR", esp: "ES", ita: "IT", arg: "AR", col: "CO", ven: "VE",
  chn: "CN", tpo: "TW", phi: "PH", tha: "TH", ind: "IN", fin: "FI", aut: "AT",
  bel: "BE", ned: "NL", chi: "CL", par: "PY", brz: "BR", mex: "MX", zim: "ZW",
};

function espnFlagToCode(flagHref) {
  if (!flagHref) return "";
  const match = flagHref.match(/500\/(.+)\.png/);
  if (!match) return "";
  const espnCode = match[1].toLowerCase();
  return ESPN_TO_ISO[espnCode] || espnCode.toUpperCase().slice(0, 2);
}

/**
 * Fetch all competitors from ESPN for a given tournament.
 * Tries the season endpoint first (has future fields), falls back to live scoreboard.
 */
export async function fetchAllCompetitors(tournamentName) {
  const year = new Date().getFullYear();
  const stripYear = (s) => (s || "").replace(/^\d{4}\s+/, "").toLowerCase();
  const needle = stripYear(tournamentName);

  // Try season endpoint first — it has fields for upcoming tournaments
  for (const url of [
    `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=${year}`,
    "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard",
  ]) {
    const espnRes = await fetch(url, { next: { revalidate: 0 } });
    if (!espnRes.ok) continue;
    const espn = await espnRes.json();
    const events = espn.events || [];
    const event = events.find((e) => {
      const espnName = (e.name || "").toLowerCase();
      return espnName.includes(needle) || stripYear(e.name).includes(needle);
    });
    if (event && (event.competitions?.[0]?.competitors?.length || 0) > 0) {
      return buildCompetitorResult(event);
    }
  }

  return { error: "Tournament not found on ESPN", status: 404 };
}

function buildCompetitorResult(event) {
  const competitors = event.competitions?.[0]?.competitors || [];
  const golfers = competitors.map((c) => {
    const a = c.athlete || {};
    return {
      name: a.displayName || a.shortName || "",
      country: espnFlagToCode(a.flag?.href),
      espnId: c.id || null,
    };
  }).filter((g) => g.name);

  return { golfers, tournamentName: event.name };
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
