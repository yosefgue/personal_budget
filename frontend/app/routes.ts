import { type RouteConfig, index, route, layout } from "@react-router/dev/routes"

export default [

    index("./routes/login.tsx"),
    route("register", "routes/register.tsx"),

] satisfies RouteConfig
