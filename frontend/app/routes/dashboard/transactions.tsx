import * as React from "react"
import { useEffect, useState } from "react"
import {
  IconCalendar,
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
import { Switch } from "~/components/ui/switch"
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
  title: string
  amount: string
  transaction_date: string
  is_recurring: boolean
  category?: number | {
    id?: number
    type?: "income" | "expense"
  }
  category_type?: "income" | "expense"
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

  is_recurring: z.boolean(),

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

function parseDjangoDate(date: string) {
  return new Date(`${date}T00:00:00`)
}

function getTransactionCategoryId(transaction: Transaction) {
  if (typeof transaction.category === "number") {
    return String(transaction.category)
  }

  if (typeof transaction.category === "object" && transaction.category?.id) {
    return String(transaction.category.id)
  }

  return ""
}

function isIncomeTransaction(transaction: Transaction) {
  if (transaction.category_type) {
    return transaction.category_type.toLowerCase() === "income"
  }

  if (typeof transaction.category === "object" && transaction.category?.type) {
    return transaction.category.type.toLowerCase() === "income"
  }

  const categoryId = getTransactionCategoryId(transaction)
  const category = categories.find((item) => String(item.id) === categoryId)

  return category?.type === "income"
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null)

  const createForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: "",
      category: "",
      is_recurring: false,
      transaction_date: new Date(),
    },
  })

  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: "",
      category: "",
      is_recurring: false,
      transaction_date: new Date(),
    },
  })

  function openEditDialog(transaction: Transaction) {
    setSelectedTransaction(transaction)

    editForm.reset({
      title: transaction.title,
      amount: transaction.amount,
      category: getTransactionCategoryId(transaction),
      is_recurring: transaction.is_recurring ?? false,
      transaction_date: parseDjangoDate(transaction.transaction_date),
    })

    setEditDialogOpen(true)
  }

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "title",
      header: "Title",
    },
    {
      accessorKey: "transaction_date",
      header: "Date",
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => {
        const amount = Number(row.getValue("amount"))
        const transaction = row.original
        const isIncome = isIncomeTransaction(transaction)

        return (
          <div
            className={
              isIncome
                ? "text-right font-medium text-green-600"
                : "text-right font-medium text-red-600"
            }
          >
            {isIncome ? "+" : "-"}
            {amount.toLocaleString("fr-MA", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            dh
          </div>
        )
      },
    },
  ]

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

  async function onCreateSubmit(data: FormValues) {
    try {
      const payload = {
        title: data.title,
        amount: data.amount,
        category: Number(data.category),
        is_recurring: data.is_recurring,
        transaction_date: formatDateForDjango(data.transaction_date),
      }

      const response = await fetch(
        "http://127.0.0.1:8000/api/transactions/",
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

      createForm.reset({
        title: "",
        amount: "",
        category: "",
        is_recurring: false,
        transaction_date: new Date(),
      })

      setCreateDialogOpen(false)
    } catch (error) {
      console.error(error)
      toast.error("Could not create transaction.")
    }
  }

  async function onEditSubmit(data: FormValues) {
    if (!selectedTransaction) {
      return
    }

    try {
      const payload = {
        title: data.title,
        amount: data.amount,
        category: Number(data.category),
        is_recurring: data.is_recurring,
        transaction_date: formatDateForDjango(data.transaction_date),
      }

      const response = await fetch(
        `http://127.0.0.1:8000/api/transactions/${selectedTransaction.id}/`,
        {
          method: "PUT",
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
        throw new Error("Failed to update transaction")
      }

      await fetchTransactions()

      toast.success("Transaction updated successfully.")

      setEditDialogOpen(false)
      setSelectedTransaction(null)
    } catch (error) {
      console.error(error)
      toast.error("Could not update transaction.")
    }
  }

  async function deleteTransaction() {
    if (!selectedTransaction) {
      return
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/transactions/${selectedTransaction.id}/`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error(errorData)
        throw new Error("Failed to delete transaction")
      }

      await fetchTransactions()

      toast.success("Transaction deleted successfully.")

      setEditDialogOpen(false)
      setSelectedTransaction(null)
    } catch (error) {
      console.error(error)
      toast.error("Could not delete transaction.")
    }
  }

  const createTransactionDialog = (
    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
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
          id="create-transaction-form"
          onSubmit={createForm.handleSubmit(onCreateSubmit)}
          className="space-y-4"
        >
          <FieldGroup>
            <Controller
              name="title"
              control={createForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="create-transaction-title">
                    Title
                  </FieldLabel>

                  <Input
                    {...field}
                    id="create-transaction-title"
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
              control={createForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="create-transaction-amount">
                    Amount
                  </FieldLabel>

                  <Input
                    {...field}
                    id="create-transaction-amount"
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
              control={createForm.control}
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
              name="is_recurring"
              control={createForm.control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldLabel htmlFor="create-transaction-recurring">
                    Recurring monthly
                  </FieldLabel>

                  <Switch
                    id="create-transaction-recurring"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </Field>
              )}
            />

            <Controller
              name="transaction_date"
              control={createForm.control}
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

          <Button type="submit" form="create-transaction-form">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const editTransactionDialog = (
    <Dialog
      open={editDialogOpen}
      onOpenChange={(open) => {
        setEditDialogOpen(open)

        if (!open) {
          setSelectedTransaction(null)
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>
            Modify this transaction or delete it permanently.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-transaction-form"
          onSubmit={editForm.handleSubmit(onEditSubmit)}
          className="space-y-4"
        >
          <FieldGroup>
            <Controller
              name="title"
              control={editForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-transaction-title">
                    Title
                  </FieldLabel>

                  <Input
                    {...field}
                    id="edit-transaction-title"
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
              control={editForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-transaction-amount">
                    Amount
                  </FieldLabel>

                  <Input
                    {...field}
                    id="edit-transaction-amount"
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
              control={editForm.control}
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
              name="is_recurring"
              control={editForm.control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldLabel htmlFor="edit-transaction-recurring">
                    Recurring monthly
                  </FieldLabel>

                  <Switch
                    id="edit-transaction-recurring"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </Field>
              )}
            />

            <Controller
              name="transaction_date"
              control={editForm.control}
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

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={deleteTransaction}
          >
            <IconTrash className="mr-2 h-4 w-4" />
            Delete
          </Button>

          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>

            <Button type="submit" form="edit-transaction-form">
              Save changes
            </Button>
          </div>
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
      <div className="flex justify-start">{createTransactionDialog}</div>

      {editTransactionDialog}

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
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openEditDialog(row.original)}
                >
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