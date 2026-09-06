import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile as updateAuthProfile,
  User as FirebaseUser
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
import { auth, googleProvider, db } from '../lib/firebase';
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

  return {
    id: fbUser.uid,
    email: fbUser.email || '',
    role: firestoreData?.role || 'USER',
    status: firestoreData?.status || 'ACTIVE',
    isAgeVerified18Plus: true,
    createdAt: firestoreData?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: defaultProfile
  };
}

/**
 * Sign in using Google OAuth Popup with Firebase Auth
 */
export async function signInWithGoogle(): Promise<{ token: string; user: UserAccount }> {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;
  const token = await fbUser.getIdToken();

  const userDocRef = doc(db, 'users', fbUser.uid);
  const userDocSnap = await getDoc(userDocRef);

  let userAccount: UserAccount;

  if (userDocSnap.exists()) {
    const firestoreData = userDocSnap.data();
    userAccount = formatUserAccount(fbUser, firestoreData);
  } else {
    // New user signing in with Google - create profile in Firestore
    userAccount = formatUserAccount(fbUser, {
      displayName: fbUser.displayName || 'New Member',
      photos: [
        {
          id: `ph-${Date.now()}`,
          url: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
          isPrimary: true
        }
      ]
    });

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
  }

  return { token, user: userAccount };
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
  const userDocSnap = await getDoc(userDocRef);

  let firestoreData = null;
  if (userDocSnap.exists()) {
    firestoreData = userDocSnap.data();
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
}

/**
 * Sign out from Firebase Auth
 */
export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}
