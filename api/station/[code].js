export default async function handler(req, res) {
    const accept = req.headers.accept || "";

    if (req.method === "GET" && accept.includes("text/html")) {
        return res.redirect(302, "/");
    }

    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const code = String(req.query.code || "").trim();

    if (!/^[A-Za-z0-9]{1,6}$/.test(code)) {
        return res.status(400).json({ error: "Please provide a valid station code" });
    }

    const baseUrl = process.env.STATION_API_URL;

    if (!baseUrl) {
        return res.status(500).json({
            error: "STATION_API_URL environment variable is missing"
        });
    }

    try {
        const targetUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}q=${encodeURIComponent(code)}`;

        const response = await fetch(targetUrl, {
            method: "GET",
            headers: { Accept: "application/json" }
        });

        const data = await response.text();

        res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
        res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
        return res.status(response.status).send(data);
    } catch (error) {
        // Don't leak the upstream URL in error details
        return res.status(502).json({ error: "Unable to connect to station service" });
    }
}