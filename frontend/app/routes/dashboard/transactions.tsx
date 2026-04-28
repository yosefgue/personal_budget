import * as React from "react"
import { useEffect, useState } from "react"
import {
  IconCalendar,
  IconEdit,
  IconReceipt,
  IconTrash,
} from "@tabler/icons-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Spinner } from "~/components/ui/spinner"
import { Button } from "~/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { Calendar } from "~/components/ui/calendar"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"

type Transaction = {
  id: number
  wallet_name: string
  title: string
  amount: string
  transaction_date: string
}

type Category = {
  id: number
  name: string
  type: "income" | "expense"
}

const categories: Category[] = [
  { id: 1, name: "Salary", type: "income" },
  { id: 2, name: "Freelance", type: "income" },
  { id: 3, name: "Investments", type: "income" },
  { id: 4, name: "Business", type: "income" },
  { id: 5, name: "Other Income", type: "income" },

  { id: 6, name: "Food", type: "expense" },
  { id: 7, name: "Rent", type: "expense" },
  { id: 8, name: "Utilities", type: "expense" },
  { id: 9, name: "Transport", type: "expense" },
  { id: 10, name: "Healthcare", type: "expense" },
  { id: 11, name: "Travel", type: "expense" },
  { id: 12, name: "Other Expense", type: "expense" },
]

const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "wallet_name",
    header: "Wallet",
  },
  {
    accessorKey: "transaction_date",
    header: "Date",
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = row.getValue("amount") as string

      return <div className="text-right font-medium">{amount} dh</div>
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const transaction = row.original

      return (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              console.log("Edit transaction", transaction.id)
            }}
          >
            <IconEdit className="h-4 w-4" />
            <span className="sr-only">Edit transaction</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              console.log("Delete transaction", transaction.id)
            }}
          >
            <IconTrash className="h-4 w-4" />
            <span className="sr-only">Delete transaction</span>
          </Button>
        </div>
      )
    },
  },
]

const formSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters.")
    .max(64, "Title must be at most 64 characters."),

  amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((value) => Number(value) > 0, {
      message: "Amount must be greater than 0.",
    }),

  category: z.string().min(1, "Category is required."),

  transaction_date: z.date(),
})

type FormValues = z.infer<typeof formSchema>

function formatDateForDjango(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatDateForDisplay(date: Date) {
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: "",
      category: "",
      transaction_date: new Date(),
    },
  })

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  async function fetchTransactions() {
    const response = await fetch("http://127.0.0.1:8000/api/transactions/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch transactions")
    }

    const data: Transaction[] = await response.json()
    setTransactions(data)
  }

  useEffect(() => {
    async function loadTransactions() {
      try {
        await fetchTransactions()
      } catch (error) {
        console.error(error)
        setError("Could not load transactions.")
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [])

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        title: data.title,
        amount: data.amount,
        category: Number(data.category),
        transaction_date: formatDateForDjango(data.transaction_date),
      }

      const response = await fetch(
        "http://127.0.0.1:8000/api/transactions/create/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error(errorData)
        throw new Error("Failed to create transaction")
      }

      await fetchTransactions()

      toast.success("Transaction created successfully.")

      form.reset({
        title: "",
        amount: "",
        category: "",
        transaction_date: new Date(),
      })

      setDialogOpen(false)
    } catch (error) {
      console.error(error)
      toast.error("Could not create transaction.")
    }
  }

  const transactionDialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>Add transaction</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
          <DialogDescription>
            Add a title, amount, category, and date for this transaction.
          </DialogDescription>
        </DialogHeader>

        <form
          id="transaction-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FieldGroup>
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="transaction-title">Title</FieldLabel>

                  <Input
                    {...field}
                    id="transaction-title"
                    aria-invalid={fieldState.invalid}
                    placeholder="Groceries"
                    autoComplete="off"
                  />

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="amount"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="transaction-amount">Amount</FieldLabel>

                  <Input
                    {...field}
                    id="transaction-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    aria-invalid={fieldState.invalid}
                    placeholder="120.00"
                    autoComplete="off"
                  />

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="category"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Category</FieldLabel>

                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>

                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={String(category.id)}
                        >
                          {category.name} · {category.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="transaction_date"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Transaction date</FieldLabel>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        aria-invalid={fieldState.invalid}
                        className="w-full justify-start !bg-white text-left font-normal !text-black hover:!bg-gray-100 hover:!text-black"
                      >
                        <IconCalendar className="mr-2 h-4 w-4" />

                        {field.value
                          ? formatDateForDisplay(field.value)
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent
                      align="start"
                      className="w-auto !bg-white p-0 !text-black"
                    >
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date)
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>

          <Button type="submit" form="transaction-form">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (loading) {
    return <Spinner />
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex justify-start">{transactionDialog}</div>

      {transactions.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconReceipt className="h-6 w-6" />
            </EmptyMedia>

            <EmptyTitle>No transactions yet</EmptyTitle>

            <EmptyDescription>
              Once you add income or expenses, they will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}