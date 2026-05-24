// Standalone seed extractor — run with: npx tsx scripts/extract-seed.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const PDF_FILES = [
  "E:\\software study\\harness-engineering-book.pdf",
  "E:\\software study\\DeepSeek_R1.pdf",
];

async function extractTextPdf(buffer: Buffer): Promise<string> {
  // Dynamic import for pdf-parse (ESM)
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function main() {
  const docs: any[] = [];

  for (const pdfPath of PDF_FILES) {
    if (!existsSync(pdfPath)) {
      console.error(`NOT FOUND: ${pdfPath}`);
      continue;
    }

    const buffer = readFileSync(pdfPath);
    const fileName = pdfPath.split("\\").pop();
    console.log(`Processing ${fileName} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)...`);

    const text = await extractTextPdf(buffer);
    const trimmed = text.trim();
    console.log(`  → ${trimmed.length} chars extracted`);

    docs.push({
      file_name: fileName,
      text: trimmed,
    });
  }

  const seedDir = join(process.cwd(), ".seed");
  if (!existsSync(seedDir)) mkdirSync(seedDir, { recursive: true });

  // Save raw text first (AI extraction happens at apply time)
  for (const doc of docs) {
    const safeName = doc.file_name.replace(/\.pdf$/i, "");
    writeFileSync(join(seedDir, `${safeName}.txt`), doc.text, "utf-8");
    console.log(`Saved ${safeName}.txt`);
  }

  // Save manifest
  writeFileSync(
    join(seedDir, "manifest.json"),
    JSON.stringify(
      { version: 1, generated_at: new Date().toISOString(), documents: docs.map((d) => ({ file_name: d.file_name, text_length: d.text.length })) },
      null,
      2,
    ),
    "utf-8",
  );

  console.log("Done! Seed text files saved to .seed/");
}

main().catch(console.error);
