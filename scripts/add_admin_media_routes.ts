import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const adminRoutes = `
// --- ADMIN MEDIA MODERATION ---
app.get('/api/admin/media/pending', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  // We need a way to list pending media. We'll add a helper to storage.ts
  const pending = getPendingMedia(); 
  res.json({ media: pending });
});

app.post('/api/admin/media/:mediaId/decide', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  const { decision, reason } = req.body;
  if (decision !== 'APPROVED' && decision !== 'REJECTED') return res.status(400).json({ error: 'Invalid decision' });
  
  const success = updateMediaModeration(req.params.mediaId, decision, reason);
  if (!success) return res.status(404).json({ error: 'Media not found' });
  res.json({ success: true });
});
`;

content = content.replace('// --- DSA Compliance (Admin) ---', adminRoutes + '\n// --- DSA Compliance (Admin) ---');
fs.writeFileSync('server.ts', content);

let storageContent = fs.readFileSync('src/lib/storage.ts', 'utf8');
const storageHelpers = `
export function getPendingMedia(): MediaRecord[] {
  return Array.from(storageState.media.values()).filter(m => m.moderationStatus === 'PENDING');
}

export function updateMediaModeration(mediaId: string, status: 'APPROVED' | 'REJECTED', reason?: string): boolean {
  const record = storageState.media.get(mediaId);
  if (!record) return false;
  record.moderationStatus = status;
  record.moderationReason = reason;
  // Normally we would save state to disk/PG here, assuming saveState() exists
  if (typeof (global as any).saveStorageState === 'function') (global as any).saveStorageState();
  return true;
}
`;
storageContent = storageContent + '\n' + storageHelpers;
fs.writeFileSync('src/lib/storage.ts', storageContent);

console.log('Added admin routes and storage helpers');
