import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { MobileNav, SideNav } from "@/components/nav-client";
import { getCurrentUser } from "@/lib/auth";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const email = user?.email ?? "未识别账号";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-slate-200 bg-white px-4 py-5 md:flex md:flex-col">
        <Link href="/dashboard" className="block px-2">
          <div className="text-lg font-semibold">ROVON</div>
          <div className="mt-1 text-xs text-slate-500">经营管理系统</div>
        </Link>
        <SideNav />
        <UserPanel email={email} />
      </aside>
      <div className="md:pl-60">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">ROVON 经营管理系统</div>
              <div className="mt-1 max-w-[220px] truncate text-xs text-slate-500">{email}</div>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">
                退出
              </button>
            </form>
          </div>
          <MobileNav />
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function UserPanel({ email }: { email: string }) {
  return (
    <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs text-slate-500">当前登录</div>
      <div className="mt-1 truncate text-sm font-medium text-slate-900">{email}</div>
      <form action={logoutAction} className="mt-3">
        <button
          type="submit"
          className="inline-flex h-9 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          退出登录
        </button>
      </form>
    </div>
  );
}
