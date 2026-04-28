import { IconWallet } from "@tabler/icons-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "~/components/ui/card"

type WalletCardProps = {
  title: string
  amount: string
}

export default function WalletCard({ title, amount }: WalletCardProps) {
  return (
    <Card size="sm" className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <IconWallet size={22} stroke={2} className="text-muted-foreground" />
          </div>

          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">Available balance</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {amount} dh
        </h1>
      </CardContent>
    </Card>
  )
}