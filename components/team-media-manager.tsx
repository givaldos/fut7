/* eslint-disable @next/next/no-img-element */
"use client";

import {
  deleteTeamMedia,
  featureTeamMedia,
  registerTeamMedia,
} from "@/app/app/[teamSlug]/settings/actions";
import { ImageCropDialog } from "@/components/image-crop-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  Camera,
  ImageIcon,
  LoaderCircle,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type TeamMediaItem = {
  id: string;
  kind: "logo" | "cover" | "gallery";
  url: string;
  altText: string;
  isFeatured: boolean;
};

type CropRequest = {
  file: File;
  kind: "logo" | "cover";
};

const allowedTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

const maxUploadBytes = 5 * 1024 * 1024;
const maxCropSourceBytes = 15 * 1024 * 1024;

export function TeamMediaManager({
  teamId,
  teamSlug,
  teamName,
  media,
}: {
  teamId: string;
  teamSlug: string;
  teamName: string;
  media: TeamMediaItem[];
}) {
  const [pendingKind, setPendingKind] = useState<TeamMediaItem["kind"] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [featuringId, setFeaturingId] = useState<string | null>(null);
  const [cropRequest, setCropRequest] = useState<CropRequest | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const router = useRouter();
  const galleryAltRef = useRef<HTMLInputElement>(null);
  const logo = media.find((item) => item.kind === "logo");
  const cover = media.find((item) => item.kind === "cover");
  const gallery = media.filter((item) => item.kind === "gallery");

  function selectMedia(kind: TeamMediaItem["kind"], file?: File) {
    setMessage(null);
    if (!file) return;
    if (!allowedTypes[file.type as keyof typeof allowedTypes]) {
      setMessage({ tone: "error", text: "Use uma imagem JPG, PNG ou WebP." });
      return;
    }
    const maxSourceBytes = kind === "gallery" ? maxUploadBytes : maxCropSourceBytes;
    if (file.size > maxSourceBytes) {
      setMessage({
        tone: "error",
        text:
          kind === "gallery"
            ? "A foto da galeria pode ter no máximo 5 MB."
            : "A imagem original pode ter no máximo 15 MB.",
      });
      return;
    }

    if (kind === "gallery") {
      void upload(kind, file);
      return;
    }
    setCropRequest({ file, kind });
  }

  async function upload(kind: TeamMediaItem["kind"], file?: File) {
    setMessage(null);
    if (!file) return;
    const extension = allowedTypes[file.type as keyof typeof allowedTypes];
    if (!extension) {
      setMessage({ tone: "error", text: "Use uma imagem JPG, PNG ou WebP." });
      return;
    }
    if (file.size > maxUploadBytes) {
      setMessage({ tone: "error", text: "A imagem pode ter no máximo 5 MB." });
      return;
    }

    setPendingKind(kind);
    const storagePath = `${teamId}/${kind}/${crypto.randomUUID()}.${extension}`;
    const supabase = createClient();
    try {
      const { error: uploadError } = await supabase.storage
        .from("team_media")
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
      if (uploadError) {
        setMessage({
          tone: "error",
          text: "Não foi possível enviar a imagem. Confira sua sessão e tente novamente.",
        });
        return;
      }

      const formData = new FormData();
      formData.set("teamId", teamId);
      formData.set("teamSlug", teamSlug);
      formData.set("kind", kind);
      formData.set("storagePath", storagePath);
      formData.set(
        "altText",
        kind === "gallery"
          ? galleryAltRef.current?.value.trim() || `Foto do ${teamName}`
          : kind === "logo"
            ? `Escudo do ${teamName}`
            : `Capa do ${teamName}`,
      );
      const result = await registerTeamMedia(formData);
      setMessage({ tone: result.ok ? "success" : "error", text: result.message });
      if (result.ok) {
        if (galleryAltRef.current) galleryAltRef.current.value = "";
        router.refresh();
      }
    } catch {
      await supabase.storage.from("team_media").remove([storagePath]);
      setMessage({ tone: "error", text: "Não foi possível concluir o envio." });
    } finally {
      setPendingKind(null);
    }
  }

  async function remove(item: TeamMediaItem) {
    setDeletingId(item.id);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("mediaId", item.id);
      formData.set("teamSlug", teamSlug);
      const result = await deleteTeamMedia(formData);
      setMessage({ tone: result.ok ? "success" : "error", text: result.message });
      if (result.ok) router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Não foi possível remover a imagem." });
    } finally {
      setDeletingId(null);
    }
  }

  async function feature(item: TeamMediaItem) {
    if (item.isFeatured) return;
    setFeaturingId(item.id);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("mediaId", item.id);
      formData.set("teamSlug", teamSlug);
      const result = await featureTeamMedia(formData);
      setMessage({ tone: result.ok ? "success" : "error", text: result.message });
      if (result.ok) router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Não foi possível destacar a foto." });
    } finally {
      setFeaturingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
        <MediaPicker
          label="Escudo"
          description="Recorte quadrado 1:1"
          item={logo}
          pending={pendingKind === "logo"}
          onSelect={(file) => selectMedia("logo", file)}
          onRemove={logo ? () => remove(logo) : undefined}
          deleting={Boolean(logo && deletingId === logo.id)}
          compact
        />
        <MediaPicker
          label="Foto de capa"
          description="Recorte horizontal 16:9"
          item={cover}
          pending={pendingKind === "cover"}
          onSelect={(file) => selectMedia("cover", file)}
          onRemove={cover ? () => remove(cover) : undefined}
          deleting={Boolean(cover && deletingId === cover.id)}
        />
      </div>

      <div className="border-t border-slate-100 pt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-black text-slate-950">Galeria do time</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Jogos, resenhas e títulos. Escolha a foto que aparece maior na
              página pública.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            {gallery.length}/13
          </span>
        </div>

        {gallery.length ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gallery.map((item) => (
              <div
                key={item.id}
                className={`group relative aspect-square overflow-hidden rounded-2xl bg-slate-100 ring-offset-2 transition ${item.isFeatured ? "ring-2 ring-amber-400" : ""}`}
              >
                <img src={item.url} alt={item.altText} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => feature(item)}
                  disabled={item.isFeatured || featuringId === item.id || deletingId === item.id}
                  className={`absolute left-2 top-2 grid size-10 place-items-center rounded-xl shadow-lg backdrop-blur transition disabled:cursor-default ${item.isFeatured ? "bg-amber-300 text-slate-950" : "bg-white/90 text-slate-700 hover:bg-amber-300 hover:text-slate-950"}`}
                  aria-label={
                    item.isFeatured
                      ? `${item.altText} já é a foto de destaque`
                      : `Usar ${item.altText} como foto de destaque`
                  }
                  aria-pressed={item.isFeatured}
                >
                  {featuringId === item.id ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Star
                      className={`size-4 ${item.isFeatured ? "fill-current" : ""}`}
                      aria-hidden
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  disabled={deletingId === item.id || featuringId === item.id}
                  className="absolute right-2 top-2 grid size-10 place-items-center rounded-xl bg-slate-950/80 text-white shadow-lg backdrop-blur transition hover:bg-red-700 disabled:opacity-50"
                  aria-label={`Remover ${item.altText}`}
                >
                  {deletingId === item.id ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
                </button>
                {item.isFeatured ? (
                  <span className="absolute inset-x-2 bottom-2 inline-flex min-h-8 items-center justify-center gap-1.5 rounded-xl bg-slate-950/85 px-2 text-[11px] font-black text-white shadow-lg backdrop-blur">
                    <Star className="size-3 fill-amber-300 text-amber-300" aria-hidden />
                    Destaque da página
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <Camera className="mx-auto size-7 text-slate-400" aria-hidden />
            <p className="mt-2 text-sm font-bold text-slate-700">A galeria está vazia</p>
          </div>
        )}

        {gallery.length < 13 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="gallery-alt">Legenda acessível</Label>
              <Input
                ref={galleryAltRef}
                id="gallery-alt"
                placeholder="Ex.: Campeões do torneio de inverno"
                maxLength={160}
              />
            </div>
            <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition active:scale-[0.98] hover:bg-slate-800">
              {pendingKind === "gallery" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
              {pendingKind === "gallery" ? "Enviando..." : "Adicionar foto"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={Boolean(pendingKind)}
                onChange={(event) => {
                  selectMedia("gallery", event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        ) : null}
      </div>

      {message ? (
        <p
          role="status"
          className={`rounded-xl p-3 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden />
        JPG, PNG ou WebP. Escudo e capa aceitam originais de até 15 MB e são otimizados no aparelho; a galeria aceita até 5 MB. Os arquivos ficam privados.
      </div>

      {cropRequest ? (
        <ImageCropDialog
          key={`${cropRequest.kind}-${cropRequest.file.name}-${cropRequest.file.lastModified}`}
          file={cropRequest.file}
          kind={cropRequest.kind}
          onCancel={() => setCropRequest(null)}
          onConfirm={(croppedFile) => {
            const kind = cropRequest.kind;
            setCropRequest(null);
            void upload(kind, croppedFile);
          }}
        />
      ) : null}
    </div>
  );
}

function MediaPicker({
  label,
  description,
  item,
  pending,
  deleting,
  onSelect,
  onRemove,
  compact = false,
}: {
  label: string;
  description: string;
  item?: TeamMediaItem;
  pending: boolean;
  deleting: boolean;
  onSelect: (file?: File) => void;
  onRemove?: () => void;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <Label>{label}</Label>
        <span className="text-[11px] text-slate-400">{description}</span>
      </div>
      <div className={`relative mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${compact ? "aspect-square" : "aspect-[16/8]"}`}>
        {item ? (
          <img src={item.url} alt={item.altText} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-slate-400">
            <ImageIcon className="size-7" aria-hidden />
          </div>
        )}
        <div className="absolute inset-x-2 bottom-2 flex gap-2">
          <label className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/95 px-3 text-xs font-bold text-slate-900 shadow-lg backdrop-blur hover:bg-white">
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
            {item ? "Trocar" : "Enviar"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={pending || deleting}
              onChange={(event) => {
                onSelect(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={pending || deleting}
              className="grid size-10 place-items-center rounded-xl bg-slate-950/85 text-white shadow-lg backdrop-blur hover:bg-red-700 disabled:opacity-50"
              aria-label={`Remover ${label.toLowerCase()}`}
            >
              {deleting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
