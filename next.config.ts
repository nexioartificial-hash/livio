import type { NextConfig } from "next";

const securityHeaders = [
    // Prevent clickjacking — deny all framing
    { key: "X-Frame-Options", value: "DENY" },
    // Prevent MIME-type sniffing
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Control referrer information sent with requests
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Restrict browser features the app doesn't need
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    // Enable DNS prefetching for performance
    { key: "X-DNS-Prefetch-Control", value: "on" },
    // Force HTTPS for 1 year, including subdomains
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
    // Disable legacy XSS filter (modern browsers don't need it, can cause issues)
    { key: "X-XSS-Protection", value: "0" },
    // Content Security Policy — restrict what can load and execute
    {
        key: "Content-Security-Policy",
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://connect.facebook.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob: https: http:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://graph.facebook.com https://api.mercadopago.com https://www.facebook.com",
            "frame-src 'self' https://accounts.google.com https://www.facebook.com https://web.facebook.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join("; "),
    },
];

const nextConfig: NextConfig = {
    headers: async () => [
        {
            source: "/(.*)",
            headers: securityHeaders,
        },
    ],
};

export default nextConfig;
