import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./redirects";

describe("safeInternalPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeInternalPath("/app/meu-time?tab=agenda#hoje")).toBe(
      "/app/meu-time?tab=agenda#hoje",
    );
  });

  it.each([
    "https://evil.example/roubo",
    "//evil.example/roubo",
    "/\\evil.example",
    "javascript:alert(1)",
    "/app\nLocation:https://evil.example",
  ])("rejeita redirecionamento inseguro: %s", (value) => {
    expect(safeInternalPath(value)).toBe("/app");
  });
});

