import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Spinner } from "~/components/ui/spinner"
import {
  transactionFormSchema,
  type TransactionFormValues,
} from "~/components/transaction-form"
import { TransactionCreateDialog } from "~/components/transaction-create-dialog"
import { TransactionEditDialog } from "~/components/transaction-edit-dialog"
import { TransactionTable } from "~/components/transaction-table"
import {
  type Category,
  type Transaction,
} from "~/components/transaction-types"

const incomeCategories = [
  "Salaire",
  "Freelance",
  "Entreprise",
  "Cadeau",
  "Investissement",
  "Autre",
]

const expenseCategories = [
  "Alimentation",
  "Transport",
  "Loyer",
  "Factures",
  "Achats",
  "Sante",
  "Education",
  "Loisirs",
  "Voyage",
  "Abonnements",
  "Epargne",
  "Autre",
]

const categories: Category[] = [
  ...incomeCategories.map((name, index) => ({
    id: index + 1,
    name,
    type: "income" as const,
  })),
  ...expenseCategories.map((name, index) => ({
    id: incomeCategories.length + index + 1,
    name,
    type: "expense" as const,
  })),
]

function formatDateForDjango(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatDateForDisplay(date: Date) {
  return date.toLocaleDateString("fr-FR", {
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

  return ""
}

function isTransferType(
  transactionType: Transaction["type"]
): transactionType is "transfer_in" | "transfer_out" {
  return transactionType === "transfer_in" || transactionType === "transfer_out"
}

function getTransactionTypeLabel(transactionType: Transaction["type"]) {
  switch (transactionType) {
    case "income":
      return "Revenu"
    case "expense":
      return "Depense"
    case "transfer_in":
      return "Virement entrant"
    case "transfer_out":
      return "Virement sortant"
    default:
      return "Inconnu"
  }
}

function getAmountPresentation(transaction: Transaction) {
  switch (transaction.type) {
    case "income":
      return { sign: "+", className: "text-right font-medium text-green-600" }
    case "expense":
      return { sign: "-", className: "text-right font-medium text-red-600" }
    case "transfer_in":
      return { sign: "+", className: "text-right font-medium text-blue-600" }
    case "transfer_out":
      return { sign: "-", className: "text-right font-medium text-amber-600" }
    default:
      return { sign: "", className: "text-right font-medium" }
  }
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null)

  const createForm = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      title: "",
      amount: "",
      type: "expense",
      category: "",
      description: "",
      is_recurring: false,
      transaction_date: new Date(),
    },
  })

  const editForm = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      title: "",
      amount: "",
      type: "expense",
      category: "",
      description: "",
      is_recurring: false,
      transaction_date: new Date(),
    },
  })

  const createType = createForm.watch("type")
  const createCategoryType =
    createType === "income" || createType === "expense"
      ? createType
      : null
  const editType = editForm.watch("type")

  function openEditDialog(transaction: Transaction) {
    setSelectedTransaction(transaction)
    const transactionType = transaction.type

    editForm.reset({
      title: transaction.title,
      amount: transaction.amount,
      type: transactionType,
      category: isTransferType(transactionType)
        ? ""
        : getTransactionCategoryId(transaction),
      description: transaction.description ?? "",
      is_recurring: transaction.is_recurring ?? false,
      transaction_date: parseDjangoDate(transaction.transaction_date),
    })

    setEditDialogOpen(true)
  }

  async function fetchTransactions() {
    const response = await fetch("http://127.0.0.1:8000/api/transactions/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
    })

    if (!response.ok) {
      throw new Error("Echec du chargement des transactions")
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
        setError("Impossible de charger les transactions.")
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [])

  async function onCreateSubmit(data: TransactionFormValues) {
    try {
      const shouldUseCategory =
        data.type === "income" || data.type === "expense"

      const payload = {
        title: data.title,
        amount: data.amount,
        type: data.type,
        category: shouldUseCategory ? Number(data.category) : null,
        description: data.description ?? "",
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
        throw new Error("Echec de la creation de la transaction")
      }

      await fetchTransactions()

      toast.success("Transaction creee avec succes.")

      createForm.reset({
        title: "",
        amount: "",
        type: "expense",
        category: "",
        description: "",
        is_recurring: false,
        transaction_date: new Date(),
      })

      setCreateDialogOpen(false)
    } catch (error) {
      console.error(error)
      toast.error("Impossible de creer la transaction.")
    }
  }

  async function onEditSubmit(data: TransactionFormValues) {
    if (!selectedTransaction) {
      return
    }

    try {
      const shouldUseCategory =
        data.type === "income" || data.type === "expense"

      const payload = {
        title: data.title,
        amount: data.amount,
        type: data.type,
        category: shouldUseCategory ? Number(data.category) : null,
        description: data.description ?? "",
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
        throw new Error("Echec de la mise a jour de la transaction")
      }

      await fetchTransactions()

      toast.success("Transaction mise a jour avec succes.")

      setEditDialogOpen(false)
      setSelectedTransaction(null)
    } catch (error) {
      console.error(error)
      toast.error("Impossible de mettre a jour la transaction.")
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
        throw new Error("Echec de la suppression de la transaction")
      }

      await fetchTransactions()

      toast.success("Transaction supprimee avec succes.")

      setEditDialogOpen(false)
      setSelectedTransaction(null)
    } catch (error) {
      console.error(error)
      toast.error("Impossible de supprimer la transaction.")
    }
  }

  if (loading) {
    return <Spinner />
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  return (
    <section className="w-full space-y-6">
      <div className="flex justify-start">
        <TransactionCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          form={createForm}
          categories={categories}
          categoryType={createCategoryType}
          onSubmit={onCreateSubmit}
          formatDateForDisplay={formatDateForDisplay}
        />
      </div>

      <TransactionEditDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)

          if (!open) {
            setSelectedTransaction(null)
          }
        }}
        form={editForm}
        categories={categories}
        transactionType={editType}
        isTransfer={isTransferType(editType)}
        onSubmit={onEditSubmit}
        onDelete={deleteTransaction}
        formatDateForDisplay={formatDateForDisplay}
      />

      <TransactionTable
        transactions={transactions}
        onRowClick={openEditDialog}
        formatDateForDisplay={formatDateForDisplay}
        parseDjangoDate={parseDjangoDate}
        getAmountPresentation={getAmountPresentation}
        getTransactionTypeLabel={getTransactionTypeLabel}
      />
    </section>
  )
}