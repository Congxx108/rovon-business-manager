"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardCheck, ClipboardList, LayoutDashboard, Users } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "订单管理", icon: ClipboardList },
  { href: "/customers", label: "客户管理", icon: Users },
  { href: "/daily-leads", label: "每日潜客", icon: BarChart3 },
  { href: "/data-check", label: "数据检查", icon: ClipboardCheck },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-7 space-y-1.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition duration-150 ${
              active
                ? "bg-blue-50 text-blue-700 shadow-inner shadow-blue-100 ring-1 ring-blue-100"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <span className={`grid h-7 w-7 place-items-center rounded-lg transition ${active ? "bg-blue-100" : "bg-slate-100 group-hover:bg-white"}`}>
              <Icon className="h-4 w-4" />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
              active ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
