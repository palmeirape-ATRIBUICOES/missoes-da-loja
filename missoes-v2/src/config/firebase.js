import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDsWJ9VVMSIsQNtifkLVnRNnbzU7favF7s",
  authDomain: "missoes-drive.firebaseapp.com",
  projectId: "missoes-drive",
  storageBucket: "missoes-drive.firebasestorage.app",
  messagingSenderId: "198254465545",
  appId: "1:198254465545:web:dce028792e2c2c57161ed8"
}

export const app = initializeApp(firebaseConfig)

// Enable full offline persistent cache in SQLite/IndexedDB via Firestore SDK
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
})

export const auth = getAuth(app)
