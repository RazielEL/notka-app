import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { I18nProvider } from "@/components/i18n-provider";

export const metadata: Metadata = {
  applicationName: "Notka",
  title: "Notka",
  description: "A minimal self-hosted Markdown notebook.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Notka",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/notka-icon.svg",
    apple: "/notka-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07111F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var mode = localStorage.getItem("notka-mode");
                  var dark = mode ? mode === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
                  var storedLanguage = localStorage.getItem("notka-language");
                  var language = storedLanguage === "en" || storedLanguage === "pl"
                    ? storedLanguage
                    : ((navigator.language || "").toLowerCase().startsWith("pl") ? "pl" : "en");
                  var palette = localStorage.getItem("notka-color-theme") || "dark-navy";
                  var font = localStorage.getItem("notka-font") || "system";
                  var customCss = (localStorage.getItem("notka-custom-theme-css") || "")
                    .slice(0, 4000)
                    .split(";")
                    .map(function (entry) { return entry.trim(); })
                    .filter(Boolean)
                    .filter(function (entry) { return /^--notka-[a-z0-9-]+\\s*:/i.test(entry); })
                    .filter(function (entry) { return !/[{}<>]/.test(entry); })
                    .filter(function (entry) { return !/url\\s*\\(|@import|expression\\s*\\(/i.test(entry); })
                    .map(function (entry) { return entry + ";"; })
                    .join("\\n");
                  document.documentElement.classList.toggle("dark", dark);
                  document.documentElement.lang = language;
                  document.documentElement.dataset.theme = palette;
                  document.documentElement.dataset.appFont = font;
                  if (customCss) {
                    var style = document.createElement("style");
                    style.id = "notka-custom-theme";
                    style.textContent = ":root {\\n" + customCss + "\\n}";
                    document.head.appendChild(style);
                  }
                } catch (error) {}
              })();
            `,
          }}
        />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
