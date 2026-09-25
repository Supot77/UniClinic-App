import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TopProgressBar from "@/components/common/TopProgressBar";
import BackToTopButton from "@/components/common/BackToTopButton";
import LoginToastListener from "@/components/common/LoginToastListener";
import { AuthProvider } from "@/context/AuthContext";
import { LocaleProvider } from "@/context/LocaleContext";
import AppearanceInitializer from "@/components/settings/AppearanceInitializer";

const clinicFont = Noto_Sans_Thai({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-clinic",
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
    <html lang="th" className={`${clinicFont.variable} h-full scroll-smooth`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-brand-surface text-brand-ink antialiased">
        <AppearanceInitializer />
        <AuthProvider>
          <LocaleProvider>
            <TopProgressBar />
            <Header />
            <LoginToastListener />
            <main className="flex-1 bg-brand-surface pt-16">
              {children}
            </main>
            <Footer />
            <BackToTopButton />
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
