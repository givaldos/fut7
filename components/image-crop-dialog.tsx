"use client";

import { Button } from "@/components/ui/button";
import {
  clampCropPosition,
  getCropPlacement,
  type CropPosition,
} from "@/lib/media/crop";
import {
  Check,
  LoaderCircle,
  Move,
  RotateCcw,
  X,
  ZoomIn,
} from "lucide-react";
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type CropKind = "logo" | "cover" | "avatar";

const cropConfig = {
  logo: {
    title: "Ajustar escudo",
    description: "Posicione o escudo dentro do quadrado.",
    outputHeight: 1024,
    outputWidth: 1024,
    previewHeight: 640,
    previewWidth: 640,
  },
  avatar: {
    title: "Ajustar foto de perfil",
    description: "Centralize seu rosto dentro do quadrado.",
    outputHeight: 1024,
    outputWidth: 1024,
    previewHeight: 640,
    previewWidth: 640,
  },
  cover: {
    title: "Ajustar foto de capa",
    description: "Escolha a área que ficará visível na capa horizontal.",
    outputHeight: 900,
    outputWidth: 1600,
    previewHeight: 360,
    previewWidth: 640,
  },
} as const;

type DragState = {
  clientX: number;
  clientY: number;
  pointerId: number;
  position: CropPosition;
};

export function ImageCropDialog({
  file,
  kind,
  onCancel,
  onConfirm,
}: {
  file: File;
  kind: CropKind;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const config = cropConfig[kind];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [position, setPosition] = useState<CropPosition>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      imageRef.current = image;
      setImageReady(true);
    };
    image.onerror = () => {
      setError("Não foi possível abrir esta imagem.");
    };
    image.src = objectUrl;

    return () => {
      image.onload = null;
      image.onerror = null;
      imageRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !imageReady) return;

    const context = canvas.getContext("2d");
    if (!context) {
      setError("Seu navegador não conseguiu preparar o recorte.");
      return;
    }

    const placement = getCropPlacement({
      position,
      sourceHeight: image.naturalHeight,
      sourceWidth: image.naturalWidth,
      targetHeight: config.previewHeight,
      targetWidth: config.previewWidth,
      zoom,
    });

    context.clearRect(0, 0, config.previewWidth, config.previewHeight);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      placement.x,
      placement.y,
      placement.drawWidth,
      placement.drawHeight,
    );

    context.strokeStyle = "rgba(255, 255, 255, 0.32)";
    context.lineWidth = 1;
    for (let part = 1; part < 3; part += 1) {
      const x = (config.previewWidth / 3) * part;
      const y = (config.previewHeight / 3) * part;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, config.previewHeight);
      context.stroke();
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(config.previewWidth, y);
      context.stroke();
    }
  }, [config, imageReady, position, zoom]);

  function resetCrop() {
    setPosition({ x: 0, y: 0 });
    setZoom(1);
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!imageReady) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      position,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !canvas || !image) return;

    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const placement = getCropPlacement({
      position: drag.position,
      sourceHeight: image.naturalHeight,
      sourceWidth: image.naturalWidth,
      targetHeight: config.previewHeight,
      targetWidth: config.previewWidth,
      zoom,
    });
    const horizontalTravel = Math.max(
      0,
      (placement.drawWidth - config.previewWidth) / 2,
    );
    const verticalTravel = Math.max(
      0,
      (placement.drawHeight - config.previewHeight) / 2,
    );
    const deltaX =
      ((event.clientX - drag.clientX) * config.previewWidth) / rect.width;
    const deltaY =
      ((event.clientY - drag.clientY) * config.previewHeight) / rect.height;

    setPosition(
      clampCropPosition({
        x:
          horizontalTravel > 0
            ? drag.position.x + deltaX / horizontalTravel
            : drag.position.x,
        y:
          verticalTravel > 0
            ? drag.position.y + deltaY / verticalTravel
            : drag.position.y,
      }),
    );
  }

  function finishDrag(event: PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleCropKeyboard(event: KeyboardEvent<HTMLCanvasElement>) {
    const step = event.shiftKey ? 0.15 : 0.05;
    const movement: Record<string, CropPosition> = {
      ArrowDown: { x: 0, y: step },
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
    };
    const delta = movement[event.key];
    if (!delta) return;
    event.preventDefault();
    setPosition((current) =>
      clampCropPosition({
        x: current.x + delta.x,
        y: current.y + delta.y,
      }),
    );
  }

  async function confirmCrop() {
    const image = imageRef.current;
    if (!image || !imageReady) return;

    setExporting(true);
    setError(null);
    try {
      const output = document.createElement("canvas");
      output.width = config.outputWidth;
      output.height = config.outputHeight;
      const context = output.getContext("2d");
      if (!context) throw new Error("Canvas is not available.");

      const placement = getCropPlacement({
        position,
        sourceHeight: image.naturalHeight,
        sourceWidth: image.naturalWidth,
        targetHeight: config.outputHeight,
        targetWidth: config.outputWidth,
        zoom,
      });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        placement.x,
        placement.y,
        placement.drawWidth,
        placement.drawHeight,
      );

      const blob = await new Promise<Blob | null>((resolve) => {
        output.toBlob(resolve, "image/webp", 0.9);
      });
      if (!blob || blob.size === 0 || blob.size > 5 * 1024 * 1024) {
        throw new Error("Invalid crop output.");
      }

      const outputType =
        blob.type === "image/png" || blob.type === "image/jpeg"
          ? blob.type
          : "image/webp";
      const extension =
        outputType === "image/png"
          ? "png"
          : outputType === "image/jpeg"
            ? "jpg"
            : "webp";
      onConfirm(
        new File([blob], `${kind}-${crypto.randomUUID()}.${extension}`, {
          lastModified: Date.now(),
          type: outputType,
        }),
      );
    } catch {
      setError("Não foi possível gerar o recorte. Tente outra imagem.");
      setExporting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="crop-dialog-title"
      className="fixed inset-0 z-50 m-auto max-h-[calc(100svh-1rem)] w-[calc(100%-1rem)] max-w-2xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 p-0 text-white shadow-2xl backdrop:bg-slate-950/80 backdrop:backdrop-blur-sm"
      onCancel={(event) => {
        event.preventDefault();
        if (!exporting) onCancel();
      }}
    >
      <div className="flex max-h-[calc(100svh-1rem)] flex-col">
        <header className="flex items-start justify-between gap-4 px-4 pb-3 pt-5 sm:px-6 sm:pt-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
              Recortar imagem
            </p>
            <h2 id="crop-dialog-title" className="mt-1 text-xl font-black">
              {config.title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {config.description}
            </p>
          </div>
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
            onClick={onCancel}
            disabled={exporting}
            aria-label="Cancelar recorte"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-3 pb-3 sm:px-6 sm:pb-5">
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-inner">
            <canvas
              ref={canvasRef}
              width={config.previewWidth}
              height={config.previewHeight}
              className={`block w-full touch-none select-none ${kind === "cover" ? "aspect-video" : "aspect-square"} ${imageReady ? "cursor-grab active:cursor-grabbing" : ""}`}
              tabIndex={0}
              aria-label="Área de recorte. Arraste a imagem ou use as setas do teclado para reposicionar."
              onKeyDown={handleCropKeyboard}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
            />
            {!imageReady && !error ? (
              <div className="absolute inset-0 grid place-items-center">
                <LoaderCircle className="size-7 animate-spin text-emerald-300" aria-hidden />
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="crop-zoom" className="flex items-center gap-2 text-sm font-bold">
                <ZoomIn className="size-4 text-emerald-300" aria-hidden /> Zoom
              </label>
              <span className="text-xs font-bold tabular-nums text-slate-400">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <input
              id="crop-zoom"
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              disabled={!imageReady || exporting}
              className="mt-3 h-11 w-full cursor-pointer accent-emerald-400"
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Move className="size-3.5" aria-hidden /> Arraste para posicionar
              </span>
              <button
                type="button"
                onClick={resetCrop}
                disabled={exporting}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 font-bold text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <RotateCcw className="size-3.5" aria-hidden /> Centralizar
              </button>
            </div>
          </div>

          {error ? (
            <p role="alert" className="mt-3 rounded-xl bg-red-500/15 p-3 text-sm text-red-100">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="grid grid-cols-2 gap-2 border-t border-white/10 bg-slate-950 px-4 py-4 sm:flex sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="ghost"
            className="text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={onCancel}
            disabled={exporting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
            onClick={() => void confirmCrop()}
            disabled={!imageReady || exporting || Boolean(error)}
          >
            {exporting ? (
              <LoaderCircle className="animate-spin" aria-hidden />
            ) : (
              <Check aria-hidden />
            )}
            {exporting ? "Preparando..." : "Usar recorte"}
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
