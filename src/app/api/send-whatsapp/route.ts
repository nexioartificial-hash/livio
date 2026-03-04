import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({ message: "WhatsApp API is alive" });
}

export async function POST(req: Request) {
    try {
        const { to, body, type, template } = await req.json();
        const PHONE_ID = "935474726325053";
        const TOKEN = "EAAMJNZBekQzYBQZB3mTE9gwrJWI6Ek9v8pWVyMNLsfX9kQHZBtSnpD1yIQcY3xH6DlyrN8mQbPkOzdHMRQLVFKZAghOjZCDUZCoR5HRXpbhBNcoZBZCA7spTvUnnrhYLarSWd5QNvUNXU52qlwQidV5eBBozyQBP0nDIHVluvqyjs2Jb3qWnHpm5PJ3oSsrhnzPau7BuT3AiXCpCoNBWAsHhZAlxTNMROAWq2iqPakGkJD2ju4PD6yGTkDkz5paGU9QVvs4aadqTO9qS2QTMA4Ex5nRWXBgZDZD";

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

        console.log("🚀 [WhatsApp API] Sending Payload:", JSON.stringify(messagePayload, null, 2));

        const response = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(messagePayload),
        });

        const responseText = await response.text();
        console.log("📡 [WhatsApp API] Raw Response:", responseText);

        let data: any = {};
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            console.error("🔥 [WhatsApp API] JSON Parse Error:", e);
            data = { error: "Invalid JSON response from Facebook", raw: responseText };
        }

        console.log("📡 [WhatsApp API] Data Object:", JSON.stringify(data, null, 2));

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("🔥 [WhatsApp API] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
