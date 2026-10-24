export function SectionHeading({ kicker, title, id }: { kicker?: string; title: string; id?: string }) {
  return (
    <div className="mb-6">
      {kicker && <p className="font-heading text-xs uppercase tracking-[0.35em] text-sick">{kicker}</p>}
      <h2 id={id} className="mt-2 font-display text-4xl text-bandage sm:text-5xl">
        <span className="brush">{title}</span>
      </h2>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`panel p-4 sm:p-5 ${className}`}>{children}</div>;
}
