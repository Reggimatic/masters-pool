"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RulesContent() {
  const searchParams = useSearchParams();
  const tournament = searchParams.get("tournament");
  const group = searchParams.get("group");
  const back = tournament && group ? `/?tournament=${tournament}&group=${group}` : "/";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #22563C 0%, #173C29 100%)", color: "#e8dfc4" }}>
      <div style={{ padding: "16px 18px 12px", textAlign: "center", background: "#143625", borderBottom: "1px solid #337B57" }}>
        <div style={{ fontSize: 12, fontFamily: "var(--font-source-serif), Georgia, serif", color: "#FCE300", letterSpacing: 4, textTransform: "uppercase", marginBottom: 2 }}>Golf Pool</div>
        <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "clamp(28px, 6vw, 48px)", color: "#ffffff", margin: "0 0 4px", fontWeight: 400, letterSpacing: 2, textTransform: "uppercase" }}>Rules</h1>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 48px" }}>
        <ul style={{ listStyle: "disc", paddingLeft: 20, fontSize: 15, lineHeight: 2, color: "#e8dfc4" }}>
          <li>Top 4 of 6 golfers score</li>
          <li>Worst 2 dropped automatically</li>
        </ul>

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <a href={back} style={{ color: "#5BD397", fontSize: 13, textDecoration: "none" }}>Back to Leaderboard</a>
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
