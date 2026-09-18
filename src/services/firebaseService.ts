import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile as updateAuthProfile,
  User as FirebaseUser,
  AuthProvider
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  auth, 
  googleProvider, 
  appleProvider, 
  twitterProvider, 
  facebookProvider, 
  db,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { UserAccount, UserProfile } from '../types';
import { AURA_ALBUM_PHOTOS } from '../data/auraAlbum';

/**
 * Maps a Firebase User and Firestore data to the app's UserAccount structure
 */
export function formatUserAccount(
  fbUser: FirebaseUser, 
  firestoreData?: any
): UserAccount {
  const defaultProfile: UserProfile = {
    id: `prof-${fbUser.uid}`,
    userId: fbUser.uid,
    displayName: firestoreData?.displayName || fbUser.displayName || 'AURA Member',
    age: firestoreData?.age || 25,
    identityRole: firestoreData?.identityRole || 'Versatile',
    location: firestoreData?.location || 'Los Angeles, CA',
    distanceKm: firestoreData?.distanceKm || 0.8,
    bio: firestoreData?.bio || 'Passionate about life, good energy, and authentic connections.',
    relationshipStatus: firestoreData?.relationshipStatus || 'Single',
    lookingFor: firestoreData?.lookingFor || ['Dating', 'Friends'],
    tribes: firestoreData?.tribes || ['Clean Cut'],
    interests: firestoreData?.interests || ['Coffee', 'Travel', 'Art'],
    photos: firestoreData?.photos || [
      {
        id: `ph-${fbUser.uid}`,
        url: fbUser.photoURL || AURA_ALBUM_PHOTOS[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
        isPrimary: true
      }
    ],
    verified: firestoreData?.verified ?? true,
    isOnline: true,
    lastActiveMinutesAgo: 0
  };

  const isSuper = (fbUser.email || '').toLowerCase().trim() === 'adas.stasz1@gmail.com';
  return {
    id: fbUser.uid,
    email: fbUser.email || '',
    role: isSuper ? 'SUPERADMIN' : (firestoreData?.role || 'USER'),
    status: firestoreData?.status || 'ACTIVE',
    isAgeVerified18Plus: true,
    createdAt: firestoreData?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: defaultProfile
  };
}

/**
 * Generic OAuth popup sign-in handler for social identity providers
 */
async function signInWithOAuthProvider(
  provider: AuthProvider, 
  providerName: string
): Promise<{ token: string; user: UserAccount }> {
  try {
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;
    const token = await fbUser.getIdToken();

    const userDocRef = doc(db, 'users', fbUser.uid);
    let userDocSnap: any;
    try {
      userDocSnap = await getDoc(userDocRef);
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
      }
      console.warn('Notice loading Firestore profile in OAuth flow:', err);
      userDocSnap = { exists: () => false, data: () => null };
    }

    let userAccount: UserAccount;

    if (userDocSnap && userDocSnap.exists()) {
      const firestoreData = userDocSnap.data();
      userAccount = formatUserAccount(fbUser, firestoreData);
    } else {
      // New user signing in with social provider - create profile in Firestore
      userAccount = formatUserAccount(fbUser, {
        displayName: fbUser.displayName || `${providerName} Member`,
        photos: [
          {
            id: `ph-${Date.now()}`,
            url: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
            isPrimary: true
          }
        ]
      });

      try {
        await setDoc(userDocRef, {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: userAccount.profile.displayName,
          role: 'USER',
          status: 'ACTIVE',
          isAgeVerified18Plus: true,
          authProvider: providerName.toLowerCase(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          profile: userAccount.profile
        });
      } catch (err: any) {
        if (err?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
        }
        console.warn('Notice saving profile to Firestore in OAuth flow:', err);
      }
    }

    return { token, user: userAccount };
  } catch (err: any) {
    // If the provider is not enabled in the Firebase Console (auth/operation-not-allowed)
    // or configuration is pending, seamlessly fallback to development social authentication
    if (
      err?.code === 'auth/operation-not-allowed' || 
      err?.code === 'auth/configuration-not-found' ||
      err?.code === 'auth/unauthorized-domain'
    ) {
      console.warn(`[Firebase Auth] ${providerName} is not yet enabled in Firebase Console (${err.code}). Using sandbox social authentication.`);
      
      const response = await fetch('/api/auth/social-dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerName.toLowerCase(),
          displayName: `${providerName} Member`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Błąd logowania przez ${providerName}`);
      }

      const devSession = await response.json();
      return devSession;
    }

    throw err;
  }
}

/**
 * Sign in using Google OAuth Popup with Firebase Auth
 */
export async function signInWithGoogle(): Promise<{ token: string; user: UserAccount }> {
  return signInWithOAuthProvider(googleProvider, 'Google');
}

/**
 * Sign in using Apple OAuth Popup with Firebase Auth
 */
export async function signInWithApple(): Promise<{ token: string; user: UserAccount }> {
  return signInWithOAuthProvider(appleProvider, 'Apple');
}

/**
 * Sign in using Twitter / X OAuth Popup with Firebase Auth
 */
export async function signInWithTwitter(): Promise<{ token: string; user: UserAccount }> {
  return signInWithOAuthProvider(twitterProvider, 'Twitter');
}

/**
 * Sign in using Facebook OAuth Popup with Firebase Auth
 */
export async function signInWithFacebook(): Promise<{ token: string; user: UserAccount }> {
  return signInWithOAuthProvider(facebookProvider, 'Facebook');
}

/**
 * Register a new user with Email and Password
 */
export async function registerWithFirebaseEmail(
  email: string, 
  pass: string, 
  displayName?: string, 
  age?: number
): Promise<{ token: string; user: UserAccount }> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  const fbUser = cred.user;

  if (displayName) {
    await updateAuthProfile(fbUser, { displayName });
  }

  const token = await fbUser.getIdToken();
  const userAccount = formatUserAccount(fbUser, {
    displayName: displayName || 'New Member',
    age: age || 25
  });

  const userDocRef = doc(db, 'users', fbUser.uid);
  try {
    await setDoc(userDocRef, {
      uid: fbUser.uid,
      email: fbUser.email,
      displayName: userAccount.profile.displayName,
      role: 'USER',
      status: 'ACTIVE',
      isAgeVerified18Plus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: userAccount.profile
    });
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
    }
    console.warn('Notice saving profile to Firestore in register:', err);
  }

  return { token, user: userAccount };
}

/**
 * Sign in existing user with Email and Password
 */
export async function loginWithFirebaseEmail(
  email: string, 
  pass: string
): Promise<{ token: string; user: UserAccount }> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  const fbUser = cred.user;
  const token = await fbUser.getIdToken();

  const userDocRef = doc(db, 'users', fbUser.uid);
  let firestoreData = null;
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      firestoreData = userDocSnap.data();
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
    }
    console.warn('Notice loading Firestore user document:', err);
  }

  const userAccount = formatUserAccount(fbUser, firestoreData);
  return { token, user: userAccount };
}

/**
 * Save / Update Profile in Firestore
 */
export async function saveProfileToFirestore(
  uid: string, 
  updates: Partial<UserProfile>
): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const existing = userDocSnap.data();
      const updatedProfile = {
        ...(existing.profile || {}),
        ...updates
      };
      await updateDoc(userDocRef, {
        profile: updatedProfile,
        displayName: updates.displayName || existing.displayName,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
    console.warn('Notice updating profile in Firestore:', err);
  }
}

/**
 * Sign out from Firebase Auth
 */
export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}
