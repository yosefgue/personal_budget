import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { IconPigMoney } from "@tabler/icons-react"
import { useState } from "react"
import { loginUser, type LoginPayload, } from "~/lib/auth"
import { useNavigate } from "react-router"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    const onSubmit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
    
        const values: LoginPayload = {
          username,
          password,
        }
    
        try {
          const tokens = await loginUser(values);
          console.log("logged in", tokens);
          localStorage.setItem("access", tokens.access)
          localStorage.setItem("refresh", tokens.refresh)
          setSuccess("Logged in successfully.");
          setUsername("");
          setPassword("");
          navigate("/dashboard");
        } catch (err: any) {
          console.error("login error", err);
    
          if (err?.username?.[0]) {
            setError(err.username[0]);
          } else if (err?.password?.[0]) {
            setError(err.password[0]);
          } else {
            setError("Login failed.");
          }
        }
      };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-8 items-center justify-center rounded-md">
              <IconPigMoney className="size-8" />
            </div>
            <h1 className="text-xl font-bold">Welcome</h1>
            <FieldDescription>
              Don&apos;t have an account? <a href="register">Sign up</a>
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              type="text"
              placeholder="Username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="********"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field>
            <Button type="submit">Login</Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
