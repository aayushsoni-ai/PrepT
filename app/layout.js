import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import Header from "@/components/header";
import { DM_Sans, Lora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "sonner";

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Prept",
  description: "",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        theme: dark,
      }}
    >
      <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
        <head />
        <body className={`${lora.variable} ${dmSans.variable} font-sans`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Header />
            <main className="min-h-screen">{children}</main>
            <Toaster richColors />

         <footer className="relative z-10 border-t border-white/10 py-10 px-6">
  <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-stone-400">
    
    {/* Left */}
    <p className="text-center md:text-left">
      © {new Date().getFullYear()} <span className="text-white font-medium">Prept</span>. All rights reserved.
    </p>

    {/* Center */}
    <p className="text-center">
      Built with <span className="text-amber-400">AI</span> for better interview outcomes.
    </p>

    {/* Right */}
    <p className="text-center md:text-right">
      Crafted by <span className="text-white font-medium">Aayush Soni</span>
    </p>
    
  </div>
</footer>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
