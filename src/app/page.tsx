import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Role-Based Redirection
  const role = user.user_metadata?.role;

  switch (role) {
    case 'super_admin':
      return redirect("/super-admin");
    case 'driver':
      return redirect("/driver");
    case 'recovery_agent':
      return redirect("/recovery");
    case 'finance': // Future proofing
      return redirect("/admin/finance");
    default:
      // Default to Admin Dashboard for 'admin', 'shop_manager', or undefined
      return redirect("/admin");
  }
}
