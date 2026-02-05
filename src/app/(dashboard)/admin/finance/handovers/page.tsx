'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    getPendingHandovers,
    approveHandover,
    rejectHandover
} from '@/app/actions/handoverActions'
import { HandoverProofDialog } from '@/components/finance/HandoverProofDialog'
import { formatCurrency } from '@/lib/utils'
import { Loader2, RefreshCcw, CheckCircle, XCircle, Eye, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function HandoverManagementPage() {
    const [handovers, setHandovers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedHandover, setSelectedHandover] = useState<any>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [stats, setStats] = useState({ pendingCount: 0, pendingAmount: 0 })

    const fetchHandovers = async () => {
        setLoading(true)
        const result = await getPendingHandovers()
        if (result.success && result.data) {
            setHandovers(result.data)

            // Calculate stats
            const pendingAmount = result.data.reduce((sum: number, item: any) => sum + Number(item.amount), 0)
            setStats({
                pendingCount: result.data.length,
                pendingAmount
            })
        } else {
            toast.error('Failed to fetch handovers: ' + result.error)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchHandovers()
    }, [])

    const handleViewProof = (handover: any) => {
        setSelectedHandover(handover)
        setIsDialogOpen(true)
    }

    const handleApprove = async () => {
        if (!selectedHandover) return
        setProcessingId(selectedHandover.id)

        try {
            const result = await approveHandover(selectedHandover.id)
            if (result.success) {
                toast.success('Handover approved successfully')
                setIsDialogOpen(false)

                // Optimistic Update
                setHandovers(prev => prev.filter(h => h.id !== selectedHandover.id))
                setStats(prev => ({
                    pendingCount: prev.pendingCount - 1,
                    pendingAmount: prev.pendingAmount - Number(selectedHandover.amount)
                }))
            } else {
                toast.error(result.error || 'Approval failed')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
        } finally {
            setProcessingId(null)
        }
    }

    const handleReject = async () => {
        if (!selectedHandover) return
        setProcessingId(selectedHandover.id)

        try {
            // Reason could be entered in a prompt or dialog, keeping it simple "Admin Rejected" for now
            const result = await rejectHandover(selectedHandover.id, 'Admin Rejected')
            if (result.success) {
                toast.success('Handover rejected')
                setIsDialogOpen(false)

                // Optimistic Update
                setHandovers(prev => prev.filter(h => h.id !== selectedHandover.id))
                setStats(prev => ({
                    pendingCount: prev.pendingCount - 1,
                    pendingAmount: prev.pendingAmount - Number(selectedHandover.amount)
                }))
            } else {
                toast.error(result.error || 'Rejection failed')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Cash Handovers</h2>
                    <p className="text-muted-foreground">Manage cash deposits from drivers and staff.</p>
                </div>
                <Button variant="outline" onClick={fetchHandovers} disabled={loading}>
                    <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingCount}</div>
                        <p className="text-xs text-muted-foreground">Requests waiting for verification</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pending Value</CardTitle>
                        <p className="text-xs font-bold text-green-600">PKR</p>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.pendingAmount)}</div>
                        <p className="text-xs text-muted-foreground">Cash to be collected</p>
                    </CardContent>
                </Card>
            </div>

            {/* Handovers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Pending Requests</CardTitle>
                    <CardDescription>Verify proof images before approving deposits.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        </div>
                    ) : handovers.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">
                            No pending handovers found.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Driver / Staff</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Proof</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {handovers.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            {new Date(item.created_at).toLocaleDateString()}
                                            <div className="text-xs text-gray-500">
                                                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{item.sender?.name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500 capitalize">{item.sender?.role || 'Staff'}</div>
                                        </TableCell>
                                        <TableCell className="font-bold text-green-700">
                                            {formatCurrency(item.amount)}
                                        </TableCell>
                                        <TableCell>
                                            {item.proof_url ? (
                                                <Badge variant="outline" className="cursor-pointer hover:bg-gray-100" onClick={() => handleViewProof(item)}>
                                                    <Eye className="mr-1 h-3 w-3" /> View Proof
                                                </Badge>
                                            ) : (
                                                <span className="text-gray-400 text-sm">No Proof</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => handleViewProof(item)}
                                            >
                                                Verify
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <HandoverProofDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                proofUrl={selectedHandover?.proof_url}
                onApprove={handleApprove}
                onReject={handleReject}
                isProcessing={!!processingId}
            />
        </div>
    )
}
