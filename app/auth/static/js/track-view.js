// TrailGuard Public Live Tracking Viewer

const API_BASE = 'http://127.0.0.1:5000';

document.addEventListener("DOMContentLoaded", () => {
    // Get HTML components
    const trackerPanel = document.getElementById("tracker-panel");
    const expiredPanel = document.getElementById("expired-panel");
    
    const trailNameDisplay = document.getElementById("view-trail-name");
    const hikerStatusDisplay = document.getElementById("view-hiker-status");
    const statusBadge = document.getElementById("view-status-badge");
    const statusText = document.getElementById("view-status-text");
    const lastUpdatedDisplay = document.getElementById("view-last-updated");

    // Extract share token from URL parameter '?token=<value>'
    const urlParams = new URLSearchParams(window.location.search);
    const shareToken = urlParams.get('token');

    // Global viewer variables
    let map = null;
    let marker = null;
    let pathLine = null;
    let pollIntervalId = null;

    // Check if token exists in parameters
    if (!shareToken) {
        showExpiredState();
        return;
    }

    // 1. Setup Leaflet Map using CartoDB Dark Matter
    function initMap(lat, lng, zoom) {
        if (map) return;
        
        map = L.map('map').setView([lat, lng], zoom);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19
        }).addTo(map);
    }

    // 2. Poll server for tracking data
    async function fetchTrackingData() {
        try {
            const response = await fetch(`${API_BASE}/api/gps/track/${shareToken}`, {
                method: "GET",
                headers: { "Accept": "application/json" }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    showExpiredState();
                } else {
                    console.error("Server error during poll:", response.status);
                }
                return;
            }

            const data = await response.json();
            updateTrackerUI(data);
        } catch (error) {
            console.error("Failed to fetch public tracking details:", error);
        }
    }

    // Begin Polling immediately and repeat every 15 seconds
    fetchTrackingData();
    pollIntervalId = setInterval(fetchTrackingData, 15000);

    // 3. Update Map and text fields on successful fetch
    function updateTrackerUI(data) {
        const trailName = data.trail_name;
        const currentLoc = data.current_location;
        const history = data.location_history || [];
        const isActive = data.is_active;
        const lastUpdated = new Date(data.last_updated);

        // Show panel
        trackerPanel.style.display = "block";
        expiredPanel.style.display = "none";

        // Display trail name
        trailNameDisplay.textContent = "Hike: " + trailName;
        hikerStatusDisplay.textContent = isActive 
            ? "Emergency contact: tracking live updates." 
            : "Hiker has stopped tracking this session.";

        // Update active badge
        if (isActive) {
            statusBadge.className = "status-badge active";
            statusText.textContent = "Live Tracking";
        } else {
            statusBadge.className = "status-badge";
            statusBadge.style.background = "rgba(255, 255, 255, 0.1)";
            statusBadge.style.color = "#cbd5e1";
            statusBadge.style.borderColor = "rgba(255, 255, 255, 0.2)";
            statusText.textContent = "Stopped";
        }

        // Format and display last updated timestamp
        const timeStr = lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lastUpdatedDisplay.textContent = "Last coordinates update: " + timeStr;

        // Render coordinates on map
        if (currentLoc && currentLoc.lat !== undefined && currentLoc.lng !== undefined) {
            const currentLatLng = [currentLoc.lat, currentLoc.lng];

            // Reconstruct full coordinate array from session history
            const trackPoints = history.map(h => [h.lat, h.lng]);
            // Make sure current location is included
            if (trackPoints.length === 0 || 
                (trackPoints[trackPoints.length - 1][0] !== currentLoc.lat && 
                 trackPoints[trackPoints.length - 1][1] !== currentLoc.lng)) {
                trackPoints.push(currentLatLng);
            }

            // Initialize map view
            if (!map) {
                initMap(currentLoc.lat, currentLoc.lng, 15);
            } else {
                map.setView(currentLatLng, 15);
            }

            // Set hiker position marker
            if (!marker) {
                marker = L.marker(currentLatLng).addTo(map)
                    .bindPopup("Hiker's current position").openPopup();
            } else {
                marker.setLatLng(currentLatLng);
            }

            // Draw line history path
            if (!pathLine) {
                pathLine = L.polyline(trackPoints, { color: '#52b788', weight: 4 }).addTo(map);
            } else {
                pathLine.setLatLngs(trackPoints);
            }
        } else {
            // Hiker started tracking but has not broadcasted coordinates yet
            if (!map) {
                // Default view in Kenya
                initMap(0.0236, 37.9062, 7);
            }
            hikerStatusDisplay.textContent = "Waiting for hiker's GPS signal...";
        }
    }

    // 4. Handle expired link / 404 state
    function showExpiredState() {
        // Clear poll interval
        if (pollIntervalId !== null) {
            clearInterval(pollIntervalId);
            pollIntervalId = null;
        }

        trackerPanel.style.display = "none";
        expiredPanel.style.display = "block";
    }
});
