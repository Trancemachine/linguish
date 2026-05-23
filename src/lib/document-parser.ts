import { createHash } from "crypto";

export function hashFile(buffer: Buffer): string {
  return createHash("md5").update(buffer).digest("hex");
}

export async function parseDocument(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "txt") {
    return buffer.toString("utf-8");
  }

  if (ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === "png" || ext === "jpg" || ext === "jpeg") {
    const Tesseract = await import("tesseract.js");
    const { data } = await Tesseract.recognize(buffer, "eng");
    return data.text;
  }

  throw new Error(`不支持的文件格式: .${ext}`);
}

export const ALLOWED_EXTENSIONS = ["txt", "pdf", "docx", "png", "jpg", "jpeg"];
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
