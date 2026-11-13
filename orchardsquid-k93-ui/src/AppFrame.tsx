import type { ReactNode } from "react";

export interface NavigationItem {
  href: string;
  label: string;
  icon: ReactNode;
  current: boolean;
}

export function AppFrame({
  title,
  description,
  navigation,
  children,
}: {
  title: string;
  description: string;
  navigation: NavigationItem[];
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh">
      <div
        className="flex w-56 shrink-0 flex-col gap-6 border-r border-zinc-200
          p-4 dark:border-zinc-800"
      >
        <header className="px-2 pt-1">
          <p className="font-semibold tracking-tight">{title}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        </header>
        <nav aria-label="Pages" className="flex flex-col gap-1">
          {navigation.map(({ href, label, icon, current }) => (
            <a
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5
              text-sm font-medium ${
                current
                  ? "bg-zinc-100 dark:bg-zinc-800"
                  : `text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400
                    dark:hover:bg-zinc-800`
              }`}
            >
              {icon}
              {label}
            </a>
          ))}
        </nav>
      </div>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export function Page({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="@container flex flex-1 flex-col gap-6 p-8">
      <header className="flex min-h-9 items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {actions}
      </header>
      {children}
    </div>
  );
}
