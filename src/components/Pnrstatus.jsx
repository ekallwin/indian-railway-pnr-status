import { useState, useRef, useEffect } from "react";
import "./Pnrstatus.css";

const API_URL = "/api/pnr/";

const CLASS_NAMES = {
    SL: "Sleeper", "1A": "First AC", "2A": "AC 2 Tier", "3A": "AC 3 Tier",
    "3E": "AC 3 Economy", CC: "AC Chair Car", EC: "Exec. Chair Car",
    "2S": "Second Sitting", FC: "First Class",
};
const QUOTA_NAMES = {
    GN: "General", TQ: "Tatkal", PT: "Premium Tatkal", LD: "Ladies",
    SS: "Senior Citizen", HP: "Divyang", DF: "Defence", YU: "Yuva",
    DP: "Duty Pass", RQ: "Roadside", RS: "Roadside",
};
const TICKET_TYPES = { E: "E-Ticket", P: "Railway Station Counter Ticket", I: "I-Ticket", S: "Railway Station Counter Ticket" };

// Berth / seat codes used across all coach types
const BERTH_NAMES = {
    LB: "Lower Berth",
    MB: "Middle Berth",
    UB: "Upper Berth",
    SL: "Side Lower",
    SM: "Side Middle",
    SU: "Side Upper",
    CP: "Coupe",
    CB: "Cabin",
    W: "Window",
    WS: "Window Side",
    M: "Middle",
    MS: "Middle Side",
    A: "Aisle",
    AS: "Aisle Side",
};
const berthName = (code) => {
    const c = String(code || "").trim().toUpperCase();
    return BERTH_NAMES[c] || c;
};

const LEGEND = [
    ["CNF", "Confirmed (coach/berth shown after chart preparation)"],
    ["RAC", "Reservation Against Cancellation"],
    ["WL #", "Waiting List Number"],
    ["GNWL", "General Wait List"],
    ["RLWL", "Remote Location Wait List"],
    ["PQWL", "Pooled Quota Wait List"],
    ["TQWL", "Tatkal Quota Wait List"],
    ["RQWL", "Roadside Quota Wait List"],
    ["DPWL", "Duty Pass Wait List"],
    ["CAN / MOD", "Cancelled or Modified Passenger"],
    ["REGRET/WL", "No More Booking Permitted"],
    ["RELEASED", "Not cancelled, alternative accommodation provided"],
    ["NT", "Passenger Not Turned Up"],
    ["TDR", "Passenger has filed TDR"],
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");

/** Parses "Nov 20, 2026 9:00:00 PM" without relying on Date.parse. */
function parseApiDate(str) {
    if (!str) return null;
    const m = str.match(
        /^([A-Za-z]{3})\w*\s+(\d{1,2}),\s*(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
    );
    if (!m) return null;
    const month = MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
    if (month < 0) return null;
    let hour = parseInt(m[4], 10);
    const ap = m[7]?.toUpperCase();
    if (ap === "PM" && hour < 12) hour += 12;
    if (ap === "AM" && hour === 12) hour = 0;
    return { day: +m[2], month, year: +m[3], hour, minute: +m[5] };
}
const fmtDate = (s) => {
    const d = parseApiDate(s);
    return d ? `${pad(d.day)} ${MONTHS[d.month]} ${d.year}` : s || "-";
};
const fmtTime = (s) => {
    const d = parseApiDate(s);
    if (!d) return "-";
    const h12 = d.hour % 12 === 0 ? 12 : d.hour % 12;
    return `${pad(h12)}:${pad(d.minute)} ${d.hour >= 12 ? "PM" : "AM"}`;
};
const fmtDateTime = (s) => (parseApiDate(s) ? `${fmtDate(s)}, ${fmtTime(s)}` : s || "-");
function duration(a, b) {
    const x = parseApiDate(a), y = parseApiDate(b);
    if (!x || !y) return "";
    const t = (d) => Date.UTC(d.year, d.month, d.day, d.hour, d.minute);
    const mins = Math.round((t(y) - t(x)) / 60000);
    return mins > 0 ? `${Math.floor(mins / 60)}h ${pad(mins % 60)}m` : "";
}
function tone(status = "") {
    const s = status.toUpperCase();
    if (s.startsWith("CNF")) return "ok";
    if (s.startsWith("RAC")) return "warn";
    if (/^(CAN|MOD|TDR|NT)/.test(s)) return "bad";
    if (s.includes("WL")) return "wl";
    return "neutral";
}
function seatText(coach, no, code, details) {
    if (coach && no) {
        return `Coach ${coach} - ${no}${code ? ` (${berthName(code)})` : ""}`;
    }
    return details || "";
}

const TrainIcon = () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="3" width="14" height="14" rx="3" />
        <path d="M5 11h14M9 21l2-4M15 21l-2-4" />
        <circle cx="9" cy="14" r="0.6" fill="currentColor" />
        <circle cx="15" cy="14" r="0.6" fill="currentColor" />
    </svg>
);

/** Vande Bharat style train: white body, orange stripe, dark windows, pointed nose */
function TrainScene({ running }) {
    const coachX = [8, 238, 468];
    const wheel = (cx) => (
        <g key={cx}>
            <circle cx={cx} cy="97" r="6.5" fill="#1f2937" />
            <circle cx={cx} cy="97" r="2.4" fill="#9ca3af" />
        </g>
    );
    return (
        <div className={`rl-scene ${running ? "run" : ""}`} aria-hidden="true">
            <div className="rl-trainwrap">
                <span className="rl-speed s1" />
                <span className="rl-speed s2" />
                <span className="rl-speed s3" />
                <svg viewBox="0 0 960 106" className="rl-train">
                    <defs>
                        <clipPath id="vb-nose">
                            <path d="M698 28 H806 C866 28 918 54 944 82 L944 88 H698 Z" />
                        </clipPath>
                    </defs>

                    {/* passenger coaches */}
                    {coachX.map((x) => (
                        <g key={x}>
                            <rect x={x} y="30" width="222" height="58" rx="8" fill="#ffffff" stroke="#e5e7eb" />
                            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                                <rect key={i} x={x + 12 + i * 29} y="38" width="23" height="16" rx="3" fill="#1f2a44" />
                            ))}
                            <rect x={x} y="64" width="222" height="9" fill="#f97316" />
                            <rect x={x} y="73" width="222" height="2.5" fill="#fbbf24" />
                            <rect x={x + 6} y="80" width="210" height="8" fill="#cbd5e1" />
                            {[40, 62, 160, 182].map((o) => wheel(x + o))}
                        </g>
                    ))}

                    {/* engine / driving car with pointed nose */}
                    <path d="M698 28 H806 C866 28 918 54 944 82 L944 88 H698 Z" fill="#ffffff" stroke="#e5e7eb" />
                    <g clipPath="url(#vb-nose)">
                        <rect x="698" y="64" width="260" height="9" fill="#f97316" />
                        <rect x="698" y="73" width="260" height="2.5" fill="#fbbf24" />
                        <rect x="704" y="80" width="260" height="8" fill="#cbd5e1" />
                        {[0, 1, 2, 3].map((i) => (
                            <rect key={i} x={712 + i * 25} y="38" width="20" height="16" rx="3" fill="#1f2a44" />
                        ))}
                        <path d="M812 36 C858 38 894 52 916 68 L812 68 Z" fill="#1f2a44" />
                        <path d="M812 36 C858 38 894 52 916 68" fill="none" stroke="#475569" strokeWidth="1.5" />
                    </g>
                    <circle cx="937" cy="79" r="3" fill="#fff3b0" />
                    {[728, 750, 866, 888].map((cx) => wheel(cx))}
                </svg>
            </div>
            <div className="rl-ground"><div className="rl-sleepers" /></div>
        </div>
    );
}

export default function PnrStatus() {
    const [pnr, setPnr] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);
    const abortRef = useRef(null);

    useEffect(() => () => abortRef.current?.abort(), []);

    const handleChange = (e) => {
        setPnr(e.target.value.replace(/\D/g, "").slice(0, 10));
        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (pnr.length !== 10) {
            setError("Please enter a valid 10 digit PNR number.");
            return;
        }
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true); setError(""); setResult(null);

        try {
            const res = await fetch(`${API_URL}${pnr}`, { signal: controller.signal });
            if (!res.ok) {
                throw new Error(
                    res.status === 404
                        ? "PNR not found. Please check the number and try again."
                        : res.status === 429
                            ? "Too many requests. Please wait a moment and try again."
                            : "Unable to fetch PNR status right now. Please try again later."
                );
            }
            const json = await res.json();
            if (!json?.data?.pnr_number) throw new Error("No details found for this PNR.");
            setResult(json);
        } catch (err) {
            if (err.name === "AbortError") return;
            setError(
                err instanceof TypeError
                    ? "Network error. Please check your internet connection."
                    : err.message
            );
        } finally {
            if (abortRef.current === controller) setLoading(false);
        }
    };

    const data = result?.data;
    const pax = data?.passengers || [];
    // Vikalp is shown only when the ticket was NOT confirmed at booking time
    const showVikalp =
        !!data?.vikalp_status &&
        pax.some((p) => !String(p.bookingStatus || "").toUpperCase().startsWith("CNF"));
    const dur = data ? duration(data.journey_date, data.arrival_date) : "";
    // info_message can be [""], so drop empty strings
    const infoMessages = (data?.info_message || []).map((m) => String(m || "").trim()).filter(Boolean);

    return (
        <div className="rl">
            <section className={`rl-hero ${loading ? "run" : ""}`}>
                <div className="rl-hero-in">
                    <div className="rl-brand"><TrainIcon /> Indian Railways - Passenger Enquiry</div>
                    <h1>Check your PNR status</h1>
                    <p>Fast, simple and captcha free.</p>

                    <form className="rl-search" onSubmit={handleSubmit} noValidate>
                        <input
                            id="pnr-input"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={10}
                            autoComplete="off"
                            placeholder="Enter 10 digit PNR"
                            aria-label="PNR number"
                            value={pnr}
                            onChange={handleChange}
                            aria-invalid={!!error}
                        />
                        <button type="submit" className="rl-go" disabled={loading}>
                            {loading ? "Checking" : "Check"}
                        </button>
                    </form>
                    {error && <div className="rl-error" role="alert">{error}</div>}
                </div>
                <TrainScene running={loading} />
            </section>

            <main className="rl-main">
                {data && (
                    <>
                        {/* 1. Journey ticket */}
                        <article className="rl-ticket">
                            <div className="rl-tk-main">
                                <div className="rl-tk-head">
                                    <div>
                                        <span className="rl-eyebrow">Train {data.train_number}</span>
                                        <h2>{data.train_name}</h2>
                                    </div>
                                    <span className={`rl-chart ${/not/i.test(data.chart_status) ? "pending" : "done"}`}>
                                        {data.chart_status}
                                    </span>
                                </div>

                                <div className="rl-route">
                                    <div className="rl-stn">
                                        <b>{data.source_station}</b>
                                        <span>{fmtTime(data.journey_date)}</span>
                                        <small>{fmtDate(data.journey_date)}</small>
                                    </div>
                                    <div className="rl-mid">
                                        <em>{dur || "—"}</em>
                                        <div className="rl-rail"><TrainIcon /></div>
                                        <small>{data.distance != null ? `${data.distance} km` : ""}</small>
                                    </div>
                                    <div className="rl-stn end">
                                        <b>{data.destination_station}</b>
                                        <span>{fmtTime(data.arrival_date)}</span>
                                        <small>{fmtDate(data.arrival_date)}</small>
                                    </div>
                                </div>

                                <div className="rl-tags">
                                    <span>{CLASS_NAMES[data.journey_class] || data.journey_class} - {data.journey_class}</span>
                                    <span>{QUOTA_NAMES[data.quota] || data.quota} quota</span>
                                    <span>{TICKET_TYPES[data.ticket_type] || data.ticket_type}</span>
                                </div>
                            </div>

                            <aside className="rl-stub">
                                <div>
                                    <small>PNR</small>
                                    <strong className="rl-pnr">{data.pnr_number}</strong>
                                </div>
                            </aside>
                        </article>

                        {data.train_cancel_status && (
                            <div className="rl-remark bad">{data.train_cancel_status}</div>
                        )}
                        {infoMessages.map((m, i) => (
                            <div className="rl-remark" key={i}>{m}</div>
                        ))}

                        {/* 2. Booking details ticket */}
                        <h3 className="rl-sec">Booking details</h3>
                        <article className="rl-ticket">
                            <div className="rl-tk-main">
                                <dl className="rl-grid">
                                    <div><dt>Journey date &amp; time</dt><dd>{fmtDateTime(data.journey_date)}</dd></div>
                                    <div><dt>Arrival date &amp; time</dt><dd>{fmtDateTime(data.arrival_date)}</dd></div>
                                    <div><dt>Booked on</dt><dd>{fmtDateTime(data.booking_date)}</dd></div>
                                    <div><dt>Boarding point</dt><dd>{data.boarding_point}</dd></div>
                                    <div><dt>Reserved upto</dt><dd>{data.reservation_upto}</dd></div>
                                    <div><dt>Distance</dt><dd>{data.distance != null ? `${data.distance} km` : "-"}</dd></div>
                                    <div>
                                        <dt>Class</dt>
                                        <dd>{CLASS_NAMES[data.journey_class] ? `${CLASS_NAMES[data.journey_class]} (${data.journey_class})` : data.journey_class}</dd>
                                    </div>
                                    <div>
                                        <dt>Quota</dt>
                                        <dd>{QUOTA_NAMES[data.quota] ? `${QUOTA_NAMES[data.quota]} (${data.quota})` : data.quota || "-"}</dd>
                                    </div>
                                </dl>
                            </div>
                            <aside className="rl-stub">
                                <div>
                                    <small>Ticket type</small>
                                    <strong>{TICKET_TYPES[data.ticket_type] || data.ticket_type || "-"}</strong>
                                </div>
                                <div>
                                    <small>Ticket fare</small>
                                    <strong>{data.ticket_fare != null ? `₹${data.ticket_fare}` : "-"}</strong>
                                </div>
                                <div>
                                    <small>Charting</small>
                                    <strong className="rl-sm">{data.chart_status || "-"}</strong>
                                </div>
                                {showVikalp && (
                                    <div>
                                        <small>Vikalp</small>
                                        <strong>{data.vikalp_status}</strong>
                                    </div>
                                )}
                            </aside>
                        </article>

                        {/* 3. Passenger tickets: Booking status  →  Current status */}
                        <h3 className="rl-sec">
                            Passengers <span>{data.passenger_count ?? pax.length}</span>
                        </h3>
                        {pax.map((p, i) => {
                            const cur = seatText(p.currentCoachId, p.currentBerthNo, p.currentBerthCode, p.currentStatusDetails);
                            const book = p.bookingStatusDetails || p.bookingStatus;
                            return (
                                <article className={`rl-ticket pax ${tone(p.currentStatus)}`} key={p.passengerSerialNumber ?? i}>
                                    <div className="rl-tk-main">
                                        <div className="rl-pax-top">
                                            <span className="rl-avatar">{p.passengerSerialNumber ?? i + 1}</span>
                                            <strong>Passenger {p.passengerSerialNumber ?? i + 1}</strong>
                                        </div>

                                        <div className="rl-flow">
                                            <div className="rl-step">
                                                <small>1 - Booking status</small>
                                                <b>{book}{p.passengerQuota ? `/${p.passengerQuota}` : ""}</b>
                                            </div>
                                            <span className="rl-arrow" aria-hidden="true" />
                                            <div className="rl-step cur">
                                                <small>2 - Current status</small>
                                                <b>{cur || p.currentStatus}</b>
                                            </div>
                                        </div>
                                    </div>
                                    <aside className="rl-stub">
                                        <div>
                                            <small>Current status</small>
                                            <span className="rl-badge">{p.currentStatus}</span>
                                        </div>
                                    </aside>
                                </article>
                            );
                        })}
                        <p className="rl-note">
                            If the final chart is not prepared, the current status may upgrade or downgrade later.
                        </p>
                        {/* 4. Status code guide */}
                        <h3 className="rl-sec">Status code guide</h3>
                        <article className="rl-ticket one">
                            <div className="rl-tk-main">
                                <dl className="rl-legend">
                                    {LEGEND.map(([k, v]) => (
                                        <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                                    ))}
                                </dl>
                            </div>
                        </article>
                    </>
                )}
            </main>
            <footer className="rl-footer">
                &copy; {new Date().getFullYear()} Developed by{" "}
                <a
                    href="https://portfolio-ekallwin.vercel.app/"
                    target="_blank"
                    rel="noreferrer"
                >
                    Allwin E K
                </a>
            </footer>
        </div>
    );
}