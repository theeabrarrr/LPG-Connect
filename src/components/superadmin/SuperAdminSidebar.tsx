'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import LogoutBtn from "@/components/LogoutBtn";

const navItems = [
    { href: '/superadmin', label: 'Platform Analytics', icon: LayoutDashboard },
    { href: '/superadmin/tenants', label: 'Tenants', icon: Building2 },
];

export function SuperAdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex flex-col w-64 border-r border-border bg-white h-screen sticky top-0">
            <div className="p-6 border-b border-border">
                <h1 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
                    <span className="bg-primary/10 p-1.5 rounded-lg">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                    </span>
                    Super Admin
                </h1>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground">
                    <LogoutBtn />
                </div>
            </div>
        </aside>
    );
}
