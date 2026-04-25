import { Navigate, Outlet } from "react-router"
import { useState, useEffect } from "react"
import { getMe } from "~/lib/auth"

export default function ProtectedRoute() {
  const token = localStorage.getItem("access")
  const [isAuth, setIsAuth] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        await getMe(token)
        setIsAuth(true)
      } catch {
        setIsAuth(false)
        localStorage.removeItem("access")
      } finally {
        setLoading(false)
      }
    }

    check()
  }, [token])

  if (!token) {
    return <Navigate to="/" replace />
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!isAuth) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}