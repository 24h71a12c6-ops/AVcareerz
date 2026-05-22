/* global firebase */

(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyB-wuGgZ5h0zmxbhBZ_7vSlsrKOXXiVmxc",
    authDomain: "abroadvisioncarrerz-1cde5.firebaseapp.com",
    projectId: "abroadvisioncarrerz-1cde5",
    storageBucket: "abroadvisioncarrerz-1cde5.firebasestorage.app",
    messagingSenderId: "891545337313",
    appId: "1:891545337313:web:7cb86e844ec2b5326da6a0",
    measurementId: "G-BPZP145YRE"
  };

  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK is not loaded.');
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  window.firebaseConfig = firebaseConfig;
  window.auth = auth;
  window.db = db;

  window.decodeJwtResponse = function decodeJwtResponse(token) {
    try {
      const payload = String(token || '').split('.')[1] || '';
      if (!payload) return {};
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(base64).split('').map((char) => {
        return `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`;
      }).join(''));
      return JSON.parse(json);
    } catch (error) {
      console.warn('Unable to decode JWT payload:', error);
      return {};
    }
  };

  window.signInWithGoogle = async function signInWithGoogle() {
    try {
      if (!window.auth) throw new Error('Firebase auth not initialized');

      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await auth.signInWithPopup(provider);
      const user = result && result.user ? result.user : auth.currentUser;
      const email = String(user && user.email ? user.email : '').trim().toLowerCase();

      if (email) {
        localStorage.setItem('userEmail', email);
        localStorage.setItem('isSessionActive', 'true');
        sessionStorage.setItem('isSessionActive', 'true');
      }

      // Attempt to create/update a minimal user record in Firestore so sign-ins are tracked.
      try {
        if (typeof db !== 'undefined' && email) {
          await db.collection('users').doc(email).set({
            email,
            displayName: (user && user.displayName) || '',
            photoURL: (user && user.photoURL) || '',
            lastSignIn: firebase.firestore.FieldValue.serverTimestamp(),
            provider: 'google'
          }, { merge: true });
        }
      } catch (err) {
        console.warn('Failed to write user record to Firestore after popup sign-in:', err);
      }

      window.location.replace('next-form.html');
    } catch (error) {
      console.error('Google sign-in failed:', error);
      alert('Google sign-in failed. Please try again.');
    }
  };
})();