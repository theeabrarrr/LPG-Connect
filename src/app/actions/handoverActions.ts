'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserTenantId } from '@/lib/utils/tenantHelper'
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
    tenantId = await getCurrentUserTenantId()
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
    tenantId = await getCurrentUserTenantId()
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
 * This should ideally involve a Postgres function for atomicity for wallet updates.
 */
export async function approveHandover(handoverId: string) {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getCurrentUserTenantId()
  } catch (error) {
    return { success: false, error: 'Authentication required' }
  }

  const { data: handover, error: fetchError } = await supabase
    .from('handover_logs')
    .select('id, amount, sender_id, tenant_id')
    .eq('id', handoverId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !handover) {
    return { success: false, error: 'Handover not found or access denied' }
  }

  // --- Start Atomic DB Transaction (ideally via RPC) ---
  // For now, simulating with sequential updates. Real app should use an RPC.
  // Example RPC: approve_driver_handover(p_handover_id, p_admin_id)

  const { error: updateHandoverError } = await supabase
    .from('handover_logs')
    .update({ status: 'verified' })
    .eq('id', handoverId)
    .eq('tenant_id', tenantId)

  if (updateHandoverError) {
    console.error('Error updating handover status:', updateHandoverError)
    return { success: false, error: 'Failed to update handover status' }
  }

  // Update sender's (driver's) employee wallet
  const { error: updateWalletError } = await supabase
    .from('employee_wallets')
    .update({ balance: -handover.amount }) // Subtract handed over cash from driver's wallet
    .eq('user_id', handover.sender_id)
    .eq('tenant_id', tenantId)

  if (updateWalletError) {
    console.error('Error updating employee wallet:', updateWalletError)
    // IMPORTANT: In a real scenario, this would rollback the handover status update
    return { success: false, error: 'Failed to update driver wallet' }
  }

  // Insert entry into cash_book_entries for the company's treasury
  const { data: currentUser, error: userError } = await getCurrentUser(); // Get current user for created_by
  if (userError || !currentUser) {
      console.error('Error getting current user:', userError);
      return { success: false, error: 'Failed to get current user for cash book entry' };
  }

  const { error: cashBookError } = await supabase
    .from('cash_book_entries')
    .insert({
      tenant_id: tenantId,
      amount: handover.amount,
      transaction_type: 'cash_in', // Or 'driver_deposit' as per GAP_ANALYSIS
      description: `Cash handover from ${currentUser.full_name} (${handover.sender_id})`,
      reference_id: handover.id,
      created_by: currentUser.id
    })
  
  if (cashBookError) {
    console.error('Error adding cash book entry:', cashBookError)
    // IMPORTANT: In a real scenario, this would rollback previous updates
    return { success: false, error: 'Failed to add cash book entry' }
  }

  // --- End Atomic DB Transaction ---

  revalidatePath('/admin/handovers')
  revalidatePath('/admin/finance')
  return { success: true, message: 'Handover approved successfully' }
}

/**
 * Reject a handover
 */
export async function rejectHandover(handoverId: string, reason: string) {
  const supabase = await createClient()

  let tenantId: string
  try {
    tenantId = await getCurrentUserTenantId()
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
export async function initiateHandover(amount: number) {
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
  
  if(filters?.status) {
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