"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, ArrowBigRightDash } from "lucide-react";
import { CollectionDrawer } from "@/components/recovery/CollectionDrawer";
import { motion } from "framer-motion";

import { Database } from "@/types/database.types";

interface CustomerDebtCardProps {
    customer: Database['public']['Tables']['customers']['Row'];
}

export function CustomerDebtCard({ customer }: CustomerDebtCardProps) {
    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="group border-0 shadow-sm ring-1 ring-slate-100 hover:ring-brand-blue-200 transition-all duration-300 rounded-xl overflow-hidden bg-white">
                <CardContent className="p-5 relative">
                    {/* Left Border Indicator */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-r-md"></div>

                    <div className="flex justify-between items-start pl-2">

                        {/* Customer Info */}
                        <div className="flex-1 pr-4 min-w-0">
                            <h3 className="font-bold text-slate-800 text-lg leading-tight truncate font-inter">
                                {customer.name}
                            </h3>

                            <div className="flex flex-col space-y-1 mt-2">
                                {customer.address && (
                                    <div className="flex items-start gap-1.5 text-xs text-slate-500">
                                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                                        <span className="line-clamp-1 break-words leading-snug">{customer.address}</span>
                                    </div>
                                )}
                                {customer.phone && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="font-medium tracking-wide">{customer.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Amount & Action */}
                        <div className="flex flex-col items-end gap-3 shrink-0">
                            <div className="text-right">
                                <div className="font-mono font-bold text-red-600 text-lg">
                                    Rs {Math.abs(customer.current_balance).toLocaleString()}
                                </div>
                                <div className="text-[10px] uppercase font-bold text-red-400/80 tracking-wider text-right">
                                    Due Amount
                                </div>
                            </div>

                            {/* Action Button Wrapper - logic handled by drawer, but styling can be passed if needed */}
                            <div className="w-full">
                                <CollectionDrawer customer={customer}>
                                    <div className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-1 shadow-emerald-200 shadow-md transition-colors cursor-pointer w-full">
                                        Collect <ArrowBigRightDash className="w-4 h-4" />
                                    </div>
                                </CollectionDrawer>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
