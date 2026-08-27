export type ClerkErrorLocale = "en" | "it";
export type ClerkErrorContext = "login" | "signup" | "recovery" | "verification";

type ErrorDetail = {
  code?: unknown;
  message?: unknown;
  shortMessage?: unknown;
  longMessage?: unknown;
  meta?: { paramName?: unknown };
};

const messages = {
  en: {
    compromised: "This password has appeared in a known data breach. Please choose a different password.",
    tooShort: "Password must contain at least 8 characters.",
    weak: "Please choose a stronger password.",
    identifierPassword: "Your password cannot contain your email or username.",
    tooLong: "This password is too long.",
    mismatch: "Passwords do not match.",
    incorrectPassword: "Incorrect password.",
    credentials: "Incorrect email/username or password.",
    rateLimited: "Too many attempts. Please wait a moment and try again.",
    invalidCode: "Invalid verification code.",
    expiredCode: "This verification code has expired. Request a new one.",
    emailExists: "An account with this email already exists.",
    usernameExists: "This username is unavailable.",
    invalidEmail: "Enter a valid email address.",
    verificationFailed: "We couldn't verify that code. Please try again.",
    fallback: "We couldn't complete that request. Please try again.",
  },
  it: {
    compromised: "Questa password risulta presente in una violazione di dati nota. Scegline un'altra.",
    tooShort: "La password deve contenere almeno 8 caratteri.",
    weak: "Scegli una password più sicura.",
    identifierPassword: "La password non può contenere la tua email o il tuo username.",
    tooLong: "Questa password è troppo lunga.",
    mismatch: "Le password non coincidono.",
    incorrectPassword: "Password errata.",
    credentials: "Email/username o password non corretti.",
    rateLimited: "Troppi tentativi. Attendi un momento e riprova.",
    invalidCode: "Codice di verifica non valido.",
    expiredCode: "Il codice di verifica è scaduto. Richiedine uno nuovo.",
    emailExists: "Esiste già un account con questa email.",
    usernameExists: "Questo username non è disponibile.",
    invalidEmail: "Inserisci un indirizzo email valido.",
    verificationFailed: "Non è stato possibile verificare il codice. Riprova.",
    fallback: "Non è stato possibile completare la richiesta. Riprova.",
  },
} as const;

export function getClerkAuthMessages(locale: ClerkErrorLocale) {
  return messages[locale];
}

function detailFrom(error: unknown): ErrorDetail {
  if (!error || typeof error !== "object") return {};
  const response = error as ErrorDetail & { errors?: unknown };
  if (Array.isArray(response.errors) && response.errors[0] && typeof response.errors[0] === "object") {
    return response.errors[0] as ErrorDetail;
  }
  return response;
}

export function getClerkErrorMessage(
  error: unknown,
  locale: ClerkErrorLocale,
  context: ClerkErrorContext,
): string {
  const text = messages[locale];
  const detail = detailFrom(error);
  const code = typeof detail.code === "string" ? detail.code : "";
  const paramName = typeof detail.meta?.paramName === "string" ? detail.meta.paramName : "";

  switch (code) {
    case "form_password_pwned":
    case "form_password_compromised": return text.compromised;
    case "form_password_length_too_short": return text.tooShort;
    case "form_password_not_strong_enough": return text.weak;
    case "form_password_matches_identifier": return text.identifierPassword;
    case "form_password_size_in_bytes_exceeded": return text.tooLong;
    case "form_password_incorrect": return text.incorrectPassword;
    case "form_password_or_identifier_incorrect":
    case "form_identifier_not_found": return text.credentials;
    case "form_code_incorrect": return text.invalidCode;
    case "verification_expired": return text.expiredCode;
    case "too_many_requests": return text.rateLimited;
    case "form_identifier_exists__email_address": return text.emailExists;
    case "form_identifier_exists__username": return text.usernameExists;
    case "form_param_format_invalid":
    case "form_param_value_invalid":
      return context === "signup" && (!paramName || paramName.includes("email")) ? text.invalidEmail : text.fallback;
    case "verification_failed": return text.verificationFailed;
    default: return context === "login" && code ? text.credentials : text.fallback;
  }
}
