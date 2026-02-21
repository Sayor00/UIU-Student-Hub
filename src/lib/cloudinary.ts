import crypto from "crypto";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
const API_KEY = process.env.CLOUDINARY_API_KEY!;
const API_SECRET = process.env.CLOUDINARY_API_SECRET!;

/**
 * Generate a SHA-1 signature for Cloudinary API requests.
 */
function generateSignature(params: Record<string, string>) {
    const sorted = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&");
    return crypto.createHash("sha1").update(sorted + API_SECRET).digest("hex");
}

/**
 * Upload a file buffer to Cloudinary using the REST API.
 * Returns { url, publicId, resourceType, format, pages, bytes }.
 */
export async function uploadToCloudinary(
    buffer: Buffer,
    options: {
        folder?: string;
        resourceType?: "image" | "raw" | "auto";
        fileName?: string;
    } = {}
) {
    const { folder = "question-bank", resourceType = "auto", fileName } = options;

    const timestamp = Math.floor(Date.now() / 1000).toString();

    const paramsToSign: Record<string, string> = {
        timestamp,
        folder,
        access_mode: "public",
    };

    if (fileName) {
        paramsToSign.public_id = fileName.replace(/\.[^/.]+$/, "");
    }

    const signature = generateSignature(paramsToSign);

    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(buffer)]));
    formData.append("timestamp", timestamp);
    formData.append("folder", folder);
    formData.append("access_mode", "public");
    formData.append("api_key", API_KEY);
    formData.append("signature", signature);

    if (fileName) {
        formData.append("public_id", fileName.replace(/\.[^/.]+$/, ""));
    }

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
        { method: "POST", body: formData }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Cloudinary upload failed: ${err}`);
    }

    const result = await res.json();

    return {
        url: result.secure_url as string,
        publicId: result.public_id as string,
        resourceType: result.resource_type as string,
        format: result.format as string,
        pages: result.pages as number | undefined,
        bytes: result.bytes as number,
    };
}

/**
 * Delete a file from Cloudinary by publicId using the REST API.
 */
export async function deleteFromCloudinary(
    publicId: string,
    resourceType: string = "image"
) {
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const paramsToSign: Record<string, string> = {
        public_id: publicId,
        timestamp,
    };

    const signature = generateSignature(paramsToSign);

    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("timestamp", timestamp);
    formData.append("api_key", API_KEY);
    formData.append("signature", signature);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/destroy`,
        { method: "POST", body: formData }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Cloudinary delete failed: ${err}`);
    }

    return res.json();
}
