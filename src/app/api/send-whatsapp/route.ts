import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    return NextResponse.json({ message: "WhatsApp API is alive" });
}

export async function POST(req: Request) {
    // Require authenticated session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { to, body, type, template } = await req.json();

        const PHONE_ID = process.env.META_PHONE_ID;
        const TOKEN = process.env.META_ACCESS_TOKEN;

        if (!PHONE_ID || !TOKEN) {
            return NextResponse.json({ error: "WhatsApp not configured" }, { status: 503 });
        }

        const messagePayload: any = {
            messaging_product: "whatsapp",
            to: to || "+541150634710",
            type: type || "text",
        };

        if (type === "template") {
            messagePayload.template = template || {
                name: "hello_world",
                language: { code: "en_US" }
            };
        } else {
            messagePayload.text = { body: body || "¡Test Livio SaaS Dental - Cita confirmada!" };
        }

        const response = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(messagePayload),
        });

        const responseText = await response.text();

        let data: any = {};
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            data = { error: "Invalid JSON response from Facebook", raw: responseText };
        }

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
