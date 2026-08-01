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

// ===============================
// Lightbox för projektbilder
// ===============================

const projectImages = document.querySelectorAll(".project img");

if (projectImages.length) {

    const lightbox = document.createElement("div");
    const lightboxImage = document.createElement("img");
    const closeButton = document.createElement("button");
    const previousButton = document.createElement("button");
    const nextButton = document.createElement("button");
    let currentImageIndex = 0;

    lightbox.className = "lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.setAttribute("aria-label", "Förstorad projektbild");

    lightboxImage.className = "lightbox-image";
    lightboxImage.alt = "";

    closeButton.className = "lightbox-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Stäng bildvisare");
    closeButton.innerHTML = "&times;";

    previousButton.className = "lightbox-previous";
    previousButton.type = "button";
    previousButton.setAttribute("aria-label", "Föregående bild");
    previousButton.innerHTML = "&#8592;";

    nextButton.className = "lightbox-next";
    nextButton.type = "button";
    nextButton.setAttribute("aria-label", "Nästa bild");
    nextButton.innerHTML = "&#8594;";

    lightbox.append(lightboxImage, closeButton, previousButton, nextButton);
    document.body.appendChild(lightbox);

    let previouslyFocusedElement = null;

    const showImage = (index) => {

        currentImageIndex = (index + projectImages.length) % projectImages.length;
        const image = projectImages[currentImageIndex];
        lightboxImage.src = image.currentSrc || image.src;
        lightboxImage.alt = image.alt;

    };

    const closeLightbox = () => {

        if (lightbox.getAttribute("aria-hidden") === "true") {
            return;
        }

        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
        document.body.classList.remove("lightbox-open");

        if (previouslyFocusedElement) {
            previouslyFocusedElement.focus();
        }

    };

    const openLightbox = (image) => {

        previouslyFocusedElement = document.activeElement;
        showImage(Array.from(projectImages).indexOf(image));
        lightbox.setAttribute("aria-hidden", "false");
        document.body.classList.add("lightbox-open");

        requestAnimationFrame(() => {
            lightbox.classList.add("is-open");
        });

        closeButton.focus();

    };

    projectImages.forEach(image => {

        image.setAttribute("tabindex", "0");
        image.setAttribute("role", "button");
        image.setAttribute("aria-label", `${image.alt}. Öppna förstorad bild`);

        image.addEventListener("click", () => openLightbox(image));

        image.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openLightbox(image);
            }
        });

    });

    closeButton.addEventListener("click", closeLightbox);
    previousButton.addEventListener("click", () => showImage(currentImageIndex - 1));
    nextButton.addEventListener("click", () => showImage(currentImageIndex + 1));

    lightbox.addEventListener("click", event => {
        if (event.target === lightbox) {
            closeLightbox();
        }
    });

    lightbox.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closeLightbox();
            return;
        }

        if (event.key === "ArrowLeft") {
            showImage(currentImageIndex - 1);
            return;
        }

        if (event.key === "ArrowRight") {
            showImage(currentImageIndex + 1);
            return;
        }

        if (event.key === "Tab") {
            const focusableElements = [previousButton, nextButton, closeButton];
            const currentFocusIndex = focusableElements.indexOf(document.activeElement);
            const nextFocusIndex = event.shiftKey
                ? (currentFocusIndex - 1 + focusableElements.length) % focusableElements.length
                : (currentFocusIndex + 1) % focusableElements.length;

            event.preventDefault();
            focusableElements[nextFocusIndex].focus();
        }

    });

}
