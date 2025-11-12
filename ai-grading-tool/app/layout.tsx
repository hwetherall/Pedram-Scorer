import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "AI Grading Tool",
  description: "Upload a document to have it graded by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sourceSans.variable} ${sourceSerif.variable} font-sans`}>
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </body>
    </html>
  );
}
