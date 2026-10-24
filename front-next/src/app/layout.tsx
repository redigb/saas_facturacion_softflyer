import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { ToastContainer } from "@/components/ui/toast";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Softflyer",
  description: "Vende, controla y factura tu restaurante",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable} ${montserrat.className} h-full antialiased`}>
      <body className={`${montserrat.className} min-h-full font-sans`}>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
