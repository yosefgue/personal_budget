import { SignupForm } from "~/components/signup-form"
import { useEffect } from "react"
import { useNavigate } from "react-router"
import { getMe } from "~/lib/auth"

export default function Page() {
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
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  )
}