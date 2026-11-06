export default async function handler(req, res) {
    const baseUrl = process.env.VITE_PNR_API_URL;

    if (!baseUrl) {
        return res.status(500).json({ error: "API URL not configured" });
    }

    try {
        const path = req.url.replace(/^\/api/, "");
        const response = await fetch(`${baseUrl}${path}`, {
            method: req.method,
            headers: {
                Accept: req.headers.accept || "application/json",
                "Content-Type": req.headers["content-type"] || "application/json"
            },
            body: ["GET", "HEAD"].includes(req.method)
                ? undefined
                : JSON.stringify(req.body)
        });

        const data = await response.arrayBuffer();

        res.status(response.status);
        res.setHeader(
            "Content-Type",
            response.headers.get("content-type") || "application/json"
        );

        return res.send(Buffer.from(data));
    } catch {
        return res.status(500).json({ error: "Failed to fetch PNR status" });
    }
}