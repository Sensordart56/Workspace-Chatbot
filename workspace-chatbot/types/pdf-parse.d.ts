declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    [key: string]: any;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: any;
    version: string;
    text: string;
  }

  type PDFParser = (dataBuffer: Buffer, options?: any) => Promise<PDFData>;

  const pdf: PDFParser;
  export = pdf;
}
