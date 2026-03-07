import { Open_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata = {
  title: "Golf Pool",
  description: "Golf pool leaderboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${openSans.variable} ${sourceSerif.variable} antialiased`} style={{ fontFamily: "var(--font-open-sans), sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
