import { describe, expect, it } from "vitest";
import { passwordUpdateErrorMessage, signUpErrorMessage } from "./messages";

describe("authentication messages", () => {
  it("does not disclose a duplicate registration", () => {
    expect(signUpErrorMessage("user_already_exists")).toBeNull();
    expect(signUpErrorMessage("email_exists")).toBeNull();
  });

  it("provides actionable non-identity errors", () => {
    expect(signUpErrorMessage("weak_password")).toContain("12 caracteres");
    expect(signUpErrorMessage("captcha_failed")).toContain("verificação");
    expect(signUpErrorMessage("over_email_send_rate_limit")).toContain("Aguarde");
  });

  it("keeps unknown registration failures generic", () => {
    expect(signUpErrorMessage("unexpected")).not.toContain("cadastrado");
  });

  it("maps password policy failures without exposing internals", () => {
    expect(passwordUpdateErrorMessage("weak_password")).toContain("12 caracteres");
    expect(passwordUpdateErrorMessage("unexpected")).toContain("novo link");
  });
});
