import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";

type Status =
  | "reported"
  | "assigned"
  | "parts_sourced"
  | "repaired";

type Village = {
  id: number;
  name: string;
};

type Pump = {
  id: number;
  village_id: number;
  pump_code: string;
  is_working: boolean;
  motor_hp?: number;
  depth_m?: number;
  starter_type?: string;
};

type Incident = {
  id: number;
  pump_id: number;
  issue_type: string;
  emergency_tanker: boolean;
  status: Status;
  reported_at: string;
  pump?: {
    pump_code: string;
    village?: {
      name: string;
    };
  };
};

type BackupPump = {
  pump_id: number;
  pump_code: string;
  village_name: string;
  distance_km: number;
};

const ISSUE_LABELS: Record<string, string> = {
  motor_failure: "Motor failure",
  electrical: "Electrical",
  pump_failure: "Pump failure",
  low_pressure: "Low pressure",
  leak: "Pipeline leak",
  other: "Other issue",
};

const STATUS_LABELS: Record<Status, string> = {
  reported: "Reported",
  assigned: "Technician assigned",
  parts_sourced: "Parts sourced",
  repaired: "Repaired",
};

function getDowntime(date: string) {
  const diff = Math.max(
    0,
    Date.now() - new Date(date).getTime(),
  );

  const hours = Math.floor(diff / 3_600_000);

  if (hours < 1) return "<1h";
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  const remaining = hours % 24;

  return remaining === 0
    ? `${days}d`
    : `${days}d ${remaining}h`;
}

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);

  const [backupPumps, setBackupPumps] = useState<
    Record<number, BackupPump | null>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState<"board" | "report">(
    "board",
  );

  async function loadIncidents() {
    setError("");

    const {
      data: incidentData,
      error: incidentError,
    } = await supabase
      .from("incidents")
      .select(`
        id,
        pump_id,
        issue_type,
        emergency_tanker,
        status,
        reported_at
      `)
      .neq("status", "repaired")
      .order("reported_at", {
        ascending: true,
      });

    if (incidentError) {
      console.error("INCIDENT ERROR:", incidentError);

      setError(
        "We couldn't load the current service status.",
      );

      setLoading(false);
      return;
    }

    const pumpIds = [
      ...new Set(
        (incidentData ?? []).map(
          (incident) => incident.pump_id,
        ),
      ),
    ];

    if (pumpIds.length === 0) {
      setIncidents([]);
      setBackupPumps({});
      setLoading(false);
      return;
    }

    const {
      data: pumpData,
      error: pumpError,
    } = await supabase
      .from("pumps")
      .select(`
        id,
        pump_code,
        village_id,
        villages (
          name
        )
      `)
      .in("id", pumpIds);

    if (pumpError) {
      console.error("PUMP ERROR:", pumpError);

      setError(
        "We couldn't load pump information.",
      );

      setLoading(false);
      return;
    }

    const pumpsById = new Map(
      (pumpData ?? []).map((pump) => [
        pump.id,
        pump,
      ]),
    );

    const combined = (incidentData ?? []).map(
      (incident) => {
        const pump = pumpsById.get(
          incident.pump_id,
        );

        let village;

        if (pump?.villages) {
          village = Array.isArray(pump.villages)
            ? pump.villages[0]
            : pump.villages;
        }

        return {
          ...incident,
          pump: pump
            ? {
                pump_code: pump.pump_code,
                village,
              }
            : undefined,
        };
      },
    );

    setIncidents(
      combined as unknown as Incident[],
    );

    /*
     * Load the nearest working backup pump
     * for every active incident.
     */
    const backupEntries =
      await Promise.all(
        (incidentData ?? []).map(
          async (incident) => {
            const {
              data,
              error: backupError,
            } = await supabase.rpc(
              "nearest_working_pump",
              {
                p_pump_id:
                  incident.pump_id,
              },
            );

            if (backupError) {
              console.error(
                "BACKUP PUMP ERROR:",
                incident.pump_id,
                backupError,
              );

              return [
                incident.id,
                null,
              ] as const;
            }

            const row = Array.isArray(data)
              ? data[0]
              : data;

            if (!row) {
              return [
                incident.id,
                null,
              ] as const;
            }

            const backup: BackupPump = {
              pump_id: Number(
                row.pump_id,
              ),
              pump_code: String(
                row.pump_code,
              ),
              village_name: String(
                row.village_name,
              ),
              distance_km: Number(
                row.distance_km,
              ),
            };

            console.log(
              "BACKUP PUMP:",
              incident.id,
              incident.pump_id,
              backup,
            );

            return [
              incident.id,
              backup,
            ] as const;
          },
        ),
      );

    const backupMap: Record<
      number,
      BackupPump | null
    > = {};

    for (const [
      incidentId,
      backup,
    ] of backupEntries) {
      backupMap[incidentId] = backup;
    }

    setBackupPumps(backupMap);

    setLoading(false);
  }

  async function loadReportData() {
    const [villagesResult, pumpsResult] =
      await Promise.all([
        supabase
          .from("villages")
          .select("id, name")
          .order("name"),

        supabase
          .from("pumps")
          .select(`
            id,
            village_id,
            pump_code,
            is_working,
            motor_hp,
            depth_m,
            starter_type
          `)
          .order("pump_code"),
      ]);

    if (villagesResult.error) {
      console.error(
        "VILLAGE ERROR:",
        villagesResult.error,
      );
    }

    if (pumpsResult.error) {
      console.error(
        "PUMP LIST ERROR:",
        pumpsResult.error,
      );
    }

    setVillages(villagesResult.data ?? []);
    setPumps(pumpsResult.data ?? []);
  }

  useEffect(() => {
    loadIncidents();
    loadReportData();

    const channel = supabase
      .channel("jalsetu-live-incidents")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "incidents",
        },
        () => {
          loadIncidents();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sortedIncidents = useMemo(() => {
    return [...incidents].sort((a, b) => {
      if (
        a.emergency_tanker !==
        b.emergency_tanker
      ) {
        return a.emergency_tanker ? -1 : 1;
      }

      return (
        new Date(a.reported_at).getTime() -
        new Date(b.reported_at).getTime()
      );
    });
  }, [incidents]);

  const tankerCount = incidents.filter(
    (incident) =>
      incident.emergency_tanker,
  ).length;

  const reportedCount = incidents.filter(
    (incident) =>
      incident.status === "reported",
  ).length;

  if (page === "report") {
    return (
      <ReportPage
        villages={villages}
        pumps={pumps}
        incidents={incidents}
        onBack={() => {
          setPage("board");
          loadIncidents();
        }}
        onSuccess={async () => {
          await loadIncidents();
        }}
      />
    );
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand-button"
            onClick={() => setPage("board")}
          >
            <div className="brand-group">
              <div className="brand-mark">
                J
              </div>

              <div>
                <div className="brand-name">
                  JalSetu
                </div>

                <div className="brand-caption">
                  Water service network
                </div>
              </div>
            </div>
          </button>

          <div className="live-status">
            <span className="live-dot" />
            <span>LIVE</span>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="section-kicker">
              PUBLIC SERVICE STATUS
            </div>

            <h1>
              Know where water
              <br />
              service stands.
            </h1>

            <p>
              Live pump breakdown information
              for the villages in the JalSetu
              service network.
            </p>
          </div>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={() => setPage("report")}
            >
              Report a breakdown
              <span>→</span>
            </button>
          </div>
        </section>

        <section className="summary-grid">
          <div className="summary-card summary-primary">
            <div className="summary-label">
              ACTIVE BREAKDOWNS
            </div>

            <div className="summary-number">
              {incidents.length}
            </div>

            <div className="summary-description">
              Pumps currently offline
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-label">
              TANKER REQUIRED
            </div>

            <div className="summary-number">
              {tankerCount}
            </div>

            <div className="summary-description">
              Villages needing emergency water
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-label">
              AWAITING DISPATCH
            </div>

            <div className="summary-number">
              {reportedCount}
            </div>

            <div className="summary-description">
              Reports without a technician
            </div>
          </div>
        </section>

        <section className="status-section">
          <div className="section-header">
            <div>
              <div className="section-kicker">
                CURRENT INCIDENTS
              </div>

              <h2>Active service issues</h2>
            </div>

            <div className="incident-count">
              {incidents.length} active
            </div>
          </div>

          {loading && (
            <div className="state-panel">
              <div className="loading-spinner" />

              <strong>
                Loading live status
              </strong>

              <span>
                Connecting to the service
                network…
              </span>
            </div>
          )}

          {!loading && error && (
            <div className="state-panel state-error">
              <div className="state-icon">
                !
              </div>

              <strong>
                Service status unavailable
              </strong>

              <span>{error}</span>

              <button
                className="secondary-button"
                onClick={loadIncidents}
              >
                Try again
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            incidents.length === 0 && (
              <div className="state-panel">
                <div className="state-icon success">
                  ✓
                </div>

                <strong>
                  All pumps operational
                </strong>

                <span>
                  No active breakdowns have
                  been reported.
                </span>
              </div>
            )}

          {!loading &&
            !error &&
            incidents.length > 0 && (
              <div className="incident-list">
                {sortedIncidents.map(
                  (incident) => (
                    <IncidentCard
                      key={incident.id}
                      incident={incident}
                      backupPump={
                        backupPumps[incident.id]
                      }
                    />
                  ),
                )}
              </div>
            )}
        </section>
      </main>

      <footer className="site-footer">
        <div>JalSetu</div>

        <span>
          Public operational status · Updates
          automatically
        </span>
      </footer>
    </div>
  );
}

function ReportPage({
  villages,
  pumps,
  incidents,
  onBack,
  onSuccess,
}: {
  villages: Village[];
  pumps: Pump[];
  incidents: Incident[];
  onBack: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [villageId, setVillageId] =
    useState("");

  const [pumpId, setPumpId] =
    useState("");

  const [issueType, setIssueType] =
    useState("");

  const [tanker, setTanker] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const selectedPump = pumps.find(
    (pump) =>
      pump.id === Number(pumpId),
  );

  const activeIncident =
    incidents.find(
      (incident) =>
        incident.pump_id ===
        Number(pumpId),
    );

  const availablePumps = pumps.filter(
    (pump) =>
      pump.village_id ===
      Number(villageId),
  );

  const selectedVillage = villages.find(
    (village) =>
      village.id === Number(villageId),
  );

  async function submitReport() {
    setError("");

    if (
      !villageId ||
      !pumpId ||
      !issueType
    ) {
      setError(
        "Complete the village, pump and problem fields before submitting.",
      );

      return;
    }

    if (activeIncident) {
      setError(
        "This pump already has an active breakdown. No duplicate report was created.",
      );

      return;
    }

    setSubmitting(true);

    const {
      data,
      error: rpcError,
    } = await supabase.rpc(
      "report_incident",
      {
        p_pump_id: Number(pumpId),
        p_issue_type: issueType,
        p_emergency_tanker: tanker,
      },
    );

    setSubmitting(false);

    if (rpcError) {
      console.error(
        "REPORT ERROR:",
        rpcError,
      );

      setError(
        "We couldn't submit the report. Please try again.",
      );

      return;
    }

    const result = Array.isArray(data)
      ? data[0]
      : data;

    if (
      result?.success === false &&
      result?.reason ===
        "active_incident_exists"
    ) {
      setError(
        "This pump already has an active breakdown. No duplicate report was created.",
      );

      return;
    }

    if (
      result?.success === false
    ) {
      setError(
        "This breakdown could not be reported.",
      );

      return;
    }

    setSuccess(true);

    await onSuccess();
  }

  return (
    <div className="report-page">
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand-button"
            onClick={onBack}
          >
            <div className="brand-group">
              <div className="brand-mark">
                J
              </div>

              <div>
                <div className="brand-name">
                  JalSetu
                </div>

                <div className="brand-caption">
                  Water service network
                </div>
              </div>
            </div>
          </button>

          <div className="live-status">
            <span className="live-dot" />
            <span>LIVE</span>
          </div>
        </div>
      </header>

      <main className="report-main">
        <button
          className="back-link"
          onClick={onBack}
        >
          ← Back to service status
        </button>

        <div className="report-intro">
          <div className="section-kicker">
            BREAKDOWN REPORT
          </div>

          <h1>
            Report a pump
            <br />
            problem.
          </h1>

          <p>
            Tell the service team where the
            problem is and what is happening.
            We'll route it into the JalSetu
            repair workflow.
          </p>
        </div>

        {success ? (
          <div className="report-success-card">
            <div className="success-mark">
              ✓
            </div>

            <div>
              <div className="section-kicker">
                REPORT RECEIVED
              </div>

              <h2>
                Breakdown successfully reported.
              </h2>

              <p>
                The incident has been added to
                the live service board.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={onBack}
            >
              Return to service status
              <span>→</span>
            </button>
          </div>
        ) : (
          <div className="report-layout">
            <section className="report-form-card">
              <div className="form-step">
                <div className="step-number">
                  01
                </div>

                <div>
                  <div className="step-label">
                    LOCATION
                  </div>

                  <h2>
                    Where is the problem?
                  </h2>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="village">
                  Village
                </label>

                <select
                  id="village"
                  value={villageId}
                  onChange={(event) => {
                    setVillageId(
                      event.target.value,
                    );
                    setPumpId("");
                    setError("");
                  }}
                >
                  <option value="">
                    Select village
                  </option>

                  {villages.map(
                    (village) => (
                      <option
                        key={village.id}
                        value={village.id}
                      >
                        {village.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="pump">
                  Pump
                </label>

                <select
                  id="pump"
                  value={pumpId}
                  disabled={!villageId}
                  onChange={(event) => {
                    setPumpId(
                      event.target.value,
                    );
                    setError("");
                  }}
                >
                  <option value="">
                    {!villageId
                      ? "Select a village first"
                      : "Select pump"}
                  </option>

                  {availablePumps.map(
                    (pump) => {
                      const hasIncident =
                        incidents.some(
                          (incident) =>
                            incident.pump_id ===
                            pump.id,
                        );

                      return (
                        <option
                          key={pump.id}
                          value={pump.id}
                        >
                          {pump.pump_code}
                          {hasIncident
                            ? " — active breakdown"
                            : ""}
                        </option>
                      );
                    },
                  )}
                </select>
              </div>

              {selectedPump && (
                <div
                  className={`pump-context ${
                    activeIncident
                      ? "pump-context-warning"
                      : ""
                  }`}
                >
                  <div>
                    <strong>
                      {selectedPump.pump_code}
                    </strong>

                    <span>
                      {selectedVillage?.name}
                    </span>
                  </div>

                  <span
                    className={
                      activeIncident
                        ? "pump-state warning"
                        : selectedPump.is_working
                          ? "pump-state"
                          : "pump-state warning"
                    }
                  >
                    {activeIncident
                      ? "Active breakdown"
                      : selectedPump.is_working
                        ? "Operational"
                        : "Currently offline"}
                  </span>
                </div>
              )}

              {activeIncident && (
                <div className="duplicate-notice">
                  <div className="notice-icon">
                    !
                  </div>

                  <div>
                    <strong>
                      This pump is already
                      being handled.
                    </strong>

                    <span>
                      {selectedPump?.pump_code} has
                      an active incident with
                      status{" "}
                      <b>
                        {
                          STATUS_LABELS[
                            activeIncident
                              .status
                          ]
                        }
                      </b>
                      . No duplicate report is
                      needed.
                    </span>
                  </div>
                </div>
              )}

              <div className="form-divider" />

              <div className="form-step">
                <div className="step-number">
                  02
                </div>

                <div>
                  <div className="step-label">
                    PROBLEM
                  </div>

                  <h2>
                    What is happening?
                  </h2>
                </div>
              </div>

              <div className="issue-grid">
                {Object.entries(
                  ISSUE_LABELS,
                ).map(
                  ([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={`issue-button ${
                        issueType === value
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => {
                        setIssueType(value);
                        setError("");
                      }}
                    >
                      <span>
                        {issueType === value
                          ? "✓"
                          : ""}
                      </span>

                      {label}
                    </button>
                  ),
                )}
              </div>

              <div className="form-divider" />

              <div className="form-step">
                <div className="step-number">
                  03
                </div>

                <div>
                  <div className="step-label">
                    WATER ACCESS
                  </div>

                  <h2>
                    Does the village need
                    emergency water?
                  </h2>
                </div>
              </div>

              <div className="tanker-choice">
                <button
                  type="button"
                  className={
                    tanker
                      ? "tanker-choice-button selected"
                      : "tanker-choice-button"
                  }
                  onClick={() =>
                    setTanker(true)
                  }
                >
                  <strong>
                    Yes, tanker needed
                  </strong>

                  <span>
                    Request emergency water
                    while the pump is offline.
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    !tanker
                      ? "tanker-choice-button selected"
                      : "tanker-choice-button"
                  }
                  onClick={() =>
                    setTanker(false)
                  }
                >
                  <strong>
                    No tanker needed
                  </strong>

                  <span>
                    The village has another
                    immediate water source.
                  </span>
                </button>
              </div>

              {error && (
                <div className="form-error">
                  <strong>
                    Unable to submit
                  </strong>

                  <span>{error}</span>
                </div>
              )}

              <button
                className="submit-report-button"
                onClick={submitReport}
                disabled={
                  submitting ||
                  Boolean(activeIncident)
                }
              >
                {submitting
                  ? "Submitting report…"
                  : activeIncident
                    ? "Pump already reported"
                    : "Submit breakdown report"}

                {!submitting &&
                  !activeIncident && (
                    <span>→</span>
                  )}
              </button>

              <p className="form-footnote">
                Your report is added to the
                public service board and made
                available to the technician
                team.
              </p>
            </section>

            <aside className="report-side">
              <div className="side-card">
                <div className="side-card-kicker">
                  WHAT HAPPENS NEXT
                </div>

                <div className="process-item">
                  <span className="process-dot active" />

                  <div>
                    <strong>
                      Report received
                    </strong>

                    <p>
                      The breakdown enters the
                      live service queue.
                    </p>
                  </div>
                </div>

                <div className="process-line" />

                <div className="process-item">
                  <span className="process-dot" />

                  <div>
                    <strong>
                      Technician dispatched
                    </strong>

                    <p>
                      A nearby technician can
                      claim the repair.
                    </p>
                  </div>
                </div>

                <div className="process-line" />

                <div className="process-item">
                  <span className="process-dot" />

                  <div>
                    <strong>
                      Repair completed
                    </strong>

                    <p>
                      The public board records
                      the resolution.
                    </p>
                  </div>
                </div>
              </div>

              <div className="side-note">
                <strong>
                  One report is enough.
                </strong>

                <span>
                  JalSetu prevents duplicate
                  active breakdowns for the
                  same pump.
                </span>
              </div>
            </aside>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <div>JalSetu</div>

        <span>
          Public operational status · Updates
          automatically
        </span>
      </footer>
    </div>
  );
}

function IncidentCard({
  incident,
  backupPump,
}: {
  incident: Incident;
  backupPump?: BackupPump | null;
}) {
  const village =
    incident.pump?.village?.name ??
    "Unknown village";

  const pump =
    incident.pump?.pump_code ??
    "Unknown pump";

  const issue =
    ISSUE_LABELS[
      incident.issue_type
    ] ?? incident.issue_type;

  return (
    <article
      className={`incident-card ${
        incident.emergency_tanker
          ? "incident-urgent"
          : ""
      }`}
    >
      <div className="incident-main">
        <div className="incident-heading">
          <div className="incident-location">
            <span className="location-dot" />
            {village}
          </div>

          <h3>{pump}</h3>

          <p>{issue}</p>
        </div>

        {incident.emergency_tanker && (
          <div className="tanker-badge">
            <span>●</span>
            TANKER NEEDED
          </div>
        )}
      </div>

      <div className="incident-meta">
        <div className="meta-item">
          <span>Downtime</span>

          <strong>
            {getDowntime(
              incident.reported_at,
            )}
          </strong>
        </div>

        <div className="meta-item">
          <span>Status</span>

          <strong
            className={`status-text status-${incident.status}`}
          >
            {STATUS_LABELS[
              incident.status
            ]}
          </strong>
        </div>

        <button
          className="incident-arrow"
          aria-label="View incident"
        >
          →
        </button>
      </div>

      {backupPump && (
        <div className="backup-pump">
          <div className="backup-pump-label">
            NEAREST WORKING PUMP
          </div>

          <div className="backup-pump-main">
            <strong>
              {backupPump.pump_code}
            </strong>

            <span>
              {backupPump.village_name}
            </span>

            <span className="backup-distance">
              {backupPump.distance_km.toFixed(1)}{" "}
              km away
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

export default App;