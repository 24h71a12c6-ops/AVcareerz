// --- API Configuration (Global Scope) ---
// Define the backend service URL for connection

const BACKEND_SERVICE_URL = 'https://abroad-vision-carrerz-heg3.onrender.com';
const API_BASE_URL = BACKEND_SERVICE_URL;

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

// --- Main Application Logic ---
document.addEventListener("DOMContentLoaded", function () {
    // Check if the user is already logged in
    const isRegisteredUser = () => !!localStorage.getItem('userEmail');
    
    // Check if current page is the Home Page
    const isHomePagePath = () => 
        window.location.pathname.endsWith('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname === '/index.html';

    // ... Rest of your logic continues here ...
   
    (function initImageLoadingHints() {
        try {
            const imgs = Array.from(document.images || []);
            imgs.forEach((img) => {
                if (!img) return;
                if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');

                // Keep hero + navbar/logo eager; everything else can be lazy.
                const inHero = !!img.closest('.hero');
                const inNavbar = !!img.closest('.navbar');
                const hasLoading = img.hasAttribute('loading');
                if (!hasLoading) {
                    img.setAttribute('loading', (inHero || inNavbar) ? 'eager' : 'lazy');
                }

                // First hero slide image should be high priority.
                if (inHero && img.closest('.hero-slide')?.classList.contains('active')) {
                    if (!img.getAttribute('fetchpriority')) img.setAttribute('fetchpriority', 'high');
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

    // 2. NAV TOGGLE
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const spans = navToggle.querySelectorAll('span');
            if (navMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
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
                const profileToggle = profileEl.querySelector('[data-action="profile-toggle"]');
                const logoutBtn = profileEl.querySelector('[data-action="logout"]');
                const submenu = profileEl.querySelector('.profile-submenu');

                if (signedIn) {
                    profileEl.classList.add('is-signed-in');
                    if (initialEl) {
                        initialEl.textContent = initial || 'U';
                        initialEl.hidden = false;
                    }
                    if (iconEl) iconEl.hidden = true;

                    if (authBtn) authBtn.hidden = true;
                    if (profileToggle) profileToggle.hidden = false;
                    if (logoutBtn) logoutBtn.hidden = false;
                    if (submenu) submenu.hidden = true;
                } else {
                    profileEl.classList.remove('is-signed-in');
                    if (initialEl) initialEl.hidden = true;
                    if (iconEl) iconEl.hidden = false;

                    if (authBtn) authBtn.hidden = false;
                    if (profileToggle) profileToggle.hidden = true;
                    if (logoutBtn) logoutBtn.hidden = true;
                    if (submenu) submenu.hidden = true;
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
                localStorage.removeItem('registrationData');
                localStorage.removeItem('nextFormData');
                localStorage.removeItem('currentUserId');
                sessionStorage.removeItem('registrationData');
                sessionStorage.removeItem('nextFormData');
                sessionStorage.removeItem('currentUserId');
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
            if (host.querySelector('[data-profile-menu="true"]')) return;

            // Ensure a right-side wrapper so the icon stays on the right even on mobile
            let navRight = host.querySelector('.nav-right');
            if (!navRight) {
                navRight = document.createElement('div');
                navRight.className = 'nav-right';
                host.appendChild(navRight);
            }

            // Move existing hamburger into the right wrapper if present
            const toggle = host.querySelector('#navToggle');
            if (toggle && toggle.parentElement !== navRight) {
                navRight.appendChild(toggle);
            }

            const profile = document.createElement('div');
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
                    <button type="button" class="profile-item profile-item--submenu" data-action="profile-toggle" aria-expanded="false" role="menuitem">
                        <span>Profile</span>
                        <span class="profile-chevron" aria-hidden="true">▸</span>
                    </button>
                    <div class="profile-submenu" hidden>
                        <div class="profile-subtitle">Saved details</div>
                        <div class="profile-saved" data-saved-details></div>
                        <button type="button" class="profile-item profile-item--secondary" data-action="profile-view" role="menuitem">View all</button>
                    </div>
                    <button type="button" class="profile-item" data-action="logout" role="menuitem">Logout</button>
                </div>
            `;

            // Put profile before hamburger (if any) so hamburger stays last
            if (toggle && toggle.parentElement === navRight) {
                navRight.insertBefore(profile, toggle);
            } else {
                navRight.appendChild(profile);
            }

            const trigger = profile.querySelector('.profile-trigger');
            const dropdown = profile.querySelector('.profile-dropdown');
            const submenu = profile.querySelector('.profile-submenu');
            const subTrigger = profile.querySelector('.profile-item--submenu');
            const savedDetailsHost = profile.querySelector('[data-saved-details]');

            const updateSavedDetails = () => {
                if (!savedDetailsHost) return;
                savedDetailsHost.innerHTML = renderSavedSummary();
            };

            const onToggle = (evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                const isOpen = profile.classList.toggle('is-open');
                if (trigger) trigger.setAttribute('aria-expanded', String(isOpen));

                // Reset submenu when opening/closing and refresh saved details.
                if (subTrigger) subTrigger.setAttribute('aria-expanded', 'false');
                if (submenu) submenu.hidden = true;
                if (isOpen) updateSavedDetails();
            };

            trigger?.addEventListener('click', onToggle);
            dropdown?.addEventListener('click', (evt) => {
                const btn = evt.target instanceof Element ? evt.target.closest('[data-action]') : null;
                const action = btn?.getAttribute('data-action');

                if (action === 'profile-toggle') {
                    evt.preventDefault();
                    evt.stopPropagation();
                    const isExpanded = (subTrigger?.getAttribute('aria-expanded') === 'true');
                    const next = !isExpanded;
                    if (subTrigger) subTrigger.setAttribute('aria-expanded', String(next));
                    if (submenu) submenu.hidden = !next;
                    if (next) updateSavedDetails();
                    return;
                }

                closeAllDropdowns();
                if (action === 'profile-view') openProfileModal();
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

            const forceOpenRegistration = sessionStorage.getItem('forceOpenRegistration') === '1';

            // After signup, the "Register Here" CTA should open the next form.
            // Keep pre-signup behavior (scroll/open modal) for new users.
            // In edit mode, allow opening the registration modal even for registered users.
            if (href === '#registration-section' && isRegisteredUser() && !forceOpenRegistration) {
                e.preventDefault();
                window.location.href = 'next-form.html';
                return;
            }

            e.preventDefault();
            const targetId = href.substring(1);

            const isHomePage = isHomePagePath();
            const hasTargetOnPage = !!document.getElementById(targetId);

            // Special rule: navbar "Register Here"
            if (targetId === 'registration-section') {
                if (isRegisteredUser() && !forceOpenRegistration) {
                    window.location.href = 'next-form.html';
                    return;
                }

                if (!isHomePage) {
                    window.location.href = 'index.html#registration-section';
                    return;
                }

                // Home page => open the signup modal (not just scroll)
                if (typeof openRegModal === 'function') {
                    openRegModal();
                } else {
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
                const spans = navToggle.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    });

    // 4. SCROLL OPTIMIZATION (Throttle)
    let isScrolling = false;
    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                handleScroll();
                isScrolling = false;
            });
            isScrolling = true;
        }
    });

    function handleScroll() {
        if (!navbar) return;
        const scrollY = window.pageYOffset;

        // Navbar Resize
        if (scrollY > 50) {
            navbar.style.padding = '0.5rem 0';
        } else {
            navbar.style.padding = '1rem 0';
        }

        // Active Link Highlighting
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (scrollY >= (sectionTop - 100)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
        });
    }

    // 5. REGISTER CTA BUTTONS (Unified behavior across the site)
    // - Registered user  => next-form.html
    // - Not registered    => open signup modal on index, otherwise go to index.html#registration-section
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;

        const cta = target.closest('.get-assistance-btn, .register-cta-button, .cta-button, .register-btn');
        if (!cta) return;

        // Hash-only links are already handled by the anchor handler above.
        const href = cta instanceof HTMLAnchorElement ? (cta.getAttribute('href') || '') : '';
        if (href.startsWith('#')) return;

        const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '/index.html';

        if (isRegisteredUser()) {
            e.preventDefault();
            window.location.href = 'next-form.html';
            return;
        }

        if (isHomePage) {
            e.preventDefault();
            if (typeof openRegModal === 'function') {
                openRegModal();
            } else {
                scrollToSection('registration-section');
            }
            return;
        }

        // Not registered + not on home page => ensure user lands on the signup modal.
        e.preventDefault();
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

        const initGoogle = () => {
            if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
                console.warn('Google Identity Services script not loaded yet. Retrying...');
                setTimeout(initGoogle, 150);
                return;
            }

            try {
                google.accounts.id.initialize({
                    client_id: "197244342804-86t5fr3u2eqg44b9gbck58omfegnjlcl.apps.googleusercontent.com",
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

    function handleCredentialResponse(response) {
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

    // 8. REGISTRATION POPUP AFTER 4 SECONDS (with blurred background)
    const regSection = document.getElementById('registration-section');
    const regOverlay = document.getElementById('regModalOverlay');
    const regCloseBtn = document.getElementById('regModalClose');

    if (regSection && regOverlay) {
        const OPEN_DELAY_MS = 4000;
        let regModalTimer = null;
        let lastScrollY = 0;

        const isModalOpen = () => document.body.classList.contains('reg-modal-open');

        // Ensure we never keep the UI in a modal state on load
        document.body.classList.remove('reg-modal-open');
        regOverlay.hidden = true;

        openRegModal = () => {
            if (isModalOpen()) return;

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

            if (regModalTimer) {
                clearTimeout(regModalTimer);
                regModalTimer = null;
            }

            // Restore scroll position to where the user was
            window.scrollTo({ top: lastScrollY, behavior: 'auto' });
        };

        // Open after ~4-5 seconds on page load.
        // If user arrived from another page with #registration-section, handle that immediately.
        if (window.location.hash === '#registration-section') {
            if (isRegisteredUser()) {
                // Normally redirect registered users to next form, except right after signup or when forced to edit.
                const justRegistered = sessionStorage.getItem('justRegistered') === '1';
                const forceOpenRegistration = sessionStorage.getItem('forceOpenRegistration') === '1';
                if (justRegistered) {
                    sessionStorage.removeItem('justRegistered');
                    window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
                    openRegModal();
                } else if (forceOpenRegistration) {
                    openRegModal();
                } else {
                    window.location.href = 'next-form.html';
                }
            } else {
                regModalTimer = null;
                openRegModal();
            }
        } else {
            const signedIn = isRegisteredUser();
            if (!signedIn) {
                regModalTimer = setTimeout(openRegModal, OPEN_DELAY_MS);
            }
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

        // If user clicks a direct "Register Here" link before timer, don't double-open
        document.querySelectorAll('a[href="#registration-section"], .register-scroll').forEach((el) => {
            el.addEventListener('click', () => {
                if (regModalTimer) {
                    clearTimeout(regModalTimer);
                    regModalTimer = null;
                }
            }, { once: true });
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
        imgs.forEach(img => {
            if (img.complete) loaded++; else img.addEventListener('load', () => { loaded++; if (loaded === imgs.length) callback(); });
        });
        setTimeout(callback, 800); // fallback
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

// Auth mode selection:
// - Always default to Sign up
setAuthMode('signup');

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

    forgotSendCodeBtn.addEventListener('click', async () => {
        const email = document.getElementById('forgotEmail')?.value?.trim();
        const phone = document.getElementById('forgotPhone')?.value?.trim();

        if (!email) {
            showNotification('Please enter your email', 'error');
            return;
        }
        // No longer require WhatsApp number for forgot password

        setForgotPasswordVerifiedUI(false);
        showNotification('Sending code...', 'info');

        const originalText = 'Send Code';
        forgotSendCodeBtn.textContent = 'Sending...';
        forgotSendCodeBtn.disabled = true;

        let success = false;

        try {
           
// Correct:
const response = await fetch('https://abroad-vision-carrerz-heg3.onrender.com/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, phone })
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok && data.success) {
                success = true;
                __resetCodeSent = true;
                showNotification(data.message || 'If your email exists, a code has been sent.', 'success');

                // Start 60s Timer
                const timerEl = document.getElementById('forgotTimer');
                if (timerEl) {
                    timerEl.style.display = 'block';
                    let timeLeft = 60;

                    // Initial state
                    timerEl.textContent = `Code expires in: ${timeLeft}s`;
                    timerEl.style.color = '#555';
                    forgotSendCodeBtn.textContent = 'Code Sent';
                    forgotSendCodeBtn.disabled = true;

                    if (timerInterval) clearInterval(timerInterval);

                    timerInterval = setInterval(() => {
                        timeLeft--;
                        if (timeLeft > 0) {
                            timerEl.textContent = `Code expires in: ${timeLeft}s`;
                        } else {
                            clearInterval(timerInterval);
                            timerEl.textContent = 'Code expired. Please try sending again.';
                            timerEl.style.color = '#ef4444'; // Red for expired

                            // Re-enable button
                            forgotSendCodeBtn.disabled = false;
                            forgotSendCodeBtn.textContent = 'Resend Code';
                        }
                    }, 1000);
                }
            } else {
                showNotification(data.error || 'Unable to send code. Please try again.', 'error');
            }
        } catch (err) {
            console.error('Forgot password send code error:', err);
            showNotification('Unable to connect to server. Please check if the backend is running.', 'error');
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
            const response = await fetch(apiUrl('/api/verify-reset-code'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });

            const data = await response.json().catch(() => ({}));
            if (response.ok && data.success) {
                setForgotPasswordVerifiedUI(true);
                showNotification(data.message || 'Code verified. Please set a new password.', 'success');
            } else {
                setForgotPasswordVerifiedUI(false);
                if (code) showNotification(data.error || 'Invalid or expired code.', 'error');
            }
        } catch (err) {
            console.error('Verify reset code error:', err);
            setForgotPasswordVerifiedUI(false);
            showNotification('Unable to verify code. Please check if the backend is running.', 'error');
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

        if (!email || !code || !newPassword || !confirmPassword) {
            showNotification('Please fill all fields', 'error');
            return;
        }

        if (!__resetCodeSent) {
            showNotification('Please click "Send Code" first', 'error');
            return;
        }

        if (!__resetCodeVerified) {
            showNotification('Please verify the 6-digit code first', 'error');
            return;
        }

        if (newPassword.length < 8) {
            showNotification('Password must be at least 8 characters', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }

        const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : 'Reset Password';
        if (submitBtn) {
            submitBtn.textContent = 'Resetting...';
            submitBtn.disabled = true;
        }

        try {
            const response = await fetch(apiUrl('/api/reset-password'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword })
            });

            const data = await response.json().catch(() => ({}));
            if (response.ok && data.success) {
                showNotification(data.message || 'Password reset successful! Please log in.', 'success');
                __resetCodeSent = false;
                __resetCodeVerified = false;
                setForgotPasswordVerifiedUI(false);
                setAuthMode('login');
                const loginEmailInput = document.getElementById('loginEmail');
                if (loginEmailInput) loginEmailInput.value = email;
                const loginPassInput = document.getElementById('loginPassword');
                if (loginPassInput) loginPassInput.value = '';
                forgotPasswordForm.reset();
            } else {
                showNotification(data.error || 'Password reset failed. Please try again.', 'error');
            }
        } catch (err) {
            console.error('Reset password error:', err);
            showNotification('Unable to connect to server. Please check if the backend is running.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
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
                    password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Success message
                showNotification(editMode ? 'Details updated successfully!' : 'Registration successful!', 'success');

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
                
                // Store registration data for the next form
                const regData = { fullName, email, phone };
                sessionStorage.setItem('registrationData', JSON.stringify(regData));
                localStorage.setItem('registrationData', JSON.stringify(regData));

                // 2. Hide the registration modal
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

                // 4. Stay on page (User requested normal browsing flow)
                showNotification('Registration successful! You are now logged in.', 'success');

                // Do NOT open the login form automatically.
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
            console.error('Registration error:', error);
            showNotification('Unable to connect to server. Please check if the backend is running.', 'error');
            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
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

// Login form submission
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
                if (data.userId) {
                    sessionStorage.setItem('currentUserId', data.userId);
                    localStorage.setItem('currentUserId', data.userId);
                }
                localStorage.setItem('userEmail', email);
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

                // If modal is open, close it after login
                const closeBtn = document.getElementById('regModalClose');
                if (document.body.classList.contains('reg-modal-open') && closeBtn) {
                    closeBtn.click();
                }
            } else {
                showNotification(data.error || 'Login failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Unable to connect to server. Please check if the backend is running.', 'error');
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
        showNotification('Registration completed successfully! Welcome to Abroad Vision Carrerz.', 'success');

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

