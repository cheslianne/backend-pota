(function () {
    function escapeText(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function statusMeta(status) {
        const value = String(status || "").toUpperCase();
        if (value.includes("SURPLUS") || value.includes("OVERSUPPLY")) {
            return { key: "surplus", label: "Surplus", color: "#C0392B" };
        }
        if (value.includes("BALANCE")) {
            return { key: "balanced", label: "Balanced", color: "#14532D" };
        }
        if (value.includes("DEFICIT")) {
            return { key: "deficit", label: "Deficit", color: "#A16207" };
        }
        return { key: "nodata", label: "No Data", color: "#202824" };
    }

    function formatVolume(value) {
        const number = Number(value);
        return Number.isFinite(number)
            ? `${number > 0 ? "+" : ""}${number.toLocaleString("en-PH")}kg`
            : "";
    }

    window.renderMunicipalityMapPanel = function ({ data, markers, map }) {
        const chipRow = document.getElementById("mapStatusSummary");
        const municipalityList = document.getElementById("mapMunicipalityList");
        if (!chipRow || !municipalityList) return;

        const commodity = document.getElementById("filterCommodity")?.value || "all";
        const selectedStatus = document.getElementById("filterStatus")?.value || "all";
        const counts = { surplus: 0, balanced: 0, deficit: 0, nodata: 0 };
        const rows = [];

        (Array.isArray(data) ? data : []).forEach((municipalityData) => {
            const items = (Array.isArray(municipalityData.commodities)
                ? municipalityData.commodities
                : []
            ).filter((item) => {
                const commodityMatch = commodity === "all"
                    || String(item.commodity || "").toLowerCase() === commodity.toLowerCase();
                const statusMatch = selectedStatus === "all"
                    || String(item.status || "").toUpperCase().includes(selectedStatus);
                return commodityMatch && statusMatch;
            });

            if (!items.length) return;

            const tags = items.map((item) => {
                const meta = statusMeta(item.status);
                counts[meta.key] += 1;
                const volume = typeof item.surplus_deficit === "number"
                    ? ` (${formatVolume(item.surplus_deficit)})`
                    : "";
                return `<span class="pc-tag ${meta.key}">${escapeText(item.commodity || "—")} · ${meta.label}${volume}</span>`;
            }).join("");

            rows.push(`
                <button class="pc-muni-row" type="button" data-municipality="${escapeText(municipalityData.municipality)}">
                    <span class="pc-muni-name">${escapeText(municipalityData.municipality || "—")}</span>
                    <span class="pc-muni-tags">${tags}</span>
                </button>
            `);
        });

        chipRow.innerHTML = `
            <div class="pc-status-chip surplus"><span class="dot"></span>Surplus/Oversupply <span class="count">${counts.surplus}</span></div>
            <div class="pc-status-chip balanced"><span class="dot"></span>Balanced <span class="count">${counts.balanced}</span></div>
            <div class="pc-status-chip deficit"><span class="dot"></span>Deficit <span class="count">${counts.deficit}</span></div>
            <div class="pc-status-chip nodata"><span class="dot"></span>No Data <span class="count">${counts.nodata}</span></div>
        `;
        municipalityList.innerHTML = rows.length
            ? rows.join("")
            : `<div class="pc-empty">No municipalities match the current filters.</div>`;

        municipalityList.querySelectorAll("[data-municipality]").forEach((row) => {
            row.addEventListener("click", () => {
                const municipalityMarkers = markers?.[row.dataset.municipality] || [];
                const target = municipalityMarkers[0];
                if (!target || !map) return;
                map.setView(target.marker.getLatLng(), 14, { animate: true });
                target.marker.openPopup();
            });
        });
    };
}());
