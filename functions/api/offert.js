const DEFAULT_MAIL_TO = "kmxentreprenad@gmail.com";
const DEFAULT_MAIL_FROM = "info@kmxentreprenad.se";
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/heic",
    "image/heif"
]);

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const formData = await request.formData();

        if (getTextValue(formData, "website")) {
            return jsonResponse({ success: true }, 200);
        }

        const submission = {
            name: getTextValue(formData, "name"),
            phone: getTextValue(formData, "phone"),
            email: getTextValue(formData, "email"),
            address: getTextValue(formData, "address"),
            service: getTextValue(formData, "service"),
            projectSize: getTextValue(formData, "projectSize") || "Inte angivet",
            startDate: getTextValue(formData, "startDate") || "Inte angivet",
            description: getTextValue(formData, "description"),
            consent: getTextValue(formData, "consent") === "yes"
        };

        const validationError = validateSubmission(submission);

        if (validationError) {
            return jsonResponse({ success: false, message: validationError }, 400);
        }

        const attachments = await prepareAttachments(formData.getAll("attachments"));
        const attachmentsSummary = attachments.length
            ? attachments.map((file) => `${file.filename} (${formatBytes(file.size)})`).join("\n")
            : "Inga bilagor";

        const subject = `Ny offertförfrågan - ${submission.name}`;
        const plainTextMessage = [
            "Ny offertförfrågan från kmxentreprenad.se",
            "",
            `Namn: ${submission.name}`,
            `Telefon: ${submission.phone}`,
            `E-post: ${submission.email}`,
            `Adress: ${submission.address || "Inte angivet"}`,
            `Typ av arbete: ${submission.service}`,
            `Projektstorlek: ${submission.projectSize}`,
            `Önskad byggstart: ${submission.startDate}`,
            "",
            "Projektbeskrivning:",
            submission.description,
            "",
            "Bilagor:",
            attachmentsSummary
        ].join("\n");

        const htmlMessage = `
            <div style="margin:0;background:#f3f4f1;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#242722;line-height:1.5">
                <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e1e4de;border-radius:12px;overflow:hidden">
                    <div style="background:#1f6f3d;padding:24px 28px;color:#ffffff">
                        <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:.85">KMX Entreprenad</div>
                        <h1 style="margin:8px 0 0;font-size:25px;line-height:1.2;font-weight:700">Ny offertförfrågan</h1>
                    </div>
                    <div style="padding:28px">
                        <p style="margin:0 0 22px;color:#596057">En ny förfrågan har skickats via kmxentreprenad.se.</p>
                        <h2 style="margin:0 0 12px;font-size:17px;color:#1f6f3d">Kontaktuppgifter</h2>
                        <div style="border-top:1px solid #e6e9e4;border-bottom:1px solid #e6e9e4;padding:12px 0;margin-bottom:24px">
                            <p style="margin:4px 0"><strong>Namn:</strong> ${escapeHtml(submission.name)}</p>
                            <p style="margin:4px 0"><strong>Telefon:</strong> ${escapeHtml(submission.phone)}</p>
                            <p style="margin:4px 0"><strong>E-post:</strong> ${escapeHtml(submission.email)}</p>
                            <p style="margin:4px 0"><strong>Adress:</strong> ${escapeHtml(submission.address || "Inte angivet")}</p>
                        </div>
                        <h2 style="margin:0 0 12px;font-size:17px;color:#1f6f3d">Projekt</h2>
                        <p style="margin:4px 0"><strong>Typ av arbete:</strong> ${escapeHtml(submission.service)}</p>
                        <p style="margin:4px 0"><strong>Projektstorlek:</strong> ${escapeHtml(submission.projectSize)}</p>
                        <p style="margin:4px 0 24px"><strong>Önskad byggstart:</strong> ${escapeHtml(submission.startDate)}</p>
                        <div style="background:#f7f8f5;border-left:4px solid #d4a24c;padding:16px;margin-bottom:24px">
                            <h2 style="margin:0 0 8px;font-size:17px;color:#1f6f3d">Projektbeskrivning</h2>
                            <div>${escapeHtml(submission.description).replace(/\n/g, "<br>")}</div>
                        </div>
                        <p style="margin:0"><strong>Bilagor:</strong><br>${escapeHtml(attachmentsSummary).replace(/\n/g, "<br>")}</p>
                    </div>
                    <div style="background:#f7f8f5;padding:16px 28px;color:#687067;font-size:12px">Svara på detta mejl för att kontakta kunden direkt.</div>
                </div>
            </div>
        `;

        if (!env.RESEND_API_KEY) {
            console.error("RESEND_API_KEY is not configured.");
            return jsonResponse({
                success: false,
                message: "Mejltjänsten är inte konfigurerad ännu. Försök igen senare."
            }, 503);
        }

        const resendPayload = {
            from: env.MAIL_FROM || DEFAULT_MAIL_FROM,
            to: [env.MAIL_TO || DEFAULT_MAIL_TO],
            reply_to: submission.email,
            subject,
            text: plainTextMessage,
            html: htmlMessage
        };

        if (attachments.length > 0) {
            resendPayload.attachments = attachments.map(({ content, filename, type }) => ({
                content,
                filename,
                content_type: type
            }));
        }

        const mailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "Authorization": `Bearer ${env.RESEND_API_KEY}`
            },
            body: JSON.stringify(resendPayload)
        });

        if (!mailResponse.ok) {
            const errorText = await mailResponse.text();
            console.error("Resend error:", errorText);

            return jsonResponse({
                success: false,
                message: "Kunde inte skicka offertförfrågan just nu. Försök igen om en stund."
            }, 502);
        }

        return jsonResponse({ success: true }, 200);
    } catch (error) {
        console.error("Offert function error:", error);

        const isUserError = error && typeof error === "object" && error.isUserError === true;

        return jsonResponse({
            success: false,
            message: isUserError ? error.message : "Något gick fel när offertförfrågan skulle skickas."
        }, isUserError ? 400 : 500);
    }
}

function getTextValue(formData, fieldName) {
    const value = formData.get(fieldName);
    return typeof value === "string" ? value.trim() : "";
}

function validateSubmission(submission) {
    if (!submission.name) {
        return "Fyll i ditt namn.";
    }

    if (!submission.phone) {
        return "Fyll i ditt telefonnummer.";
    }

    if (!submission.email || !isValidEmail(submission.email)) {
        return "Fyll i en giltig e-postadress.";
    }

    if (!submission.service) {
        return "Välj vilken typ av arbete du behöver hjälp med.";
    }

    if (!submission.description) {
        return "Beskriv ditt projekt.";
    }

    if (!submission.consent) {
        return "Du behöver godkänna behandling av personuppgifter för att skicka formuläret.";
    }

    return "";
}

async function prepareAttachments(files) {
    const uploadedFiles = files.filter((file) => file && typeof file.arrayBuffer === "function" && file.size > 0);

    if (uploadedFiles.length > MAX_ATTACHMENTS) {
        throw createUserError(`Max ${MAX_ATTACHMENTS} bilagor per offertförfrågan.`);
    }

    let totalSize = 0;
    const attachments = [];

    for (const file of uploadedFiles) {
        totalSize += file.size;

        if (file.size > MAX_FILE_SIZE_BYTES) {
            throw createUserError(`Filen ${file.name} är för stor. Maxstorlek per fil är ${formatBytes(MAX_FILE_SIZE_BYTES)}.`);
        }

        if (totalSize > MAX_TOTAL_FILE_SIZE_BYTES) {
            throw createUserError(`Bilagorna är för stora tillsammans. Total maxstorlek är ${formatBytes(MAX_TOTAL_FILE_SIZE_BYTES)}.`);
        }

        const mimeType = getMimeType(file);

        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
            throw createUserError(`Filtypen för ${file.name} stöds inte. Använd PDF eller bildfiler.`);
        }

        const buffer = await file.arrayBuffer();

        attachments.push({
            filename: sanitizeFilename(file.name || "bilaga"),
            type: mimeType,
            size: file.size,
            content: arrayBufferToBase64(buffer)
        });
    }

    return attachments;
}

function createUserError(message) {
    const error = new Error(message);
    error.isUserError = true;
    return error;
}

function getMimeType(file) {
    if (file.type) {
        return file.type.toLowerCase();
    }

    const lowerName = (file.name || "").toLowerCase();

    if (lowerName.endsWith(".pdf")) return "application/pdf";
    if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
    if (lowerName.endsWith(".png")) return "image/png";
    if (lowerName.endsWith(".webp")) return "image/webp";
    if (lowerName.endsWith(".gif")) return "image/gif";
    if (lowerName.endsWith(".avif")) return "image/avif";
    if (lowerName.endsWith(".heic")) return "image/heic";
    if (lowerName.endsWith(".heif")) return "image/heif";

    return "application/octet-stream";
}

function sanitizeFilename(filename) {
    return filename.replace(/[\r\n]+/g, " ").trim();
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";

    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }

    return btoa(binary);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function jsonResponse(data, status) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store"
        }
    });
}
