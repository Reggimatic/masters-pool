import { supabase } from "@/lib/supabase";
import { computeScores } from "@/lib/fetchScores";

export async function POST(request) {
  const { golferNames, tournamentName, tournamentId } = await request.json();

  // Check if this tournament has archived results
  if (tournamentId) {
    const { data: archived } = await supabase
      .from("tournament_results")
      .select("*")
      .eq("tournament", tournamentId)
      .single();

    if (archived) {
      // Filter the golfers map to only requested golfer names
      const filteredGolfers = {};
      for (const name of golferNames) {
        filteredGolfers[name] = archived.golfers[name] || {
          relative: null, today: null, thru: null,
          position: null, missedCut: false,
        };
      }
      return Response.json({
        round: archived.round,
        cutHappened: archived.cut_happened,
        worstMadeCutScore: archived.worst_made_cut_score,
        worstMadeCutName: archived.worst_made_cut_name,
        allMadeCutNineScores: archived.all_made_cut_nine_scores || [],
        golfers: filteredGolfers,
        tournamentName: archived.tournament_display_name || tournamentName,
        archived: true,
      });
    }
  }

  // Live ESPN fetch
  const result = await computeScores(golferNames, tournamentName);

  // Tournament not on ESPN yet — return a pre-tournament placeholder
  if (result.status === 404) {
    const emptyGolfers = {};
    for (const name of golferNames) {
      emptyGolfers[name] = { relative: null, today: null, thru: null, position: null, missedCut: false };
    }
    return Response.json({
      round: 0,
      statusState: "pre",
      statusDetail: null,
      golfers: emptyGolfers,
      cutHappened: false,
      worstMadeCutScore: null,
      worstMadeCutName: null,
      allMadeCutNineScores: [],
      tournamentName,
      notStarted: true,
    });
  }

  if (result.error) {
    return Response.json({ error: result.error }, { status: result.status || 500 });
  }

  return Response.json(result);
}
