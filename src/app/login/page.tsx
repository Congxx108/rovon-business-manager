import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200/70">
        <div>
          <div className="text-sm font-semibold text-slate-500">ROVON</div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">ROVON 经营管理系统</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">请使用已授权账号登录</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
