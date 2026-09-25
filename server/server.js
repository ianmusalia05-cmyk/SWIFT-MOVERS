const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const db = require("./database");

// =========================
// VISITOR TRACKING STORAGE
// =========================

// Records public HTML page visits only. API calls, admin pages,
// CSS, JS, images, and other static assets are excluded below.
db.exec(`
    CREATE TABLE IF NOT EXISTS visitor_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        page_path TEXT NOT NULL,
        user_agent TEXT DEFAULT '',
        visited_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_visitor_visits_visited_at
    ON visitor_visits(visited_at);

    CREATE INDEX IF NOT EXISTS idx_visitor_visits_ip_address
    ON visitor_visits(ip_address);
`);

const app = express();

const PORT = process.env.PORT || 3000;


// =========================
// IMAGE UPLOADS
// =========================

const uploadsDirectory = path.join(
    __dirname,
    "..",
    "uploads"
);

if (!fs.existsSync(uploadsDirectory)) {
    fs.mkdirSync(uploadsDirectory, { recursive: true });
}

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadsDirectory);
    },

    filename: (req, file, cb) => {

        const extension =
            path.extname(file.originalname).toLowerCase();

        const baseName =
            path.basename(file.originalname, extension)
                .replace(/[^a-zA-Z0-9-_]/g, "-")
                .toLowerCase();

        const fileName =
            `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}${extension}`;

        cb(null, fileName);
    }
});

const upload = multer({

    storage: storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Only JPG, PNG, WEBP, and GIF images are allowed."
                )
            );
        }
    }
});


// =========================
// ADMIN SESSION
// =========================

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            maxAge: 1000 * 60 * 60 * 4
        }
    })
);


// =========================
// MIDDLEWARE
// =========================

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


// =========================
// PROTECT ADMIN DASHBOARD
// =========================

app.use((req, res, next) => {

    if (
        req.path === "/admin/" ||
        req.path === "/admin/index.html" ||
        req.path === "/admin/visitors.html"
    ) {

        if (!req.session.isAdmin) {

            return res.redirect("/admin/login.html");

        }

    }

    next();

});


// =========================
// VISITOR PAGE-VIEW TRACKING
// =========================

app.use((req, res, next) => {

    const acceptsHtml = String(req.headers.accept || "").includes("text/html");
    const isPublicGet = req.method === "GET";
    const isApiRequest = req.path.startsWith("/api/");
    const isAdminRequest = req.path.startsWith("/admin");

    if (isPublicGet && acceptsHtml && !isApiRequest && !isAdminRequest) {

        const rawIp = req.ip || req.socket.remoteAddress || "unknown";
        const ipAddress = String(rawIp).replace(/^::ffff:/, "");
        const pagePath = String(req.path || "/").slice(0, 500);
        const userAgent = String(req.get("user-agent") || "").slice(0, 1000);

        try {
            db.prepare(`
                INSERT INTO visitor_visits (
                    ip_address,
                    page_path,
                    user_agent
                )
                VALUES (?, ?, ?)
            `).run(ipAddress, pagePath, userAgent);
        } catch (error) {
            // Visitor tracking must never prevent the website from loading.
            console.error("Visitor tracking error:", error);
        }
    }

    next();
});


// =========================
// SERVE WEBSITE
// =========================

app.use(
    express.static(
        path.join(__dirname, "..")
    )
);


// =========================
// TEST ROUTE
// =========================

app.get("/api/status", (req, res) => {

    res.json({
        success: true,
        message: "Swift Movers server is running."
    });

});


// =========================
// QUOTATION API
// =========================

app.post("/api/quotations", (req, res) => {

    try {

        const {
            name,
            email,
            phone,
            moving_from,
            moving_to,
            move_date,
            property_type,
            service,
            items,
            message
        } = req.body;


        if (
            !name ||
            !email ||
            !phone ||
            !moving_from ||
            !moving_to ||
            !move_date ||
            !property_type ||
            !service
        ) {

            return res.status(400).json({
                success: false,
                message: "Please complete all required fields."
            });

        }


        const statement = db.prepare(`
            INSERT INTO quotations (
                name,
                email,
                phone,
                moving_from,
                moving_to,
                move_date,
                property_type,
                service,
                items,
                message
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);


        const result = statement.run(
            name,
            email,
            phone,
            moving_from,
            moving_to,
            move_date,
            property_type,
            service,
            items || "",
            message || ""
        );


        res.status(201).json({
            success: true,
            message: "Quotation request submitted successfully.",
            quotation_id: result.lastInsertRowid
        });


    } catch (error) {

        console.error("Quotation error:", error);

        res.status(500).json({
            success: false,
            message: "Something went wrong while submitting your quotation."
        });

    }

});


// =========================
// CONTACT MESSAGE API
// =========================

app.post("/api/messages", (req, res) => {

    try {

        const {
            name,
            email,
            phone,
            subject,
            message
        } = req.body;


        if (
            !name ||
            !email ||
            !phone ||
            !subject ||
            !message
        ) {

            return res.status(400).json({
                success: false,
                message: "Please complete all required fields."
            });

        }


        const statement = db.prepare(`
            INSERT INTO messages (
                name,
                email,
                phone,
                subject,
                message
            )
            VALUES (?, ?, ?, ?, ?)
        `);


        const result = statement.run(
            name,
            email,
            phone,
            subject,
            message
        );


        res.status(201).json({
            success: true,
            message: "Your message has been sent successfully.",
            message_id: result.lastInsertRowid
        });


    } catch (error) {

        console.error("Contact message error:", error);

        res.status(500).json({
            success: false,
            message: "Something went wrong while sending your message."
        });

    }

});


// =========================
// CONTACT MESSAGES API
// =========================

app.get("/api/messages", (req, res) => {

    if (!req.session.isAdmin) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized."
        });

    }


    try {

        const messages = db.prepare(`
            SELECT *
            FROM messages
            ORDER BY created_at DESC
        `).all();


        res.json({
            success: true,
            messages: messages
        });


    } catch (error) {

        console.error("Error loading messages:", error);

        res.status(500).json({
            success: false,
            message: "Could not load messages."
        });

    }

});


// =========================
// UPDATE MESSAGE STATUS
// =========================

app.put("/api/messages/:id/status", (req, res) => {

    if (!req.session.isAdmin) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized."
        });

    }


    try {

        const messageId = req.params.id;

        const { status } = req.body;


        const allowedStatuses = [
            "unread",
            "read",
            "replied"
        ];


        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                success: false,
                message: "Invalid message status."
            });

        }


        const statement = db.prepare(`
            UPDATE messages
            SET status = ?
            WHERE id = ?
        `);


        const result = statement.run(
            status,
            messageId
        );


        if (result.changes === 0) {

            return res.status(404).json({
                success: false,
                message: "Message not found."
            });

        }


        res.json({
            success: true,
            message: "Message status updated successfully."
        });


    } catch (error) {

        console.error(
            "Message status update error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Could not update message status."
        });

    }

});


// =========================
// PRODUCTS API
// =========================

app.get("/api/products", (req, res) => {

    try {

        const products = db.prepare(`
            SELECT *
            FROM products
            ORDER BY created_at DESC
        `).all();


        res.json({
            success: true,
            products: products
        });


    } catch (error) {

        console.error("Error loading products:", error);

        res.status(500).json({
            success: false,
            message: "Could not load products."
        });

    }

});


// ADD PRODUCT

app.post(
    "/api/products",
    upload.single("imageFile"),
    (req, res) => {

        if (!req.session.isAdmin) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });
        }

        try {

            const { name, description } = req.body;

            if (!name || !description) {

                return res.status(400).json({
                    success: false,
                    message: "Product name and description are required."
                });
            }

            const image = req.file
                ? `/uploads/${req.file.filename}`
                : "";

            const statement = db.prepare(`
                INSERT INTO products (
                    name,
                    description,
                    image
                )
                VALUES (?, ?, ?)
            `);

            const result = statement.run(
                name,
                description,
                image
            );

            res.status(201).json({
                success: true,
                message: "Product added successfully.",
                product_id: result.lastInsertRowid
            });

        } catch (error) {

            console.error("Error adding product:", error);

            res.status(500).json({
                success: false,
                message: "Could not add product."
            });
        }
    }
);


// UPDATE PRODUCT

app.put(
    "/api/products/:id",
    upload.single("imageFile"),
    (req, res) => {

        if (!req.session.isAdmin) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });
        }

        try {

            const productId = req.params.id;

            const { name, description } = req.body;

            if (!name || !description) {

                return res.status(400).json({
                    success: false,
                    message: "Product name and description are required."
                });
            }

            const existingProduct = db.prepare(`
                SELECT image
                FROM products
                WHERE id = ?
            `).get(productId);

            if (!existingProduct) {

                return res.status(404).json({
                    success: false,
                    message: "Product not found."
                });
            }

            const image = req.file
                ? `/uploads/${req.file.filename}`
                : (existingProduct.image || "");

            const statement = db.prepare(`
                UPDATE products
                SET
                    name = ?,
                    description = ?,
                    image = ?
                WHERE id = ?
            `);

            statement.run(
                name,
                description,
                image,
                productId
            );

            res.json({
                success: true,
                message: "Product updated successfully."
            });

        } catch (error) {

            console.error("Error updating product:", error);

            res.status(500).json({
                success: false,
                message: "Could not update product."
            });
        }
    }
);


// DELETE PRODUCT

app.delete("/api/products/:id", (req, res) => {

    if (!req.session.isAdmin) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized."
        });

    }


    try {

        const productId = req.params.id;

        const statement = db.prepare(`
            DELETE FROM products
            WHERE id = ?
        `);


        const result = statement.run(productId);


        if (result.changes === 0) {

            return res.status(404).json({
                success: false,
                message: "Product not found."
            });

        }


        res.json({
            success: true,
            message: "Product deleted successfully."
        });


    } catch (error) {

        console.error("Error deleting product:", error);

        res.status(500).json({
            success: false,
            message: "Could not delete product."
        });

    }

});


// =========================
// SERVICES API
// =========================

app.get("/api/services", (req, res) => {

    try {

        const services = db.prepare(`
            SELECT *
            FROM services
            ORDER BY created_at DESC
        `).all();


        res.json({
            success: true,
            services: services
        });


    } catch (error) {

        console.error("Error loading services:", error);

        res.status(500).json({
            success: false,
            message: "Could not load services."
        });

    }

});


// ADD SERVICE

app.post(
    "/api/services",
    upload.single("imageFile"),
    (req, res) => {

        if (!req.session.isAdmin) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });
        }

        try {

            const { name, description } = req.body;

            if (!name || !description) {

                return res.status(400).json({
                    success: false,
                    message: "Service name and description are required."
                });
            }

            const image = req.file
                ? `/uploads/${req.file.filename}`
                : "";

            const statement = db.prepare(`
                INSERT INTO services (
                    name,
                    description,
                    image
                )
                VALUES (?, ?, ?)
            `);

            const result = statement.run(
                name,
                description,
                image
            );

            res.status(201).json({
                success: true,
                message: "Service added successfully.",
                service_id: result.lastInsertRowid
            });

        } catch (error) {

            console.error("Error adding service:", error);

            res.status(500).json({
                success: false,
                message: "Could not add service."
            });
        }
    }
);


// UPDATE SERVICE

app.put(
    "/api/services/:id",
    upload.single("imageFile"),
    (req, res) => {

        if (!req.session.isAdmin) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });
        }

        try {

            const serviceId = req.params.id;

            const { name, description } = req.body;

            if (!name || !description) {

                return res.status(400).json({
                    success: false,
                    message: "Service name and description are required."
                });
            }

            const existingService = db.prepare(`
                SELECT image
                FROM services
                WHERE id = ?
            `).get(serviceId);

            if (!existingService) {

                return res.status(404).json({
                    success: false,
                    message: "Service not found."
                });
            }

            const image = req.file
                ? `/uploads/${req.file.filename}`
                : (existingService.image || "");

            const statement = db.prepare(`
                UPDATE services
                SET
                    name = ?,
                    description = ?,
                    image = ?
                WHERE id = ?
            `);

            statement.run(
                name,
                description,
                image,
                serviceId
            );

            res.json({
                success: true,
                message: "Service updated successfully."
            });

        } catch (error) {

            console.error("Error updating service:", error);

            res.status(500).json({
                success: false,
                message: "Could not update service."
            });
        }
    }
);


// DELETE SERVICE

app.delete("/api/services/:id", (req, res) => {

    if (!req.session.isAdmin) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized."
        });

    }


    try {

        const serviceId = req.params.id;

        const statement = db.prepare(`
            DELETE FROM services
            WHERE id = ?
        `);


        const result = statement.run(serviceId);


        if (result.changes === 0) {

            return res.status(404).json({
                success: false,
                message: "Service not found."
            });

        }


        res.json({
            success: true,
            message: "Service deleted successfully."
        });


    } catch (error) {

        console.error("Error deleting service:", error);

        res.status(500).json({
            success: false,
            message: "Could not delete service."
        });

    }

});


// =========================
// ADMIN LOGOUT
// =========================

app.post("/api/admin/logout", (req, res) => {

    req.session.destroy(() => {

        res.json({
            success: true,
            message: "Logged out successfully."
        });

    });

});


// =========================
// ADMIN LOGIN
// =========================

app.post("/api/admin/login", async (req, res) => {

    try {

        const { username, password } = req.body;


        if (!username || !password) {

            return res.status(400).json({
                success: false,
                message: "Username and password are required."
            });

        }


        if (username !== process.env.ADMIN_USERNAME) {

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });

        }


        const passwordMatch = await bcrypt.compare(
            password,
            process.env.ADMIN_PASSWORD_HASH
        );


        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });

        }


        req.session.isAdmin = true;

        res.json({
            success: true,
            message: "Login successful."
        });


    } catch (error) {

        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed."
        });

    }

});


// =========================
// GET ALL QUOTATIONS
// =========================

app.get("/api/quotations", (req, res) => {

    if (!req.session.isAdmin) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized."
        });

    }


    try {

        const quotations = db.prepare(`
            SELECT *
            FROM quotations
            ORDER BY created_at DESC
        `).all();


        res.json({
            success: true,
            quotations: quotations
        });


    } catch (error) {

        console.error("Error loading quotations:", error);

        res.status(500).json({
            success: false,
            message: "Could not load quotations."
        });

    }

});


// =========================
// UPDATE QUOTATION STATUS
// =========================

app.put("/api/quotations/:id/status", (req, res) => {

    if (!req.session.isAdmin) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized."
        });

    }


    try {

        const quotationId = req.params.id;

        const { status } = req.body;


        const allowedStatuses = [
            "new",
            "contacted",
            "quoted",
            "completed",
            "cancelled"
        ];


        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({
                success: false,
                message: "Invalid quotation status."
            });

        }


        const statement = db.prepare(`
            UPDATE quotations
            SET status = ?
            WHERE id = ?
        `);


        const result = statement.run(
            status,
            quotationId
        );


        if (result.changes === 0) {

            return res.status(404).json({
                success: false,
                message: "Quotation not found."
            });

        }


        res.json({
            success: true,
            message: "Quotation status updated successfully."
        });


    } catch (error) {

        console.error(
            "Quotation status update error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Could not update quotation status."
        });

    }

});


// =========================
// SITE SETTINGS API
// =========================

// Public site settings
app.get("/api/settings", (req, res) => {

    try {

        const rows = db.prepare(`
            SELECT setting_key, setting_value
            FROM site_settings
            ORDER BY setting_key
        `).all();

        const settings = {};

        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });

        res.json({
            success: true,
            settings
        });

    } catch (error) {

        console.error("Error loading site settings:", error);

        res.status(500).json({
            success: false,
            message: "Could not load site settings."
        });

    }

});


// Update site settings - admin only
app.put("/api/settings", (req, res) => {

    if (!req.session.isAdmin) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized."
        });

    }

    try {

        const allowedKeys = [
            "business_name",
            "tagline",
            "phone",
            "email",
            "address",
            "operating_hours",
            "whatsapp",
            "facebook",
            "instagram",
            "tiktok"
        ];

        const update = db.prepare(`
            INSERT INTO site_settings (setting_key, setting_value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(setting_key) DO UPDATE SET
                setting_value = excluded.setting_value,
                updated_at = CURRENT_TIMESTAMP
        `);

        const updateSettings = db.transaction((settings) => {

            for (const key of allowedKeys) {

                if (Object.prototype.hasOwnProperty.call(settings, key)) {
                    update.run(key, String(settings[key] ?? ""));
                }

            }

        });

        updateSettings(req.body || {});

        res.json({
            success: true,
            message: "Site settings updated successfully."
        });

    } catch (error) {

        console.error("Error updating site settings:", error);

        res.status(500).json({
            success: false,
            message: "Could not update site settings."
        });

    }

});


// =========================
// VISITOR ANALYTICS API
// =========================

app.get("/api/visitors", (req, res) => {

    if (!req.session.isAdmin) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized."
        });

    }

    try {

        const limitValue = Number.parseInt(req.query.limit, 10);
        const offsetValue = Number.parseInt(req.query.offset, 10);
        const trendDaysValue = Number.parseInt(req.query.trend_days, 10);

        const limit = Math.min(
            Math.max(Number.isFinite(limitValue) ? limitValue : 100, 1),
            250
        );

        const offset = Math.max(
            Number.isFinite(offsetValue) ? offsetValue : 0,
            0
        );

        const trendDays = [7, 30, 90].includes(trendDaysValue)
            ? trendDaysValue
            : 30;

        const search = String(req.query.search || "").trim().slice(0, 200);

        let where = "";
        const params = [];

        if (search) {
            where = `WHERE ip_address LIKE ? OR page_path LIKE ?`;
            const pattern = `%${search}%`;
            params.push(pattern, pattern);
        }

        const totalRow = db.prepare(`
            SELECT COUNT(*) AS total
            FROM visitor_visits
            ${where}
        `).get(...params);

        const stats = db.prepare(`
            SELECT
                COUNT(*) AS total_visits,
                COUNT(DISTINCT ip_address) AS unique_ips,
                SUM(CASE
                    WHEN date(visited_at, 'localtime') = date('now', 'localtime')
                    THEN 1 ELSE 0
                END) AS visits_today,
                SUM(CASE
                    WHEN date(visited_at, 'localtime') >= date('now', 'localtime', '-6 days')
                    THEN 1 ELSE 0
                END) AS visits_last_7_days,
                COUNT(DISTINCT CASE
                    WHEN date(visited_at, 'localtime') >= date('now', 'localtime', '-6 days')
                    THEN ip_address
                END) AS unique_ips_last_7_days,
                SUM(CASE
                    WHEN date(visited_at, 'localtime') >= date('now', 'localtime', 'start of month')
                    THEN 1 ELSE 0
                END) AS visits_this_month,
                COUNT(DISTINCT CASE
                    WHEN date(visited_at, 'localtime') >= date('now', 'localtime', 'start of month')
                    THEN ip_address
                END) AS unique_ips_this_month,
                SUM(CASE
                    WHEN date(visited_at, 'localtime') >= date('now', 'localtime', '-29 days')
                    THEN 1 ELSE 0
                END) AS visits_last_30_days,
                MAX(visited_at) AS last_visit
            FROM visitor_visits
        `).get();

        const trend = db.prepare(`
            SELECT
                date(visited_at, 'localtime') AS visit_day,
                COUNT(*) AS visits,
                COUNT(DISTINCT ip_address) AS unique_ips
            FROM visitor_visits
            WHERE date(visited_at, 'localtime') >= date('now', 'localtime', '-${trendDays - 1} days')
            GROUP BY visit_day
            ORDER BY visit_day ASC
        `).all();

        const trendSummary = db.prepare(`
            SELECT
                COUNT(*) AS visits,
                COUNT(DISTINCT ip_address) AS unique_ips
            FROM visitor_visits
            WHERE date(visited_at, 'localtime') >= date('now', 'localtime', '-${trendDays - 1} days')
        `).get();

        const topPages = db.prepare(`
            SELECT
                page_path,
                COUNT(*) AS visits,
                COUNT(DISTINCT ip_address) AS unique_ips
            FROM visitor_visits
            WHERE date(visited_at, 'localtime') >= date('now', 'localtime', '-29 days')
            GROUP BY page_path
            ORDER BY visits DESC, page_path ASC
            LIMIT 8
        `).all();

        const visits = db.prepare(`
            SELECT
                id,
                ip_address,
                page_path,
                user_agent,
                visited_at
            FROM visitor_visits
            ${where}
            ORDER BY visited_at DESC, id DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        res.json({
            success: true,
            stats: {
                total_visits: Number(stats?.total_visits || 0),
                unique_ips: Number(stats?.unique_ips || 0),
                visits_today: Number(stats?.visits_today || 0),
                visits_last_7_days: Number(stats?.visits_last_7_days || 0),
                unique_ips_last_7_days: Number(stats?.unique_ips_last_7_days || 0),
                visits_this_month: Number(stats?.visits_this_month || 0),
                unique_ips_this_month: Number(stats?.unique_ips_this_month || 0),
                visits_last_30_days: Number(stats?.visits_last_30_days || 0),
                average_daily_last_30_days: Number(((Number(stats?.visits_last_30_days || 0)) / 30).toFixed(1)),
                last_visit: stats?.last_visit || null
            },
            trend_days: trendDays,
            trend,
            trend_summary: {
                visits: Number(trendSummary?.visits || 0),
                unique_ips: Number(trendSummary?.unique_ips || 0)
            },
            top_pages: topPages,
            pagination: {
                total: Number(totalRow?.total || 0),
                limit,
                offset
            },
            visits
        });

    } catch (error) {

        console.error("Error loading visitor analytics:", error);

        res.status(500).json({
            success: false,
            message: "Could not load visitor analytics."
        });

    }

});


// =========================
// API 404 HANDLER
// =========================

// Keep unknown API requests as JSON so frontend fetch calls
// receive a predictable response instead of the HTML 404 page.
app.use("/api", (req, res) => {

    res.status(404).json({
        success: false,
        message: "API route not found."
    });

});


// =========================
// WEBSITE 404 HANDLER
// =========================

// Any non-API URL that is not served by the website receives
// the custom Swift Movers 404 page.
app.use((req, res) => {

    res.status(404).sendFile(
        path.join(__dirname, "..", "404.html")
    );

});


// =========================
// IMAGE UPLOAD ERROR HANDLER
// =========================

app.use((error, req, res, next) => {

    if (error instanceof multer.MulterError) {

        if (error.code === "LIMIT_FILE_SIZE") {

            return res.status(400).json({
                success: false,
                message: "Image is too large. Maximum size is 5MB."
            });
        }

    }

    if (error && error.message) {

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    next(error);

});


// =========================
// START SERVER
// =========================

app.listen(PORT, () => {

    console.log(
        `Swift Movers server running at http://localhost:${PORT}`
    );

});
