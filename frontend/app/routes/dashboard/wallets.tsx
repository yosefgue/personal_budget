import { useEffect, useState } from "react"
import { Spinner } from "~/components/ui/spinner"
import WalletCard from "~/components/wallet-card"

type Wallet = {
  id: number
  name: string
  type: "main" | "goal"
  balance: string
  goal: number | null
}

export default function Wallets() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWallets() {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/wallets/", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch wallets")
        }

        const data = await response.json()
        setWallets(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchWallets()
  }, [])

  if (loading) {
    return <Spinner/>
  }

  const sortedWallets = [...wallets].sort((a, b) => {
    if (a.type === "main") return -1
    if (b.type === "main") return 1
    return 0
  })

  return (
    <div className="flex gap-4">
      {sortedWallets.map((wallet) => (
        <WalletCard
          key={wallet.id}
          title={wallet.name}
          amount={wallet.balance}
        />
      ))}
    </div>
  )
}