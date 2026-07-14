"use client";

import {
  createTeamInvitation,
  type CreateInvitationState,
} from "@/app/app/team-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Copy, MessageCircle } from "lucide-react";
import { useActionState, useState } from "react";

const initialState: CreateInvitationState = {};

export function AdminInviteForm({
  teamId,
  teamSlug,
  canInviteAdmin,
}: {
  teamId: string;
  teamSlug: string;
  canInviteAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    createTeamInvitation,
    initialState,
  );
  const [copied, setCopied] = useState(false);
  const whatsappUrl = state.inviteUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Você foi convidado para administrar um time no FUT7: ${state.inviteUrl}`)}`
    : null;

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="teamSlug" value={teamSlug} />

        <div className="space-y-2">
          <Label htmlFor="invite-email">E-mail do convidado</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            placeholder="organizador@exemplo.com"
            autoComplete="email"
            maxLength={254}
            required
          />
          {state.errors?.email && (
            <p className="text-sm text-red-600">Informe um e-mail válido.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-role">Permissão</Label>
          <select
            id="invite-role"
            name="role"
            defaultValue="manager"
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
          >
            <option value="manager">Organizador — agenda e elenco</option>
            {canInviteAdmin && (
              <option value="admin">Administrador — gestão do time</option>
            )}
          </select>
        </div>

        {state.message && !state.inviteUrl && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {state.message}
          </p>
        )}

        <Button type="submit" className="h-11 w-full rounded-xl" disabled={pending}>
          {pending ? "Gerando convite..." : "Gerar link de convite"}
        </Button>
      </form>

      {state.inviteUrl && whatsappUrl && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
            <Check className="size-4" aria-hidden /> Convite pronto
          </p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            O link é pessoal, expira em 7 dias e só pode ser aceito pelo e-mail informado.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(state.inviteUrl!);
                setCopied(true);
              }}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                <MessageCircle aria-hidden /> WhatsApp
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
