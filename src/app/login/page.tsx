import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.14),transparent_30rem),linear-gradient(180deg,#f8fafc,#eef3f9)] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/92 p-8 shadow-xl shadow-slate-900/8 backdrop-blur">
        <div>
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f274a] text-sm font-bold text-white shadow-sm shadow-blue-900/20">R</div>
          <div className="mt-5 text-sm font-semibold tracking-wide text-blue-700">ROVON</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">ROVON 经营管理系统</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">请使用已授权账号登录</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
