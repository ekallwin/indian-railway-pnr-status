// Place at: api/station/[code].js
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const code = String(req.query.code || "").trim();

  if (!/^[A-Za-z0-9]{1,6}$/.test(code)) {
    return res.status(400).json({ error: "Please provide a valid station code" });
  }

  try {
    const response = await fetch(
      `https://api.railyatri.in/api/common_city_station_search.json?q=${encodeURIComponent(code)}`,
      { method: "GET", headers: { Accept: "application/json" } }
    );

    const data = await response.text();

    res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(response.status).send(data);
  } catch (error) {
    return res.status(502).json({
      error: "Unable to connect to station service",
      details: error.message
    });
  }
}