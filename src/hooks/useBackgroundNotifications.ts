import { useEffect, useRef } from 'react';

export function useBackgroundNotifications(token: string | null) {
  const knownMatchIdsRef = useRef<Set<string>>(new Set());
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (!token) return;

    // Check if browser supports notifications
    if (!('Notification' in window)) return;

    const checkNotifications = async () => {
      // Only proceed if notifications are granted
      if (Notification.permission !== 'granted') return;

      try {
        const [convRes, matchRes] = await Promise.all([
          fetch('/api/conversations', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/matches', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (convRes.ok && matchRes.ok) {
          const convData = await convRes.json();
          const matchData = await matchRes.json();

          let newMessagesCount = 0;
          let newMatchesCount = 0;
          let latestMessageText = '';
          let latestMatchName = '';
          let senderName = '';

          // Check for new messages
          convData.conversations?.forEach((conv: any) => {
            if (conv.lastMessage && conv.lastMessage.senderId === conv.otherParticipant.id) {
              if (!knownMessageIdsRef.current.has(conv.lastMessage.id)) {
                if (!isInitialLoadRef.current) {
                  newMessagesCount++;
                  
                  if (conv.lastMessage.type === 'STICKER') {
                    latestMessageText = 'Sent a sticker';
                  } else if (conv.lastMessage.photoUrl || conv.lastMessage.media) {
                    latestMessageText = 'Sent a photo/media';
                  } else if (conv.lastMessage.location) {
                    latestMessageText = 'Shared a location';
                  } else {
                    latestMessageText = conv.lastMessage.text || 'Sent an attachment';
                  }
                  
                  senderName = conv.otherParticipant.displayName;
                }
                knownMessageIdsRef.current.add(conv.lastMessage.id);
              }
            }
          });

          // Check for new matches
          matchData.matches?.forEach((match: any) => {
            if (!knownMatchIdsRef.current.has(match.id)) {
              if (!isInitialLoadRef.current) {
                newMatchesCount++;
                latestMatchName = match.user.displayName;
              }
              knownMatchIdsRef.current.add(match.id);
            }
          });

          // If the app is actively in use, we still tracked the new IDs so we don't notify later.
          // We only fire the native push notification if the document is not visible.
          if (!isInitialLoadRef.current && document.visibilityState !== 'visible') {
            if (newMatchesCount > 0) {
              new Notification('New Match! 🔥', {
                body: newMatchesCount === 1 ? `You matched with ${latestMatchName}!` : `You have ${newMatchesCount} new matches!`,
                icon: '/icon.svg'
              });
            }

            if (newMessagesCount > 0) {
              new Notification(`New message from ${senderName}`, {
                body: newMessagesCount === 1 ? latestMessageText : `You have ${newMessagesCount} new messages!`,
                icon: '/icon.svg'
              });
            }
          }

          // Mark initial load as completed
          isInitialLoadRef.current = false;
        }
      } catch (err) {
        console.error('Background notification check failed:', err);
      }
    };

    // Run immediately
    checkNotifications();

    // Poll periodically while app is alive (even if hidden)
    const intervalId = setInterval(checkNotifications, 10000);

    return () => clearInterval(intervalId);
  }, [token]);
}
