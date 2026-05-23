"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured()) {
      router.push("/");
      return;
    }

    const supabase = createClient();
    const { error: authError } =
      tab === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.push("/");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a1628] px-4">
      <AuthBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white">
            LP
          </div>
          <h1 className="text-3xl font-bold text-white">Linguist AI</h1>
          <p className="mt-2 text-sm text-white/60">学术语言平台 · 学者的智囊团</p>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-xl">
          <div className="flex border-b border-border">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition",
                  tab === t
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted hover:text-foreground"
                )}
              >
                {t === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div>
              <label className="mb-1.5 block text-sm text-muted">电子邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@academic.edu"
                  className="w-full rounded-lg border border-border py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            <PasswordField
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "处理中..." : "进入平台"}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <DividerLine />
              </div>
              <span className="relative mx-auto block w-fit bg-card px-3 text-xs text-muted">
                或
              </span>
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary-muted py-2.5 text-sm font-medium text-primary transition hover:bg-primary-light"
            >
              <Sparkles className="h-4 w-4" />
              先体验（游客模式）
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          继续操作即表示您同意我们的{" "}
          <Link href="#" className="text-primary-light underline">
            服务协议
          </Link>{" "}
          和{" "}
          <Link href="#" className="text-primary-light underline">
            隐私政策
          </Link>
        </p>

        {!isSupabaseConfigured() && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
            当前为演示模式。配置 Supabase 后可使用完整登录注册功能。
          </p>
        )}
      </div>
    </div>
  );
}

function AuthBackground() {
  return (
    <>
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
    </>
  );
}

function PasswordField({
  password,
  setPassword,
  showPassword,
  setShowPassword,
}: {
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm text-muted">密码</label>
        <button type="button" className="text-xs text-primary">
          忘记密码？
        </button>
      </div>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-border py-2.5 pl-4 pr-10 text-sm outline-none focus:border-primary"
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function DividerLine() {
  return <div className="w-full border-t border-border" />;
}
