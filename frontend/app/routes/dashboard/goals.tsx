import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { Spinner } from "~/components/ui/spinner"
import { Button } from "~/components/ui/button"
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

type Goal = {
  id: number,
  title: string,
  target_amount: string,
  target_date: string,
  status: "active" | "completed",
}

type FormValues = z.infer<typeof formSchema>

const formSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters.")
    .max(64, "Title must be at most 64 characters."),

  target_amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((value) => Number(value) > 0, {
      message: "Amount must be greater than 0.",
    }),

  target_date: z.date(),
})

function formatDateForDisplay(date: Date) {
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [createDialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const createForm = useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        title: "",
        target_amount: "",
        target_date: new Date(),
      },
    })
  
  async function fetchTransactions() {
    const response = await fetch("http://127.0.0.1:8000/api/goals/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch transactions")
    }

    const data: Goal[] = await response.json()
    setGoals(data)
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
        >
          <FieldGroup>
            <Controller
              name="title"
              control={createForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="create-goal-title">
                    Title
                  </FieldLabel>

                  <Input
                    {...field}
                    id="create-goal-title"
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
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>

          <Button type="submit" form="create-goal-form">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )


  return (
    <section className="w-full space-y-6">
      <div className="flex justify-start">{createGoalDialog}</div>
      {goals.length === 0 ? (
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
            ) : ( <div></div> )}
    </section>
  );
}