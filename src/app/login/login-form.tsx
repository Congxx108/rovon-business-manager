"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/auth/actions";
import { Button } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        邮箱
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        密码
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
        />
      </label>

      {state.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {state.error}
        </div>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "登录中..." : "登录"}
      </Button>
    </form>
  );
}
