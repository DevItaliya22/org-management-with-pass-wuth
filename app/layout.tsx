import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cute Dashboard",
  description: "Cute Dashboard",
  icons: {
    icon: "/convex.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <ConvexClientProvider>
            <ThemeProvider>
              <div className="relative min-h-screen">
                <div
                  className="pointer-events-none fixed bottom-0 left-0 w-full z-0 dark:opacity-35 opacity-20"
                  style={{
                    height: "35vh",
                    background:
                      "linear-gradient(to left, oklch(0.7 0.25 180), oklch(0.7 0.25 200), oklch(0.6 0.2 270), oklch(0.7 0.3 320))",
                    maskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
                    WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
                  }}
                />
                <div className="relative z-10">
                  {children}
                </div>
              <Toaster />
              </div>
            </ThemeProvider>
          </ConvexClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
