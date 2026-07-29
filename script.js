// ===============================
// KMX - JavaScript
// ===============================

// Hämta element
const navbar = document.getElementById("navbar");
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
const menuLinks = navLinks ? navLinks.querySelectorAll("a") : [];

// ===============================
// Navbar vid scroll
// ===============================

window.addEventListener("scroll", () => {

    if (!navbar) {
        return;
    }

    // Kör bara på startsidan
    if (!document.body.classList.contains("offert-page")) {

        if (window.scrollY > 80) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }

    }

});

// ===============================
// Hamburgermeny
// ===============================

if (hamburger && navLinks) {

    hamburger.addEventListener("click", () => {

        navLinks.classList.toggle("active");

    });

}

// ===============================
// Stäng menyn när man klickar
// på en länk
// ===============================

menuLinks.forEach(link => {

    link.addEventListener("click", () => {

        if (navLinks) {
            navLinks.classList.remove("active");
        }

    });

});

// ===============================
// Om fönstret blir större än mobil,
// stäng mobilmenyn.
// ===============================

window.addEventListener("resize", () => {

    if (window.innerWidth > 768 && navLinks) {
        navLinks.classList.remove("active");
    }

});

// ===============================
// Skicka offertförfrågan i bakgrunden
// ===============================

const quoteForm = document.getElementById("quote-form");
const formStatus = document.getElementById("form-status");
const quoteSubmitButton = quoteForm ? quoteForm.querySelector('button[type="submit"]') : null;

if (quoteForm) {

    quoteForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (formStatus) {
            formStatus.textContent = "Skickar offertförfrågan...";
            formStatus.style.color = "#1f6f3d";
        }

        if (quoteSubmitButton) {
            quoteSubmitButton.disabled = true;
            quoteSubmitButton.textContent = "Skickar...";
        }

        const formData = new FormData(quoteForm);

        try {
            const response = await fetch("/api/offert", {
                method: "POST",
                body: formData
            });

            let data = {};
            const responseText = await response.text();

            if (responseText) {
                try {
                    data = JSON.parse(responseText);
                } catch (error) {
                    data = {};
                }
            }

            if (response.ok && data.success) {
                quoteForm.reset();

                if (formStatus) {
                    formStatus.textContent = "Tack! Din offertförfrågan har skickats.";
                    formStatus.style.color = "#1f6f3d";
                }
            } else {
                if (formStatus) {
                    formStatus.textContent = data.message || "Kunde inte skicka offertförfrågan just nu. Försök igen om en stund.";
                    formStatus.style.color = "#8a4b00";
                }
            }
        } catch (error) {
            if (formStatus) {
                formStatus.textContent = "Något gick fel. Försök igen.";
                formStatus.style.color = "#8a4b00";
            }
        } finally {
            if (quoteSubmitButton) {
                quoteSubmitButton.disabled = false;
                quoteSubmitButton.textContent = "Skicka offertförfrågan";
            }
        }

    });

}
