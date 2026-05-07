import { LoginForm } from "~/components/login-form"
import { useEffect } from "react"
import { useNavigate } from "react-router"
import { getMe } from "~/lib/auth"

export default function LoginPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("access")

    if (!token) return

    getMe(token)
      .then(() => {
        navigate("/dashboard", { replace: true })
      })
      .catch(() => {
        localStorage.removeItem("accessToken")
      })
  }, [navigate])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}