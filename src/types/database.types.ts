export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    tenant_id: string
                    email: string
                    name: string | null
                    role: string | null
                    shift: string | null
                    status: string | null
                    created_at: string
                    [key: string]: any
                }
                Insert: {
                    id?: string
                    tenant_id?: string
                    email: string
                    name?: string | null
                    role?: string | null
                    shift?: string | null
                    status?: string | null
                    created_at?: string
                    [key: string]: any
                }
                Update: {
                    id?: string
                    tenant_id?: string
                    email?: string
                    name?: string | null
                    role?: string | null
                    shift?: string | null
                    status?: string | null
                    created_at?: string
                    [key: string]: any
                }
            }
            profiles: {
                Row: {
                    id: string
                    tenant_id: string
                    full_name: string | null
                    role: string | null
                    shift: string | null
                    phone_number: string | null
                    vehicle_number: string | null
                    status: string | null
                    created_at: string
                    updated_at: string | null
                    [key: string]: any
                }
                Insert: {
                    id: string
                    tenant_id?: string
                    full_name?: string | null
                    role?: string | null
                    shift?: string | null
                    phone_number?: string | null
                    vehicle_number?: string | null
                    status?: string | null
                    created_at?: string
                    updated_at?: string | null
                    [key: string]: any
                }
                Update: {
                    id?: string
                    tenant_id?: string
                    full_name?: string | null
                    role?: string | null
                    shift?: string | null
                    phone_number?: string | null
                    vehicle_number?: string | null
                    status?: string | null
                    created_at?: string
                    updated_at?: string | null
                    [key: string]: any
                }
            }
            orders: {
                Row: {
                    id: string
                    tenant_id: string
                    created_at: string
                    [key: string]: any
                }
                Insert: { [key: string]: any }
                Update: { [key: string]: any }
            }
            cylinders: {
                Row: {
                    id: string
                    tenant_id: string
                    created_at: string
                    [key: string]: any
                }
                Insert: { [key: string]: any }
                Update: { [key: string]: any }
            }
            customers: {
                Row: {
                    id: string
                    tenant_id: string
                    name: string
                    phone: string
                    address: string | null
                    current_balance: number
                    created_at: string
                    [key: string]: any
                }
                Insert: { [key: string]: any }
                Update: { [key: string]: any }
            }
            trips: {
                Row: {
                    id: string
                    tenant_id: string
                    created_at: string
                    [key: string]: any
                }
                Insert: { [key: string]: any }
                Update: { [key: string]: any }
            }
            employee_wallets: {
                Row: {
                    id: string
                    tenant_id: string
                    created_at: string
                    [key: string]: any
                }
                Insert: { [key: string]: any }
                Update: { [key: string]: any }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            user_role: "super_admin" | "admin" | "shop_manager" | "driver" | "staff" | "recovery_agent"
        }
    }
}
