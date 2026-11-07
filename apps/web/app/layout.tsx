import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Alice — See how your campaign lands",
  icons: { icon: "/alice-logo.png", apple: "/alice-logo.png" },
  description:
    "Explore synthetic Indonesian audience reactions before you launch. Directional, not a forecast.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
