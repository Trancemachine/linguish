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
      <div className="pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center border-b border-border bg-card/80 px-10 backdrop-blur">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
        </header>
        <main className="p-10">{children}</main>
      </div>
    </div>
  );
}
