import React from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connectivity check as per instructions
async function testConnection() {
  if (firebaseConfig.projectId.includes('remixed-') || firebaseConfig.apiKey.includes('remixed-')) {
    console.warn("🛡️ Academy System: Firebase is in Demo Mode (Placeholder detected). Real-time features disabled.");
    return;
  }

  try {
    // Attempt doc read to verify connectivity
    const connDoc = doc(db, 'test', 'connection');
    await getDoc(connDoc);
    console.info("🛡️ Academy System: Connection verified.");
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.error("🛡️ Academy System: Connection check failed due to rules. Please verify your Firestore rules.");
    } else {
      console.warn("🛡️ Academy System: Connection check timed out or failed. Operating in offline/degraded mode.", error.message);
    }
  }
}
testConnection();

/**
 * Checks if the current user is an administrator.
 */
export async function checkAdmin(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  // Hardcoded master admin for first run/setup
  if (user.email === 'ahmed25000681@gmail.com') return true;

  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
  } catch (e: any) {
    console.warn("🛡️ Admin check failed:", e.message);
    return false;
  }
}

/**
 * Hook to get reactive admin status.
 */
export function useAdmin() {
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const res = await checkAdmin();
        setIsAdmin(res);
      } else {
        setIsAdmin(false);
      }
    });
    return unsub;
  }, []);

  return isAdmin;
}

// Error handler utility
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
