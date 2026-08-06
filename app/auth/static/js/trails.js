// TrailGuard Trails Script

// Base API URL configuration for development
const API_BASE = 'http://127.0.0.1:5000';

// Initially empty, will be populated by the fetch call
let trailsData = [];

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search-input");
    const difficultySelect = document.getElementById("difficulty-select");
    const trailsGrid = document.getElementById("trails-grid");
    const noResults = document.getElementById("no-results");
    
    // Modal elements
    const trailModal = document.getElementById("trail-modal");
    const modalClose = document.getElementById("modal-close");
    const modalContent = document.getElementById("modal-content");

    // Fetch trails from Flask API
    async function loadTrails() {
        try {
            const response = await fetch(`${API_BASE}/api/trails`);
            if (!response.ok) {
                throw new Error("HTTP error! status: " + response.status);
            }
            trailsData = await response.json();
            renderTrails(trailsData);
        } catch (error) {
            console.error("Failed to fetch trails from API:", error);
            // Display a user-friendly error message on the UI if API connection fails
            trailsGrid.innerHTML = `
                <div class="no-results" style="display: block; grid-column: 1 / -1; border-color: rgba(239, 68, 68, 0.3); background: rgba(30, 15, 15, 0.45);">
                    <h3 style="color: #f87171; font-family: 'Arvo', serif;">Unable to Load Trails</h3>
                    <p>Could not connect to the TrailGuard server. Please ensure the backend is running at <code>${API_BASE}</code> and try again.</p>
                </div>
            `;
        }
    }

    // Trigger dynamic fetch on load
    loadTrails();

    // Event listeners for instant search/filter
    searchInput.addEventListener("input", filterTrails);
    difficultySelect.addEventListener("change", filterTrails);

    // Render trails to DOM
    function renderTrails(trails) {
        trailsGrid.innerHTML = "";
        
        if (trails.length === 0) {
            noResults.style.display = "block";
            return;
        }
        
        noResults.style.display = "none";

        trails.forEach(trail => {
            const card = document.createElement("div");
            card.className = "trail-card";
            card.setAttribute("role", "button");
            card.setAttribute("tabindex", "0");
            card.setAttribute("aria-label", "View details for " + trail.name);

            // Difficulty badge
            const diffClass = "badge-diff-" + trail.difficulty;
            const diffText = trail.difficulty.charAt(0).toUpperCase() + trail.difficulty.slice(1);

            card.innerHTML = `
                <div class="trail-image-container">
                    <div class="trail-image-wrapper">
                        <img class="trail-image" src="${trail.image_url}" alt="${trail.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" loading="lazy">
                        <div class="trail-image-fallback" style="display: none;">
                            <span>🌲 ${trail.name}</span>
                        </div>
                    </div>
                    <div class="trail-badges-left">
                        <span class="badge ${diffClass}">${diffText}</span>
                    </div>
                </div>
                <div class="trail-details">
                    <h2 class="trail-name">${trail.name}</h2>
                    
                    <div class="trail-card-meta">
                        <div class="meta-item">
                            <span class="meta-label">Distance</span>
                            <span class="meta-value">${trail.distance_km.toFixed(1)} km</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Elevation</span>
                            <span class="meta-value">${trail.elevation_m} m</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Duration</span>
                            <span class="meta-value flex-align">
                                <svg class="clock-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                ${trail.duration_hours} hrs
                            </span>
                        </div>
                    </div>

                    <div class="tap-hint">
                        <span>Tap for details</span>
                        <svg class="arrow-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </div>
                </div>
            `;

            // Open modal on click
            card.addEventListener("click", () => openModal(trail));
            
            // Allow keyboard activation (Enter or Space) for accessibility
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openModal(trail);
                }
            });

            trailsGrid.appendChild(card);
        });
    }

    // Modal Control logic
    function openModal(trail) {
        // Difficulty badges
        const diffClass = "badge-diff-" + trail.difficulty;
        const diffText = trail.difficulty.charAt(0).toUpperCase() + trail.difficulty.slice(1);

        // Fitness level badge
        const fitnessClass = "badge-fit-" + trail.fitness_level;
        const fitnessText = trail.fitness_level.charAt(0).toUpperCase() + trail.fitness_level.slice(1);

        // Permits & Guides
        const guideHtml = trail.guide_required 
            ? `<span class="badge badge-guide">👮 Guide Required</span>` 
            : `<span class="badge badge-guide-optional">👤 Guide Optional</span>`;

        const permitHtml = trail.permit_required 
            ? `<span class="badge badge-permit-yes">🎫 Permit Required</span>` 
            : `<span class="badge badge-permit-no">🆓 Free Entry</span>`;

        const swimmingHtml = trail.swimming_warning 
            ? `<span class="badge badge-warning">⚠️ No Swimming / Waterfall Danger</span>` 
            : "";

        // Gear list tags
        const gearTagsHtml = (trail.gear_needed || []).map(g => `<span class="gear-tag">${g}</span>`).join('');

        // Populate Modal Content
        modalContent.innerHTML = `
            <div class="modal-hero">
                <div class="modal-image-wrapper">
                    <img class="modal-hero-image" src="${trail.image_url}" alt="${trail.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="modal-hero-fallback" style="display: none;">
                        <span>🌲 ${trail.name}</span>
                    </div>
                </div>
            </div>
            
            <div class="modal-body">
                <div class="modal-header-section">
                    <h1 class="modal-name">${trail.name}</h1>
                    <div class="modal-location">
                        <svg class="location-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>${trail.location}</span>
                    </div>
                </div>

                <!-- Badges Row -->
                <div class="modal-badges-row">
                    <span class="badge ${diffClass}">Diff: ${diffText}</span>
                    <span class="badge ${fitnessClass}">Fit: ${fitnessText}</span>
                    ${guideHtml}
                    ${permitHtml}
                    ${swimmingHtml}
                </div>

                <!-- Description -->
                <div class="modal-section">
                    <h3 class="modal-subtitle">Description</h3>
                    <p class="modal-desc-text">${trail.description}</p>
                </div>

                <!-- Key Specs Grid -->
                <div class="modal-specs-grid">
                    <div class="spec-card">
                        <span class="spec-label">Distance</span>
                        <span class="spec-value">${trail.distance_km.toFixed(1)} km</span>
                    </div>
                    <div class="spec-card">
                        <span class="spec-label">Elevation Gain</span>
                        <span class="spec-value">${trail.elevation_m} m</span>
                    </div>
                    <div class="spec-card">
                        <span class="spec-label">Est. Duration</span>
                        <span class="spec-value flex-align">
                            <svg class="clock-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${trail.duration_hours} hrs
                        </span>
                    </div>
                </div>

                <!-- Expanded Details Grid -->
                <div class="modal-details-grid">
                    <div class="detail-block">
                        <span class="detail-label">Starting Point</span>
                        <span class="detail-value">${trail.starting_point || "Main Gate"}</span>
                    </div>
                    <div class="detail-block">
                        <span class="detail-label">Best Season</span>
                        <span class="detail-value">${trail.best_season || "Dry Season"}</span>
                    </div>
                    <div class="detail-block">
                        <span class="detail-label">Waterfall Safety Status</span>
                        <span class="detail-value">${trail.waterfall_safety_status || "N/A"}</span>
                    </div>
                </div>

                <!-- Required Gear Section -->
                <div class="modal-section modal-gear-section">
                    <h3 class="modal-subtitle">Recommended Gear</h3>
                    <div class="modal-gear-tags">
                        ${gearTagsHtml || '<span class="gear-tag-none">No specific gear items listed</span>'}
                    </div>
                </div>
            </div>
        `;

        // Show modal and prevent background scrolling
        trailModal.style.display = "flex";
        document.body.style.overflow = "hidden";
        modalClose.focus();
    }

    function closeModal() {
        trailModal.style.display = "none";
        document.body.style.overflow = "";
    }

    // Modal closing event listeners
    modalClose.addEventListener("click", closeModal);
    
    // Close when clicking overlay background outside modal container
    trailModal.addEventListener("click", (e) => {
        if (e.target === trailModal) {
            closeModal();
        }
    });

    // Close on Escape key press
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && trailModal.style.display === "flex") {
            closeModal();
        }
    });

    // Filter trails based on input criteria (done client-side to keep performance snappy)
    function filterTrails() {
        const query = searchInput.value.toLowerCase().trim();
        const difficulty = difficultySelect.value.toLowerCase();

        const filtered = trailsData.filter(trail => {
            const matchesQuery = trail.name.toLowerCase().includes(query);
            const matchesDifficulty = difficulty === "all" || trail.difficulty === difficulty;
            return matchesQuery && matchesDifficulty;
        });

        renderTrails(filtered);
    }
});
