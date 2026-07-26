import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team W Inventory | Internal",
  description: "Internal off-market inventory tool for Team W Realty.",
  icons: { icon: "/logo.png" }
};

// Light-only: prevents forced dark mode on shared client pages
export const viewport: Viewport = {
  colorScheme: "light"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
