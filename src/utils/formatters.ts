/**
 * Converts a string to Title Case: "hello world" -> "Hello World"
 */
export const titleCase = (str: string) =>
    str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Formats a digits-only string into Argentine CUIT format: XX-XXXXXXXX-X
 */
/**
 * Formats a digits-only string into Argentine CUIT format: XX-XXXXXXXX-X
 * Supports progressive formatting while typing.
 */
export const formatCUIT = (value: string) => {
    const clean = value.replace(/\D/g, "");
    const digits = clean.slice(0, 11);

    if (digits.length <= 2) return digits;
    if (digits.length <= 10) {
        return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
};

/**
 * Removes all non-numeric characters from a string
 */
export const cleanValue = (value: string) => value.replace(/\D/g, "");

/**
 * Validates Argentine CUIT format (XX-XXXXXXXX-X)
 */
export const cuitRegex = /^\d{2}-\d{8}-\d{1}$/;

/**
 * Formats a number or string as Argentine currency (thousands separator)
 * Example: 1000 -> "1.000"
 */
export const formatCurrency = (value: string | number) => {
    if (value === undefined || value === null || value === "") return "";
    const stringValue = typeof value === "number" ? value.toString() : value;
    const clean = stringValue.replace(/\D/g, "");
    if (!clean) return "";
    return Number(clean).toLocaleString("es-AR");
};

/**
 * Parses a formatted currency string back to a number
 * Example: "1.000" -> 1000
 */
export const parseCurrency = (value: string) => {
    if (!value) return 0;
    const clean = value.replace(/\D/g, "");
    return Number(clean) || 0;
};

/**
 * Validates Argentine phone format after +54 prefix (10-15 digits)
 */
export const phoneRegex = /^[1-9]\d{9,14}$/;

/**
 * Converts a string to Sentence Case: "hello world" -> "Hello world"
 */
export function sentenceCase(str: string): string {
    if (!str) return "";
    const lower = str.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}
