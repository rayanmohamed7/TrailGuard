// TrailGuard Login Script

const API_BASE = 'http://127.0.0.1:5000';

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const errorMessage = document.getElementById("error-message");
    const submitBtn = loginForm.querySelector("button[type='submit']");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Clear any previous error message and styling
        errorMessage.style.display = "none";
        errorMessage.textContent = "";

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError("Please enter both email and password.");
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = "Signing In...";

        try {
            const response = await fetch(`${API_BASE}/api/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password }),
                // MUST include credentials: 'include' to receive and store the session cookie 
                // in cross-origin development (e.g. from port 5500 to port 5000)
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                // Redirect based on the presence of a redirect query param
                const urlParams = new URLSearchParams(window.location.search);
                let redirectPage = urlParams.get('redirect');
                if (redirectPage) {
                    if (!redirectPage.endsWith('.html')) {
                        redirectPage += '.html';
                    }
                    window.location.href = redirectPage;
                } else {
                    window.location.href = "trails.html";
                }
            } else {
                // Display specific error message returned by API
                showError(data.error || "Invalid email or password.");
            }
        } catch (error) {
            console.error("Login network/server error:", error);
            showError("Unable to connect to the server. Please verify the backend is running.");
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = "block";
    }
});
