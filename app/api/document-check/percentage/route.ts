export async function POST(req: Request) {
    const body = await req.json();

    const webhookUrl = process.env.N8N_CHECK_PERCENTAGE_WEBHOOK_URL;

    if (!webhookUrl) {
        return Response.json(
            { success: false, message: "Missing env: N8N_CHECK_PERCENTAGE_WEBHOOK_URL" },
            { status: 500 }
        );
    }

    const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const text = await res.text();

    try {
        const data = JSON.parse(text);
        return Response.json(data, { status: res.status });
    } catch {
        return Response.json(
            {
                success: false,
                message: "n8n did not return JSON",
                status: res.status,
                raw: text.slice(0, 300),
            },
            { status: 500 }
        );
    }
}
