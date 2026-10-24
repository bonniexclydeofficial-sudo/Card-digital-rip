import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Outfit } from "next/font/google";
import { prisma } from "@cdr/db";
import { Shell, type Viewer } from "@/components/shell";
import { getSession } from "@/lib/session";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const dynamic = "force-dynamic";

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
      <body className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
        <Shell viewer={viewer}>{children}</Shell>
      </body>
    </html>
  );
}
