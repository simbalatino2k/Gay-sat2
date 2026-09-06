export interface AuraSkin {
  id: string;
  name: string;
  tagline: string;
  bgGradient: string;
  cardBg: string;
  primaryGradient: string;
  borderAccent: string;
  glowColor: string;
  accentText: string;
  chatSelfBubble: string;
  previewPhoto: string;
}

export const AURA_SKINS: AuraSkin[] = [
  {
    id: 'cyberpunk-neon',
    name: 'AURA Cyberpunk Neón',
    tagline: 'Fucsia Neón, Púrpura Nocturno y Cian Eléctrico',
    bgGradient: 'from-[#080912] via-[#0d0918] to-[#04050a]',
    cardBg: 'bg-[#121024]/80 border-fuchsia-500/30',
    primaryGradient: 'from-purple-600 via-fuchsia-500 to-cyan-500',
    borderAccent: 'border-fuchsia-500/40 shadow-[0_0_20px_rgba(217,70,239,0.25)]',
    glowColor: 'rgba(217, 70, 239, 0.35)',
    accentText: 'text-fuchsia-400',
    chatSelfBubble: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white',
    previewPhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'sunset-gold',
    name: 'Sunset Rose & Amber',
    tagline: 'Atardecer Cálido, Rosa Coral y Oro Brillante',
    bgGradient: 'from-[#140b0e] via-[#1a0f12] to-[#0a0507]',
    cardBg: 'bg-[#1c1215]/80 border-amber-500/30',
    primaryGradient: 'from-amber-500 via-rose-500 to-orange-500',
    borderAccent: 'border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.25)]',
    glowColor: 'rgba(244, 63, 94, 0.35)',
    accentText: 'text-amber-400',
    chatSelfBubble: 'bg-gradient-to-r from-amber-500 to-rose-600 text-white',
    previewPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'emerald-luxe',
    name: 'Emerald Jade & Gold',
    tagline: 'Misterio Verde Esmeralda, Jade y Dorado Royale',
    bgGradient: 'from-[#06120e] via-[#091712] to-[#030a07]',
    cardBg: 'bg-[#0e211a]/80 border-emerald-500/30',
    primaryGradient: 'from-emerald-500 via-teal-500 to-amber-400',
    borderAccent: 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    accentText: 'text-emerald-400',
    chatSelfBubble: 'bg-gradient-to-r from-teal-600 to-emerald-500 text-white',
    previewPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'obsidian-metal',
    name: 'Obsidian Steel & Silver',
    tagline: 'Elegancia Oscura, Plata Metálico y Azul Acero',
    bgGradient: 'from-[#080a0f] via-[#0d1017] to-[#050608]',
    cardBg: 'bg-[#111522]/80 border-cyan-500/30',
    primaryGradient: 'from-slate-700 via-cyan-600 to-blue-500',
    borderAccent: 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]',
    glowColor: 'rgba(6, 182, 212, 0.35)',
    accentText: 'text-cyan-400',
    chatSelfBubble: 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white',
    previewPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800'
  }
];
