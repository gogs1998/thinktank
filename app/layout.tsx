import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ThinkTank",
  description: "Multi-LLM council chat using OpenRouter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container py-6">
          <h1 className="text-2xl font-bold mb-4">🧠 ThinkTank</h1>
          {children}
        </div>
      </body>
    </html>
  );
}
