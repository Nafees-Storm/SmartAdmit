export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const webhookUrl = process.env.N8N_VERIFY_DOCS_WEBHOOK_URL;
        if (!webhookUrl) {
            return Response.json(
                { success: false, message: "Missing env: N8N_VERIFY_DOCS_WEBHOOK_URL" },
                { status: 500 }
            );
        }

        const formData = await req.formData();

        // text fields
        const name = String(formData.get("name") || "");
        const claimedFscPercentage = Number(formData.get("claimedFscPercentage") || 0);
        const claimedIeltsBand = Number(formData.get("claimedIeltsBand") || 0);

        const programName = String(formData.get("programName") || "");
        const totalFee = Number(formData.get("totalFee") || 0);
        const depositFee = Number(formData.get("depositFee") || 0);

        // files
        const fsc = formData.get("fsc");
        const cnic = formData.get("cnic");
        const passport = formData.get("passport");
        const ielts = formData.get("ielts");

        // We'll send "present/missing" info to n8n (so n8n can handle missing-doc path)
        const payload = {
            name,
            claimedFscPercentage,
            claimedIeltsBand,
            programName,
            totalFee,
            depositFee,
            docs: {
                fscPresent: !!fsc,
                cnicPresent: !!cnic,
                passportPresent: !!passport,
                ieltsPresent: !!ielts,
                // optional: send filenames (helps debugging)
                fscFileName: fsc instanceof File ? fsc.name : null,
                cnicFileName: cnic instanceof File ? cnic.name : null,
                passportFileName: passport instanceof File ? passport.name : null,
                ieltsFileName: ielts instanceof File ? ielts.name : null,
            },
        };

        const n8nRes = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const text = await n8nRes.text();
        const contentType = n8nRes.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            return Response.json(
                {
                    success: false,
                    message: "n8n did not return JSON",
                    status: n8nRes.status,
                    raw: text.slice(0, 400),
                },
                { status: 500 }
            );
        }

        const data = JSON.parse(text);
        return Response.json(data, { status: n8nRes.status });
    } catch (err) {
        console.error("verify route error:", err);
        return Response.json(
            { success: false, message: "Server error during verification." },
            { status: 500 }
        );
    }
}
