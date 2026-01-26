"use client"

import { useState } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { collectPayment } from "@/app/actions/recoveryActions"

const collectionSchema = z.object({
    amount: z.number().min(1, "Amount must be greater than 0"),
    paymentMode: z.union([
        z.literal("cash"),
        z.literal("cheque"),
        z.literal("bank"),
    ]),
    description: z.string().optional(),
})

export type CollectionFormValues = z.infer<typeof collectionSchema>;

interface CollectionDrawerProps {
    customer: {
        id: string
        name: string
        current_balance: number // Expecting negative value (debt)
    }
    children?: React.ReactNode
}

export function CollectionDrawer({ customer, children }: CollectionDrawerProps) {
    const [open, setOpen] = useState(false)
    const debt = Math.abs(customer.current_balance) // Display as positive debt

    const form = useForm<CollectionFormValues>({
        resolver: zodResolver(collectionSchema),
        defaultValues: {
            amount: 0, // Suggest full amount? or 0? 
            paymentMode: "cash",
            description: "",
        },
    })

    // Suggest full payment on open
    // useEffect(() => {
    //     if (open) form.setValue("amount", debt);
    // }, [open, debt, form]);

    const onSubmit: SubmitHandler<CollectionFormValues> = async (values) => {
        const formData = new FormData()
        formData.append("customer_id", customer.id)
        formData.append("amount", values.amount.toString())
        formData.append("payment_mode", values.paymentMode)
        if (values.description) formData.append("description", values.description)

        // Manual File Extraction (Simple & Effective)
        const fileInput = document.getElementById('proof_image_input') as HTMLInputElement;
        if (fileInput?.files?.[0]) {
            formData.append("proof_image", fileInput.files[0]);
        }

        const result = await collectPayment(formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(`Collected Rs ${values.amount} from ${customer.name}`)
            setOpen(false)
            form.reset()
        }
    }

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                {children ? children : (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                        Collect Payment
                    </Button>
                )}
            </DrawerTrigger>
            <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader>
                        <DrawerTitle>Collect Payment</DrawerTitle>
                        <DrawerDescription>
                            Collecting from <span className="font-bold text-foreground">{customer.name}</span>.<br />
                            Total Due: <span className="font-bold text-rose-600">Rs {debt.toLocaleString()}</span>
                        </DrawerDescription>
                    </DrawerHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">

                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount Received</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-muted-foreground font-bold">Rs</span>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    className="pl-10 text-lg font-bold"
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value);
                                                        field.onChange(isNaN(val) ? 0 : val);
                                                    }}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="paymentMode"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Payment Mode</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex flex-col space-y-1"
                                            >
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="cash" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                        Cash
                                                    </FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="cheque" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                        Cheque
                                                    </FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="bank" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">
                                                        Online / Bank Transfer
                                                    </FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* WARNING FOR NON-CASH */}
                            {form.watch("paymentMode") !== 'cash' && (
                                <div className="bg-yellow-50 text-yellow-800 text-sm p-3 rounded-md border border-yellow-200">
                                    <strong>Pending Verification:</strong> Balance will update only after Admin approval.
                                </div>
                            )}

                            {/* PROOF UPLOAD FOR NON-CASH */}
                            {form.watch("paymentMode") !== 'cash' && (
                                <div className="space-y-2">
                                    <FormLabel>Upload Proof</FormLabel>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                // We can't strictly bind file input to react-hook-form easily without custom component
                                                // So we'll just handle it in onSubmit via Ref or simpler state, 
                                                // BUT for simplicity in this drawer, let's attach it to a temp state or just read it from the DOM on submit?
                                                // Better: use a state for the file.
                                            }
                                        }}
                                        name="proof_image" // Important for native FormData extraction if we didn't use RHF's values
                                        id="proof_image_input" // ID to query it later
                                    />
                                    <p className="text-xs text-muted-foreground">Image of Cheque or Receipt</p>
                                </div>
                            )}

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Note / Ref #</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Optional" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-lg mt-4" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                Confirm Collection
                            </Button>
                        </form>
                    </Form>

                    <DrawerFooter>
                        <DrawerClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    )
}
