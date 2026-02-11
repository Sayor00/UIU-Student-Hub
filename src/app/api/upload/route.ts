import { NextRequest, NextResponse } from "next/server";
import PDFParser from "pdf2json";

interface PDFTextRun {
  T: string;
}

interface PDFText {
  R: PDFTextRun[];
}

interface PDFPage {
  Texts: PDFText[];
}

interface PDFData {
  Pages: PDFPage[];
}

export async function POST(req: NextRequest) {
  const data = await req.formData();
  const file = data.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const pdfParser = new PDFParser();

  const parsePromise = new Promise((resolve, reject) => {
    pdfParser.on("pdfParser_dataError", (errData: any) => {
      console.error(errData.parserError || errData);
      reject(new Error("Failed to parse PDF"));
    });
    pdfParser.on("pdfParser_dataReady", (pdfData: PDFData) => {
      // Manually reconstruct the text content from the parsed data
      const rawText = pdfData.Pages.reduce((acc: string, page: PDFPage) => {
        return (
          acc +
          page.Texts.reduce((pageText: string, text: PDFText) => {
            return pageText + decodeURIComponent(text.R[0].T) + " ";
          }, "") + "\n"
        );
      }, "");
      resolve(rawText);
    });
    pdfParser.parseBuffer(buffer);
  });

  try {
    const text = await parsePromise;
    return NextResponse.json({ text });
  } catch (error: unknown) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "Failed to parse PDF";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
