export interface ChatSticker {
  id: string;
  emoji: string;
  label: string;
  category: 'flirt' | 'pride' | 'vibes' | 'reactions';
  colorGradient: string;
  badgeBg: string;
}

export const AURA_STICKERS = [
  { id: 'st-fire', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp', name: 'Fire' },
  { id: 'st-heart', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f496/512.webp', name: 'Sparkling Heart' },
  { id: 'st-peach', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f351/512.webp', name: 'Peach' },
  { id: 'st-eggplant', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f346/512.webp', name: 'Eggplant' },
  { id: 'st-sweat', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a6/512.webp', name: 'Sweat' },
  { id: 'st-lips', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f48b/512.webp', name: 'Kiss' },
  { id: 'st-devil', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f608/512.webp', name: 'Devil' },
  { id: 'st-rainbow', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f308/512.webp', name: 'Rainbow' },
  { id: 'st-sparkles', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.webp', name: 'Sparkles' },
  { id: 'st-cocktail', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f378/512.webp', name: 'Cocktail' },
  { id: 'st-eyes', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f440/512.webp', name: 'Eyes' },
  { id: 'st-party', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp', name: 'Party' }
];

export const AURA_CHAT_STICKERS: ChatSticker[] = [
  // Category: Flirt & Desire
  {
    id: 'st-fire',
    emoji: '🔥',
    label: 'Fuego Total',
    category: 'flirt',
    colorGradient: 'from-amber-500 to-rose-600',
    badgeBg: 'bg-gradient-to-r from-amber-500/20 to-rose-600/20 border-rose-500/50'
  },
  {
    id: 'st-neon-heart',
    emoji: '💖',
    label: 'Corazón AURA',
    category: 'flirt',
    colorGradient: 'from-fuchsia-500 to-purple-600',
    badgeBg: 'bg-gradient-to-r from-fuchsia-500/20 to-purple-600/20 border-fuchsia-500/50'
  },
  {
    id: 'st-peach',
    emoji: '🍑',
    label: 'Melocotón Neón',
    category: 'flirt',
    colorGradient: 'from-orange-500 to-pink-500',
    badgeBg: 'bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-orange-500/50'
  },
  {
    id: 'st-champagne',
    emoji: '🍾',
    label: 'Brindis Champagne',
    category: 'flirt',
    colorGradient: 'from-yellow-400 to-amber-600',
    badgeBg: 'bg-gradient-to-r from-yellow-400/20 to-amber-600/20 border-amber-400/50'
  },
  {
    id: 'st-kiss',
    emoji: '💋',
    label: 'Beso Apasionado',
    category: 'flirt',
    colorGradient: 'from-rose-600 to-pink-600',
    badgeBg: 'bg-gradient-to-r from-rose-600/20 to-pink-600/20 border-rose-400/50'
  },
  {
    id: 'st-sparkles',
    emoji: '⚡',
    label: 'Chispa Eléctrica',
    category: 'flirt',
    colorGradient: 'from-cyan-400 to-fuchsia-500',
    badgeBg: 'bg-gradient-to-r from-cyan-400/20 to-fuchsia-500/20 border-cyan-400/50'
  },

  // Category: Pride & Queerness
  {
    id: 'st-rainbow',
    emoji: '🌈',
    label: 'Pride Rainbow',
    category: 'pride',
    colorGradient: 'from-red-500 via-green-500 to-purple-500',
    badgeBg: 'bg-gradient-to-r from-red-500/20 via-emerald-500/20 to-purple-500/20 border-purple-400/50'
  },
  {
    id: 'st-bear-paw',
    emoji: '🐻',
    label: 'Bear & Tribe',
    category: 'pride',
    colorGradient: 'from-amber-700 to-yellow-600',
    badgeBg: 'bg-gradient-to-r from-amber-800/20 to-yellow-600/20 border-amber-500/50'
  },
  {
    id: 'st-leather',
    emoji: '⚡',
    label: 'Harness & Leather',
    category: 'pride',
    colorGradient: 'from-slate-900 to-indigo-900',
    badgeBg: 'bg-gradient-to-r from-slate-900/40 to-indigo-900/40 border-indigo-400/50'
  },
  {
    id: 'st-twink',
    emoji: '✨',
    label: 'Twink Glow',
    category: 'pride',
    colorGradient: 'from-purple-400 to-pink-400',
    badgeBg: 'bg-gradient-to-r from-purple-400/20 to-pink-400/20 border-pink-400/50'
  },
  {
    id: 'st-pup',
    emoji: '🐾',
    label: 'Pup Play',
    category: 'pride',
    colorGradient: 'from-cyan-500 to-blue-600',
    badgeBg: 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border-cyan-400/50'
  },

  // Category: Vibes & Dates
  {
    id: 'st-coffee',
    emoji: '☕',
    label: 'Cita de Café',
    category: 'vibes',
    colorGradient: 'from-amber-600 to-amber-900',
    badgeBg: 'bg-gradient-to-r from-amber-600/20 to-amber-900/20 border-amber-600/50'
  },
  {
    id: 'st-cocktail',
    emoji: '🍸',
    label: 'Cocktails & Copas',
    category: 'vibes',
    colorGradient: 'from-teal-400 to-cyan-600',
    badgeBg: 'bg-gradient-to-r from-teal-400/20 to-cyan-600/20 border-teal-400/50'
  },
  {
    id: 'st-party',
    emoji: '🎧',
    label: 'Techno Party',
    category: 'vibes',
    colorGradient: 'from-fuchsia-600 to-purple-800',
    badgeBg: 'bg-gradient-to-r from-fuchsia-600/20 to-purple-800/20 border-fuchsia-400/50'
  },
  {
    id: 'st-sunset',
    emoji: '🏖️',
    label: 'Sunset Beach',
    category: 'vibes',
    colorGradient: 'from-rose-500 to-orange-400',
    badgeBg: 'bg-gradient-to-r from-rose-500/20 to-orange-400/20 border-orange-400/50'
  },
  {
    id: 'st-vip',
    emoji: '🚀',
    label: 'AURA VIP Pass',
    category: 'vibes',
    colorGradient: 'from-cyan-400 via-fuchsia-400 to-amber-400',
    badgeBg: 'bg-gradient-to-r from-cyan-400/20 via-fuchsia-400/20 to-amber-400/20 border-amber-300/50'
  }
];
