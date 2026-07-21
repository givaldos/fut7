import { describe, expect, it } from "vitest";

import { clampCropPosition, getCropPlacement } from "./crop";

describe("image crop placement", () => {
  it("centers a landscape image inside a square crop", () => {
    expect(
      getCropPlacement({
        position: { x: 0, y: 0 },
        sourceHeight: 1000,
        sourceWidth: 2000,
        targetHeight: 1000,
        targetWidth: 1000,
        zoom: 1,
      }),
    ).toEqual({ drawHeight: 1000, drawWidth: 2000, x: -500, y: 0 });
  });

  it("moves the image only within the crop boundaries", () => {
    expect(
      getCropPlacement({
        position: { x: 1, y: -1 },
        sourceHeight: 2000,
        sourceWidth: 1000,
        targetHeight: 1000,
        targetWidth: 1000,
        zoom: 1,
      }),
    ).toEqual({ drawHeight: 2000, drawWidth: 1000, x: 0, y: -1000 });
  });

  it("clamps zoom and position values from untrusted controls", () => {
    expect(clampCropPosition({ x: 10, y: -10 })).toEqual({ x: 1, y: -1 });
    expect(
      getCropPlacement({
        position: { x: 10, y: -10 },
        sourceHeight: 100,
        sourceWidth: 100,
        targetHeight: 100,
        targetWidth: 100,
        zoom: 10,
      }),
    ).toEqual({ drawHeight: 300, drawWidth: 300, x: 0, y: -200 });
  });

  it("rejects invalid image dimensions", () => {
    expect(() =>
      getCropPlacement({
        position: { x: 0, y: 0 },
        sourceHeight: 0,
        sourceWidth: 100,
        targetHeight: 100,
        targetWidth: 100,
        zoom: 1,
      }),
    ).toThrow("Image and crop dimensions must be positive.");
  });
});
