const RATE_LIMIT_CODES = new Set([
  "over_email_send_rate_limit",
  "over_request_rate_limit",
  "over_request_rate_limit",
]);

export function signUpErrorMessage(code?: string): string | null {
  // A duplicate must follow the same visible path as a successful request to
  // avoid turning registration into an account-enumeration endpoint.
  if (code === "user_already_exists" || code === "email_exists") return null;
  if (RATE_LIMIT_CODES.has(code ?? "")) {
    return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
  }
  if (code === "weak_password") {
    return "A senha não atende aos requisitos de segurança. Use pelo menos 12 caracteres e evite senhas conhecidas.";
  }
  if (code === "email_address_invalid" || code === "validation_failed") {
    return "Informe um endereço de e-mail válido.";
  }
  if (code === "captcha_failed") {
    return "A verificação de segurança expirou. Faça a verificação novamente.";
  }
  return "Não foi possível processar o cadastro agora. Tente novamente mais tarde.";
}

export function passwordUpdateErrorMessage(code?: string): string {
  if (code === "weak_password") {
    return "A senha não atende aos requisitos de segurança. Use pelo menos 12 caracteres e evite senhas conhecidas.";
  }
  if (code === "same_password") {
    return "A nova senha precisa ser diferente da senha atual.";
  }
  return "Não foi possível atualizar a senha. Solicite um novo link de recuperação.";
}
