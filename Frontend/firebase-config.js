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
        const uid = String(user && user.uid ? user.uid : '').trim();

      if (email) {
        localStorage.setItem('userEmail', email);
          if (uid) localStorage.setItem('currentUserUid', uid);
        localStorage.setItem('isSessionActive', 'true');
        sessionStorage.setItem('isSessionActive', 'true');
        // Do not set pendingApplicationStep here or redirect to next-form immediately.
        // Let the app's routing helper (server-aware) decide the correct destination.
        try { localStorage.removeItem('formSubmittedSuccessfully'); } catch {}
        try { localStorage.removeItem('isApplicationDone'); } catch {}
        try { localStorage.removeItem('applicationCompleted'); } catch {}
        try { sessionStorage.removeItem('applicationCompleted'); } catch {}
        // If we have cached registration/next-form data locally, the user likely
        // completed those steps earlier in this browser/tab; clear any lingering
        // pendingApplicationStep so routing helper can decide correctly.
        try {
          const hasReg = !!(localStorage.getItem('registrationData') || sessionStorage.getItem('registrationData'));
          const hasNext = !!(localStorage.getItem('nextFormData') || sessionStorage.getItem('nextFormData'));
          if (hasReg || hasNext) {
            try { sessionStorage.removeItem('pendingApplicationStep'); } catch {}
            try { localStorage.removeItem('pendingApplicationStep'); } catch {}
          }
        } catch {}
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

      // Prefer calling the app routing helper so it can consult the backend and
      // redirect the user to the correct page (already-registered or next-form).
      try {
        const waitForRouteHelper = async (timeoutMs = 2000, intervalMs = 100) => {
          const start = Date.now();
          while (Date.now() - start < timeoutMs) {
            if (typeof window.routeSignedInUserToCorrectPage === 'function') return window.routeSignedInUserToCorrectPage;
            await new Promise(r => setTimeout(r, intervalMs));
          }
          return null;
        };

        const helper = await waitForRouteHelper(2000, 100);
        if (helper) {
          await helper();
        } else {
          // As a fallback, perform a quick backend check and redirect to already-registered if completed
          try {
            const res = await fetch(`/api/check-application-status?email=${encodeURIComponent(email)}`);
            const json = await res.json().catch(() => null);
            if (res.ok && json && json.success && json.completed) {
              try { localStorage.setItem('applicationCompleted', '1'); } catch {}
              try { localStorage.setItem('isApplicationDone', 'true'); } catch {}
              try { sessionStorage.setItem('applicationCompleted', '1'); } catch {}
              try { sessionStorage.removeItem('pendingApplicationStep'); } catch {}
              try { localStorage.removeItem('pendingApplicationStep'); } catch {}
              try { window.location.replace('already-registered.html'); return; } catch (e) { window.location.href = 'already-registered.html'; return; }
            }
          } catch (err) {
            // ignore
          }
          window.location.replace('index.html');
        }
      } catch (err) {
        try { window.location.replace('index.html'); } catch (e) { /* ignore */ }
      }
    } catch (error) {
      console.error('Google sign-in failed:', error);
      alert('Google sign-in failed. Please try again.');
    }
  };
})();