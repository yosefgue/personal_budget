import { useEffect, useMemo, useState } from "react"
import {
	Card,
	CardContent,
	CardHeader,
	CardDescription,
	CardTitle,
} from "~/components/ui/card"
import { Spinner } from "~/components/ui/spinner"
import { Separator } from "~/components/ui/separator"
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "~/components/ui/chart"
import { type Transaction } from "~/components/transaction-types"
import {
	Area,
	AreaChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	XAxis,
} from "recharts"
import {
	IconArrowDownRight,
	IconArrowUpRight,
	IconPigMoney,
	IconReceipt,
	IconWallet,
} from "@tabler/icons-react"

type Wallet = {
	id: number
	name: string
	type: "main" | "goal"
	balance: string
}

const currencyFormatter = new Intl.NumberFormat("fr-MA", {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
})

function formatCurrency(value: number) {
	return `${currencyFormatter.format(value)} dh`
}

function parseDjangoDate(date: string) {
	return new Date(`${date}T00:00:00`)
}

function toDateKey(date: Date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

function formatShortDate(date: Date) {
	return date.toLocaleDateString("en-GB", {
		month: "short",
		day: "2-digit",
	})
}

function formatTransactionDate(date: Date) {
	return date.toLocaleDateString("en-GB", {
		month: "short",
		day: "2-digit",
		year: "numeric",
	})
}

function getTransactionMeta(transaction: Transaction) {
	switch (transaction.type) {
		case "income":
			return {
				icon: <IconArrowUpRight className="h-4 w-4 text-green-600" />,
				badgeClassName: "bg-green-500/15",
				amountClassName: "text-green-600",
				amountPrefix: "+",
			}
		case "expense":
			return {
				icon: <IconArrowDownRight className="h-4 w-4 text-red-600" />,
				badgeClassName: "bg-red-500/15",
				amountClassName: "text-red-600",
				amountPrefix: "-",
			}
		default:
			return {
				icon: <IconReceipt className="h-4 w-4 text-blue-600" />,
				badgeClassName: "bg-blue-500/15",
				amountClassName: "text-blue-600",
				amountPrefix: "",
			}
	}
}

function SummaryCard({
	title,
	value,
	icon,
	badgeClassName,
}: {
	title: string
	value: string
	icon: React.ReactNode
	badgeClassName?: string
}) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center gap-3">
					<div
						className={`flex h-9 w-9 items-center justify-center rounded-full ${
							badgeClassName ?? "bg-blue-500/15"
						}`}
					>
						{icon}
					</div>
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{title}
					</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				<p className="text-2xl font-semibold tracking-tight">{value}</p>
			</CardContent>
		</Card>
	)
}

export default function DashboardHome() {
	const [wallets, setWallets] = useState<Wallet[]>([])
	const [transactions, setTransactions] = useState<Transaction[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState("")

	useEffect(() => {
		async function loadSummary() {
			try {
				setLoading(true)
				setError("")

				const token = localStorage.getItem("access")
				const headers = {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				}

				const [walletsResponse, transactionsResponse] = await Promise.all([
					fetch("http://127.0.0.1:8000/api/wallets/", { headers }),
					fetch("http://127.0.0.1:8000/api/transactions/", { headers }),
				])

				if (!walletsResponse.ok) {
					throw new Error("Failed to fetch wallets")
				}

				if (!transactionsResponse.ok) {
					throw new Error("Failed to fetch transactions")
				}

				const walletsData = await walletsResponse.json()
				const transactionsData = await transactionsResponse.json()

				setWallets(walletsData)
				setTransactions(transactionsData)
			} catch (loadError) {
				console.error(loadError)
				setError("Could not load summary data.")
			} finally {
				setLoading(false)
			}
		}

		loadSummary()
	}, [])

	const summary = useMemo(() => {
		const mainWallet = wallets.find((wallet) => wallet.type === "main")
		const mainBalance = Number(mainWallet?.balance ?? 0)

		const now = new Date()
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

		let income = 0
		let expenses = 0
		let savings = 0

		for (const transaction of transactions) {
			const date = parseDjangoDate(transaction.transaction_date)

			if (date < monthStart || date > now) {
				continue
			}

			const amount = Number(transaction.amount)

			if (transaction.type === "income") {
				income += amount
			}

			if (transaction.type === "expense") {
				expenses += amount
			}

			if (
				transaction.type === "transfer_out" ||
				transaction.category_name === "Savings"
			) {
				savings += amount
			}
		}

		return {
			mainBalance: formatCurrency(mainBalance),
			income: formatCurrency(income),
			expenses: formatCurrency(expenses),
			savings: formatCurrency(savings),
		}
	}, [transactions, wallets])

	const chartData = useMemo(() => {
		const days = Array.from({ length: 30 }, (_, index) => {
			const date = new Date()
			date.setDate(date.getDate() - (29 - index))
			date.setHours(0, 0, 0, 0)
			return date
		})

		const incomeByDate: Record<string, number> = {}
		const expenseByDate: Record<string, number> = {}

		for (const transaction of transactions) {
			const date = parseDjangoDate(transaction.transaction_date)
			const key = toDateKey(date)

			if (!days.some((day) => toDateKey(day) === key)) {
				continue
			}

			const amount = Number(transaction.amount)

			if (transaction.type === "income") {
				incomeByDate[key] = (incomeByDate[key] ?? 0) + amount
			}

			if (transaction.type === "expense") {
				expenseByDate[key] = (expenseByDate[key] ?? 0) + amount
			}
		}

		return days.map((day) => {
			const key = toDateKey(day)
			return {
				label: formatShortDate(day),
				income: incomeByDate[key] ?? 0,
				expense: expenseByDate[key] ?? 0,
			}
		})
	}, [transactions])

	const recentTransactions = useMemo(() => {
		return [...transactions]
			.sort(
				(a, b) =>
					parseDjangoDate(b.transaction_date).getTime() -
					parseDjangoDate(a.transaction_date).getTime()
			)
			.slice(0, 5)
	}, [transactions])

	const categorySummary = useMemo(() => {
		const totals = new Map<string, number>()

		for (const transaction of transactions) {
			if (transaction.type !== "expense") {
				continue
			}

			const category = transaction.category_name ?? "Uncategorized"
			const amount = Number(transaction.amount)
			totals.set(category, (totals.get(category) ?? 0) + amount)
		}

		const sorted = Array.from(totals.entries())
			.map(([category, amount]) => ({ category, amount }))
			.sort((a, b) => b.amount - a.amount)

		const palette = [
			"#0f172a",
			"#1e3a8a",
			"#2563eb",
			"#3b82f6",
			"#60a5fa",
			"#93c5fd",
			"#e2e8f0",
			"#f8fafc",
		]

		const data = sorted.map((item, index) => ({
			...item,
			fill: palette[index % palette.length],
		}))

		const config = data.reduce<Record<string, { label: string; color: string }>>(
			(acc, item) => {
				acc[item.category] = { label: item.category, color: item.fill }
				return acc
			},
			{}
		)

		const total = data.reduce((sum, item) => sum + item.amount, 0)

		return { data, config, total }
	}, [transactions])

	if (loading) {
		return <Spinner />
	}

	if (error) {
		return <p className="text-sm text-destructive">{error}</p>
	}

	return (
		<div className="space-y-6">
			<section className="space-y-3">
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<SummaryCard
						title="Main wallet balance"
						value={summary.mainBalance}
						badgeClassName="bg-blue-500/15"
						icon={
							<IconWallet className="h-4 w-4 text-blue-600" />
						}
					/>
					<SummaryCard
						title="Monthly income"
						value={summary.income}
						badgeClassName="bg-green-500/15"
						icon={
							<IconArrowUpRight className="h-4 w-4 text-green-600" />
						}
					/>
					<SummaryCard
						title="Monthly expenses"
						value={summary.expenses}
						badgeClassName="bg-red-500/15"
						icon={
							<IconArrowDownRight className="h-4 w-4 text-red-600" />
						}
					/>
					<SummaryCard
						title="Savings added"
						value={summary.savings}
						badgeClassName="bg-blue-500/15"
						icon={
							<IconPigMoney className="h-4 w-4 text-blue-600" />
						}
					/>
				</div>
			</section>

			<section className="space-y-3">
				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardHeader className="pb-0">
							<CardTitle className="text-base font-semibold">
								Income and expense
							</CardTitle>
							<CardDescription>
								Showing income and expense for the last month
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-4">
							<ChartContainer
								className="h-56 w-full"
								config={{
									income: {
										label: "Income",
										theme: {
											light: "#60a5fa",
											dark: "#60a5fa",
										},
									},
									expense: {
										label: "Expenses",
										theme: {
											light: "#2563eb",
											dark: "#2563eb",
										},
									},
								}}
							>
								<AreaChart data={chartData} margin={{ left: 8, right: 8 }}>
									<defs>
										<linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
											<stop
												offset="5%"
												stopColor="var(--color-income)"
												stopOpacity={0.2}
											/>
											<stop
												offset="95%"
												stopColor="var(--color-income)"
												stopOpacity={0.04}
											/>
										</linearGradient>
										<linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
											<stop
												offset="5%"
												stopColor="var(--color-expense)"
												stopOpacity={0.45}
											/>
											<stop
												offset="95%"
												stopColor="var(--color-expense)"
												stopOpacity={0.12}
											/>
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis
										dataKey="label"
										tickLine={false}
										axisLine={false}
										minTickGap={16}
										tickMargin={8}
									/>
									<ChartTooltip content={<ChartTooltipContent />} />
									<Area
										type="monotone"
										dataKey="income"
										stroke="var(--color-income)"
										fill="url(#income)"
										strokeWidth={2}
										name="Income"
									/>
									<Area
										type="monotone"
										dataKey="expense"
										stroke="var(--color-expense)"
										fill="url(#expense)"
										strokeWidth={2}
										name="Expenses"
									/>
								</AreaChart>
							</ChartContainer>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-0">
							<CardTitle className="text-base font-semibold">
								Recent transactions
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-4">
							{recentTransactions.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No transactions yet.
								</p>
							) : (
								<div className="space-y-4">
									{recentTransactions.map((transaction, index) => {
										const meta = getTransactionMeta(transaction)
										const date = parseDjangoDate(
											transaction.transaction_date
										)
										return (
											<div key={transaction.id}>
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-3">
														<div
															className={`flex h-9 w-9 items-center justify-center rounded-full ${meta.badgeClassName}`}
														>
															{meta.icon}
														</div>
														<div>
															<p className="text-sm font-medium">
																{transaction.title}
															</p>
															<p className="text-xs text-muted-foreground">
																{formatTransactionDate(date)}
															</p>
														</div>
													</div>
													<p className={`text-sm font-medium ${meta.amountClassName}`}>
														{meta.amountPrefix}
														{formatCurrency(Number(transaction.amount))}
													</p>
												</div>
												{index < recentTransactions.length - 1 && (
													<Separator className="mt-4" />
												)}
											</div>
										)
									})}
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</section>

			<section className="space-y-3">
				<div className="w-full lg:w-1/2">
					<Card>
						<CardHeader className="pb-0">
							<CardTitle className="text-base font-semibold">
								Spending by category
							</CardTitle>
							<CardDescription>
								Expenses grouped by category
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-4">
							{categorySummary.data.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No expense data yet.
								</p>
							) : (
								<div className="flex flex-col gap-6 sm:flex-row sm:items-center">
									<ChartContainer
										className="h-48 w-full max-w-[220px]"
										config={categorySummary.config}
									>
										<PieChart>
											<ChartTooltip
												content={<ChartTooltipContent nameKey="category" />}
											/>
													<Pie
												data={categorySummary.data}
												dataKey="amount"
												nameKey="category"
												innerRadius={55}
												outerRadius={80}
														stroke="hsl(var(--background))"
														strokeWidth={2}
											>
												{categorySummary.data.map((item) => (
													<Cell key={item.category} fill={item.fill} />
												))}
											</Pie>
										</PieChart>
									</ChartContainer>

									<div className="flex-1 space-y-3">
										<div>
											<p className="text-xs text-muted-foreground">Total spent</p>
											<p className="text-xl font-semibold">
												{formatCurrency(categorySummary.total)}
											</p>
										</div>
										<ul className="space-y-2">
											{categorySummary.data.map((item) => (
												<li
													key={item.category}
													className="flex items-center justify-between text-sm"
												>
													<div className="flex items-center gap-2">
														<span
															className="h-2 w-2 rounded-full"
															style={{ backgroundColor: item.fill }}
														/>
														<span className="text-muted-foreground">
															{item.category}
														</span>
													</div>
													<span className="font-medium">
														{formatCurrency(item.amount)}
													</span>
												</li>
											))}
										</ul>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	)
}
