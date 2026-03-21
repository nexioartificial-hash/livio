/**
 * Password strength validation for registration and password change.
 *
 * Policy:
 *  - Minimum 8 characters
 *  - At least 1 uppercase letter
 *  - At least 1 lowercase letter
 *  - At least 1 digit
 *  - At least 1 special character
 *  - Must not contain the user's email or name
 *  - Must not be in the top common passwords list
 */

// Top 100 most common passwords (abbreviated — extend as needed)
const COMMON_PASSWORDS = new Set([
    "password", "123456", "12345678", "qwerty", "abc123", "monkey", "1234567",
    "letmein", "trustno1", "dragon", "baseball", "iloveyou", "master", "sunshine",
    "ashley", "michael", "shadow", "123123", "654321", "superman", "qazwsx",
    "football", "password1", "password123", "admin", "welcome", "login",
    "princess", "starwars", "solo", "passw0rd", "hello", "charlie", "donald",
    "password1!", "123456789", "1234567890", "000000", "111111", "121212",
    "1q2w3e4r", "qwerty123", "password!", "changeme", "test1234", "admin123",
    "root", "toor", "guest", "default", "access", "public", "private",
    "dental", "clinica", "odontologia", "dentista", "livio", "livio123",
]);

export interface PasswordValidationResult {
    valid: boolean;
    score: number;       // 0-5 (0=very weak, 5=strong)
    errors: string[];
}

export function validatePassword(
    password: string,
    email?: string,
    fullName?: string,
): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 8) {
        errors.push("Debe tener al menos 8 caracteres");
    } else {
        score++;
        if (password.length >= 12) score++; // Bonus for longer passwords
    }

    // Uppercase
    if (!/[A-Z]/.test(password)) {
        errors.push("Debe incluir al menos una mayúscula");
    } else {
        score++;
    }

    // Lowercase
    if (!/[a-z]/.test(password)) {
        errors.push("Debe incluir al menos una minúscula");
    }

    // Digit
    if (!/\d/.test(password)) {
        errors.push("Debe incluir al menos un número");
    } else {
        score++;
    }

    // Special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
        errors.push("Debe incluir al menos un carácter especial (!@#$%...)");
    } else {
        score++;
    }

    // Check against email
    if (email) {
        const emailLocal = email.split("@")[0].toLowerCase();
        if (emailLocal.length >= 3 && password.toLowerCase().includes(emailLocal)) {
            errors.push("No puede contener tu email");
        }
    }

    // Check against full name
    if (fullName) {
        const nameParts = fullName.toLowerCase().split(/\s+/).filter(p => p.length >= 3);
        for (const part of nameParts) {
            if (password.toLowerCase().includes(part)) {
                errors.push("No puede contener tu nombre");
                break;
            }
        }
    }

    // Common passwords check
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
        errors.push("Esta contraseña es muy común");
        score = 0;
    }

    return {
        valid: errors.length === 0,
        score: Math.min(score, 5),
        errors,
    };
}

/**
 * Returns a label and color for the password strength indicator.
 */
export function getStrengthLabel(score: number): { label: string; color: string } {
    switch (score) {
        case 0: return { label: "Muy débil", color: "#ef4444" };
        case 1: return { label: "Débil", color: "#f97316" };
        case 2: return { label: "Regular", color: "#eab308" };
        case 3: return { label: "Buena", color: "#22c55e" };
        case 4: return { label: "Fuerte", color: "#16a34a" };
        case 5: return { label: "Muy fuerte", color: "#15803d" };
        default: return { label: "", color: "#94a3b8" };
    }
}
