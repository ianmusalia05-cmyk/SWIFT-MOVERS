/*
 * Swift Movers - Site Settings Loader v2
 *
 * Loads business details saved in the admin dashboard from /api/settings.
 * It updates elements using data-site-setting attributes and also adds a
 * consistent contact block to public-page footers (except the Contact page,
 * which already has a dedicated business-details card).
 */

(function () {
    "use strict";

    function cleanPhone(value) {
        return String(value || "").replace(/[^0-9+]/g, "");
    }

    function cleanWhatsApp(value) {
        let raw = String(value || "").trim();

        if (!raw) {
            return "";
        }

        // Accept either a phone number or a WhatsApp URL.
        raw = raw.replace(/(?:https?:\/\/)?(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)/i, "");
        raw = raw.split(/[?#&]/)[0];
        raw = raw.replace(/[^0-9]/g, "");

        if (!raw) {
            return "";
        }

        // Convert a Kenyan local number such as 07XXXXXXXX to 2547XXXXXXXX.
        if (raw.length === 10 && raw.startsWith("0")) {
            raw = `254${raw.slice(1)}`;
        }

        // Convert 00-prefixed international numbers.
        if (raw.startsWith("00")) {
            raw = raw.slice(2);
        }

        return raw;
    }

    function updateTextSettings(settings) {
        document.querySelectorAll("[data-site-setting]").forEach((element) => {
            const key = element.getAttribute("data-site-setting");

            if (!key) {
                return;
            }

            const value = settings[key];

            if (value === undefined || value === null || String(value).trim() === "") {
                return;
            }

            if (
                element.tagName === "INPUT" ||
                element.tagName === "TEXTAREA" ||
                element.tagName === "SELECT"
            ) {
                element.value = value;
            } else {
                element.textContent = value;
            }
        });
    }

    function updateAttributeSettings(settings) {
        document.querySelectorAll("[data-site-setting-attr]").forEach((element) => {
            const definition = element.getAttribute("data-site-setting-attr");

            if (!definition) {
                return;
            }

            const separatorIndex = definition.indexOf(":");

            if (separatorIndex === -1) {
                return;
            }

            const attribute = definition.slice(0, separatorIndex).trim();
            const key = definition.slice(separatorIndex + 1).trim();
            const value = settings[key];

            if (!attribute || !key || value === undefined || value === null) {
                return;
            }

            element.setAttribute(attribute, value);
        });
    }

    function updatePhoneLinks(settings) {
        const phone = settings.phone;

        if (!phone) {
            return;
        }

        document.querySelectorAll("[data-site-setting-phone-link]").forEach((element) => {
            element.href = `tel:${cleanPhone(phone)}`;
        });
    }

    function updateWhatsAppLinks(settings) {
        const whatsapp = settings.whatsapp;

        if (!whatsapp) {
            return;
        }

        const number = cleanWhatsApp(whatsapp);

        if (!number) {
            return;
        }

        document.querySelectorAll("[data-site-setting-whatsapp-link]").forEach((element) => {
            element.href = `https://wa.me/${number}`;
            element.target = "_blank";
            element.rel = "noopener noreferrer";
        });
    }

    function updateSocialLinks(settings) {
        ["facebook", "instagram", "tiktok"].forEach((key) => {
            const value = settings[key];

            if (!value) {
                return;
            }

            document.querySelectorAll(`[data-site-setting-social="${key}"]`).forEach((element) => {
                element.href = value;
                element.target = "_blank";
                element.rel = "noopener noreferrer";
            });
        });
    }

    function updateEmailLinks(settings) {
        const email = settings.email;

        if (!email) {
            return;
        }

        document.querySelectorAll("[data-site-setting-email-link]").forEach((element) => {
            element.href = `mailto:${email}`;
        });
    }

    function updateDocumentTitle(settings) {
        const businessName = settings.business_name;

        if (!businessName || !document.title.includes("Swift Movers")) {
            return;
        }

        document.title = document.title.replaceAll("Swift Movers", businessName);
    }

    function injectFooterStyles() {
        if (document.getElementById("swiftSiteSettingsFooterStyles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "swiftSiteSettingsFooterStyles";
        style.textContent = `
            .swift-footer-settings {
                display: grid;
                gap: 7px;
                margin-top: 12px;
                max-width: 340px;
            }

            .swift-footer-setting-item {
                color: inherit;
                font-size: 0.9rem;
                line-height: 1.55;
                overflow-wrap: anywhere;
            }

            .swift-footer-setting-label {
                display: inline-block;
                min-width: 92px;
                margin-right: 6px;
                font-weight: 700;
            }

            .swift-footer-setting-item a {
                color: inherit;
                text-decoration: none;
            }

            .swift-footer-setting-item a:hover,
            .swift-footer-setting-item a:focus-visible {
                text-decoration: underline;
            }

            .swift-footer-socials {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 11px;
            }

            .swift-footer-socials a {
                font-size: 0.85rem;
                font-weight: 700;
            }

            @media (max-width: 680px) {
                .swift-footer-settings {
                    max-width: none;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function createFooterContactBlock(settings) {
        const footer = document.querySelector(".site-footer");
        const footerContent = footer?.querySelector(".footer-content");

        if (!footerContent) {
            return;
        }

        // Contact page already has a full business-details card.
        if (document.querySelector(".contact-details-card")) {
            return;
        }

        if (footerContent.querySelector(".swift-footer-settings")) {
            return;
        }

        const hasAnyDetail = [
            "phone",
            "email",
            "address",
            "operating_hours"
        ].some((key) => String(settings[key] || "").trim() !== "");

        if (!hasAnyDetail) {
            return;
        }

        injectFooterStyles();

        const block = document.createElement("div");
        block.className = "swift-footer-settings";
        block.setAttribute("aria-label", "Business contact details");

        if (settings.phone) {
            const item = document.createElement("div");
            item.className = "swift-footer-setting-item";

            const label = document.createElement("span");
            label.className = "swift-footer-setting-label";
            label.textContent = "Phone";

            const link = document.createElement("a");
            link.href = `tel:${cleanPhone(settings.phone)}`;
            link.textContent = settings.phone;
            link.setAttribute("data-site-setting-phone-link", "");

            item.append(label, link);
            block.appendChild(item);
        }

        if (settings.email) {
            const item = document.createElement("div");
            item.className = "swift-footer-setting-item";

            const label = document.createElement("span");
            label.className = "swift-footer-setting-label";
            label.textContent = "Email";

            const link = document.createElement("a");
            link.href = `mailto:${settings.email}`;
            link.textContent = settings.email;
            link.setAttribute("data-site-setting-email-link", "");

            item.append(label, link);
            block.appendChild(item);
        }

        if (settings.address) {
            const item = document.createElement("div");
            item.className = "swift-footer-setting-item";

            const label = document.createElement("span");
            label.className = "swift-footer-setting-label";
            label.textContent = "Address";

            const value = document.createElement("span");
            value.textContent = settings.address;

            item.append(label, value);
            block.appendChild(item);
        }

        if (settings.operating_hours) {
            const item = document.createElement("div");
            item.className = "swift-footer-setting-item";

            const label = document.createElement("span");
            label.className = "swift-footer-setting-label";
            label.textContent = "Hours";

            const value = document.createElement("span");
            value.textContent = settings.operating_hours;

            item.append(label, value);
            block.appendChild(item);
        }

        const socialKeys = ["facebook", "instagram", "tiktok"];
        const activeSocials = socialKeys.filter((key) => String(settings[key] || "").trim() !== "");

        if (activeSocials.length) {
            const socialWrap = document.createElement("div");
            socialWrap.className = "swift-footer-socials";

            activeSocials.forEach((key) => {
                const link = document.createElement("a");
                link.href = settings[key];
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = key.charAt(0).toUpperCase() + key.slice(1);
                link.setAttribute("data-site-setting-social", key);
                socialWrap.appendChild(link);
            });

            block.appendChild(socialWrap);
        }

        const brandColumn = footerContent.querySelector(":scope > div");

        if (brandColumn) {
            brandColumn.appendChild(block);
        } else {
            footerContent.insertBefore(block, footerContent.firstChild);
        }
    }



    function injectFloatingWhatsAppStyles() {
        if (document.getElementById("swiftFloatingWhatsAppStyles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "swiftFloatingWhatsAppStyles";
        style.textContent = `
            .swift-floating-whatsapp {
                position: fixed;
                right: 22px;
                bottom: 22px;
                z-index: 9998;
                display: inline-flex;
                align-items: center;
                gap: 10px;
                min-height: 52px;
                padding: 13px 17px;
                border-radius: 999px;
                background: #25d366;
                color: #ffffff;
                text-decoration: none;
                font-size: 0.92rem;
                font-weight: 800;
                line-height: 1;
                box-shadow: 0 14px 32px rgba(7, 20, 38, 0.20);
                transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease;
            }

            .swift-floating-whatsapp:hover,
            .swift-floating-whatsapp:focus-visible {
                color: #ffffff;
                text-decoration: none;
                transform: translateY(-3px);
                box-shadow: 0 18px 38px rgba(7, 20, 38, 0.25);
                filter: brightness(0.97);
            }

            .swift-floating-whatsapp:focus-visible {
                outline: 3px solid rgba(37, 211, 102, 0.35);
                outline-offset: 4px;
            }

            .swift-floating-whatsapp-icon {
                width: 24px;
                height: 24px;
                flex: 0 0 24px;
                display: block;
            }

            .swift-floating-whatsapp-label {
                white-space: nowrap;
            }

            @media (max-width: 600px) {
                .swift-floating-whatsapp {
                    right: 16px;
                    bottom: 16px;
                    min-height: 50px;
                    padding: 13px 15px;
                }

                .swift-floating-whatsapp-label {
                    display: none;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .swift-floating-whatsapp {
                    transition: none !important;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function createFloatingWhatsAppButton(settings) {
        const whatsapp = settings.whatsapp;

        if (!whatsapp) {
            return;
        }

        const number = cleanWhatsApp(whatsapp);

        if (!number) {
            return;
        }

        if (document.querySelector(".swift-floating-whatsapp")) {
            return;
        }

        injectFloatingWhatsAppStyles();

        const link = document.createElement("a");
        link.className = "swift-floating-whatsapp";
        link.href = `https://wa.me/${number}?text=${encodeURIComponent("Hello Swift Movers, I would like to enquire about your moving services.")}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", "Chat with Swift Movers on WhatsApp");
        link.setAttribute("title", "Chat with Swift Movers on WhatsApp");

        link.innerHTML = `
            <svg class="swift-floating-whatsapp-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M20.52 3.48A11.9 11.9 0 0 0 12.04 0C5.47 0 .13 5.34.13 11.91c0 2.1.55 4.14 1.59 5.95L0 24l6.29-1.65a11.88 11.88 0 0 0 5.74 1.47h.01c6.57 0 11.91-5.34 11.91-11.91 0-3.19-1.24-6.18-3.43-8.43ZM12.04 21.82h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.73.98 1-3.64-.23-.37a9.87 9.87 0 0 1-1.51-5.28C2.15 6.4 6.58 1.97 12.04 1.97c2.65 0 5.14 1.03 7.01 2.9a9.88 9.88 0 0 1 2.9 7.03c0 5.46-4.43 9.9-9.91 9.92Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.64-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.11 3.22 5.11 4.51.71.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.28.17-1.41-.07-.12-.27-.2-.57-.35Z"/>
            </svg>
            <span class="swift-floating-whatsapp-label">WhatsApp Us</span>
        `;

        document.body.appendChild(link);
    }

    async function loadSiteSettings() {
        try {
            const response = await fetch("/api/settings", {
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Settings request failed with status ${response.status}`);
            }

            const data = await response.json();

            if (!data.success || !data.settings) {
                throw new Error(data.message || "Site settings could not be loaded.");
            }

            const settings = data.settings;

            updateTextSettings(settings);
            updateAttributeSettings(settings);
            updatePhoneLinks(settings);
            updateWhatsAppLinks(settings);
            updateSocialLinks(settings);
            updateEmailLinks(settings);
            updateDocumentTitle(settings);
            createFooterContactBlock(settings);
            createFloatingWhatsAppButton(settings);
        } catch (error) {
            console.error("Swift Movers site settings error:", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadSiteSettings);
    } else {
        loadSiteSettings();
    }
})();