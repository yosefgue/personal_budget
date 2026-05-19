import { Controller, type UseFormReturn } from "react-hook-form"
import { IconCalendar, IconTrash } from "@tabler/icons-react"

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
import { Textarea } from "~/components/ui/textarea"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import {
  type TransactionFormValues,
} from "~/components/transaction-form"
import { type Category } from "~/components/transaction-types"

type TransactionEditDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: UseFormReturn<TransactionFormValues>
  categories: Category[]
  transactionType: "income" | "expense" | "transfer_in" | "transfer_out"
  isTransfer: boolean
  onSubmit: (data: TransactionFormValues) => Promise<void> | void
  onDelete: () => Promise<void> | void
  formatDateForDisplay: (date: Date) => string
}

export function TransactionEditDialog({
  open,
  onOpenChange,
  form,
  categories,
  transactionType,
  isTransfer,
  onSubmit,
  onDelete,
  formatDateForDisplay,
}: TransactionEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la transaction</DialogTitle>
          <DialogDescription>
            Modifiez cette transaction ou supprimez-la definitivement.
          </DialogDescription>
        </DialogHeader>

        <form
          id="edit-transaction-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-transaction-title">
                      Titre
                    </FieldLabel>

                    <Input
                      {...field}
                      id="edit-transaction-title"
                      aria-invalid={fieldState.invalid}
                      placeholder="Courses"
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
                    <FieldLabel htmlFor="edit-transaction-amount">
                      Montant
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

              {!isTransfer && (
                <>
                  <Controller
                    name="type"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Type</FieldLabel>

                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value)
                            form.setValue("category", "")
                          }}
                        >
                          <SelectTrigger aria-invalid={fieldState.invalid}>
                            <SelectValue placeholder="Choisir un type" />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="income">Revenu</SelectItem>
                            <SelectItem value="expense">Depense</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />

                  <Controller
                    name="category"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Categorie</FieldLabel>

                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger aria-invalid={fieldState.invalid}>
                            <SelectValue placeholder="Choisir une categorie" />
                          </SelectTrigger>

                          <SelectContent>
                            {categories
                              .filter((category) => category.type === transactionType)
                              .map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={String(category.id)}
                                >
                                  {category.name}
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
                </>
              )}
            </div>

            {isTransfer ? (
              <div className="rounded-md border border-dashed bg-muted/30 p-4">
                <p className="text-sm font-medium">Transaction de virement</p>
                <p className="text-xs text-muted-foreground">
                  Le type et la categorie sont verrouilles pour les virements.
                </p>
              </div>
            ) : (
              <Controller
                name="is_recurring"
                control={form.control}
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <FieldLabel htmlFor="edit-transaction-recurring">
                      Mensuel recurrent
                    </FieldLabel>

                    <Switch
                      id="edit-transaction-recurring"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </Field>
                )}
              />
            )}

            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-transaction-description">
                    Description
                  </FieldLabel>

                  <Textarea
                    {...field}
                    id="edit-transaction-description"
                    aria-invalid={fieldState.invalid}
                    placeholder="Note optionnelle sur cette transaction"
                    className="min-h-[88px]"
                  />

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
                  <FieldLabel>Date de transaction</FieldLabel>

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
                          : "Choisir une date"}
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
          <Button type="button" variant="destructive" onClick={onDelete}>
            <IconTrash className="mr-2 h-4 w-4" />
            Supprimer
          </Button>

          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>

            <Button type="submit" form="edit-transaction-form">
              Enregistrer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
