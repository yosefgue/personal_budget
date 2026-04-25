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
import { registerUser, type RegisterPayload } from "~/lib/auth"
import { useState } from "react"
import { useNavigate } from "react-router"

const onSubmit = async (values: RegisterPayload) => {
  try {
    const user = await registerUser(values);
    console.log("registered", user);
  } catch (error) {
    console.error("register error", error);
  }
};

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  let navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const values: RegisterPayload = {
      username,
      email,
      password,
    };

    try {
      const user = await registerUser(values);
      console.log("registered", user);
      setSuccess("Account created successfully.");

      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      navigate("/");
    } catch (err: any) {
      console.error("register error", err);

      if (err?.username?.[0]) {
        setError(err.username[0]);
      } else if (err?.email?.[0]) {
        setError(err.email[0]);
      } else if (err?.password?.[0]) {
        setError(err.password[0]);
      } else {
        setError("Registration failed.");
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
            <h1 className="text-xl font-bold">Register</h1>
            <FieldDescription>
              Already have an account? <a href="/">Login</a>
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="username">Username</FieldLabel>
            <Input
              id="username"
              type="text"
              placeholder="hadak6"
              required
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              required
              onChange={(e) => setPassword(e.target.value)}
            />
            <FieldDescription>
              Must be at least 8 characters long.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-password">
              Confirm Password
            </FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              required
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <FieldDescription>Please confirm your password.</FieldDescription>
          </Field>
          <FieldGroup>
            <Field>
              <Button type="submit">Create Account</Button>
            </Field>
          </FieldGroup>
        </FieldGroup>
      </form>
    </div>
  )
}