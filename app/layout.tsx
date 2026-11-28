import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/auth-provider";
import { WorkspaceLiveProvider } from "@/components/live/workspace-live-provider";
import { WorkspaceSettingsProvider } from "@/components/settings/workspace-settings-provider";
import { SubscriptionProvider } from "@/components/subscription/subscription-provider";
import localFont from "next/font/local";
import "./globals.css";

const generalSans = localFont({
  src: [
    { path: "./fonts/general-sans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/general-sans-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/general-sans-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/general-sans-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-general-sans",
  display: "swap",
});

const satoshi = localFont({
  src: [
    { path: "./fonts/satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/satoshi-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Inquiry Desk",
    template: "%s · Inquiry Desk",
  },
  description:
    "Never lose track of a potential customer. Capture, organize, track and follow up with customer inquiries.",
  applicationName: "Inquiry Desk",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${generalSans.variable} ${satoshi.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Dark is the default; only a stored "light" preference overrides it. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(localStorage.getItem('inquiry-desk-theme')!=='light'){document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();",
          }}
        />
      </head>
      {/* suppressHydrationWarning: browser extensions (e.g. shortcut helpers)
          inject attributes onto html/body before React hydrates. */}
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <AuthProvider>
          <WorkspaceLiveProvider>
            <WorkspaceSettingsProvider>
              <SubscriptionProvider>{children}</SubscriptionProvider>
            </WorkspaceSettingsProvider>
          </WorkspaceLiveProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
