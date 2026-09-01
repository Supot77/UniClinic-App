import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WU Clinic Booking - ระบบบริการสุขภาพและการแจ้งเตือนยา มหาวิทยาลัยวลัยลักษณ์",
  description: "ระบบจองคิวตรวจรักษา บันทึกประวัติการรักษา แจ้งเตือนการทานยา และระบบคลังยาสำหรับคลินิกมหาวิทยาลัยวลัยลักษณ์ (COE67-331)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${inter.variable} h-full scroll-smooth`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-900 font-sans antialiased">
        <AuthProvider>
          <Header />
          {/* Main Content Area */}
          <main className="flex-1 pt-[96px]" style={{ background: "#f8fafb" }}>
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
