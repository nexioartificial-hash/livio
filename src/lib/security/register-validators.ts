/**
 * Registration form validators — clinic name, CUIT, email.
 * Used client-side for UX and server-side for security.
 */

// ─── Title Case Inteligente ──────────────────────────────────

const LOWERCASE_WORDS = new Set(["de", "del", "la", "las", "los", "el", "y", "e"]);
const UPPERCASE_WORDS: Record<string, string> = {
    srl: "SRL", sa: "SA", sas: "SAS", cuit: "CUIT",
    dr: "Dr.", "dr.": "Dr.", dra: "Dra.", "dra.": "Dra.", dres: "Dres.",
};

export function toTitleCase(input: string): string {
    const sanitized = sanitizeText(input);
    const words = sanitized.split(/\s+/);

    return words
        .map((word, index) => {
            const lower = word.toLowerCase();

            // Check uppercase exceptions (SRL, Dr., etc.)
            if (UPPERCASE_WORDS[lower]) return UPPERCASE_WORDS[lower];

            // Check lowercase exceptions (de, del, etc.) — except first word
            if (index > 0 && LOWERCASE_WORDS.has(lower)) return lower;

            // Standard title case
            if (lower.length === 0) return "";
            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .filter(Boolean)
        .join(" ");
}

// ─── Sanitización de Texto ───────────────────────────────────

export function sanitizeText(value: string): string {
    return value
        .replace(/<[^>]*>/g, "")         // Strip HTML tags
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "") // Remove emojis
        .replace(/\s+/g, " ")            // Multiple spaces → single
        .trim();
}

// ─── Validación de Nombre de Clínica ─────────────────────────

const CLINIC_NAME_REGEX = /^[a-záéíóúñüA-ZÁÉÍÓÚÑÜ0-9\s.\-,&]+$/;

export function validateClinicName(name: string): { valid: boolean; error?: string } {
    const trimmed = sanitizeText(name);

    if (!trimmed) return { valid: false, error: "Ingresá el nombre de tu clínica o consultorio" };
    if (trimmed.length < 3) return { valid: false, error: "El nombre debe tener al menos 3 caracteres" };
    if (trimmed.length > 100) return { valid: false, error: "El nombre no puede superar los 100 caracteres" };
    if (!CLINIC_NAME_REGEX.test(trimmed)) return { valid: false, error: "El nombre contiene caracteres no permitidos" };
    if (/^\d+$/.test(trimmed)) return { valid: false, error: "El nombre debe contener letras" };

    return { valid: true };
}

// ─── Validación de CUIT Argentino ────────────────────────────

const CUIT_TIPOS_VALIDOS = ["20", "23", "24", "25", "26", "27", "30", "33", "34"];

export function formatCUIT(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10, 11)}`;
}

export function validateCUIT(cuit: string): { valid: boolean; error?: string } {
    if (!cuit || !cuit.trim()) return { valid: true }; // Optional field

    const cleaned = cuit.replace(/\D/g, "");

    if (cleaned.length !== 11) {
        return { valid: false, error: "El CUIT debe tener 11 dígitos (XX-XXXXXXXX-X)" };
    }

    const tipo = cleaned.substring(0, 2);
    if (!CUIT_TIPOS_VALIDOS.includes(tipo)) {
        return { valid: false, error: "El tipo de CUIT no es válido" };
    }

    // Módulo 11 verification
    const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 10; i++) {
        suma += parseInt(cleaned[i]) * multiplicadores[i];
    }
    const resto = suma % 11;
    let digitoEsperado: number;
    if (resto === 0) digitoEsperado = 0;
    else if (resto === 1) digitoEsperado = 9;
    else digitoEsperado = 11 - resto;

    if (parseInt(cleaned[10]) !== digitoEsperado) {
        return { valid: false, error: "El CUIT ingresado no es válido. Verificá los números" };
    }

    return { valid: true };
}

// ─── Validación de Email ─────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const DISPOSABLE_DOMAINS = new Set([
    "tempmail.com", "guerrillamail.com", "mailinator.com", "yopmail.com",
    "throwaway.email", "temp-mail.org", "fakeinbox.com", "sharklasers.com",
    "guerrillamailblock.com", "grr.la", "dispostable.com", "mailnesia.com",
    "maildrop.cc", "discard.email", "trashmail.com", "10minutemail.com",
    "minutemail.com", "tempail.com", "mohmal.com", "getnada.com",
]);

// Common domain typos → corrections
const DOMAIN_TYPOS: Record<string, string> = {
    "gnail.com": "gmail.com", "gmial.com": "gmail.com", "gamil.com": "gmail.com",
    "gmai.com": "gmail.com", "gmail.co": "gmail.com", "gmaill.com": "gmail.com",
    "hotmal.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmial.com": "hotmail.com",
    "hotamil.com": "hotmail.com", "hotmail.co": "hotmail.com",
    "outlok.com": "outlook.com", "outloo.com": "outlook.com", "outlool.com": "outlook.com",
    "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.co": "yahoo.com",
};

export function validateEmail(email: string): { valid: boolean; error?: string; suggestion?: string } {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) return { valid: false, error: "Ingresá tu email corporativo" };
    if (trimmed.length > 255) return { valid: false, error: "El email es demasiado largo" };
    if (!EMAIL_REGEX.test(trimmed)) return { valid: false, error: "El formato del email no es válido" };

    const domain = trimmed.split("@")[1];
    if (!domain) return { valid: false, error: "El formato del email no es válido" };

    // Check disposable emails
    if (DISPOSABLE_DOMAINS.has(domain)) {
        return { valid: false, error: "No se permiten emails temporales. Usá tu email real" };
    }

    // Check domain typos
    if (DOMAIN_TYPOS[domain]) {
        const corrected = trimmed.replace(domain, DOMAIN_TYPOS[domain]);
        return { valid: true, suggestion: `¿Quisiste decir ${corrected}?` };
    }

    return { valid: true };
}
