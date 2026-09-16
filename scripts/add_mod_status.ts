import fs from 'fs';
let content = fs.readFileSync('src/lib/storage.ts', 'utf8');
if (!content.includes('moderationStatus?:')) {
  content = content.replace('filename: string; // internal storage path / gcs key', 'filename: string;\n  moderationStatus?: "PENDING" | "APPROVED" | "REJECTED";\n  moderationReason?: string;');
  fs.writeFileSync('src/lib/storage.ts', content);
  console.log('Added moderationStatus to MediaRecord');
}
