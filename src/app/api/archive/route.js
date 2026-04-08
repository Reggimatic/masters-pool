import { supabase } from "@/lib/supabase";
import { computeScores, fetchAllCompetitors } from "@/lib/fetchScores";

export async function POST(request) {
  try {
    const { tournamentId, tournamentName } = await request.json();

    if (!tournamentId || !tournamentName) {
      return Response.json({ error: "tournamentId and tournamentName are required" }, { status: 400 });
    }

    // Gather all unique golfer names from ALL groups' picks for this tournament
    const { data: picksData, error: picksError } = await supabase
      .from("picks")
      .select("golfers")
      .eq("tournament", tournamentId);

    if (picksError) {
      return Response.json({ error: "Failed to fetch picks: " + picksError.message }, { status: 500 });
    }

    const allGolferNames = [...new Set((picksData || []).flatMap((p) => (p.golfers || []).map((g) => typeof g === "string" ? g : g.name)))];

    if (allGolferNames.length === 0) {
      return Response.json({ error: "No picks found for this tournament" }, { status: 404 });
    }

    // Fetch live scores from ESPN
    const result = await computeScores(allGolferNames, tournamentName);

    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status || 500 });
    }

    // Upsert into tournament_results
    const { error: upsertError } = await supabase
      .from("tournament_results")
      .upsert({
        tournament: tournamentId,
        tournament_display_name: result.tournamentName,
        round: result.round,
        cut_happened: result.cutHappened,
        worst_made_cut_score: result.worstMadeCutScore,
        worst_made_cut_name: result.worstMadeCutName,
        all_made_cut_nine_scores: result.allMadeCutNineScores,
        golfers: result.golfers,
        archived_at: new Date().toISOString(),
      }, { onConflict: "tournament" });

    if (upsertError) {
      return Response.json({ error: "Failed to save archive: " + upsertError.message }, { status: 500 });
    }

    // Also upsert all competitors into the golfers roster
    const fieldResult = await fetchAllCompetitors(tournamentName);
    if (fieldResult.golfers) {
      const golferRows = fieldResult.golfers.map((g) => ({
        name: g.name,
        country: g.country,
        espn_id: g.espnId,
        updated_at: new Date().toISOString(),
      }));
      await supabase.from("golfers").upsert(golferRows, { onConflict: "name" });
    }

    return Response.json({ success: true, round: result.round });
  } catch (err) {
    console.error("Archive error:", err);
    return Response.json({ error: "Archive crashed: " + (err.message || String(err)) }, { status: 500 });
  }
}
