// Splash Screen functionality
// NOTE: Using `load` waits for ALL images to download, which can make the site feel "stuck"
// on slower connections. We show the splash quickly and remove it on DOM ready.
(() => {
    try {
        const canonicalHost = 'abroad-vision-carrerz-heg3.onrender.com';
        const host = String(window.location.hostname || '').toLowerCase();

        // If someone opens the separate Render frontend service, forward them to the
        // backend service that serves the same frontend + API in one place.
        if (host.endsWith('.onrender.com') && host !== canonicalHost) {
            const target = `${window.location.protocol}//${canonicalHost}${window.location.pathname}${window.location.search}${window.location.hash}`;
            window.location.replace(target);
            return;
        }
    } catch {
        // ignore canonical redirect issues; continue loading the page normally
    }
})();

// Preemptive splash protection: allow the intended cinematic to run for a
// short time (3s), then remove it as a fallback if it is still present.
// This avoids hiding it immediately while preserving protection against
// long stalls.
try {
    (function preemptiveSplashBlock() {
        const WAIT_BEFORE_BLOCK_MS = 3500; // allow cinematic to run ~3s
        const MAX_BLOCK_MS = 35000; // overall observer lifetime

        const installBlocker = () => {
            try {
                // Inject blocking style
                const style = document.createElement('style');
                style.id = 'splash-blocker-style';
                style.textContent = '#splash-screen{display:none !important; opacity:0 !important; visibility:hidden !important; pointer-events:none !important;}';
                (document.head || document.documentElement).appendChild(style);
            } catch (e) { /* ignore */ }

            const removeSplash = () => {
                try {
                    const s = document.getElementById('splash-screen');
                    if (s && s.parentNode) s.parentNode.removeChild(s);
                    document.body.classList.remove('splash-active');
                    document.documentElement.classList.remove('splash-loading');
                } catch (err) { /* ignore */ }
            };

            try {
                const mo = new MutationObserver((mutations) => {
                    for (const m of mutations) {
                        if (!m.addedNodes) continue;
                        for (const n of m.addedNodes) {
                            try {
                                if (n && n.id === 'splash-screen') {
                                    if (n.parentNode) n.parentNode.removeChild(n);
                                }
                            } catch {}
                        }
                    }
                });

                mo.observe(document.documentElement || document, { childList: true, subtree: true });

                // Stop observing and remove the blocking style after MAX_BLOCK_MS
                setTimeout(() => {
                    try { mo.disconnect(); } catch {}
                    try {
                        const st = document.getElementById('splash-blocker-style');
                        if (st && st.parentNode) st.parentNode.removeChild(st);
                    } catch {}
                }, MAX_BLOCK_MS);

                // One-off cleanup only after the cinematic window has elapsed.
                setTimeout(removeSplash, 50);
            } catch (e) {
                // ignore
            }
        };

        // Delay installer so the 3s cinematic can show for new users.
        // Add a tiny cushion so the splash has time to finish its fade.
        try { setTimeout(installBlocker, WAIT_BEFORE_BLOCK_MS + 250); } catch {}
    })();
} catch (e) {
    // ignore
}

// Recover scheduled registration popup if the inline script set sessionStorage but
// the custom event was missed (e.g., script load ordering). This will open the
// modal after the remaining time when appropriate.
    try {
        (function recoverScheduledPopup() {
            // If a recent sign-in flow asked us to skip modals on the next
            // load, respect that and clear the skip flag.
            try {
                const skipModal = sessionStorage.getItem('skipModalOnNextPageLoad') === '1' || localStorage.getItem('skipModalOnNextPageLoad') === '1';
                if (skipModal) {
                    try { sessionStorage.removeItem('skipModalOnNextPageLoad'); } catch {}
                    try { localStorage.removeItem('skipModalOnNextPageLoad'); } catch {}
                    return;
                }
            } catch {}

        const should = sessionStorage.getItem('av:shouldShowRegistration') === '1';
        const at = parseInt(sessionStorage.getItem('av:showRegistrationAt') || '0', 10) || 0;
        if (!should || !at) return;
        // Ignore stale schedules from previous visits in the same tab.
        if (at <= Date.now() - 1000) {
            try { sessionStorage.removeItem('av:shouldShowRegistration'); sessionStorage.removeItem('av:showRegistrationAt'); sessionStorage.removeItem('forceOpenRegistration'); } catch {}
            return;
        }
        const remaining = Math.max(0, at - Date.now());
        // Only attempt if on home page
        try {
            const path = String(window.location.pathname || '').toLowerCase();
            const isHome = path === '/' || path.endsWith('/index.html');
            if (!isHome) return;
        } catch {
            // ignore
        }

        // Only for logged-out users without completed application
        try {
            if (typeof isRegisteredUser === 'function' && isRegisteredUser()) return;
            if (typeof isApplicationCompleted === 'function' && isApplicationCompleted()) return;
        } catch {}

        setTimeout(() => {
            try {
                if (typeof openRegModal === 'function') openRegModal();
                else document.dispatchEvent(new Event('av:show-registration'));
            } catch (e) { /* ignore */ }
            try { sessionStorage.removeItem('av:shouldShowRegistration'); sessionStorage.removeItem('av:showRegistrationAt'); sessionStorage.removeItem('forceOpenRegistration'); } catch {}
        }, remaining + 50);
    })();
} catch (e) { /* ignore */ }

// Listen for the inline event to show the registration modal after the site opens
document.addEventListener('av:show-registration', () => {
    try {
        // If a sign-in flow recently set a skip flag, don't open the modal.
        try {
            const skipModal = sessionStorage.getItem('skipModalOnNextPageLoad') === '1' || localStorage.getItem('skipModalOnNextPageLoad') === '1';
            if (skipModal) {
                try { sessionStorage.removeItem('skipModalOnNextPageLoad'); } catch {}
                try { localStorage.removeItem('skipModalOnNextPageLoad'); } catch {}
                return;
            }
        } catch {}
        if (typeof showRegistrationSection === 'function') {
            showRegistrationSection({ preferLogin: false });
        } else {
            // If function not yet defined, retry a few times
            let attempts = 0;
            const t = setInterval(() => {
                attempts += 1;
                if (typeof showRegistrationSection === 'function') {
                    showRegistrationSection({ preferLogin: false });
                    clearInterval(t);
                } else if (attempts > 10) {
                    clearInterval(t);
                }
            }, 300);
        }
        try { sessionStorage.removeItem('av:shouldShowRegistration'); sessionStorage.removeItem('av:showRegistrationAt'); } catch {}
    } catch (e) { /* ignore */ }
});

document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    const body = document.body;
    // Show splash on every page load (both new and returning users).
    // If the splash has the `cinematic` class, force a 3s cinematic duration.
    if (!splash) return;

    const shouldSkipSplash = (() => {
        try {
            const skipAfterSignin = sessionStorage.getItem('skipSplashAfterSignIn') === '1' || localStorage.getItem('skipSplashAfterSignIn') === '1';
            if (skipAfterSignin) {
                sessionStorage.removeItem('skipSplashAfterSignIn');
                localStorage.removeItem('skipSplashAfterSignIn');
                return true;
            }
        } catch {
            // ignore
        }
        return false;
    })();

    if (shouldSkipSplash) {
        try {
            splash.remove();
            body?.classList.remove('splash-active');
            document.documentElement.classList.remove('splash-loading');
        } catch {
            // ignore
        }
        return;
    }

    let SPLASH_DURATION_MS = (splash.classList && splash.classList.contains('cinematic')) ? 3000 : 700;
    const SPLASH_FADE_MS = 220;

    // Always add the active class so CSS animations run consistently
    body?.classList.add('splash-active');

    // Short splash (fast open)
    setTimeout(() => {
        try {
            splash.classList.add('fade-away');

            setTimeout(() => {
                try {
                    if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
                } catch (e) { /* ignore */ }
                body?.classList.remove('splash-active');
                document.documentElement.classList.remove('splash-loading');
                }, SPLASH_FADE_MS);
        } catch (err) {
            // ignore
        }
    }, SPLASH_DURATION_MS);

    // Failsafe: never block the page on the splash for too long.
    setTimeout(() => {
        try {
            const s = document.getElementById('splash-screen');
            if (s && s.parentNode) s.parentNode.removeChild(s);
            body?.classList.remove('splash-active');
                document.documentElement.classList.remove('splash-loading');
        } catch {
            // ignore
        }
    }, Math.max(2200, SPLASH_DURATION_MS + SPLASH_FADE_MS + 500));

    // Extra guarantee: force-remove the splash after an explicit timeout so it
    // never remains stuck. Use slightly above the cinematic duration so users
    // always see a 3s reveal when cinematic is present.
    try {
        const FORCE_REMOVE_MS = (splash && splash.classList && splash.classList.contains('cinematic')) ? 3200 : 1200;
        setTimeout(() => {
            try {
                const s2 = document.getElementById('splash-screen');
                if (s2 && s2.parentNode) s2.parentNode.removeChild(s2);
                body?.classList.remove('splash-active');
                document.documentElement.classList.remove('splash-loading');
            } catch {
                // ignore
            }
        }, FORCE_REMOVE_MS);
    } catch {
        // ignore
    }

    // Robustness: observe DOM mutations and remove the splash if it somehow
    // reappears or remains. This helps on browsers where rendering/paint stalls
    // or when other scripts re-insert the splash element.
    try {
        const ensureSplashRemoved = () => {
            try {
                const s = document.getElementById('splash-screen');
                if (s && s.parentNode) {
                    s.parentNode.removeChild(s);
                    console.log('splash: removed by MutationObserver/ensureSplashRemoved');
                }
                document.body.classList.remove('splash-active');
                document.documentElement.classList.remove('splash-loading');
                return true;
            } catch (err) {
                console.warn('splash: ensure removal failed', err);
                return false;
            }
        };

        const mo = new MutationObserver((entries) => {
            for (const e of entries) {
                if (e.addedNodes && e.addedNodes.length) {
                    for (const n of e.addedNodes) {
                        if (n && n.id === 'splash-screen') {
                            // remove it synchronously
                            ensureSplashRemoved();
                        }
                    }
                }
            }
        });

        mo.observe(document.documentElement || document, { childList: true, subtree: true });

        // Safety: disconnect after 10s to avoid keeping observer forever
        setTimeout(() => { try { mo.disconnect(); } catch {} }, 10000);

        // After the 3-second cinematic, make one best-effort cleanup if the
        // splash somehow still exists.
        setTimeout(() => { try { ensureSplashRemoved(); } catch {} }, 3250);
    } catch (err) {
        // ignore observer errors
    }
});

const glowDot = document.querySelector('.cursor-dot-glow');

if (glowDot) {
    window.addEventListener('mousemove', (e) => {
        const posX = e.clientX;
        const posY = e.clientY;

        // Use transform instead of top/left to avoid layout thrashing (smooth scrolling)
        glowDot.style.transform = `translate(${posX}px, ${posY}px) translate(-50%, -50%)`;
    });
}

// Section Focus Mode: blur other sections until the user scrolls/opens them.
// Enabled only on index.html to avoid surprising effects on destination/service pages.
document.addEventListener('DOMContentLoaded', () => {
    try {
        const ENABLE_SECTION_FOCUS_MODE = false;
        if (!ENABLE_SECTION_FOCUS_MODE) return;

        const path = String(window.location.pathname || '').toLowerCase();
        const isIndex = path === '/' || path.endsWith('/index.html') || path.endsWith('index.html');
        if (!isIndex) return;

        // Respect reduced motion preference (blur transitions can feel uncomfortable to some users).
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const sections = Array.from(document.querySelectorAll('body > section'));
        if (sections.length < 2) return;

        document.body.classList.add('section-focus-mode');
        sections.forEach((s) => s.classList.add('page-section'));

        const setFocused = (focusedSection) => {
            if (!focusedSection) return;
            sections.forEach((s) => {
                const isFocused = s === focusedSection;
                s.classList.toggle('is-blurred', !isFocused);
            });
        };

        // Initial focus: follow hash if it points to a section, otherwise first section.
        const hashId = String(window.location.hash || '').replace(/^#/, '').trim();
        const hashTarget = hashId ? document.getElementById(hashId) : null;
        if (hashTarget && hashTarget.tagName === 'SECTION') setFocused(hashTarget);
        else setFocused(sections[0]);

        if (!('IntersectionObserver' in window)) return;

        const state = new Map();
        sections.forEach((s) => state.set(s, { is: false, ratio: 0 }));

        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    state.set(e.target, { is: e.isIntersecting, ratio: e.intersectionRatio });
                }

                // Pick the most-visible intersecting section.
                let best = null;
                let bestRatio = 0;
                for (const [el, v] of state.entries()) {
                    if (!v.is) continue;
                    if (v.ratio >= bestRatio) {
                        best = el;
                        bestRatio = v.ratio;
                    }
                }

                if (best) setFocused(best);
            },
            {
                root: null,
                // Shrink the "viewport" a bit so the centered section wins more reliably.
                rootMargin: '-20% 0px -20% 0px',
                threshold: [0, 0.15, 0.25, 0.35, 0.5, 0.65, 0.8]
            }
        );

        sections.forEach((s) => io.observe(s));
    } catch {
        // Non-fatal: section blur is a progressive enhancement.
    }
});

// Location / map section: branch switcher (no external libs)
document.addEventListener('DOMContentLoaded', () => {
    const section = document.querySelector('.av-location-section');
    if (!section) return;

    const info = section.querySelector('#branch-info');

    const map = section.querySelector('#loc-map') || section.querySelector('#branch-map');
    const directions = section.querySelector('#direction-link');
    const callLink = section.querySelector('#call-link');
    const statusEl = section.querySelector('#branch-status');
    const pulse = section.querySelector('.modern-pulse');
    const buttons = Array.from(section.querySelectorAll('.loc-pill[data-branch], .av-branch-btn[data-branch]'));
    if (!info || !map || buttons.length === 0) return;

    const normalizeBranchKey = (rawKey) => {
        const k = String(rawKey || '').trim().toLowerCase();
        if (k === 'vuyyuru' || k === 'vuy') return 'vuy';
        if (k === 'vijayawada' || k === 'vjy') return 'vjy';
        if (k === 'hyderabad' || k === 'hyd') return 'hyd';
        return k;
    };

    const branches = {
        vuy: {
            label: 'Vuyyuru',
            address: '30/102 ground floor, DBR complex, Vuyyuru, 521165 Andhra Pradesh',
            phone: '+91 70367 77567'
        },
        vjy: {
            label: 'Vijayawada',
            address: '1st floor Sri Sai Balaji Towers, AS RamaRao Road, Moghalrajpuram, Vijayawada, 520010',
            phone: '+91 70367 77567'
        },
        hyd: {
            label: 'Hyderabad',
            address: '10/A Sarala Mansion, SR Nagar X Roads, Vengal Rao Nagar, Hyderabad 500038 Telangana',
            phone: '+91 70367 77567'
        }
    };

    const toMapSrc = (address) => `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
    const toDirectionsHref = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

    const toTelHref = (phone) => {
        const digits = (phone || '').replace(/[^\d+]/g, '');
        return digits ? `tel:${digits}` : 'tel:+917036777567';
    };

    // Live status (Mon–Sat, 10:00–18:00 IST). Uses Asia/Kolkata even if user is abroad.
    const getIndiaNow = () => {
        try {
            const parts = new Intl.DateTimeFormat('en-IN', {
                timeZone: 'Asia/Kolkata',
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).formatToParts(new Date());

            const get = (t) => parts.find((p) => p.type === t)?.value;
            const weekday = get('weekday') || '';
            const hour = Number(get('hour') || '0');
            const minute = Number(get('minute') || '0');
            return { weekday, hour, minute };
        } catch {
            const d = new Date();
            return { weekday: d.toLocaleString('en-IN', { weekday: 'short' }), hour: d.getHours(), minute: d.getMinutes() };
        }
    };

    const computeOpenStatus = () => {
        const { weekday, hour, minute } = getIndiaNow();
        const isSunday = /^sun/i.test(String(weekday));
        if (isSunday) return { open: false, text: '○ Closed • Opens Mon 10:00 AM' };

        const mins = hour * 60 + minute;
        const openMins = 10 * 60;
        const closeMins = 18 * 60;

        if (mins >= openMins && mins < closeMins) return { open: true, text: '● Open Now' };
        if (mins < openMins) return { open: false, text: '○ Closed • Opens 10:00 AM' };
        return { open: false, text: '○ Closed • Opens Tomorrow 10:00 AM' };
    };

    const renderStatus = () => {
        if (!statusEl) return;
        const s = computeOpenStatus();
        statusEl.textContent = s.text;
        statusEl.classList.toggle('is-closed', !s.open);
    };

    const setActive = (rawBranchKey) => {
        const branchKey = normalizeBranchKey(rawBranchKey);
        const branch = branches[branchKey];
        if (!branch) return;

        // Update active state
        buttons.forEach((b) => {
            const bKey = normalizeBranchKey(b.dataset.branch);
            const isActive = bKey === branchKey;
            b.classList.toggle('is-active', isActive);
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        // Update content
        const addrSpan = info.querySelector('#addr-text');
        if (addrSpan) {
            addrSpan.textContent = branch.address;
        } else {
            info.innerHTML = `<p><i class="fas fa-map-marker-alt" aria-hidden="true"></i> ${branch.address}</p>`;
        }

        if (directions) {
            directions.href = toDirectionsHref(branch.address);
        }

        if (callLink) {
            callLink.href = toTelHref(branch.phone);
        }

        // Live status badge
        renderStatus();

        // Pulse feedback (restart animation each change)
        if (pulse) {
            pulse.classList.remove('is-animating');
            // force reflow to restart animation
            void pulse.offsetWidth;
            pulse.classList.add('is-animating');
        }

        // Smooth map transition (fade out -> swap src -> fade in)
        try { map.style.opacity = '0'; } catch { /* ignore */ }

        const nextSrc = toMapSrc(branch.address);
        const restoreOpacity = () => {
            try { map.style.opacity = '1'; } catch { /* ignore */ }
        };

        const onLoad = () => {
            map.removeEventListener('load', onLoad);
            restoreOpacity();
        };

        map.addEventListener('load', onLoad);

        setTimeout(() => {
            map.src = nextSrc;
            // Failsafe: if load doesn't fire (rare), restore anyway.
            setTimeout(restoreOpacity, 900);
        }, 250);
    };

    // Expose for inline onclick in Modern Square markup
    window.switchLoc = (key) => setActive(String(key || '').trim());

    // Bind clicks
    buttons.forEach((btn) => {
        btn.addEventListener('click', () => setActive(btn.dataset.branch));
    });

    // Initialize from markup (first active or fallback)
    const initial = buttons.find((b) => b.classList.contains('active') || b.classList.contains('is-active'))?.dataset.branch || 'vuy';
    setActive(initial);

    // Update status periodically (in case user leaves the page open)
    renderStatus();
    setInterval(renderStatus, 60 * 1000);
});

// --- API Configuration (Global Scope) ---
// Define the backend service URL for connection

const BACKEND_SERVICE_URL = 'https://abroad-vision-carrerz-heg3.onrender.com';
const API_BASE_URL = BACKEND_SERVICE_URL;

// --- Supabase Auth (for password reset only) ---
const SUPABASE_URL = 'https://qokwtutsouipqkkijbdo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFva3d0dXRzb3VpcHFra2lqYmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NDQ2OTIsImV4cCI6MjA4NzMyMDY5Mn0.oBn1lAFRhfy2vG_dmIt-AvA4S8lq-j3cRUzxcl-F5so';
const supabaseClient = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

/**
 * Helper function to construct full API URLs
 * @param {string} path - The endpoint path (e.g., '/api/register')
 * @returns {string} - The full URL to the backend
 */
const apiUrl = (path) => {
    const p = String(path || '');
    const cleanPath = p.startsWith('/') ? p : `/${p}`;
    return `${API_BASE_URL}${cleanPath}`;
};

// Global exit-lead sync (Sign-up/Login/any page using script.js)
// Next-form has its own dedicated capture logic in next-form.html.
(function initGlobalLeadSync() {
    try {
        if (window.__globalLeadSyncInitialized) return;
        window.__globalLeadSyncInitialized = true;

        if (typeof window.leadSent !== 'boolean') {
            window.leadSent = false;
        }

        const getFirstValue = (selectors) => {
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (!el || typeof el.value !== 'string') continue;
                const v = el.value.trim();
                if (v) return v;
            }
            return '';
        };

        const resolveContext = () => {
            const path = String(window.location.pathname || '').toLowerCase();
            if (path.includes('login')) return 'Login Page Exit';
            if (path.includes('signup') || path.includes('register')) return 'Sign-up Page Exit';
            if (path.includes('next-form') || path.endsWith('/next') || path.includes('/next/')) return 'Next-Form Exit';
            return 'User Exit';
        };

        const syncLead = (triggerPoint) => {
            if (window.leadSent) return;

            const fullName = getFirstValue([
                'input[placeholder*="Name"]',
                'input[name*="name"]',
                'input[id*="name"]'
            ]);

            const phone = getFirstValue([
                'input[placeholder*="Phone"]',
                'input[name*="phone"]',
                'input[id*="phone"]',
                'input[type="tel"]'
            ]);

            const email = getFirstValue([
                'input[placeholder*="Email"]',
                'input[name*="email"]',
                'input[id*="email"]',
                'input[type="email"]'
            ]);

            const phoneDigits = phone.replace(/\D/g, '');
            if (fullName.length <= 2 && phoneDigits.length <= 5) return;

            const payload = {
                fullName,
                phone,
                email,
                source: triggerPoint || resolveContext(),
                url: window.location.pathname
            };

            const endpoint = apiUrl('/api/partial-lead');
            const body = JSON.stringify(payload);

            let sent = false;
            try {
                if (navigator.sendBeacon) {
                    sent = navigator.sendBeacon(endpoint, body);
                }
            } catch {
                sent = false;
            }

            if (!sent) {
                fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body,
                    keepalive: true
                }).catch(() => {});
            }

            window.leadSent = true;
        };

        window.syncLead = syncLead;

        ['pagehide', 'visibilitychange', 'beforeunload'].forEach((evt) => {
            window.addEventListener(evt, () => {
                if (evt === 'visibilitychange' && document.visibilityState !== 'hidden') return;
                syncLead(resolveContext());
            }, { capture: true });
        });
    } catch {
        // non-fatal
    }
})();

// global auth helpers (available everywhere in script)
const isRegisteredUser = () => {
    // Check primary registration indicators first (don't require session to be active)
    if (!!localStorage.getItem('userEmail') || localStorage.getItem('hasSignedUp') === '1') return true;
    // Also check legacy flags
    try {
        if (localStorage.getItem('isRegistered') === 'true') return true;
    } catch {}
    return false;
};

const isApplicationCompleted = () => {
    // Check if user is registered first
    if (!isRegisteredUser()) return false;
    // Check if application is done
    if (localStorage.getItem('isApplicationDone') === 'true') return true;
    if (localStorage.getItem('applicationCompleted') === '1') return true;
    return false;
};

const fetchApplicationCompletedForEmail = async (email) => {
    const safeEmail = String(email || '').trim();
    if (!safeEmail) return null;

    try {
        const res = await fetch(apiUrl(`/api/check-application-status?email=${encodeURIComponent(safeEmail)}`));
        const data = await res.json();
        if (res.ok && data && data.success) {
            return !!data.completed;
        }
    } catch (err) {
        console.warn('Failed to fetch application status for', safeEmail, err);
    }

    return null;
};

const sanitizeProfileRecord = (input) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

    const skipKeys = new Set(['uploaded_files', 'created_at', 'updated_at', 'email_lc', 'user_id', 'password', 'id']);
    const output = {};

    Object.entries(input).forEach(([key, value]) => {
        if (!key) return;
        const lowerKey = String(key).toLowerCase();
        if (skipKeys.has(lowerKey)) return;
        if (value === null || value === undefined) return;
        if (typeof value === 'object') return;

        const str = String(value).trim();
        if (!str) return;
        output[key] = value;
    });

    return output;
};

const hydrateProfileFromServer = async (email) => {
    const safeEmail = String(email || '').trim();
    if (!safeEmail) return null;

    try {
        const res = await fetch(apiUrl(`/api/check-application-status?email=${encodeURIComponent(safeEmail)}`));
        const data = await res.json();
        if (!res.ok || !data || !data.success) return null;

        const registrationData = sanitizeProfileRecord(data.registrationData || {});
        const nextFormData = sanitizeProfileRecord(data.nextFormData || {});

        if (Object.keys(registrationData).length > 0) {
            if (!registrationData.email) registrationData.email = safeEmail;
            sessionStorage.setItem('registrationData', JSON.stringify(registrationData));
            localStorage.setItem('registrationData', JSON.stringify(registrationData));
        }

        if (Object.keys(nextFormData).length > 0) {
            sessionStorage.setItem('nextFormData', JSON.stringify(nextFormData));
            localStorage.setItem('nextFormData', JSON.stringify(nextFormData));
        }

        if (data.completed) {
            localStorage.setItem('applicationCompleted', '1');
            localStorage.setItem('isApplicationDone', 'true');
            sessionStorage.setItem('applicationCompleted', '1');
        } else {
            localStorage.removeItem('applicationCompleted');
            localStorage.removeItem('isApplicationDone');
            sessionStorage.removeItem('applicationCompleted');
        }

        if (safeEmail) {
            localStorage.setItem('userEmail', safeEmail);
            try { localStorage.setItem('lastUserEmail', safeEmail); } catch { }
        }

        try {
            if (typeof window.__updateProfileBadge === 'function') window.__updateProfileBadge();
        } catch {
            // ignore
        }

        return { completed: !!data.completed, registrationData, nextFormData };
    } catch (error) {
        console.warn('Failed to hydrate profile data for', safeEmail, error);
        return null;
    }
};

const routeSignedInUserToCorrectPage = async () => {
    const email = String(localStorage.getItem('userEmail') || '').trim();
    if (!email) return false;

    // Mark the session active so step pages (next-form / already-registered / congrats)
    // do not bounce back to the home page and re-trigger splash/popup flows.
    try { sessionStorage.setItem('isSessionActive', 'true'); } catch {}
    try { localStorage.setItem('isSessionActive', 'true'); } catch {}

    // Hydrate from server to learn if the user already has saved registration/next-form data.
    const hydrated = await hydrateProfileFromServer(email);

    // Use cached flags first, then confirm with the backend if needed.
    let completed = isApplicationCompleted();
    if (hydrated && typeof hydrated.completed === 'boolean') {
        completed = !!hydrated.completed;
    } else if (!completed) {
        const remoteCompleted = await fetchApplicationCompletedForEmail(email);
        if (remoteCompleted === true) {
            completed = true;
            try {
                localStorage.setItem('applicationCompleted', '1');
                localStorage.setItem('isApplicationDone', 'true');
            } catch {
                // ignore
            }
        }
    }

    // Prevent splash/modal from showing on the next page load when we are
    // intentionally navigating the signed-in user.
    try { sessionStorage.setItem('skipSplashAfterSignIn', '1'); } catch {}
    try { localStorage.setItem('skipSplashAfterSignIn', '1'); } catch {}
    try { sessionStorage.setItem('skipModalOnNextPageLoad', '1'); } catch {}
    try { localStorage.setItem('skipModalOnNextPageLoad', '1'); } catch {}

    // Use replace so back-button doesn't return to the intermediate state that
    // might re-trigger modal/splash logic in some browsers.
    // If the server returned any registration or next-form data for this email,
    // treat the user as returning and send them to the already-registered page.
    let target = 'next-form.html';
    try {
        const hasServerData = !!(hydrated && (
            (hydrated.registrationData && Object.keys(hydrated.registrationData).length > 0) ||
            (hydrated.nextFormData && Object.keys(hydrated.nextFormData).length > 0)
        ));
        if (completed || hasServerData) target = 'already-registered.html';
    } catch (e) {
        if (completed) target = 'already-registered.html';
    }
    try {
        window.location.replace(target);
    } catch (e) {
        // Fallback
        window.location.href = target;
    }
    return true;
};

// Auto-sync application completion status from the database on page load
(async () => {
    try {
        const email = (localStorage.getItem('userEmail') || '').trim();
        if (email) {
            const res = await fetch(apiUrl(`/api/check-application-status?email=${encodeURIComponent(email)}`));
            const data = await res.json();
            if (res.ok && data.success) {
                if (data.completed) {
                    localStorage.setItem('applicationCompleted', '1');
                    localStorage.setItem('isApplicationDone', 'true');
                    sessionStorage.setItem('applicationCompleted', '1');
                } else {
                    localStorage.removeItem('applicationCompleted');
                    localStorage.removeItem('isApplicationDone');
                    sessionStorage.removeItem('applicationCompleted');
                }
            }
        }
    } catch (err) {
        console.warn('Failed to sync application status:', err);
    }
})();
// Decide whether we should redirect users to congrats page.
// Require both the application-completed flag and that the lastUserEmail
// matches the current userEmail to avoid stale flags from redirecting others.
const shouldRedirectToCongrats = () => {
    // Prevent automatic redirects to congrats.html except right after registration submission
    return false;
};
const showApplicationCompletedNotice = () => {
    // Only redirect to congrats when it is appropriate for the current user.
    if (shouldRedirectToCongrats()) {
        window.location.href = 'congrats.html';
        return;
    }
    // If flags are stale (different user completed earlier), clear them so the
    // site no longer forces redirects for subsequent visitors on this browser.
    try {
        localStorage.removeItem('applicationCompleted');
        localStorage.removeItem('isApplicationDone');
    } catch {
        // ignore storage errors
    }
};
const showRegistrationSection = ({ preferLogin = false } = {}) => {
    // Prefer using the full modal opener when available so overlay and
    // modal state are handled consistently.
    try {
        if (typeof openRegModal === 'function') {
            openRegModal();
            if (typeof setAuthMode === 'function') setAuthMode(preferLogin ? 'login' : 'signup');
            return;
        }
    } catch (e) {
        // fall through to fallback behavior
    }

    const sect = document.getElementById('registration-section');
    if (sect) {
        sect.hidden = false;
        sect.style.removeProperty('display');
    }

    const overlay = document.getElementById('regModalOverlay');
    if (overlay) {
        overlay.hidden = false;
        overlay.style.removeProperty('display');
    }
    // Ensure modal body class is present so CSS shows overlay and blurs background
    document.body.classList.add('reg-modal-open');

    // If auth panels are already initialized, pick the right card.
    if (typeof setAuthMode === 'function') {
        setAuthMode(preferLogin ? 'login' : 'signup');
    }
};
try { window.showRegistrationSection = showRegistrationSection; } catch {}
const hideRegistrationSection = () => {
    const sect = document.getElementById('registration-section');
    if (sect) {
        sect.hidden = true;
        sect.style.display = 'none';
    }
    // also make sure any modal overlay is removed
    const overlay = document.getElementById('regModalOverlay');
    if (overlay) {
        overlay.hidden = true;
        overlay.style.display = 'none';
    }
    document.body.classList.remove('reg-modal-open');
};
const updateRegistrationProgressCue = () => {
    const step1 = document.getElementById('regStep1');
    const step2 = document.getElementById('regStep2');
    if (!step1 || !step2) return;

    if (isApplicationCompleted()) {
        step1.textContent = 'Step 1: complete register form';
        step1.style.color = '#16a34a';
        step1.style.opacity = '1';
        step2.textContent = 'Step 2: complete application form';
        step2.style.color = '#16a34a';
        step2.style.opacity = '1';
        return;
    }

    if (isRegisteredUser()) {
        step1.textContent = 'Step 1: complete register form';
        step1.style.color = '#16a34a';
        step1.style.opacity = '1';
        step2.textContent = 'Step 2: complete application form';
        step2.style.color = '#16a34a';
        step2.style.opacity = '1';
    } else {
        step1.textContent = 'Step 1: complete register form';
        step1.style.color = '#16a34a';
        step1.style.opacity = '1';
        step2.textContent = 'Step 2: complete application form';
        step2.style.color = '#16a34a';
        step2.style.opacity = '1';
    }
};
const syncRegistrationSectionForAuthState = () => {
    if (isApplicationCompleted()) {
        hideRegistrationSection();
        updateRegistrationProgressCue();
        return;
    }

    if (isRegisteredUser()) {
        hideRegistrationSection();
        updateRegistrationProgressCue();
        return;
    }

    const preferLogin = localStorage.getItem('showLoginAfterLogout') === '1';
    showRegistrationSection({ preferLogin });
    updateRegistrationProgressCue();
};

// --- Main Application Logic ---
document.addEventListener("DOMContentLoaded", function () {
    // Storage cleanup
    // IMPORTANT: don't clear sessionStorage entirely — it breaks splash/session state and can feel "stuck".
    // For a *fresh* experience on each new browser/tab session, clear persisted auth/profile
    // keys from localStorage ONLY once per session (so navigation within the same tab still works).
    try {
        const isNewSession = !sessionStorage.getItem('sessionActive');
        if (isNewSession) {
            sessionStorage.setItem('sessionActive', 'true');

            // Don’t clear persistent auth (userEmail/hasSignedUp) on new session —
            // that caused returning users to be treated as logged out and re-open
            // the registration modal unexpectedly. Only clear transient form data.
            try { localStorage.removeItem('registrationData'); } catch {}
            try { localStorage.removeItem('nextFormData'); } catch {}
            try { localStorage.removeItem('showLoginAfterLogout'); } catch {}
            try { sessionStorage.removeItem('registrationData'); } catch {}
            try { sessionStorage.removeItem('nextFormData'); } catch {}
        }
    } catch {
        // ignore if storage inaccessible
    }

    // Aggressively clear all form fields to prevent autofill
    ['registrationForm','loginForm','forgotPasswordForm'].forEach(id=>{
        const f=document.getElementById(id);
        if(f && typeof f.reset==='function') {
            f.reset();
            // Force clear each input individually
            const inputs = f.querySelectorAll('input');
            inputs.forEach(inp => {
                inp.value = '';
                inp.removeAttribute('value');
            });
        }
    });
    
    // Additional aggressive clear after short delay to defeat browser autofill
    setTimeout(() => {
        ['fullName', 'email', 'phone', 'password', 'loginEmail', 'loginPassword'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = '';
                el.removeAttribute('value');
            }
        });
    }, 100);

    // keep registration card visibility in sync with auth state
    syncRegistrationSectionForAuthState();

    // ... Rest of your logic continues here ...
   
    (function initImageLoadingHints() {
        try {
            const imgs = Array.from(document.images || []);
            imgs.forEach((img) => {
                if (!img) return;
                if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');

                // Keep navbar/logo eager; hero: only the ACTIVE slide should be eager.
                const inHero = !!img.closest('.hero');
                const inNavbar = !!img.closest('.navbar');
                const heroSlide = img.closest('.hero-slide');
                const isActiveHero = !!(heroSlide && heroSlide.classList.contains('active'));
                const hasLoading = img.hasAttribute('loading');
                if (!hasLoading) {
                    if (inNavbar) img.setAttribute('loading', 'eager');
                    else if (inHero) img.setAttribute('loading', isActiveHero ? 'eager' : 'lazy');
                    else img.setAttribute('loading', 'lazy');
                }

                // First hero slide image should be high priority.
                if (inHero && isActiveHero) {
                    if (!img.getAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'high');
                } else if (inHero) {
                    if (!img.getAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'low');
                }
            });
        } catch (err) {
            // non-fatal
        }
    })();

    // 1. HERO SLIDER
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length > 0) {
        let currentSlide = 0;
        slides[0].classList.add('active');

        // Get hero text elements
        const heroLine = document.querySelector('.hero-line');
        const heroDesc = document.querySelector('.hero-description');

        function triggerHeroTextAnimation() {
            if (heroLine) {
                heroLine.classList.remove('animate-hero-text');
                // Force reflow to restart animation
                void heroLine.offsetWidth;
                heroLine.classList.add('animate-hero-text');
            }
            if (heroDesc) {
                heroDesc.classList.remove('animate-hero-text');
                void heroDesc.offsetWidth;
                heroDesc.classList.add('animate-hero-text');
            }
        }

        // Add animation class on first load
        triggerHeroTextAnimation();

        function nextSlide() {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
            triggerHeroTextAnimation();
        }
        setInterval(nextSlide, 5000);
    }

    // 2. NAV TOGGLE (single source of truth)
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle && navMenu) {
        const spans = Array.from(navToggle.querySelectorAll('span'));
        const DESKTOP_COMPACT_MAX_WIDTH = 1440;

        const isOpen = () => navMenu.classList.contains('active');
        const isDesktopCompact = () => document.body.classList.contains('nav-desktop-collapsed');

        const closeSubmenus = () => {
            navMenu.querySelectorAll('.nav-dropdown.is-open').forEach((li) => li.classList.remove('is-open'));
        };

        const syncHamburgerIcon = (open) => {
            // Let CSS handle the icon animation based on aria-expanded.
            // Inline styles would override CSS and make the hamburger hard to style.
            if (spans.length < 3) return;
            spans.forEach((s) => {
                try {
                    s.style.removeProperty('transform');
                    s.style.removeProperty('opacity');
                } catch {
                    // ignore
                }
            });
            navToggle.classList.toggle('is-open', !!open);
        };

        const setOpen = (open) => {
            navMenu.classList.toggle('active', !!open);
            navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            syncHamburgerIcon(!!open);

            // Keep the menu consistent every time it opens/closes.
            if (open) {
                try { navMenu.scrollTop = 0; } catch { /* ignore */ }
                closeSubmenus();
            } else {
                closeSubmenus();
            }
        };

        const syncDesktopNavMode = () => {
            const shouldCollapse = window.innerWidth >= 769 && window.innerWidth <= DESKTOP_COMPACT_MAX_WIDTH;
            const wasCollapsed = isDesktopCompact();
            document.body.classList.toggle('nav-desktop-collapsed', shouldCollapse);

            // If we changed modes, close the menu so the layout can recalculate cleanly.
            if (wasCollapsed !== shouldCollapse) {
                setOpen(false);
            }
        };

        // a11y defaults
        if (!navToggle.hasAttribute('role')) navToggle.setAttribute('role', 'button');
        if (!navToggle.hasAttribute('tabindex')) navToggle.setAttribute('tabindex', '0');
        navToggle.setAttribute('aria-controls', 'navMenu');
        if (!navToggle.hasAttribute('aria-expanded')) navToggle.setAttribute('aria-expanded', 'false');

        // Ensure icon state matches initial menu state
        syncHamburgerIcon(isOpen());
        syncDesktopNavMode();

        navToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!isOpen());
        });

        navToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(!isOpen());
            }
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!isOpen()) return;
            const t = e.target;
            if (t && (navMenu.contains(t) || navToggle.contains(t))) return;
            setOpen(false);
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (!isOpen()) return;
            setOpen(false);
        });

        // Close after choosing a link (but NOT when tapping a submenu trigger)
        navMenu.querySelectorAll('a').forEach((n) => n.addEventListener('click', () => {
            try {
                // If this anchor opens a submenu, don't close the menu.
                const hasSubmenu = !!(n.nextElementSibling && n.nextElementSibling.classList && n.nextElementSibling.classList.contains('dropdown-menu'));
                const isDropdownTrigger = !!(n.matches && n.matches('.nav-dropdown > a'));
                if (isDropdownTrigger && hasSubmenu) return;

                const rawHref = (n.getAttribute('href') || '').trim().toLowerCase();
                const isHomeLink = rawHref === '/' || rawHref === 'index.html' || rawHref.endsWith('/index.html');
                if (isHomeLink) sessionStorage.setItem('forceSplashOnce', '1');
            } catch {
                // ignore
            }
            setOpen(false);
        }));

        // Mobile: tap Destinations/Study to open nested country list
        const bindMobileSubmenu = () => {
            // Bind once regardless of viewport size; we decide whether to intercept at click-time.
            navMenu.querySelectorAll('.nav-dropdown > a').forEach((trigger) => {
                // Avoid double-binding if script runs again for any reason
                if (trigger.__submenuBound) return;
                trigger.__submenuBound = true;

                trigger.addEventListener('click', (e) => {
                    const shouldIntercept = window.innerWidth <= 900 || navMenu.classList.contains('active') || isDesktopCompact();
                    if (!shouldIntercept) return;
                    e.preventDefault();
                    // Important: also stop other click handlers on this same element
                    // (we have a global smooth-scroll handler for all #hash links)
                    e.stopImmediatePropagation();

                    const li = trigger.closest('.nav-dropdown');
                    if (!li) return;

                    const isOpenNow = li.classList.toggle('is-open');
                    trigger.setAttribute('aria-expanded', isOpenNow ? 'true' : 'false');
                });
            });
        };

        bindMobileSubmenu();

        // Make sure selecting a country link always navigates and closes the menu.
        navMenu.querySelectorAll('.dropdown-menu a').forEach((link) => {
            if (link.__countryLinkBound) return;
            link.__countryLinkBound = true;

            link.addEventListener('click', () => {
                const href = (link.getAttribute('href') || '').trim();
                if (!href) return;

                setOpen(false);
                window.location.href = href;
            });
        });

        // If viewport becomes desktop, close the mobile menu
        window.addEventListener('resize', () => {
            syncDesktopNavMode();
            if (window.innerWidth > 768 && isOpen() && !isDesktopCompact()) setOpen(false);
            bindMobileSubmenu();
        });
    }

    // 2.5. PROFILE ICON + DROPDOWN + PROFILE MODAL
    (function initProfileUI() {
        const navbars = Array.from(document.querySelectorAll('.navbar'));
        if (navbars.length === 0) return;

        const safeNotify = (message, type = 'info') => {
            try {
                if (typeof showNotification === 'function') showNotification(message, type);
                else console.log(`[${type}] ${message}`);
            } catch {
                console.log(`[${type}] ${message}`);
            }
        };

        const parseJson = (value) => {
            if (!value) return null;
            try { return JSON.parse(value); } catch { return null; }
        };

        const titleCaseLabel = (key) => {
            if (!key) return '';
            const spaced = String(key)
                .replace(/_/g, ' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/\s+/g, ' ')
                .trim();
            return spaced.charAt(0).toUpperCase() + spaced.slice(1);
        };

        const getProfileData = () => {
            // Prefer sessionStorage (current tab), but fall back to localStorage so the profile
            // still shows after refresh/reopen.
            const registrationData =
                parseJson(sessionStorage.getItem('registrationData')) ||
                parseJson(localStorage.getItem('registrationData')) ||
                {};

            const nextFormData =
                parseJson(sessionStorage.getItem('nextFormData')) ||
                parseJson(localStorage.getItem('nextFormData')) ||
                {};
            const userEmail = localStorage.getItem('userEmail') || '';

            if (!registrationData.email && userEmail) registrationData.email = userEmail;

            return { registrationData, nextFormData };
        };

        const getInitialLetter = () => {
            const { registrationData } = getProfileData();
            const fullName = (registrationData?.fullName || '').trim();
            const email = (registrationData?.email || localStorage.getItem('userEmail') || '').trim();

            const source = fullName || email;
            const ch = source ? String(source).trim().charAt(0) : '';
            return ch ? ch.toUpperCase() : '';
        };

        const updateProfileBadge = () => {
            const signedIn = !!localStorage.getItem('userEmail');
            const initial = getInitialLetter();

            document.querySelectorAll('.nav-profile[data-profile-menu="true"]').forEach((profileEl) => {
                const trigger = profileEl.querySelector('.profile-trigger');
                const avatar = profileEl.querySelector('[data-avatar]');
                if (!trigger || !avatar) return;

                const initialEl = avatar.querySelector('[data-avatar-initial]');
                const iconEl = avatar.querySelector('[data-avatar-icon]');

                const authBtn = profileEl.querySelector('[data-action="auth"]');
                const logoutBtn = profileEl.querySelector('[data-action="logout"]');

                if (signedIn) {
                    profileEl.classList.add('is-signed-in');
                    if (initialEl) {
                        initialEl.textContent = initial || 'U';
                        initialEl.hidden = false;
                    }
                    if (iconEl) iconEl.hidden = true;

                    if (authBtn) authBtn.hidden = true;
                    if (logoutBtn) logoutBtn.hidden = false;
                } else {
                    profileEl.classList.remove('is-signed-in');
                    if (initialEl) initialEl.hidden = true;
                    if (iconEl) iconEl.hidden = false;

                    if (authBtn) authBtn.hidden = false;
                    if (logoutBtn) logoutBtn.hidden = true;
                }

                avatar.hidden = false;
                trigger.setAttribute('title', signedIn ? 'Account' : 'Account (Guest)');
            });
        };

        // Allow other flows (signup/login/google) to refresh the icon immediately.
        window.__updateProfileBadge = updateProfileBadge;

        const ensureModal = () => {
            let overlay = document.querySelector('.profile-modal-overlay');
            if (overlay) return overlay;

            overlay = document.createElement('div');
            overlay.className = 'profile-modal-overlay';
            overlay.hidden = true;
            overlay.innerHTML = `
                <div class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profileModalTitle">
                    <div class="profile-modal-header">
                        <h2 id="profileModalTitle">Your Profile</h2>
                        <button type="button" class="profile-modal-close" aria-label="Close profile" title="Close">&times;</button>
                    </div>
                    <div class="profile-modal-body">
                        <div class="profile-modal-content" data-profile-modal-content></div>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const close = () => {
                overlay.hidden = true;
                overlay.style.display = 'none';
                document.body.classList.remove('profile-modal-open');
            };

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close();
            });
            overlay.querySelector('.profile-modal-close')?.addEventListener('click', close);
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !overlay.hidden) close();
            });

            overlay.__closeProfileModal = close;
            return overlay;
        };

        const getDisplayableEntries = (dataObj) => {
            return Object.entries(dataObj || {})
                .filter(([k, v]) => {
                    if (!k) return false;
                    const keyLower = String(k).toLowerCase();
                    if (keyLower.includes('password')) return false;
                    if (v === null || v === undefined) return false;
                    const str = String(v).trim();
                    return str.length > 0;
                });
        };

        const renderKeyValueGrid = (dataObj) => {
            const entries = getDisplayableEntries(dataObj);

            if (entries.length === 0) {
                return `<p class="profile-empty">No details found.</p>`;
            }

            const items = entries.map(([k, v]) => {
                const label = titleCaseLabel(k);
                const value = String(v);
                return `
                    <div class="profile-field">
                        <div class="profile-label">${label}</div>
                        <div class="profile-value">${value}</div>
                    </div>
                `;
            }).join('');

            return `<div class="profile-grid">${items}</div>`;
        };

        const openProfileModal = () => {
            const { registrationData, nextFormData } = getProfileData();
            const overlay = ensureModal();
            const content = overlay.querySelector('[data-profile-modal-content]');
            if (!content) return;

            const hasSignupDetails = getDisplayableEntries(registrationData).length > 0;
            const hasNextFormDetails = getDisplayableEntries(nextFormData).length > 0;
            const hasAny = hasSignupDetails || hasNextFormDetails;
            if (!hasAny) {
                content.innerHTML = `
                    <p class="profile-empty">No profile data found yet.</p>
                    <p class="profile-empty">Please complete signup and the next form.</p>
                `;
            } else {
                const signupSection = hasSignupDetails
                    ? `
                        <section class="profile-section">
                            <h3>Signup Details</h3>
                            ${renderKeyValueGrid(registrationData)}
                        </section>
                    `
                    : '';

                // Hide the entire Next Form section when there is no data.
                const nextFormSection = hasNextFormDetails
                    ? `
                        <section class="profile-section">
                            <h3>Next Form Details</h3>
                            ${renderKeyValueGrid(nextFormData)}
                        </section>
                    `
                    : '';

                content.innerHTML = `
                    ${signupSection}
                    ${nextFormSection}
                `;
            }

            overlay.hidden = false;
            overlay.style.display = 'flex';
            document.body.classList.add('profile-modal-open');
        };

        const pickSavedSummary = () => {
            const { registrationData, nextFormData } = getProfileData();

            const fullName = String(registrationData?.fullName || '').trim();
            const email = String(registrationData?.email || localStorage.getItem('userEmail') || '').trim();
            const phone = String(registrationData?.phone || '').trim();

            // Include a couple of common “next form” fields if present.
            const preferredNextKeys = [
                'preferredCountry',
                'desiredCourse',
                'preferredIntake',
                'levelOfStudy',
                'highestQualification',
                'budgetRange'
            ];
            const nextPicked = {};
            preferredNextKeys.forEach((k) => {
                if (nextFormData && nextFormData[k] !== undefined && String(nextFormData[k]).trim()) {
                    nextPicked[k] = nextFormData[k];
                }
            });

            const summary = {
                ...(fullName ? { fullName } : {}),
                ...(email ? { email } : {}),
                ...(phone ? { phone } : {}),
                ...nextPicked,
            };

            // Fallback: show the first few non-empty entries.
            const entries = getDisplayableEntries(summary);
            if (entries.length > 0) return summary;

            const merged = { ...(registrationData || {}), ...(nextFormData || {}) };
            const mergedEntries = getDisplayableEntries(merged).slice(0, 6);
            const compact = {};
            mergedEntries.forEach(([k, v]) => { compact[k] = v; });
            return compact;
        };

        const renderSavedSummary = () => {
            const data = pickSavedSummary();
            const entries = getDisplayableEntries(data);

            if (entries.length === 0) {
                return `<div class="profile-saved-empty">No saved details yet.</div>`;
            }

            const rows = entries.map(([k, v]) => {
                const label = titleCaseLabel(k);
                const value = String(v);
                return `
                    <div class="profile-saved-row">
                        <span class="profile-saved-key">${label}</span>
                        <span class="profile-saved-value">${value}</span>
                    </div>
                `;
            }).join('');

            return `<div class="profile-saved-grid">${rows}</div>`;
        };

        const doLogout = () => {
            // Only show the login card after an explicit logout.
            try {
                const currentEmail = (localStorage.getItem('userEmail') || '').trim();
                if (currentEmail) localStorage.setItem('lastUserEmail', currentEmail);
                localStorage.setItem('showLoginAfterLogout', '1');
            } catch {
                // ignore
            }

            try {
                localStorage.removeItem('userEmail');
                localStorage.removeItem('isRegistered');
                localStorage.removeItem('hasSignedUp');
                localStorage.removeItem('applicationCompleted');
                localStorage.removeItem('isApplicationDone');
                localStorage.removeItem('registrationData');
                localStorage.removeItem('nextFormData');
                localStorage.removeItem('currentUserId');
                sessionStorage.removeItem('registrationData');
                sessionStorage.removeItem('nextFormData');
                sessionStorage.removeItem('currentUserId');
                sessionStorage.removeItem('isSessionActive');
                safeNotify('Logged out successfully.', 'success');
            } catch {
                // ignore
            }

            const overlay = document.querySelector('.profile-modal-overlay');
            if (overlay && !overlay.hidden && typeof overlay.__closeProfileModal === 'function') overlay.__closeProfileModal();
            window.location.href = 'index.html';
        };

        const closeAllDropdowns = () => {
            document.querySelectorAll('.nav-profile.is-open').forEach((menu) => {
                menu.classList.remove('is-open');
                const btn = menu.querySelector('.profile-trigger');
                if (btn) btn.setAttribute('aria-expanded', 'false');

                const subTrigger = menu.querySelector('.profile-item--submenu');
                const submenu = menu.querySelector('.profile-submenu');
                if (subTrigger) subTrigger.setAttribute('aria-expanded', 'false');
                if (submenu) submenu.hidden = true;
            });
        };

        document.addEventListener('click', (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            if (target.closest('.nav-profile')) return;
            closeAllDropdowns();
        });

        navbars.forEach((navbarEl) => {
            const host = navbarEl.querySelector('.container') || navbarEl;
            if (!host) return;

            // Ensure a right-side wrapper so the icon stays on the right even on mobile.
            // Prefer inserting it after the main nav menu so it visually sits on the
            // right side; falling back to append at end if menu not found.
            let navRight = host.querySelector('.nav-right');
            if (!navRight) {
                navRight = document.createElement('div');
                navRight.className = 'nav-right';
                const navMenu = host.querySelector('#navMenu, .nav-menu');
                if (navMenu && navMenu.parentElement === host) {
                    // insert after navMenu
                    host.insertBefore(navRight, navMenu.nextSibling);
                } else {
                    host.appendChild(navRight);
                }
            }

            // Move existing hamburger into the right wrapper if present, so it
            // remains at the far right on small screens.
            const toggle = host.querySelector('#navToggle');
            if (toggle && toggle.parentElement !== navRight) {
                navRight.appendChild(toggle);
            }

            let profile = host.querySelector('[data-profile-menu="true"]');
            if (!profile) {
                profile = document.createElement('div');
                profile.className = 'nav-profile';
                profile.setAttribute('data-profile-menu', 'true');
                profile.innerHTML = `
                    <button type="button" class="profile-trigger" aria-haspopup="menu" aria-expanded="false" title="Account" aria-label="Account">
                        <span class="profile-avatar" data-avatar>
                            <span class="avatar-initial" data-avatar-initial hidden>U</span>
                            <i class="fa-solid fa-user avatar-icon" data-avatar-icon aria-hidden="true"></i>
                        </span>
                    </button>
                    <div class="profile-dropdown" role="menu">
                        <button type="button" class="profile-item" data-action="auth" role="menuitem" hidden>Sign up / Log in</button>
                        <button type="button" class="profile-item" data-action="profile" role="menuitem">Profile</button>
                        <button type="button" class="profile-item" data-action="logout" role="menuitem">Logout</button>
                    </div>
                `;
            }

            // Put profile before hamburger (if any) so hamburger stays last
            if (toggle && toggle.parentElement === navRight) {
                if (profile.parentElement !== navRight) navRight.insertBefore(profile, toggle);
                else navRight.insertBefore(profile, toggle);
            } else {
                if (profile.parentElement !== navRight) navRight.appendChild(profile);
            }

            const trigger = profile.querySelector('.profile-trigger');
            const dropdown = profile.querySelector('.profile-dropdown');

            const onToggle = (evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                const isOpen = profile.classList.toggle('is-open');
                if (trigger) trigger.setAttribute('aria-expanded', String(isOpen));
            };

            trigger?.addEventListener('click', onToggle);
            dropdown?.addEventListener('click', (evt) => {
                const btn = evt.target instanceof Element ? evt.target.closest('[data-action]') : null;
                const action = btn?.getAttribute('data-action');

                closeAllDropdowns();
                if (action === 'auth') {
                    try {
                        if (typeof window.__openRegModal === 'function') {
                            if (typeof setAuthMode === 'function') setAuthMode('signup');
                            window.__openRegModal();
                        } else {
                            window.location.href = 'index.html#registration-section';
                        }
                    } catch {
                        window.location.href = 'index.html#registration-section';
                    }
                }
                if (action === 'profile') {
                    openProfileModal();
                }
                if (action === 'logout') doLogout();
            });
        });

        // Initial render
        updateProfileBadge();
    })();

    // 3. SMOOTH SCROLL & NAVIGATION
    const navLinks = document.querySelectorAll('.nav-menu a, .register-scroll');
    const sections = document.querySelectorAll('section[id]');
    const navbar = document.querySelector('.navbar');

    // Cache section offsets to avoid layout thrashing during scroll events!
    let cachedSectionOffsets = [];
    function cacheSectionOffsets() {
        cachedSectionOffsets = [];
        sections.forEach(section => {
            const id = section.getAttribute('id');
            if (id) {
                cachedSectionOffsets.push({
                    id: id,
                    top: section.offsetTop
                });
            }
        });
        cachedSectionOffsets.sort((a, b) => a.top - b.top);
    }
    // Calculate initial offsets
    cacheSectionOffsets();
    window.addEventListener('resize', () => {
        window.requestAnimationFrame(cacheSectionOffsets);
    }, { passive: true });

    // Some pages reuse this script without being index.html.
    // We treat index.html (and /) as the home page so hash links can either scroll
    // locally or redirect to index.html#... when the section isn't present.
    function isHomePagePath() {
        const path = String(window.location.pathname || '').toLowerCase();
        // Examples:
        //   /               (root)
        //   /index.html
        //   /frontend/index.html
        //   /Frontend/index.html
        return path === '/' || path.endsWith('/index.html');
    }

    function scrollToSection(targetId) {
        const target = document.getElementById(targetId);
        if (target) {
            const headerOffset = 70;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    }

    // Registration modal helpers (assigned later if the modal exists on this page)
    let openRegModal = null;
    let closeRegModal = null;

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            // If the hamburger dropdown is open and the user tapped the nav-dropdown trigger
            // (Destinations/Study), treat it as a submenu toggle only (no redirect / no scroll).
            try {
                const menuOpen = !!navMenu && navMenu.classList.contains('active');
                if (menuOpen) {
                    const isInsideMenu = !!(this.closest && this.closest('#navMenu'));
                    const isDropdownTrigger = !!(this.matches && this.matches('#navMenu .nav-dropdown > a'));
                    const hasSubmenu = !!(this.nextElementSibling && this.nextElementSibling.classList && this.nextElementSibling.classList.contains('dropdown-menu'));
                    if (isInsideMenu && isDropdownTrigger && hasSubmenu) {
                        e.preventDefault();
                        return;
                    }
                }
            } catch {
                // ignore
            }

            // (submenu triggers are handled above)

            // Honor any explicit skip flags (set after sign-in) so a lingering
            // `forceOpenRegistration` cannot reopen the modal for a just-signed-in user.
            const forceOpenRegistration = sessionStorage.getItem('forceOpenRegistration') === '1' && !(sessionStorage.getItem('skipModalOnNextPageLoad') === '1' || localStorage.getItem('skipModalOnNextPageLoad') === '1');

            // After signup, the "Register Here" CTA should open the next form.
            // Keep pre-signup behavior (open modal) for new users on any page.
            // In edit mode, allow opening the registration modal even for registered users.
            if (href === '#registration-section' && isRegisteredUser() && !forceOpenRegistration) {
                e.preventDefault();
                // Route the signed-in user to the correct page (already-registered or next-form)
                try { void routeSignedInUserToCorrectPage(); } catch { window.location.href = 'next-form.html'; }
                return;
            }

            e.preventDefault();
            const targetId = href.substring(1);

            const isHomePage = isHomePagePath();
            const hasTargetOnPage = !!document.getElementById(targetId);

            // Special rule: navbar "Register Here"
            if (targetId === 'registration-section') {
                if (shouldRedirectToCongrats() && !forceOpenRegistration) {
                    window.location.href = 'congrats.html';
                    return;
                }

                if (isRegisteredUser() && !forceOpenRegistration) {
                    try { void routeSignedInUserToCorrectPage(); } catch { window.location.href = 'next-form.html'; }
                    return;
                }

                // Open the signup modal on the current page whenever possible.
                if (typeof openRegModal === 'function') {
                    openRegModal();
                } else {
                    if (!isHomePage) {
                        window.location.href = 'index.html#registration-section';
                        return;
                    }
                    scrollToSection('registration-section');
                }
                return;
            }

            // If on a different page and the target section doesn't exist here, go to index.html#...
            if (!isHomePage && !hasTargetOnPage) {
                window.location.href = `index.html#${targetId}`;
                return;
            }

            scrollToSection(targetId);
            // Close mobile menu
            if (navMenu) {
                navMenu.classList.remove('active');
                try {
                    const spans = navToggle ? navToggle.querySelectorAll('span') : [];
                    if (spans.length >= 3) {
                        spans[0].style.transform = 'none';
                        spans[1].style.opacity = '1';
                        spans[2].style.transform = 'none';
                    }
                } catch {
                    // ignore
                }
            }
        });
    });

    // 4. SCROLL OPTIMIZATION (Throttle)
    let isScrolling = false;
    let lastNavbarCompactState = null;
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                handleScroll();
                isScrolling = false;
            });
            isScrolling = true;
        }
    }, { passive: true });

    function handleScroll() {
        if (!navbar) return;
        const scrollY = window.pageYOffset;
        const isCompact = scrollY > 50;

        // Navbar Resize (only touch layout when the compact state changes)
        if (lastNavbarCompactState !== isCompact) {
            lastNavbarCompactState = isCompact;
            navbar.style.padding = isCompact ? '0.5rem 0' : '1rem 0';
        }

        // Active Link Highlighting (using high-performance cached section offsets)
        let current = '';
        for (let i = 0; i < cachedSectionOffsets.length; i++) {
            if (scrollY >= (cachedSectionOffsets[i].top - 120)) {
                current = cachedSectionOffsets[i].id;
            } else {
                break;
            }
        }

        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
        });
    }

    // 5. REGISTER CTA BUTTONS (Unified behavior across the site)
    // Intercept only when one of the specific registration/consultation CTAs is clicked.
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;

        const cta = target.closest('.get-assistance-btn, .register-cta-button, .cta-button, .register-btn, .prep-text, .register-scroll, .promo-cta, .btn-primary-massive');
        if (!cta) return;

        // Always prevent default for these specific CTA buttons
        e.preventDefault();

        // Show the registration modal for all CTA clicks (same design, same popup)
        if (typeof openRegModal === 'function') {
            openRegModal();
            return;
        }

        // Fallback: scroll to registration section or navigate to it
        const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '/index.html';
        
        if (isHomePage) {
            scrollToSection('registration-section');
            return;
        }

        window.location.href = 'index.html#registration-section';
    });


    // 6. PHONE INPUT VALIDATION
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }

    // 7. GOOGLE SIGN-IN INITIALIZATION
    const googleBtnContainer = document.getElementById('googleBtn');
    const googleFallbackBtn = document.getElementById('googleFallbackBtn');

    const setFallbackVisible = (visible) => {
        if (!googleFallbackBtn) return;
        googleFallbackBtn.style.display = visible ? 'flex' : 'none';
    };

    if (googleBtnContainer) {
        // Keep a visible button even if the official Google widget can't render.
        setFallbackVisible(true);
        let googleInitAttempts = 0;
        const MAX_GOOGLE_INIT_ATTEMPTS = 20;

        const initGoogle = () => {
            if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
                googleInitAttempts += 1;
                if (googleInitAttempts < MAX_GOOGLE_INIT_ATTEMPTS) {
                    console.warn('Google Identity Services script not loaded yet. Retrying...');
                    setTimeout(initGoogle, 150);
                    return;
                }

                console.warn('Google Identity Services unavailable after repeated attempts. Using fallback only.');
                setFallbackVisible(true);
                return;
            }

            try {
                google.accounts.id.initialize({
                    client_id: "788852105404-mq7k0ta6pc8vbehol821fro4fohtplrg.apps.googleusercontent.com",
                    callback: handleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });

                google.accounts.id.renderButton(
                    googleBtnContainer,
                    {
                        type: "standard",
                        shape: "rectangular",
                        theme: "outline",
                        size: "medium",
                        text: "signin_with",
                        logo_alignment: "left",
                        width: 280
                    }
                );

                // Hide fallback only if the official button actually rendered.
                setTimeout(() => {
                    const rendered = !!googleBtnContainer.querySelector('iframe, div[role="button"]');
                    setFallbackVisible(!rendered);
                    if (!rendered) {
                        showNotification('Google sign-in is not available on this site/origin. If testing locally, use https://abroad-vision-carrerz-consultancy.onrender.com (not file://) and add your domain to Google OAuth “Authorized JavaScript origins”.', 'info');
                    }
                }, 500);

            } catch (err) {
                console.error('Google Sign-In render failed:', err);
                setFallbackVisible(true);
                showNotification('Google sign-in could not be loaded. Please use email signup for now.', 'error');
            }
        };

        initGoogle();
    }

    if (googleFallbackBtn) {
        googleFallbackBtn.addEventListener('click', (e) => {
            e.preventDefault();

            if (typeof google !== 'undefined' && google.accounts && google.accounts.id && typeof google.accounts.id.prompt === 'function') {
                // Try One Tap as a fallback trigger.
                try {
                    google.accounts.id.prompt();
                } catch (err) {
                    console.error('Google One Tap prompt failed:', err);
                    showNotification('Google sign-in is not available on this origin. Please use email signup.', 'info');
                }
            } else {
                showNotification('Google sign-in is not available (blocked/offline). Please use email signup.', 'info');
            }
        });
    }

    async function handleCredentialResponse(response) {
        console.log("Encoded JWT ID token: " + response.credential);
        showNotification('Successfully signed in with Google!', 'success');

        // Decode basic profile info from the JWT and mark user as registered
        try {
            const parts = String(response.credential || '').split('.');
            const payload = parts.length >= 2 ? parts[1] : '';
            const json = payload ? JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))))) : null;
            const email = json?.email || '';
            const fullName = json?.name || '';

            if (email) {
                localStorage.setItem('userEmail', email);
                // User is signed in again; don't keep showing the login card on reopen.
                try { localStorage.removeItem('showLoginAfterLogout'); } catch { }
                try { localStorage.setItem('lastUserEmail', email); } catch { }
                try { localStorage.setItem('hasSignedUp', '1'); } catch { }
                const registrationPayload = { fullName, email, phone: '' };
                sessionStorage.setItem('registrationData', JSON.stringify(registrationPayload));
                localStorage.setItem('registrationData', JSON.stringify(registrationPayload));
                sessionStorage.setItem('justRegistered', '1');

                try {
                    if (typeof window.__updateProfileBadge === 'function') window.__updateProfileBadge();
                } catch {
                    // ignore
                }

                // Notify backend about this OAuth sign-in so admins receive an email/WhatsApp alert
                try {
                    void fetch(apiUrl('/api/oauth-signin'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, fullName, provider: 'google' })
                    }).catch(() => {});
                } catch (e) { /* ignore */ }

                await hydrateProfileFromServer(email);

                // Close the registration modal before redirecting
                try {
                    document.body.classList.remove('reg-modal-open');
                    const overlay = document.getElementById('regModalOverlay');
                    if (overlay) overlay.hidden = true;
                    if (window.location.hash === '#registration-section') {
                        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
                    }
                } catch {
                    // ignore
                }

                // Set a flag to prevent modals from opening on the next page
                try { sessionStorage.setItem('skipModalOnNextPageLoad', '1'); } catch { }
                try { localStorage.setItem('skipModalOnNextPageLoad', '1'); } catch { }
                try { sessionStorage.setItem('skipSplashAfterSignIn', '1'); } catch { }
                try { localStorage.setItem('skipSplashAfterSignIn', '1'); } catch { }

                // Clear any scheduled registration popup so it doesn't re-open
                try { sessionStorage.removeItem('av:shouldShowRegistration'); } catch {}
                try { sessionStorage.removeItem('av:showRegistrationAt'); } catch {}
                try { sessionStorage.removeItem('forceOpenRegistration'); } catch {}

                // Clear any scheduled registration popup so it doesn't re-open.
                try { sessionStorage.removeItem('av:shouldShowRegistration'); } catch {}
                try { sessionStorage.removeItem('av:showRegistrationAt'); } catch {}
                try { sessionStorage.removeItem('forceOpenRegistration'); } catch {}

                // Keep the session active so the site doesn't bounce back to the home splash flow.
                try { sessionStorage.setItem('isSessionActive', 'true'); } catch {}
                try { localStorage.setItem('isSessionActive', 'true'); } catch {}

                // Check the backend. If this email already completed the application,
                // stay on the homepage and keep the site normal.
                let completed = isApplicationCompleted();
                try {
                    const remoteCompleted = await fetchApplicationCompletedForEmail(email);
                    if (remoteCompleted === true) completed = true;
                    if (remoteCompleted === false) completed = false;
                } catch {
                    // ignore fetch failures; rely on cached state
                }

                if (completed) {
                    return;
                }

                // Incomplete/new users go to step 2.
                try {
                    await routeSignedInUserToCorrectPage();
                } catch (err) {
                    try { window.location.replace('next-form.html'); } catch { window.location.href = 'next-form.html'; }
                }
                return;
            }
        } catch {
            // ignore decoding issues
        }

        // Close the registration modal if open and keep user on the website
        try {
            document.body.classList.remove('reg-modal-open');
            const overlay = document.getElementById('regModalOverlay');
            if (overlay) overlay.hidden = true;
            if (window.location.hash === '#registration-section') {
                window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
            }
        } catch {
            // ignore
        }
    }

    // 8. REGISTRATION POPUP AFTER 7 SECONDS (with blurred background)
    (async () => {
        let modalInjected = false;

        try {
            const hasSection = !!document.getElementById('registration-section');
            const hasOverlay = !!document.getElementById('regModalOverlay');

            if (!hasSection || !hasOverlay) {
                const response = await fetch('index.html', { cache: 'force-cache' });
                if (response.ok) {
                    const html = await response.text();
                    const parsed = new DOMParser().parseFromString(html, 'text/html');
                    const templateSection = parsed.getElementById('registration-section');
                    const templateOverlay = parsed.getElementById('regModalOverlay');

                    if (templateSection && !hasSection) {
                        const cloneSection = templateSection.cloneNode(true);
                        cloneSection.hidden = true;
                        document.body.appendChild(cloneSection);
                        modalInjected = true;
                    }

                    if (templateOverlay && !hasOverlay) {
                        const cloneOverlay = templateOverlay.cloneNode(true);
                        cloneOverlay.hidden = true;
                        document.body.appendChild(cloneOverlay);
                        modalInjected = true;
                    }
                }
            }
        } catch {
            // ignore fetch / parsing issues; pages with their own modal still work
        }

        const regSection = document.getElementById('registration-section');
        const regOverlay = document.getElementById('regModalOverlay');
        const regCloseBtn = document.getElementById('regModalClose');

        if (regSection && regOverlay) {
        // Allow forcing the registration modal via URL for testing/debugging.
        // Examples: index.html?openReg=1  or index.html#openReg
        try {
            const qs = typeof URLSearchParams !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const wantOpen = (qs && qs.get('openReg') === '1') || window.location.hash === '#openReg';
            if (wantOpen) {
                try { sessionStorage.setItem('forceOpenRegistration', '1'); } catch {}
                // normalize to the canonical anchor so existing handlers pick it up
                try { window.location.hash = '#registration-section'; } catch {}
            }
        } catch {
            // ignore parsing errors
        }
        const OPEN_DELAY_MS = 7000;
        let regModalTimer = null;
        let lastScrollY = 0;

        const isModalOpen = () => document.body.classList.contains('reg-modal-open');

        // Ensure we never keep the UI in a modal state on load
        document.body.classList.remove('reg-modal-open');
        regOverlay.hidden = true;

        openRegModal = async () => {
            const forceOpen = sessionStorage.getItem('forceOpenRegistration') === '1';
            // For registered users, go straight to the correct page for this email.
            if (isRegisteredUser() && !forceOpen) {
                await routeSignedInUserToCorrectPage();
                return;
            }

            if (shouldRedirectToCongrats()) {
                showApplicationCompletedNotice();
                return;
            }

            if (isModalOpen()) return;

            if (modalInjected) {
                regSection.hidden = false;
                regOverlay.hidden = false;
                regSection.style.removeProperty('display');
                regOverlay.style.removeProperty('display');
            }

            if (regModalTimer) {
                clearTimeout(regModalTimer);
                regModalTimer = null;
            }

            lastScrollY = window.scrollY || window.pageYOffset || 0;
            regOverlay.hidden = false;
            // Add class on next frame so opacity/animation transitions trigger reliably
            requestAnimationFrame(() => {
                document.body.classList.add('reg-modal-open');
            });

            // Focus first field for a smooth UX
            const firstInput = regSection.querySelector('input, select, textarea, button');
            if (firstInput) {
                setTimeout(() => firstInput.focus({ preventScroll: true }), 0);
            }

            // If user clicked Edit from profile, prefill fields and keep email read-only.
            const editMode = sessionStorage.getItem('editRegistration') === '1';
            const stored = sessionStorage.getItem('registrationData') || localStorage.getItem('registrationData');
            if (editMode && stored) {
                try {
                    const data = JSON.parse(stored);
                    const fullNameEl = document.getElementById('fullName');
                    const emailEl = document.getElementById('email');
                    const phoneEl = document.getElementById('phone');
                    const passwordEl = document.getElementById('password');

                    if (fullNameEl && data.fullName) fullNameEl.value = data.fullName;
                    if (emailEl && data.email) {
                        emailEl.value = data.email;
                        emailEl.readOnly = true;
                        emailEl.classList.add('filled');
                    }
                    if (phoneEl && data.phone) phoneEl.value = data.phone;

                    // In edit mode password should be optional
                    if (passwordEl) {
                        passwordEl.value = '';
                        passwordEl.required = false;
                        passwordEl.placeholder = 'New Password (optional)';
                    }

                    // Make it obvious this is edit mode
                    const submitBtn = regSection.querySelector('#registrationForm button[type="submit"]');
                    if (submitBtn) submitBtn.textContent = 'Update';
                } catch {
                    // ignore
                }
            } else {
                // Remove stored registration data so fields don't autofill
                sessionStorage.removeItem('registrationData');
                localStorage.removeItem('registrationData');
                // Always clear registration fields when modal opens (not edit mode)
                const fullNameEl = document.getElementById('fullName');
                const emailEl = document.getElementById('email');
                const phoneEl = document.getElementById('phone');
                const passwordEl = document.getElementById('password');
                if (fullNameEl) fullNameEl.value = '';
                if (emailEl) {
                    emailEl.value = '';
                    emailEl.readOnly = false;
                    emailEl.classList.remove('filled');
                }
                if (phoneEl) phoneEl.value = '';
                if (passwordEl) {
                    passwordEl.value = '';
                    passwordEl.required = true;
                    passwordEl.placeholder = 'Create Password';
                }

                // Delayed clear to fight browser autofill
                setTimeout(() => {
                    if (fullNameEl) fullNameEl.value = '';
                    if (emailEl) emailEl.value = '';
                    if (phoneEl) phoneEl.value = '';
                    if (passwordEl) passwordEl.value = '';
                }, 100);

                // Reset submit button text
                const submitBtn = regSection.querySelector('#registrationForm button[type="submit"]');
                if (submitBtn) submitBtn.textContent = 'Submit';
            }

            // Consume the force flag once opened
            if (sessionStorage.getItem('forceOpenRegistration') === '1') {
                sessionStorage.removeItem('forceOpenRegistration');
            }
        };

        // Allow other UI (profile dropdown) to open the modal.
        try {
            window.__openRegModal = openRegModal;
        } catch {
            // ignore
        }

        closeRegModal = () => {
            if (!isModalOpen()) return;
            document.body.classList.remove('reg-modal-open');
            regOverlay.hidden = true;
            if (modalInjected) {
                regSection.hidden = true;
            }

            if (regModalTimer) {
                clearTimeout(regModalTimer);
                regModalTimer = null;
            }

            // Restore scroll position to where the user was
            window.scrollTo({ top: lastScrollY, behavior: 'auto' });
        };

        // Open after 7 seconds on the home page ONLY if user is not logged in.
        // If user arrived from another page with #registration-section, handle that immediately.
        if (window.location.hash === '#registration-section') {
            if (shouldRedirectToCongrats()) {
                showApplicationCompletedNotice();
                try {
                    window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
                } catch {
                    // ignore
                }
                hideRegistrationSection();
                return;
            }

            if (isRegisteredUser()) {
                // Logged in users: route to the correct destination (completed users stay on home).
                void routeSignedInUserToCorrectPage();
            } else {
                // Not logged in: open signup modal
                regModalTimer = null;
                openRegModal();
            }
        } else if (isHomePagePath()) {
            // Auto-open timer only for logged-out users
            if (!isRegisteredUser() && !isApplicationCompleted()) {
                regModalTimer = setTimeout(openRegModal, OPEN_DELAY_MS);
            } else {
                // Logged in: ensure section is hidden
                hideRegistrationSection();
            }
        } else if (modalInjected) {
            // On non-home pages, keep the injected modal hidden until a CTA opens it.
            hideRegistrationSection();
        }

        // Close interactions
        if (regCloseBtn) {
            regCloseBtn.addEventListener('click', closeRegModal);
        }

        regOverlay.addEventListener('click', closeRegModal);

        // Keep background scrollable while overlay is active (mouse wheel)
        regOverlay.addEventListener('wheel', (e) => {
            if (!isModalOpen()) return;
            window.scrollBy(0, e.deltaY);
        }, { passive: true });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeRegModal();
        });

        // Intercept clicks on all registration links/buttons to open the modal on the current page
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('a, button');
            if (!btn) return;

            const href = btn.getAttribute('href') || '';
            const hasRegClass = btn.classList.contains('register-scroll') || 
                                btn.classList.contains('register-cta-button') || 
                                btn.classList.contains('get-assistance-btn') || 
                                btn.classList.contains('btn-primary-massive') || 
                                btn.classList.contains('promo-cta');

            if (href === '#registration-section' || 
                href === 'index.html#registration-section' || 
                href.endsWith('#registration-section') || 
                hasRegClass) {
                
                // If the application is already completed, redirect to already-registered.html
                if (isApplicationCompleted()) {
                    e.preventDefault();
                    e.stopPropagation();
                    try { e.stopImmediatePropagation(); } catch { /* ignore */ }
                    window.location.href = 'already-registered.html';
                    return; 
                }

                if (isRegisteredUser()) {
                    e.preventDefault();
                    e.stopPropagation();
                    try { e.stopImmediatePropagation(); } catch { /* ignore */ }
                    void routeSignedInUserToCorrectPage();
                    return;
                }

                e.preventDefault();
                e.stopPropagation();

                // Clear the auto-open timer if it exists so it doesn't double-open
                if (regModalTimer) {
                    clearTimeout(regModalTimer);
                    regModalTimer = null;
                }

                // Open the modal on the current page!
                void openRegModal();
            }
        }, true);
        }
    })();

    // CLEAR SESSION BUTTON — allow users to reset stored data without DevTools
    const clearSessionBtn = document.getElementById('clearSessionBtn');
    if (clearSessionBtn) {
        clearSessionBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Confirm before clearing
            if (!confirm('This will clear your stored session data and reload the page. Continue?')) {
                return;
            }
            
            // Clear all storage
            try {
                localStorage.clear();
                sessionStorage.clear();
                console.log('✅ Session cleared successfully');
            } catch (err) {
                console.error('Error clearing session:', err);
            }
            
            // Reload the page
            window.location.reload();
        });
    }
});





// Country info data for destination page
const countryDetails = {
    usa: {
        title: 'United States',
        summary: 'Innovation hub with diverse programs and strong post-study opportunities.',
        reasons: [
            'World-leading research universities and labs',
            'Optional Practical Training (OPT) for work experience',
            'Vast scholarship options and assistantships'
        ],
        universities: [
            { name: 'Harvard University', location: 'Cambridge, MA', tag: 'Ivy' },
            { name: 'Stanford University', location: 'Stanford, CA', tag: 'Top Tech' },
            { name: 'MIT', location: 'Cambridge, MA', tag: 'Research' },
            { name: 'UC Berkeley', location: 'Berkeley, CA', tag: 'Public Ivy' },
            { name: 'Carnegie Mellon University', location: 'Pittsburgh, PA', tag: 'CS' }
        ]
    },
    uk: {
        title: 'United Kingdom',
        summary: 'Historic institutions with 1-year master’s options and rich culture.',
        reasons: [
            'Shorter course durations save time and cost',
            'Post-Study Work (Graduate Route) visa',
            'Excellent humanities, business, and design programs'
        ],
        universities: [
            { name: 'University of Oxford', location: 'Oxford', tag: 'Historic' },
            { name: 'University of Cambridge', location: 'Cambridge', tag: 'Historic' },
            { name: 'Imperial College London', location: 'London', tag: 'STEM' },
            { name: 'London School of Economics', location: 'London', tag: 'Economics' },
            { name: 'University College London', location: 'London', tag: 'Global' }
        ]
    },
    canada: {
        title: 'Canada',
        summary: 'Welcoming, affordable, and strong pathways to work and PR.',
        reasons: [
            'Co-op programs that blend study and paid work',
            'Post-Graduation Work Permit (PGWP)',
            'Safe, multicultural campuses'
        ],
        universities: [
            { name: 'University of Toronto', location: 'Toronto, ON', tag: 'Top' },
            { name: 'UBC', location: 'Vancouver, BC', tag: 'Research' },
            { name: 'McGill University', location: 'Montreal, QC', tag: 'Global' },
            { name: 'University of Waterloo', location: 'Waterloo, ON', tag: 'Co-op' },
            { name: 'McMaster University', location: 'Hamilton, ON', tag: 'STEM' }
        ]
    },
    australia: {
        title: 'Australia',
        summary: 'Strong employability, sunny lifestyle, and respected universities.',
        reasons: [
            'Post-study work rights in major cities',
            'High quality of life and safety',
            'Strong programs in engineering, business, health'
        ],
        universities: [
            { name: 'University of Melbourne', location: 'Melbourne', tag: 'Top' },
            { name: 'Australian National University', location: 'Canberra', tag: 'Research' },
            { name: 'University of Sydney', location: 'Sydney', tag: 'Global' },
            { name: 'UNSW Sydney', location: 'Sydney', tag: 'Engineering' },
            { name: 'Monash University', location: 'Melbourne', tag: 'STEM' }
        ]
    },
    germany: {
        title: 'Germany',
        summary: 'Affordable study with strong engineering and research culture.',
        reasons: [
            'Low or no tuition at many public universities',
            'Engineering and automotive excellence',
            'EU job market access after graduation'
        ],
        universities: [
            { name: 'TU Munich', location: 'Munich', tag: 'Engineering' },
            { name: 'RWTH Aachen', location: 'Aachen', tag: 'Engineering' },
            { name: 'Heidelberg University', location: 'Heidelberg', tag: 'Research' },
            { name: 'Humboldt University', location: 'Berlin', tag: 'Historic' },
            { name: 'University of Freiburg', location: 'Freiburg', tag: 'Research' }
        ]
    },
    newzealand: {
        title: 'New Zealand',
        summary: 'Stunning landscapes with work-friendly policies and safe campuses.',
        reasons: [
            'Post-study work opportunities up to 3 years',
            'Outdoor lifestyle and low crime',
            'Small class sizes and supportive teaching'
        ],
        universities: [
            { name: 'University of Auckland', location: 'Auckland', tag: 'Top' },
            { name: 'University of Otago', location: 'Dunedin', tag: 'Research' },
            { name: 'Victoria University of Wellington', location: 'Wellington', tag: 'Humanities' },
            { name: 'University of Canterbury', location: 'Christchurch', tag: 'Engineering' },
            { name: 'Massey University', location: 'Palmerston North', tag: 'Applied' }
        ]
    },
    france: {
        title: 'France',
        summary: 'World-class business, fashion, and arts education with rich culture.',
        reasons: [
            'Grandes Écoles and elite business schools',
            'Affordable public university tuition',
            'Vibrant culture, art, and cuisine'
        ],
        universities: [
            { name: 'HEC Paris', location: 'Paris', tag: 'Business' },
            { name: 'Sorbonne University', location: 'Paris', tag: 'Historic' },
            { name: 'École Polytechnique', location: 'Palaiseau', tag: 'Engineering' },
            { name: 'INSEAD', location: 'Fontainebleau', tag: 'MBA' },
            { name: 'Sciences Po', location: 'Paris', tag: 'Politics' }
        ]
    },
    netherlands: {
        title: 'Netherlands',
        summary: 'English-taught programs, innovation, and high quality of life.',
        reasons: [
            'Many programs fully in English',
            'Cycling-friendly, safe, and welcoming',
            'Strong design, business, and tech ecosystem'
        ],
        universities: [
            { name: 'TU Delft', location: 'Delft', tag: 'Engineering' },
            { name: 'University of Amsterdam', location: 'Amsterdam', tag: 'Global' },
            { name: 'Erasmus University Rotterdam', location: 'Rotterdam', tag: 'Business' },
            { name: 'Leiden University', location: 'Leiden', tag: 'Research' },
            { name: 'Utrecht University', location: 'Utrecht', tag: 'Research' }
        ]
    }
};

// Destination interactivity
const destinationCheckboxes = document.querySelectorAll('input[name="destinations"]');
const countryModal = document.getElementById('countryModal');
const modalUniversitySearch = document.getElementById('modalUniversitySearch');

if (destinationCheckboxes.length > 0) {
    destinationCheckboxes.forEach(cb => {
        cb.addEventListener('change', handleDestinationChange);
    });
}

if (modalUniversitySearch) {
    modalUniversitySearch.addEventListener('input', () => {
        filterModalUniversities(modalUniversitySearch.value.trim());
    });
}

function handleDestinationChange() {
    const selected = Array.from(destinationCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
    if (selected.length === 0) {
        return;
    }
    const countryKey = selected[0];
    renderCountryModal(countryKey);
}

function renderCountryModal(countryKey) {
    const data = countryDetails[countryKey];
    if (!data || !countryModal) return;

    const modalTitle = document.getElementById('modalCountryTitle');
    const modalLocation = document.getElementById('modalCountryLocation');
    const modalReasons = document.getElementById('modalCountryReasons');
    const modalUniversityList = document.getElementById('modalUniversityList');
    const modalUniversitySearchInput = document.getElementById('modalUniversitySearch');

    if (modalTitle) modalTitle.textContent = data.title;
    if (modalLocation) modalLocation.textContent = data.summary;

    if (modalReasons) {
        modalReasons.innerHTML = '';
        data.reasons.forEach(reason => {
            const li = document.createElement('li');
            li.textContent = reason;
            modalReasons.appendChild(li);
        });
    }

    if (modalUniversityList) {
        modalUniversityList.dataset.country = countryKey;
        modalUniversityList.innerHTML = '';
        data.universities.forEach(u => {
            const item = document.createElement('div');
            item.className = 'modal-university-item';
            item.innerHTML = `
                <span class="name">${u.name}</span>
                <span class="location">${u.location}</span>
                <span class="badge">${u.tag}</span>
            `;
            modalUniversityList.appendChild(item);
        });
    }

    if (modalUniversitySearchInput) {
        modalUniversitySearchInput.value = '';
    }

    if (countryModal) {
        countryModal.classList.add('show');
    }
}

function filterModalUniversities(query) {
    const modalUniversityList = document.getElementById('modalUniversityList');
    const countryKey = modalUniversityList ? modalUniversityList.dataset.country : '';
    const data = countryDetails[countryKey];
    if (!data || !modalUniversityList) return;

    modalUniversityList.innerHTML = '';
    const filtered = data.universities.filter(u =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.location.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
        modalUniversityList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-light);">No universities found</p>';
        return;
    }

    filtered.forEach(u => {
        const item = document.createElement('div');
        item.className = 'modal-university-item';
        item.innerHTML = `
            <span class="name">${u.name}</span>
            <span class="location">${u.location}</span>
            <span class="badge">${u.tag}</span>
        `;
        modalUniversityList.appendChild(item);
    });
}

function closeCountryModal() {
    if (countryModal) {
        countryModal.classList.remove('show');
    }
}

// Close modal when clicking on backdrop
if (countryModal) {
    countryModal.addEventListener('click', (e) => {
        if (e.target === countryModal) {
            closeCountryModal();
        }
    });
}


// --- DESTINATIONS CAROUSEL LOGIC ---
// (Note: This could also be optimized further if needed)

// Node-recycling infinite train for destination cards (no DOM duplication)
document.addEventListener('DOMContentLoaded', function initDestinationsTrain() {
    return; // Bypassed: completely disabled auto-scroll "train" carousel animation
    const section = document.querySelector('.destinations');
    if (!section) return;
    const track = section.querySelector('.destinations-grid');
    if (!track) return;
    if (track.dataset.trainInited) return;
    track.dataset.trainInited = '1';

    // Prepare container and inner wrapper
    track.style.overflow = 'hidden';
    track.style.position = track.style.position || 'relative';

    let inner = track.querySelector('.train-inner');
    if (!inner) {
        inner = document.createElement('div');
        inner.className = 'train-inner';
        inner.style.display = 'flex';
        inner.style.flexWrap = 'nowrap';
        inner.style.alignItems = 'stretch';
        inner.style.willChange = 'transform';
        // preserve gap from track
        const trackStyle = getComputedStyle(track);
        inner.style.gap = trackStyle.gap || '20px';
        // move children into inner
        while (track.firstChild) inner.appendChild(track.firstChild);
        track.appendChild(inner);
    }

    const getGap = () => parseFloat(getComputedStyle(inner).gap || 0);

    let x = 0; // translation in px
    let velocity = 80; // px per second (positive moves content leftwards)
    let paused = false;
    let dragging = false;
    let lastTime = performance.now();
    const CLICK_THRESHOLD = 6;

    // Stop the animation loop when not visible to avoid page-wide jank.
    let rafId = null;
    const startLoop = () => {
        if (rafId != null) return;
        lastTime = performance.now();
        rafId = requestAnimationFrame(step);
    };
    const stopLoop = () => {
        if (rafId == null) return;
        cancelAnimationFrame(rafId);
        rafId = null;
    };

    function recalcContainer() {
        return track.getBoundingClientRect();
    }

    function step(now) {
        try {
            const dt = Math.min(0.04, (now - lastTime) / 1000); // clamp dt
            lastTime = now;

            // If the tab is hidden, keep it stopped.
            if (document.hidden) {
                stopLoop();
                return;
            }

            if (!paused && !dragging) {
                x += velocity * dt;
                inner.style.transform = `translateX(${-x}px)`;
            }

            // Recycling: when first child fully leaves left bound, move it to end
            const containerRect = recalcContainer();
            const gap = getGap();

            if (inner.children.length > 1) {
                const MAX_RECYCLE_PER_FRAME = 6;
                let recycleCount = 0;

                // forward movement (positive velocity)
                if (velocity > 0) {
                    let first = inner.firstElementChild;
                    // use a loop in case multiple cards exit between frames
                    while (first && recycleCount < MAX_RECYCLE_PER_FRAME) {
                        const r = first.getBoundingClientRect();
                        if (r.right <= containerRect.left + 0.5) {
                            const w = r.width + gap;
                            // append to end and adjust translation so visual position stays steady
                            inner.appendChild(first);
                            x -= w;
                            inner.style.transform = `translateX(${-x}px)`;
                            recycleCount++;
                            first = inner.firstElementChild;
                            continue;
                        }
                        break;
                    }
                    if (recycleCount >= MAX_RECYCLE_PER_FRAME) console.warn('carousel: reached recycle limit this frame');
                } else if (velocity < 0) {
                    // reverse movement: move last to front when it fully enters from right
                    let last = inner.lastElementChild;
                    while (last && recycleCount < MAX_RECYCLE_PER_FRAME) {
                        const r = last.getBoundingClientRect();
                        if (r.left >= containerRect.right - 0.5) {
                            const w = r.width + gap;
                            inner.insertBefore(last, inner.firstElementChild);
                            x += w;
                            inner.style.transform = `translateX(${-x}px)`;
                            recycleCount++;
                            last = inner.lastElementChild;
                            continue;
                        }
                        break;
                    }
                    if (recycleCount >= MAX_RECYCLE_PER_FRAME) console.warn('carousel: reached recycle limit this frame (reverse)');
                }
            }
        } catch (err) {
            console.error('Carousel error:', err);
            // pause to avoid repeated exceptions
            paused = true;
        }

        rafId = requestAnimationFrame(step);
    }

    // Pause/resume based on viewport visibility
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(
            (entries) => {
                const entry = entries && entries[0];
                if (!entry) return;
                if (entry.isIntersecting) startLoop();
                else stopLoop();
            },
            { root: null, threshold: 0.05 }
        );
        io.observe(section);
    } else {
        startLoop();
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopLoop();
        else startLoop();
    });

    // Pause on hover/focus
    track.addEventListener('mouseenter', () => { paused = true; });
    track.addEventListener('mouseleave', () => { paused = false; });
    track.addEventListener('focusin', () => { paused = true; });
    track.addEventListener('focusout', () => { paused = false; });

    // Wheel scroll over the track should move the train and prevent page scroll
    let wheelTimeout = null;
    track.addEventListener('wheel', (e) => {
        // allow immediate carousel movement and stop the page from scrolling while over the track
        try { e.preventDefault(); } catch (err) { }
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (delta === 0) return;
        // apply a modest multiplier so wheel movement feels responsive
        const WHEEL_MULT = 1.5;
        x += delta * WHEEL_MULT;
        // set temporary velocity direction consistent with wheel direction
        velocity = delta < 0 ? -Math.abs(velocity) : Math.abs(velocity);
        // ensure transform updates immediately
        inner.style.transform = `translateX(${-x}px)`;
        clearTimeout(wheelTimeout);
        wheelTimeout = setTimeout(() => { velocity = Math.abs(velocity); }, 700);
    }, { passive: false });

    // Pointer drag + click detection
    let startX = 0;
    let startTranslate = 0;
    let moved = 0;
    let downCard = null;

    track.addEventListener('pointerdown', (e) => {
        dragging = true;
        paused = true;
        startX = e.clientX;
        startTranslate = x;
        moved = 0;
        downCard = e.target.closest('.destination-card');
        try { track.setPointerCapture(e.pointerId); } catch (err) { }
    });

    track.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        moved = Math.abs(dx);
        x = startTranslate - dx; // dragging right should move carousel right (negative translate)
        inner.style.transform = `translateX(${-x}px)`;
    });

    function endPointer(e) {
        if (!dragging) return;
        dragging = false;
        paused = false;
        if (downCard && moved < CLICK_THRESHOLD) {
            const href = downCard.getAttribute('href');
            if (href) window.location.href = href;
        }
        downCard = null;
        try { if (e && e.pointerId) track.releasePointerCapture(e.pointerId); } catch (err) { }
    }

    track.addEventListener('pointerup', endPointer);
    track.addEventListener('pointercancel', endPointer);

    // Recalculate if images load or on resize to keep measurements accurate
    function onImagesLoaded(callback) {
        const imgs = inner.querySelectorAll('img');
        if (imgs.length === 0) { callback(); return; }
        let loaded = 0;
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            callback();
        };
        imgs.forEach(img => {
            if (img.complete) {
                loaded++;
                if (loaded === imgs.length) finish();
                return;
            }

            img.addEventListener('load', () => {
                loaded++;
                if (loaded === imgs.length) finish();
            }, { once: true });

            img.addEventListener('error', () => {
                loaded++;
                if (loaded === imgs.length) finish();
            }, { once: true });
        });
        setTimeout(finish, 800); // fallback
    }

    window.addEventListener('resize', () => { /* container rect used each frame */ });

    onImagesLoaded(() => { /* ready */ });
});


// Form Validation and Submission
const registrationForm = document.getElementById('registrationForm');
const loginForm = document.getElementById('loginForm');

// Auth toggle (Sign up / Log in)
const authTabSignup = document.getElementById('authTabSignup');
const authTabLogin = document.getElementById('authTabLogin');
const signupPanel = document.getElementById('signupPanel');
const loginPanel = document.getElementById('loginPanel');
const forgotPanel = document.getElementById('forgotPanel');
const authFooterText = document.getElementById('authFooterText');
const authFooterAction = document.getElementById('authFooterAction');
const authFooter = document.querySelector('.auth-footer');

const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const forgotSendCodeBtn = document.getElementById('forgotSendCodeBtn');
const forgotBackToLogin = document.getElementById('forgotBackToLogin');

function setAuthMode(mode) {
    const isLogin = mode === 'login';
    const isForgot = mode === 'forgot';
    const isSignup = !isLogin && !isForgot;

    if (signupPanel) signupPanel.hidden = isLogin || isForgot;
    if (loginPanel) loginPanel.hidden = !isLogin;
    if (forgotPanel) forgotPanel.hidden = !isForgot;

    if (authTabSignup) {
        authTabSignup.classList.toggle('active', !isLogin);
        authTabSignup.setAttribute('aria-selected', String(!isLogin));
    }
    if (authTabLogin) {
        authTabLogin.classList.toggle('active', isLogin);
        authTabLogin.setAttribute('aria-selected', String(isLogin));
    }

    if (authFooter) authFooter.hidden = isForgot;

    // Social login buttons should appear only on the Sign up card
    const socialBlock = document.getElementById('authSocialBlock');
    if (socialBlock) socialBlock.hidden = !isSignup;

    if (authFooterText) authFooterText.textContent = isLogin ? "New here?" : "Already have an account?";
    if (authFooterAction) authFooterAction.textContent = isLogin ? "Sign up" : "Log in";

    // Login card: only email prefill after logout, never after registration.
    if (isLogin) {
        try {
            const loginEmailInput = document.getElementById('loginEmail');
            const loginPasswordInput = document.getElementById('loginPassword');
            // Only prefill email if user logged out previously
            const showLoginAfterLogout = localStorage.getItem('showLoginAfterLogout') === '1';
            const lastUserEmail = (localStorage.getItem('lastUserEmail') || '').trim();
            if (loginPasswordInput) loginPasswordInput.value = '';
            if (loginEmailInput) {
                if (showLoginAfterLogout && lastUserEmail) {
                    loginEmailInput.value = lastUserEmail;
                } else {
                    loginEmailInput.value = '';
                }
            }
        } catch {
            // ignore
        }
    } else if (!isForgot) {
        // Signup card: Clear all fields to prevent pre-fill
        try {
             const regInputs = ['fullName', 'email', 'phone', 'password'];
             const clearInputs = () => {
                 regInputs.forEach(id => {
                     const el = document.getElementById(id);
                     if (el) el.value = '';
                 });
             };
             clearInputs();
             setTimeout(clearInputs, 100);
        } catch {
             // ignore
        }
    }
}

// Auth mode selection at startup:
// - Logged in: section stays hidden
// - Logged out: always show Sign up card (never prefill login)
setAuthMode('signup');

// Immediately sync visibility based on login state
if (isRegisteredUser()) {
    hideRegistrationSection();
} else {
    // User is logged out - section can be visible but forms are blank
    syncRegistrationSectionForAuthState();
}

if (authTabSignup) authTabSignup.addEventListener('click', () => setAuthMode('signup'));
if (authTabLogin) authTabLogin.addEventListener('click', () => setAuthMode('login'));
if (authFooterAction) {
    authFooterAction.addEventListener('click', () => {
        const loginVisible = !!(loginPanel && !loginPanel.hidden);
        setAuthMode(loginVisible ? 'signup' : 'login');
    });
}

// Forgot password UI
let __resetCodeSent = false;
let __resetCodeVerified = false;

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', () => {
        setAuthMode('forgot');
        __resetCodeSent = false;
        __resetCodeVerified = false;
        const loginEmail = document.getElementById('loginEmail')?.value?.trim() || localStorage.getItem('userEmail') || '';
        const forgotEmail = document.getElementById('forgotEmail');
        if (forgotEmail && loginEmail) forgotEmail.value = loginEmail;

        const fields = document.getElementById('forgotPasswordFields');
        if (fields) fields.hidden = true;
        const resetBtn = document.getElementById('forgotResetBtn');
        if (resetBtn) resetBtn.disabled = true;
        const newPass = document.getElementById('forgotNewPassword');
        const confirmPass = document.getElementById('forgotConfirmPassword');
        if (newPass) newPass.disabled = true;
        if (confirmPass) confirmPass.disabled = true;

        const codeBlock = document.getElementById('forgotCodeBlock');
        if (codeBlock) codeBlock.style.display = 'none';

        const timerEl = document.getElementById('forgotTimer');
        if (timerEl) {
            timerEl.style.display = 'none';
            timerEl.textContent = '';
            timerEl.style.color = '#555';
        }

        if (forgotSendCodeBtn) {
            forgotSendCodeBtn.textContent = 'Send Code';
            forgotSendCodeBtn.disabled = false;
        }
    });
}

if (forgotBackToLogin) {
    forgotBackToLogin.addEventListener('click', () => {
        setAuthMode('login');
        __resetCodeSent = false;
        __resetCodeVerified = false;
    });
}

const setForgotPasswordVerifiedUI = (verified) => {
    __resetCodeVerified = !!verified;
    const step1 = document.getElementById('forgotStep1');
    const step2 = document.getElementById('forgotPasswordFields');
    const resetBtn = document.getElementById('forgotResetBtn');
    const newPass = document.getElementById('forgotNewPassword');
    const confirmPass = document.getElementById('forgotConfirmPassword');

    // Toggle steps
    if (step1) step1.hidden = __resetCodeVerified; // Hide Step 1 if verified
    if (step2) step2.hidden = !__resetCodeVerified; // Show Step 2 if verified

    // Enable/Disable fields
    if (resetBtn) resetBtn.disabled = !__resetCodeVerified;
    if (newPass) newPass.disabled = !__resetCodeVerified;
    if (confirmPass) confirmPass.disabled = !__resetCodeVerified;
};

setForgotPasswordVerifiedUI(false);

if (forgotSendCodeBtn) {
    let timerInterval = null;
    let expiresAtMs = null;

    const stopTimer = () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    };

    const startTimer = (minutes) => {
        const timerEl = document.getElementById('forgotTimer');
        if (!timerEl) return;

        stopTimer();
        expiresAtMs = Date.now() + minutes * 60 * 1000;
        timerEl.style.display = 'block';
        timerEl.style.color = '#555';

        const tick = () => {
            const msLeft = Math.max(0, expiresAtMs - Date.now());
            const totalSec = Math.floor(msLeft / 1000);
            const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
            const ss = String(totalSec % 60).padStart(2, '0');
            timerEl.textContent = `Code expires in ${mm}:${ss}`;
            if (msLeft <= 0) {
                stopTimer();
                __resetCodeSent = false;
                timerEl.textContent = 'Code expired. Please resend the code.';
                timerEl.style.color = '#ef4444';
                const codeBlock = document.getElementById('forgotCodeBlock');
                if (codeBlock) codeBlock.style.display = 'none';
                if (forgotSendCodeBtn) {
                    forgotSendCodeBtn.textContent = 'Resend Code';
                    forgotSendCodeBtn.disabled = false;
                }
            }
        };

        tick();
        timerInterval = setInterval(tick, 1000);
    };

    forgotSendCodeBtn.addEventListener('click', async () => {
        const email = document.getElementById('forgotEmail')?.value?.trim();

        if (!email) {
            showNotification('Please enter your email', 'error');
            return;
        }
        // No longer require WhatsApp number for forgot password

        setForgotPasswordVerifiedUI(false);
        showNotification('Sending code...', 'info');

        const originalText = forgotSendCodeBtn.textContent || 'Send Code';
        forgotSendCodeBtn.textContent = 'Sending...';
        forgotSendCodeBtn.disabled = true;

        let success = false;

        try {
            const resp = await fetch(`${API_BASE_URL}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const payload = await resp.json().catch(() => ({}));
            if (!resp.ok || !payload?.success) {
                throw new Error(payload?.error || 'Unable to send code');
            }

            success = true;
            __resetCodeSent = true;
            showNotification('Code sent to your email. Please enter it below.', 'success');

            const codeBlock = document.getElementById('forgotCodeBlock');
            if (codeBlock) codeBlock.style.display = 'block';

            forgotSendCodeBtn.textContent = 'Resend Code';
            forgotSendCodeBtn.disabled = false;

            // Start 5 minute expiry timer (matches backend default)
            startTimer(5);
        } catch (err) {
            console.error('Forgot password send code error:', err);
            showNotification(err?.message || 'Unable to send code. Please try again later.', 'error');
        } finally {
            if (!success) {
                forgotSendCodeBtn.textContent = originalText;
                forgotSendCodeBtn.disabled = false;
            }
        }
    });
}

// Verify code on 6-digit entry to unlock password fields
const forgotCodeInput = document.getElementById('forgotCode');
if (forgotCodeInput) {
    let verifyInFlight = false;

    // Password Toggle Logic
    const setupPasswordToggle = (toggleId, inputId) => {
        const toggleBtn = document.getElementById(toggleId);
        const inputField = document.getElementById(inputId);
        if (toggleBtn && inputField) {
            toggleBtn.addEventListener('click', () => {
                const type = inputField.getAttribute('type') === 'password' ? 'text' : 'password';
                inputField.setAttribute('type', type);
                toggleBtn.classList.toggle('fa-eye');
                toggleBtn.classList.toggle('fa-eye-slash');
            });
        }
    };

    setupPasswordToggle('toggleForgotNewPassword', 'forgotNewPassword');
    setupPasswordToggle('toggleForgotConfirmPassword', 'forgotConfirmPassword');
    setupPasswordToggle('toggleForgotCode', 'forgotCode'); // Added toggle for code
    // New Toggles
    setupPasswordToggle('toggleRegPassword', 'password');
    setupPasswordToggle('toggleLoginPassword', 'loginPassword');

    // Password Rules Validation
    const forgotNewPasswordInput = document.getElementById('forgotNewPassword');
    if (forgotNewPasswordInput) {
        forgotNewPasswordInput.addEventListener('input', () => {
            const password = forgotNewPasswordInput.value;
            
            const updateRule = (id, condition) => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.color = condition ? '#10b981' : '#ef4444'; // Green or Red
                    // User requested no strike-through, just color change
                    el.style.textDecoration = 'none'; 
                }
            };

            updateRule('ruleLength', password.length >= 8);
            updateRule('ruleUpper', /[A-Z]/.test(password));
            updateRule('ruleLower', /[a-z]/.test(password));
            updateRule('ruleNumber', /[0-9]/.test(password));
            updateRule('ruleSpecial', /[!@#$%^&*]/.test(password));
        });
    }

    const tryVerifyCode = async () => {
        const email = document.getElementById('forgotEmail')?.value?.trim();
        const code = forgotCodeInput.value?.trim();

        // Reset UI until verified
        setForgotPasswordVerifiedUI(false);

        if (!__resetCodeSent) return;
        if (!email || !code) return;
        if (!/^\d{6}$/.test(code)) return;
        if (verifyInFlight) return;
        verifyInFlight = true;

        try {
            const resp = await fetch(`${API_BASE_URL}/api/verify-reset-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            const payload = await resp.json().catch(() => ({}));
            if (!resp.ok || !payload?.success) {
                throw new Error(payload?.error || 'Invalid code');
            }

            setForgotPasswordVerifiedUI(true);
            showNotification('Code verified. Please set your new password.', 'success');
        } catch (err) {
            setForgotPasswordVerifiedUI(false);
            showNotification(err?.message || 'Invalid or expired code.', 'error');
        } finally {
            verifyInFlight = false;
        }
    };

    forgotCodeInput.addEventListener('input', () => {
        setForgotPasswordVerifiedUI(false);
    });

    // Manual Verify Button
    const verifyBtn = document.getElementById('forgotVerifyCodeBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', () => {
             tryVerifyCode();
        });
    }
}

if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('forgotEmail')?.value?.trim();
        const code = document.getElementById('forgotCode')?.value?.trim();
        const newPassword = document.getElementById('forgotNewPassword')?.value || '';
        const confirmPassword = document.getElementById('forgotConfirmPassword')?.value || '';

        if (!email) return showNotification('Please enter your email', 'error');
        if (!/^\d{6}$/.test(String(code || ''))) return showNotification('Please enter the 6-digit code', 'error');
        if (!newPassword) return showNotification('Please enter a new password', 'error');
        if (newPassword !== confirmPassword) return showNotification('Passwords do not match', 'error');

        const strong = (
            newPassword.length >= 8 &&
            /[A-Z]/.test(newPassword) &&
            /[a-z]/.test(newPassword) &&
            /[0-9]/.test(newPassword) &&
            /[!@#$%^&*]/.test(newPassword)
        );
        if (!strong) {
            return showNotification('Password must meet all rules shown above.', 'error');
        }

        const resetBtn = document.getElementById('forgotResetBtn');
        const originalText = resetBtn?.textContent || 'Reset Password';
        if (resetBtn) {
            resetBtn.textContent = 'Updating...';
            resetBtn.disabled = true;
        }

        try {
            const resp = await fetch(`${API_BASE_URL}/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword })
            });
            const payload = await resp.json().catch(() => ({}));
            if (!resp.ok || !payload?.success) {
                throw new Error(payload?.error || 'Unable to reset password');
            }

            showNotification('Password updated successfully. Please log in.', 'success');
            setAuthMode('login');
            try {
                const loginEmail = document.getElementById('loginEmail');
                if (loginEmail) loginEmail.value = email;
                const loginPass = document.getElementById('loginPassword');
                if (loginPass) loginPass.value = '';
            } catch {
                // ignore
            }
        } catch (err) {
            console.error('Reset password error:', err);
            showNotification(err?.message || 'Unable to reset password. Please try again.', 'error');
        } finally {
            if (resetBtn) {
                resetBtn.textContent = originalText;
                resetBtn.disabled = false;
            }
        }
    });
}

if (registrationForm) {
    const passwordInput = document.getElementById('password');
    const passwordRequirements = document.querySelector('.password-requirements');

    // Password requirement patterns
    const passwordPatterns = {
        uppercase: /[A-Z]/,
        lowercase: /[a-z]/,
        number: /[0-9]/,
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
        length: /.{8,}/
    };

    // Show password requirements on focus
    if (passwordInput) {
        passwordInput.addEventListener('focus', () => {
            if (passwordRequirements) {
                passwordRequirements.classList.add('show');
            }
        });

        // Update requirements on input
        passwordInput.addEventListener('input', updatePasswordRequirements);
    }

    function updatePasswordRequirements() {
        const password = passwordInput.value;

        // Check uppercase
        const reqUppercase = document.getElementById('req-uppercase');
        if (passwordPatterns.uppercase.test(password)) {
            reqUppercase.classList.add('met');
        } else {
            reqUppercase.classList.remove('met');
        }

        // Check lowercase
        const reqLowercase = document.getElementById('req-lowercase');
        if (passwordPatterns.lowercase.test(password)) {
            reqLowercase.classList.add('met');
        } else {
            reqLowercase.classList.remove('met');
        }

        // Check number
        const reqNumber = document.getElementById('req-number');
        if (passwordPatterns.number.test(password)) {
            reqNumber.classList.add('met');
        } else {
            reqNumber.classList.remove('met');
        }

        // Check special character
        const reqSpecial = document.getElementById('req-special');
        if (passwordPatterns.special.test(password)) {
            reqSpecial.classList.add('met');
        } else {
            reqSpecial.classList.remove('met');
        }

        // Check length
        const reqLength = document.getElementById('req-length');
        if (passwordPatterns.length.test(password)) {
            reqLength.classList.add('met');
        } else {
            reqLength.classList.remove('met');
        }
    }

    function isPasswordStrong(password) {
        return passwordPatterns.uppercase.test(password) &&
            passwordPatterns.lowercase.test(password) &&
            passwordPatterns.number.test(password) &&
            passwordPatterns.special.test(password) &&
            passwordPatterns.length.test(password);
    }

    const continueToApplicationForm = () => {
        sessionStorage.setItem('pendingApplicationStep', '2');
        sessionStorage.setItem('isSessionActive', 'true');
        try { localStorage.setItem('isSessionActive', 'true'); } catch {}
        window.location.href = 'next-form.html';
    };

    const showPostSignupPromptAndRedirect = () => {
        // Keep the helper for any other callers, but go directly to step 2.
        continueToApplicationForm();
    };

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form values
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password')?.value.trim();
        const visaType = document.getElementById('visaType')?.value || 'student';
        const city = document.getElementById('city')?.value.trim() || 'Not specified';
        const country = document.getElementById('country')?.value || 'Not specified';

        // Validate form fields
        if (!fullName || !email || !phone) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Validate email
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Validate phone number - exactly 10 digits
        const phonePattern = /^[0-9]{10}$/;
        if (!phonePattern.test(phone)) {
            showNotification('Please enter a valid 10-digit phone number', 'error');
            return;
        }

        // Validate password strength if password field exists
        if (password && !isPasswordStrong(password)) {
            showNotification('Password does not meet all requirements. Please check the criteria.', 'error');
            return;
        }

        // Show loading state
        const submitButton = registrationForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Submitting...';
        submitButton.disabled = true;

        try {
            const editMode = sessionStorage.getItem('editRegistration') === '1';
            const currentUserId = sessionStorage.getItem('currentUserId') || localStorage.getItem('currentUserId') || '';

            // Send data to backend
            const response = await fetch(apiUrl(editMode ? '/api/update-registration' : '/api/register'), {
                method: editMode ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fullName,
                    email,
                    phone,
                    password,
                    ...(editMode && currentUserId ? { userId: currentUserId } : {})
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Success message
                showNotification(editMode ? 'Details updated successfully!' : 'Registration successful!', 'success');

                // Activate browser session
                sessionStorage.setItem('isSessionActive', 'true');

                if (data.userId) {
                    sessionStorage.setItem('currentUserId', data.userId);
                    localStorage.setItem('currentUserId', data.userId);
                }

                // Store email in localStorage for additional-info form
                localStorage.setItem('userEmail', email);
                try { localStorage.setItem('lastUserEmail', email); } catch { }
                try { localStorage.setItem('hasSignedUp', '1'); } catch { }

                // Mark this session as "just registered" so we don't auto-redirect on #registration-section
                // (User should be able to explore the website normally after signup.)
                sessionStorage.setItem('justRegistered', '1');

                // Store data for profile (session + local so it persists after refresh)
                const registrationPayload = { fullName, email, phone };
                sessionStorage.setItem('registrationData', JSON.stringify(registrationPayload));
                localStorage.setItem('registrationData', JSON.stringify(registrationPayload));

                try {
                    if (typeof window.__updateProfileBadge === 'function') window.__updateProfileBadge();
                } catch {
                    // ignore
                }

                if (editMode) {
                    sessionStorage.removeItem('editRegistration');
                }

                // If registration UI is shown as a modal, close it so the site displays normally.
                try {
                    document.body.classList.remove('reg-modal-open');
                    const overlay = document.getElementById('regModalOverlay');
                    if (overlay) overlay.hidden = true;

                    // Remove hash if it was #registration-section so the page looks normal.
                    if (window.location.hash === '#registration-section') {
                        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
                    }
                } catch {
                    // ignore
                }

                // Log form data
                console.log('Registration successful:', data);

                // Reset form
                registrationForm.reset();
                if (passwordRequirements) {
                    passwordRequirements.classList.remove('show');
                }

                // Restore submit button text in case we were in edit mode
                try {
                    const submitBtn = registrationForm.querySelector('button[type="submit"]');
                    if (submitBtn) submitBtn.textContent = 'Submit';
                    const emailEl = document.getElementById('email');
                    if (emailEl) emailEl.readOnly = false;
                } catch {
                    // ignore
                }

                // --- Auto-Login & Redirect Logic ---
                // 1. Store user session immediately so they are "Logged In"
                localStorage.setItem('userEmail', email); 
                localStorage.setItem('hasSignedUp', '1');
                // Clear any previous completion state so first-time step-2 entry won't
                // get treated like a fully completed application.
                try {
                    localStorage.removeItem('isApplicationDone');
                    localStorage.removeItem('applicationCompleted');
                    sessionStorage.removeItem('applicationCompleted');
                } catch {
                    // ignore
                }
                
                // Store registration data for the next form
                const regData = { fullName, email, phone };
                sessionStorage.setItem('registrationData', JSON.stringify(regData));
                localStorage.setItem('registrationData', JSON.stringify(regData));

                // 2. Hide the registration UI immediately
                hideRegistrationSection();

                // If it was a modal, close the overlay too
                if (typeof closeRegModal === 'function') {
                    closeRegModal();
                } else {
                    const signupPanel = document.getElementById('signupPanel');
                    if (signupPanel) signupPanel.style.display = 'none';
                    document.body.classList.remove('reg-modal-open');
                }

                // 3. Update UI (Profile Badge)
                try {
                    if (typeof window.__updateProfileBadge === 'function') window.__updateProfileBadge();
                } catch {}

                // Keep section state aligned with current login state.
                syncRegistrationSectionForAuthState();

                // 4. Direct next step UX: Auto-redirect to application form (Step 2)
                // as requested — mark the user as registered and take them to step 2.
                if (!editMode) {
                    try { localStorage.setItem('isRegistered', 'true'); } catch {};
                    try { sessionStorage.setItem('justRegistered', '1'); } catch {}
                    try { sessionStorage.setItem('pendingApplicationStep', '2'); } catch {}
                    // Keep older compatibility keys
                    try { localStorage.setItem('hasSignedUp', '1'); } catch {}
                    showNotification('Registration successful! Opening Step 2...', 'success');
                    
                    // Redirect to next-form.html after signup
                    setTimeout(() => {
                        continueToApplicationForm();
                    }, 800);
                    return;
                }

                // Force hide registration section after signup
                setTimeout(() => {
                    hideRegistrationSection();
                    syncRegistrationSectionForAuthState();
                }, 100);
            } else {
                // Show error message from backend
                const errorMsg = data.error || 'Registration failed.';
                
                // Smart handling for duplicate accounts
                if (errorMsg.includes('Duplicate entry') || errorMsg.includes('already registered')) {
                    showNotification('You are already registered! Switching to Login...', 'info');
                    
                    // Switch to login tab
                    if (typeof setAuthMode === 'function') {
                        setAuthMode('login');
                    }
                    
                    // Prefill email for convenience
                    const loginEmail = document.getElementById('loginEmail');
                    if (loginEmail) loginEmail.value = email;
                    
                    // Focus password
                    const loginPass = document.getElementById('loginPassword');
                    if (loginPass) loginPass.focus();
                } else {
                    showNotification(errorMsg, 'error');
                }
                
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            }
        } catch (error) {
            console.warn('Registration server offline. Using local backup:', error);
            
            // --- Local Backup Success Fallback ---
            localStorage.setItem('userEmail', email); 
            localStorage.setItem('hasSignedUp', '1');
            try {
                localStorage.removeItem('isApplicationDone');
                localStorage.removeItem('applicationCompleted');
                sessionStorage.removeItem('applicationCompleted');
            } catch {
                // ignore
            }
            try { localStorage.setItem('isRegistered', 'true'); } catch {};
            try { sessionStorage.setItem('justRegistered', '1'); } catch {}
            try { sessionStorage.setItem('pendingApplicationStep', '2'); } catch {}
            
            const regData = { fullName, email, phone };
            sessionStorage.setItem('registrationData', JSON.stringify(regData));
            localStorage.setItem('registrationData', JSON.stringify(regData));

            showNotification('Registration successful!', 'success');
            
            setTimeout(() => {
                continueToApplicationForm();
            }, 800);
        }
    });

    // Social login buttons
    const googleBtn = document.querySelector('.google-btn');
    const facebookBtn = document.querySelector('.facebook-btn');

    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showNotification('Google login will be available soon', 'info');
        });
    }

    if (facebookBtn) {
        facebookBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showNotification('Facebook login will be available soon', 'info');
        });
    }
}

// Login form submission — moved inside DOMContentLoaded for correct scope
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value.trim();

        if (!email || !password) {
            showNotification('Please enter email and password', 'error');
            return;
        }

        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton ? submitButton.textContent : 'Log in';
        if (submitButton) {
            submitButton.textContent = 'Logging in...';
            submitButton.disabled = true;
        }

        try {
            const response = await fetch(apiUrl('/api/login'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showNotification('Login successful!', 'success');
                
                // Activate browser session
                sessionStorage.setItem('isSessionActive', 'true');

                if (data.userId) {
                    sessionStorage.setItem('currentUserId', data.userId);
                    localStorage.setItem('currentUserId', data.userId);
                }
                localStorage.setItem('userEmail', email);
                localStorage.setItem('isRegistered', 'true');
                
                // Sync step 2 application completion status returned by the server on login
                if (data.isApplicationCompleted) {
                    localStorage.setItem('applicationCompleted', '1');
                    localStorage.setItem('isApplicationDone', 'true');
                    sessionStorage.setItem('applicationCompleted', '1');
                } else {
                    localStorage.removeItem('applicationCompleted');
                    localStorage.removeItem('isApplicationDone');
                    sessionStorage.removeItem('applicationCompleted');
                }

                // Force close registration/login modal
                const closeBtn = document.getElementById('regModalClose');
                if (document.body.classList.contains('reg-modal-open') && closeBtn) {
                    closeBtn.click();
                } else if (typeof closeRegModal === 'function') {
                    closeRegModal();
                }

                // hide the registration panel now that user is authenticated
                hideRegistrationSection();
                syncRegistrationSectionForAuthState();
                
                // remove any #registration-section hash so it doesn't reopen
                if (window.location.hash === '#registration-section') {
                    window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
                }

                // User is signed in again; don't keep showing the login card on reopen.
                try { localStorage.removeItem('showLoginAfterLogout'); } catch { }
                try { localStorage.setItem('lastUserEmail', email); } catch { }
                try { localStorage.setItem('hasSignedUp', '1'); } catch { }

                try {
                    const fullName = data?.data?.fullName || '';
                    const phone = data?.data?.phone || '';
                    const registrationPayload = { fullName, email, phone };
                    sessionStorage.setItem('registrationData', JSON.stringify(registrationPayload));
                    localStorage.setItem('registrationData', JSON.stringify(registrationPayload));
                } catch {
                    // ignore
                }

                try {
                    if (typeof window.__updateProfileBadge === 'function') window.__updateProfileBadge();
                } catch {
                    // ignore
                }

                await hydrateProfileFromServer(email);
                
                // Extra enforcement: hide the section
                setTimeout(() => {
                    hideRegistrationSection();
                    syncRegistrationSectionForAuthState();
                }, 100);
            } else {
                showNotification(data.error || 'Login failed. Please try again.', 'error');
            }
        } catch (error) {
            console.warn('Login server offline. Using local fallback:', error);
            
            // --- Local Backup Login Success Fallback ---
            showNotification('Login successful!', 'success');
            
            // Activate browser session
            sessionStorage.setItem('isSessionActive', 'true');
            localStorage.setItem('userEmail', email);
            localStorage.setItem('isRegistered', 'true');
            localStorage.setItem('hasSignedUp', '1');
            
            // Check if they completed Step 2 in a past session locally
            const wasAppCompleted = localStorage.getItem('isApplicationDone') === 'true' || localStorage.getItem('applicationCompleted') === '1';
            if (wasAppCompleted) {
                localStorage.setItem('applicationCompleted', '1');
                localStorage.setItem('isApplicationDone', 'true');
                sessionStorage.setItem('applicationCompleted', '1');
            } else {
                localStorage.removeItem('applicationCompleted');
                localStorage.removeItem('isApplicationDone');
                sessionStorage.removeItem('applicationCompleted');
            }
            
            // Sync registration data
            try {
                const regData = JSON.parse(localStorage.getItem('registrationData') || '{}');
                const fullName = regData.fullName || 'Demo User';
                const phone = regData.phone || '9999999999';
                const registrationPayload = { fullName, email, phone };
                sessionStorage.setItem('registrationData', JSON.stringify(registrationPayload));
                localStorage.setItem('registrationData', JSON.stringify(registrationPayload));
            } catch {}

            // Force close registration/login modal
            const closeBtn = document.getElementById('regModalClose');
            if (document.body.classList.contains('reg-modal-open') && closeBtn) {
                closeBtn.click();
            } else if (typeof closeRegModal === 'function') {
                closeRegModal();
            }

            hideRegistrationSection();
            syncRegistrationSectionForAuthState();
            
            if (window.location.hash === '#registration-section') {
                window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
            }
            
            try { localStorage.removeItem('showLoginAfterLogout'); } catch { }
            try { localStorage.setItem('lastUserEmail', email); } catch { }

            try {
                if (typeof window.__updateProfileBadge === 'function') window.__updateProfileBadge();
            } catch {}

                await hydrateProfileFromServer(email);
            
            setTimeout(() => {
                hideRegistrationSection();
                syncRegistrationSectionForAuthState();
            }, 100);
        } finally {
            if (submitButton) {
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            }
        }
    });
}

// Notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 40000;
        animation: slideInRight 0.3s ease-out;
        font-weight: 500;
        max-width: min(420px, calc(100vw - 40px));
        line-height: 1.35;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add animation on scroll for elements
const observerOptions = {
    threshold: 0.05,
    rootMargin: '0px 0px 150px 0px' // Trigger 150px before entering viewport
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target); // Stop observing once visible
        }
    });
}, observerOptions);

// Observe destination cards
document.querySelectorAll('.destination-card, .feature').forEach((card) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
    observer.observe(card);
});


// Add hover effect to form inputs
const formInputs = document.querySelectorAll('.form-group input, .form-group select');
formInputs.forEach(input => {
    input.addEventListener('focus', () => {
        input.parentElement.style.transform = 'scale(1.02)';
        input.parentElement.style.transition = 'transform 0.3s ease';
    });

    input.addEventListener('blur', () => {
        input.parentElement.style.transform = 'scale(1)';
    });
});

// --- (End of scroll highlighting handled in main listener) ---


// Destination Form Validation
const destinationForm = document.getElementById('destinationForm');

if (destinationForm) {
    destinationForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get personal details
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const middleName = document.getElementById('middleName').value.trim();
        const dateOfBirth = document.getElementById('dateOfBirth').value;
        const gender = document.getElementById('gender').value;
        const nationality = document.getElementById('nationality').value.trim();
        const address = document.getElementById('address').value.trim();
        const city = document.getElementById('city').value.trim();
        const state = document.getElementById('state').value.trim();
        const zipCode = document.getElementById('zipCode').value.trim();
        const passportNumber = document.getElementById('passportNumber').value.trim();
        const educationLevel = document.getElementById('educationLevel').value;

        // Get selected destinations
        const destinationCheckboxes = document.querySelectorAll('input[name="destinations"]:checked');
        const selectedDestinations = Array.from(destinationCheckboxes).map(cb => cb.value);

        // Validate required fields
        if (!firstName || !lastName || !dateOfBirth || !gender || !nationality ||
            !address || !city || !state || !zipCode || !passportNumber || !educationLevel) {
            showNotification('Please fill in all required personal details', 'error');
            return;
        }

        // Validate destinations selection
        if (selectedDestinations.length === 0) {
            showNotification('Please select at least one destination country', 'error');
            return;
        }

        // Validate date of birth (must be at least 16 years old)
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        if (age < 16) {
            showNotification('You must be at least 16 years old', 'error');
            return;
        }

        // Validate passport number (basic validation - alphanumeric)
        if (!/^[A-Z0-9]{6,9}$/.test(passportNumber.toUpperCase())) {
            showNotification('Please enter a valid passport number', 'error');
            return;
        }

        // Log form data
        const formData = {
            personalDetails: {
                firstName,
                middleName,
                lastName,
                dateOfBirth,
                gender,
                nationality,
                address,
                city,
                state,
                zipCode,
                passportNumber,
                educationLevel,
                age
            },
            destinations: selectedDestinations
        };

        console.log('Destination Form submitted:', formData);

        // Success message
        showNotification('Registration completed successfully! Welcome to Abroad Vision Careerz.', 'success');

        // Reset form
        destinationForm.reset();

        // Show celebration
        showCelebration();
    });
}

// Celebration functions
function showCelebration() {
    const modal = document.getElementById('celebrationModal');
    if (modal) {
        modal.classList.add('show');
        createConfetti();
        playSuccessSound();
    }
}

function closeCelebration() {
    const modal = document.getElementById('celebrationModal');
    if (modal) {
        modal.classList.remove('show');
    }

    // Redirect after closing
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 300);
}

// Create confetti animation
function createConfetti() {
    const confettiContainer = document.getElementById('confetti');
    if (!confettiContainer) return;

    const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (Math.random() * 1 + 2) + 's';
        confetti.style.width = (Math.random() * 10 + 5) + 'px';
        confetti.style.height = (Math.random() * 10 + 5) + 'px';

        confettiContainer.appendChild(confetti);
    }
}

// Play success sound (optional)
function playSuccessSound() {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// ==========================================
// Global Course Register Button Logic
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Capture current country context based on filename
    const path = window.location.pathname.toLowerCase();
    const destinationMap = {
        'uk.html': 'UK',
        'usa.html': 'USA',
        'canada.html': 'Canada',
        'australia.html': 'Australia',
        'germany.html': 'Germany',
        'newzealand.html': 'New Zealand',
        'italy.html': 'Italy',
        'singapore.html': 'Singapore'
    };
    for (const [file, country] of Object.entries(destinationMap)) {
        if (path.includes(file)) {
            break;
        }
    }

    function setupProgramTags() {
        const tags = [...document.querySelectorAll('.program-tag')];
        tags.forEach((tag) => {
            if (tag.closest('.course-item')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'course-item';

            const registerBtn = document.createElement('a');
            registerBtn.className = 'course-register-btn';
            registerBtn.href = 'index.html#registration-section';
            registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Register Now';

            registerBtn.addEventListener('click', (e) => {
                // Prefer existing helpers to determine state; avoid redirecting immediately
                // if the session was just registered (prevents accidental navigation loops).
                const justRegistered = sessionStorage.getItem('justRegistered') === '1';
                const alreadyRegistered = isRegisteredUser() || isApplicationCompleted();

                if (alreadyRegistered && !justRegistered) {
                    e.preventDefault();
                    void routeSignedInUserToCorrectPage();
                }
            });

            // Insert wrapper before tag, move tag inside wrapper, append btn
            tag.parentNode.insertBefore(wrapper, tag);
            wrapper.appendChild(tag);
            wrapper.appendChild(registerBtn);
        });
    }

    // Run once for statically rendered HTML
    setupProgramTags();

    // Use MutationObserver for tags added dynamically via internal scripts
    const observer = new MutationObserver((mutations) => {
        let tagsFound = false;
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                tagsFound = true;
            }
        });
        if (tagsFound) {
            setupProgramTags();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Handle selection cleanly
    document.addEventListener('click', (e) => {
        const tag = e.target.closest('.program-tag');
        if (!tag) return;

        const row = tag.closest('.course-item');
        if (!row) return;

        const isSelected = row.classList.contains('selected');

        // Deselect all others
        document.querySelectorAll('.course-item.selected').forEach((item) => {
            if (item !== row) {
                item.classList.remove('selected');
            }
        });

        // Toggle selection
        if (!isSelected) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    });
});
