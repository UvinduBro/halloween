export function SectionHeading({ kicker, title, id }: { kicker?: string; title: string; id?: string }) {
  return (
    <div className="mb-5">
      {kicker && <p className="font-heading text-xs uppercase tracking-[0.35em] text-sick">{kicker}</p>}
      <h2 id={id} className="flicker mt-1 font-heading text-3xl text-bandage sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`border border-fog/10 bg-ash-2/80 p-4 sm:p-5 ${className}`}>{children}</div>;
}
