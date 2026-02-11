import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/toaster";
import Navbar from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UIU Student Hub - Tools for UIU Students",
  description:
    "A collection of useful tools for United International University students. CGPA Calculator, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
          >
            <div className="relative min-h-screen flex flex-col">
              {/* Background accents */}
              <div className="fixed inset-0 -z-10 bg-background overflow-hidden">
                <div className="absolute top-[-10%] -left-16 sm:-left-32 w-[500px] sm:w-[850px] h-[500px] sm:h-[850px] bg-orange-500/35 rounded-full blur-[100px] sm:blur-[140px] dark:bg-orange-500/25" />
                <div className="absolute top-[30%] -right-16 sm:-right-32 w-[450px] sm:w-[750px] h-[450px] sm:h-[750px] bg-primary/30 rounded-full blur-[100px] sm:blur-[130px] dark:bg-primary/20" />
                <div className="absolute top-[60%] right-[10%] w-[250px] sm:w-[450px] h-[250px] sm:h-[450px] bg-orange-400/25 rounded-full blur-[80px] sm:blur-[100px] dark:bg-orange-400/18" />
              </div>
              <Navbar />
              <main className="flex-1">{children}</main>
              <footer className="border-t py-4 sm:py-6 text-center text-xs sm:text-sm text-muted-foreground">
                <div className="container mx-auto px-4">
                  <p>
                    &copy; {new Date().getFullYear()} UIU Student Hub. Built
                    with ❤️ for UIU Students.
                  </p>
                </div>
              </footer>
            </div>
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
