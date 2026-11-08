// Place at: api/pnr/[pnr].js
export default async function handler(req, res) {
  const accept = req.headers.accept || "";

  if (req.method === "GET" && accept.includes("text/html")) {
    return res.redirect(302, "/");
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pnr = req.query.pnr;

  if (!pnr || !/^\d{10}$/.test(pnr)) {
    return res.status(400).json({
      error: "Please provide a valid 10-digit PNR"
    });
  }

  const baseUrl = process.env.PNR_API_URL;

  if (!baseUrl) {
    return res.status(500).json({
      error: "PNR_API_URL environment variable is missing"
    });
  }

  try {
    const targetUrl = `${baseUrl.replace(/\/+$/, "")}/${pnr}`;

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    const contentType = response.headers.get("content-type");
    const data = await response.text();

    res.setHeader(
      "Content-Type",
      contentType || "application/json"
    );

    return res.status(response.status).send(data);
  } catch (error) {
    return res.status(502).json({
      error: "Unable to connect to PNR service",
      details: error.message
    });
  }
}