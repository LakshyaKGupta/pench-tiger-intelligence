import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileText,
  Search,
  Filter,
  ShieldCheck,
  Clock,
  UserCheck,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { intelligenceService } from "@/lib/services";
import type { AuditLogRecord } from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/audit")({
  component: ForensicAuditPage,
});

function ForensicAuditPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const fetchLogs = () => {
    setLoading(true);
    intelligenceService
      .getAuditLogs({
        entity_type: entityFilter === "all" ? undefined : entityFilter,
        limit: 100,
      })
      .then((res) => {
        setLogs(res);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load audit logs:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.entity_id?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.actor?.toLowerCase().includes(search.toLowerCase()) ||
      l.details?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Immutable Forensic Audit Trail
          </h1>
          <p className="data-chip text-muted-foreground">
            Cryptographic, append-only log of all autonomous pipeline decisions and human officer verifications
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search action, actor, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-56 rounded-sm border border-border bg-secondary/80 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="h-9 rounded-sm border border-border bg-secondary/80 px-3 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">All Entity Types</option>
            <option value="detection">Detection</option>
            <option value="alert">Alert</option>
            <option value="tiger">Tiger</option>
            <option value="image">Image</option>
            <option value="pipeline">Pipeline</option>
          </select>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="grid size-9 place-items-center rounded-sm border border-border bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="panel overflow-hidden rounded-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-secondary/60 text-[11px] font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Log ID</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3">Entity Identifier</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Details & Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Loading audit trail from SQLite...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No forensic audit records logged yet.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-mono font-bold text-muted-foreground">
                      #{log.log_id}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-3">
                      <span className="data-chip rounded-sm bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground uppercase">
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-primary">
                      {log.entity_id}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">
                      {log.action}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`data-chip rounded-sm px-2 py-0.5 font-bold ${
                          log.actor.includes("OFFICER")
                            ? "bg-signal/20 text-signal"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {log.actor}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="line-clamp-2 leading-relaxed">{log.details}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
