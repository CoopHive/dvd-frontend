import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "~/components/theme-provider";
import { SessionProvider } from "~/components/session-provider";

export const metadata: Metadata = {
  title: "Decentralized Research Assistant",
  description: "A decentralized research assistant built with Next.js and Tailwind",
  icons: [{ rel: "icon", url: "/icon.jpeg" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={geist.variable}>
      <body className="bg-background font-sans antialiased">
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
