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
    <nav className="mt-8 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
              active ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
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
            className={`flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm ${
              active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 text-slate-700"
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
