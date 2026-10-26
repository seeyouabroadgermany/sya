import { Logo } from "@/components/app/logo";

const STAGES = [
  "Lead / Counselling",
  "University Selection",
  "Apostille",
  "University Application",
  "Pre-enrollment",
  "Nostrification",
  "Offer Letter",
  "Visa",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,40%)]">
      <main className="flex flex-col px-5 pt-10 pb-8 sm:px-10">
        <Logo className="h-11" />
        <div className="flex flex-1 items-center">
          <div className="w-full max-w-sm py-10">{children}</div>
        </div>
        <p className="text-xs text-subtle">See You Abroad, Kozhikode</p>
      </main>

      {/* The journey every student takes, from first call to visa. */}
      <aside className="hidden border-l border-line bg-surface px-12 py-14 lg:flex lg:flex-col lg:justify-center">
        <ol className="relative ml-1.5 space-y-[18px]">
          <span aria-hidden className="absolute top-2 bottom-2 left-[5px] w-px bg-line" />
          {STAGES.map((name, i) => (
            <li key={name} className="relative flex items-center gap-4 text-sm">
              {i === 0 ? (
                <span className="relative grid size-[11px] place-items-center rounded-full border-2 border-brand bg-surface">
                  <span className="size-[3px] rounded-full bg-brand" />
                </span>
              ) : (
                <span className="relative size-[11px] rounded-full border border-subtle/60 bg-surface" />
              )}
              <span className="num w-4 text-subtle">{i + 1}</span>
              <span className={i === 0 ? "text-text" : "text-subtle"}>{name}</span>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-xs text-sm leading-relaxed text-subtle">
          Every student, from first enquiry in Kerala to a visa for the Czech Republic.
        </p>
      </aside>
    </div>
  );
}
