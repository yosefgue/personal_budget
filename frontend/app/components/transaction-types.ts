export type TransactionType =
  | "income"
  | "expense"
  | "transfer_in"
  | "transfer_out"

export type Transaction = {
  id: number
  title: string
  amount: string
  type: TransactionType
  description?: string
  transaction_date: string
  is_recurring: boolean
  transfer_group?: string | null
  wallet_name?: string
  category?: number | null
  category_name?: string | null
}

export type Category = {
  id: number
  name: string
  type: "income" | "expense"
}
