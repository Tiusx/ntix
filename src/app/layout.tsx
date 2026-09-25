import type { Metadata } from "next";
import { SITE_CONFIG } from "@/site.config";
import { LightboxProvider } from "@/components/lightbox-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackToTop } from "@/components/back-to-top";
import { LIGHT_THEME, THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: SITE_CONFIG.title,
    template: `%s · ${SITE_CONFIG.title}`,
  },
  description: SITE_CONFIG.description,
  metadataBase: new URL(SITE_CONFIG.siteUrl),
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: SITE_CONFIG.title,
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    url: SITE_CONFIG.siteUrl,
    images: [
      {
        url: "/avatar.jpg",
        width: 1200,
        height: 630,
        alt: SITE_CONFIG.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    images: ["/avatar.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={SITE_CONFIG.lang} data-theme={LIGHT_THEME} suppressHydrationWarning>
      <head>
        {/* 首屏前同步应用主题，避免刷新闪烁。必须内联且同步执行。 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <meta name="msvalidate.01" content="A843521F93A928CA1E8449B430ACD311" />
        <meta name="baidu-site-verification" content="codeva-HJxCyZSxvz" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
      </head>
      <body>
        <ThemeToggle />
        <BackToTop />
        <LightboxProvider>{children}</LightboxProvider>
      </body>
    </html>
  );
}