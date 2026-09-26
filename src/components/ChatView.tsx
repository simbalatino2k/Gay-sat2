import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message, UserProfile, TapType } from '../types';
import {
  Send, Image as ImageIcon, ArrowLeft, Check, CheckCheck, Sparkles, User, ShieldCheck,
  RefreshCw, ChevronDown, ChevronUp, Plus, Clock, Timer, Pin, Shield, ShieldOff,
  Lock, Unlock, Zap, Flame, Hand, Bookmark, AlertCircle, HardDrive, CloudOff, Video,
  Phone, MoreVertical, Settings, RotateCw
} from 'lucide-react';
import { formatDistance } from '../utils/formatDistance';
import { ProfileAuraFrame } from './ProfileAuraFrame';
import { AuraChatOrbGraphic } from './AuraGraphics';
import { ChatMediaMenu, PhotoMessage, LinkMessage, LocationMessage, StickerMessage, VoiceMessage, StarVideoMessage, MediaPreview, StickerPicker } from './ChatMediaComponents';
import { ChatSettings } from './ChatSettings';
import { GlobalChatSettingsModal } from './GlobalChatSettingsModal';
import { StarVideoRecorderModal } from './StarVideoRecorderModal';
import { VideoCallModal } from './VideoCallModal';
import { useMediaPermissions } from '../hooks/useMediaPermissions';
import { MediaPermissionModal } from './MediaPermissionModal';
import { useTranslation } from '../context/LanguageContext';
import { setTypingStatus, subscribeToTypingStatus, clearTypingStatus } from '../services/firebaseService';
import { useScreenshotProtection } from '../hooks/useScreenshotProtection';
import { ScreenshotShield } from './common/ScreenshotShield';
import { auraWebSocketUrl } from '../lib/websocketEndpoint';

interface ChatViewProps {
  authToken: string;
  currentUserId: string;
  initialTargetUserId?: string | null;
  initialMessage?: string | null;
  onClearInitialMessage?: () => void;
  onClearTargetUser?: () => void;
  onStartCall?: (targetUser: { id: string; displayName: string; photoUrl?: string; role?: string }, callType: 'video' | 'voice') => void;
}

type PropositionVibe = 'Casual & Chill' | 'Playful & Witty' | 'Shared Passions' | 'Bold & Flirty';

export const ChatView: React.FC<ChatViewProps> = ({
  authToken,
  currentUserId,
  initialTargetUserId,
  initialMessage,
  onClearInitialMessage,
  onClearTargetUser,
  onStartCall
}) => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  // Short AI Proposition State (2-3 short options directly above the keyboard)
  const SHORT_PROPOSAL_SETS = [
    [t('chat_proposal_1', 'Hey, how are you? 👋'), t('chat_proposal_2', 'Great profile! ✨'), t('chat_proposal_3', 'Fancy grabbing a drink? ☕')],
    ['Hello! Where are you from? 📍', 'Awesome photos! 🔥', 'How is your day going? 😊'],
    ['Hey handsome! 😉', 'Any plans for tonight? 🍸', 'Let’s chat! 💬']
  ];
  const [proposalSetIndex, setProposalSetIndex] = useState(0);
  const [shortProposals, setShortProposals] = useState<string[]>(SHORT_PROPOSAL_SETS[0]);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<PropositionVibe>('Casual & Chill');

  // Media Attachment State
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{type: string, data: any} | null>(null);
  const [uploadingChatPhoto, setUploadingChatPhoto] = useState(false);

  // Settings & Privacy Modals
  const [showGlobalPrivacyModal, setShowGlobalPrivacyModal] = useState(false);
  const [showChatSettingsModal, setShowChatSettingsModal] = useState(false);
  const [showStarVideoModal, setShowStarVideoModal] = useState(false);
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

  // 1:1 Calling State (Video & Voice)
  const [videoCallActive, setVideoCallActive] = useState(false);
  const [currentCallType, setCurrentCallType] = useState<'video' | 'voice'>('video');
  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const [showCallPermissionModal, setShowCallPermissionModal] = useState(false);
  const { checkPermissions, hasAllPermissions } = useMediaPermissions();
  const incomingWsRef = useRef<WebSocket | null>(null);

  // Anti-Screenshot & Screen Capture Protection
  const { isScreenshotAttempted, isWindowBlurred, dismissWarning } = useScreenshotProtection({
    enabled: true,
    featureName: 'Czat & Zdjęcia AURA',
    protectOnBlur: !!activeConv
  });

  // Real-time Typing Indicator State (Firestore + WebSocket)
  const [firestoreTyping, setFirestoreTyping] = useState(false);
  const [wsTyping, setWsTyping] = useState(false);
  const isOtherUserTyping = firestoreTyping || wsTyping;
  const isSelfTypingRef = useRef(false);
  const typingDebounceTimerRef = useRef<any>(null);
  const wsTypingTimeoutRef = useRef<any>(null);

  // Notify typing state to active conversation participant
  const notifyTyping = (typing: boolean) => {
    if (!activeConv?.id || !currentUserId) return;
    const targetUserId = activeConv.otherParticipant?.userId;

    if (typing) {
      if (!isSelfTypingRef.current) {
        isSelfTypingRef.current = true;
        setTypingStatus(activeConv.id, currentUserId, true);
        if (targetUserId) {
          window.dispatchEvent(
            new CustomEvent('aura_send_ws_message', {
              detail: {
                type: 'TYPING',
                targetUserId,
                conversationId: activeConv.id,
                isTyping: true
              }
            })
          );
        }
      }

      // Reset auto-clear timer on repeated keystrokes
      if (typingDebounceTimerRef.current) {
        clearTimeout(typingDebounceTimerRef.current);
      }
      typingDebounceTimerRef.current = setTimeout(() => {
        notifyTyping(false);
      }, 2800);
    } else {
      if (isSelfTypingRef.current) {
        isSelfTypingRef.current = false;
        if (typingDebounceTimerRef.current) {
          clearTimeout(typingDebounceTimerRef.current);
          typingDebounceTimerRef.current = null;
        }
        setTypingStatus(activeConv.id, currentUserId, false);
        if (targetUserId) {
          window.dispatchEvent(
            new CustomEvent('aura_send_ws_message', {
              detail: {
                type: 'TYPING',
                targetUserId,
                conversationId: activeConv.id,
                isTyping: false
              }
            })
          );
        }
      }
    }
  };

  // Real-time typing listener (Firestore onSnapshot + WebSocket event)
  useEffect(() => {
    if (!activeConv?.id || !activeConv.otherParticipant?.userId) {
      setFirestoreTyping(false);
      setWsTyping(false);
      return;
    }

    const otherUserId = activeConv.otherParticipant.userId;
    const convId = activeConv.id;

    // 1. Subscribe to Firestore typing document
    const unsubscribeFirestore = subscribeToTypingStatus(
      convId,
      otherUserId,
      (typing) => {
        setFirestoreTyping(typing);
      }
    );

    // 2. Subscribe to WebSocket typing events
    const handleWsTyping = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data && data.conversationId === convId && data.senderId === otherUserId) {
        setWsTyping(!!data.isTyping);
        if (data.isTyping) {
          if (wsTypingTimeoutRef.current) clearTimeout(wsTypingTimeoutRef.current);
          wsTypingTimeoutRef.current = setTimeout(() => {
            setWsTyping(false);
          }, 4500);
        }
      }
    };

    window.addEventListener('aura_typing_event', handleWsTyping);

    return () => {
      unsubscribeFirestore();
      window.removeEventListener('aura_typing_event', handleWsTyping);
      if (wsTypingTimeoutRef.current) clearTimeout(wsTypingTimeoutRef.current);
      if (typingDebounceTimerRef.current) clearTimeout(typingDebounceTimerRef.current);

      // Clean up self typing status if active
      if (isSelfTypingRef.current) {
        isSelfTypingRef.current = false;
        clearTypingStatus(convId, currentUserId);
        window.dispatchEvent(
          new CustomEvent('aura_send_ws_message', {
            detail: {
              type: 'TYPING',
              targetUserId: otherUserId,
              conversationId: convId,
              isTyping: false
            }
          })
        );
      }
      setFirestoreTyping(false);
      setWsTyping(false);
    };
  }, [activeConv?.id, activeConv?.otherParticipant?.userId, currentUserId]);

  // Smoothly scroll down when typing indicator appears
  useEffect(() => {
    if (isOtherUserTyping) {
      scrollToBottom();
    }
  }, [isOtherUserTyping]);

  const handleInitiateCall = async (type: 'video' | 'voice' = 'video') => {
    if (!activeConv?.otherParticipant) return;
    setCurrentCallType(type);

    const target = {
      id: activeConv.otherParticipant.id,
      displayName: activeConv.otherParticipant.displayName || 'Użytkownik AURA',
      photoUrl: activeConv.otherParticipant.photos?.[0]?.url,
      role: activeConv.otherParticipant.identityRole || 'Member'
    };

    if (onStartCall) {
      onStartCall(target, type);
      return;
    }

    if (type === 'voice') {
      const perms = await checkPermissions();
      if (perms.microphone !== 'granted') {
        setShowCallPermissionModal(true);
        return;
      }
    } else {
      if (!hasAllPermissions) {
        const perms = await checkPermissions();
        if (perms.camera !== 'granted' || perms.microphone !== 'granted') {
          setShowCallPermissionModal(true);
          return;
        }
      }
    }

    setVideoCallActive(true);
  };

  // Local incoming call listener fallback if onStartCall is not provided by parent
  useEffect(() => {
    if (onStartCall || !authToken) return;
    const wsUrl = auraWebSocketUrl(window.location);
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      incomingWsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'AUTH', token: authToken }));
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.type === 'CALL_REQUEST') {
            if (videoCallActive) {
              ws.send(JSON.stringify({ type: 'CALL_REJECTED', reason: 'BUSY', targetUserId: data.senderId }));
              return;
            }
            setIncomingCallData(data);
            setCurrentCallType(data.callType || 'video');
            setVideoCallActive(true);
          }
        } catch {}
      };
    } catch {}

    return () => {
      const currentWs = incomingWsRef.current;
      if (currentWs) {
        currentWs.onopen = null;
        currentWs.onmessage = null;
        currentWs.onerror = null;
        currentWs.onclose = null;
        if (currentWs.readyState === WebSocket.OPEN) {
          currentWs.close();
        } else if (currentWs.readyState === WebSocket.CONNECTING) {
          currentWs.onopen = () => {
            try { currentWs.close(); } catch {}
          };
        }
      }
    };
  }, [authToken, onStartCall, videoCallActive]);

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
  const fetchMessages = async (convId: string, shouldScrollToBottom: boolean = false) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.messages) {
        setMessages(prev => {
          // If count increased or forced scroll requested, scroll to bottom
          if (shouldScrollToBottom || data.messages.length > prev.length) {
            setTimeout(scrollToBottom, 50);
          }
          return data.messages;
        });
        try {
          localStorage.setItem(`aura_local_chat_${convId}`, JSON.stringify(data.messages));
        } catch (e) {
          // ignore quota
        }
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
      // Local fallback for offline / local-only conversations
      try {
        const cached = localStorage.getItem(`aura_local_chat_${convId}`);
        if (cached) {
          setMessages(JSON.parse(cached));
          if (shouldScrollToBottom) {
            setTimeout(scrollToBottom, 50);
          }
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

  // Fetch messages and vault status when activeConv changes, and poll for new messages/read updates
  useEffect(() => {
    if (!activeConv) return;

    fetchMessages(activeConv.id, true);
    loadPropositions(activeConv.otherParticipant, selectedVibe);
    if (activeConv.otherParticipant?.userId) {
      fetchVaultStatus(activeConv.otherParticipant.userId);
    }

    // Polling interval so read receipts and incoming messages update dynamically
    const pollTimer = setInterval(() => {
      fetchMessages(activeConv.id, false);
    }, 3500);

    return () => clearInterval(pollTimer);
  }, [activeConv?.id]);

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
        setShowChatSettingsModal(false);
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
        setShowChatSettingsModal(false);
      } else {
        console.error('Failed to report user');
      }
    } catch (err) {
      console.error('Failed to report user:', err);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleRefreshPropositions = () => {
    setProposalSetIndex(prev => {
      const next = (prev + 1) % SHORT_PROPOSAL_SETS.length;
      setShortProposals(SHORT_PROPOSAL_SETS[next]);
      return next;
    });
  };

  const handleSendStarVideo = (mediaData: { url: string; durationSeconds: number; mediaId?: string }) => {
    handleSendMediaPayload({
      type: 'STAR_VIDEO',
      media: { url: mediaData.url, durationSeconds: mediaData.durationSeconds },
      starVideo: {
        url: mediaData.url,
        duration: mediaData.durationSeconds,
        mediaId: mediaData.mediaId
      }
    });
  };
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
        setShortProposals(data.propositions.slice(0, 3));
      } else {
        throw new Error('Empty response from AI endpoint');
      }
    } catch (err) {
      console.warn('Using client tailored fallback propositions:', err);
      // Short fallbacks (2-3 options)
      if (vibe === 'Casual & Chill') {
        setShortProposals([
          `Hej ${displayName}! Co tam? 👋`,
          `Masz ochotę na kawę? ☕`,
          `Jak mija Twój dzień? 😊`
        ]);
      } else if (vibe === 'Playful & Witty') {
        setShortProposals([
          `Świetne fotki! 🔥`,
          `Jakie masz plany na weekend? 🍸`,
          `Co słychać ciekawego? 😉`
        ]);
      } else if (vibe === 'Shared Passions') {
        setShortProposals([
          `Też lubię ${primaryInterest}! ✨`,
          `Co polecisz w temacie ${secondaryInterest}? 🎧`,
          `Fajny profil! Pogadamy? 💬`
        ]);
      } else {
        setShortProposals([
          `Cześć przystojniaku! 😉`,
          `Masz wolną chwilę? 💬`,
          `Świetna energia w profilu! ✨`
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
    notifyTyping(false);
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
      setShowStarVideoModal(true);
      return;
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
    } else {
      setInputText(prop);
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
        /* Active Conversation Window (Protected against screenshots and recording) */
        <ScreenshotShield
          isBlocked={isScreenshotAttempted}
          isWindowBlurred={isWindowBlurred}
          featureTitle="Czat & Zdjęcia AURA"
          onDismiss={dismissWarning}
          showWatermark={true}
          watermarkText="AURA CHAT SECURE"
        >
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
                    src={activeConv.otherParticipant?.photos?.[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
                    alt={activeConv.otherParticipant?.displayName}
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="w-full h-full object-cover protected-image select-none pointer-events-none"
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
                  <span className="text-[8.5px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 select-none" title="Zrzuty ekranu zablokowane">
                    <Lock className="w-2.5 h-2.5 text-cyan-400" />
                    <span>SECURE</span>
                  </span>
                </div>
                {isOtherUserTyping ? (
                  <p className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                    <span>{t('chat_typing', 'typing...')}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-fuchsia-400/90 font-medium">
                    {activeConv.otherParticipant?.identityRole || 'Member'}
                    {activeConv.otherParticipant?.distanceKm !== undefined && (
                      <span className="text-slate-400 ml-1.5">· {formatDistance(activeConv.otherParticipant.distanceKm)}</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* 1:1 Voice Call Button */}
              <button
                id="btn-initiate-voice-call"
                type="button"
                onClick={() => handleInitiateCall('voice')}
                className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white border border-emerald-500/30 hover:border-emerald-500/50 transition active:scale-95 shadow-sm"
                title="Rozpocznij rozmowę głosową 1:1"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
              </button>

              {/* 1:1 Video Call Button */}
              <button
                id="btn-initiate-video-call"
                type="button"
                onClick={() => handleInitiateCall('video')}
                className="p-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-white border border-purple-500/30 hover:border-purple-500/50 transition active:scale-95 shadow-sm"
                title="Rozpocznij wideorozmowę 1:1"
              >
                <Video className="w-4 h-4 text-fuchsia-400" />
              </button>

              {/* 3 Dots Menu Button for individual chat settings */}
              <button
                id="btn-chat-options-3dots"
                type="button"
                onClick={() => setShowChatSettingsModal(true)}
                className={`p-2 rounded-xl border transition-all duration-200 active:scale-95 ${
                  showChatSettingsModal
                    ? 'bg-purple-500/25 text-purple-200 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border-white/[0.1]'
                }`}
                title="Ustawienia i prywatność czatu"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Individual Chat Settings Modal (under 3 dots) */}
          {activeConv && (
            <ChatSettings
              isOpen={showChatSettingsModal}
              onClose={() => setShowChatSettingsModal(false)}
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

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
            {/* Screenshot & Capture Protection Notice */}
            <div className="p-2 px-3 rounded-2xl bg-[#090b16]/90 border border-cyan-500/25 flex items-center justify-between gap-2 text-[10.5px] text-cyan-200/90 shadow-sm shrink-0 select-none">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Ochrona zrzutów ekranu (Zrzuty, nagrywanie i zapisywanie zdjęć są zablokowane)</span>
              </div>
              <span className="text-[8.5px] font-bold text-fuchsia-400 uppercase tracking-wider bg-fuchsia-500/10 px-2 py-0.5 rounded-full border border-fuchsia-500/20 shrink-0">
                FLAG_SECURE
              </span>
            </div>

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
              /* Clean, minimal empty conversation state */
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/20 via-fuchsia-600/20 to-pink-600/10 border border-fuchsia-500/30 flex items-center justify-center shadow-lg shadow-purple-950/40">
                  <Sparkles className="w-6 h-6 text-fuchsia-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-200">Rozpocznij rozmowę z {activeConv.otherParticipant?.displayName}</p>
                  <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                    Wybierz jedną z krótkich propozycji nad klawiaturą lub wpisz wiadomość.
                  </p>
                </div>
              </div>
            ) : (
              messages.map(m => {
                const isMe = m.senderId === currentUserId;
                const isRead = m.status === 'READ' || m.readStatus === true;
                const isDelivered = m.status === 'DELIVERED' || m.deliveryStatus === 'delivered' || isRead;

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

                        <div className={`flex items-center gap-1.5 ${isMe ? 'text-white/85' : 'text-slate-400'}`}>
                          <span className="tabular-nums font-medium tracking-tight">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {isMe && (
                            <span
                              className="flex items-center ml-0.5 transition-all duration-300 ease-out"
                              title={
                                isRead
                                  ? (m.readAt ? `Wyświetlona (Seen) o ${new Date(m.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Wyświetlona (Seen)')
                                  : isDelivered
                                  ? 'Dostarczona (Delivered)'
                                  : 'Wysłana (Sent)'
                              }
                            >
                              {isRead ? (
                                <span className="flex items-center gap-1 text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded-full border border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.4)] animate-tick-pop">
                                  <CheckCheck className="w-3.5 h-3.5 text-cyan-300 stroke-[2.6]" />
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-200">odczytano</span>
                                </span>
                              ) : isDelivered ? (
                                <span className="flex items-center gap-0.5 text-white/80 px-1 py-0.5 rounded-full bg-black/20" title="Dostarczona">
                                  <CheckCheck className="w-3.5 h-3.5 text-white/80 stroke-[2.2] transition-transform duration-300" />
                                </span>
                              ) : (
                                <span className="flex items-center px-1 py-0.5 rounded-full bg-black/20" title="Wysłana">
                                  <Check className="w-3.5 h-3.5 text-white/60 stroke-[2] transition-opacity duration-300" />
                                </span>
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
            {/* Real-time Typing Indicator Bubble */}
            {isOtherUserTyping && activeConv.otherParticipant && (
              <div
                id="chat-typing-indicator"
                className="flex items-end gap-2 my-2.5 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 ring-1 ring-cyan-400/50 bg-slate-800 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                  {activeConv.otherParticipant.photos?.[0]?.url ? (
                    <img
                      src={activeConv.otherParticipant.photos[0].url}
                      alt={activeConv.otherParticipant.displayName || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-cyan-300">
                      {activeConv.otherParticipant.displayName?.[0] || 'U'}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl rounded-bl-xs px-3.5 py-2.5 bg-gradient-to-r from-slate-900/95 via-slate-800/85 to-[#101426]/95 backdrop-blur-md border border-cyan-500/35 shadow-[0_4px_20px_rgba(6,182,212,0.2)] flex items-center gap-2.5">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce"></span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-300 tracking-wide select-none">
                    <span className="font-semibold text-cyan-200">
                      {activeConv.otherParticipant.displayName || t('chat_someone', 'User')}
                    </span>{' '}
                    <span className="text-slate-400 italic">{t('chat_typing', 'typing...')}</span>
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Short Message Proposals: 2-3 options directly above the keyboard, no separate tab */}
          {shortProposals && shortProposals.length > 0 && (
            <div className="px-3 pt-2 pb-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-cyan-500/20 bg-[#0c0d17]/90 shrink-0">
              <button
                id="btn-cycle-propositions"
                type="button"
                onClick={handleRefreshPropositions}
                disabled={aiLoading}
                className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 transition shrink-0 active:scale-90 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                title="Refresh proposals (2-3 options)"
              >
                <RotateCw className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
              </button>
              <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
                {shortProposals.slice(0, 3).map((prop, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(prop);
                    }}
                    className="px-3 py-1 rounded-full bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border border-fuchsia-400/50 hover:border-fuchsia-300 text-fuchsia-200 hover:text-white text-[11px] font-semibold transition active:scale-95 whitespace-nowrap shadow-[0_0_10px_rgba(217,70,239,0.3)]"
                    title="Insert proposal"
                  >
                    {prop}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input Bar */}
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
              }}
              className={`p-2.5 rounded-xl border transition-all active:scale-95 duration-200 ${
                showMediaMenu
                  ? 'bg-indigo-500/30 text-indigo-300 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-white/[0.06] border-white/10'
              }`}
              title="Add media"
            >
              <Plus className={`w-4 h-4 transition-transform duration-300 ${showMediaMenu ? 'rotate-45' : ''}`} />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={t('chat_type_message', 'Type a message...')}
                value={inputText}
                onChange={e => {
                  const val = e.target.value;
                  setInputText(val);
                  if (val.trim().length > 0) {
                    notifyTyping(true);
                  } else {
                    notifyTyping(false);
                  }
                }}
                onBlur={() => notifyTyping(false)}
                onFocus={() => { setShowMediaMenu(false); }}
                className="w-full aura-glass-input rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.35)]"
              />
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="p-2.5 rounded-2xl flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-tr from-cyan-500 via-fuchsia-500 to-pink-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_22px_rgba(217,70,239,0.7)] active:scale-95"
              title={t('chat_send', 'Send message')}
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
        </ScreenshotShield>
      ) : (
        /* Conversation List */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide bg-gradient-to-r from-purple-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">
                {t('chat_conversations', 'Direct Messages')}
              </h2>
              <span className="text-[10px] text-cyan-300 font-medium">{conversations.length} {t('chat_active_chats', 'chats')}</span>
            </div>
            {/* Gear icon for global chat privacy on chat list page */}
            <button
              id="btn-global-chat-settings-gear"
              type="button"
              onClick={() => setShowGlobalPrivacyModal(true)}
              className="p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 hover:border-cyan-400/50 transition active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.2)] flex items-center justify-center"
              title="Chat Privacy Settings"
            >
              <Settings className="w-4 h-4 text-cyan-300" />
            </button>
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
                          src={c.otherParticipant?.photos?.[0]?.url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800'}
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
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 max-w-[210px]">
                        {c.lastMessage && c.lastMessage.senderId === currentUserId && (
                          <span className="shrink-0" title={c.lastMessage.status === 'READ' || c.lastMessage.readStatus ? 'Odczytano (Seen)' : 'Dostarczono (Delivered)'}>
                            {c.lastMessage.status === 'READ' || c.lastMessage.readStatus ? (
                              <CheckCheck className="w-3 h-3 text-cyan-300 stroke-[2.4]" />
                            ) : (
                              <CheckCheck className="w-3 h-3 text-white/50 stroke-[2]" />
                            )}
                          </span>
                        )}
                        <p className="truncate">
                          {c.lastMessage?.text || 'Tap to open conversation'}
                        </p>
                      </div>
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

      {/* 1:1 Video / Voice Call Modal Fallback */}
      {videoCallActive && (activeConv?.otherParticipant || incomingCallData) && (
        <VideoCallModal
          isOpen={videoCallActive}
          isIncoming={!!incomingCallData}
          currentUserId={currentUserId}
          targetUser={{
            id: incomingCallData?.senderId || activeConv?.otherParticipant?.id || '',
            displayName: incomingCallData?.senderName || activeConv?.otherParticipant?.displayName || 'Użytkownik AURA',
            photoUrl: incomingCallData?.senderPhoto || activeConv?.otherParticipant?.photos?.[0]?.url,
            role: activeConv?.otherParticipant?.identityRole
          }}
          authToken={authToken}
          incomingSignalData={incomingCallData}
          callType={currentCallType}
          onClose={() => {
            setVideoCallActive(false);
            setIncomingCallData(null);
          }}
        />
      )}

      {/* Media Permissions Modal on WebRTC Call Initiation */}
      <MediaPermissionModal
        isOpen={showCallPermissionModal}
        onClose={() => setShowCallPermissionModal(false)}
        onGranted={() => {
          setShowCallPermissionModal(false);
          setVideoCallActive(true);
        }}
        callTargetName={activeConv?.otherParticipant?.displayName || 'Użytkownik AURA'}
      />

      {/* Global Chat Privacy Settings Modal (opened via Gear icon on chat list) */}
      <GlobalChatSettingsModal
        isOpen={showGlobalPrivacyModal}
        onClose={() => setShowGlobalPrivacyModal(false)}
        authToken={authToken}
      />

      {/* Star Video Short Camera Recorder Modal */}
      {showStarVideoModal && (
        <StarVideoRecorderModal
          isOpen={showStarVideoModal}
          onClose={() => setShowStarVideoModal(false)}
          onSend={handleSendStarVideo}
          authToken={authToken}
          targetUserName={activeConv?.otherParticipant?.displayName || 'rozmówcy'}
        />
      )}
    </div>
  );
};
