export async function mergeFilesToPDF(files: File[], filename: string): Promise<File> {
    const { PDFDocument } = await import("pdf-lib");

    // Create new PDF document
    const mergedPdf = await PDFDocument.create();

    // Standard A4 dimensions in points
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.type === "application/pdf") {
            const donorPdfBytes = await file.arrayBuffer();
            const donorPdf = await PDFDocument.load(donorPdfBytes);
            const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));

        } else if (file.type.startsWith("image/")) {
            // Standardize to JPEG using Canvas to handle WEBP/PNG transparent backgrounds
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const url = URL.createObjectURL(file);
                const image = new Image();
                image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
                image.onerror = reject;
                image.src = url;
            });

            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) continue;

            ctx.fillStyle = "#FFFFFF"; // Clean white background
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            // Get standard JPEG as array buffer
            const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
            // Convert data URL to buffer
            const res = await fetch(dataUrl);
            const imageBuffer = await res.arrayBuffer();

            // Embed in PDF
            const embeddedJpg = await mergedPdf.embedJpg(imageBuffer);

            // Calculate dimensions to fit A4
            const imgRatio = img.width / img.height;
            let renderWidth = A4_WIDTH;
            let renderHeight = A4_WIDTH / imgRatio;

            // Constrain by height if needed
            if (renderHeight > A4_HEIGHT) {
                renderHeight = A4_HEIGHT;
                renderWidth = A4_HEIGHT * imgRatio;
            }

            // Center image (pdf-lib origin is bottom-left)
            const x = (A4_WIDTH - renderWidth) / 2;
            const y = (A4_HEIGHT - renderHeight) / 2;

            const page = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);
            page.drawImage(embeddedJpg, {
                x,
                y,
                width: renderWidth,
                height: renderHeight,
            });
        }
    }

    const pdfBytes = await mergedPdf.save();
    const finalFilename = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
    return new File([new Uint8Array(pdfBytes)], finalFilename, { type: "application/pdf" });
}
