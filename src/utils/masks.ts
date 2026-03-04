/**
 * Formats a string into Argentine CUIT format: XX-XXXXXXXX-X
 */
export function formatCUIT(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) {
        formatted = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }
    if (digits.length > 10) {
        formatted = `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10, 11)}`;
    }
    return formatted;
}

/**
 * Converts a string to Title Case: "hello world" -> "Hello World"
 * Preserves accents and handles multiple words.
 */
export function titleCase(str: string): string {
    if (!str) return "";
    return str
        .toLowerCase()
        .split(" ")
        .map(word => {
            if (word.length === 0) return "";
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
}
