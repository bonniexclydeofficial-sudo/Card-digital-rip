import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Syne } from "next/font/google";
import { prisma } from "@cdr/db";
import { Shell, type Viewer } from "@/components/shell";
import { getSession } from "@/lib/session";
import "./globals.css";

const display = Syne({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const dynamic = "force-dynamic";

export const viewport = { themeColor: "#07080d" };

export const metadata: Metadata = {
  title: "Card Digital Rip",
  description: "Example-inventory digital rips with published odds, a provably fair draw, and credits-only buyback.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let viewer: Viewer | null = null;
  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.uid }, include: { wallet: true } });
    if (user) {
      viewer = {
        email: user.email,
        role: user.role,
        availableCents: user.wallet?.availableCents ?? 0,
      };
    }
  }
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} ${mono.variable}`}>
        <Shell viewer={viewer}>{children}</Shell>
      </body>
    </html>
  );
}
