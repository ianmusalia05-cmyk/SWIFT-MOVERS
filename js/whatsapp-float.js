/*
 * Swift Movers - Floating WhatsApp Button
 *
 * Standalone floating WhatsApp contact button for all public pages.
 * Uses the WhatsApp number saved in /api/settings when available and
 * falls back to the current Swift Movers number so the button still appears
 * if the settings request temporarily fails.
 */

(function () {
    "use strict";

    const FALLBACK_NUMBER = "254716674629";
    const STARTER_MESSAGE =
        "Hello Swift Movers, I would like to enquire about your moving services.";

    function normalizeWhatsApp(value) {
        let raw = String(value || "").trim();

        if (!raw) {
            return "";
        }

        raw = raw.replace(
            /(?:https?:\/\/)?(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)/i,
            ""
        );

        raw = raw.split(/[?#&]/)[0];
        raw = raw.replace(/[^0-9]/g, "");

        if (!raw) {
            return "";
        }

        if (raw.length === 10 && raw.startsWith("0")) {
            raw = `254${raw.slice(1)}`;
        }

        if (raw.startsWith("00")) {
            raw = raw.slice(2);
        }

        return raw;
    }

    function buildWhatsAppUrl(number) {
        return `https://wa.me/${number}?text=${encodeURIComponent(STARTER_MESSAGE)}`;
    }

    function injectStyles() {
        if (document.getElementById("swiftWhatsappFloatStyles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "swiftWhatsappFloatStyles";
        style.textContent = `
            .swift-whatsapp-float {
                position: fixed;
                right: 22px;
                bottom: 22px;
                z-index: 2147483647;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                min-height: 54px;
                padding: 13px 18px;
                border: 0;
                border-radius: 999px;
                background: #25D366;
                color: #fff !important;
                text-decoration: none !important;
                font-family: inherit;
                font-size: 15px;
                font-weight: 800;
                line-height: 1;
                box-shadow: 0 14px 34px rgba(7, 20, 38, 0.24);
                transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
            }

            .swift-whatsapp-float:hover {
                color: #fff !important;
                transform: translateY(-3px);
                box-shadow: 0 18px 40px rgba(7, 20, 38, 0.30);
                filter: brightness(.97);
            }

            .swift-whatsapp-float:focus-visible {
                color: #fff !important;
                outline: 3px solid rgba(37, 211, 102, .35);
                outline-offset: 4px;
            }

            .swift-whatsapp-float svg {
                width: 24px;
                height: 24px;
                flex: 0 0 24px;
                display: block;
            }

            .swift-whatsapp-float-label {
                white-space: nowrap;
            }

            @media (max-width: 600px) {
                .swift-whatsapp-float {
                    right: 15px;
                    bottom: 15px;
                    width: 54px;
                    height: 54px;
                    min-height: 54px;
                    padding: 0;
                }

                .swift-whatsapp-float-label {
                    display: none;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .swift-whatsapp-float {
                    transition: none !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function createButton(number) {
        if (document.querySelector(".swift-whatsapp-float")) {
            return document.querySelector(".swift-whatsapp-float");
        }

        injectStyles();

        const link = document.createElement("a");
        link.className = "swift-whatsapp-float";
        link.href = buildWhatsAppUrl(number);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.title = "Chat with Swift Movers on WhatsApp";
        link.setAttribute(
            "aria-label",
            "Chat with Swift Movers on WhatsApp"
        );

        link.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M20.52 3.48A11.9 11.9 0 0 0 12.04 0C5.47 0 .13 5.34.13 11.91c0 2.1.55 4.14 1.59 5.95L0 24l6.29-1.65a11.88 11.88 0 0 0 5.74 1.47h.01c6.57 0 11.91-5.34 11.91-11.91 0-3.19-1.24-6.18-3.43-8.43ZM12.04 21.82h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.73.98 1-3.64-.23-.37a9.87 9.87 0 0 1-1.51-5.28C2.15 6.4 6.58 1.97 12.04 1.97c2.65 0 5.14 1.03 7.01 2.9a9.88 9.88 0 0 1 2.9 7.03c0 5.46-4.43 9.9-9.91 9.92Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.64-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.11 3.22 5.11 4.51.71.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.28.17-1.41-.07-.12-.27-.2-.57-.35Z"/>
            </svg>
            <span class="swift-whatsapp-float-label">WhatsApp Us</span>
        `;

        document.body.appendChild(link);
        return link;
    }

    function mountButton(number) {
        if (!document.body) {
            return;
        }

        const safeNumber = normalizeWhatsApp(number) || FALLBACK_NUMBER;
        const button = createButton(safeNumber);

        if (button) {
            button.href = buildWhatsAppUrl(safeNumber);
        }
    }

    async function updateFromSettings() {
        try {
            const response = await fetch("/api/settings", {
                credentials: "same-origin",
                headers: {
                    Accept: "application/json"
                }
            });

            if (!response.ok) {
                return;
            }

            const data = await response.json();
            const number = normalizeWhatsApp(data?.settings?.whatsapp);

            if (!number) {
                return;
            }

            const button = document.querySelector(".swift-whatsapp-float");

            if (button) {
                button.href = buildWhatsAppUrl(number);
            }
        } catch (error) {
            console.warn("Swift Movers WhatsApp settings update skipped.", error);
        }
    }

    function init() {
        // Create immediately using the known current number.
        mountButton(FALLBACK_NUMBER);

        // Then replace the number with the saved Admin setting when available.
        updateFromSettings();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
