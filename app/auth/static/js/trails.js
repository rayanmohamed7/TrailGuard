// TrailGuard Trails Script

// Hardcoded trail data matching expected database schema structure
const trailsData = [
    {
        name: "Ngong Hills",
        difficulty: "moderate",
        distance_km: 12.0,
        elevation_m: 2460,
        image_url: "https://placehold.co/600x400/1e293b/10b981?text=Ngong+Hills",
        swimming_warning: false
    },
    {
        name: "Mt. Longonot",
        difficulty: "hard",
        distance_km: 13.5,
        elevation_m: 2776,
        image_url: "https://placehold.co/600x400/1e293b/ef4444?text=Mt.+Longonot",
        swimming_warning: false
    },
    {
        name: "Mt. Kenya",
        difficulty: "hard",
        distance_km: 52.0,
        elevation_m: 4985,
        image_url: "https://placehold.co/600x400/1e293b/ef4444?text=Mt.+Kenya",
        swimming_warning: false
    },
    {
        name: "Kereita Forest",
        difficulty: "moderate",
        distance_km: 9.0,
        elevation_m: 2200,
        image_url: "https://placehold.co/600x400/1e293b/10b981?text=Kereita+Forest",
        swimming_warning: true
    },
    {
        name: "Karura Forest",
        difficulty: "easy",
        distance_km: 10.0,
        elevation_m: 1680,
        image_url: "https://placehold.co/600x400/1e293b/3b82f6?text=Karura+Forest",
        swimming_warning: false
    },
    {
        name: "Hell's Gate",
        difficulty: "easy",
        distance_km: 21.0,
        elevation_m: 1880,
        image_url: "https://placehold.co/600x400/1e293b/3b82f6?text=Hell's+Gate",
        swimming_warning: false
    },
    {
        name: "Aberdare Ranges",
        difficulty: "hard",
        distance_km: 15.0,
        elevation_m: 3999,
        image_url: "https://placehold.co/600x400/1e293b/ef4444?text=Aberdare+Ranges",
        swimming_warning: true
    },
    {
        name: "Mount Suswa",
        difficulty: "moderate",
        distance_km: 11.0,
        elevation_m: 2356,
        image_url: "https://placehold.co/600x400/1e293b/10b981?text=Mount+Suswa",
        swimming_warning: false
    }
];

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search-input");
    const difficultySelect = document.getElementById("difficulty-select");
    const trailsGrid = document.getElementById("trails-grid");
    const noResults = document.getElementById("no-results");

    // Initialize display with all trails
    renderTrails(trailsData);

    // Event listeners
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

            // Determine difficulty class & text
            const diffClass = `badge-${trail.difficulty}`;
            const diffText = trail.difficulty.charAt(0).toUpperCase() + trail.difficulty.slice(1);

            // Swimming warning badge if applicable
            const warningBadge = trail.swimming_warning 
                ? `<span class="badge badge-warning">⚠️ No Swimming / Waterfall danger</span>` 
                : "";

            card.innerHTML = `
                <div class="trail-image-container">
                    <img class="trail-image" src="${trail.image_url}" alt="${trail.name}" loading="lazy">
                    <div class="trail-badges">
                        <span class="badge ${diffClass}">${diffText}</span>
                        ${warningBadge}
                    </div>
                </div>
                <div class="trail-details">
                    <h2 class="trail-name">${trail.name}</h2>
                    <div class="trail-meta">
                        <div class="meta-item">
                            <span class="meta-label">Distance</span>
                            <span class="meta-value">${trail.distance_km.toFixed(1)} km</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Elevation</span>
                            <span class="meta-value">${trail.elevation_m} m</span>
                        </div>
                    </div>
                </div>
            `;
            trailsGrid.appendChild(card);
        });
    }

    // Filter trails based on input criteria
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
