import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Livio | Gestión Dental Inteligente",
  description: "Software de gestión con IA para clínicas dentales en Argentina. Agenda inteligente, historia clínica electrónica (Ley 27.706), WhatsApp automático y CRM de pacientes.",
  openGraph: {
    title: "Livio | Gestión Dental Inteligente",
    description: "Software de gestión con IA para clínicas dentales en Argentina. Agenda inteligente, historia clínica electrónica, WhatsApp automático.",
    type: "website",
    locale: "es_AR",
    siteName: "Livio",
  },
  twitter: {
    card: "summary_large_image",
    title: "Livio | Gestión Dental Inteligente",
    description: "Software de gestión con IA para clínicas dentales en Argentina.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
