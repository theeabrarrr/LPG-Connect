import { getCustomers, getCustomerStats } from '@/app/actions/customerActions';
import { getTenantInfo } from '@/app/actions/adminActions';
import CustomerListClient from '@/components/admin/CustomerListClient';

export const dynamic = 'force-dynamic';

export default async function CustomerListPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const page = parseInt(searchParams.page as string || '1');
    const limit = parseInt(searchParams.limit as string || '10');
    const search = searchParams.search as string || '';
    const status = (searchParams.status as 'all' | 'active' | 'inactive') || 'active';
    const balanceStatus = (searchParams.balanceStatus as 'all' | 'positive' | 'negative' | 'zero') || 'all';

    const [tenantInfo, stats, { data, total }] = await Promise.all([
        getTenantInfo(),
        getCustomerStats(),
        getCustomers(page, limit, search, status, { balanceStatus })
    ]);

    return (
        <CustomerListClient
            initialCustomers={data}
            totalCount={total}
            stats={stats}
            tenantName={tenantInfo.name || "My Organization"}
            currentFilters={{ page, limit, search, status, balanceStatus }}
        />
    );
}
