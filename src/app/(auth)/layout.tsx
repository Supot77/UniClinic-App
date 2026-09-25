export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex items-center justify-center bg-gradient-to-br from-brand-page to-brand-surface px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-left sm:bg-center"
        style={{ backgroundImage: "url('/images/auth-care-watercolor.webp')" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-br from-brand-page/45 via-brand-surface/65 to-brand-surface/85"
      />
      <div className="relative z-10 w-full max-w-md py-6 sm:py-10">
        {children}
      </div>
    </div>
  );
}
