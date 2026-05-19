import * as React from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { IconReceipt } from "@tabler/icons-react"

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
import { type Transaction } from "~/components/transaction-types"

type AmountPresentation = {
  sign: string
  className: string
}

type TransactionTableProps = {
  transactions: Transaction[]
  onRowClick: (transaction: Transaction) => void
  formatDateForDisplay: (date: Date) => string
  parseDjangoDate: (date: string) => Date
  getAmountPresentation: (transaction: Transaction) => AmountPresentation
  getTransactionTypeLabel: (transactionType: Transaction["type"]) => string
}

export function TransactionTable({
  transactions,
  onRowClick,
  formatDateForDisplay,
  parseDjangoDate,
  getAmountPresentation,
  getTransactionTypeLabel,
}: TransactionTableProps) {
  const columns = React.useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Titre",
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => getTransactionTypeLabel(row.original.type),
      },
      {
        accessorKey: "category_name",
        header: "Categorie",
        cell: ({ row }) => row.original.category_name ?? "Virement",
      },
      {
        accessorKey: "transaction_date",
        header: "Date",
        cell: ({ row }) =>
          formatDateForDisplay(
            parseDjangoDate(row.getValue("transaction_date"))
          ),
      },
      {
        accessorKey: "amount",
        header: () => <div className="text-right">Montant</div>,
        cell: ({ row }) => {
          const amount = Number(row.getValue("amount"))
          const presentation = getAmountPresentation(row.original)

          return (
            <div className={presentation.className}>
              {presentation.sign}
              {amount.toLocaleString("fr-MA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              dh
            </div>
          )
        },
      },
    ],
    [
      formatDateForDisplay,
      getAmountPresentation,
      getTransactionTypeLabel,
      parseDjangoDate,
    ]
  )

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (transactions.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconReceipt className="h-6 w-6" />
          </EmptyMedia>

          <EmptyTitle>Aucune transaction pour le moment</EmptyTitle>

          <EmptyDescription>
            Une fois ajoutees, les transactions apparaitront ici.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
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
              onClick={() => onRowClick(row.original)}
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
  )
}
