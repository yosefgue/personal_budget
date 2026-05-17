import { useState } from "react"
import { IconMessageCircle, IconX } from "@tabler/icons-react"

import { AppSidebar } from "~/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from "~/components/ui/breadcrumb"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Separator } from "~/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar"
import { Spinner } from "~/components/ui/spinner"
import { Outlet, useNavigation } from "react-router"

export default function Page() {
  const navigation = useNavigation();
  const isNavigating = navigation.state === "loading";
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)

  async function handleSendMessage() {
    const message = chatInput.trim()
    if (!message || chatLoading) {
      return
    }

    setChatInput("")
    setChatMessages((prev) => [...prev, { role: "user", content: message }])
    setChatLoading(true)

    try {
      const token = localStorage.getItem("access")
      const response = await fetch("http://127.0.0.1:8000/api/ai/chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch AI response")
      }

      const data = await response.json()
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer ?? "No response." },
      ])
    } catch (chatError) {
      console.error(chatError)
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I could not respond right now." },
      ])
    } finally {
      setChatLoading(false)
    }
  }
  
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {isNavigating && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-50">
                <Spinner />
             </div>
          )}
          <Outlet />
        </div>
        <div className="fixed bottom-6 right-6 z-40 flex items-end gap-3">
          {chatOpen && (
            <Card className="w-80 shadow-lg sm:w-96">
              <CardHeader className="relative pb-2 pr-10">
                <CardTitle className="text-base font-semibold">
                  AI Assistant
                </CardTitle>
                <CardDescription>
                  Ask about your budget
                </CardDescription>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-3 top-3"
                  onClick={() => setChatOpen(false)}
                >
                  <IconX className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex h-80 flex-col gap-3">
                <div className="flex-1 space-y-3 overflow-auto pr-2">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Start a conversation to get tips.
                    </p>
                  ) : (
                    chatMessages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`flex ${
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-3xl px-3 py-2 text-sm shadow-sm ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleSendMessage()
                      }
                    }}
                    placeholder="Ask something..."
                    disabled={chatLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={chatLoading || !chatInput.trim()}
                  >
                    {chatLoading ? "..." : "Send"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <Button
            variant="default"
            size="icon-lg"
            className="rounded-full shadow-lg"
            onClick={() => setChatOpen((prev) => !prev)}
          >
            <IconMessageCircle className="h-5 w-5" />
          </Button>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
