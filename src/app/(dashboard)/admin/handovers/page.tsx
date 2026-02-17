'use client'

import { useState, useEffect } from 'react'
import {
  getPendingHandovers,
  approveHandover,
  rejectHandover,
} from '@/app/actions/handoverActions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Check, X, Eye } from 'lucide-react'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HandoverProofDialog } from '@/components/finance/HandoverProofDialog' // Import HandoverProofDialog

interface HandoverLog {
  id: string
  amount: number
  status: 'pending' | 'verified' | 'rejected'
  created_at: string
  sender_id: string
  sender: { full_name: string; phone_number: string }
  receiver_id: string
  receiver: { full_name: string; phone_number: string }
  proof_url?: string // Add proof_url to interface
}

export default function HandoverManagementPage() {
  const [pendingHandovers, setPendingHandovers] = useState<HandoverLog[]>([])
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [selectedHandover, setSelectedHandover] = useState<HandoverLog | null>(null)

  const fetchHandovers = async () => {
    setLoading(true)
    const result = await getPendingHandovers()
    if (result.success && result.data) {
      setPendingHandovers(result.data)
    } else {
      console.error('Failed to fetch handovers:', result.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchHandovers()
  }, [])

  const handleApprove = async (handoverId: string) => {
    if (!confirm('Are you sure you want to approve this handover?')) return
    const result = await approveHandover(handoverId)
    if (result.success) {
      alert(result.message)
      fetchHandovers()
    } else {
      alert(result.error)
    }
  }

  const handleReject = async (handoverId: string) => {
    if (!selectedHandover || selectedHandover.id !== handoverId) {
        alert('Please provide a rejection reason first.');
        return;
    }
    if (!reason.trim()) {
      alert('Rejection reason cannot be empty.')
      return
    }
    const result = await rejectHandover(handoverId, reason)
    if (result.success) {
      alert(result.message)
      setReason('')
      setSelectedHandover(null)
      fetchHandovers()
    } else {
      alert(result.error)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cash Handover Management</h1>
        <Button onClick={fetchHandovers} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Handovers'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Handovers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading pending handovers...</p>
          ) : pendingHandovers.length === 0 ? (
            <p>No pending handovers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Proof</TableHead> {/* New TableHead for Proof */}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingHandovers.map((handover) => (
                    <TableRow key={handover.id}>
                      <TableCell className="font-medium">
                        {handover.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {handover.sender?.full_name || 'N/A'} ({handover.sender?.phone_number || 'N/A'})
                      </TableCell>
                      <TableCell>${handover.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        {format(new Date(handover.created_at), 'PPP p')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{handover.status}</Badge>
                      </TableCell>
                      <TableCell> {/* New TableCell for Proof */}
                        <HandoverProofDialog proofUrl={handover.proof_url} senderName={handover.sender?.full_name} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(handover.id)}
                          title="Approve Handover"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Reject Handover"
                              onClick={() => setSelectedHandover(handover)}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reject Handover</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to reject this handover? Please provide a
                                reason.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-4">
                                <Label htmlFor="rejection-reason">Reason for Rejection</Label>
                                <Input
                                id="rejection-reason"
                                placeholder="e.g., Incorrect amount, missing proof"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                />
                            </div>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => {
                                  setReason('');
                                  setSelectedHandover(null);
                                }}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => selectedHandover && handleReject(selectedHandover.id)}>
                                Reject
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optional: Add a section for Handover History */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Handover History</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Table or list of all handovers, with filters.</p>
        </CardContent>
      </Card> */}
    </div>
  )
}