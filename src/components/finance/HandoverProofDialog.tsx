'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface HandoverProofDialogProps {
  isOpen: boolean
  onClose: () => void
  proofUrl?: string | null
  senderName?: string // Keeping this optional prop if needed, though not strictly used in new interface call
  onApprove: () => void
  onReject: () => void
  isProcessing: boolean
}

export function HandoverProofDialog({
  isOpen,
  onClose,
  proofUrl,
  senderName,
  onApprove,
  onReject,
  isProcessing
}: HandoverProofDialogProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Verify Cash Handover</DialogTitle>
          <DialogDescription>
            {senderName ? `Proof from ${senderName}.` : 'Review the proof of payment below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-96 mt-4 border rounded-md bg-gray-50 flex items-center justify-center overflow-hidden">
          {proofUrl ? (
            <Image
              src={proofUrl}
              alt="Handover proof"
              fill
              className="object-contain"
            />
          ) : (
            <p className="text-gray-500">No proof image available</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={isProcessing}
          >
            Reject
          </Button>
          <Button
            variant="default"
            onClick={onApprove}
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing
              </>
            ) : (
              'Approve Receipt'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}