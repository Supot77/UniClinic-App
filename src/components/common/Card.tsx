export default function Card({
  children,
  className = '',
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-zinc-100 ${padding ? 'p-6' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
