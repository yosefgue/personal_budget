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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"
import {
  IconCalendar,
  IconTargetArrow,
} from "@tabler/icons-react"
import { Input } from "~/components/ui/input"
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
  target_date: string
  status: "active" | "completed"
  current_amount?: string
}

const formSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters.")
    .max(64, "Name must be at most 64 characters."),

  target_amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((value) => Number(value) > 0, {
      message: "Amount must be greater than 0.",
    }),

  target_date: z.date(),
})

type FormValues = z.infer<typeof formSchema>

function formatDateForDisplay(date: Date) {
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

function formatDateForApi(date: Date) {
  return date.toISOString().split("T")[0]
}

function getGoalProgress(goal: Goal) {
  const currentAmount = Number(goal.current_amount ?? 0)
  const targetAmount = Number(goal.target_amount)

  if (!targetAmount || targetAmount <= 0) {
    return 0
  }

  return Math.min((currentAmount / targetAmount) * 100, 100)
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [createDialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const createForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      target_amount: "",
      target_date: new Date(),
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
      throw new Error("Failed to fetch goals")
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
          target_date: formatDateForApi(values.target_date),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error("Create goal error:", response.status, errorData)
        throw new Error("Failed to create goal")
      }

      const createdGoal: Goal = await response.json()

      setGoals((prev) => [createdGoal, ...prev])
      createForm.reset()
      setDialogOpen(false)
      toast.success("Goal created successfully.")
    } catch (error) {
      console.error(error)
      toast.error("Could not create goal.")
    } finally {
      setCreating(false)
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
        setError("Could not load goals.")
      } finally {
        setLoading(false)
      }
    }

    loadGoals()
  }, [])

  const createGoalDialog = (
    <Dialog open={createDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>Add goal</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add goal</DialogTitle>
          <DialogDescription>
            Add a name, target amount and target date for this goal.
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
                    Name
                  </FieldLabel>

                  <Input
                    {...field}
                    id="create-goal-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="car"
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
                    Target amount (DH)
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

            <Controller
              name="target_date"
              control={createForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Goal target date</FieldLabel>

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
            <Button type="button" variant="outline" disabled={creating}>
              Cancel
            </Button>
          </DialogClose>

          <Button type="submit" form="create-goal-form" disabled={creating}>
            {creating ? <Spinner /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return (
    <section className="w-full space-y-6">
      <div className="flex justify-start">{createGoalDialog}</div>

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

            <EmptyTitle>No goals yet</EmptyTitle>

            <EmptyDescription>
              Once you add a goal, it will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => {
            const progress = getGoalProgress(goal)
            const currentAmount = Number(goal.current_amount ?? 0)

            return (
              <Card key={goal.id} className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span className="truncate">{goal.name}</span>

                    <Badge>
                      {goal.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Progress
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
                        Current
                      </p>

                      <p className="font-semibold">
                        {currentAmount} DH
                      </p>
                    </div>

                    <div className="rounded-xl border p-3">
                      <p className="text-xs text-muted-foreground">
                        Target
                      </p>

                      <p className="font-semibold">
                        {goal.target_amount} DH
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Target date: {goal.target_date}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}