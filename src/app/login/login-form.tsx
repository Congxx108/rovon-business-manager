"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/auth/actions";
import { Button, inputClassName, labelClassName } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action} className="mt-6 space-y-4">
      <label className={labelClassName}>
        邮箱
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={`${inputClassName} h-11`}
        />
      </label>
      <label className={labelClassName}>
        密码
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={`${inputClassName} h-11`}
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
