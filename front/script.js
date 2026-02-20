// Clé publique Stripe (test)
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51R54KoQA4O745tcxaI41YdQzMx9VhoHAALOSniWP1o0RyLIzpvix5tvMrUyzlFrRRwDzKb6pi9SQv21GmfyGeiSs00lDFzcH7K';

// Navigation mobile
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Fermer le menu au clic sur un lien
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        });
    });
}

// Gérer la navigation active
function setActiveNav() {
    const path = (window.location.pathname || '/').replace(/\/$/, '') || '/';
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href') || '/';
        const linkPath = (href.split('#')[0] || '/').replace(/\/$/, '') || '/';
        if (path === linkPath) {
            link.classList.add('active');
        }
    });
}

// Liste des hôtels navette Eurosatory
const NAVETTE_HOTELS = ['oceania', 'nomad'];
// Liste des caves/maisons de Champagne (mode sur-mesure)
const CAVES_CHAMPAGNE = ['pommery', 'taittinger', 'veuve clicquot', 'lanson', 'ruinart', 'moët', 'dom pérignon', 'bollinger', 'krug'];

// Détermine le mode de réservation : 'navette' ou 'surmesure'
function detectReservationMode() {
    const departEl = document.getElementById('depart');
    const destinationEl = document.getElementById('destination');
    const departVal = (departEl && departEl.value || '').toLowerCase();
    const destVal = (destinationEl && destinationEl.value || '').toLowerCase();
    
    // Mode Navette : départ depuis un des hôtels partenaires
    const isNavette = NAVETTE_HOTELS.some(h => departVal.includes(h));
    
    // Mode Sur-mesure : destination = cave ou adresse libre (pas navette)
    const isCave = CAVES_CHAMPAGNE.some(c => destVal.includes(c));
    
    if (isNavette && !isCave) return 'navette';
    return 'surmesure';
}

// Applique le mode de réservation (affiche/masque les éléments)
function applyReservationMode(mode) {
    const vehicleSelector = document.getElementById('vehicleSelector');
    const navetteInfo = document.getElementById('navetteInfo');
    const payBtn = document.getElementById('reservationPayBtn');
    const devisBtn = document.getElementById('reservationDevisBtn');
    const vehiculeInput = document.getElementById('vehicule');
    
    if (mode === 'navette') {
        // Mode Navette : prix fixe 12€, pas de choix véhicule
        if (vehicleSelector) vehicleSelector.setAttribute('hidden', '');
        if (navetteInfo) navetteInfo.removeAttribute('hidden');
        if (payBtn) payBtn.removeAttribute('hidden');
        if (devisBtn) devisBtn.setAttribute('hidden', '');
        if (vehiculeInput) {
            vehiculeInput.value = 'navette-eurosatory';
            vehiculeInput.removeAttribute('required');
        }
    } else {
        // Mode Sur-mesure : sélecteur véhicule obligatoire, pas de paiement direct
        if (vehicleSelector) vehicleSelector.removeAttribute('hidden');
        if (navetteInfo) navetteInfo.setAttribute('hidden', '');
        if (payBtn) payBtn.setAttribute('hidden', '');
        if (devisBtn) devisBtn.removeAttribute('hidden');
        if (vehiculeInput) {
            vehiculeInput.setAttribute('required', '');
        }
    }
}

// Initialise les cartes véhicule (sélection au clic)
function initVehicleCards() {
    const cards = document.querySelectorAll('.vehicle-card');
    const vehiculeInput = document.getElementById('vehicule');
    if (!cards.length || !vehiculeInput) return;
    
    cards.forEach(card => {
        card.addEventListener('click', () => {
            cards.forEach(c => c.classList.remove('is-selected'));
            card.classList.add('is-selected');
            vehiculeInput.value = card.getAttribute('data-vehicle') || '';
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });
}

// Écoute les changements de départ/destination pour adapter le mode
function initReservationModeListeners() {
    const departEl = document.getElementById('depart');
    const destinationEl = document.getElementById('destination');
    
    function updateMode() {
        const mode = detectReservationMode();
        applyReservationMode(mode);
    }
    
    if (departEl) departEl.addEventListener('input', updateMode);
    if (destinationEl) destinationEl.addEventListener('input', updateMode);
}

// Préremplissage des champs Départ et Lieu d'arrivée depuis l'URL (ex: ?destination=Pommery)
function fillReservationFromUrl() {
    if ((window.location.pathname || '').replace(/\/$/, '') !== '/reservation') return;
    const departEl = document.getElementById('depart');
    const destinationEl = document.getElementById('destination');
    if (!departEl && !destinationEl) return;
    const params = new URLSearchParams(window.location.search);
    const departParam = params.get('depart');
    const destParam = params.get('destination');
    if (departEl && departParam) {
        departEl.value = decodeURIComponent(departParam);
    }
    if (destinationEl && destParam) {
        destinationEl.value = decodeURIComponent(destParam);
    }
    
    // Initialise les cartes véhicule et les listeners de mode
    initVehicleCards();
    initReservationModeListeners();
    
    // Applique le mode initial
    const mode = detectReservationMode();
    applyReservationMode(mode);
}

// Autocomplétion accueil (API adresse.data.gouv.fr) vers /reservation?depart=
function initHomeSearchAutocomplete() {
    const homeInput = document.getElementById('homeSearchInput');
    const homeBtn = document.getElementById('homeSearchBtn');
    const homeSuggestions = document.getElementById('homeSearchSuggestions');
    if (!homeInput || !homeSuggestions) return;

    let debounceId = null;
    let currentController = null;

    function goToReservationWithDepart() {
        const value = (homeInput.value || '').trim();
        if (value) {
            window.location.href = `/reservation?depart=${encodeURIComponent(value)}`;
        } else {
            window.location.href = '/reservation';
        }
    }

    function closeSuggestions() {
        homeSuggestions.setAttribute('hidden', '');
        homeSuggestions.innerHTML = '';
    }

    async function fetchAddressSuggestions(query) {
        if (currentController) currentController.abort();
        currentController = new AbortController();
        try {
            const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`, {
                signal: currentController.signal
            });
            const data = await res.json();
            return data.features || [];
        } catch (err) {
            if (err.name !== 'AbortError') console.error(err);
            return [];
        }
    }

    function renderSuggestions(features) {
        homeSuggestions.innerHTML = '';
        if (!features.length) {
            closeSuggestions();
            return;
        }
        features.forEach((f) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'home-search-suggestion';
            const label = f.properties?.label || '';
            const context = f.properties?.context || '';
            btn.innerHTML = `<span class="home-search-suggestion-main">${label}</span>${context ? `<span class="home-search-suggestion-context">${context}</span>` : ''}`;
            btn.addEventListener('click', () => {
                homeInput.value = label;
                closeSuggestions();
                goToReservationWithDepart();
            });
            homeSuggestions.appendChild(btn);
        });
        homeSuggestions.removeAttribute('hidden');
    }

    homeInput.addEventListener('input', () => {
        const query = (homeInput.value || '').trim();
        if (debounceId) clearTimeout(debounceId);
        if (query.length < 3) {
            closeSuggestions();
            return;
        }
        debounceId = setTimeout(async () => {
            const features = await fetchAddressSuggestions(query);
            renderSuggestions(features);
        }, 250);
    });

    homeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            closeSuggestions();
            goToReservationWithDepart();
        }
        if (e.key === 'Escape') closeSuggestions();
    });

    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            closeSuggestions();
            goToReservationWithDepart();
        });
    }

    document.addEventListener('click', (e) => {
        if (!homeInput.contains(e.target) && !homeSuggestions.contains(e.target)) {
            closeSuggestions();
        }
    });
}

// Appeler au chargement
document.addEventListener('DOMContentLoaded', () => {
    setActiveNav();
    
    // Autocomplétion recherche accueil
    initHomeSearchAutocomplete();

    // Capsule recherche Destinations : remplissage + redirection + API adresses
    const searchInput = document.getElementById('destinationsSearchInput') || document.querySelector('.destinations-search-input');
    const searchBtn = document.querySelector('.destinations-search-btn');
    const suggestionsContainer = document.getElementById('destinationsSuggestions');
    const apiSuggestionsContainer = document.getElementById('destinationsApiSuggestions');

    function goToReservationWithDestination() {
        const value = (searchInput && searchInput.value && searchInput.value.trim()) || '';
        const url = value ? `/reservation?destination=${encodeURIComponent(value.trim())}` : '/reservation';
        window.location.href = url;
    }

    function openSuggestions() {
        if (suggestionsContainer) {
            suggestionsContainer.removeAttribute('hidden');
        }
    }

    function closeSuggestions() {
        if (suggestionsContainer) {
            suggestionsContainer.setAttribute('hidden', '');
        }
    }

    function closeApiSuggestions() {
        if (apiSuggestionsContainer) {
            apiSuggestionsContainer.setAttribute('hidden', '');
            apiSuggestionsContainer.innerHTML = '';
        }
    }

    // Clic sur une suggestion de la liste (Top 5) : remplir l'input puis rediriger
    if (suggestionsContainer) {
        const suggestionButtons = suggestionsContainer.querySelectorAll('.destinations-suggestion');
        suggestionButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const destination = btn.getAttribute('data-destination') || (btn.querySelector('.destinations-suggestion-label') && btn.querySelector('.destinations-suggestion-label').textContent) || btn.textContent.trim();
                const type = btn.getAttribute('data-type') || '';

                if (searchInput) {
                    searchInput.value = destination;
                }
                closeSuggestions();
                closeApiSuggestions();

                if (type === 'hotel') {
                    window.location.href = '/checkout-eurosatory';
                    return;
                }
                window.location.href = `/reservation?destination=${encodeURIComponent(destination)}`;
            });
        });
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            closeSuggestions();
            closeApiSuggestions();
            goToReservationWithDestination();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            const v = (searchInput.value && searchInput.value.trim()) || '';
            if (v.length < 3) {
                openSuggestions();
            }
        });
        searchInput.addEventListener('click', () => {
            const v = (searchInput.value && searchInput.value.trim()) || '';
            if (v.length < 3) {
                openSuggestions();
            }
        });
        searchInput.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                closeSuggestions();
                closeApiSuggestions();
                goToReservationWithDestination();
            }
            if (ev.key === 'Escape') {
                closeSuggestions();
                closeApiSuggestions();
            }
        });
    }

    // Autocomplétion API adresse.data.gouv.fr (saisie manuelle)
    if (searchInput && apiSuggestionsContainer) {
        let apiDebounceId = null;
        let apiController = null;

        searchInput.addEventListener('input', () => {
            const value = (searchInput.value && searchInput.value.trim()) || '';
            if (apiDebounceId) clearTimeout(apiDebounceId);
            if (value.length < 3) {
                closeApiSuggestions();
                if (!value) openSuggestions();
                return;
            }
            closeSuggestions();
            apiDebounceId = setTimeout(() => {
                if (apiController) apiController.abort();
                apiController = new AbortController();
                const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5&autocomplete=1`;
                fetch(url, { signal: apiController.signal })
                    .then((r) => r.ok ? r.json() : { features: [] })
                    .then((data) => {
                        const features = (data && data.features) || [];
                        apiSuggestionsContainer.innerHTML = '';
                        features.forEach((feature) => {
                            const label = feature && feature.properties && feature.properties.label;
                            if (!label) return;
                            const btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = 'destinations-api-suggestion';
                            btn.textContent = label;
                            btn.addEventListener('click', (e) => {
                                e.preventDefault();
                                searchInput.value = label;
                                closeApiSuggestions();
                                closeSuggestions();
                            });
                            apiSuggestionsContainer.appendChild(btn);
                        });
                        if (apiSuggestionsContainer.childElementCount) {
                            apiSuggestionsContainer.removeAttribute('hidden');
                        }
                    })
                    .catch((err) => {
                        if (err.name !== 'AbortError') console.error('API adresse:', err);
                        closeApiSuggestions();
                    });
            }, 300);
        });
    }

    document.addEventListener('click', (event) => {
        const capsule = document.querySelector('.destinations-search-capsule');
        if (!capsule || capsule.contains(event.target)) return;
        closeSuggestions();
        closeApiSuggestions();
    });

    // Effet de parallaxe fluide sur le header Destinations
    const destinationsParallaxBg = document.querySelector('.page-header-destinations .page-header-parallax-bg');
    if (destinationsParallaxBg) {
        let ticking = false;

        const updateParallax = () => {
            const scrollY = window.scrollY || window.pageYOffset || 0;
            const offset = scrollY * 0.25; // défilement plus lent que la page
            destinationsParallaxBg.style.transform = `translate3d(0, ${offset}px, 0)`;
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateParallax);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        updateParallax();
    }

    // Page checkout Eurosatory : calcul dynamique et lancement Stripe
    const checkoutPassengersInput = document.getElementById('checkoutPassengers');
    const checkoutHotelSelect = document.getElementById('checkoutHotel');
    const checkoutTotalCount = document.getElementById('checkoutTotalCount');
    const checkoutTotalAmount = document.getElementById('checkoutTotalAmount');
    const checkoutEurosatoryBtn = document.getElementById('checkoutEurosatoryBtn');
    const checkoutPassengersDisplay = document.getElementById('checkoutPassengersDisplay');
    const checkoutPassengersMinus = document.querySelector('.checkout-passengers-minus');
    const checkoutPassengersPlus = document.querySelector('.checkout-passengers-plus');
    const checkoutHotelButtons = document.querySelectorAll('.checkout-hotel-btn');

    function setCheckoutPassengers(value) {
        if (!checkoutPassengersInput || !checkoutTotalCount) return;
        let v = parseInt(value, 10);
        if (!Number.isFinite(v) || v < 1) v = 1;
        checkoutPassengersInput.value = String(v);
        checkoutTotalCount.textContent = String(v);
        if (checkoutPassengersDisplay) {
            checkoutPassengersDisplay.textContent = String(v);
        }
        if (checkoutTotalAmount) {
            const total = v * 12;
            checkoutTotalAmount.textContent = `${total}€`;
        }
    }

    if (checkoutPassengersInput) {
        // Initialisation
        setCheckoutPassengers(checkoutPassengersInput.value || '1');
    }

    if (checkoutPassengersMinus && checkoutPassengersInput) {
        checkoutPassengersMinus.addEventListener('click', () => {
            const current = parseInt(checkoutPassengersInput.value, 10) || 1;
            setCheckoutPassengers(current - 1);
        });
    }

    if (checkoutPassengersPlus && checkoutPassengersInput) {
        checkoutPassengersPlus.addEventListener('click', () => {
            const current = parseInt(checkoutPassengersInput.value, 10) || 1;
            setCheckoutPassengers(current + 1);
        });
    }

    if (checkoutHotelButtons.length && checkoutHotelSelect) {
        checkoutHotelButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                const hotel = btn.getAttribute('data-hotel') || '';
                checkoutHotelSelect.value = hotel;
                checkoutHotelButtons.forEach((b) => {
                    b.classList.toggle('is-active', b === btn);
                });
            });
        });
    }

    if (checkoutEurosatoryBtn) {
        checkoutEurosatoryBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (checkoutEurosatoryBtn.disabled) return;

            const passengersRaw = checkoutPassengersInput ? parseInt(checkoutPassengersInput.value, 10) : 1;
            const safePassengers = Number.isFinite(passengersRaw) && passengersRaw > 0 ? passengersRaw : 1;
            const hotel = checkoutHotelSelect ? (checkoutHotelSelect.value || '') : '';

            const originalText = checkoutEurosatoryBtn.textContent;
            checkoutEurosatoryBtn.disabled = true;
            checkoutEurosatoryBtn.textContent = 'Redirection vers le paiement...';

            try {
                const res = await fetch('/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ passengers: safePassengers, hotel })
                });
                const data = await res.json().catch(() => ({}));
                if (data.sessionId && typeof Stripe !== 'undefined') {
                    const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
                    stripe.redirectToCheckout({ sessionId: data.sessionId }).then((result) => {
                        if (result.error) {
                            checkoutEurosatoryBtn.disabled = false;
                            checkoutEurosatoryBtn.textContent = originalText;
                            alert(result.error.message || 'Erreur de redirection Stripe.');
                        }
                    });
                    return;
                }
                if (data.url) {
                    window.location.href = data.url;
                    return;
                }
                alert(data.error || 'Impossible de créer la session de paiement.');
            } catch (err) {
                console.error(err);
                alert('Erreur de connexion. Veuillez réessayer.');
            } finally {
                checkoutEurosatoryBtn.disabled = false;
                checkoutEurosatoryBtn.textContent = originalText;
            }
        });
    }

    // Préremplissage par URL sur la page réservation (Lieu d'arrivée = destination, Lieu de départ = depart)
    fillReservationFromUrl();

    // Apparition progressive des cartes caves au scroll (Intersection Observer, une après l'autre)
    const caveCards = document.querySelectorAll('.cave-card');
    if (caveCards.length && 'IntersectionObserver' in window) {
        const caveObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const card = entry.target;
                const index = Array.from(caveCards).indexOf(card);
                const delay = index * 120;
                setTimeout(() => card.classList.add('is-visible'), delay);
                caveObserver.unobserve(card);
            });
        }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });
        caveCards.forEach((card) => caveObserver.observe(card));
    } else if (caveCards.length) {
        caveCards.forEach((card, i) => {
            setTimeout(() => card.classList.add('is-visible'), i * 120);
        });
    }
});

// --- Gestion multilingue simple du site ---
const AVAILABLE_LANGS = ['fr', 'en', 'de', 'es', 'it'];
const LANGUAGE_STORAGE_KEY = 'site_language';

const translations = {
    fr: {
        // Navigation & footer
        'nav.home': 'Accueil',
        'nav.vehicles': 'Véhicules',
        'nav.services': 'Services',
        'nav.reims': 'Destinations', // EN: Destinations, DE: Reiseziele, ES: Destinos, IT: Destinazioni
        'nav.booking': 'Réservation',
        'nav.contact': 'Contact',

        'footer.description': 'Transport premium à Paris depuis 2014. NCP offre un service de qualité alliant confort, sécurité et ponctualité pour tous vos déplacements dans la capitale.',
        'footer.navigation': 'Navigation',
        'footer.contactTitle': 'Contact',
        'footer.contact.phone': '+33 1 XX XX XX XX',
        'footer.contact.email': 'contact@ncp.fr',
        'footer.contact.city': 'Paris, Île-de-France',
        'footer.copyright': '© 2026 NCP. Tous droits réservés.',

        // Page Réservation
        'reservation.title': 'Réservation',
        'reservation.subtitle': "Remplissez le formulaire ci-dessous avec tous les détails de votre trajet. Notre équipe vous confirme votre réservation sous 2 heures maximum par SMS et email avec tous les détails (heure exacte, immatriculation, nom du chauffeur).",

        'howItWorks.title': 'Comment ça marche',
        'howItWorks.subtitle': 'Un processus simple en 4 étapes',
        'howItWorks.step1.title': 'Remplissez le formulaire',
        'howItWorks.step1.text': 'Indiquez vos préférences : véhicule, date, heure, lieux de départ et destination',
        'howItWorks.step2.title': 'Confirmation rapide',
        'howItWorks.step2.text': "Notre équipe vous confirme sous 2 heures avec tous les détails",
        'howItWorks.step3.title': 'Prise en charge',
        'howItWorks.step3.text': 'Votre chauffeur arrive 5 minutes avant avec panneau nominatif',
        'howItWorks.step4.title': 'Arrivée',
        'howItWorks.step4.text': 'Vous arrivez à destination en toute sérénité',

        'form.fullName.label': 'Nom complet *',
        'form.phone.label': 'Téléphone *',
        'form.email.label': 'Email *',
        'form.vehicle.label': 'Véhicule *',
        'form.vehicle.placeholder': 'Sélectionnez un véhicule',
        'form.vehicle.classeE': 'Classe E',
        'form.vehicle.classeS': 'Classe S',
        'form.vehicle.classeV': 'Classe V',
        'form.date.label': 'Date *',
        'form.time.label': 'Heure *',
        'form.depart.label': 'Lieu de départ *',
        'form.depart.placeholder': 'Adresse complète',
        'form.destination.label': 'Destination *',
        'form.destination.placeholder': 'Adresse complète',
        'form.passengers.label': 'Nombre de passagers *',
        'form.message.label': 'Message (optionnel)',
        'form.message.placeholder': 'Informations complémentaires...',
        'form.submit': 'Confirmer la réservation',
        'form.pay': 'Payer',

        'info.title': 'Informations importantes',
        'info.cancellation': "<strong>Annulation :</strong> Gratuite jusqu'à 2 heures avant l'heure prévue",
        'info.payment': '<strong>Paiement :</strong> Carte bancaire, virement, espèces ou chèque acceptés',
        'info.confirmation': '<strong>Confirmation :</strong> Vous recevrez un SMS et un email de confirmation',
        'info.emergency': "<strong>Urgence :</strong> Pour les réservations de dernière minute, appelez-nous directement au +33 1 XX XX XX XX",
        'info.modification': '<strong>Modification :</strong> Toute modification peut être effectuée jusqu\'à 2 heures avant',

        'reservation.success.title': 'Demande envoyée',
        'reservation.success.text': 'Merci pour votre réservation. Nous vous avons envoyé un email de confirmation. Notre équipe vous recontactera sous 2 heures pour confirmer votre trajet.',
        'reservation.success.btn': "Retour à l'accueil",
        'form.sending': 'Envoi en cours...',
        'form.error.required': 'Veuillez remplir tous les champs obligatoires.',
        'form.error.generic': 'Une erreur est survenue. Veuillez réessayer ou nous contacter par téléphone.',
        'form.error.connection': 'Erreur de connexion. Veuillez réessayer ou nous contacter par téléphone.',

        // Page d'accueil
        'home.hero.title.line1': 'Transport Premium',
        'home.hero.title.line2': 'à Paris',
        'home.hero.subtitle': "Découvrez l'excellence du transport premium parisien. Flotte exclusive Mercedes-Benz, chauffeurs expérimentés, service personnalisé 24/7 pour tous vos déplacements professionnels et privés dans la capitale et ses environs.",
        'home.hero.cta.book': 'Réserver maintenant',
        'home.hero.cta.vehicles': 'Découvrir nos véhicules',

        'home.about.title': 'À Propos de NCP',
        'home.about.subtitle': "Une histoire d'excellence et de passion pour le transport premium",
        'home.about.p1': "Fondée en 2014, NCP est née d'une vision simple : offrir à Paris un service de transport premium qui allie élégance, ponctualité et discrétion. En 2026, cela représente déjà plus de 10 ans d'expérience, construits sur des valeurs fortes : l'excellence du service, le respect du client et l'innovation constante.",
        'home.about.p2': "Notre flotte exclusive de véhicules Mercedes-Benz est entretenue par des professionnels certifiés. Chaque véhicule est inspecté avant chaque course pour garantir votre sécurité et votre confort. Nos chauffeurs, tous professionnels expérimentés, connaissent parfaitement Paris et ses environs, vous garantissant des trajets optimisés et sans stress.",
        'home.about.p3': "Que vous soyez un dirigeant d'entreprise, un artiste, un diplomate ou simplement quelqu'un qui apprécie le luxe et le confort, NCP s'engage à vous offrir une expérience de transport inoubliable. Nous servons une clientèle exigeante qui apprécie la qualité, la discrétion et le professionnalisme.",
        'home.about.stats.years': "Années d'expérience",
        'home.about.stats.clients': 'Clients satisfaits',
        'home.about.stats.trips': 'Trajets réalisés',
        'home.about.stats.satisfaction': 'Taux de satisfaction',

        'home.why.title': 'Pourquoi NCP',
        'home.why.subtitle': 'Ce qui nous distingue dans le transport premium parisien',
        'home.why.card1.title': 'Expérience',
        'home.why.card1.text': "Plus de 10 ans d'expertise dans le transport premium parisien. Réputation solide établie auprès de dirigeants d'entreprise, artistes, diplomates et clients exigeants qui apprécient la qualité et le professionnalisme.",
        'home.why.card2.title': 'Discrétion',
        'home.why.card2.text': 'Confidentialité absolue garantie pour tous vos déplacements. Tous nos chauffeurs sont soumis à une clause de confidentialité stricte et respectent votre vie privée en toutes circonstances.',
        'home.why.card3.title': 'Flotte Premium',
        'home.why.card3.text': 'Flotte exclusive de véhicules Mercedes-Benz récents (Classe E, Classe S, Classe V). Entretenus par des professionnels certifiés Mercedes-Benz. Inspection complète avant chaque course pour garantir sécurité et confort optimal.',
        'home.why.card4.title': 'Service Personnalisé',
        'home.why.card4.text': 'Service sur-mesure adapté à vos besoins spécifiques. Préférences mémorisées (température, musique, itinéraires), accueil personnalisé, et attention particulière à chaque détail pour une expérience unique.',
        'home.why.card5.title': 'Technologie Moderne',
        'home.why.card5.text': 'Réservation en ligne simple et rapide, suivi GPS en temps réel de votre véhicule, notifications SMS et email automatiques. Système de gestion moderne pour un service optimal et réactif.',
        'home.why.card6.title': 'Excellence Garantie',
        'home.why.card6.text': '98% de taux de satisfaction client. Engagement à dépasser vos attentes à chaque trajet. Service client dédié disponible 24/7 pour répondre à tous vos besoins et garantir votre satisfaction totale.',

        'home.gallery.title': 'Galerie',
        'home.gallery.subtitle': 'Découvrez notre flotte et nos véhicules en images',
        'home.gallery.caption.eInterior': 'Intérieur Classe E',
        'home.gallery.caption.sInterior': 'Intérieur Classe S',
        'home.gallery.caption.vInterior': 'Intérieur Classe V',
        'home.gallery.caption.driver': 'Chauffeur Professionnel',
        'home.gallery.caption.vehicleAction': 'Véhicule en Action',
        'home.gallery.caption.equipment': 'Équipements Premium',

        'home.testimonials.title': 'Témoignages',
        'home.testimonials.subtitle': 'Ce que nos clients disent de notre service',
        'home.testimonials.t1.text': "Service impeccable depuis plusieurs années. Chauffeur toujours ponctuel, professionnel et d'une discrétion absolue. Véhicule parfaitement entretenu et confortable. NCP est devenu mon partenaire de confiance pour tous mes déplacements professionnels à Paris.",
        'home.testimonials.t1.name': 'Marie D.',
        'home.testimonials.t1.role': 'Directrice Marketing',
        'home.testimonials.t2.text': "J'utilise NCP régulièrement pour mes déplacements d'affaires depuis 3 ans. Service irréprochable à chaque fois, véhicules toujours impeccables et luxueux, chauffeurs expérimentés qui connaissent parfaitement Paris et ses meilleurs itinéraires. Un service premium qui justifie son prix.",
        'home.testimonials.t2.name': 'Pierre L.',
        'home.testimonials.t2.role': 'CEO, Entreprise Tech',
        'home.testimonials.t3.text': "Pour notre mariage, nous avons choisi NCP pour transporter nos invités. Le Classe V était magnifique, l'intérieur premium impeccable, et le service absolument parfait. Nos invités ont été impressionnés par le professionnalisme et l'élégance. Un choix parfait pour notre grand jour.",
        'home.testimonials.t3.name': 'Sophie & Thomas',
        'home.testimonials.t3.role': 'Clients Premium',

        'home.guarantees.title': 'Nos Engagements',
        'home.guarantees.g1.title': 'Satisfaction',
        'home.guarantees.g1.text': 'Engagement qualité à chaque trajet',
        'home.guarantees.g2.title': 'Disponibilité',
        'home.guarantees.g2.text': 'Service disponible à toute heure',
        'home.guarantees.g3.title': 'Années',
        'home.guarantees.g3.text': "D'expérience à Paris",
        'home.guarantees.g4.title': 'Clients',
        'home.guarantees.g4.text': 'Fidèles satisfaits',

        'home.cta.title': 'Prêt à réserver votre trajet ?',
        'home.cta.subtitle': 'Réservez en ligne en quelques clics ou contactez-nous directement',
        'home.cta.ctaBook': 'Réserver maintenant',
        'home.cta.ctaContact': 'Nous contacter',

        // Page Contact
        'contact.title': 'Contact',
        'contact.subtitle': "Notre équipe est disponible 24h/24 et 7j/7 pour répondre à toutes vos questions, gérer vos réservations, et vous proposer la solution de transport premium la plus adaptée à vos besoins spécifiques. N'hésitez pas à nous contacter pour un devis personnalisé.",
        'contact.phone.title': 'Téléphone',
        'contact.phone.note': 'Disponible 24h/24 et 7j/7',
        'contact.email.title': 'Email',
        'contact.email.note': 'Réponse garantie sous 24h',
        'contact.zone.title': "Zone d'Intervention",
        'contact.zone.city': 'Paris et Île-de-France',
        'contact.zone.note': "Service disponible sur toute la région parisienne, aéroports (CDG, Orly, Le Bourget), et départements limitrophes",

        'contact.faq.title': 'Questions Fréquentes',
        'contact.faq.subtitle': 'Toutes les réponses à vos questions sur nos services',

        'contact.faq.q1.title': 'Comment réserver un trajet ?',
        'contact.faq.q1.text': "Vous pouvez réserver de trois façons : via notre formulaire en ligne sur ce site, par téléphone au +33 1 XX XX XX XX, ou par email à contact@ncp.fr. Pour les réservations en urgence, nous recommandons l'appel téléphonique.",
        'contact.faq.q2.title': 'Quels sont les moyens de paiement acceptés ?',
        'contact.faq.q2.text': "Nous acceptons les paiements par carte bancaire (Visa, Mastercard, American Express), virement bancaire, espèces, et chèque. Pour les entreprises, nous proposons la facturation avec paiement différé selon vos conditions.",
        'contact.faq.q3.title': 'Puis-je annuler ou modifier ma réservation ?',
        'contact.faq.q3.text': "Oui, vous pouvez annuler ou modifier votre réservation jusqu'à 2 heures avant l'heure prévue sans frais. Pour les annulations moins de 2 heures avant, des frais d'annulation peuvent s'appliquer. Contactez-nous pour toute modification.",
        'contact.faq.q4.title': 'Vos véhicules sont-ils assurés ?',
        'contact.faq.q4.text': 'Absolument. Tous nos véhicules sont assurés avec une couverture complète incluant l’assurance responsabilité civile, l’assurance tous risques, et l’assurance des passagers. Nous respectons toutes les normes légales en vigueur.',
        'contact.faq.q5.title': 'Proposez-vous des services pour les aéroports ?',
        'contact.faq.q5.text': 'Oui, nous proposons des transferts vers et depuis les aéroports CDG, Orly et Le Bourget. Nous effectuons le suivi de vol pour nous assurer que nous sommes présents à votre arrivée, même en cas de retard. Assistance bagages incluse.',
        'contact.faq.q6.title': 'Vos chauffeurs parlent-ils anglais ?',
        'contact.faq.q6.text': 'Oui, tous nos chauffeurs parlent français et anglais couramment. Certains parlent également d’autres langues (espagnol, allemand, italien). N’hésitez pas à nous préciser vos préférences lors de la réservation.',
        'contact.faq.q7.title': 'Quels sont les horaires de service ?',
        'contact.faq.q7.text': 'Nous sommes disponibles 24h/24 et 7j/7. Que ce soit pour un trajet tôt le matin, tard le soir, ou même la nuit, notre service est toujours disponible pour répondre à vos besoins.',
        'contact.faq.q8.title': 'Puis-je réserver pour plusieurs personnes ?',
        'contact.faq.q8.text': 'Absolument. Nous pouvons organiser des transports pour des groupes. Notre Classe V peut accueillir jusqu’à 8 passagers. Pour des groupes plus importants, nous pouvons coordonner plusieurs véhicules. Contactez-nous pour un devis personnalisé.',

        'vehicules.title': 'Notre Flotte',
        'vehicules.subtitle': 'Trois véhicules Mercedes-Benz entretenus régulièrement et maintenus en parfait état',
        'vehicules.inspect': 'Chaque véhicule est inspecté avant chaque course pour garantir votre sécurité et votre confort',
        'vehicules.badge.elegance': 'Élégance',
        'vehicules.badge.premium': 'Premium',
        'vehicules.badge.luxury': 'Luxe',
        'vehicules.badge.capacity': 'Capacité',
        'vehicules.bookBtn': 'Réserver ce véhicule',
        'vehicules.e.name': 'Classe E',
        'vehicules.e.desc': 'Berline premium Mercedes-Benz Classe E, idéale pour vos déplacements professionnels et privés. Confort exceptionnel et espace généreux pour travailler efficacement ou vous détendre pendant vos trajets parisiens. Équipements haut de gamme et finitions soignées.',
        'vehicules.e.f1': 'Sièges cuir avec réglages électriques',
        'vehicules.e.f2': 'Espace pour 4 passagers',
        'vehicules.e.f3': 'Système audio haut de gamme',
        'vehicules.e.f4': 'WiFi et prises USB',
        'vehicules.e.f5': 'Climatisation multi-zones',
        'vehicules.e.f6': 'Navigation GPS intégrée',
        'vehicules.s.name': 'Classe S',
        'vehicules.s.desc': "Le summum du luxe automobile Mercedes-Benz. La Classe S offre un espace VIP arrière exceptionnel avec finitions sur-mesure en cuir et bois précieux. Parfaite pour les occasions spéciales, événements prestigieux, et clients exigeants qui recherchent l'excellence absolue.",
        'vehicules.s.f1': 'Intérieur cuir et bois précieux',
        'vehicules.s.f2': 'Écrans tactiles et système MBUX',
        'vehicules.s.f3': 'Sièges massants arrière',
        'vehicules.s.f4': 'Bar réfrigéré optionnel',
        'vehicules.s.f5': 'Isolation phonique renforcée',
        'vehicules.s.f6': 'Service premium inclus',
        'vehicules.v.name': 'Classe V',
        'vehicules.v.desc': "Van de luxe Mercedes Classe V (Viano) pouvant accueillir jusqu'à 8 personnes confortablement. Intérieur premium aménagé avec sièges individuels en cuir, espace cargo généreux, et équipements haut de gamme. Parfait pour familles nombreuses, séminaires d'entreprise, ou événements nécessitant un transport de groupe élégant.",
        'vehicules.v.f1': 'Intérieur premium aménagé',
        'vehicules.v.f2': "Jusqu'à 8 passagers",
        'vehicules.v.f3': 'Sièges individuels en cuir',
        'vehicules.v.f4': 'Espace cargo généreux',
        'vehicules.v.f5': 'Climatisation multi-zones',
        'vehicules.v.f6': 'Portes coulissantes automatiques',
        'vehicules.v.f7': 'WiFi et équipements premium',
        'vehicules.gallery.title': 'Galerie Intérieurs',
        'vehicules.gallery.subtitle': "Découvrez l'intérieur de nos véhicules premium",
        'services.title': 'Nos Services',
        'services.subtitle': 'Solutions de transport adaptées à vos besoins, de la course ponctuelle au service régulier',
        'services.s1.title': 'Transferts Aéroport',
        'services.s1.text': "Service de transfert premium vers et depuis les aéroports CDG, Orly et Le Bourget. Suivi de vol en temps réel pour s'adapter aux retards, panneau nominatif personnalisé, assistance complète pour vos bagages. Nos chauffeurs expérimentés connaissent parfaitement tous les terminaux et les meilleurs itinéraires pour éviter les embouteillages. Service disponible 24/7, 365 jours par an.",
        'services.s2.title': "Événements d'Entreprise",
        'services.s2.text': "Solutions de transport complètes pour séminaires, conférences, réceptions d'entreprise, et déplacements professionnels. Gestion de flottes pour groupes importants, coordination de plusieurs véhicules simultanément, planning optimisé. Facturation simplifiée avec devis détaillé et factures mensuelles pour les entreprises. Service dédié avec un interlocuteur unique.",
        'services.s3.title': 'Soirées & Événements Prestigieux',
        'services.s3.text': "Service premium pour mariages, galas, premières de spectacles, réceptions privées, et événements haut de gamme. Véhicules décorés sur demande (rubans, fleurs), chauffeurs en tenue formelle élégante, coordination complète avec les organisateurs d'événements. Nous garantissons une arrivée remarquée et mémorable pour vos invités.",
        'services.s4.title': 'Service au Mois',
        'services.s4.text': "Solution idéale pour des déplacements réguliers : domicile-travail, rendez-vous récurrents, trajets quotidiens. Planning flexible adapté à vos contraintes, possibilité de chauffeur dédié pour un service personnalisé optimal, et facturation mensuelle simplifiée avec un interlocuteur unique. Devis personnalisé sur demande.",
        'services.why.title': 'Pourquoi Choisir NCP',
        'services.why.subtitle': 'Des avantages qui font la différence',
        'services.why.c1.title': "10+ Ans d'Expérience",
        'services.why.c1.text': "Plus de 10 ans d'expérience dans le transport premium parisien. Réputation établie auprès de clients exigeants.",
        'services.why.c2.title': 'Disponibilité 24/7',
        'services.why.c2.text': 'Service disponible à toute heure, 7 jours sur 7. Que ce soit tôt le matin ou tard le soir, nous sommes là.',
        'services.why.c3.title': 'Flotte Premium',
        'services.why.c3.text': "Véhicules Mercedes-Benz récents, entretenus par des professionnels certifiés. Inspection avant chaque course.",
        'services.why.c4.title': '98% de Satisfaction',
        'services.why.c4.text': "Engagement à dépasser vos attentes à chaque trajet. Service client dédié pour répondre à vos besoins.",
        'services.how.title': 'Comment ça marche',
        'services.how.subtitle': 'Un processus simple et efficace en 4 étapes',
        'services.how.step1.title': 'Réservation',
        'services.how.step1.text': "Remplissez notre formulaire en ligne ou contactez-nous par téléphone. Indiquez vos préférences : véhicule, date, heure, lieu de départ et destination.",
        'services.how.step2.title': 'Confirmation',
        'services.how.step2.text': "Notre équipe vous confirme votre réservation sous 2 heures. Vous recevez un SMS et un email avec tous les détails : heure exacte, immatriculation, nom du chauffeur.",
        'services.how.step3.title': 'Prise en charge',
        'services.how.step3.text': "Votre chauffeur arrive 5 minutes avant l'heure prévue. Il vous accueille avec un panneau nominatif, vous aide avec vos bagages et vous installe confortablement.",
        'services.how.step4.title': 'Arrivée',
        'services.how.step4.text': "Vous arrivez à destination en toute sérénité. Le paiement se fait par carte bancaire, virement ou espèces. Un reçu vous est envoyé automatiquement par email.",
    },
    en: {
        // Navigation & footer
        'nav.home': 'Home',
        'nav.vehicles': 'Vehicles',
        'nav.services': 'Services',
        'nav.reims': 'Destinations',
        'nav.booking': 'Booking',
        'nav.contact': 'Contact',

        'footer.description': 'Premium transportation in Paris since 2014. NCP offers high-quality service combining comfort, safety and punctuality for all your trips in the capital.',
        'footer.navigation': 'Navigation',
        'footer.contactTitle': 'Contact',
        'footer.contact.phone': '+33 1 XX XX XX XX',
        'footer.contact.email': 'contact@ncp.fr',
        'footer.contact.city': 'Paris, Île-de-France',
        'footer.copyright': '© 2026 NCP. All rights reserved.',

        // Booking page
        'reservation.title': 'Booking',
        'reservation.subtitle': 'Fill in the form below with all the details of your trip. Our team will confirm your booking within 2 hours by SMS and email with all details (exact time, license plate, driver name).',

        'howItWorks.title': 'How it works',
        'howItWorks.subtitle': 'A simple 4-step process',
        'howItWorks.step1.title': 'Fill in the form',
        'howItWorks.step1.text': 'Indicate your preferences: vehicle, date, time, pickup and drop-off locations',
        'howItWorks.step2.title': 'Fast confirmation',
        'howItWorks.step2.text': 'Our team confirms within 2 hours with all details',
        'howItWorks.step3.title': 'Pickup',
        'howItWorks.step3.text': 'Your driver arrives 5 minutes early with a name sign',
        'howItWorks.step4.title': 'Arrival',
        'howItWorks.step4.text': 'You arrive at your destination in complete peace of mind',

        'form.fullName.label': 'Full name *',
        'form.phone.label': 'Phone *',
        'form.email.label': 'Email *',
        'form.vehicle.label': 'Vehicle *',
        'form.vehicle.placeholder': 'Select a vehicle',
        'form.vehicle.classeE': 'E-Class',
        'form.vehicle.classeS': 'S-Class',
        'form.vehicle.classeV': 'V-Class',
        'form.date.label': 'Date *',
        'form.time.label': 'Time *',
        'form.depart.label': 'Pickup location *',
        'form.depart.placeholder': 'Full address',
        'form.destination.label': 'Destination *',
        'form.destination.placeholder': 'Full address',
        'form.passengers.label': 'Number of passengers *',
        'form.message.label': 'Message (optional)',
        'form.message.placeholder': 'Additional information...',
        'form.submit': 'Confirm booking',
        'form.pay': 'Pay',

        'info.title': 'Important information',
        'info.cancellation': '<strong>Cancellation:</strong> Free up to 2 hours before the scheduled time',
        'info.payment': '<strong>Payment:</strong> Credit card, bank transfer, cash or cheque accepted',
        'info.confirmation': '<strong>Confirmation:</strong> You will receive an SMS and an email confirmation',
        'info.emergency': '<strong>Urgent:</strong> For last-minute bookings, call us directly at +33 1 XX XX XX XX',
        'info.modification': '<strong>Changes:</strong> Any change can be made up to 2 hours before',

        'reservation.success.title': 'Request sent',
        'reservation.success.text': 'Thank you for your booking. We have sent you a confirmation email. Our team will contact you within 2 hours to confirm your trip.',
        'reservation.success.btn': 'Back to home',
        'form.sending': 'Sending...',
        'form.error.required': 'Please fill in all required fields.',
        'form.error.generic': 'An error occurred. Please try again or contact us by phone.',
        'form.error.connection': 'Connection error. Please try again or contact us by phone.',

        // Home page
        'home.hero.title.line1': 'Premium transport',
        'home.hero.title.line2': 'in Paris',
        'home.hero.subtitle': 'Discover the excellence of premium transport in Paris. Exclusive Mercedes-Benz fleet, experienced chauffeurs and personalised 24/7 service for all your business and private trips in the capital and surrounding area.',
        'home.hero.cta.book': 'Book now',
        'home.hero.cta.vehicles': 'Discover our vehicles',

        'home.about.title': 'About NCP',
        'home.about.subtitle': 'A story of excellence and passion for premium transport',
        'home.about.p1': 'Founded in 2014, NCP was born from a simple vision: to offer Paris a premium transport service that combines elegance, punctuality and discretion. In 2026, that already represents more than 10 years of experience built on strong values: service excellence, respect for the client and constant innovation.',
        'home.about.p2': 'Our exclusive Mercedes-Benz fleet is maintained by certified professionals. Each vehicle is inspected before every journey to guarantee your safety and comfort. All our professional chauffeurs know Paris and its surroundings perfectly, ensuring optimised, stress-free routes.',
        'home.about.p3': 'Whether you are a company director, an artist, a diplomat or simply someone who appreciates luxury and comfort, NCP is committed to offering you an unforgettable transport experience. We serve a demanding clientele that values quality, discretion and professionalism.',
        'home.about.stats.years': 'Years of experience',
        'home.about.stats.clients': 'Satisfied clients',
        'home.about.stats.trips': 'Trips completed',
        'home.about.stats.satisfaction': 'Satisfaction rate',

        'home.why.title': 'Why NCP',
        'home.why.subtitle': 'What sets us apart in premium transport in Paris',
        'home.why.card1.title': 'Experience',
        'home.why.card1.text': 'More than 10 years of expertise in premium transport in Paris. A solid reputation built with company directors, artists, diplomats and demanding clients who appreciate quality and professionalism.',
        'home.why.card2.title': 'Discretion',
        'home.why.card2.text': 'Absolute confidentiality guaranteed for all your journeys. All our chauffeurs are bound by a strict confidentiality agreement and fully respect your privacy.',
        'home.why.card3.title': 'Premium fleet',
        'home.why.card3.text': 'Exclusive fleet of recent Mercedes-Benz vehicles (E-Class, S-Class, V-Class). Maintained by certified Mercedes-Benz professionals. Full inspection before every journey to guarantee optimum safety and comfort.',
        'home.why.card4.title': 'Personalised service',
        'home.why.card4.text': 'Tailor-made service adapted to your specific needs. Saved preferences (temperature, music, routes), personalised welcome and particular attention to every detail for a unique experience.',
        'home.why.card5.title': 'Modern technology',
        'home.why.card5.text': 'Simple and fast online booking, real-time GPS tracking of your vehicle, automatic SMS and email notifications. Modern management system for optimal and responsive service.',
        'home.why.card6.title': 'Excellence guaranteed',
        'home.why.card6.text': '98% client satisfaction rate. Commitment to exceeding your expectations on every journey. Dedicated customer service available 24/7 to meet all your needs and guarantee your complete satisfaction.',

        'home.gallery.title': 'Gallery',
        'home.gallery.subtitle': 'Discover our fleet and vehicles in pictures',
        'home.gallery.caption.eInterior': 'E-Class interior',
        'home.gallery.caption.sInterior': 'S-Class interior',
        'home.gallery.caption.vInterior': 'V-Class interior',
        'home.gallery.caption.driver': 'Professional chauffeur',
        'home.gallery.caption.vehicleAction': 'Vehicle in action',
        'home.gallery.caption.equipment': 'Premium equipment',

        'home.testimonials.title': 'Testimonials',
        'home.testimonials.subtitle': 'What our clients say about our service',
        'home.testimonials.t1.text': '“Impeccable service for several years. The chauffeur is always on time, professional and absolutely discreet. The vehicle is perfectly maintained and comfortable. NCP has become my trusted partner for all my business trips in Paris.”',
        'home.testimonials.t1.name': 'Marie D.',
        'home.testimonials.t1.role': 'Marketing Director',
        'home.testimonials.t2.text': '“I have been using NCP regularly for my business trips for 3 years. Flawless service every time, vehicles always immaculate and luxurious, experienced chauffeurs who know Paris and the best routes perfectly. A premium service that fully justifies its price.”',
        'home.testimonials.t2.name': 'Pierre L.',
        'home.testimonials.t2.role': 'CEO, Tech Company',
        'home.testimonials.t3.text': '“For our wedding, we chose NCP to transport our guests. The V-Class was magnificent, the premium interior impeccable and the service absolutely perfect. Our guests were impressed by the professionalism and elegance. A perfect choice for our big day.”',
        'home.testimonials.t3.name': 'Sophie & Thomas',
        'home.testimonials.t3.role': 'Premium clients',

        'home.guarantees.title': 'Our commitments',
        'home.guarantees.g1.title': 'Satisfaction',
        'home.guarantees.g1.text': 'Quality commitment on every journey',
        'home.guarantees.g2.title': 'Availability',
        'home.guarantees.g2.text': 'Service available at any time',
        'home.guarantees.g3.title': 'Years',
        'home.guarantees.g3.text': 'Of experience in Paris',
        'home.guarantees.g4.title': 'Clients',
        'home.guarantees.g4.text': 'Loyal satisfied clients',

        'home.cta.title': 'Ready to book your trip?',
        'home.cta.subtitle': 'Book online in a few clicks or contact us directly',
        'home.cta.ctaBook': 'Book now',
        'home.cta.ctaContact': 'Contact us',

        // Contact page
        'contact.title': 'Contact',
        'contact.subtitle': 'Our team is available 24/7 to answer all your questions, manage your bookings and offer the premium transport solution best suited to your specific needs. Do not hesitate to contact us for a personalised quote.',
        'contact.phone.title': 'Phone',
        'contact.phone.note': 'Available 24/7',
        'contact.email.title': 'Email',
        'contact.email.note': 'Reply guaranteed within 24 hours',
        'contact.zone.title': 'Service area',
        'contact.zone.city': 'Paris and Île-de-France',
        'contact.zone.note': 'Service available throughout the Paris region, airports (CDG, Orly, Le Bourget) and neighbouring departments',

        'contact.faq.title': 'Frequently asked questions',
        'contact.faq.subtitle': 'All the answers to your questions about our services',

        'contact.faq.q1.title': 'How do I book a trip?',
        'contact.faq.q1.text': 'You can book in three ways: via our online form on this site, by phone on +33 1 XX XX XX XX, or by email at contact@ncp.fr. For urgent bookings we recommend calling us.',
        'contact.faq.q2.title': 'What payment methods do you accept?',
        'contact.faq.q2.text': 'We accept payment by bank card (Visa, Mastercard, American Express), bank transfer, cash and cheque. For companies, we offer invoicing with deferred payment according to your terms.',
        'contact.faq.q3.title': 'Can I cancel or change my booking?',
        'contact.faq.q3.text': 'Yes, you can cancel or change your booking up to 2 hours before the scheduled time at no charge. For cancellations less than 2 hours before, cancellation fees may apply. Contact us for any changes.',
        'contact.faq.q4.title': 'Are your vehicles insured?',
        'contact.faq.q4.text': 'Absolutely. All our vehicles are fully insured, including public liability, comprehensive cover and passenger insurance. We comply with all current legal standards.',
        'contact.faq.q5.title': 'Do you offer airport services?',
        'contact.faq.q5.text': 'Yes, we offer transfers to and from CDG, Orly and Le Bourget airports. We track your flight to make sure we are there when you arrive, even in case of delay. Luggage assistance is included.',
        'contact.faq.q6.title': 'Do your chauffeurs speak English?',
        'contact.faq.q6.text': 'Yes, all our chauffeurs speak French and English fluently. Some also speak other languages (Spanish, German, Italian). Feel free to tell us your preferences when booking.',
        'contact.faq.q7.title': 'What are your service hours?',
        'contact.faq.q7.text': 'We are available 24 hours a day, 7 days a week. Whether it is an early-morning trip, late evening or at night, our service is always available to meet your needs.',
        'contact.faq.q8.title': 'Can I book for several people?',
        'contact.faq.q8.text': 'Absolutely. We can organise transport for groups. Our V-Class can accommodate up to 8 passengers. For larger groups, we can coordinate several vehicles. Contact us for a personalised quote.'
    },
    de: {
        'nav.home': 'Startseite',
        'nav.vehicles': 'Fahrzeuge',
        'nav.services': 'Leistungen',
        'nav.reims': 'Reiseziele',
        'nav.booking': 'Buchung',
        'nav.contact': 'Kontakt',

        'footer.description': 'Premium-Transport in Paris seit 2014. NCP bietet einen hochwertigen Service mit Komfort, Sicherheit und Pünktlichkeit für alle Ihre Fahrten in der Hauptstadt.',
        'footer.navigation': 'Navigation',
        'footer.contactTitle': 'Kontakt',
        'footer.contact.phone': '+33 1 XX XX XX XX',
        'footer.contact.email': 'contact@ncp.fr',
        'footer.contact.city': 'Paris, Île-de-France',
        'footer.copyright': '© 2026 NCP. Alle Rechte vorbehalten.',

        'reservation.title': 'Buchung',
        'reservation.subtitle': 'Füllen Sie das Formular unten mit allen Details Ihrer Fahrt aus. Unser Team bestätigt Ihre Buchung innerhalb von 2 Stunden per SMS und E-Mail mit allen Details (genaue Uhrzeit, Kennzeichen, Name des Fahrers).',

        'howItWorks.title': 'So funktioniert es',
        'howItWorks.subtitle': 'Ein einfacher Prozess in 4 Schritten',
        'howItWorks.step1.title': 'Formular ausfüllen',
        'howItWorks.step1.text': 'Geben Sie Ihre Wünsche an: Fahrzeug, Datum, Uhrzeit, Abfahrts- und Zielort',
        'howItWorks.step2.title': 'Schnelle Bestätigung',
        'howItWorks.step2.text': 'Unser Team bestätigt innerhalb von 2 Stunden mit allen Details',
        'howItWorks.step3.title': 'Abholung',
        'howItWorks.step3.text': 'Ihr Fahrer trifft 5 Minuten früher mit Namensschild ein',
        'howItWorks.step4.title': 'Ankunft',
        'howItWorks.step4.text': 'Sie kommen entspannt und sicher an Ihrem Ziel an',

        'form.fullName.label': 'Vollständiger Name *',
        'form.phone.label': 'Telefon *',
        'form.email.label': 'E-Mail *',
        'form.vehicle.label': 'Fahrzeug *',
        'form.vehicle.placeholder': 'Fahrzeug auswählen',
        'form.vehicle.classeE': 'E-Klasse',
        'form.vehicle.classeS': 'S-Klasse',
        'form.vehicle.classeV': 'V-Klasse',
        'form.date.label': 'Datum *',
        'form.time.label': 'Uhrzeit *',
        'form.depart.label': 'Abholort *',
        'form.depart.placeholder': 'Vollständige Adresse',
        'form.destination.label': 'Zielort *',
        'form.destination.placeholder': 'Vollständige Adresse',
        'form.passengers.label': 'Anzahl der Fahrgäste *',
        'form.message.label': 'Nachricht (optional)',
        'form.message.placeholder': 'Zusätzliche Informationen...',
        'form.submit': 'Buchung bestätigen',
        'form.pay': 'Bezahlen',

        'info.title': 'Wichtige Informationen',
        'info.cancellation': '<strong>Stornierung:</strong> Kostenfrei bis 2 Stunden vor der geplanten Zeit',
        'info.payment': '<strong>Zahlung:</strong> Kreditkarte, Überweisung, Barzahlung oder Scheck akzeptiert',
        'info.confirmation': '<strong>Bestätigung:</strong> Sie erhalten eine Bestätigung per SMS und E-Mail',
        'info.emergency': '<strong>Dringend:</strong> Für kurzfristige Buchungen rufen Sie uns direkt unter +33 1 XX XX XX XX an',
        'info.modification': '<strong>Änderung:</strong> Änderungen sind bis 2 Stunden vor der Fahrt möglich',

        'reservation.success.title': 'Anfrage gesendet',
        'reservation.success.text': 'Vielen Dank für Ihre Buchung. Wir haben Ihnen eine Bestätigungs-E-Mail gesendet. Unser Team wird Sie innerhalb von 2 Stunden kontaktieren, um Ihre Fahrt zu bestätigen.',
        'reservation.success.btn': 'Zurück zur Startseite',
        'form.sending': 'Wird gesendet...',
        'form.error.required': 'Bitte füllen Sie alle Pflichtfelder aus.',
        'form.error.generic': 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie uns telefonisch.',
        'form.error.connection': 'Verbindungsfehler. Bitte versuchen Sie es erneut oder kontaktieren Sie uns telefonisch.',

        'home.hero.title.line1': 'Premium-Transport',
        'home.hero.title.line2': 'in Paris',
        'home.hero.subtitle': 'Entdecken Sie die Exzellenz des Premium-Transports in Paris. Exklusive Mercedes-Benz-Flotte, erfahrene Chauffeurs und persönlicher 24/7-Service für alle Ihre Geschäfts- und Privatfahrten in der Hauptstadt und Umgebung.',
        'home.hero.cta.book': 'Jetzt buchen',
        'home.hero.cta.vehicles': 'Unsere Fahrzeuge entdecken',

        'home.about.title': 'Über NCP',
        'home.about.subtitle': 'Eine Geschichte von Exzellenz und Leidenschaft für Premium-Transport',
        'home.about.p1': '2014 gegründet, wurde NCP aus einer einfachen Vision geboren: Paris einen Premium-Transportservice zu bieten, der Eleganz, Pünktlichkeit und Diskretion vereint. 2026 bedeutet das bereits mehr als 10 Jahre Erfahrung, aufgebaut auf starken Werten: Service-Exzellenz, Respekt für den Kunden und ständige Innovation.',
        'home.about.p2': 'Unsere exklusive Mercedes-Benz-Flotte wird von zertifizierten Fachleuten gewartet. Jedes Fahrzeug wird vor jeder Fahrt überprüft, um Ihre Sicherheit und Ihren Komfort zu gewährleisten. Alle unsere erfahrenen Chauffeurs kennen Paris und seine Umgebung perfekt und garantieren optimierte, stressfreie Fahrten.',
        'home.about.p3': 'Ob Sie Geschäftsführer, Künstler, Diplomat oder einfach jemand sind, der Luxus und Komfort zu schätzen weiß – NCP verpflichtet sich, Ihnen ein unvergessliches Transport-Erlebnis zu bieten. Wir betreuen anspruchsvolle Kunden, die Qualität, Diskretion und Professionalität schätzen.',
        'home.about.stats.years': 'Jahre Erfahrung',
        'home.about.stats.clients': 'Zufriedene Kunden',
        'home.about.stats.trips': 'Durchgeführte Fahrten',
        'home.about.stats.satisfaction': 'Zufriedenheitsrate',

        'home.why.title': 'Warum NCP',
        'home.why.subtitle': 'Was uns im Premium-Transport in Paris auszeichnet',
        'home.why.card1.title': 'Erfahrung',
        'home.why.card1.text': 'Mehr als 10 Jahre Expertise im Premium-Transport in Paris. Solider Ruf bei Geschäftsführern, Künstlern, Diplomaten und anspruchsvollen Kunden, die Qualität und Professionalität schätzen.',
        'home.why.card2.title': 'Diskretion',
        'home.why.card2.text': 'Absolute Vertraulichkeit für alle Ihre Fahrten garantiert. Alle unsere Chauffeurs unterliegen einer strengen Vertraulichkeitsklausel und respektieren Ihre Privatsphäre in jeder Situation.',
        'home.why.card3.title': 'Premium-Flotte',
        'home.why.card3.text': 'Exklusive Flotte aktueller Mercedes-Benz-Fahrzeuge (E-Klasse, S-Klasse, V-Klasse). Gewartet von zertifizierten Mercedes-Benz-Profis. Vollständige Inspektion vor jeder Fahrt für optimale Sicherheit und Komfort.',
        'home.why.card4.title': 'Persönlicher Service',
        'home.why.card4.text': 'Maßgeschneiderter Service für Ihre spezifischen Bedürfnisse. Gespeicherte Präferenzen (Temperatur, Musik, Routen), persönlicher Empfang und besondere Aufmerksamkeit für jedes Detail für ein einzigartiges Erlebnis.',
        'home.why.card5.title': 'Moderne Technologie',
        'home.why.card5.text': 'Einfache und schnelle Online-Buchung, Echtzeit-GPS-Verfolgung Ihres Fahrzeugs, automatische SMS- und E-Mail-Benachrichtigungen. Modernes Managementsystem für optimalen und reaktionsschnellen Service.',
        'home.why.card6.title': 'Garantierte Exzellenz',
        'home.why.card6.text': '98% Kundenzufriedenheitsrate. Engagement, Ihre Erwartungen bei jeder Fahrt zu übertreffen. Dedizierter Kundenservice 24/7 verfügbar für alle Ihre Bedürfnisse und Ihre vollständige Zufriedenheit.',

        'home.gallery.title': 'Galerie',
        'home.gallery.subtitle': 'Entdecken Sie unsere Flotte und Fahrzeuge in Bildern',
        'home.gallery.caption.eInterior': 'E-Klasse Innenraum',
        'home.gallery.caption.sInterior': 'S-Klasse Innenraum',
        'home.gallery.caption.vInterior': 'V-Klasse Innenraum',
        'home.gallery.caption.driver': 'Professioneller Chauffeur',
        'home.gallery.caption.vehicleAction': 'Fahrzeug in Aktion',
        'home.gallery.caption.equipment': 'Premium-Ausstattung',

        'home.testimonials.title': 'Kundenstimmen',
        'home.testimonials.subtitle': 'Was unsere Kunden über unseren Service sagen',
        'home.testimonials.t1.text': '"Seit Jahren tadelloser Service. Der Chauffeur ist immer pünktlich, professionell und absolut diskret. Das Fahrzeug ist perfekt gepflegt und komfortabel. NCP ist zu meinem vertrauenswürdigen Partner für alle meine Geschäftsreisen in Paris geworden."',
        'home.testimonials.t1.name': 'Marie D.',
        'home.testimonials.t1.role': 'Marketing Director',
        'home.testimonials.t2.text': '"Ich nutze NCP regelmäßig seit 3 Jahren für meine Geschäftsreisen. Bei jeder Fahrt ein makelloser Service, Fahrzeuge immer tadellos und luxuriös, erfahrene Chauffeurs, die Paris und die besten Routen perfekt kennen. Ein Premium-Service, der seinen Preis voll rechtfertigt."',
        'home.testimonials.t2.name': 'Pierre L.',
        'home.testimonials.t2.role': 'CEO, Tech-Unternehmen',
        'home.testimonials.t3.text': '"Für unsere Hochzeit haben wir NCP für den Transport unserer Gäste gewählt. Die V-Klasse war magnificent, das Premium-Innenraum makellos und der Service absolut perfekt. Unsere Gäste waren beeindruckt von Professionalität und Eleganz. Eine perfekte Wahl für unseren großen Tag."',
        'home.testimonials.t3.name': 'Sophie & Thomas',
        'home.testimonials.t3.role': 'Premium-Kunden',

        'home.guarantees.title': 'Unsere Verpflichtungen',
        'home.guarantees.g1.title': 'Zufriedenheit',
        'home.guarantees.g1.text': 'Qualitätsengagement bei jeder Fahrt',
        'home.guarantees.g2.title': 'Verfügbarkeit',
        'home.guarantees.g2.text': 'Service zu jeder Zeit verfügbar',
        'home.guarantees.g3.title': 'Jahre',
        'home.guarantees.g3.text': 'Erfahrung in Paris',
        'home.guarantees.g4.title': 'Kunden',
        'home.guarantees.g4.text': 'Zufriedene Stammkunden',

        'home.cta.title': 'Bereit, Ihre Fahrt zu buchen?',
        'home.cta.subtitle': 'Buchen Sie online in wenigen Klicks oder kontaktieren Sie uns direkt',
        'home.cta.ctaBook': 'Jetzt buchen',
        'home.cta.ctaContact': 'Kontaktieren Sie uns',

        'contact.title': 'Kontakt',
        'contact.subtitle': 'Unser Team ist 24/7 verfügbar, um alle Ihre Fragen zu beantworten, Ihre Buchungen zu verwalten und die für Ihre spezifischen Bedürfnisse am besten geeignete Premium-Transportlösung anzubieten. Zögern Sie nicht, uns für ein individuelles Angebot zu kontaktieren.',
        'contact.phone.title': 'Telefon',
        'contact.phone.note': '24/7 verfügbar',
        'contact.email.title': 'E-Mail',
        'contact.email.note': 'Antwort garantiert innerhalb von 24 Stunden',
        'contact.zone.title': 'Einsatzgebiet',
        'contact.zone.city': 'Paris und Île-de-France',
        'contact.zone.note': 'Service in der gesamten Pariser Region, Flughäfen (CDG, Orly, Le Bourget) und angrenzenden Départements verfügbar',

        'contact.faq.title': 'Häufig gestellte Fragen',
        'contact.faq.subtitle': 'Alle Antworten auf Ihre Fragen zu unseren Dienstleistungen',

        'contact.faq.q1.title': 'Wie buche ich eine Fahrt?',
        'contact.faq.q1.text': 'Sie können auf drei Arten buchen: über unser Online-Formular auf dieser Website, telefonisch unter +33 1 XX XX XX XX oder per E-Mail an contact@ncp.fr. Für dringende Buchungen empfehlen wir einen Anruf.',
        'contact.faq.q2.title': 'Welche Zahlungsmethoden akzeptieren Sie?',
        'contact.faq.q2.text': 'Wir akzeptieren Zahlung per Bankkarte (Visa, Mastercard, American Express), Überweisung, Bargeld und Scheck. Für Unternehmen bieten wir Rechnungsstellung mit Zahlungsaufschub nach Ihren Bedingungen an.',
        'contact.faq.q3.title': 'Kann ich meine Buchung stornieren oder ändern?',
        'contact.faq.q3.text': 'Ja, Sie können Ihre Buchung bis 2 Stunden vor der geplanten Zeit kostenlos stornieren oder ändern. Bei Stornierungen weniger als 2 Stunden vorher können Stornierungsgebühren anfallen. Kontaktieren Sie uns für Änderungen.',
        'contact.faq.q4.title': 'Sind Ihre Fahrzeuge versichert?',
        'contact.faq.q4.text': 'Absolut. Alle unsere Fahrzeuge sind voll versichert, einschließlich Haftpflicht-, Vollkasko- und Fahrgastversicherung. Wir erfüllen alle geltenden gesetzlichen Standards.',
        'contact.faq.q5.title': 'Bieten Sie Flughafenservice an?',
        'contact.faq.q5.text': 'Ja, wir bieten Transfers zu und von den Flughäfen CDG, Orly und Le Bourget an. Wir verfolgen Ihren Flug, um sicherzustellen, dass wir bei Ihrer Ankunft da sind, auch bei Verspätung. Gepäckassistenz inklusive.',
        'contact.faq.q6.title': 'Sprechen Ihre Chauffeurs Englisch?',
        'contact.faq.q6.text': 'Ja, alle unsere Chauffeurs sprechen fließend Französisch und Englisch. Einige sprechen auch andere Sprachen (Spanisch, Deutsch, Italienisch). Teilen Sie uns Ihre Präferenzen bei der Buchung mit.',
        'contact.faq.q7.title': 'Was sind Ihre Servicezeiten?',
        'contact.faq.q7.text': 'Wir sind 24 Stunden am Tag, 7 Tage die Woche verfügbar. Ob frühmorgens, spät abends oder nachts – unser Service ist immer für Sie da.',
        'contact.faq.q8.title': 'Kann ich für mehrere Personen buchen?',
        'contact.faq.q8.text': 'Absolut. Wir können Transport für Gruppen organisieren. Unsere V-Klasse bietet Platz für bis zu 8 Passagiere. Für größere Gruppen können wir mehrere Fahrzeuge koordinieren. Kontaktieren Sie uns für ein individuelles Angebot.'
    },
    es: {
        'nav.home': 'Inicio',
        'nav.vehicles': 'Vehículos',
        'nav.services': 'Servicios',
        'nav.reims': 'Destinos',
        'nav.booking': 'Reserva',
        'nav.contact': 'Contacto',

        'reservation.title': 'Reserva',
        'reservation.subtitle': 'Rellene el formulario siguiente con todos los detalles de su trayecto. Nuestro equipo confirmará su reserva en menos de 2 horas por SMS y correo electrónico con todos los detalles (hora exacta, matrícula, nombre del conductor).',

        'howItWorks.title': 'Cómo funciona',
        'howItWorks.subtitle': 'Un proceso sencillo en 4 pasos',
        'howItWorks.step1.title': 'Rellene el formulario',
        'howItWorks.step1.text': 'Indique sus preferencias: vehículo, fecha, hora, lugar de salida y destino',
        'howItWorks.step2.title': 'Confirmación rápida',
        'howItWorks.step2.text': 'Nuestro equipo confirma en menos de 2 horas con todos los detalles',
        'howItWorks.step3.title': 'Recogida',
        'howItWorks.step3.text': 'Su conductor llega 5 minutos antes con un cartel con su nombre',
        'howItWorks.step4.title': 'Llegada',
        'howItWorks.step4.text': 'Llega a su destino con total tranquilidad',

        'form.fullName.label': 'Nombre completo *',
        'form.phone.label': 'Teléfono *',
        'form.email.label': 'Correo electrónico *',
        'form.vehicle.label': 'Vehículo *',
        'form.vehicle.placeholder': 'Seleccione un vehículo',
        'form.vehicle.classeE': 'Clase E',
        'form.vehicle.classeS': 'Clase S',
        'form.vehicle.classeV': 'Clase V',
        'form.date.label': 'Fecha *',
        'form.time.label': 'Hora *',
        'form.depart.label': 'Lugar de salida *',
        'form.depart.placeholder': 'Dirección completa',
        'form.destination.label': 'Destino *',
        'form.destination.placeholder': 'Dirección completa',
        'form.passengers.label': 'Número de pasajeros *',
        'form.message.label': 'Mensaje (opcional)',
        'form.message.placeholder': 'Información adicional...',
        'form.submit': 'Confirmar la reserva',
        'form.pay': 'Pagar',

        'info.title': 'Información importante',
        'info.cancellation': '<strong>Cancelación:</strong> Gratuita hasta 2 horas antes de la hora prevista',
        'info.payment': '<strong>Pago:</strong> Se aceptan tarjeta bancaria, transferencia, efectivo o cheque',
        'info.confirmation': '<strong>Confirmación:</strong> Recibirá un SMS y un correo electrónico de confirmación',
        'info.emergency': '<strong>Urgente:</strong> Para reservas de última hora, llámenos directamente al +33 1 XX XX XX XX',
        'info.modification': '<strong>Modificación:</strong> Cualquier cambio puede realizarse hasta 2 horas antes',

        'reservation.success.title': 'Solicitud enviada',
        'reservation.success.text': 'Gracias por su reserva. Le hemos enviado un correo de confirmación. Nuestro equipo le contactará en menos de 2 horas para confirmar su trayecto.',
        'reservation.success.btn': 'Volver al inicio',
        'form.sending': 'Enviando...',
        'form.error.required': 'Por favor, rellene todos los campos obligatorios.',
        'form.error.generic': 'Se ha producido un error. Por favor, inténtelo de nuevo o contáctenos por teléfono.',
        'form.error.connection': 'Error de conexión. Por favor, inténtelo de nuevo o contáctenos por teléfono.',

        'footer.description': 'Transporte premium en París desde 2014. NCP ofrece un servicio de calidad que combina confort, seguridad y puntualidad para todos sus desplazamientos en la capital.',
        'footer.navigation': 'Navegación',
        'footer.contactTitle': 'Contacto',
        'footer.contact.phone': '+33 1 XX XX XX XX',
        'footer.contact.email': 'contact@ncp.fr',
        'footer.contact.city': 'París, Île-de-France',
        'footer.copyright': '© 2026 NCP. Todos los derechos reservados.',

        'home.hero.title.line1': 'Transporte Premium',
        'home.hero.title.line2': 'en París',
        'home.hero.subtitle': 'Descubra la excelencia del transporte premium parisino. Flota exclusiva Mercedes-Benz, chóferes experimentados y servicio personalizado 24/7 para todos sus desplazamientos profesionales y privados en la capital y sus alrededores.',
        'home.hero.cta.book': 'Reservar ahora',
        'home.hero.cta.vehicles': 'Descubrir nuestros vehículos',

        'home.about.title': 'Sobre NCP',
        'home.about.subtitle': 'Una historia de excelencia y pasión por el transporte premium',
        'home.about.p1': 'Fundada en 2014, NCP nació de una visión sencilla: ofrecer a París un servicio de transporte premium que combine elegancia, puntualidad y discreción. En 2026, eso representa ya más de 10 años de experiencia, construidos sobre valores sólidos: excelencia del servicio, respeto al cliente e innovación constante.',
        'home.about.p2': 'Nuestra flota exclusiva de vehículos Mercedes-Benz es mantenida por profesionales certificados. Cada vehículo se inspecciona antes de cada trayecto para garantizar su seguridad y comodidad. Nuestros chóferes, todos profesionales experimentados, conocen perfectamente París y sus alrededores, garantizándole trayectos optimizados y sin estrés.',
        'home.about.p3': 'Ya sea director de empresa, artista, diplomático o simplemente alguien que aprecia el lujo y el confort, NCP se compromete a ofrecerle una experiencia de transporte inolvidable. Servimos a una clientela exigente que aprecia la calidad, la discreción y el profesionalismo.',
        'home.about.stats.years': 'Años de experiencia',
        'home.about.stats.clients': 'Clientes satisfechos',
        'home.about.stats.trips': 'Trayectos realizados',
        'home.about.stats.satisfaction': 'Tasa de satisfacción',

        'home.why.title': 'Por qué NCP',
        'home.why.subtitle': 'Lo que nos distingue en el transporte premium parisino',
        'home.why.card1.title': 'Experiencia',
        'home.why.card1.text': 'Más de 10 años de experiencia en el transporte premium parisino. Reputación sólida establecida con directores de empresa, artistas, diplomáticos y clientes exigentes que aprecian la calidad y el profesionalismo.',
        'home.why.card2.title': 'Discreción',
        'home.why.card2.text': 'Confidencialidad absoluta garantizada para todos sus desplazamientos. Todos nuestros chóferes están sujetos a una estricta cláusula de confidencialidad y respetan su privacidad en todas las circunstancias.',
        'home.why.card3.title': 'Flota Premium',
        'home.why.card3.text': 'Flota exclusiva de vehículos Mercedes-Benz recientes (Clase E, Clase S, Clase V). Mantenidos por profesionales certificados Mercedes-Benz. Inspección completa antes de cada trayecto para garantizar seguridad y confort óptimos.',
        'home.why.card4.title': 'Servicio Personalizado',
        'home.why.card4.text': 'Servicio a medida adaptado a sus necesidades específicas. Preferencias memorizadas (temperatura, música, itinerarios), acogida personalizada y atención especial a cada detalle para una experiencia única.',
        'home.why.card5.title': 'Tecnología Moderna',
        'home.why.card5.text': 'Reserva en línea sencilla y rápida, seguimiento GPS en tiempo real de su vehículo, notificaciones automáticas por SMS y email. Sistema de gestión moderno para un servicio óptimo y reactivo.',
        'home.why.card6.title': 'Excelencia Garantizada',
        'home.why.card6.text': '98% de tasa de satisfacción del cliente. Compromiso de superar sus expectativas en cada trayecto. Servicio de atención al cliente dedicado disponible 24/7 para responder a todas sus necesidades y garantizar su satisfacción total.',

        'home.gallery.title': 'Galería',
        'home.gallery.subtitle': 'Descubra nuestra flota y vehículos en imágenes',
        'home.gallery.caption.eInterior': 'Interior Clase E',
        'home.gallery.caption.sInterior': 'Interior Clase S',
        'home.gallery.caption.vInterior': 'Interior Clase V',
        'home.gallery.caption.driver': 'Chófer Profesional',
        'home.gallery.caption.vehicleAction': 'Vehículo en acción',
        'home.gallery.caption.equipment': 'Equipamiento Premium',

        'home.testimonials.title': 'Testimonios',
        'home.testimonials.subtitle': 'Lo que dicen nuestros clientes sobre nuestro servicio',
        'home.testimonials.t1.text': '"Servicio impecable desde hace varios años. Chófer siempre puntual, profesional y con una discreción absoluta. Vehículo perfectamente mantenido y cómodo. NCP se ha convertido en mi socio de confianza para todos mis desplazamientos profesionales en París."',
        'home.testimonials.t1.name': 'Marie D.',
        'home.testimonials.t1.role': 'Directora de Marketing',
        'home.testimonials.t2.text': '"Uso NCP regularmente para mis desplazamientos de negocios desde hace 3 años. Servicio irreprochable cada vez, vehículos siempre impecables y lujosos, chóferes experimentados que conocen perfectamente París y sus mejores itinerarios. Un servicio premium que justifica su precio."',
        'home.testimonials.t2.name': 'Pierre L.',
        'home.testimonials.t2.role': 'CEO, Empresa Tech',
        'home.testimonials.t3.text': '"Para nuestra boda, elegimos NCP para transportar a nuestros invitados. La Clase V era magnífica, el interior premium impecable y el servicio absolutamente perfecto. Nuestros invitados quedaron impresionados por el profesionalismo y la elegancia. Una elección perfecta para nuestro gran día."',
        'home.testimonials.t3.name': 'Sophie y Thomas',
        'home.testimonials.t3.role': 'Clientes Premium',

        'home.guarantees.title': 'Nuestros Compromisos',
        'home.guarantees.g1.title': 'Satisfacción',
        'home.guarantees.g1.text': 'Compromiso de calidad en cada trayecto',
        'home.guarantees.g2.title': 'Disponibilidad',
        'home.guarantees.g2.text': 'Servicio disponible en todo momento',
        'home.guarantees.g3.title': 'Años',
        'home.guarantees.g3.text': 'De experiencia en París',
        'home.guarantees.g4.title': 'Clientes',
        'home.guarantees.g4.text': 'Clientes fieles satisfechos',

        'home.cta.title': '¿Listo para reservar su trayecto?',
        'home.cta.subtitle': 'Reserve en línea en unos clics o contáctenos directamente',
        'home.cta.ctaBook': 'Reservar ahora',
        'home.cta.ctaContact': 'Contactarnos',

        'contact.title': 'Contacto',
        'contact.subtitle': 'Nuestro equipo está disponible 24 horas al día, 7 días a la semana para responder a todas sus preguntas, gestionar sus reservas y proponerle la solución de transporte premium más adaptada a sus necesidades específicas. No dude en contactarnos para un presupuesto personalizado.',
        'contact.phone.title': 'Teléfono',
        'contact.phone.note': 'Disponible 24/7',
        'contact.email.title': 'Email',
        'contact.email.note': 'Respuesta garantizada en 24 horas',
        'contact.zone.title': 'Zona de intervención',
        'contact.zone.city': 'París e Île-de-France',
        'contact.zone.note': 'Servicio disponible en toda la región parisina, aeropuertos (CDG, Orly, Le Bourget) y departamentos limítrofes',

        'contact.faq.title': 'Preguntas frecuentes',
        'contact.faq.subtitle': 'Todas las respuestas a sus preguntas sobre nuestros servicios',

        'contact.faq.q1.title': '¿Cómo reservar un trayecto?',
        'contact.faq.q1.text': 'Puede reservar de tres formas: a través de nuestro formulario en línea en este sitio, por teléfono al +33 1 XX XX XX XX, o por email a contact@ncp.fr. Para reservas urgentes, recomendamos la llamada telefónica.',
        'contact.faq.q2.title': '¿Qué medios de pago aceptan?',
        'contact.faq.q2.text': 'Aceptamos pagos con tarjeta bancaria (Visa, Mastercard, American Express), transferencia bancaria, efectivo y cheque. Para empresas, ofrecemos facturación con pago diferido según sus condiciones.',
        'contact.faq.q3.title': '¿Puedo cancelar o modificar mi reserva?',
        'contact.faq.q3.text': 'Sí, puede cancelar o modificar su reserva hasta 2 horas antes de la hora prevista sin cargo. Para cancelaciones con menos de 2 horas de antelación, pueden aplicarse tasas de cancelación. Contáctenos para cualquier modificación.',
        'contact.faq.q4.title': '¿Sus vehículos están asegurados?',
        'contact.faq.q4.text': 'Absolutamente. Todos nuestros vehículos están asegurados con cobertura completa incluyendo responsabilidad civil, seguro a todo riesgo y seguro de pasajeros. Cumplimos con todas las normativas legales vigentes.',
        'contact.faq.q5.title': '¿Ofrecen servicios para aeropuertos?',
        'contact.faq.q5.text': 'Sí, ofrecemos transferencias desde y hacia los aeropuertos CDG, Orly y Le Bourget. Realizamos el seguimiento de vuelos para asegurarnos de estar presentes a su llegada, incluso en caso de retraso. Asistencia de equipaje incluida.',
        'contact.faq.q6.title': '¿Sus chóferes hablan inglés?',
        'contact.faq.q6.text': 'Sí, todos nuestros chóferes hablan francés e inglés con fluidez. Algunos también hablan otros idiomas (español, alemán, italiano). No dude en indicarnos sus preferencias al reservar.',
        'contact.faq.q7.title': '¿Cuáles son los horarios de servicio?',
        'contact.faq.q7.text': 'Estamos disponibles 24 horas al día, 7 días a la semana. Ya sea para un trayecto temprano por la mañana, tarde por la noche o incluso de noche, nuestro servicio está siempre disponible para responder a sus necesidades.',
        'contact.faq.q8.title': '¿Puedo reservar para varias personas?',
        'contact.faq.q8.text': 'Absolutamente. Podemos organizar transportes para grupos. Nuestra Clase V puede acoger hasta 8 pasajeros. Para grupos más grandes, podemos coordinar varios vehículos. Contáctenos para un presupuesto personalizado.'
    },
    it: {
        'nav.home': 'Home',
        'nav.vehicles': 'Veicoli',
        'nav.services': 'Servizi',
        'nav.reims': 'Destinazioni',
        'nav.booking': 'Prenotazione',
        'nav.contact': 'Contatto',

        'reservation.title': 'Prenotazione',
        'reservation.subtitle': 'Compila il modulo qui sotto con tutti i dettagli del tuo viaggio. Il nostro team confermerà la tua prenotazione entro 2 ore tramite SMS ed email con tutti i dettagli (orario esatto, targa, nome dell’autista).',

        'howItWorks.title': 'Come funziona',
        'howItWorks.subtitle': 'Un processo semplice in 4 passaggi',
        'howItWorks.step1.title': 'Compila il modulo',
        'howItWorks.step1.text': 'Indica le tue preferenze: veicolo, data, ora, luogo di partenza e destinazione',
        'howItWorks.step2.title': 'Conferma rapida',
        'howItWorks.step2.text': 'Il nostro team conferma entro 2 ore con tutti i dettagli',
        'howItWorks.step3.title': 'Presa in carico',
        'howItWorks.step3.text': "Il tuo autista arriva 5 minuti prima con un cartello con il tuo nome",
        'howItWorks.step4.title': 'Arrivo',
        'howItWorks.step4.text': 'Arrivi a destinazione in totale tranquillità',

        'form.fullName.label': 'Nome e cognome *',
        'form.phone.label': 'Telefono *',
        'form.email.label': 'Email *',
        'form.vehicle.label': 'Veicolo *',
        'form.vehicle.placeholder': 'Seleziona un veicolo',
        'form.vehicle.classeE': 'Classe E',
        'form.vehicle.classeS': 'Classe S',
        'form.vehicle.classeV': 'Classe V',
        'form.date.label': 'Data *',
        'form.time.label': 'Ora *',
        'form.depart.label': 'Luogo di partenza *',
        'form.depart.placeholder': 'Indirizzo completo',
        'form.destination.label': 'Destinazione *',
        'form.destination.placeholder': 'Indirizzo completo',
        'form.passengers.label': 'Numero di passeggeri *',
        'form.message.label': 'Messaggio (opzionale)',
        'form.message.placeholder': 'Informazioni aggiuntive...',
        'form.submit': 'Conferma la prenotazione',
        'form.pay': 'Paga',

        'info.title': 'Informazioni importanti',
        'info.cancellation': '<strong>Cancellazione:</strong> Gratuita fino a 2 ore prima dell’orario previsto',
        'info.payment': '<strong>Pagamento:</strong> Carta di credito, bonifico, contanti o assegno accettati',
        'info.confirmation': '<strong>Conferma:</strong> Riceverai un SMS e un’email di conferma',
        'info.emergency': '<strong>Urgenza:</strong> Per prenotazioni all’ultimo minuto, chiamaci direttamente al +33 1 XX XX XX XX',
        'info.modification': '<strong>Modifica:</strong> Qualsiasi modifica può essere effettuata fino a 2 ore prima',

        'reservation.success.title': 'Richiesta inviata',
        'reservation.success.text': 'Grazie per la vostra prenotazione. Vi abbiamo inviato un\'email di conferma. Il nostro team vi contatterà entro 2 ore per confermare il vostro viaggio.',
        'reservation.success.btn': 'Torna alla home',
        'form.sending': 'Invio in corso...',
        'form.error.required': 'Si prega di compilare tutti i campi obbligatori.',
        'form.error.generic': 'Si è verificato un errore. Si prega di riprovare o contattarci per telefono.',
        'form.error.connection': 'Errore di connessione. Si prega di riprovare o contattarci per telefono.',

        'footer.description': 'Trasporto premium a Parigi dal 2014. NCP offre un servizio di qualità che unisce comfort, sicurezza e puntualità per tutti i tuoi spostamenti nella capitale.',
        'footer.navigation': 'Navigazione',
        'footer.contactTitle': 'Contatto',
        'footer.contact.phone': '+33 1 XX XX XX XX',
        'footer.contact.email': 'contact@ncp.fr',
        'footer.contact.city': 'Parigi, Île-de-France',
        'footer.copyright': '© 2026 NCP. Tutti i diritti riservati.',

        'home.hero.title.line1': 'Trasporto Premium',
        'home.hero.title.line2': 'a Parigi',
        'home.hero.subtitle': "Scoprite l'eccellenza del trasporto premium parigino. Flotta esclusiva Mercedes-Benz, autisti esperti e servizio personalizzato 24/7 per tutti i vostri spostamenti professionali e privati nella capitale e dintorni.",
        'home.hero.cta.book': 'Prenota ora',
        'home.hero.cta.vehicles': 'Scopri i nostri veicoli',

        'home.about.title': 'Chi siamo - NCP',
        'home.about.subtitle': 'Una storia di eccellenza e passione per il trasporto premium',
        'home.about.p1': "Fondata nel 2014, NCP è nata da una visione semplice: offrire a Parigi un servizio di trasporto premium che unisca eleganza, puntualità e discrezione. Nel 2026, questo rappresenta già più di 10 anni di esperienza, costruiti su valori solidi: l'eccellenza del servizio, il rispetto del cliente e l'innovazione costante.",
        'home.about.p2': "La nostra flotta esclusiva di veicoli Mercedes-Benz è mantenuta da professionisti certificati. Ogni veicolo viene ispezionato prima di ogni corsa per garantire la vostra sicurezza e il vostro comfort. I nostri autisti, tutti professionisti esperti, conoscono perfettamente Parigi e dintorni, garantendovi tragitti ottimizzati e senza stress.",
        'home.about.p3': "Siate voi un dirigente d'azienda, un artista, un diplomatico o semplicemente qualcuno che apprezza il lusso e il comfort, NCP si impegna a offrirvi un'esperienza di trasporto indimenticabile. Serviamo una clientela esigente che apprezza la qualità, la discrezione e il professionalismo.",
        'home.about.stats.years': 'Anni di esperienza',
        'home.about.stats.clients': 'Clienti soddisfatti',
        'home.about.stats.trips': 'Viaggi realizzati',
        'home.about.stats.satisfaction': 'Tasso di soddisfazione',

        'home.why.title': 'Perché NCP',
        'home.why.subtitle': 'Cosa ci distingue nel trasporto premium parigino',
        'home.why.card1.title': 'Esperienza',
        'home.why.card1.text': "Oltre 10 anni di esperienza nel trasporto premium parigino. Reputazione solida stabilita con dirigenti d'azienda, artisti, diplomatici e clienti esigenti che apprezzano qualità e professionalità.",
        'home.why.card2.title': 'Discrezione',
        'home.why.card2.text': 'Riservatezza assoluta garantita per tutti i vostri spostamenti. Tutti i nostri autisti sono soggetti a una stretta clausola di riservatezza e rispettano la vostra privacy in tutte le circostanze.',
        'home.why.card3.title': 'Flotta Premium',
        'home.why.card3.text': 'Flotta esclusiva di veicoli Mercedes-Benz recenti (Classe E, Classe S, Classe V). Mantenuti da professionisti certificati Mercedes-Benz. Ispezione completa prima di ogni corsa per garantire sicurezza e comfort ottimali.',
        'home.why.card4.title': 'Servizio Personalizzato',
        'home.why.card4.text': 'Servizio su misura adattato alle vostre esigenze specifiche. Preferenze memorizzate (temperatura, musica, itinerari), accoglienza personalizzata e attenzione particolare a ogni dettaglio per un\'esperienza unica.',
        'home.why.card5.title': 'Tecnologia Moderna',
        'home.why.card5.text': 'Prenotazione online semplice e rapida, monitoraggio GPS in tempo reale del vostro veicolo, notifiche automatiche via SMS e email. Sistema di gestione moderno per un servizio ottimale e reattivo.',
        'home.why.card6.title': 'Eccellenza Garantita',
        'home.why.card6.text': '98% di tasso di soddisfazione del cliente. Impegno a superare le vostre aspettative ad ogni viaggio. Servizio clienti dedicato disponibile 24/7 per rispondere a tutte le vostre esigenze e garantire la vostra piena soddisfazione.',

        'home.gallery.title': 'Galleria',
        'home.gallery.subtitle': 'Scoprite la nostra flotta e i nostri veicoli in immagini',
        'home.gallery.caption.eInterior': 'Interni Classe E',
        'home.gallery.caption.sInterior': 'Interni Classe S',
        'home.gallery.caption.vInterior': 'Interni Classe V',
        'home.gallery.caption.driver': 'Autista Professionale',
        'home.gallery.caption.vehicleAction': 'Veicolo in azione',
        'home.gallery.caption.equipment': 'Equipaggiamento Premium',

        'home.testimonials.title': 'Testimonianze',
        'home.testimonials.subtitle': 'Cosa dicono i nostri clienti del nostro servizio',
        'home.testimonials.t1.text': '"Servizio impeccabile da diversi anni. Autista sempre puntuale, professionale e di una discrezione assoluta. Veicolo perfettamente mantenuto e confortevole. NCP è diventato il mio partner di fiducia per tutti i miei spostamenti professionali a Parigi."',
        'home.testimonials.t1.name': 'Marie D.',
        'home.testimonials.t1.role': 'Direttrice Marketing',
        'home.testimonials.t2.text': '"Uso NCP regolarmente per i miei spostamenti di lavoro da 3 anni. Servizio impeccabile ogni volta, veicoli sempre impeccabili e lussuosi, autisti esperti che conoscono perfettamente Parigi e i migliori itinerari. Un servizio premium che giustifica il suo prezzo."',
        'home.testimonials.t2.name': 'Pierre L.',
        'home.testimonials.t2.role': 'CEO, Azienda Tech',
        'home.testimonials.t3.text': '"Per il nostro matrimonio, abbiamo scelto NCP per trasportare i nostri invitati. La Classe V era magnifica, gli interni premium impeccabili e il servizio assolutamente perfetto. I nostri invitati sono stati impressionati dal professionalismo e dall\'eleganza. Una scelta perfetta per il nostro grande giorno."',
        'home.testimonials.t3.name': 'Sophie e Thomas',
        'home.testimonials.t3.role': 'Clienti Premium',

        'home.guarantees.title': 'I nostri impegni',
        'home.guarantees.g1.title': 'Soddisfazione',
        'home.guarantees.g1.text': 'Impegno di qualità ad ogni viaggio',
        'home.guarantees.g2.title': 'Disponibilità',
        'home.guarantees.g2.text': 'Servizio disponibile a qualsiasi ora',
        'home.guarantees.g3.title': 'Anni',
        'home.guarantees.g3.text': 'Di esperienza a Parigi',
        'home.guarantees.g4.title': 'Clienti',
        'home.guarantees.g4.text': 'Clienti fedeli soddisfatti',

        'home.cta.title': 'Pronto a prenotare il tuo viaggio?',
        'home.cta.subtitle': 'Prenota online in pochi clic o contattaci direttamente',
        'home.cta.ctaBook': 'Prenota ora',
        'home.cta.ctaContact': 'Contattaci',

        'contact.title': 'Contatto',
        'contact.subtitle': "Il nostro team è disponibile 24 ore su 24, 7 giorni su 7 per rispondere a tutte le vostre domande, gestire le vostre prenotazioni e proporvi la soluzione di trasporto premium più adatta alle vostre esigenze specifiche. Non esitate a contattarci per un preventivo personalizzato.",
        'contact.phone.title': 'Telefono',
        'contact.phone.note': 'Disponibile 24/7',
        'contact.email.title': 'Email',
        'contact.email.note': 'Risposta garantita entro 24 ore',
        'contact.zone.title': "Zona d'intervento",
        'contact.zone.city': 'Parigi e Île-de-France',
        'contact.zone.note': 'Servizio disponibile su tutta la regione parigina, aeroporti (CDG, Orly, Le Bourget) e dipartimenti limitrofi',

        'contact.faq.title': 'Domande frequenti',
        'contact.faq.subtitle': 'Tutte le risposte alle vostre domande sui nostri servizi',

        'contact.faq.q1.title': 'Come prenotare un viaggio?',
        'contact.faq.q1.text': 'Potete prenotare in tre modi: tramite il nostro modulo online su questo sito, per telefono allo +33 1 XX XX XX XX, o per email a contact@ncp.fr. Per prenotazioni urgenti consigliamo la chiamata telefonica.',
        'contact.faq.q2.title': 'Quali metodi di pagamento accettate?',
        'contact.faq.q2.text': 'Accettiamo pagamenti con carta bancaria (Visa, Mastercard, American Express), bonifico bancario, contanti e assegno. Per le imprese, offriamo fatturazione con pagamento dilazionato secondo le vostre condizioni.',
        'contact.faq.q3.title': 'Posso annullare o modificare la mia prenotazione?',
        'contact.faq.q3.text': 'Sì, potete annullare o modificare la vostra prenotazione fino a 2 ore prima dell\'orario previsto senza costi. Per annullamenti con meno di 2 ore di anticipo, possono applicarsi costi di cancellazione. Contattateci per eventuali modifiche.',
        'contact.faq.q4.title': 'I vostri veicoli sono assicurati?',
        'contact.faq.q4.text': 'Assolutamente. Tutti i nostri veicoli sono assicurati con copertura completa inclusa responsabilità civile, assicurazione casco e assicurazione passeggeri. Rispettiamo tutti gli standard legali vigenti.',
        'contact.faq.q5.title': 'Offrite servizi per gli aeroporti?',
        'contact.faq.q5.text': 'Sì, offriamo transfer da e per gli aeroporti CDG, Orly e Le Bourget. Eseguiamo il monitoraggio dei voli per assicurarci di essere presenti al vostro arrivo, anche in caso di ritardo. Assistenza bagagli inclusa.',
        'contact.faq.q6.title': 'I vostri autisti parlano inglese?',
        'contact.faq.q6.text': 'Sì, tutti i nostri autisti parlano fluentemente francese e inglese. Alcuni parlano anche altre lingue (spagnolo, tedesco, italiano). Non esitate a indicarci le vostre preferenze al momento della prenotazione.',
        'contact.faq.q7.title': "Quali sono gli orari di servizio?",
        'contact.faq.q7.text': 'Siamo disponibili 24 ore su 24, 7 giorni su 7. Che si tratti di un viaggio di prima mattina, tarda serata o persino di notte, il nostro servizio è sempre disponibile per soddisfare le vostre esigenze.',
        'contact.faq.q8.title': 'Posso prenotare per più persone?',
        'contact.faq.q8.text': 'Assolutamente. Possiamo organizzare trasporti per gruppi. La nostra Classe V può ospitare fino a 8 passeggeri. Per gruppi più numerosi, possiamo coordinare più veicoli. Contattateci per un preventivo personalizzato.'
    }
};

function getCurrentLanguage() {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && AVAILABLE_LANGS.includes(saved)) {
        return saved;
    }
    return 'fr';
}

function t(key) {
    const lang = getCurrentLanguage();
    const dict = translations[lang] || translations.fr;
    return dict[key] || translations.fr[key] || key;
}

function applyLanguage(lang) {
    const langToApply = AVAILABLE_LANGS.includes(lang) ? lang : 'fr';
    const dict = translations[langToApply] || translations.fr;
    const fallback = translations.fr;

    // Mettre à jour l’attribut lang du HTML
    document.documentElement.lang = langToApply;

    // Appliquer les traductions
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        const attr = el.getAttribute('data-i18n-attr') || 'text';
        const value = dict[key] || fallback[key];
        if (!value) return;

        if (attr === 'text') {
            el.textContent = value;
        } else if (attr === 'placeholder') {
            el.setAttribute('placeholder', value);
        } else if (attr === 'html') {
            el.innerHTML = value;
        }
    });

    // Mettre à jour l’état actif des boutons de langue
    document.querySelectorAll('.lang-btn').forEach((btn) => {
        const btnLang = btn.getAttribute('data-lang');
        if (btnLang === langToApply) {
            btn.classList.add('lang-btn--active');
        } else {
            btn.classList.remove('lang-btn--active');
        }
    });
}

function initLanguageSwitcher() {
    const currentLang = getCurrentLanguage();
    applyLanguage(currentLang);

    document.querySelectorAll('.lang-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            if (!lang || !AVAILABLE_LANGS.includes(lang)) return;
            localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
            applyLanguage(lang);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initLanguageSwitcher();
});

// Gestion du formulaire de réservation (uniquement sur les pages où il existe)
const reservationForm = document.getElementById('reservationForm');
const reservationSuccessBlock = document.getElementById('reservationSuccessBlock');
const reservationErrorMessage = document.getElementById('reservationErrorMessage');

function showReservationError(message) {
    if (!reservationErrorMessage) return;
    reservationErrorMessage.textContent = message;
    reservationErrorMessage.removeAttribute('hidden');
}

function hideReservationError() {
    if (!reservationErrorMessage) return;
    reservationErrorMessage.textContent = '';
    reservationErrorMessage.setAttribute('hidden', '');
}

// Toast de succès (notification visuelle premium)
function showReservationToast(message) {
    if (!message) return;

    let container = document.getElementById('ncpToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'ncpToastContainer';
        container.style.position = 'fixed';
        container.style.bottom = '24px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.background = '#111827';
    toast.style.color = '#ffffff';
    toast.style.padding = '10px 18px';
    toast.style.borderRadius = '999px';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
    toast.style.fontSize = '13px';
    toast.style.fontWeight = '500';
    toast.style.maxWidth = '360px';
    toast.style.textAlign = 'center';
    toast.style.margin = '0 auto';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    toast.style.pointerEvents = 'auto';

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => {
            toast.remove();
            if (!container.childElementCount) {
                container.remove();
            }
        }, 250);
    }, 4000);
}

if (reservationForm) {
    reservationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideReservationError();

        const formData = new FormData(reservationForm);
        const data = Object.fromEntries(formData);

        // Enrichir avec les coordonnées (data-*) pour futur calcul de prix / emails
        if (departInput) {
            const lat = departInput.getAttribute('data-lat');
            const lon = departInput.getAttribute('data-lon');
            if (lat != null) data.departLat = lat;
            if (lon != null) data.departLon = lon;
        }
        if (destinationInput) {
            const lat = destinationInput.getAttribute('data-lat');
            const lon = destinationInput.getAttribute('data-lon');
            if (lat != null) data.destinationLat = lat;
            if (lon != null) data.destinationLon = lon;
        }

        // Validation adaptée au mode : véhicule requis seulement en mode sur-mesure
        const mode = typeof detectReservationMode === 'function' ? detectReservationMode() : 'surmesure';
        const vehiculeRequired = mode === 'surmesure';
        
        if (!data.nom || !data.telephone || !data.email || !data.date || !data.heure || !data.depart || !data.destination) {
            showReservationError(t('form.error.required'));
            return;
        }
        if (vehiculeRequired && !data.vehicule) {
            showReservationError('Veuillez sélectionner un véhicule.');
            return;
        }

        const submitBtn = document.getElementById('reservationDevisBtn');
        const originalBtnText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = t('form.sending');
        }

        try {
            const response = await fetch('/api/reservation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            let result;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                result = { success: false, message: 'Réponse invalide du serveur.' };
            }

            if (result.success) {
                // Envoi d'un email de confirmation premium via /api/send-confirmation
                try {
                    fetch('/api/send-confirmation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nom: data.nom,
                            email: data.email,
                            sujet: 'NCP - Confirmation de votre réservation',
                            message: data.message || '',
                            contexte: `Réservation NCP — ${data.date} ${data.heure} (${data.depart} → ${data.destination})`
                        })
                    }).catch((err) => {
                        console.error('Erreur appel /api/send-confirmation :', err);
                    });
                } catch (err) {
                    console.error('Erreur lors de la préparation de /api/send-confirmation :', err);
                }

                reservationForm.classList.add('is-hidden');
                if (reservationSuccessBlock) {
                    reservationSuccessBlock.removeAttribute('hidden');
                    requestAnimationFrame(() => {
                        reservationSuccessBlock.classList.add('is-visible');
                    });
                }
                reservationForm.reset();
                window.scrollTo({ top: reservationForm.offsetTop - 100, behavior: 'smooth' });

                // Toast de succès pour informer que l'email de confirmation arrive
                try {
                    showReservationToast(t('reservation.success.text'));
                } catch {
                    showReservationToast('Merci pour votre réservation. Votre email de confirmation arrive dans quelques instants.');
                }
            } else {
                showReservationError(result.message || t('form.error.generic'));
            }
        } catch (err) {
            console.error(err);
            showReservationError(t('form.error.connection'));
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    });
}

// Bouton « Payer » sur la page réservation : appelle /create-checkout-session puis stripe.redirectToCheckout
const reservationPayBtn = document.getElementById('reservationPayBtn');
if (reservationPayBtn && reservationForm) {
    reservationPayBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        hideReservationError();

        const nom = (reservationForm.querySelector('#nom') || {}).value || '';
        const email = (reservationForm.querySelector('#email') || {}).value || '';
        const depart = (reservationForm.querySelector('#depart') || {}).value || '';
        const destination = (reservationForm.querySelector('#destination') || {}).value || '';
        const dateTrajet = (reservationForm.querySelector('#date') || {}).value || '';
        const heureTrajet = (reservationForm.querySelector('#heure') || {}).value || '';

        if (!nom.trim() || !email.trim() || !depart.trim() || !destination.trim()) {
            showReservationError(typeof t === 'function' ? t('form.error.required') : 'Veuillez remplir nom, email, lieu de départ et destination.');
            return;
        }

        const passagersRaw = parseInt((reservationForm.querySelector('#passagers') || {}).value, 10);
        const passengers = Number.isFinite(passagersRaw) && passagersRaw > 0 ? passagersRaw : 1;

        reservationPayBtn.disabled = true;
        const originalText = reservationPayBtn.textContent;
        reservationPayBtn.textContent = 'Redirection vers le paiement...';

        try {
            const res = await fetch('/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nom: nom.trim(),
                    email: email.trim(),
                    depart: depart.trim(),
                    destination: destination.trim(),
                    date: dateTrajet.trim(),
                    heure: heureTrajet.trim(),
                    passengers
                })
            });
            const data = await res.json().catch(() => ({}));

            if (data.sessionId && typeof Stripe !== 'undefined') {
                const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
                stripe.redirectToCheckout({ sessionId: data.sessionId }).then((result) => {
                    if (result.error) {
                        reservationPayBtn.disabled = false;
                        reservationPayBtn.textContent = originalText;
                        showReservationError(result.error.message || 'Erreur de redirection Stripe.');
                    }
                });
                return;
            }
            if (data.url) {
                window.location.href = data.url;
                return;
            }
            reservationPayBtn.disabled = false;
            reservationPayBtn.textContent = originalText;
            showReservationError(data.error || 'Impossible de créer la session de paiement.');
        } catch (err) {
            console.error(err);
            reservationPayBtn.disabled = false;
            reservationPayBtn.textContent = originalText;
            showReservationError(typeof t === 'function' ? t('form.error.connection') : 'Erreur de connexion. Veuillez réessayer.');
        }
    });
}

// Autocomplétion d'adresse (API adresse.data.gouv.fr) pour les champs départ / destination
const departInput = document.getElementById('depart');
const destinationInput = document.getElementById('destination');

function createAdresseAutocomplete(input) {
    if (!input) return;

    const wrapper = input.closest('.form-group') || input.parentElement;
    if (!wrapper) return;

    if (!wrapper.style.position) {
        wrapper.style.position = 'relative';
    }

    const suggestions = document.createElement('div');
    suggestions.className = 'reservation-address-suggestions';
    suggestions.setAttribute('role', 'listbox');
    suggestions.hidden = true;
    wrapper.appendChild(suggestions);

    let debounceId = null;
    let currentController = null;

    function clearSuggestions() {
        suggestions.innerHTML = '';
        suggestions.setAttribute('hidden', '');
    }

    async function fetchSuggestions(query) {
        if (currentController) {
            currentController.abort();
        }
        currentController = new AbortController();
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&autocomplete=1`;

        try {
            const resp = await fetch(url, { signal: currentController.signal });
            if (!resp.ok) {
                clearSuggestions();
                return;
            }
            const data = await resp.json();
            const features = (data && data.features) || [];
            console.log('Données reçues de l\'API:', data.features);

            suggestions.innerHTML = '';
            suggestions.removeAttribute('hidden');

            features.forEach((feature) => {
                const label = feature && feature.properties && feature.properties.label;
                const coords = feature && feature.geometry && feature.geometry.coordinates;
                if (!label) return;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'reservation-address-suggestion';
                btn.setAttribute('role', 'option');
                btn.textContent = label;
                btn.addEventListener('click', () => {
                    input.value = label;
                    if (coords && Array.isArray(coords) && coords.length >= 2) {
                        const lon = coords[0];
                        const lat = coords[1];
                        input.setAttribute('data-lon', String(lon));
                        input.setAttribute('data-lat', String(lat));
                    } else {
                        input.removeAttribute('data-lat');
                        input.removeAttribute('data-lon');
                    }
                    clearSuggestions();
                    input.focus();
                });
                suggestions.appendChild(btn);
            });

            if (!suggestions.childElementCount) {
                suggestions.setAttribute('hidden', '');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Erreur API adresse.data.gouv.fr:', err);
            }
            clearSuggestions();
        }
    }

    input.addEventListener('input', () => {
        const value = input.value && input.value.trim();
        if (debounceId) {
            clearTimeout(debounceId);
        }
        if (!value || value.length < 3) {
            clearSuggestions();
            input.removeAttribute('data-lat');
            input.removeAttribute('data-lon');
            return;
        }
        debounceId = setTimeout(() => {
            fetchSuggestions(value);
        }, 250);
    });

    input.addEventListener('blur', () => {
        // Laisser le temps de cliquer sur une suggestion
        setTimeout(() => {
            clearSuggestions();
        }, 180);
    });
}

createAdresseAutocomplete(departInput);
createAdresseAutocomplete(destinationInput);

// Animation au scroll OPTIMISÉE avec requestAnimationFrame
const observerOptions = {
    threshold: 0.05,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            requestAnimationFrame(() => {
                entry.target.classList.add('animate');
                if (entry.target.classList.contains('service-card') || 
                    entry.target.classList.contains('why-us-card') ||
                    entry.target.classList.contains('testimonial-card') ||
                    entry.target.classList.contains('pricing-card') ||
                    entry.target.classList.contains('contact-card')) {
                    entry.target.classList.add('revealed');
                }
                if (entry.target.classList.contains('guarantee-item') ||
                    entry.target.classList.contains('gallery-item') ||
                    entry.target.classList.contains('step-item') ||
                    entry.target.classList.contains('faq-item')) {
                    entry.target.classList.add('revealed');
                }
                // Animation fluide avec requestAnimationFrame
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0) scale(1)';
                entry.target.style.filter = 'blur(0)';
            });
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observer les cartes de véhicules avec délai
document.querySelectorAll('.vehicule-card').forEach((card, index) => {
    observer.observe(card);
    card.style.transitionDelay = `${index * 0.15}s`;
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
});

// Observer les cartes de contact avec délai
document.querySelectorAll('.contact-card').forEach((card, index) => {
    observer.observe(card);
    card.style.transitionDelay = `${index * 0.15}s`;
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
});

// Observer les feature items
document.querySelectorAll('.feature-item').forEach((item, index) => {
    item.style.transitionDelay = `${index * 0.2}s`;
    observer.observe(item);
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
});

// Observer les service cards avec animations
document.querySelectorAll('.service-card').forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.15}s`;
    observer.observe(card);
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
});

// Observer les why-us cards avec animations
document.querySelectorAll('.why-us-card').forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.12}s`;
    observer.observe(card);
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
});

// Observer les testimonial cards avec animations
document.querySelectorAll('.testimonial-card').forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.18}s`;
    observer.observe(card);
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
});

// Observer les guarantee items avec animations
document.querySelectorAll('.guarantee-item').forEach((item, index) => {
    item.style.transitionDelay = `${index * 0.15}s`;
    observer.observe(item);
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px) scale(0.95)';
});

// Observer les pricing cards
document.querySelectorAll('.pricing-card').forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.15}s`;
    observer.observe(card);
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
});

// Observer les gallery items
document.querySelectorAll('.gallery-item').forEach((item, index) => {
    item.style.transitionDelay = `${index * 0.1}s`;
    observer.observe(item);
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px) scale(0.95)';
});

// Observer les step items
document.querySelectorAll('.step-item').forEach((item, index) => {
    item.style.transitionDelay = `${index * 0.15}s`;
    observer.observe(item);
    item.style.opacity = '0';
    item.style.transform = 'translateY(30px)';
});

// Observer les FAQ items
document.querySelectorAll('.faq-item').forEach((item, index) => {
    item.style.transitionDelay = `${index * 0.1}s`;
    observer.observe(item);
    item.style.opacity = '0';
    item.style.transform = 'translateY(10px)';
});

// Observer les sections pour animations
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
        }
    });
}, { threshold: 0.2 });

document.querySelectorAll('section').forEach(section => {
    sectionObserver.observe(section);
});

// Observer les titres de section pour animer la ligne décorative
const sectionTitleObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.section-title').forEach(title => {
    sectionTitleObserver.observe(title);
});

// Gestion OPTIMISÉE des images avec fluidité
document.addEventListener('DOMContentLoaded', () => {
    // Précharger les images critiques en premier
    const criticalImages = [
        '/images/vehicule-action.jpg',
        '/images/classe-e.png',
        '/images/classe-s.png',
        '/images/viano.png'
    ];
    
    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
    
    // Fonction pour charger une image avec transition fluide
    function loadImage(img) {
        if (!img.src) return;
        
        // Si déjà chargée, afficher immédiatement
        if (img.complete && img.naturalHeight !== 0) {
            requestAnimationFrame(() => {
                img.style.opacity = '1';
                img.style.display = 'block';
                img.style.visibility = 'visible';
                img.classList.add('loaded');
            });
            return;
        }
        
        // Afficher immédiatement avec placeholder
        img.style.opacity = '1';
        img.style.display = 'block';
        img.style.visibility = 'visible';
        
        // Gérer le chargement
        img.addEventListener('load', function() {
            requestAnimationFrame(() => {
                this.classList.add('loaded');
                this.style.opacity = '1';
            });
        }, { once: true });
        
        // Gérer les erreurs avec fallback
        img.addEventListener('error', function() {
            const src = this.src;
            console.warn('Image non trouvée:', src);
            
            // Fallbacks
            if (src.includes('equipements.webp')) {
                this.src = '/images/equipements.jpg';
            } else if (src.includes('interieur-classe-e.png')) {
                this.src = '/images/classe-e.png';
            } else if (src.includes('interieur-classe-s.jpg')) {
                this.src = '/images/classe-s.png';
            } else if (src.includes('interieur-viano.jpg')) {
                this.src = '/images/viano.png';
            } else if (src.includes('vehicule-action.jpg')) {
                this.src = '/images/classe-e.png';
            }
        }, { once: true });
    }
    
    // Charger toutes les images
    const allImages = document.querySelectorAll('img');
    allImages.forEach(loadImage);
    
    // Observer pour lazy loading optimisé
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                requestAnimationFrame(() => {
                    img.style.opacity = '1';
                    img.style.display = 'block';
                    img.style.visibility = 'visible';
                    img.classList.add('loaded');
                });
                imageObserver.unobserve(img);
            }
        });
    }, { 
        threshold: 0.01,
        rootMargin: '100px'
    });
    
    // Observer les images lazy
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        if (img.complete && img.naturalHeight !== 0) {
            img.style.opacity = '1';
            img.style.display = 'block';
            img.classList.add('loaded');
        } else {
            imageObserver.observe(img);
        }
    });
});

// Date minimum pour le champ date (aujourd'hui)
const dateInput = document.getElementById('date');
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}

// Effet parallaxe OPTIMISÉ avec requestAnimationFrame
let ticking = false;
function updateParallax() {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    const heroContent = document.querySelector('.hero-content');
    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const btnPrimary = document.querySelector('.btn-primary');
    
    if (hero && scrolled < window.innerHeight) {
        const parallaxSpeed = 0.3;
        const fadeSpeed = 0.4;
        
        hero.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
        hero.style.opacity = Math.max(0.3, 1 - (scrolled / window.innerHeight) * fadeSpeed);
        
        if (heroContent) {
            heroContent.style.transform = `translateY(${scrolled * 0.1}px)`;
        }
        
        if (heroTitle) {
            heroTitle.style.transform = `translateY(${scrolled * 0.15}px)`;
            heroTitle.style.opacity = Math.max(0.5, 1 - (scrolled / window.innerHeight) * 0.6);
        }
        
        if (heroSubtitle) {
            heroSubtitle.style.transform = `translateY(${scrolled * 0.1}px)`;
            heroSubtitle.style.opacity = Math.max(0.6, 1 - (scrolled / window.innerHeight) * 0.7);
        }
        
        if (btnPrimary) {
            btnPrimary.style.transform = `translateY(${scrolled * 0.08}px)`;
            btnPrimary.style.opacity = Math.max(0.7, 1 - (scrolled / window.innerHeight) * 0.8);
        }
    }
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
    }
}, { passive: true });

// Parallaxe OPTIMISÉ pour les sections de véhicules
let vehicleTicking = false;
function updateVehicleParallax() {
    const scrolled = window.pageYOffset;
    const vehiculesSection = document.querySelector('.vehicules');
    const vehiculeCards = document.querySelectorAll('.vehicule-card');
    
    if (vehiculesSection && vehiculeCards.length > 0) {
        const rect = vehiculesSection.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        
        if (isVisible) {
            const scrollProgress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / window.innerHeight));
            
            vehiculeCards.forEach((card, index) => {
                const delay = index * 0.1;
                const offset = (scrollProgress - delay) * 20;
                if (offset > 0 && offset < 20) {
                    requestAnimationFrame(() => {
                        card.style.transform = `translateY(${-offset}px)`;
                    });
                }
            });
        }
    }
    vehicleTicking = false;
}

window.addEventListener('scroll', () => {
    if (!vehicleTicking) {
        requestAnimationFrame(updateVehicleParallax);
        vehicleTicking = true;
    }
}, { passive: true });

// Toggle Dark/Light Mode - Initialisation immédiate (sans classe inutile)
(function() {
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateFavicon(savedTheme);
    updateLogo(savedTheme);
    updateFooterLogo(savedTheme);
})();

// Met à jour le favicon en fonction du thème
function updateFavicon(theme) {
    const href = theme === 'dark' ? '/images/favicon_black.png' : '/images/favicon_white.png';
    
    // Si le lien n'existe pas (ou est mal nommé), on le crée
    let favicon = document.getElementById('favicon');
    if (!favicon) {
        favicon = document.createElement('link');
        favicon.id = 'favicon';
        favicon.rel = 'icon';
        favicon.type = 'image/png';
        document.head.appendChild(favicon);
    }
    
    favicon.href = href;
}

// Met à jour le logo de la navbar en fonction du thème
function updateLogo(theme) {
    const logo = document.getElementById('navbarLogo');
    if (!logo) return;
    logo.src = theme === 'dark' ? '/images/favicon_black.png' : '/images/favicon_white.png';
}

// Met à jour le logo du footer en fonction du thème
function updateFooterLogo(theme) {
    const footerLogo = document.getElementById('footerLogo');
    if (!footerLogo) return;
    footerLogo.src = theme === 'dark' ? '/images/favicon_black.png' : '/images/favicon_white.png';
}

// Toggle Dark/Light Mode - Fonction globale
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    
    if (themeToggle) {
        // Éviter les doubles listeners
        const newToggle = themeToggle.cloneNode(true);
        themeToggle.parentNode.replaceChild(newToggle, themeToggle);
        
        newToggle.addEventListener('click', () => {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            // Transition fluide
            html.style.transition = 'background-color 0.5s ease, color 0.5s ease';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // Mettre à jour le favicon
            updateFavicon(newTheme);
            // Mettre à jour les logos
            updateLogo(newTheme);
            updateFooterLogo(newTheme);
            
            // Mettre à jour la navbar immédiatement
            updateNavbarTheme(newTheme);
            
            // Animation du bouton
            newToggle.style.transform = 'scale(0.9) rotate(180deg)';
            setTimeout(() => {
                newToggle.style.transform = 'scale(1) rotate(0deg)';
            }, 200);
            
            // Forcer le reflow pour la transition
            void html.offsetHeight;
        });
    }
    
    // Fonction pour mettre à jour la navbar selon le thème
    function updateNavbarTheme(theme) {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.style.transition = 'background 0.5s ease, box-shadow 0.5s ease';
            if (theme === 'dark') {
                navbar.style.background = 'rgba(10, 10, 10, 0.98)';
                navbar.style.boxShadow = '0 2px 30px rgba(0, 0, 0, 0.5)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.03)';
            }
        }
    }
    
    // Initialiser la navbar au chargement
    const currentTheme = html.getAttribute('data-theme') || 'light';
    html.setAttribute('data-theme', currentTheme);
    updateNavbarTheme(currentTheme);
}

// Initialiser le toggle (script chargé en bas de page, le DOM est prêt)
initThemeToggle();

// Changement de couleur de la navbar au scroll avec animation
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    
    if (window.scrollY > 100) {
        if (isDark) {
            navbar.style.background = 'rgba(10, 10, 10, 0.98)';
            navbar.style.boxShadow = '0 5px 30px rgba(0, 0, 0, 0.6)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 5px 30px rgba(0, 0, 0, 0.08)';
        }
    } else {
        if (isDark) {
            navbar.style.background = 'rgba(10, 10, 10, 0.98)';
            navbar.style.boxShadow = '0 2px 30px rgba(0, 0, 0, 0.5)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.03)';
        }
    }
});

// Animation de révélation progressive pour les sections
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('revealed');
            }, index * 100);
            revealObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

// Observer toutes les sections avec classes reveal
document.querySelectorAll('.reveal-bottom, .reveal-left, .reveal-right').forEach(el => {
    revealObserver.observe(el);
});

// Animation des compteurs (about-stats, garanties)
function initCounters() {
    const counters = document.querySelectorAll('.stat-number, .guarantee-number');
    counters.forEach(counter => {
        const raw = counter.textContent.trim().replace('+', '').replace('%', '');
        const target = parseInt(raw, 10);
        if (isNaN(target)) return;
        counter.dataset.target = target.toString();
        counter.textContent = '0';
    });

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = parseInt(el.dataset.target, 10);
            if (isNaN(target)) return;

            let current = 0;
            const duration = 1200;
            const start = performance.now();

            function tick(now) {
                const progress = Math.min(1, (now - start) / duration);
                current = Math.floor(target * progress);
                el.textContent = current.toString() + (el.textContent.includes('%') ? '%' : (el.dataset.suffix || ''));
                if (progress < 1) {
                    requestAnimationFrame(tick);
                } else {
                    // remettre le + ou % selon le texte initial
                    if (el.closest('.about-stats')) {
                        el.textContent = target + '+';
                    } else if (el.textContent.indexOf('%') === -1 && entry.target.innerHTML.indexOf('%') !== -1) {
                        el.textContent = target + '%';
                    }
                }
            }

            requestAnimationFrame(tick);
            counterObserver.unobserve(el);
        });
    }, { threshold: 0.6 });

    counters.forEach(c => counterObserver.observe(c));
}

initCounters();

// Animation de texte progressif style Apple
function animateTextProgressively(element, delay = 0) {
    const text = element.textContent;
    element.textContent = '';
    element.style.opacity = '1';
    
    text.split('').forEach((char, index) => {
        setTimeout(() => {
            element.textContent += char;
        }, delay + index * 30);
    });
}

// Effet de hover sobre sur les cartes de véhicules
document.querySelectorAll('.vehicule-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-8px) scale(1.01)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
    });
});

// Les boutons (.btn-primary, .btn-submit) sont désormais gérés 100% en CSS
// pour éviter tout conflit entre animation initiale et hover.

// Smooth reveal pour les titres de section
const sectionTitles = document.querySelectorAll('.section-title');
sectionTitles.forEach((title, index) => {
    title.style.opacity = '0';
    title.style.transform = 'translateY(30px)';
    title.style.filter = 'blur(10px)';
    title.style.transition = `all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.1}s`;
    
    const titleObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                entry.target.style.filter = 'blur(0)';
                titleObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    
    titleObserver.observe(title);
});

// Animation de compteur pour les garanties
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + (element.textContent.includes('%') ? '%' : '');
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current) + (element.textContent.includes('%') ? '%' : '');
        }
    }, 16);
}

// Observer les garanties pour animer les compteurs
const guaranteeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const numberElement = entry.target.querySelector('.guarantee-number');
            if (numberElement) {
                const text = numberElement.textContent;
                const number = parseInt(text.replace(/\D/g, ''));
                if (number) {
                    numberElement.textContent = '0' + (text.includes('%') ? '%' : '');
                    animateCounter(numberElement, number, 2000);
                }
            }
            guaranteeObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.guarantee-item').forEach(item => {
    guaranteeObserver.observe(item);
});

// FAQ Interactions
document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const faqItem = question.parentElement;
        const isActive = faqItem.classList.contains('active');
        
        // Fermer toutes les autres FAQ
        document.querySelectorAll('.faq-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Ouvrir/fermer celle-ci
        if (!isActive) {
            faqItem.classList.add('active');
        }
    });
});

// Observer les nouvelles sections pour animations
const newSectionsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            entry.target.classList.add('revealed');
            
            // Animer les éléments enfants
            if (entry.target.classList.contains('about-us')) {
                entry.target.querySelector('.about-text')?.classList.add('revealed');
                entry.target.querySelector('.about-image')?.classList.add('revealed');
            }
            
            if (entry.target.classList.contains('how-it-works')) {
                entry.target.querySelectorAll('.step-item').forEach((item, index) => {
                    setTimeout(() => {
                        item.classList.add('revealed');
                    }, index * 150);
                });
            }
            
            if (entry.target.classList.contains('pricing')) {
                entry.target.querySelectorAll('.pricing-card').forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('revealed');
                    }, index * 200);
                });
            }
            
            if (entry.target.classList.contains('gallery')) {
                entry.target.querySelectorAll('.gallery-item').forEach((item, index) => {
                    setTimeout(() => {
                        item.classList.add('revealed');
                    }, index * 100);
                });
            }
            
            if (entry.target.classList.contains('faq')) {
                entry.target.querySelectorAll('.faq-item').forEach((item, index) => {
                    setTimeout(() => {
                        item.classList.add('revealed');
                    }, index * 100);
                });
            }
            
            newSectionsObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

// Observer toutes les nouvelles sections
document.querySelectorAll('.about-us, .how-it-works, .pricing, .gallery, .faq').forEach(section => {
    newSectionsObserver.observe(section);
});

// Préremplissage réservation : exécuter aussi si le DOM est déjà prêt (ex: script en fin de body)
if (typeof fillReservationFromUrl === 'function') {
    if (document.readyState !== 'loading') {
        fillReservationFromUrl();
    } else {
        document.addEventListener('DOMContentLoaded', fillReservationFromUrl);
    }
}

