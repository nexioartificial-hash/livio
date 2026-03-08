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
 * Validates Argentine phone format after +54 prefix (10-15 digits)
 */
export const phoneRegex = /^[1-9]\d{9,14}$/;
