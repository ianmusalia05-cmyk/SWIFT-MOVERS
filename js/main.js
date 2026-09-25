// Swift Movers website JavaScript


// =========================
// QUOTATION FORM
// =========================

const quotationForm = document.getElementById("quotationForm");

if (quotationForm) {

    quotationForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const formData = new FormData(quotationForm);

        const quotationData = Object.fromEntries(formData.entries());

        try {

            const response = await fetch("/api/quotations", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(quotationData)

            });

            const result = await response.json();

            if (result.success) {

                alert(
                    "Thank you! Your quotation request has been submitted successfully."
                );

                quotationForm.reset();

            } else {

                alert(
                    result.message ||
                    "Please check your information and try again."
                );

            }

        } catch (error) {

            console.error("Submission error:", error);

            alert(
                "We could not submit your quotation. Please try again."
            );

        }

    });

}


// =========================
// CONTACT FORM
// =========================

const contactForm = document.getElementById("contactForm");

if (contactForm) {

    contactForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const formData = new FormData(contactForm);

        const messageData = Object.fromEntries(formData.entries());

        try {

            const response = await fetch("/api/messages", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(messageData)

            });

            const result = await response.json();

            if (result.success) {

                alert(
                    "Thank you! Your message has been sent successfully."
                );

                contactForm.reset();

            } else {

                alert(
                    result.message ||
                    "Please check your information and try again."
                );

            }

        } catch (error) {

            console.error("Contact form error:", error);

            alert(
                "We could not send your message. Please try again."
            );

        }

    });

}