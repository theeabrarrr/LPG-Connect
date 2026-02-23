import { createClient } from "@/utils/supabase/server";

export type SystemAlert = {
    id: string; // crypto.randomUUID()
    type: 'LOW_STOCK' | 'AGING_CYLINDER' | 'DRIVER_HOARDING';
    severity: 'CRITICAL' | 'WARNING' | 'NOTICE';
    message: string;
    metadata: any;
};

export async function checkInventoryAlerts(tenantId: string): Promise<{ success: boolean, alerts: SystemAlert[], error?: string }> {
    const supabase = await createClient();
    const alerts: SystemAlert[] = [];

    try {
        // --- 1. Low Stock Alerts (Effective Stock) ---
        // A. Fetch organization settings threshold
        const { data: orgSettings, error: orgError } = await supabase
            .from('organization_settings')
            .select('low_stock_threshold')
            .eq('tenant_id', tenantId)
            .single();

        if (orgError && orgError.code !== 'PGRST116') {
            console.error("Error fetching org settings for alerts:", orgError);
        }

        const lowStockThreshold = orgSettings?.low_stock_threshold || 10; // Default to 10 if missing

        // B. Fetch Current Stock (Warehouse + Full)
        const { count: warehouseCount, error: countError } = await supabase
            .from('cylinders')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('current_location_type', 'warehouse')
            .eq('status', 'full');

        const currentStock = warehouseCount || 0;

        // C. Fetch Pending Orders to calculate deductions
        // Sum using RPC or fallback to raw data sum
        const { data: pendingOrders, error: ordersError } = await supabase
            .from('orders')
            .select('cylinders_count')
            .eq('tenant_id', tenantId)
            .eq('status', 'pending');

        let pendingDispatches = 0;
        if (pendingOrders) {
            pendingDispatches = pendingOrders.reduce((sum, order) => sum + (order.cylinders_count || 0), 0);
        }

        // D. Calculate Effective Stock
        const effectiveStock = currentStock - pendingDispatches;

        if (effectiveStock <= lowStockThreshold) {
            alerts.push({
                id: crypto.randomUUID(),
                type: 'LOW_STOCK',
                severity: 'CRITICAL',
                message: `CRITICAL: Effective Godown stock has fallen to ${effectiveStock}. (Threshold: ${lowStockThreshold}). Immediate resupply required.`,
                metadata: {
                    currentPhysicalStock: currentStock,
                    pendingDispatches: pendingDispatches,
                    effectiveStock: effectiveStock,
                    threshold: lowStockThreshold
                }
            });
        }

        // --- 2. Aging Cylinders Alerts (Aggregated) ---
        // A. Fetch cylinders sitting outside warehouse for > 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const isoThirtyDaysAgo = thirtyDaysAgo.toISOString();

        const { data: agingCylinders, error: agingError } = await supabase
            .from('cylinders')
            .select(`
                id, 
                serial_number, 
                current_location_type, 
                current_customer_id, 
                current_holder_id,
                updated_at,
                customers:current_customer_id (name),
                profiles:current_holder_id (full_name)
            `)
            .eq('tenant_id', tenantId)
            .in('current_location_type', ['customer', 'driver'])
            .lt('updated_at', isoThirtyDaysAgo);

        if (!agingError && agingCylinders && agingCylinders.length > 0) {
            // B. Aggregate by entity (Customer or Driver)
            const aggregates = new Map<string, { entityName: string, locationType: string, count: number }>();

            agingCylinders.forEach(cylinder => {
                const isCustomer = cylinder.current_location_type === 'customer';
                const entityId = isCustomer ? cylinder.current_customer_id : cylinder.current_holder_id;

                // Skip if no entity assigned somehow
                if (!entityId) return;

                const entityName = isCustomer
                    ? (cylinder.customers as any)?.name || 'Unknown Customer'
                    : (cylinder.profiles as any)?.full_name || 'Unknown Driver';

                const mapKey = `${cylinder.current_location_type}_${entityId}`;

                if (!aggregates.has(mapKey)) {
                    aggregates.set(mapKey, { entityName, locationType: cylinder.current_location_type, count: 0 });
                }

                aggregates.get(mapKey)!.count++;
            });

            // C. Push aggregated alerts
            aggregates.forEach((data, mapKey) => {
                alerts.push({
                    id: crypto.randomUUID(),
                    type: 'AGING_CYLINDER',
                    severity: 'WARNING',
                    message: `WARNING: ${data.entityName} (${data.locationType}) is holding ${data.count} cylinder(s) stagnant for over 30 days. Action required.`,
                    metadata: {
                        entityId: mapKey.split('_')[1],
                        entityName: data.entityName,
                        locationType: data.locationType,
                        stagnantCount: data.count
                    }
                });
            });
        }

        // --- 3. Driver Hoarding (Stub) ---
        // Can be fully implemented later utilizing profiles.vehicle_capacity and realtime order checks.
        // For MVP, we pass.

        return { success: true, alerts };

    } catch (err: any) {
        console.error("Critical error inside checkInventoryAlerts", err);
        return { success: false, alerts: [], error: err.message || "Failed to generate inventory alerts." };
    }
}
