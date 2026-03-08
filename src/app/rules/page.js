"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RulesContent() {
  const searchParams = useSearchParams();
  const tournament = searchParams.get("tournament");
  const group = searchParams.get("group");
  const back = tournament && group ? `/?tournament=${tournament}&group=${group}` : "/";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #22563C 0%, #173C29 100%)", color: "#e9ffc2" }}>
      <div style={{ padding: "16px 18px 12px", textAlign: "center", background: "#143625", borderBottom: "1px solid #337B57" }}>
        <div style={{ fontSize: 13, fontFamily: "var(--font-source-serif), Georgia, serif", color: "#FCE300", letterSpacing: 3, textTransform: "uppercase", marginBottom: 2 }}>Put it in the jar.</div>
        <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "clamp(28px, 6vw, 48px)", color: "#ffffff", margin: "0 0 4px", fontWeight: 400, letterSpacing: 2, textTransform: "uppercase" }}>Rules</h1>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 48px" }}>
        <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: 20, color: "#ffffff", fontWeight: 400, textTransform: "uppercase", marginBottom: 12 }}>Draft</h2>
        <ul style={{ listStyle: "disc", paddingLeft: 20, fontSize: 15, lineHeight: 2, color: "#e9ffc2" }}>
          <li>A random drawing will be conducted to determine the draft order.</li>
          <li>The draft will use a snake format.</li>
          <li>Each person will draft six golfers for their team.</li>
        </ul>

        <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: 20, color: "#ffffff", fontWeight: 400, textTransform: "uppercase", marginTop: 28, marginBottom: 12 }}>Scoring</h2>
        <ul style={{ listStyle: "disc", paddingLeft: 20, fontSize: 15, lineHeight: 2, color: "#e9ffc2" }}>
          <li>The top four golfers count toward the score for each team. The bottom two are dropped.</li>
          <li>Once the cut takes place, only golfers who make the cut count toward their team's total.</li>
          <li>If a team has less than four golfers make the cut, then any empty spots in their top four will be assigned the lowest score of all golfers who did make the cut.</li>
          <li>For example, if a team has only 2 golfers make the cut, their total = (golfer 1 score) + (golfer 2 score) + (worst made cut score) + (worst made cut score).</li>
        </ul>

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <a href={back} style={{ color: "#5BD397", fontSize: 13, textDecoration: "underline" }}>Back to Leaderboard</a>
        </div>
      </div>
    </div>
  );
}

export default function RulesPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#173C29", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
        Loading...
      </div>
    }>
      <RulesContent />
    </Suspense>
  );
}
