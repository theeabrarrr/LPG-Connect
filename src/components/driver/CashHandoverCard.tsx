'use client'

import { useState } from 'react'
import { ChevronRight, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HandoverRequestDialog } from './HandoverRequestDialog'
import Link from 'next/link'

interface CashHandoverCardProps {
    balance: number
    onRefresh: () => void
}

export function CashHandoverCard({ balance, onRefresh }: CashHandoverCardProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Thresholds for UI feedback
    const isCritical = balance >= 10000

    return (
        <>
            <div className="relative overflow-hidden rounded-2xl p-6 shadow-md bg-white border border-slate-100">
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-slate-400" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Cash in Hand</p>
                        </div>

                        {isCritical ? (
                            <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-wide border border-rose-100 animate-pulse">
                                Deposit Needed
                            </div>
                        ) : (
                            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wide border border-emerald-100">
                                Limit Safe
                            </div>
                        )}
                    </div>

                    <h2 className={`text-4xl font-black mb-4 tracking-tight ${isCritical ? 'text-rose-600' : 'text-emerald-600'}`}>
                        <span className="text-2xl font-bold opacity-60 mr-1 text-slate-400">Rs.</span>
                        {balance.toLocaleString()}
                    </h2>

                    <div className="flex items-center justify-between mt-4">
                        <Link href="/driver/history" className="flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                            View History <ChevronRight size={16} />
                        </Link>

                        <Button
                            onClick={() => setIsDialogOpen(true)}
                            className={isCritical ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-800"}
                        >
                            Deposit Cash
                        </Button>
                    </div>
                </div>
            </div>

            <HandoverRequestDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                maxAmount={balance}
                onSuccess={() => {
                    setIsDialogOpen(false)
                    onRefresh()
                }}
            />
        </>
    )
}
