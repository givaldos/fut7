/* eslint-disable @next/next/no-img-element */
"use client";

import {
  registerMyPlayerPhoto,
  removeMyPlayerPhoto,
} from "@/app/me/actions";
import { ImageCropDialog } from "@/components/image-crop-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  Camera,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const allowedTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const maxCropSourceBytes = 15 * 1024 * 1024;
const maxUploadBytes = 5 * 1024 * 1024;

export function PlayerAvatarManager({
  userId,
  playerName,
  photoUrl,
}: {
  userId: string;
  playerName: string;
  photoUrl: string | null;
}) {
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const router = useRouter();
  const initials = playerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  function selectFile(file?: File) {
    setMessage(null);
    if (!file) return;
    if (!allowedTypes[file.type as keyof typeof allowedTypes]) {
      setMessage({ tone: "error", text: "Use uma imagem JPG, PNG ou WebP." });
      return;
    }
    if (file.size > maxCropSourceBytes) {
      setMessage({
        tone: "error",
        text: "A imagem original pode ter no máximo 15 MB.",
      });
      return;
    }
    setCropFile(file);
  }

  async function upload(file: File) {
    const extension = allowedTypes[file.type as keyof typeof allowedTypes];
    if (!extension || file.size > maxUploadBytes) {
      setMessage({
        tone: "error",
        text: "Não foi possível preparar a foto. Tente outra imagem.",
      });
      return;
    }

    setPending(true);
    setMessage(null);
    const storagePath = `${userId}/profile/${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    try {
      const { error: uploadError } = await supabase.storage
        .from("athlete_avatars")
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) {
        setMessage({
          tone: "error",
          text: "Não foi possível enviar a foto. Confira sua sessão e tente novamente.",
        });
        return;
      }

      const formData = new FormData();
      formData.set("storagePath", storagePath);
      const result = await registerMyPlayerPhoto(formData);
      if (!result.ok) {
        await supabase.storage.from("athlete_avatars").remove([storagePath]);
      }
      setMessage({ tone: result.ok ? "success" : "error", text: result.message });
      if (result.ok) router.refresh();
    } catch {
      await supabase.storage.from("athlete_avatars").remove([storagePath]);
      setMessage({ tone: "error", text: "Não foi possível concluir o envio." });
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setRemoving(true);
    setMessage(null);
    try {
      const result = await removeMyPlayerPhoto();
      setMessage({ tone: result.ok ? "success" : "error", text: result.message });
      if (result.ok) router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Não foi possível remover a foto." });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative mx-auto size-32 shrink-0 overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-100 to-slate-200 shadow-inner ring-4 ring-white sm:mx-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`Foto de ${playerName}`}
              className="size-full object-cover"
            />
          ) : initials ? (
            <div className="grid size-full place-items-center text-3xl font-black text-emerald-900/35">
              {initials}
            </div>
          ) : (
            <div className="grid size-full place-items-center text-emerald-900/35">
              <UserRound className="size-12" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
            Sua foto
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            Seja reconhecido no BID
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            O mesmo retrato acompanha seu perfil em todos os times. Você decide
            se o perfil fica público.
          </p>
          <div className="mt-4 flex flex-col gap-2 min-[400px]:flex-row min-[400px]:justify-center sm:justify-start">
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 active:scale-[0.98] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Camera className="size-4" aria-hidden />
              )}
              {pending ? "Enviando..." : photoUrl ? "Trocar foto" : "Enviar foto"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={pending || removing}
                onChange={(event) => {
                  selectFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            {photoUrl ? (
              <button
                type="button"
                onClick={() => void remove()}
                disabled={pending || removing}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
              >
                {removing ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-4" aria-hidden />
                )}
                {removing ? "Removendo..." : "Remover"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {message ? (
        <p
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-xl p-3 text-sm ${
            message.tone === "success"
              ? "bg-emerald-50 text-emerald-900"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
        A imagem fica em armazenamento privado e é exibida publicamente somente
        quando seu perfil está público.
      </p>

      {cropFile ? (
        <ImageCropDialog
          file={cropFile}
          kind="avatar"
          onCancel={() => setCropFile(null)}
          onConfirm={(file) => {
            setCropFile(null);
            void upload(file);
          }}
        />
      ) : null}
    </div>
  );
}
