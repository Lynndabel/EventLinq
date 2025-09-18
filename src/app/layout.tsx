import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import FloatingAskAI from "./components/FloatingAskAI";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sensay Event Matchmaker",
  description: "AI agent that matches attendees and coordinates intros.",
  metadataBase: new URL("https://eventlinq-ai.vercel.app/"),
  openGraph: {
    title: "EventLinq — AI Matchmaking for Events",
    description: "Connect with the right people faster. Consent-first intros. Simple coordination.",
    url: "/",
    siteName: "EventLinq",
    images: [
      {
        url: "/logo.svg",
        width: 1200,
        height: 630,
        alt: "EventLinq",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EventLinq — AI Matchmaking for Events",
    description: "Connect with the right people faster. Consent-first intros. Simple coordination.",
    images: ["/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Sensay Chatbot widget - loads after hydration */}
        <Script
          src="https://chat-widget.sensay.io/fedde286-62b9-4163-84d9-139e3cc0839e/embed-script.js"
          strategy="afterInteractive"
        />
        {children}
        <FloatingAskAI />
      </body>
    </html>
  );
}
