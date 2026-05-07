import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "~/components/ui/sidebar"
import { IconPigMoney, IconLogout2 } from "@tabler/icons-react"
import { Link, useLocation, useNavigate } from "react-router"

const data = [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
        },
      ],
    },
    {
      title: "Money",
      url: "#",
      items: [
        {
          title: "Wallets",
          url: "/dashboard/wallets",
        },
        {
          title: "Transactions",
          url: "/dashboard/transactions",
        },
      ],
    },
    {
      title: "Planning",
      url: "#",
      items: [
        {
          title: "Goals",
          url: "/dashboard/goals",
        },
        {
          title: "Budgets",
          url: "/dashboard/budgets",
        },
      ],
    }
  ]


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isItemActive = (url: string) => {
    if (url === "/dashboard") {
      return pathname === url
    }

    return pathname === url || pathname.startsWith(`${url}/`)
  }

  function handleLogout() {
    localStorage.removeItem("access")
    localStorage.removeItem("refresh")

    navigate("/", { replace: true })
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <IconPigMoney className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Budget App</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
      </SidebarHeader>
      <SidebarContent>
        {data.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isItemActive(item.url)}>
                      <Link to={item.url}>{item.title}</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button type="button" onClick={handleLogout}>
                <IconLogout2 />
                <span>Sign out</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
