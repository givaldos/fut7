import { normalizePhone } from "./phone";
import { describe, expect, it } from "vitest";

describe("Brazilian phone normalization", () => {
  it.each([
    ["11999999999", "+5511999999999"],
    ["(11) 99999-9999", "+5511999999999"],
    ["5511999999999", "+5511999999999"],
    ["+55 11 99999-9999", "+5511999999999"],
    ["+1 (555) 555-0100", "+15555550100"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "999", "551199", "abc", "005511999999999"])(
    "rejects malformed input %s",
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );
});

