import type { Metadata, Viewport } from "next";
import "./globals.css";
import { InstallReminder } from "@/components/install-reminder";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "TrustTradze";

export const metadata: Metadata = {
  title: {
    default: appName,
    template: `%s | ${appName}`
  },
  description:
    "TrustTradze is a production-grade escrow and commerce platform for products, services, chats, and secure payouts.",
  applicationName: appName,
  manifest: "/manifest.webmanifest",
  themeColor: "#0f172a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appName
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: "/icon",
    apple: "/apple-icon"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
        <InstallReminder />
      </body>
    </html>
  );
}
