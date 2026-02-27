import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { CopilotKit } from "@copilotkit/react-core";
import { ClerkProvider } from "@clerk/nextjs";
import { LanguageProvider } from "@/context/LanguageContext";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata = {
  title: "Credify - A Fintech Solution",
  description: "One Stop Finance Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider>
            <LanguageProvider>
              <Header />
              <CopilotKit publicApiKey="ck_pub_faec2cff9fb6283e3cdb6997413a4fbe">
                <main className="min-h-screen">{children}</main>
              </CopilotKit>
              <Toaster />
            </LanguageProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
