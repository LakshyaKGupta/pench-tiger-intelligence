import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  FileWarning,
  Image as ImageIcon,
  CheckCircle2,
  Calendar,
  Camera,
  Hash,
  Database,
  X,
  Sparkles,
} from "lucide-react";
import { intelligenceService } from "@/lib/services";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/quarantine")({
  component: QuarantineVaultPage,
});

interface QuarantineItem {
  image_id: string;
  file_name: string;
  original_path: string;
  file_size_bytes?: number;
  station_id: string;
  timestamp: string;
  category: "BLANK_FRAME" | "CORRUPT_MEDIA" | "OFFICER_REJECTED" | "NON_TARGET_WILDLIFE";
  reason: string;
  status: string;
  officer?: string;
}

function QuarantineVaultPage() {
  const [items, setItems] = useState<QuarantineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [previewItem, setPreviewItem] = useState<QuarantineItem | null>(null);

  const loadQuarantine = () => {
    setLoading(true);
    intelligenceService
      .getQuarantineItems()
      .then((res) => {
        setItems(res.items || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load quarantine items:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadQuarantine();
  }, []);

  const totalBytes = items.reduce((acc, itm) => acc + (itm.file_size_bytes || 45000), 0);
  const blankCount = items.filter((i) => i.category === "BLANK_FRAME").length;
  const corruptCount = items.filter((i) => i.category === "CORRUPT_MEDIA").length;
  const officerRejectedCount = items.filter((i) => i.category === "OFFICER_REJECTED").length;
  const nonTargetCount = items.filter((i) => i.category === "NON_TARGET_WILDLIFE").length;

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.file_name.toLowerCase().includes(search.toLowerCase()) ||
      item.station_id.toLowerCase().includes(search.toLowerCase()) ||
      item.reason.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      activeTab === "ALL" ||
      (activeTab === "BLANK" && item.category === "BLANK_FRAME") ||
      (activeTab === "CORRUPT" && item.category === "CORRUPT_MEDIA") ||
      (activeTab === "REJECTED" && item.category === "OFFICER_REJECTED") ||
      (activeTab === "NON_TARGET" && item.category === "NON_TARGET_WILDLIFE");

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldAlert className="size-6 text-amber" />
            Quarantine & Excluded Media Vault
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Auditable repository of blank trigger frames, corrupt files, and human-rejected non-target captures
          </p>
        </div>

        <button
          onClick={loadQuarantine}
          disabled={loading}
          className="h-9 rounded-md border border-border/60 bg-secondary/40 px-3 text-xs font-semibold text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          Refresh Vault
        </button>
      </div>

      {/* KPI Stats Banner */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="calm-card rounded-lg p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Total Quarantined</span>
          <p className="font-display text-2xl font-bold text-foreground">
            {items.length} files
          </p>
          <p className="text-[11px] text-muted-foreground">Preserved in audit trail</p>
        </div>

        <div className="calm-card rounded-lg p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Blank Sensor Triggers</span>
          <p className="font-display text-2xl font-bold text-amber">
            {blankCount} frames
          </p>
          <p className="text-[11px] text-muted-foreground">Wind / vegetation false triggers</p>
        </div>

        <div className="calm-card rounded-lg p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Corrupt / Damaged Files</span>
          <p className="font-display text-2xl font-bold text-destructive">
            {corruptCount} files
          </p>
          <p className="text-[11px] text-muted-foreground">SD card header or write errors</p>
        </div>

        <div className="calm-card rounded-lg p-4 space-y-1">
          <span className="text-xs text-muted-foreground">Officer Excluded Non-Tigers</span>
          <p className="font-display text-2xl font-bold text-primary">
            {officerRejectedCount} captures
          </p>
          <p className="text-[11px] text-muted-foreground">Human quality controlled</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-secondary/30 rounded-lg border border-border/50">
          {[
            { id: "ALL", label: `All (${items.length})` },
            { id: "BLANK", label: `Blank Frames (${blankCount})` },
            { id: "CORRUPT", label: `Corrupt (${corruptCount})` },
            { id: "REJECTED", label: `Officer Excluded (${officerRejectedCount})` },
            { id: "NON_TARGET", label: `Wildlife Excluded (${nonTargetCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute top-2.5 left-3 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search filename, station, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full sm:w-64 rounded-md border border-border/70 bg-secondary/40 pl-8.5 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Quarantined Media Grid */}
      {loading ? (
        <div className="py-24 text-center text-xs text-muted-foreground">
          Loading quarantine vault...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="calm-card rounded-lg p-12 text-center space-y-3">
          <CheckCircle2 className="size-8 text-signal mx-auto" />
          <h3 className="font-display text-sm font-semibold text-foreground">
            No Quarantined Files in View
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {items.length === 0
              ? "The quarantine vault is currently clean. No corrupted files or excluded triggers found."
              : "No quarantine items match your search or filter tab."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const isCorrupt = item.category === "CORRUPT_MEDIA";
            const isBlank = item.category === "BLANK_FRAME";
            const isOfficer = item.category === "OFFICER_REJECTED";

            return (
              <div
                key={item.image_id || item.file_name}
                className="calm-card rounded-lg overflow-hidden border border-border/60 flex flex-col justify-between hover:border-border transition-all"
              >
                <div>
                  {/* Thumbnail Preview Area */}
                  <div className="relative aspect-[16/10] w-full bg-black/40 overflow-hidden flex items-center justify-center">
                    {isCorrupt ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 text-destructive/80 p-4 text-center">
                        <FileWarning className="size-8 text-destructive" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">
                          Corrupt / Damaged Frame
                        </span>
                      </div>
                    ) : item.original_path ? (
                      <img
                        src={api.getImageUrl(item.original_path)}
                        alt={item.file_name}
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground p-4 text-center">
                        <ImageIcon className="size-8 text-muted-foreground/50" />
                        <span className="text-[10px] font-mono">No Image Preview</span>
                      </div>
                    )}

                    {/* Category Tag */}
                    <span
                      className={`absolute top-2 right-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase backdrop-blur-md border ${
                        isCorrupt
                          ? "bg-destructive/80 text-white border-destructive"
                          : isBlank
                            ? "bg-amber/80 text-black border-amber"
                            : isOfficer
                              ? "bg-purple-900/80 text-white border-purple-500"
                              : "bg-blue-900/80 text-white border-blue-500"
                      }`}
                    >
                      {item.category.replace("_", " ")}
                    </span>
                  </div>

                  {/* Card Metadata */}
                  <div className="p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-mono font-bold text-foreground truncate max-w-[170px]" title={item.file_name}>
                        {item.file_name}
                      </h4>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {item.station_id}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {item.reason}
                    </p>

                    <div className="pt-1 border-t border-border/30 text-[10px] text-muted-foreground font-mono space-y-0.5">
                      <div>Timestamp: {item.timestamp || "Logged"}</div>
                      {item.officer && <div>Verified by: {item.officer}</div>}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-2.5 bg-secondary/20 border-t border-border/30 flex items-center justify-between">
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <Eye className="size-3.5" />
                    Inspect Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Item Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="calm-card w-full max-w-2xl rounded-lg border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border/50 p-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-amber" />
                <h3 className="font-display text-sm font-bold text-foreground">
                  Quarantine Forensic Details · {previewItem.file_name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="grid size-7 place-items-center rounded-md border border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4">
              {/* Full Image Preview */}
              {previewItem.category !== "CORRUPT_MEDIA" && previewItem.original_path && (
                <div className="aspect-[16/10] w-full rounded-md overflow-hidden bg-black/60 border border-border/50">
                  <img
                    src={api.getImageUrl(previewItem.original_path)}
                    alt={previewItem.file_name}
                    className="size-full object-contain"
                  />
                </div>
              )}

              {/* Detail Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="calm-card p-3 rounded-md space-y-0.5">
                  <span className="text-muted-foreground text-[11px]">Category</span>
                  <p className="font-semibold text-foreground">{previewItem.category}</p>
                </div>
                <div className="calm-card p-3 rounded-md space-y-0.5">
                  <span className="text-muted-foreground text-[11px]">Camera Station</span>
                  <p className="font-semibold text-foreground">{previewItem.station_id}</p>
                </div>
                <div className="calm-card p-3 rounded-md space-y-0.5 col-span-2">
                  <span className="text-muted-foreground text-[11px]">Quarantine Reason</span>
                  <p className="font-medium text-foreground">{previewItem.reason}</p>
                </div>
                <div className="calm-card p-3 rounded-md space-y-0.5 col-span-2 font-mono text-[11px]">
                  <span className="text-muted-foreground">Original Path</span>
                  <p className="text-muted-foreground break-all">{previewItem.original_path || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border/50 bg-secondary/20 flex justify-end">
              <button
                onClick={() => setPreviewItem(null)}
                className="rounded-md border border-border/60 bg-secondary px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
