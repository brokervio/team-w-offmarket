import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team W Off-Market | The Inventory You Won't Find on Zillow",
  description: "Off-market homes and new construction across Rockland and Orange County. Free account required. Access is limited."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
