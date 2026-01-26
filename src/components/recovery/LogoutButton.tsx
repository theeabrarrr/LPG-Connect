"use client";

import { createClient } from "@/utils/supabase/client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <button
            onClick={handleLogout}
            className="h-10 w-10 bg-emerald-800/50 backdrop-blur-md rounded-full flex items-center justify-center border border-emerald-700/50 hover:bg-emerald-800/80 transition-colors cursor-pointer"
            aria-label="Logout"
            title="Logout"
        >
            <LogOut className="w-5 h-5 text-emerald-100" />
        </button>
    );
}
