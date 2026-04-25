import { type RouteConfig, index, route, layout } from "@react-router/dev/routes"

export default [
  index("./routes/login.tsx"),
  route("register", "./routes/register.tsx"),

  layout("./routes/protected.tsx", [
    layout("./routes/dashboard/layout.tsx", [
      route("dashboard", "./routes/dashboard/home.tsx"),
      route("dashboard/transactions", "./routes/dashboard/transactions.tsx"),
      route("dashboard/wallets", "./routes/dashboard/wallets.tsx"),
      route("dashboard/goals", "./routes/dashboard/goals.tsx"),
      route("dashboard/budgets", "./routes/dashboard/budgets.tsx"),
    ]),
  ]),
] satisfies RouteConfig
