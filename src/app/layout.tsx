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
              <div className="fixed inset-0 -z-10 bg-background">
                <div className="absolute top-[-10%] -left-32 w-[700px] h-[700px] bg-orange-500/20 rounded-full blur-[140px] dark:bg-orange-500/15" />
                <div className="absolute top-[30%] -right-32 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[130px] dark:bg-primary/10" />
                <div className="absolute -bottom-32 left-[20%] w-[500px] h-[500px] bg-amber-400/15 rounded-full blur-[120px] dark:bg-amber-500/10" />
                <div className="absolute top-[60%] right-[10%] w-[350px] h-[350px] bg-orange-400/15 rounded-full blur-[100px] dark:bg-orange-400/10" />
              </div>
              <Navbar />
              <main className="flex-1">{children}</main>
              <footer className="border-t py-6 text-center text-sm text-muted-foreground">
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
