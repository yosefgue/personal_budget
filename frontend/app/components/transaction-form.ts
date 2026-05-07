import * as z from "zod"

export const transactionFormSchema = z
  .object({
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
          message: "Category is required.",
        })
      }
    }
  })

export type TransactionFormValues = z.infer<typeof transactionFormSchema>
