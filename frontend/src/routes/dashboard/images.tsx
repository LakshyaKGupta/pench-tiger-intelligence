import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Image as ImageIcon,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileWarning,
  ShieldCheck,
  HardDrive,
  Hash,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { intelligenceService } from "@/lib/services";
import { api } from "@/lib/api/client";
import type { ImageRecord } from "@/lib/types/intelligence";

export const Route = createFileRoute("/dashboard/images")({
  component: ImageReviewPage,
});

function ImageReviewPage() {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);

  const fetchImages = () => {
    setLoading(true);
    intelligenceService
      .getImages({
        page,
        limit: 24,
        status: statusFilter === "all" ? undefined : statusFilter,
        is_corrupt: statusFilter === "corrupt" ? true : undefined,
      })
      .then((res) => {
        setImages(res.items);
        setTotal(res.total);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load image manifest:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchImages();
  }, [page, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / 24));

  return (
    <div className="space-y-6">
      {/* Header & Status Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Camera-Trap Media & Quarantine Review
          </h1>
          <p className="data-chip text-muted-foreground">
            Raw camera frames, non-destructive quarantine manifests, and cryptographic SHA-256 hashes
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 rounded-sm border border-border bg-secondary/40 p-1 text-xs">
          {[
            { label: "All Images", value: "all" },
            { label: "Retained Wildlife", value: "retained" },
            { label: "Quarantined Blanks", value: "quarantine" },
            { label: "Corrupt Files", value: "corrupt" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`rounded-sm px-3 py-1.5 font-medium transition-all ${
                statusFilter === tab.value
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Image Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-sm text-muted-foreground">
            Loading camera-trap images from SQLite manifest...
          </div>
        ) : images.length === 0 ? (
          <div className="col-span-full py-20 text-center text-sm text-muted-foreground">
            No camera trap images found for the selected status.
          </div>
        ) : (
          images.map((img) => (
            <div
              key={img.image_id}
              onClick={() => setSelectedImage(img)}
              className="panel group cursor-pointer overflow-hidden rounded-sm border-border p-2.5 transition-all hover:border-primary hover:shadow-lg"
            >
              {/* Media Box */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm bg-black">
                {img.is_corrupt ? (
                  <div className="flex size-full flex-col items-center justify-center p-3 text-center bg-destructive/10 text-destructive">
                    <FileWarning className="size-8 opacity-80" />
                    <span className="mt-2 text-[10px] font-bold">CORRUPT FILE</span>
                  </div>
                ) : (
                  <img
                    src={api.getImageUrl(img.original_path)}
                    alt={img.file_name}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                )}

                {/* Status Badge */}
                <span
                  className={`data-chip absolute top-1.5 right-1.5 rounded-sm px-1.5 py-0.5 text-[9px] font-bold backdrop-blur-xs ${
                    img.status === "retained"
                      ? "bg-signal/80 text-black"
                      : img.status === "quarantine"
                        ? "bg-amber/80 text-black"
                        : "bg-destructive/80 text-white"
                  }`}
                >
                  {img.status.toUpperCase()}
                </span>
              </div>

              {/* Image Info */}
              <div className="mt-2 text-xs">
                <p className="truncate font-mono font-medium text-foreground" title={img.file_name}>
                  {img.file_name}
                </p>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{img.station_id || "Field"}</span>
                  <span>{(img.file_size_bytes / 1024).toFixed(0)} KB</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      <div className="panel flex items-center justify-between rounded-sm p-4 text-xs">
        <span className="text-muted-foreground">
          Showing Page <strong className="text-foreground">{page}</strong> of{" "}
          <strong className="text-foreground">{totalPages}</strong> ({total} total media entries)
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 rounded-sm border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            <ChevronLeft className="size-3.5" /> Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 rounded-sm border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            Next <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
