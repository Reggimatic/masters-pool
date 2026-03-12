import { supabase } from "@/lib/supabase";
import { fetchAllCompetitors } from "@/lib/fetchScores";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { tournamentName } = body;

  const result = await fetchAllCompetitors(tournamentName);

  if (result.error) {
    return Response.json({ error: result.error }, { status: result.status || 500 });
  }

  const rows = result.golfers.map((g) => ({
    name: g.name,
    country: g.country,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase
    .from("golfers")
    .upsert(rows, { onConflict: "name" });

  if (upsertError) {
    return Response.json({ error: "Failed to upsert golfers: " + upsertError.message }, { status: 500 });
  }

  return Response.json({ success: true, count: rows.length, tournament: result.tournamentName });
}
