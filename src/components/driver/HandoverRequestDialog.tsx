'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/utils/supabase/client'
import { initiateHandover } from '@/app/actions/handoverActions'
import { toast } from 'sonner'
import { Loader2, UploadCloud } from 'lucide-react'
import Image from 'next/image'

interface HandoverRequestDialogProps {
    isOpen: boolean
    onClose: () => void
    maxAmount: number
    onSuccess: () => void
}

export function HandoverRequestDialog({ isOpen, onClose, maxAmount, onSuccess }: HandoverRequestDialogProps) {
    const [amount, setAmount] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error("File size too large (Max 5MB)")
                return
            }
            setFile(selectedFile)
            setPreviewUrl(URL.createObjectURL(selectedFile))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast.error("Please enter a valid amount")
            return
        }
        if (Number(amount) > maxAmount) {
            toast.error(`Amount cannot exceed wallet balance (Rs ${maxAmount})`)
            return
        }
        if (!file) {
            toast.error("Please upload a proof of deposit (receipt image)")
            return
        }

        setIsSubmitting(true)
        const supabase = createClient()

        try {
            // 1. Upload File
            const fileExt = file.name.split('.').pop()
            const fileName = `handover_${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(filePath, file)

            if (uploadError) {
                throw new Error('Image upload failed: ' + uploadError.message)
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(filePath)

            // 2. Submit Handover Request
            const formData = new FormData()
            formData.append('amount', amount)
            formData.append('proof_url', publicUrl)

            const result = await initiateHandover(formData)

            if (result.success) {
                toast.success('Handover requested successfully')
                onSuccess()
                handleClose()
            } else {
                toast.error(result.error || 'Failed to submit request')
            }

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'An unexpected error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setAmount('')
        setFile(null)
        setPreviewUrl(null)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Deposit Cash</DialogTitle>
                    <DialogDescription>
                        Submit proof of cash deposit given to admin.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount (Rs)</Label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            max={maxAmount}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Max available: Rs {maxAmount.toLocaleString()}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="proof">Proof of Deposit</Label>
                        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md hover:bg-slate-50 transition-colors cursor-pointer relative"
                            onClick={() => document.getElementById('proof-upload')?.click()}>

                            {previewUrl ? (
                                <div className="relative w-full h-40">
                                    <Image
                                        src={previewUrl}
                                        alt="Preview"
                                        fill
                                        style={{ objectFit: 'contain' }}
                                        className="rounded-md"
                                    />
                                </div>
                            ) : (
                                <div className="text-center space-y-2">
                                    <UploadCloud className="w-8 h-8 mx-auto text-gray-400" />
                                    <span className="text-sm text-gray-500">Click to upload receipt</span>
                                </div>
                            )}

                            <input
                                id="proof-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Request'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
