import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';

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

export async function GET(): Promise<NextResponse> {
  try {
    const pdfPath = path.join(process.cwd(), 'public', 'CLASS-ROUTINE-253.pdf');
    
    // Check if the file exists
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json({ error: 'Pre-uploaded PDF file not found' }, { status: 404 });
    }

    return new Promise<NextResponse>((resolve) => {
      const pdfParser = new PDFParser();

      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('PDF parsing error:', errData.parserError || errData);
        resolve(NextResponse.json({ error: 'Failed to parse the pre-uploaded PDF file' }, { status: 500 }));
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: PDFData) => {
        try {
          let text = '';
          pdfData.Pages.forEach((page: PDFPage) => {
            page.Texts.forEach((textItem: PDFText) => {
              textItem.R.forEach((textRun: PDFTextRun) => {
                text += decodeURIComponent(textRun.T) + ' ';
              });
            });
          });

          console.log('Successfully parsed pre-uploaded PDF, text length:', text.length);
          resolve(NextResponse.json({ text }));
        } catch (error) {
          console.error('Error processing PDF data:', error);
          resolve(NextResponse.json({ error: 'Error processing the pre-uploaded PDF file' }, { status: 500 }));
        }
      });

      pdfParser.loadPDF(pdfPath);
    });
  } catch (error) {
    console.error('Error loading pre-uploaded PDF:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
