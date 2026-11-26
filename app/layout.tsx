import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/auth-provider";
import { WorkspaceSettingsProvider } from "@/components/settings/workspace-settings-provider";
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
        {/* Set the theme before paint so there is no light-mode flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('inquiry-desk-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();",
          }}
        />
      </head>
      {/* suppressHydrationWarning: browser extensions (e.g. shortcut helpers)
          inject attributes onto html/body before React hydrates. */}
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <AuthProvider>
          <WorkspaceSettingsProvider>{children}</WorkspaceSettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
