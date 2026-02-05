'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { useState } from 'react'

interface HandoverProofDialogProps {
    proofUrl: string | null
    isOpen: boolean
    onClose: () => void
    onApprove: () => void
    onReject: () => void
    isProcessing: boolean
}

export function HandoverProofDialog({
    proofUrl,
    isOpen,
    onClose,
    onApprove,
    onReject,
    isProcessing
}: HandoverProofDialogProps) {
    const [imageError, setImageError] = useState(false)

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Verify Cash Handover</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    {proofUrl && !imageError ? (
                        <div className="relative w-full h-64 border rounded-md overflow-hidden bg-gray-100">
                            <Image
                                src={proofUrl}
                                alt="Handover Proof"
                                fill
                                style={{ objectFit: 'contain' }}
                                onError={() => setImageError(true)}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center w-full h-40 bg-gray-100 rounded-md text-gray-400">
                            {imageError ? 'Failed to load image' : 'No proof image provided'}
                        </div>
                    )}

                    <p className="text-sm text-gray-500 text-center">
                        Please verify the actual cash received matches the request amount before approving.
                    </p>
                </div>

                <DialogFooter className="flex flex-row space-x-2 sm:justify-end">
                    <Button
                        variant="destructive"
                        onClick={onReject}
                        disabled={isProcessing}
                    >
                        Reject
                    </Button>
                    <Button
                        onClick={onApprove}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isProcessing ? 'Processing...' : 'Verify & Approve'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
