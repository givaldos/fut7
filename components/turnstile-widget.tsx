"use client";

import Script from "next/script";

declare global {
  interface Window {
    turnstile?: { reset: () => void };
  }
}

export function TurnstileWidget({
  siteKey,
  nonce,
  action,
}: {
  siteKey?: string;
  nonce?: string;
  action: string;
}) {
  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        nonce={nonce}
      />
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-action={action}
        data-theme="light"
      />
    </>
  );
}

export function getTurnstileToken(form: HTMLFormElement) {
  return new FormData(form).get("cf-turnstile-response")?.toString() || undefined;
}

export function resetTurnstile() {
  window.turnstile?.reset();
}
