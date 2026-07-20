"use client";

import {
  updateRecoveredPassword,
  type UpdateRecoveredPasswordState,
} from "@/app/auth/update-password/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const initialState: UpdateRecoveredPasswordState = {};
  const [state, action, pending] = useActionState(updateRecoveredPassword, initialState);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Defina uma nova senha</CardTitle>
          <CardDescription>
            Use pelo menos 12 caracteres e uma senha exclusiva para o FUT7.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Nova senha"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
                {state.errors?.password?.map((message) => <p key={message} className="text-xs text-red-600">{message}</p>)}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repeat-password">Repita a nova senha</Label>
                <Input id="repeat-password" name="repeatPassword" type="password" minLength={12} maxLength={128} autoComplete="new-password" required />
                {state.errors?.repeatPassword?.map((message) => <p key={message} className="text-xs text-red-600">{message}</p>)}
              </div>
              {state.message ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{state.message}</p> : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
