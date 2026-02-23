import { getOrders } from '@/app/actions/orderActions';
import { getDrivers } from '@/app/actions/adminActions';
import OrderListClient from '@/components/admin/OrderListClient';

export const dynamic = 'force-dynamic';

export default async function OrderListPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const filters = {
        status: searchParams.status as string || 'all',
        driverId: searchParams.driverId as string || 'all',
        startDate: searchParams.startDate as string || '',
        endDate: searchParams.endDate as string || '',
        minAmount: searchParams.minAmount as string || '',
        maxAmount: searchParams.maxAmount as string || '',
        paymentMode: searchParams.paymentMode as string || 'all',
    };

    // Prepare date strings for the server action if they exist
    const actionFilters = {
        ...filters,
        startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
        endDate: filters.endDate ? new Date(new Date(filters.endDate).setHours(23, 59, 59)).toISOString() : undefined,
    };

    const [ordersData, driversData] = await Promise.all([
        getOrders(actionFilters),
        getDrivers()
    ]);

    return (
        <OrderListClient
            initialOrders={ordersData}
            drivers={driversData as any || []}
            currentFilters={filters}
        />
    );
}
