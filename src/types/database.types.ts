export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cash_book_entries: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          reference_id: string | null
          tenant_id: string
          transaction_type: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          tenant_id: string
          transaction_type?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          tenant_id?: string
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_book_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "view_admin_approvals"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "cash_book_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_ledgers: {
        Row: {
          amount: number
          balance_after: number | null
          category: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          tenant_id: string
          transaction_type: string | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          tenant_id: string
          transaction_type?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          tenant_id?: string
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_ledgers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "view_admin_approvals"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "customer_ledgers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_ledgers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_ledgers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          credit_limit: number | null
          current_balance: number | null
          custom_rate: number | null
          gps_lat: number | null
          gps_long: number | null
          id: string
          is_active: boolean | null
          last_order_at: string | null
          name: string
          opening_balance: number | null
          phone: string | null
          tenant_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          custom_rate?: number | null
          gps_lat?: number | null
          gps_long?: number | null
          id?: string
          is_active?: boolean | null
          last_order_at?: string | null
          name: string
          opening_balance?: number | null
          phone?: string | null
          tenant_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          custom_rate?: number | null
          gps_lat?: number | null
          gps_long?: number | null
          id?: string
          is_active?: boolean | null
          last_order_at?: string | null
          name?: string
          opening_balance?: number | null
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinder_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          cylinder_id: string
          id: string
          order_id: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          cylinder_id: string
          id?: string
          order_id?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          cylinder_id?: string
          id?: string
          order_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_logs_cylinder_id_fkey"
            columns: ["cylinder_id"]
            isOneToOne: false
            referencedRelation: "cylinders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinders: {
        Row: {
          condition: string | null
          created_at: string
          current_holder_id: string | null
          current_location_type: string | null
          id: string
          last_order_id: string | null
          qr_code_data: string | null
          serial_number: string
          status: string
          tenant_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          condition?: string | null
          created_at?: string
          current_holder_id?: string | null
          current_location_type?: string | null
          id?: string
          last_order_id?: string | null
          qr_code_data?: string | null
          serial_number: string
          status?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          condition?: string | null
          created_at?: string
          current_holder_id?: string | null
          current_location_type?: string | null
          id?: string
          last_order_id?: string | null
          qr_code_data?: string | null
          serial_number?: string
          status?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cylinders_last_order_id_fkey"
            columns: ["last_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_rates: {
        Row: {
          current_rate: number
          id: string
          product_name: string
          updated_at: string | null
        }
        Insert: {
          current_rate: number
          id?: string
          product_name: string
          updated_at?: string | null
        }
        Update: {
          current_rate?: number
          id?: string
          product_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employee_wallets: {
        Row: {
          balance: number | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_wallets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          cash_book_entry_id: string | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          payment_method: string | null
          proof_url: string | null
          status: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          cash_book_entry_id?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          proof_url?: string | null
          status?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          cash_book_entry_id?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          proof_url?: string | null
          status?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "view_admin_approvals"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "expenses_cash_book_entry_id_fkey"
            columns: ["cash_book_entry_id"]
            isOneToOne: false
            referencedRelation: "cash_book_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_logs: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          proof_url: string | null
          receiver_id: string | null
          sender_id: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          proof_url?: string | null
          receiver_id?: string | null
          sender_id?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          proof_url?: string | null
          receiver_id?: string | null
          sender_id?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handover_logs_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "view_admin_approvals"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "handover_logs_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "view_admin_approvals"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "handover_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          count_empty: number | null
          count_full: number | null
          location_id: string
          product_id: string
        }
        Insert: {
          count_empty?: number | null
          count_full?: number | null
          location_id: string
          product_id: string
        }
        Update: {
          count_empty?: number | null
          count_full?: number | null
          location_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          price: number
          product_name: string
          quantity: number
        }
        Insert: {
          id?: string
          order_id: string
          price: number
          product_name: string
          quantity: number
        }
        Update: {
          id?: string
          order_id?: string
          price?: number
          product_name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_received: number | null
          created_at: string
          created_by: string | null
          customer_id: string
          cylinders_count: number | null
          driver_id: string | null
          friendly_id: number
          id: string
          notes: string | null
          payment_method: string | null
          proof_url: string | null
          status: string | null
          tenant_id: string | null
          total_amount: number
          trip_completed_at: string | null
          trip_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          amount_received?: number | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          cylinders_count?: number | null
          driver_id?: string | null
          friendly_id?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          proof_url?: string | null
          status?: string | null
          tenant_id?: string | null
          total_amount?: number
          trip_completed_at?: string | null
          trip_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_received?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          cylinders_count?: number | null
          driver_id?: string | null
          friendly_id?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          proof_url?: string | null
          status?: string | null
          tenant_id?: string | null
          total_amount?: number
          trip_completed_at?: string | null
          trip_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "view_admin_approvals"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          company_address: string | null
          company_name: string | null
          company_phone: string | null
          created_at: string | null
          default_gas_rate: number | null
          default_unit_cost: number | null
          id: string
          invoice_footer: string | null
          low_stock_threshold: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          company_address?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          default_gas_rate?: number | null
          default_unit_cost?: number | null
          id?: string
          invoice_footer?: string | null
          low_stock_threshold?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          company_address?: string | null
          company_name?: string | null
          company_phone?: string | null
          created_at?: string | null
          default_gas_rate?: number | null
          default_unit_cost?: number | null
          id?: string
          invoice_footer?: string | null
          low_stock_threshold?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          type: Database["public"]["Enums"]["product_type"]
        }
        Insert: {
          id?: string
          name: string
          type: Database["public"]["Enums"]["product_type"]
        }
        Update: {
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["product_type"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          availability_status: string | null
          current_load: number | null
          full_name: string | null
          id: string
          is_online: boolean | null
          phone_number: string | null
          role: string | null
          tenant_id: string | null
          updated_at: string | null
          vehicle_capacity: number | null
          vehicle_number: string | null
        }
        Insert: {
          availability_status?: string | null
          current_load?: number | null
          full_name?: string | null
          id: string
          is_online?: boolean | null
          phone_number?: string | null
          role?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          vehicle_capacity?: number | null
          vehicle_number?: string | null
        }
        Update: {
          availability_status?: string | null
          current_load?: number | null
          full_name?: string | null
          id?: string
          is_online?: boolean | null
          phone_number?: string | null
          role?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          vehicle_capacity?: number | null
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "view_admin_approvals"
            referencedColumns: ["driver_id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          action: string | null
          attempted_tenant_id: string | null
          event_type: string
          id: string
          ip_address: string | null
          target_resource: string | null
          tenant_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          attempted_tenant_id?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          target_resource?: string | null
          tenant_id?: string | null
          timestamp: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          attempted_tenant_id?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          target_resource?: string | null
          tenant_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stock_logs: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          location_id: string | null
          new_count_empty: number | null
          new_count_full: number | null
          old_count_empty: number | null
          old_count_full: number | null
          product_id: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          new_count_empty?: number | null
          new_count_full?: number | null
          old_count_empty?: number | null
          old_count_full?: number | null
          product_id?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          new_count_empty?: number | null
          new_count_full?: number | null
          old_count_empty?: number | null
          old_count_full?: number | null
          product_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          status: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_status: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          status?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          status?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          description: string | null
          gps_lat: number | null
          gps_long: number | null
          id: string
          order_id: string | null
          payment_method: string | null
          proof_url: string | null
          receiver_id: string | null
          status: string | null
          tenant_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          gps_lat?: number | null
          gps_long?: number | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          proof_url?: string | null
          receiver_id?: string | null
          status?: string | null
          tenant_id: string
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          gps_lat?: number | null
          gps_long?: number | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          proof_url?: string | null
          receiver_id?: string | null
          status?: string | null
          tenant_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "view_admin_approvals"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          cylinders_in: Json | null
          cylinders_out: Json | null
          driver_id: string | null
          end_time: string | null
          id: string
          residual_gas_weight: number | null
          returns_verified: boolean | null
          start_time: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          cylinders_in?: Json | null
          cylinders_out?: Json | null
          driver_id?: string | null
          end_time?: string | null
          id?: string
          residual_gas_weight?: number | null
          returns_verified?: boolean | null
          start_time?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          cylinders_in?: Json | null
          cylinders_out?: Json | null
          driver_id?: string | null
          end_time?: string | null
          id?: string
          residual_gas_weight?: number | null
          returns_verified?: boolean | null
          start_time?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      view_admin_approvals: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          driver_email: string | null
          driver_id: string | null
          driver_name: string | null
          status: string | null
          tenant_id: string | null
          transaction_id: string | null
          type: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_cash_handover: {
        Args: { p_admin_id: string; p_handover_id: string }
        Returns: Json
      }
      approve_driver_handover: {
        Args: { p_admin_user_id: string; p_transaction_id: string }
        Returns: Json
      }
      approve_expense: {
        Args: { p_admin_id: string; p_expense_id: string }
        Returns: Json
      }
      bulk_assign_orders:
        | {
            Args: {
              p_driver_id: string
              p_order_ids: string[]
              p_tenant_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_driver_id: string
              p_order_ids: string[]
              p_tenant_id: string
              p_user_id: string
            }
            Returns: Json
          }
      cancel_order_transaction: {
        Args: { p_admin_id: string; p_order_id: string; p_reason: string }
        Returns: Json
      }
      complete_order_transaction: {
        Args: {
          p_driver_id: string
          p_notes: string
          p_order_id: string
          p_payment_method: string
          p_proof_url: string
          p_received_amount: number
          p_returned_empty_count: number
          p_returned_serials: Json
          p_tenant_id: string
        }
        Returns: Json
      }
      create_order_with_ledger: {
        Args: {
          p_created_by: string
          p_customer_id: string
          p_debit_amount: number
          p_driver_id: string
          p_order_data: Json
          p_tenant_id: string
        }
        Returns: string
      }
      execute_handover_approval: {
        Args: { p_admin_id: string; p_handover_id: string }
        Returns: undefined
      }
      get_auth_tenant_id: { Args: never; Returns: string }
      get_my_tenant_id: { Args: never; Returns: string }
      get_trip_cylinders: {
        Args: { p_trip_id: string }
        Returns: {
          current_status: string
          cylinder_id: string
          serial_number: string
          size: string
        }[]
      }
      get_trip_return_metrics: {
        Args: never
        Returns: {
          completed_orders_count: number
          driver_id: string
          driver_name: string
          end_time: string
          expected_empty_returns: number
          start_time: string
          trip_id: string
        }[]
      }
      process_customer_payment: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_customer_id: string
          p_description: string
          p_payment_method: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      process_trip_returns: {
        Args: { p_returned_items: Json; p_trip_id: string }
        Returns: Json
      }
      record_expense_transaction: {
        Args: {
          p_amount: number
          p_category: string
          p_description: string
          p_tenant_id: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      reject_expense: {
        Args: { p_admin_id: string; p_expense_id: string }
        Returns: Json
      }
      submit_driver_handover:
        | {
            Args: { p_cylinder_serial_numbers: string[]; p_driver_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_cash_amount: number
              p_cylinder_ids: string[]
              p_driver_id: string
              p_receiver_id: string
            }
            Returns: Json
          }
      test_create_path: { Args: never; Returns: number }
    }
    Enums: {
      expense_category:
        | "fuel"
        | "vehicle_maint"
        | "staff_food"
        | "owner_drawings"
        | "salary_advance"
      product_type: "commercial_45kg" | "domestic_11kg"
      transaction_type: "sale" | "recovery"
      user_role: "admin" | "driver" | "recovery" | "shop_manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      expense_category: [
        "fuel",
        "vehicle_maint",
        "staff_food",
        "owner_drawings",
        "salary_advance",
      ],
      product_type: ["commercial_45kg", "domestic_11kg"],
      transaction_type: ["sale", "recovery"],
      user_role: ["admin", "driver", "recovery", "shop_manager"],
    },
  },
} as const
