import { cn } from "~/lib/utils"
import * as React from "react"
import { Button } from "~/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field"
import { Spinner } from "~/components/ui/spinner"
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
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    const onSubmit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        setLoading(true);
    
        const values: LoginPayload = {
          username,
          password,
        }
    
        try {
          const tokens = await loginUser(values);
          console.log("logged in", tokens);
          localStorage.setItem("access", tokens.access)
          localStorage.setItem("refresh", tokens.refresh)
          setSuccess("Connexion reussie.");
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
            setError("Echec de la connexion.");
          }
          setLoading(false);
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
            <h1 className="text-xl font-bold">Bienvenue</h1>
            <FieldDescription>
              Vous n&apos;avez pas de compte ? <a href="register">Inscrivez-vous</a>
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="username">Nom d&apos;utilisateur</FieldLabel>
            <Input
              id="username"
              type="text"
              placeholder="Nom d&apos;utilisateur"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
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
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner /> : "Se connecter"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
