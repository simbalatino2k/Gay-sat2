import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message, UserProfile, TapType } from '../types';
import {
  Send, Image as ImageIcon, ArrowLeft, Check, CheckCheck, Sparkles, User, ShieldCheck,
  RefreshCw, ChevronDown, ChevronUp, Plus, Clock, Timer, Pin, Shield, ShieldOff,
  Lock, Unlock, Zap, Flame, Hand, Bookmark, AlertCircle, HardDrive, CloudOff
} from 'lucide-react';
import { formatDistance } from '../utils/formatDistance';
import { ProfileAuraFrame } from './ProfileAuraFrame';
import { AuraChatOrbGraphic } from './AuraGraphics';
import { ChatMediaMenu, PhotoMessage, LinkMessage, LocationMessage, StickerMessage, VoiceMessage, StarVideoMessage, MediaPreview, StickerPicker } from './ChatMediaComponents';
import { ChatSettings } from './ChatSettings';

interface ChatViewProps {
  authToken: string;
  currentUserId: string;
  initialTargetUserId?: string | null;
  initialMessage?: string | null;
  onClearInitialMessage?: () => void;
  onClearTargetUser?: () => void;
}

type PropositionVibe = 'Casual & Chill' | 'Playful & Witty' | 'Shared Passions' | 'Bold & Flirty';

export const ChatView: React.FC<ChatViewProps> = ({
  authToken,
  currentUserId,
  initialTargetUserId,
  initialMessage,
  onClearInitialMessage,
  onClearTargetUser
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  // AI Proposition / Icebreaker State
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPropositions, setAiPropositions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<PropositionVibe>('Casual & Chill');

  // Media Attachment State
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{type: string, data: any} | null>(null);
  const [uploadingChatPhoto, setUploadingChatPhoto] = useState(false);

  // Privacy, Message Retention & Vault State
  const [showPrivacyDrawer, setShowPrivacyDrawer] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [vaultStatus, setVaultStatus] = useState<{
    iHaveAccessToTheirs: boolean;
    theyHaveAccessToMine: boolean;
    iRequestedTheirs: boolean;
    theyRequestedMine: boolean;
  }>({
    iHaveAccessToTheirs: false,
    theyHaveAccessToMine: false,
    iRequestedTheirs: false,
    theyRequestedMine: false
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Pre-fill initial message if supplied (e.g. chosen from ProfileModal or AI starter)
  useEffect(() => {
    if (initialMessage) {
      setInputText(initialMessage);
      if (onClearInitialMessage) onClearInitialMessage();
    }
  }, [initialMessage, onClearInitialMessage]);

  // Fetch all user conversations
  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/conversations', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        return data.conversations as Conversation[];
      }
    } catch (err) {
      console.error('Fetch conversations error:', err);
    } finally {
      setLoading(false);
    }
    return [];
  };

  // Fetch messages for a specific conversation
  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        try {
          localStorage.setItem(`aura_local_chat_${convId}`, JSON.stringify(data.messages));
        } catch (e) {
          // ignore quota
        }
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
      // Local fallback for offline / local-only conversations
      try {
        const cached = localStorage.getItem(`aura_local_chat_${convId}`);
        if (cached) {
          setMessages(JSON.parse(cached));
          setTimeout(scrollToBottom, 50);
        }
      } catch (e) {
        console.error('Failed to read local messages cache:', e);
      }
    }
  };

  // Initial load of conversations list
  useEffect(() => {
    fetchConversations();
  }, [authToken]);

  // When initialTargetUserId is passed or changes, guarantee opening the chat window
  useEffect(() => {
    if (!initialTargetUserId) return;

    let isCancelled = false;

    const openOrStartChat = async () => {
      setIsOpeningChat(true);

      // Check if conversation already exists in active local state
      const existing = conversations.find(c => c.otherParticipant?.userId === initialTargetUserId);
      if (existing) {
        setActiveConv(existing);
        setIsOpeningChat(false);
        return;
      }

      // If not yet found, call POST /api/conversations to create or retrieve it from backend
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ targetUserId: initialTargetUserId })
        });
        const data = await res.json();
        if (!isCancelled && data.conversation) {
          setConversations(prev => {
            const alreadyInList = prev.some(c => c.id === data.conversation.id);
            return alreadyInList ? prev : [data.conversation, ...prev];
          });
          setActiveConv(data.conversation);
        }
      } catch (err) {
        console.error('Error starting conversation with target:', err);
      } finally {
        if (!isCancelled) {
          setIsOpeningChat(false);
        }
      }
    };

    openOrStartChat();

    return () => {
      isCancelled = true;
    };
  }, [initialTargetUserId, authToken]);

  const fetchVaultStatus = async (targetUserId: string) => {
    try {
      const res = await fetch(`/api/vault/status/${targetUserId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      setVaultStatus({
        iHaveAccessToTheirs: !!data.iHaveAccessToTheirs,
        theyHaveAccessToMine: !!data.theyHaveAccessToMine,
        iRequestedTheirs: !!data.iRequestedTheirs,
        theyRequestedMine: !!data.theyRequestedMine
      });
    } catch (err) {
      console.error('Failed to fetch vault status:', err);
    }
  };

  // Fetch messages and vault status when activeConv changes
  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
      loadPropositions(activeConv.otherParticipant, selectedVibe);
      if (activeConv.otherParticipant?.userId) {
        fetchVaultStatus(activeConv.otherParticipant.userId);
      }
    }
  }, [activeConv]);

  const handleSetMessageTtl = async (ttlSeconds: number | null) => {
    if (!activeConv) return;
    setUpdatingSettings(true);
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ messageTtlSeconds: ttlSeconds })
      });
      const data = await res.json();
      if (data.settings) {
        setActiveConv(prev => prev ? {
          ...prev,
          settings: {
            ...prev.settings,
            messageTtlSeconds: data.settings.messageTtlSeconds
          }
        } : null);
      }
    } catch (err) {
      console.error('Failed to set message TTL:', err);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleToggleDisableAutoBackup = async () => {
    if (!activeConv) return;
    const currentVal = !!(activeConv.settings?.disableAutoBackup ?? activeConv.disableAutoBackup);
    const nextVal = !currentVal;
    setUpdatingSettings(true);
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          disableAutoBackup: nextVal,
          excludeFromBackup: nextVal ? true : (activeConv.settings?.excludeFromBackup ?? false)
        })
      });
      const data = await res.json();
      const updatedSettings = data.settings || data.conversation?.settings;
      if (updatedSettings) {
        setActiveConv(prev => prev ? {
          ...prev,
          disableAutoBackup: updatedSettings.disableAutoBackup,
          excludeFromBackup: updatedSettings.excludeFromBackup,
          settings: {
            ...prev.settings,
            disableAutoBackup: updatedSettings.disableAutoBackup,
            excludeFromBackup: updatedSettings.excludeFromBackup
          }
        } : null);

        // When disabling auto-backup, guarantee that existing messages are saved locally in the browser
        if (nextVal && messages.length > 0) {
          try {
            localStorage.setItem(`aura_local_chat_${activeConv.id}`, JSON.stringify(messages));
          } catch (e) {
            console.error('Failed to cache local messages:', e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to toggle disable auto backup:', err);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleToggleBackupExclusion = async () => {
    if (!activeConv) return;
    const currentVal = !!activeConv.settings?.excludeFromBackup;
    setUpdatingSettings(true);
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ excludeFromBackup: !currentVal })
      });
      const data = await res.json();
      if (data.settings) {
        setActiveConv(prev => prev ? {
          ...prev,
          settings: {
            ...prev.settings,
            excludeFromBackup: data.settings.excludeFromBackup
          }
        } : null);
      }
    } catch (err) {
      console.error('Failed to toggle backup exclusion:', err);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleToggleMessagePermanent = async (messageId: string) => {
    if (!activeConv) return;
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/messages/${messageId}/permanent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.message) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isPermanent: data.message.isPermanent } : m));
      }
    } catch (err) {
      console.error('Failed to toggle permanent message:', err);
    }
  };

  const handleGrantVaultAccess = async (grant: boolean) => {
    if (!activeConv?.otherParticipant?.userId) return;
    const targetId = activeConv.otherParticipant.userId;
    try {
      const res = await fetch('/api/vault/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ targetUserId: targetId, granted: grant })
      });
      if (res.ok) {
        setVaultStatus(prev => ({ ...prev, theyHaveAccessToMine: grant }));
        fetchMessages(activeConv.id);
      }
    } catch (err) {
      console.error('Failed to grant vault access:', err);
    }
  };

  const handleRequestVaultAccessFromChat = async () => {
    if (!activeConv?.otherParticipant?.userId) return;
    const targetId = activeConv.otherParticipant.userId;
    try {
      const res = await fetch('/api/vault/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ targetUserId: targetId })
      });
      if (res.ok) {
        setVaultStatus(prev => ({ ...prev, iRequestedTheirs: true }));
        fetchMessages(activeConv.id);
      }
    } catch (err) {
      console.error('Failed to request vault access:', err);
    }
  };

  const formatTtlRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'wygasa zaraz';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d`;
  };

  const handleBlockUser = async () => {
    if (!activeConv?.otherParticipant?.userId) return;
    const confirmed = window.confirm(`Czy na pewno chcesz zablokować użytkownika ${activeConv.otherParticipant.displayName}?`);
    if (!confirmed) return;
    
    setUpdatingSettings(true);
    try {
      const res = await fetch('/api/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ targetUserId: activeConv.otherParticipant.userId })
      });
      if (res.ok) {
        setActiveConv(null);
        setConversations(prev => prev.filter(c => c.id !== activeConv.id));
        setShowPrivacyDrawer(false);
      } else {
         console.error('Failed to block user');
      }
    } catch (err) {
      console.error('Failed to block user:', err);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleReportUser = async () => {
    if (!activeConv?.otherParticipant?.userId) return;
    const reason = window.prompt(`Dlaczego zgłaszasz użytkownika ${activeConv.otherParticipant.displayName}? (Opcjonalnie)`);
    if (reason === null) return; // User cancelled
    
    setUpdatingSettings(true);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
          targetUserId: activeConv.otherParticipant.userId,
          reason: reason || 'Brak podanego powodu' 
        })
      });
      if (res.ok) {
        window.alert('Użytkownik został zgłoszony.');
        setShowPrivacyDrawer(false);
      } else {
        console.error('Failed to report user');
      }
    } catch (err) {
      console.error('Failed to report user:', err);
    } finally {
      setUpdatingSettings(false);
    }
  };

  // Load AI Proposition messages tailored to the other participant
  const loadPropositions = async (otherParticipant: UserProfile | undefined, vibe: PropositionVibe = selectedVibe) => {
    if (!otherParticipant) return;
    setAiLoading(true);

    const displayName = otherParticipant.displayName || 'Member';
    const primaryInterest = otherParticipant.interests?.[0] || 'music & art';
    const secondaryInterest = otherParticipant.interests?.[1] || 'travel';

    try {
      const res = await fetch('/api/ai/propositions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          matchProfile: otherParticipant,
          vibe
        })
      });
      const data = await res.json();
      if (data.propositions && Array.isArray(data.propositions) && data.propositions.length > 0) {
        setAiPropositions(data.propositions);
      } else {
        throw new Error('Empty response from AI endpoint');
      }
    } catch (err) {
      console.warn('Using client tailored fallback propositions:', err);
      // Fallbacks conditioned by vibe
      if (vibe === 'Casual & Chill') {
        setAiPropositions([
          `Hey ${displayName}! Loved your photos. How has your week been going?`,
          `Hi ${displayName}! Up for grabbing a casual coffee or drink nearby sometime?`,
          `Hey there! How is your day treating you so far?`,
          `Hey ${displayName}! Just noticed your profile and wanted to say hello.`
        ]);
      } else if (vibe === 'Playful & Witty') {
        setAiPropositions([
          `Hey ${displayName}! Your vibe definitely stands out here. What's the story behind your favorite photo?`,
          `Hi ${displayName}! If we went for a drink, what's your go-to spot?`,
          `Hey handsome! Couldn't pass by without seeing what you're up to today.`,
          `Hey ${displayName}! On a scale of 1-10, how adventurous is your weekend looking?`
        ]);
      } else if (vibe === 'Shared Passions') {
        setAiPropositions([
          `Hey ${displayName}! Saw you're into ${primaryInterest} — what got you passionate about that?`,
          `Hi ${displayName}! Great taste in ${secondaryInterest}. Any favorite recommendations?`,
          `Hey there! Always great to connect with someone who appreciates ${primaryInterest}.`,
          `Hey ${displayName}! Loved your bio about ${otherParticipant.bio ? 'your vibe' : 'connecting'}. What are you into lately?`
        ]);
      } else {
        setAiPropositions([
          `Hey handsome, couldn't scroll past your profile without saying hi! What brings you on Aura?`,
          `Hi ${displayName}! You look fantastic in your photos. Up for getting to know each other?`,
          `Hey there! Love your confidence and vibe. What are your plans for tonight?`,
          `Hey ${displayName}! You caught my eye immediately. Let's chat!`
        ]);
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Send a message
  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    if (!textToSend && !customText && inputText === '') return;
    if (!activeConv || sending) return;

    setInputText('');
    setSending(true);

    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          receiverId: activeConv.otherParticipant.userId,
          type: 'TEXT',
          text: textToSend,
          disableAutoBackup: activeConv.settings?.disableAutoBackup ?? activeConv.disableAutoBackup,
          excludeFromBackup: activeConv.settings?.excludeFromBackup ?? activeConv.excludeFromBackup
        })
      });
      const data = await res.json();
      if (data.message) {
        setMessages(prev => {
          const updated = [...prev, data.message];
          if (activeConv.settings?.disableAutoBackup || activeConv.disableAutoBackup) {
            try {
              localStorage.setItem(`aura_local_chat_${activeConv.id}`, JSON.stringify(updated));
            } catch (e) {}
          }
          return updated;
        });
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSendMediaPayload = async (payload: any) => {
    if (!activeConv || sending) return;
    setSending(true);
    setMediaPreview(null);
    try {
      const res = await fetch(`/api/conversations/${activeConv.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          receiverId: activeConv.otherParticipant.userId,
          disableAutoBackup: activeConv.settings?.disableAutoBackup ?? activeConv.disableAutoBackup,
          excludeFromBackup: activeConv.settings?.excludeFromBackup ?? activeConv.excludeFromBackup,
          ...payload
        })
      });
      const data = await res.json();
      if (data.message) {
        setMessages(prev => {
          const updated = [...prev, data.message];
          if (activeConv.settings?.disableAutoBackup || activeConv.disableAutoBackup) {
            try {
              localStorage.setItem(`aura_local_chat_${activeConv.id}`, JSON.stringify(updated));
            } catch (e) {}
          }
          return updated;
        });
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error('Send media error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingChatPhoto(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }
      setMediaPreview({
        type: 'PHOTO',
        data: { url: data.media.url }
      });
    } catch (err: any) {
      console.error('Chat photo upload error:', err);
      alert(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingChatPhoto(false);
      if (chatFileInputRef.current) {
        chatFileInputRef.current.value = '';
      }
    }
  };

  const handleSelectMediaAction = (action: 'PHOTO' | 'LINK' | 'LOCATION' | 'STICKER' | 'VOICE' | 'STAR_VIDEO') => {
    if (action === 'STICKER') {
      setShowStickerPicker(true);
      return;
    }

    if (action === 'PHOTO') {
      chatFileInputRef.current?.click();
      return;
    }

    // Generate preview data based on the action
    let previewData: any = {};
    if (action === 'LINK') {
      previewData = { url: 'https://auragay.com/events/nyc', domain: 'auragay.com', title: 'AURA Black Party NYC' };
    } else if (action === 'LOCATION') {
      previewData = { lat: 40.7128, lng: -74.0060, approximateArea: 'SoHo District', distanceKm: 0.8 };
    } else if (action === 'VOICE') {
      previewData = { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', durationSeconds: 15 };
    } else if (action === 'STAR_VIDEO') {
      previewData = { url: 'https://placeholdervideo.dev/640x360' };
    }

    setMediaPreview({ type: action, data: previewData });
  };

  const handleSelectSticker = (sticker: any) => {
    handleSendMediaPayload({
      type: 'STICKER',
      stickerId: sticker.id,
      stickerUrl: sticker.url,
      stickerName: sticker.name
    });
  };

  const handleConfirmMedia = (data: any) => {
    if (!mediaPreview) return;
    const type = mediaPreview.type;
    
    let payload: any = { type };
    if (type === 'PHOTO') payload.media = data;
    else if (type === 'LINK') payload.linkPreview = data;
    else if (type === 'LOCATION') payload.location = data;
    else if (type === 'STICKER') payload.stickerId = data.id;
    else if (type === 'VOICE') payload.media = data;
    else if (type === 'STAR_VIDEO') payload.media = data;

    handleSendMediaPayload(payload);
  };

  const handleSelectProposition = (prop: string, sendImmediately = false) => {
    if (sendImmediately) {
      handleSendMessage(undefined, prop);
      setShowAIPanel(false);
    } else {
      setInputText(prop);
      setShowAIPanel(false);
    }
  };

  const handleCloseActiveChat = () => {
    setActiveConv(null);
    if (onClearTargetUser) onClearTargetUser();
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-24 pt-1 px-2.5">
      {/* Loading Overlay when Opening a direct chat */}
      {isOpeningChat && !activeConv && (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-cyan-500 p-0.5 animate-spin shadow-lg shadow-purple-950/50">
            <div className="w-full h-full bg-[#090b14] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-fuchsia-400 animate-pulse" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-white tracking-wide">Opening Conversation...</p>
            <p className="text-xs text-slate-400">Connecting securely on AURA Direct</p>
          </div>
        </div>
      )}

      {activeConv ? (
        /* Active Conversation Window */
        <div className="flex flex-col h-[78vh] rounded-[28px] border border-white/[0.08] bg-[#0c0e18]/90 backdrop-blur-2xl overflow-hidden shadow-2xl shadow-black/80">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-[#090b14]/90 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCloseActiveChat}
                className="p-1.5 -ml-1 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.06] transition active:scale-95"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="relative shrink-0">
                <ProfileAuraFrame
                  isOnline={activeConv.otherParticipant?.isOnline}
                  className="w-10 h-10 rounded-full"
                >
                  <img
                    src={activeConv.otherParticipant?.photos[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
                    alt={activeConv.otherParticipant?.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </ProfileAuraFrame>
                {activeConv.otherParticipant?.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#090b14] z-10" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white tracking-wide">{activeConv.otherParticipant?.displayName}</h3>
                  {activeConv.otherParticipant?.verified && (
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                </div>
                <p className="text-[10px] text-fuchsia-400/90 font-medium">
                  {activeConv.otherParticipant?.identityRole || 'Member'}
                  {activeConv.otherParticipant?.distanceKm !== undefined && (
                    <span className="text-slate-400 ml-1.5">· {formatDistance(activeConv.otherParticipant.distanceKm)}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Privacy, Expiration & Vault Settings Button */}
              <button
                onClick={() => {
                  setShowPrivacyDrawer(!showPrivacyDrawer);
                  if (showAIPanel) setShowAIPanel(false);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold flex items-center gap-1.5 transition-all duration-200 active:scale-95 ${
                  showPrivacyDrawer
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : activeConv.settings?.messageTtlSeconds || activeConv.settings?.excludeFromBackup || activeConv.settings?.disableAutoBackup || activeConv.disableAutoBackup
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.1]'
                }`}
                title="Message expiration, backup & private vault settings"
              >
                <Timer className="w-3.5 h-3.5 text-amber-400" />
                <span>Prywatność</span>
                {activeConv.settings?.messageTtlSeconds ? (
                  <span className="px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px]">
                    {formatTtlRemaining(new Date(Date.now() + activeConv.settings.messageTtlSeconds * 1000).toISOString())}
                  </span>
                ) : null}
                {(activeConv.settings?.disableAutoBackup || activeConv.disableAutoBackup) ? (
                  <span title="Disable Auto-Backup aktywny (tylko lokalnie)">
                    <CloudOff className="w-3 h-3 text-cyan-400" />
                  </span>
                ) : activeConv.settings?.excludeFromBackup ? (
                  <ShieldOff className="w-3 h-3 text-cyan-400" />
                ) : null}
              </button>

              {/* Quick AI Proposition Toggle Button in Header */}
              <button
                onClick={() => {
                  setShowAIPanel(!showAIPanel);
                  if (showPrivacyDrawer) setShowPrivacyDrawer(false);
                  if (!showAIPanel && aiPropositions.length === 0) {
                    loadPropositions(activeConv.otherParticipant, selectedVibe);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold flex items-center gap-1.5 transition-all duration-200 active:scale-95 ${
                  showAIPanel
                    ? 'bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-500/40 shadow-[0_0_12px_rgba(217,70,239,0.3)]'
                    : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.1]'
                }`}
                title="Toggle AI Proposition Messages"
              >
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
                <span>AI</span>
                {showAIPanel ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
              </button>
            </div>
          </div>

          {/* Privacy, Retention & Vault Drawer */}
          {activeConv && (
            <ChatSettings
              isOpen={showPrivacyDrawer}
              onClose={() => setShowPrivacyDrawer(false)}
              conversation={activeConv}
              updatingSettings={updatingSettings}
              onSetMessageTtl={handleSetMessageTtl}
              onToggleDisableAutoBackup={handleToggleDisableAutoBackup}
              vaultStatus={vaultStatus}
              onGrantVaultAccess={handleGrantVaultAccess}
              onRequestVaultAccess={handleRequestVaultAccessFromChat}
              onBlockUser={handleBlockUser}
              onReportUser={handleReportUser}
            />
          )}

          {/* Collapsible AI Propositions Panel */}
          {showAIPanel && (
            <div className="border-b border-white/[0.08] bg-gradient-to-b from-[#120f22] to-[#0a0c16] p-3.5 space-y-3 shrink-0 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-500 to-fuchsia-500 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <span>Propositions IA pour {activeConv.otherParticipant?.displayName}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-fuchsia-500/30 text-fuchsia-300 font-extrabold border border-fuchsia-500/40">IA</span>
                    </h4>
                    <p className="text-[10px] text-slate-400">Click to insert into message or send directly</p>
                  </div>
                </div>

                <button
                  onClick={() => loadPropositions(activeConv.otherParticipant, selectedVibe)}
                  disabled={aiLoading}
                  className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-fuchsia-300 border border-white/10 text-[10px] font-semibold flex items-center gap-1 transition"
                  title="Generate new propositions"
                >
                  <RefreshCw className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
                  <span>{aiLoading ? 'Generating...' : 'Refresh'}</span>
                </button>
              </div>

              {/* Vibe Selection Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                {(['Casual & Chill', 'Playful & Witty', 'Shared Passions', 'Bold & Flirty'] as PropositionVibe[]).map(v => (
                  <button
                    key={v}
                    onClick={() => {
                      setSelectedVibe(v);
                      loadPropositions(activeConv.otherParticipant, v);
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded-xl font-semibold whitespace-nowrap transition-all duration-200 ${
                      selectedVibe === v
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-sm border border-fuchsia-400/50'
                        : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Propositions Cards */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
                {aiLoading ? (
                  <div className="space-y-1.5 py-1">
                    {[1, 2].map(i => (
                      <div key={i} className="h-11 rounded-xl bg-white/[0.04] border border-white/[0.06] animate-pulse" />
                    ))}
                  </div>
                ) : aiPropositions.map((prop, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-fuchsia-500/40 transition-all flex items-center justify-between gap-2 text-left group"
                  >
                    <p className="text-[11px] text-slate-200 leading-snug flex-1 italic">
                      "{prop}"
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleSelectProposition(prop, false)}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white transition active:scale-95"
                        title="Use in text field"
                      >
                        Use
                      </button>
                      <button
                        onClick={() => handleSelectProposition(prop, true)}
                        className="px-2 py-1 rounded-lg aura-btn-primary text-[10px] font-bold text-white flex items-center gap-1 shadow-sm active:scale-95"
                        title="Send proposition immediately"
                      >
                        <span>Send</span>
                        <Send className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
            {/* Disable Auto-Backup Active Notification Banner */}
            {(activeConv.settings?.disableAutoBackup || activeConv.disableAutoBackup) && (
              <div className="p-2.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between gap-2 text-xs text-cyan-200 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0">
                    <CloudOff className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-[10.5px]">Wyłączono automatyczną kopię (Disable Auto-Backup)</span>
                    <p className="text-[9.5px] text-cyan-300/80">Wiadomości są zapisywane tylko na tym urządzeniu i wyłączone z eksportów danych.</p>
                  </div>
                </div>
                <span className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shrink-0">
                  Tylko lokalnie
                </span>
              </div>
            )}

            {messages.length === 0 ? (
              /* Empty Conversation State: Features Aura AI Proposition Starters directly */
              <div className="h-full flex flex-col items-center justify-center text-center p-2 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/20 via-fuchsia-600/20 to-pink-600/10 border border-fuchsia-500/30 flex items-center justify-center shadow-lg shadow-purple-950/40">
                  <Sparkles className="w-6 h-6 text-fuchsia-400 animate-pulse" />
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-200">Start the conversation with {activeConv.otherParticipant?.displayName}</p>
                  <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                    Choose an AI proposition below or type your own custom message.
                  </p>
                </div>

                {/* Inline AI Proposition Quick-Starters */}
                <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-fuchsia-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI Proposition Openers
                    </span>
                    <button
                      onClick={() => loadPropositions(activeConv.otherParticipant, selectedVibe)}
                      disabled={aiLoading}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${aiLoading ? 'animate-spin' : ''}`} />
                      <span>{aiLoading ? '...' : 'Refresh'}</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {aiPropositions.slice(0, 3).map((prop, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectProposition(prop, false)}
                        className="w-full text-left p-2.5 rounded-xl bg-black/40 hover:bg-white/[0.06] border border-white/[0.08] hover:border-fuchsia-500/40 transition-all text-[11px] text-slate-200 leading-snug group flex items-center justify-between gap-2"
                      >
                        <span className="truncate flex-1 italic">"{prop}"</span>
                        <span className="text-[9.5px] font-bold text-fuchsia-300 group-hover:underline shrink-0">
                          Select →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map(m => {
                const isMe = m.senderId === currentUserId;
                const isDelivered = m.status === 'DELIVERED' || m.status === 'READ';

                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-message-enter`}>
                    <div
                      className={`max-w-[78%] ${
                        m.type === 'STICKER' ? '' : 'px-4 py-2.5 border'
                      } text-xs leading-relaxed transition-all duration-200 ${
                        m.type === 'STICKER'
                          ? 'bg-transparent border-transparent shadow-none'
                          : isMe
                          ? 'bg-gradient-to-r from-purple-600/90 via-fuchsia-600/90 to-pink-600/90 backdrop-blur-xl text-white rounded-2xl rounded-br-xs shadow-lg shadow-purple-950/40 border-white/15'
                          : 'aura-glass-card rounded-2xl rounded-bl-xs text-slate-100 border-white/[0.09] shadow-md shadow-black/50'
                      }`}
                    >
                      {(!m.type || m.type === 'TEXT') && <p className="break-words font-normal tracking-wide">{m.text}</p>}
                      {m.type === 'PHOTO' && <PhotoMessage media={m.media || (m.photoUrl ? { url: m.photoUrl } : undefined)} text={m.text} isMe={isMe} />}
                      {m.type === 'LINK' && <LinkMessage preview={m.linkPreview} text={m.text} />}
                      {m.type === 'LOCATION' && <LocationMessage location={m.location} text={m.text} />}
                      {m.type === 'STICKER' && <StickerMessage stickerId={m.stickerId} stickerUrl={m.stickerUrl} stickerName={m.stickerName} />}
                      {m.type === 'VOICE' && <VoiceMessage media={m.media} isMe={isMe} />}
                      {m.type === 'STAR_VIDEO' && <StarVideoMessage media={m.media} />}
                      
                      {/* Aura Tap Message Display */}
                      {m.type === 'TAP' && (
                        <div className="flex items-center gap-2.5 py-1">
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-fuchsia-600/30 to-amber-500/30 border border-fuchsia-400/40 flex items-center justify-center text-xl shadow-md">
                            {m.tapType === 'HOT' ? '🔥' : m.tapType === 'WOOF' ? '🐾' : m.tapType === 'WAVE' ? '👋' : '⚡'}
                          </div>
                          <div>
                            <p className="text-xs font-black tracking-wide text-white">
                              {m.tapType === 'HOT' ? 'Aura Hot Tap 🔥' : m.tapType === 'WOOF' ? 'Woof Tap 🐾' : m.tapType === 'WAVE' ? 'Pomachanie 👋' : 'Aura Bolt ⚡'}
                            </p>
                            <p className="text-[10px] text-fuchsia-300 font-medium">Szybka zaczepka</p>
                          </div>
                        </div>
                      )}

                      {/* Vault Action Message Display */}
                      {m.type === 'VAULT_ACTION' && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                              <Lock className="w-4 h-4" />
                            </div>
                            <p className="text-xs font-bold text-amber-200">{m.text}</p>
                          </div>
                          {!isMe && m.text?.toLowerCase().includes('poprosił o dostęp') && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleGrantVaultAccess(true)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black transition active:scale-95 flex items-center gap-1 shadow-sm"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Przyznaj dostęp do skarbca</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message Metadata, TTL Expiration, Permanent Pin & Delivery Status */}
                      <div className="flex items-center justify-between gap-2 mt-1.5 text-[9.5px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {m.isPermanent ? (
                            <span className="flex items-center gap-1 text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-md font-semibold border border-amber-500/30 shadow-xs">
                              <Pin className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                              <span>Na stałe</span>
                            </span>
                          ) : m.expiresAt ? (
                            <span className="flex items-center gap-1 text-amber-200/90 font-medium bg-black/30 px-1.5 py-0.5 rounded-md border border-white/10" title={`Wygaśnie ${new Date(m.expiresAt).toLocaleTimeString()}`}>
                              <Clock className="w-2.5 h-2.5 text-amber-400" />
                              <span>{formatTtlRemaining(m.expiresAt)}</span>
                            </span>
                          ) : null}

                          {(m.disableAutoBackup || (activeConv.settings?.disableAutoBackup && m.excludeFromBackup)) ? (
                            <span className="flex items-center gap-1 text-cyan-300/95 font-semibold bg-cyan-950/60 px-1.5 py-0.5 rounded-md border border-cyan-500/30" title="Zapisana wyłącznie lokalnie (wyłączona z chmury i kopii zapasowej)">
                              <HardDrive className="w-2.5 h-2.5 text-cyan-300" />
                              <span>Tylko lokalnie</span>
                            </span>
                          ) : m.excludeFromBackup ? (
                            <span className="flex items-center gap-0.5 text-cyan-300/90 font-medium bg-black/30 px-1 py-0.5 rounded-md border border-white/10" title="Odłączona od kopii zapasowej (Off-the-record)">
                              <ShieldOff className="w-2.5 h-2.5 text-cyan-400" />
                              <span>Bez kopii</span>
                            </span>
                          ) : null}

                          {/* Pin Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleMessagePermanent(m.id)}
                            title={m.isPermanent ? "Usuń zabezpieczenie (wiadomość wygaśnie normalnie)" : "Zapisz na stałe (zabezpiecz przed wygaśnięciem)"}
                            className={`p-1 rounded-md hover:bg-white/10 transition active:scale-90 ${
                              m.isPermanent ? 'text-amber-300' : 'text-white/40 hover:text-white/80'
                            }`}
                          >
                            <Pin className={`w-3 h-3 ${m.isPermanent ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                        </div>

                        <div className={`flex items-center gap-1.5 ${isMe ? 'text-white/75' : 'text-slate-400'}`}>
                          <span className="tabular-nums font-medium tracking-tight">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          {isMe && (
                            <span
                              className="flex items-center ml-0.5 transition-all duration-300 ease-out"
                              title={isDelivered ? 'Delivered and Read' : 'Sent'}
                            >
                              {isDelivered ? (
                                <CheckCheck className="w-3.5 h-3.5 text-cyan-300 stroke-[2.4] transition-transform duration-300 animate-tick-pop" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-white/70 stroke-[2.2] transition-opacity duration-300" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Premium Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/[0.08] bg-[#090b14]/95 backdrop-blur-2xl flex items-center gap-2 shrink-0 relative overflow-visible">
            
            <ChatMediaMenu 
              isOpen={showMediaMenu} 
              onClose={() => setShowMediaMenu(false)} 
              onSelectAction={handleSelectMediaAction} 
            />

            <StickerPicker
              isOpen={showStickerPicker}
              onClose={() => setShowStickerPicker(false)}
              onSelect={handleSelectSticker}
            />

            <button
              type="button"
              onClick={() => {
                setShowMediaMenu(!showMediaMenu);
                setShowAIPanel(false);
              }}
              className={`p-2.5 rounded-xl border transition-all active:scale-95 duration-200 ${
                showMediaMenu
                  ? 'bg-indigo-500/30 text-indigo-300 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-white/[0.06] border-white/10'
              }`}
              title="Add Media"
            >
              <Plus className={`w-4 h-4 transition-transform duration-300 ${showMediaMenu ? 'rotate-45' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAIPanel(!showAIPanel);
                setShowMediaMenu(false);
              }}
              className={`p-2.5 rounded-xl border transition-all active:scale-95 duration-200 ${
                showAIPanel
                  ? 'bg-fuchsia-500/30 text-fuchsia-300 border-fuchsia-500/50 shadow-[0_0_10px_rgba(217,70,239,0.3)]'
                  : 'text-slate-400 hover:text-fuchsia-300 hover:bg-white/[0.06] border-white/10'
              }`}
              title="Open AI Propositions"
            >
              <Sparkles className="w-4 h-4 text-fuchsia-400" />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Type a message..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onFocus={() => { setShowAIPanel(false); setShowMediaMenu(false); }}
                className="w-full aura-glass-input rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-fuchsia-500/60 focus:shadow-[0_0_20px_rgba(217,70,239,0.2)]"
              />
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="aura-btn-primary p-2.5 rounded-2xl flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <input
            ref={chatFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleChatFileUpload}
            className="hidden"
          />

          {mediaPreview && (
            <MediaPreview
              type={mediaPreview.type}
              data={mediaPreview.data}
              onCancel={() => setMediaPreview(null)}
              onSend={handleConfirmMedia}
            />
          )}
        </div>
      ) : (
        /* Conversation List */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-extrabold text-white tracking-wide">Direct Messages</h2>
            <span className="text-[10px] text-slate-400 font-medium">{conversations.length} chats</span>
          </div>

          {loading ? (
            <div className="space-y-2 pt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-[28px] border border-white/[0.07] bg-[#0e101a]/70 backdrop-blur-xl p-8 text-center space-y-3 shadow-xl">
              <div className="flex items-center justify-center mx-auto">
                <AuraChatOrbGraphic className="w-16 h-16" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-200">No conversations yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Explore profiles in Discover or Radar to start a chat with AI propositions.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map(c => (
                <div
                  key={c.id}
                  onClick={() => setActiveConv(c)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-white/[0.06] bg-[#0e101b]/70 backdrop-blur-xl hover:bg-white/[0.04] hover:border-fuchsia-500/30 transition-all duration-200 cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <ProfileAuraFrame
                        isOnline={c.otherParticipant?.isOnline}
                        className="w-12 h-12 rounded-full"
                      >
                        <img
                          src={c.otherParticipant?.photos[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
                          alt={c.otherParticipant?.displayName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </ProfileAuraFrame>
                      {c.otherParticipant?.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0e101b] z-10" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-white group-hover:text-fuchsia-300 transition-colors">
                          {c.otherParticipant?.displayName}
                        </h3>
                        {c.otherParticipant?.verified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-[190px] mt-0.5">
                        {c.lastMessage?.text || 'Tap to open conversation'}
                      </p>
                    </div>
                  </div>

                  {c.unreadCount > 0 && (
                    <span className="bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm shadow-fuchsia-950/60">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
