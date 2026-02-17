'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import Image from 'next/image'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HandoverProofDialogProps {
  proofUrl?: string | null
  senderName?: string
}

export function HandoverProofDialog({ proofUrl, senderName }: HandoverProofDialogProps) {
  if (!proofUrl) {
    return (
      <Button variant="ghost" size="icon" disabled title="No Proof">
        <Eye className="h-4 w-4 text-gray-400" />
      </Button>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="View Proof">
          <Eye className="h-4 w-4 text-blue-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Proof for Handover from {senderName || 'Driver'}</DialogTitle>
          <DialogDescription>
            This is the image provided as proof of cash handover.
          </DialogDescription>
        </DialogHeader>
        <div className="relative w-full h-96 mt-4 border rounded-md overflow-hidden">
          <Image
            src={proofUrl}
            alt={`Handover proof from ${senderName}`}
            layout="fill"
            objectFit="contain"
            className="rounded-md"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}