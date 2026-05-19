import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { Spinner } from "~/components/ui/spinner"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"
import {
  IconTargetArrow,
  IconTrash,
} from "@tabler/icons-react"
import { Input } from "~/components/ui/input"
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Progress } from "~/components/ui/progress"

type Goal = {
  id: number
  name: string
  target_amount: string
  status: "active" | "completed"
  current_amount?: string
}

type GoalSuggestion = {
  goal_id: number
  suggested_amount: string | number
  estimated_months: number | null
}

const formSchema = z.object({
  name: z
    .string()
    .min(3, "Le nom doit contenir au moins 3 caracteres.")
    .max(64, "Le nom doit contenir au maximum 64 caracteres."),

  target_amount: z
    .string()
    .min(1, "Le montant est requis.")
    .refine((value) => Number(value) > 0, {
      message: "Le montant doit etre superieur a 0.",
    }),

})

const transferSchema = z.object({
  amount: z
    .string()
    .min(1, "Le montant est requis.")
    .refine((value) => Number(value) > 0, {
      message: "Le montant doit etre superieur a 0.",
    }),
})

type FormValues = z.infer<typeof formSchema>
type TransferValues = z.infer<typeof transferSchema>

function getGoalProgress(goal: Goal) {
  const currentAmount = Number(goal.current_amount ?? 0)
  const targetAmount = Number(goal.target_amount)

  if (!targetAmount || targetAmount <= 0) {
    return 0
  }

  return Math.min((currentAmount / targetAmount) * 100, 100)
}

  function getGoalStatusLabel(status: Goal["status"]) {
    switch (status) {
      case "completed":
        return "Termine"
      case "active":
      default:
        return "Actif"
    }
  }

function formatMonthYear(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" })
}

function getTargetDate(estimatedMonths: number | null) {
  if (!estimatedMonths || estimatedMonths <= 0) {
    return null
  }

  const date = new Date()
  date.setMonth(date.getMonth() + estimatedMonths)
  return date
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [suggestions, setSuggestions] = useState<Record<number, GoalSuggestion>>({})
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [createDialogOpen, setDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  const createForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      target_amount: "",
    },
  })

  const transferForm = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      amount: "",
    },
  })

  async function fetchGoals() {
    const token = localStorage.getItem("access")

    const response = await fetch("http://127.0.0.1:8000/api/goals/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("Fetch goals error:", response.status, errorData)
      throw new Error("Echec du chargement des objectifs")
    }

    const data = await response.json()

    if (Array.isArray(data)) {
      setGoals(data)
    } else {
      setGoals(data.results ?? [])
    }
  }

  async function createGoal(values: FormValues) {
    try {
      setCreating(true)

      const token = localStorage.getItem("access")

      const response = await fetch("http://127.0.0.1:8000/api/goals/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: values.name,
          target_amount: values.target_amount,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error("Create goal error:", response.status, errorData)
        throw new Error("Echec de la creation de l'objectif")
      }

      const createdGoal: Goal = await response.json()

      setGoals((prev) => [createdGoal, ...prev])
      createForm.reset()
      setDialogOpen(false)
      toast.success("Objectif cree avec succes.")
    } catch (error) {
      console.error(error)
      toast.error("Impossible de creer l'objectif.")
    } finally {
      setCreating(false)
    }
  }

  async function transferToGoal(values: TransferValues) {
    if (!selectedGoal) {
      return
    }

    try {
      setTransferring(true)

      const token = localStorage.getItem("access")

      const response = await fetch(
        `http://127.0.0.1:8000/api/goals/${selectedGoal.id}/transfer/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: values.amount,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error("Transfer goal error:", response.status, errorData)
        throw new Error("Echec du transfert vers l'objectif")
      }

      await fetchGoals()
      transferForm.reset()
      setTransferDialogOpen(false)
      setSelectedGoal(null)
      toast.success("Transfert d'epargne termine.")
    } catch (error) {
      console.error(error)
      toast.error("Impossible de transferer l'epargne.")
    } finally {
      setTransferring(false)
    }
  }

  async function deleteGoal() {
    if (!goalToDelete) {
      return
    }

    try {
      setDeleting(true)

      const token = localStorage.getItem("access")

      const response = await fetch(
        `http://127.0.0.1:8000/api/goals/${goalToDelete.id}/`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error("Delete goal error:", response.status, errorData)
        throw new Error("Echec de la suppression de l'objectif")
      }

      setGoals((prev) => prev.filter((goal) => goal.id !== goalToDelete.id))
      setDeleteDialogOpen(false)
      setGoalToDelete(null)
      toast.success("Objectif supprime avec succes.")
    } catch (error) {
      console.error(error)
      toast.error("Impossible de supprimer l'objectif.")
    } finally {
      setDeleting(false)
    }
  }

  async function fetchSuggestions() {
    try {
      setLoadingSuggestions(true)

      const token = localStorage.getItem("access")

      const response = await fetch("http://127.0.0.1:8000/api/goals/suggestions/", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error("Fetch suggestions error:", response.status, errorData)
        throw new Error("Echec du chargement des suggestions")
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        toast.info("Pas assez de revenus pour generer des suggestions.")
        setSuggestions({})
        return
      }

      const next: Record<number, GoalSuggestion> = {}

      for (const item of data) {
        if (item?.goal_id) {
          next[item.goal_id] = item
        }
      }

      setSuggestions(next)
    } catch (error) {
      console.error(error)
      toast.error("Impossible de generer des suggestions.")
    } finally {
      setLoadingSuggestions(false)
    }
  }

  useEffect(() => {
    async function loadGoals() {
      try {
        setLoading(true)
        setError("")
        await fetchGoals()
      } catch (error) {
        console.error(error)
        setError("Impossible de charger les objectifs.")
      } finally {
        setLoading(false)
      }
    }

    loadGoals()
  }, [])

  const createGoalDialog = (
    <Dialog open={createDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>Ajouter un objectif</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un objectif</DialogTitle>
          <DialogDescription>
            Ajoutez un nom et un montant cible pour cet objectif.
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-goal-form"
          className="space-y-4"
          onSubmit={createForm.handleSubmit(createGoal)}
        >
          <FieldGroup>
            <Controller
              name="name"
              control={createForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="create-goal-name">
                    Nom
                  </FieldLabel>

                  <Input
                    {...field}
                    id="create-goal-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="voiture"
                    autoComplete="off"
                  />

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="target_amount"
              control={createForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="create-goal-amount">
                    Montant cible (DH)
                  </FieldLabel>

                  <Input
                    {...field}
                    id="create-goal-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    aria-invalid={fieldState.invalid}
                    placeholder="10000.00"
                    autoComplete="off"
                  />

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
            <Button type="button" variant="outline" disabled={creating}>
              Annuler
            </Button>
          </DialogClose>

          <Button type="submit" form="create-goal-form" disabled={creating}>
            {creating ? <Spinner /> : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const transferGoalDialog = (
    <Dialog
      open={transferDialogOpen}
      onOpenChange={(open) => {
        setTransferDialogOpen(open)

        if (!open) {
          transferForm.reset()
          setSelectedGoal(null)
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter de l'epargne</DialogTitle>
          <DialogDescription>
            Transferez de l'argent depuis votre portefeuille principal.
          </DialogDescription>
        </DialogHeader>

        <form
          id="transfer-goal-form"
          className="space-y-4"
          onSubmit={transferForm.handleSubmit(transferToGoal)}
        >
          <FieldGroup>
            <Controller
              name="amount"
              control={transferForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="transfer-goal-amount">
                    Montant (DH)
                  </FieldLabel>

                  <Input
                    {...field}
                    id="transfer-goal-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    aria-invalid={fieldState.invalid}
                    placeholder="250.00"
                    autoComplete="off"
                  />

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
            <Button type="button" variant="outline" disabled={transferring}>
              Annuler
            </Button>
          </DialogClose>

          <Button type="submit" form="transfer-goal-form" disabled={transferring}>
            {transferring ? <Spinner /> : "Transferer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const deleteGoalDialog = (
    <Dialog
      open={deleteDialogOpen}
      onOpenChange={(open) => {
        setDeleteDialogOpen(open)

        if (!open) {
          setGoalToDelete(null)
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer l'objectif ?</DialogTitle>
          <DialogDescription>
            Cela supprimera l'objectif et les fonds associes.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={deleting}>
              Annuler
            </Button>
          </DialogClose>

          <Button type="button" variant="destructive" disabled={deleting} onClick={deleteGoal}>
            {deleting ? <Spinner /> : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <section className="w-full space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {createGoalDialog}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchSuggestions}
          disabled={loadingSuggestions}
        >
          {loadingSuggestions ? <Spinner /> : "Generer des suggestions"}
        </Button>
      </div>

      {transferGoalDialog}
      {deleteGoalDialog}

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : goals.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconTargetArrow className="h-6 w-6" />
            </EmptyMedia>

            <EmptyTitle>Aucun objectif pour le moment</EmptyTitle>

            <EmptyDescription>
              Une fois ajoute, l'objectif apparaitra ici.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => {
            const progress = getGoalProgress(goal)
            const currentAmount = Number(goal.current_amount ?? 0)
            const suggestion = suggestions[goal.id]
            const targetDate = getTargetDate(suggestion?.estimated_months ?? null)

            return (
              <Card key={goal.id} className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span className="truncate">{goal.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          goal.status === "completed"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : undefined
                        }
                      >
                        {getGoalStatusLabel(goal.status)}
                      </Badge>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setGoalToDelete(goal)
                          setDeleteDialogOpen(true)
                        }}
                        aria-label={`Supprimer ${goal.name}`}
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Progression
                      </span>

                      <span className="font-medium">
                        {progress.toFixed(0)}%
                      </span>
                    </div>

                    <Progress value={progress} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border p-3">
                      <p className="text-xs text-muted-foreground">
                        Actuel
                      </p>

                      <p className="font-semibold">
                        {currentAmount} DH
                      </p>
                    </div>

                    <div className="rounded-xl border p-3">
                      <p className="text-xs text-muted-foreground">
                        Cible
                      </p>

                      <p className="font-semibold">
                        {goal.target_amount} DH
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedGoal(goal)
                      setTransferDialogOpen(true)
                    }}
                  >
                    Ajouter de l'epargne
                  </Button>

                  <div className="rounded-xl border border-dashed p-3 text-sm">
                    <span className="text-muted-foreground">Suggestion</span>

                    {suggestion?.suggested_amount ? (
                      <div className="mt-2 space-y-1">
                        <p className="font-medium">
                          {Number(suggestion.suggested_amount).toFixed(2)} DH / mois
                          {suggestion.estimated_months ? ` pendant ${suggestion.estimated_months} mois` : ""}
                        </p>
                        {targetDate ? (
                          <p className="text-xs text-muted-foreground">
                            Date cible : {formatMonthYear(targetDate)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Date cible indisponible
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Aucune suggestion pour le moment.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}