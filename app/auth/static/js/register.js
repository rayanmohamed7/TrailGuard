// TrailGuard Registration Script

const API_BASE = 'http://127.0.0.1:5000';

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("register-form");
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    
    // Emergency contact inputs
    const contactNameInput = document.getElementById("contact-name");
    const contactPhoneInput = document.getElementById("contact-phone");
    const contactEmailInput = document.getElementById("contact-email");
    
    const errorMessage = document.getElementById("error-message");
    const submitBtn = registerForm.querySelector("button[type='submit']");

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Clear any previous error message
        errorMessage.style.display = "none";
        errorMessage.textContent = "";

        // Collect and trim values
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const contactName = contactNameInput.value.trim();
        const contactPhone = contactPhoneInput.value.trim();
        const contactEmail = contactEmailInput.value.trim();

        // Basic client-side validation check
        if (!name || !email || !password || !contactName || !contactPhone || !contactEmail) {
            showError("Please fill in all fields.");
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = "Creating Account...";

        // Structure payload as expected by the database models / API
        const payload = {
            name,
            email,
            password,
            emergency_contact: {
                name: contactName,
                phone: contactPhone,
                email: contactEmail
            }
        };

        try {
            const response = await fetch(`${API_BASE}/api/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
                // MUST include credentials: 'include' to receive and store the session cookie 
                // in cross-origin development (e.g. from port 5500 to port 5000)
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                // Redirect on successful registration
                window.location.href = "trails.html";
            } else {
                // Display specific error message returned by API (e.g. email duplicate)
                showError(data.error || "Failed to create account.");
            }
        } catch (error) {
            console.error("Registration network/server error:", error);
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
