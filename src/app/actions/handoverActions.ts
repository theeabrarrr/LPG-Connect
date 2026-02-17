'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentUserTenantId, getCurrentUser } from '@/lib/utils/tenantHelper'
import { revalidatePath } from 'next/cache'

interface HandoverFilters {
  status?: 'pending' | 'verified' | 'rejected'
  driverId?: string
  startDate?: string
  endDate?: string
}

/**
 * Get pending handovers for admin verification
 */
export async function getPendingHandovers() {
  const supabase = await createClient()

  let tenantId: string
  try {
    const id = await getCurrentUserTenantId()
    if (!id) throw new Error('No tenant found')
    tenantId = id
  } catch (error) {
    return { success: false, error: 'Authentication required' }
  }

  // Fetch handovers where status is pending and associated with the tenant
  const { data, error } = await supabase
    .from('handover_logs')
    .select('*, sender:profiles(full_name, phone_number), receiver:profiles(full_name, phone_number)')
    .eq('status', 'pending')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending handovers:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Get handover details by ID
 */
export async function getHandoverById(handoverId: string) {
  const supabase = await createClient()

  let tenantId: string
  try {
    const id = await getCurrentUserTenantId()
    if (!id) throw new Error('No tenant found')
    tenantId = id
  } catch (error) {
    return { success: false, error: 'Authentication required' }
  }

  const { data, error } = await supabase
    .from('handover_logs')
    .select('*, sender:profiles(full_name, phone_number), receiver:profiles(full_name, phone_number)')
    .eq('id', handoverId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching handover by ID:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Approve a handover
 * USES ATOMIC RPC: execute_handover_approval
 */
export async function approveHandover(handoverId: string) {
  const supabase = await createClient()

  let tenantId: string
  let adminId: string
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')
    tenantId = user.tenant_id
    adminId = user.id
  } catch (error) {
    return { success: false, error: 'Authentication required' }
  }

  // --- ATOMIC TRANSACTION VIA RPC ---
  const { error } = await supabase.rpc('execute_handover_approval', {
    p_handover_id: handoverId,
    p_admin_id: adminId
  })

  if (error) {
    console.error('Error approving handover (RPC):', error)
    return { success: false, error: `Approval failed: ${error.message}` }
  }

  revalidatePath('/admin/handovers')
  revalidatePath('/admin/finance')
  return { success: true, message: 'Handover approved successfully (Atomic)' }
}

/**
 * Reject a handover
 */
export async function rejectHandover(handoverId: string, reason: string) {
  const supabase = await createClient()

  let tenantId: string
  try {
    const id = await getCurrentUserTenantId()
    if (!id) throw new Error('No tenant found')
    tenantId = id
  } catch (error) {
    return { success: false, error: 'Authentication required' }
  }

  const { data: handover, error: fetchError } = await supabase
    .from('handover_logs')
    .select('id, tenant_id')
    .eq('id', handoverId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !handover) {
    return { success: false, error: 'Handover not found or access denied' }
  }

  const { error: updateError } = await supabase
    .from('handover_logs')
    .update({ status: 'rejected', description: `Rejected: ${reason}` })
    .eq('id', handoverId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    console.error('Error rejecting handover:', updateError)
    return { success: false, error: 'Failed to reject handover' }
  }

  revalidatePath('/admin/handovers')
  return { success: true, message: 'Handover rejected successfully' }
}

/**
 * Initiate a handover (by driver)
 */
export async function initiateHandover(amount: number, proofUrl: string) {
  const supabase = await createClient()

  let tenantId: string
  let userId: string
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')
    tenantId = user.tenant_id
    userId = user.id
  } catch (error) {
    return { success: false, error: 'Authentication required' }
  }

  // Check driver's wallet balance
  const { data: wallet, error: walletError } = await supabase
    .from('employee_wallets')
    .select('balance')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (walletError || !wallet) {
    return { success: false, error: 'Driver wallet not found' }
  }

  if (wallet.balance < amount) {
    return { success: false, error: 'Insufficient wallet balance for handover' }
  }

  const { error: insertError } = await supabase
    .from('handover_logs')
    .insert({
      tenant_id: tenantId,
      sender_id: userId,
      amount: amount,
      proof_url: proofUrl,
      status: 'pending' // Initially pending for admin approval
    })

  if (insertError) {
    console.error('Error initiating handover:', insertError)
    return { success: false, error: 'Failed to initiate handover' }
  }

  revalidatePath('/driver/dashboard') // Revalidate driver's dashboard to show pending handover
  revalidatePath('/admin/handovers') // Notify admins
  return { success: true, message: 'Handover initiated successfully. Awaiting admin approval.' }
}

/**
 * Get handover history for a user
 */
export async function getHandoverHistory(filters?: HandoverFilters) {
  const supabase = await createClient()

  let tenantId: string
  let userId: string
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')
    tenantId = user.tenant_id
    userId = user.id
  } catch (error) {
    return { success: false, error: 'Authentication required' }
  }

  let query = supabase
    .from('handover_logs')
    .select('*, sender:profiles(full_name), receiver:profiles(full_name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  // If the user is not an admin, they should only see their own handovers
  const { data: currentUserProfile } = await getCurrentUser();
  if (currentUserProfile && !['admin', 'super_admin'].includes(currentUserProfile.role)) {
    query = query.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching handover history:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}