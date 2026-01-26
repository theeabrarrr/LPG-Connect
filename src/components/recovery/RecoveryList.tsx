"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CustomerDebtCard } from "./CustomerDebtCard";
import { EmptyRecoveryState } from "./EmptyRecoveryState";

interface RecoveryListProps {
    customers: any[]; // Replacing dueCustomers type
}

export function RecoveryList({ customers }: RecoveryListProps) {
    if (!customers || customers.length === 0) {
        return <EmptyRecoveryState />;
    }

    return (
        <div className="space-y-4 pb-4">
            <AnimatePresence mode="popLayout">
                {customers.map((customer, index) => (
                    <CustomerDebtCard key={customer.id} customer={customer} />
                ))}
            </AnimatePresence>
        </div>
    );
}
