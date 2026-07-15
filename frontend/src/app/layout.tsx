import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinSight - Smart Personal Finance for India",
  description:
    "AI-powered personal finance calculators for India. Income tax, CTC breakup, SIP, salary tools and live market data.",
  keywords: [
    "income tax calculator india",
    "personal finance india",
    "tax planning",
    "ctc calculator",
    "sip calculator",
    "salary breakup",
  ],
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased flex flex-col">
        <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-sm shadow-sm">
          <nav className="mx-auto max-w-7xl px-3 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-2">
              <a href="/" className="text-base sm:text-xl font-bold text-primary-700 truncate">
                FinSight
              </a>
              <span className="hidden sm:inline text-sm text-gray-500">
                Smart Finance for India
              </span>
            </div>
          </nav>
        </header>
        <main className="flex-1 mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
        <footer className="border-t bg-white mt-auto">
          <div className="mx-auto max-w-7xl px-3 py-4 sm:py-6 text-center text-xs sm:text-sm text-gray-500">
            © {new Date().getFullYear()} FinSight. For educational purposes.
            Consult a CA for tax advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
