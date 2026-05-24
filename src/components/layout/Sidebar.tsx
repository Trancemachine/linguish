"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  LogOut,
  MessageSquare,
  User as UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/practice/words", label: "单词练习", icon: GraduationCap },
  { href: "/practice/dialogue", label: "对话练习", icon: MessageSquare },
  { href: "/knowledge", label: "知识库", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push("/auth");
  }

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
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {user.email ? user.email[0].toUpperCase() : <UserIcon className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user.email ?? "用户"}</p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
              >
                <LogOut className="h-3 w-3" />
                退出登录
              </button>
            </div>
          </div>
        ) : (
          <Link
            href="/auth"
            className="flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm text-muted hover:bg-primary-muted hover:text-foreground"
          >
            <UserIcon className="h-4 w-4" />
            登录 / 注册
          </Link>
        )}
      </div>
    </aside>
  );
}

function BrandHeader() {
  return (
    <div className="flex items-center gap-3 px-6 py-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      </div>
      <div>
        <p className="text-lg font-bold text-primary">英语学习</p>
        <p className="text-xs text-muted">专业英语学习</p>
      </div>
    </div>
  );
}
