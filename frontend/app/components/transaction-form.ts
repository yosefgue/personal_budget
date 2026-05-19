import * as z from "zod"

export const transactionFormSchema = z
  .object({
    title: z
      .string()
      .min(3, "Le titre doit contenir au moins 3 caracteres.")
      .max(64, "Le titre doit contenir au maximum 64 caracteres."),

    amount: z
      .string()
      .min(1, "Le montant est requis.")
      .refine((value) => Number(value) > 0, {
        message: "Le montant doit etre superieur a 0.",
      }),

    type: z.enum(["income", "expense", "transfer_in", "transfer_out"]),

    category: z.string().optional(),

    description: z.string().max(255).optional(),

    is_recurring: z.boolean(),

    transaction_date: z.date(),
  })
  .superRefine((values, ctx) => {
    if (values.type === "income" || values.type === "expense") {
      if (!values.category) {
        ctx.addIssue({
          path: ["category"],
          code: z.ZodIssueCode.custom,
          message: "La categorie est requise.",
        })
      }
    }
  })

export type TransactionFormValues = z.infer<typeof transactionFormSchema>
