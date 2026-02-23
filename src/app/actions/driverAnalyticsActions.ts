'use server';

import { createClient } from "@/utils/supabase/server";

export async function getAllDriverAnalytics(startDateStr: string, endDateStr: string) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Unauthorized: Not authenticated' };
    }

    const tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id;
    if (!tenantId) {
        return { success: false, error: 'Unauthorized: No tenant assigned' };
    }

    // 1. Fetch all drivers for this tenant
    const { data: drivers, error: driversError } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'driver')
        .eq('tenant_id', tenantId);

    if (driversError) {
        return { success: false, error: driversError.message };
    }

    if (!drivers || drivers.length === 0) {
        return { success: true, data: [] };
    }

    // 2. Fetch performance for each driver using the new secure RPC
    const analyticsPromises = drivers.map(async (driver: any) => {
        const { data, error } = await supabase.rpc('get_driver_performance', {
            p_tenant_id: tenantId,
            p_driver_id: driver.id,
            p_start_date: startDateStr,
            p_end_date: endDateStr
        });

        if (error) {
            console.error(`Error fetching analytics for driver ${driver.name}:`, error);
            return {
                id: driver.id,
                name: driver.name,
                total_orders: 0,
                avg_delivery_time_mins: 0,
                cash_collected: 0,
                cash_deposited: 0,
                current_liability: 0
            };
        }

        return {
            id: driver.id,
            name: driver.name,
            total_orders: data.total_orders,
            avg_delivery_time_mins: data.avg_delivery_time_mins,
            cash_collected: data.cash_collected,
            cash_deposited: data.cash_deposited,
            current_liability: data.current_liability
        };
    });

    const results = await Promise.all(analyticsPromises);

    // Sort by total orders descending by default
    results.sort((a, b) => b.total_orders - a.total_orders);

    return { success: true, data: results };
}
