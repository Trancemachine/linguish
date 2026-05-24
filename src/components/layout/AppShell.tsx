import { Sidebar } from "./Sidebar";

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 flex h-12 items-center border-b border-border bg-card/80 px-6 backdrop-blur">
          <div>
            <h1 className="text-base font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          </div>
        </header>
        <main className="flex-1 px-6 py-4 flex flex-col">{children}</main>
      </div>
    </div>
  );
}
