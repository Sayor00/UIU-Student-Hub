import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { Toaster } from "@/components/toaster";
import Navbar from "@/components/navbar";
import { AcademicProvider } from "@/context/academic-context";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UIU Student Hub - Tools for UIU Students",
  description:
    "A collection of useful tools for United International University students. CGPA Calculator, and more.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <AuthProvider session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
          >
            <AcademicProvider>
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
                  <div className="container mx-auto px-4 flex flex-col items-center gap-1">
                    <p>
                      &copy; {new Date().getFullYear()} UIU Student Hub. Built
                      with ❤️ for UIU Students.
                    </p>
                    <a
                      href="https://github.com/Sayor00"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/gh inline-flex items-center gap-1.5 hover:text-foreground transition-colors duration-200"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current transition-transform duration-200 group-hover/gh:scale-110" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" /></svg>
                      <span className="transition-transform duration-200 group-hover/gh:translate-x-0.5">Sayor00</span>
                    </a>
                  </div>
                </footer>
              </div>
              <Toaster />
            </AcademicProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
