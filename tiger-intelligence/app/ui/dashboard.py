"""
dashboard.py — Forest Officer Offline Web Interface
Pench Tiger Reserve — Automated Movement Intelligence & Camera Trap Triage Dashboard
"""

import json
import sqlite3
import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import folium
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from streamlit_folium import st_folium

from app.database.db import TigerDatabase

# Page Configuration
st.set_page_config(
    page_title="Pench Tiger Intelligence System",
    page_icon="🐅",
    layout="wide",
    initial_sidebar_state="expanded",
)

DB_PATH = PROJECT_ROOT / "tiger-intelligence" / "database" / "tiger.db"
if not DB_PATH.exists():
    DB_PATH = PROJECT_ROOT / "database" / "tiger.db"


def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


@st.cache_resource
def get_tiger_db() -> TigerDatabase:
    """Return a TigerDatabase instance (cached for the Streamlit session)."""
    return TigerDatabase(DB_PATH)


# ── Custom CSS Styling ────────────────────────────────────────────────────────
st.markdown("""
<style>
    .metric-card {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 18px 22px;
        color: #f8fafc;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .metric-val { font-size: 2.2rem; font-weight: 700; color: #f97316; }
    .metric-lbl { font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .alert-box-crit {
        background-color: #450a0a; border-left: 5px solid #ef4444; padding: 14px 18px; border-radius: 8px; margin-bottom: 12px;
    }
    .alert-box-warn {
        background-color: #431407; border-left: 5px solid #f97316; padding: 14px 18px; border-radius: 8px; margin-bottom: 12px;
    }
</style>
""", unsafe_allow_html=True)


# ── Navigation Sidebar ────────────────────────────────────────────────────────
st.sidebar.image("https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Tiger.50.jpg/640px-Tiger.50.jpg", use_container_width=True)
st.sidebar.title("🐅 Pench Tiger Intelligence")
st.sidebar.markdown("**Offline Camera Trap Decision Support System**")
st.sidebar.markdown("---")

nav = st.sidebar.radio(
    "Navigation",
    ["📊 Executive Overview", "🗺️ Territory & Movement Map", "🐅 Individual Tiger Profiles", "🚨 Explainable Alerts Feed", "🔍 Human Review Queue", "⚙️ Data Quality & Audit Logs"]
)


# ── TAB 1: Executive Overview ──────────────────────────────────────────────────
if nav == "📊 Executive Overview":
    st.title("Pench Tiger Reserve — Monitoring Dashboard")
    st.caption("Monitoring Cycle 2026-C1 | Offline Field Deployment")

    if not DB_PATH.exists():
        st.warning("Database not initialized yet. Run `python app/pipeline.py` to process camera trap data.")
        st.stop()

    conn = get_db()
    total_images = conn.execute("SELECT COUNT(*) FROM images").fetchone()[0]
    corrupt_images = conn.execute("SELECT COUNT(*) FROM images WHERE is_corrupt = 1").fetchone()[0]
    blank_images = conn.execute("SELECT COUNT(*) FROM images WHERE status = 'blank_quarantined'").fetchone()[0]
    tiger_detections = conn.execute("SELECT COUNT(*) FROM detections WHERE detected_species = 'tiger'").fetchone()[0]
    unique_tigers = conn.execute("SELECT COUNT(*) FROM tigers").fetchone()[0]
    active_alerts = conn.execute("SELECT COUNT(*) FROM alerts WHERE is_dismissed = 0").fetchone()[0]

    # Metrics Bar
    c1, c2, c3, c4, c5, c6 = st.columns(6)
    with c1:
        st.markdown(f'<div class="metric-card"><div class="metric-val">{total_images}</div><div class="metric-lbl">Total Images</div></div>', unsafe_allow_html=True)
    with c2:
        st.markdown(f'<div class="metric-card"><div class="metric-val">{blank_images}</div><div class="metric-lbl">Blanks Filtered</div></div>', unsafe_allow_html=True)
    with c3:
        st.markdown(f'<div class="metric-card"><div class="metric-val">{corrupt_images}</div><div class="metric-lbl">Corrupt Removed</div></div>', unsafe_allow_html=True)
    with c4:
        st.markdown(f'<div class="metric-card"><div class="metric-val">{tiger_detections}</div><div class="metric-lbl">Tiger Sightings</div></div>', unsafe_allow_html=True)
    with c5:
        st.markdown(f'<div class="metric-card"><div class="metric-val">{unique_tigers}</div><div class="metric-lbl">Unique Tigers</div></div>', unsafe_allow_html=True)
    with c6:
        st.markdown(f'<div class="metric-card"><div class="metric-val" style="color:#ef4444">{active_alerts}</div><div class="metric-lbl">Active Alerts</div></div>', unsafe_allow_html=True)

    st.markdown("---")

    col_left, col_right = st.columns([1.2, 1])

    with col_left:
        st.subheader("Species Breakdown Across Camera Grids")
        df_species = pd.read_sql_query(
            "SELECT detected_species, COUNT(*) as count FROM detections GROUP BY detected_species", conn
        )
        if not df_species.empty:
            fig = px.pie(df_species, values="count", names="detected_species", hole=0.4, color_discrete_sequence=px.colors.qualitative.Prism)
            fig.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=320)
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No detections recorded yet.")

    with col_right:
        st.subheader("Tiger Sightings by Station")
        df_stn = pd.read_sql_query(
            "SELECT station_id, COUNT(*) as sightings FROM detections WHERE detected_species='tiger' GROUP BY station_id", conn
        )
        if not df_stn.empty:
            fig_bar = px.bar(df_stn, x="station_id", y="sightings", color="sightings", color_continuous_scale="Viridis")
            fig_bar.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=320)
            st.plotly_chart(fig_bar, use_container_width=True)
        else:
            st.info("No station sightings yet.")


# ── TAB 2: Territory & Movement Map ───────────────────────────────────────────
elif nav == "🗺️ Territory & Movement Map":
    st.title("Pench Tiger Reserve — Spatial Movement & Territory Intelligence")
    st.caption("Interactive Minimum Convex Polygon (MCP) Territories, Grid Stations & Conflict Boundaries")

    conn = get_db()
    tigers = pd.read_sql_query("SELECT * FROM tigers", conn)
    stations = pd.read_sql_query("SELECT * FROM camera_stations", conn)
    movements = pd.read_sql_query("SELECT * FROM movement_records ORDER BY timestamp ASC", conn)

    # Base Folium Map centered on Pench National Park (approx 21.74, 79.33)
    m = folium.Map(location=[21.7450, 79.3350], zoom_start=12, tiles="CartoDB dark_matter")

    # Draw Stations
    for _, stn in stations.iterrows():
        zone = stn["zone"]
        color = "green" if zone == "Core" else ("orange" if zone == "Buffer" else "red")
        folium.CircleMarker(
            location=[stn["latitude"], stn["longitude"]],
            radius=7,
            color=color,
            fill=True,
            fill_color=color,
            fill_opacity=0.7,
            popup=f"<b>Station:</b> {stn['station_id']}<br><b>Zone:</b> {zone}<br><b>Dist to Village:</b> {stn['distance_to_village_km']} km",
            tooltip=f"Station {stn['station_id']} ({zone})"
        ).add_to(m)

    # Draw Tiger Sightings & Trajectories
    colors = ["#f97316", "#06b6d4", "#a855f7", "#eab308", "#ec4899", "#22c55e"]
    for idx, t in tigers.iterrows():
        tid = t["tiger_id"]
        t_color = colors[idx % len(colors)]
        t_moves = movements[movements["tiger_id"] == tid]

        if not t_moves.empty:
            pts = [[r["latitude"], r["longitude"]] for _, r in t_moves.iterrows()]
            # Sighting points
            for _, r in t_moves.iterrows():
                folium.Marker(
                    location=[r["latitude"], r["longitude"]],
                    icon=folium.Icon(color="orange", icon="paw", prefix="fa"),
                    popup=f"<b>{tid}</b><br>Station: {r['station_id']}<br>Time: {r['timestamp']}",
                ).add_to(m)

            # Polyline trajectory
            if len(pts) >= 2:
                folium.PolyLine(pts, color=t_color, weight=3, opacity=0.8, tooltip=f"Trajectory: {tid}").add_to(m)

            # Territory Centroid
            if t["current_centroid_lat"] and t["current_centroid_lon"]:
                folium.Marker(
                    location=[t["current_centroid_lat"], t["current_centroid_lon"]],
                    icon=folium.Icon(color="red", icon="star"),
                    popup=f"<b>Centroid: {tid}</b><br>Area: {t['home_range_area_km2']:.2f} km²",
                ).add_to(m)

    st_folium(m, width=1300, height=600)


# ── TAB 3: Individual Tiger Profiles ──────────────────────────────────────────
elif nav == "🐅 Individual Tiger Profiles":
    st.title("Individual Tiger Profiles & Flank Catalogue")
    conn = get_db()
    tigers = pd.read_sql_query("SELECT * FROM tigers", conn)

    if tigers.empty:
        st.info("No tigers registered in database yet.")
    else:
        selected_tid = st.selectbox("Select Tiger ID", tigers["tiger_id"].tolist())
        tiger_info = tigers[tigers["tiger_id"] == selected_tid].iloc[0]

        c1, c2, c3 = st.columns([1, 2, 2])
        with c1:
            st.markdown(f"### **{tiger_info['name']}**")
            st.markdown(f"**ID:** `{tiger_info['tiger_id']}`")
            st.markdown(f"**Gender:** `{tiger_info['gender']}`")
            st.markdown(f"**Status:** `{tiger_info['status']}`")
            st.markdown(f"**Total Sightings:** `{tiger_info['total_sightings']}`")
            st.markdown(f"**Observed Area (MCP):** `{tiger_info['home_range_area_km2']:.2f} km²`")
            st.markdown(f"**Last Seen:** `{tiger_info['last_seen']}`")

        with c2:
            st.subheader("Reference Flank Crop")
            ref_path = tiger_info["reference_image_path"]
            if ref_path and Path(ref_path).exists():
                st.image(ref_path, caption=f"Reference capture for {selected_tid}", use_container_width=True)
            else:
                st.info("Reference image path not accessible.")

        with c3:
            st.subheader("Sighting Trajectory History")
            sightings = pd.read_sql_query(
                "SELECT timestamp, station_id, latitude, longitude FROM movement_records WHERE tiger_id = ? ORDER BY timestamp ASC",
                conn, params=(selected_tid,)
            )
            st.dataframe(sightings, use_container_width=True, height=280)


# ── TAB 4: Explainable Alerts Feed ─────────────────────────────────────────────
elif nav == "🚨 Explainable Alerts Feed":
    st.title("Explainable Movement & Ecological Alerts")
    st.caption("Deterministic, survey-effort corrected alerts generated from camera trap data")

    conn = get_db()
    alerts = pd.read_sql_query("SELECT * FROM alerts ORDER BY timestamp DESC", conn)

    if alerts.empty:
        st.success("✅ No critical alerts active. Tiger movement patterns within historical baselines.")
    else:
        for _, alt in alerts.iterrows():
            sev = alt["severity"]
            box_class = "alert-box-crit" if sev == "CRITICAL" else "alert-box-warn"
            st.markdown(f"""
            <div class="{box_class}">
                <h4 style="margin:0 0 8px 0; color:#fff;">[{sev}] {alt['title']}</h4>
                <p style="margin:0; color:#cbd5e1;">{alt['explanation']}</p>
                <div style="font-size:0.8rem; color:#94a3b8; margin-top:6px;">
                    Tiger: <b>{alt['tiger_id']}</b> | Station: <b>{alt['station_id']}</b> | Timestamp: <b>{alt['timestamp']}</b>
                </div>
            </div>
            """, unsafe_allow_html=True)


# ── TAB 5: Human Review Queue ────────────────────────────────────────────────
elif nav == "🔍 Human Review Queue":
    st.title("Human-in-the-Loop Re-ID Verification Queue")
    st.caption("Ambiguous tiger matches in [45%–65%) confidence band staged for side-by-side human audit. Original AI prediction is always preserved.")

    tiger_db = get_tiger_db()
    pending = tiger_db.get_pending_reviews()

    if not pending:
        st.success("✅ No pending reviews in queue. All detections classified with high confidence.")
    else:
        st.write(f"**{len(pending)} detection(s) awaiting officer review.**")
        all_tiger_ids = [t["tiger_id"] for t in tiger_db.get_all_tigers()]

        for row in pending:
            det_id = row["detection_id"]
            with st.expander(
                f"🔎 Detection `{det_id}` — Candidate: `{row['reid_matched_tiger_id']}` "
                f"(Similarity: {row['reid_similarity']:.1%})  |  Station: {row.get('station_id', 'N/A')}  |  {row.get('timestamp', '')[:10]}"
            ):
                col1, col2, col3 = st.columns([2, 2, 3])

                with col1:
                    st.markdown("**Query Image**")
                    img_path = Path(row.get("original_path", ""))
                    if img_path.exists():
                        st.image(str(img_path), use_container_width=True)
                    else:
                        st.warning(f"Image not found: `{img_path.name}`")

                with col2:
                    st.markdown(f"**Candidate Reference (`{row['reid_matched_tiger_id']}`)**")
                    crop_path = Path(row.get("crop_path") or "")
                    if crop_path.exists():
                        st.image(str(crop_path), caption="Extracted Flank Crop", use_container_width=True)
                    else:
                        st.info("No crop image stored.")

                with col3:
                    st.markdown("**AI Prediction (preserved)**")
                    st.json({
                        "ai_candidate": row.get("reid_matched_tiger_id"),
                        "similarity": f"{row['reid_similarity']:.3f}",
                        "confidence_band": row.get("reid_confidence_level"),
                        "detector_species_conf": f"{row.get('species_confidence', 0):.3f}",
                        "station": row.get("station_id"),
                        "timestamp": row.get("timestamp"),
                    })

                    st.markdown("**Officer Decision**")
                    btn_col1, btn_col2 = st.columns(2)

                    with btn_col1:
                        if st.button("✓ Confirm Match", key=f"conf_{det_id}", type="primary"):
                            ok = tiger_db.apply_human_correction(
                                detection_id=det_id,
                                human_decision="CONFIRMED",
                                corrected_tiger_id=row["reid_matched_tiger_id"],
                                actor="OFFICER_UI",
                            )
                            if ok:
                                st.success(f"Confirmed: Detection `{det_id}` → `{row['reid_matched_tiger_id']}`. Decision persisted to database.")
                                st.rerun()
                            else:
                                st.error("Failed to persist decision. Check database connection.")

                    with btn_col2:
                        if st.button("✗ Register as New Tiger", key=f"new_{det_id}"):
                            ok = tiger_db.apply_human_correction(
                                detection_id=det_id,
                                human_decision="NEW_TIGER",
                                corrected_tiger_id=None,
                                actor="OFFICER_UI",
                            )
                            if ok:
                                st.warning(f"Marked as new/unknown tiger. Detection `{det_id}` updated. Enroll new profile manually.")
                                st.rerun()
                            else:
                                st.error("Failed to persist decision.")

                    # Reassign to a different known tiger
                    with st.form(key=f"reassign_{det_id}"):
                        st.markdown("**Reassign to a different known tiger:**")
                        chosen_id = st.selectbox("Select tiger ID", options=all_tiger_ids, key=f"sel_{det_id}")
                        if st.form_submit_button("🔁 Reassign"):
                            ok = tiger_db.apply_human_correction(
                                detection_id=det_id,
                                human_decision="REASSIGNED",
                                corrected_tiger_id=chosen_id,
                                actor="OFFICER_UI",
                            )
                            if ok:
                                st.success(f"Reassigned `{det_id}` → `{chosen_id}`. Persisted to database.")
                                st.rerun()
                            else:
                                st.error("Failed to persist reassignment.")


# ── TAB 6: Data Quality & Audit Logs ──────────────────────────────────────────────
elif nav == "⚙️ Data Quality & Audit Logs":
    st.title("Camera Trap Data Quality & Audit Trails")
    conn = get_db()

    st.subheader("Data Quality Flags on Ingested Files")
    df_quality = pd.read_sql_query("SELECT file_name, station_id, timestamp, status, data_quality_flags FROM images", conn)
    st.dataframe(df_quality, use_container_width=True)

    st.subheader("System Audit Trail")
    df_audit = pd.read_sql_query("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 50", conn)
    st.dataframe(df_audit, use_container_width=True)
