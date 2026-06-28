import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { MobileNav, SideNav } from "@/components/nav-client";
import { getCurrentUser } from "@/lib/auth";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const email = user?.email ?? "未识别账号";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_28rem),linear-gradient(180deg,#f8fafc,#eef3f9)] text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200/80 bg-white/90 px-4 py-5 shadow-sm shadow-slate-200/60 backdrop-blur md:flex md:flex-col">
        <Link href="/dashboard" className="group block rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 to-blue-950 p-4 text-white shadow-sm shadow-blue-950/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-sm font-bold ring-1 ring-white/20">R</div>
            <div>
              <div className="text-lg font-semibold tracking-wide">ROVON</div>
              <div className="mt-0.5 text-xs text-blue-100">经营管理系统</div>
            </div>
          </div>
        </Link>
        <SideNav />
        <UserPanel email={email} />
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm shadow-slate-200/60 backdrop-blur md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">ROVON 经营管理系统</div>
              <div className="mt-1 max-w-[220px] truncate text-xs text-slate-500">{email}</div>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                退出
              </button>
            </form>
          </div>
          <MobileNav />
        </header>
        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function UserPanel({ email }: { email: string }) {
  return (
    <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50/90 p-3 shadow-inner shadow-white">
      <div className="text-xs font-medium text-slate-500">当前登录</div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-900">{email}</div>
      <form action={logoutAction} className="mt-3">
        <button
          type="submit"
          className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 active:translate-y-px"
        >
          退出登录
        </button>
      </form>
    </div>
  );
}
