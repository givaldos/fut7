export type CropPosition = {
  x: number;
  y: number;
};

export type CropPlacement = {
  drawHeight: number;
  drawWidth: number;
  x: number;
  y: number;
};

export function clampCropPosition(position: CropPosition): CropPosition {
  return {
    x: Math.min(1, Math.max(-1, position.x)),
    y: Math.min(1, Math.max(-1, position.y)),
  };
}

export function getCropPlacement({
  position,
  sourceHeight,
  sourceWidth,
  targetHeight,
  targetWidth,
  zoom,
}: {
  position: CropPosition;
  sourceHeight: number;
  sourceWidth: number;
  targetHeight: number;
  targetWidth: number;
  zoom: number;
}): CropPlacement {
  if (
    sourceHeight <= 0 ||
    sourceWidth <= 0 ||
    targetHeight <= 0 ||
    targetWidth <= 0
  ) {
    throw new Error("Image and crop dimensions must be positive.");
  }

  const safeZoom = Math.min(3, Math.max(1, zoom));
  const safePosition = clampCropPosition(position);
  const scale = Math.max(
    targetWidth / sourceWidth,
    targetHeight / sourceHeight,
  ) * safeZoom;
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const horizontalTravel = Math.max(0, drawWidth - targetWidth) / 2;
  const verticalTravel = Math.max(0, drawHeight - targetHeight) / 2;

  return {
    drawHeight,
    drawWidth,
    x: (targetWidth - drawWidth) / 2 + safePosition.x * horizontalTravel,
    y: (targetHeight - drawHeight) / 2 + safePosition.y * verticalTravel,
  };
}
