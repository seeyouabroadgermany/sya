export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end gap-x-4 gap-y-3 px-4 pt-5 pb-4 md:px-6 md:pt-7 md:pb-5">
      <div className="w-full min-w-0 sm:w-auto sm:flex-1">
        <h1 className="text-xl leading-tight font-semibold tracking-tight md:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-subtle">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
