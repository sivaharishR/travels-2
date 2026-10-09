import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vaitheeshwara Travels — Book Your Ride Instantly",
  description:
    "Book a cab with Vaitheeshwara Travels. Enter your details, pickup and drop location, pick one way or round trip and confirm in under a minute.",
  keywords: ["cab booking", "taxi", "ride booking", "Vaitheeshwara Travels", "outstation cabs", "airport transfer"],
  authors: [{ name: "Vaitheeshwara Travels" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Vaitheeshwara Travels — Book Your Ride Instantly",
    description: "Enter pickup & drop, choose one way or round trip and confirm your ride.",
    siteName: "Vaitheeshwara Travels",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
