// TrailGuard Live Tracking Controller

const API_BASE = 'http://127.0.0.1:5000';

document.addEventListener("DOMContentLoaded", () => {
    // Get HTML components
    const trailTitleDisplay = document.getElementById("trail-title-display");
    const descDisplay = document.getElementById("tracking-desc-display");
    const statusBadge = document.getElementById("status-badge");
    const statusText = document.getElementById("status-text");
    const startBtn = document.getElementById("start-btn");
    const stopBtn = document.getElementById("stop-btn");
    const shareContainer = document.getElementById("share-container");
    const shareUrlInput = document.getElementById("share-url-input");
    const copyBtn = document.getElementById("copy-btn");
    const errorMessage = document.getElementById("error-message");
    
    // Navbar auth links
    const navLoginBtn = document.getElementById("nav-login-btn");
    const navRegisterBtn = document.getElementById("nav-register-btn");
    const navLogoutBtn = document.getElementById("nav-logout-btn");

    // Extract selected trail name from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const trailName = urlParams.get('trail');

    // Global tracking variables
    let currentSessionId = null;
    let watchId = null;
    let map = null;
    let marker = null;
    let pathLine = null;
    let trackPoints = [];

    // 1. Initial Authentication Check
    async function checkAuth() {
        try {
            const response = await fetch(`${API_BASE}/api/me`, {
                method: "GET",
                headers: { "Accept": "application/json" },
                credentials: 'include'
            });

            if (!response.ok) {
                // If unauthorized (401), redirect to login page preserving the trail parameter
                const redirectTrail = trailName ? `&trail=${encodeURIComponent(trailName)}` : '';
                window.location.href = `login.html?redirect=tracking${redirectTrail}`;
                return;
            }

            const data = await response.json();
            showLoggedInNav();
            initializeTrailInfo();
        } catch (error) {
            console.error("Auth check failed:", error);
            showError("Could not connect to the authentication server. Please ensure the backend is running.");
        }
    }

    checkAuth();

    // 2. Setup Navbar based on Logged In status
    function showLoggedInNav() {
        navLoginBtn.style.display = "none";
        navRegisterBtn.style.display = "none";
        navLogoutBtn.style.display = "block";
        
        navLogoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: 'include' });
            window.location.href = "login.html";
        });
    }

    // 3. Initialize UI displays
    function initializeTrailInfo() {
        if (trailName) {
            trailTitleDisplay.textContent = "Track: " + trailName;
            descDisplay.textContent = "Click Start to begin broadcast tracking your hike.";
        } else {
            trailTitleDisplay.textContent = "Live Tracker";
            descDisplay.textContent = "Please select a trail from the trails list to track.";
            startBtn.disabled = true;
        }

        // Initialize Map in a default view of Kenya (Nairobi)
        initMap(0.0236, 37.9062, 7);
    }

    // 4. Map Setup using CartoDB Dark Matter tiles for premium dark aesthetics
    function initMap(lat, lng, zoom) {
        if (map) return;
        
        map = L.map('map').setView([lat, lng], zoom);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19
        }).addTo(map);
    }

    // 5. Start Tracking Session
    startBtn.addEventListener("click", async () => {
        if (!trailName) return;

        clearError();
        startBtn.disabled = true;
        startBtn.textContent = "Starting Session...";

        try {
            const response = await fetch(`${API_BASE}/api/gps/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trail_name: trailName }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                currentSessionId = data.session_id;
                
                // Show share link
                shareContainer.style.display = "flex";
                // Generate share URL (frontend path + share token parameter)
                const shareLink = window.location.origin + window.location.pathname.replace("tracking.html", "track-view.html") + "?token=" + data.share_token;
                shareUrlInput.value = shareLink;

                // Adjust Badges and controls
                statusBadge.classList.add("active");
                statusText.textContent = "Active Tracking";
                startBtn.style.display = "none";
                startBtn.textContent = "Start Live Tracking"; // reset text
                stopBtn.removeAttribute("disabled");

                // Start fetching GPS coordinates from device
                startGeolocationTracking();
            } else {
                showError(data.error || "Failed to start GPS tracking session.");
                startBtn.disabled = false;
                startBtn.textContent = "Start Live Tracking";
            }
        } catch (error) {
            console.error("Start GPS request failed:", error);
            showError("Network error. Unable to establish connection to tracking API.");
            startBtn.disabled = false;
            startBtn.textContent = "Start Live Tracking";
        }
    });

    // 6. Start Device Geolocation watchPosition
    function startGeolocationTracking() {
        if (!navigator.geolocation) {
            showError("Geolocation is not supported by your browser / device.");
            return;
        }

        const options = {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 15000
        };

        // Clear any active watch
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
        }

        watchId = navigator.geolocation.watchPosition(
            handleLocationSuccess,
            handleLocationError,
            options
        );
    }

    // 7. Successful Geolocation check
    async function handleLocationSuccess(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        console.log(`Current Position: ${lat}, ${lng} (accuracy: ${position.coords.accuracy}m)`);

        // Add coordinate points to Leaflet Map
        const latlng = [lat, lng];
        trackPoints.push(latlng);

        if (!map) {
            initMap(lat, lng, 15);
        } else {
            map.setView(latlng, 15);
        }

        // Add marker if not exists, otherwise update position
        if (!marker) {
            marker = L.marker(latlng).addTo(map)
                .bindPopup("Your live location").openPopup();
        } else {
            marker.setLatLng(latlng);
        }

        // Draw track paths
        if (!pathLine) {
            pathLine = L.polyline(trackPoints, { color: '#52b788', weight: 4 }).addTo(map);
        } else {
            pathLine.setLatLngs(trackPoints);
        }

        // POST coordinates update to Flask backend
        if (currentSessionId) {
            try {
                await fetch(`${API_BASE}/api/gps/update/${currentSessionId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lat, lng }),
                    credentials: 'include'
                });
            } catch (error) {
                console.error("Failed to sync location with server:", error);
            }
        }
    }

    function handleLocationError(error) {
        console.warn("Geolocation watch error:", error);
        let msg = "Failed to fetch GPS coordinates. ";
        switch (error.code) {
            case error.PERMISSION_DENIED:
                msg += "Please grant location access permissions.";
                break;
            case error.POSITION_UNAVAILABLE:
                msg += "Location details unavailable.";
                break;
            case error.TIMEOUT:
                msg += "GPS request timed out.";
                break;
            default:
                msg += error.message;
        }
        showError(msg);
    }

    // 8. Stop Tracking Session
    stopBtn.addEventListener("click", async () => {
        if (!currentSessionId) return;

        stopBtn.disabled = true;
        stopBtn.textContent = "Stopping...";

        try {
            const response = await fetch(`${API_BASE}/api/gps/stop/${currentSessionId}`, {
                method: "POST",
                credentials: 'include'
            });

            if (response.ok) {
                // Clear watchPosition
                if (watchId !== null) {
                    navigator.geolocation.clearWatch(watchId);
                    watchId = null;
                }

                // Adjust badge and buttons
                statusBadge.classList.remove("active");
                statusText.textContent = "Tracking Stopped";
                stopBtn.style.display = "none";
                startBtn.style.display = "block";
                startBtn.disabled = false;
                
                descDisplay.textContent = "Session ended. You can start a new tracking session if needed.";
            } else {
                const data = await response.json();
                showError(data.error || "Failed to stop GPS tracking session.");
                stopBtn.disabled = false;
                stopBtn.textContent = "Stop Tracking";
            }
        } catch (error) {
            console.error("Stop GPS request failed:", error);
            showError("Network error. Unable to connect to backend server.");
            stopBtn.disabled = false;
            stopBtn.textContent = "Stop Tracking";
        }
    });

    // 9. Copy Link Button Handler
    copyBtn.addEventListener("click", () => {
        shareUrlInput.select();
        shareUrlInput.setSelectionRange(0, 99999); // Mobile compatibility
        
        try {
            navigator.clipboard.writeText(shareUrlInput.value);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        } catch (err) {
            console.error("Clipboard copy failed:", err);
            // Fallback selection copy
            document.execCommand('copy');
        }
    });

    // Error helper displays
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
    }

    function clearError() {
        errorMessage.style.display = "none";
        errorMessage.textContent = "";
    }
});
