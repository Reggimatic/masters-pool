import { Open_Sans, Source_Serif_4, Oswald } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

// Condensed face for the tournament | group selector line so the pair fits on
// one row on mobile.
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

export const metadata = {
  title: "Leader Board",
  description: "Golf pool leaderboard",
  manifest: "/manifest.json",
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Leader Board",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/leader_board.png",
  },
};

export const viewport = {
  themeColor: "#143625",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${openSans.variable} ${sourceSerif.variable} ${oswald.variable} antialiased`} style={{ fontFamily: "var(--font-open-sans), sans-serif" }}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }`,
          }}
        />
      </body>
    </html>
  );
}
