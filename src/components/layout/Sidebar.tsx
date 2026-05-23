"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/knowledge", label: "知识库", icon: BookOpen },
  { href: "/practice/words", label: "单词练习", icon: GraduationCap },
  { href: "/practice/dialogue", label: "对话练习", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-border bg-card">
      <BrandHeader />
      <nav className="flex flex-col gap-2 px-4 pt-6">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-light text-primary"
                  : "text-muted hover:bg-primary-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border p-4">
        <p className="text-xs text-muted">Linguist AI v0.1</p>
      </div>
    </aside>
  );
}

function BrandHeader() {
  return (
    <div className="flex items-center gap-3 px-6 py-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
        LP
      </div>
      <div>
        <p className="text-lg font-bold text-primary">Linguist AI</p>
        <p className="text-xs text-muted">学术语言平台</p>
      </div>
    </div>
  );
}
