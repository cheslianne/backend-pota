/* ============================================================
   eSAKA — AEW DASHBOARD
   Complete Frontend JavaScript
============================================================ */

/* ============================================================
   API CONFIGURATION
============================================================ */

const API_BASE_URL = "http://127.0.0.1:8000";

const FARMERS_ENDPOINT = `${API_BASE_URL}/api/farmers/farmers/`;
const PLANTING_INTENTS_ENDPOINT = `${API_BASE_URL}/api/planting-intents/`;
const RAW_PLANT_REPORTS_ENDPOINT = `${API_BASE_URL}/api/raw-plant-reports/from-planting-intent`;
const REPORT_SUBMISSIONS_ENDPOINT = `${API_BASE_URL}/api/report-submissions`;
const OFFTAKE_REQUESTS_ENDPOINT = `${API_BASE_URL}/api/offtake-requests/`;
const FORECASTS_ENDPOINT = `${API_BASE_URL}/api/forecasts/`;

/* ============================================================
   AUTH
============================================================ */

function getAuthToken() {
    return localStorage.getItem("access_token") || localStorage.getItem("token") || null;
}

function getAuthHeaders() {
    const token = getAuthToken();
    const headers = { "Content-Type": "application/json" };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

/* ============================================================
   STATE
============================================================ */

let FARMERS_DATA = [];
let allFarmers = [];
let allBuyers = [];

// Planting Intent
let PLANTING_INTENTS_DATA = [];
let filteredPlantingIntents = [];

// Pagination
let currentFarmersPage = 1;
let currentPlantingIntentsPage = 1;
const farmersPerPage = 10;
const plantingIntentsPerPage = 10;

// Farmer state
let currentActiveFarmer = null;
let isEditMode = false;
let mapInstance = null;

// Offtake state
let currentOfftakeRequest = null;
let OFFTAKE_REQUESTS_DATA = [];

// Add this near other state variables (around line 40)
let FORECASTS_DATA = [];
let priceChartInstance = null;


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
    console.log("eSaka AEW Dashboard loaded.");

    initSidebar();
    initViewNavigation();
    initMap();
    initFarmerSubviews();
    initPlantingIntent();
    initOfftakeRequest();
    initFairPrice();
    initFairPriceMonthDropdown();
    initSignout();
    setupUserProfile();
    initForecastResults();

    await fetchFarmers();
    await loadAllReports();
    await fetchOfftakeRequests();

    initializePlantingIntentSearch();
});

/* ============================================================
   USER PROFILE
============================================================ */

function setupUserProfile() {
    const storedName = localStorage.getItem("full_name") || localStorage.getItem("name") || localStorage.getItem("username");
    const storedRole = localStorage.getItem("role");

    const nameElement = document.getElementById("userDisplayName");
    const roleElement = document.getElementById("userDisplayRole");

    if (nameElement && storedName) nameElement.textContent = storedName;
    if (roleElement && storedRole) roleElement.textContent = storedRole;
}

/* ============================================================
   API REQUEST HELPER
============================================================ */

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...(options.headers || {})
        }
    });

    let data = null;
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        try { data = await response.json(); } catch { data = null; }
    } else {
        try { data = await response.text(); } catch { data = null; }
    }

    if (!response.ok) {
        let message = `HTTP ${response.status}`;
        if (data && typeof data === "object") {
            if (data.detail) {
                message = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
            }
        } else if (typeof data === "string" && data.trim()) {
            message = data;
        }
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

function handleAuthError(error) {
    if (error && (error.status === 401 || error.status === 403)) {
        console.warn("Authentication/authorization error:", error);
        return true;
    }
    return false;
}

/* ============================================================
   SIDEBAR
============================================================ */

function initSidebar() {
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const sidebar = document.getElementById("sidebar");

    if (!hamburgerBtn || !sidebar) return;

    let hoverTimer = null;

    hamburgerBtn.addEventListener("mouseenter", function() {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
        setTimeout(function() {
            sidebar.classList.add("open");
            setTimeout(function() {
                if (mapInstance) mapInstance.invalidateSize();
            }, 300);
        }, 100);
    });

    sidebar.addEventListener("mouseleave", function() {
        hoverTimer = setTimeout(function() {
            sidebar.classList.remove("open");
        }, 200);
    });

    sidebar.addEventListener("mouseenter", function() {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    });

    document.addEventListener("click", function(event) {
        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnHamburger = hamburgerBtn.contains(event.target);
        if (!isClickInsideSidebar && !isClickOnHamburger) {
            sidebar.classList.remove("open");
        }
    });

    sidebar.querySelectorAll(".nav-item").forEach(function(item) {
        item.addEventListener("click", function() {
            sidebar.classList.remove("open");
        });
    });

    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            sidebar.classList.remove("open");
        }
    });

    const signoutBtn = sidebar.querySelector(".signout");
    if (signoutBtn) {
        signoutBtn.addEventListener("click", function() {
            sidebar.classList.remove("open");
        });
    }
}

/* ============================================================
   VIEW NAVIGATION
============================================================ */

function initViewNavigation() {
    const navButtons = document.querySelectorAll(".nav-item[data-view]");
    const views = document.querySelectorAll(".view");

    navButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const targetViewKey = this.dataset.view;

            views.forEach(function(view) {
                view.classList.remove("active-view");
            });

            const targetView = document.getElementById("view-" + targetViewKey);
            if (targetView) {
                targetView.classList.add("active-view");
            }

            navButtons.forEach(function(navButton) {
                navButton.classList.toggle("active", navButton === button);
            });

            if (targetViewKey === "map" && mapInstance) {
                setTimeout(function() {
                    mapInstance.invalidateSize();
                }, 100);
            }
        });
    });
}

/* ============================================================
   SIGN OUT
============================================================ */

function initSignout() {
    const signoutBtn = document.getElementById("signoutBtn");
    if (!signoutBtn) return;

    signoutBtn.addEventListener("click", function() {
        localStorage.removeItem("access_token");
        localStorage.removeItem("token");
        localStorage.removeItem("full_name");
        localStorage.removeItem("name");
        localStorage.removeItem("username");
        localStorage.removeItem("role");
        window.location.href = "../index.html";
    });
}

/* ============================================================
   MAP
============================================================ */

function initMap() {
    const mapEl = document.getElementById("map");
    if (!mapEl || typeof L === "undefined") return;

    const pampangaBounds = L.latLngBounds([14.85, 120.35], [15.35, 120.95]);

    mapInstance = L.map("map", {
        maxBounds: pampangaBounds,
        maxBoundsViscosity: 1.0,
        minZoom: 10
    }).setView([15.0794, 120.6200], 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18
    }).addTo(mapInstance);
}

/* ============================================================
   FARMERS
============================================================ */

function normalizeFarmer(farmer) {
    return {
        farmer_id: farmer.farmer_id ?? null,
        rsbsa_id: farmer.rsbsa_id ?? "",
        first_name: farmer.first_name ?? "",
        middle_name: farmer.middle_name ?? "",
        last_name: farmer.last_name ?? "",
        suffix: farmer.suffix ?? "",
        address: farmer.address ?? "",
        sex: farmer.sex ?? "",
        birthdate: farmer.birthdate ?? "",
        email_address: farmer.email_address ?? "",
        phone_number: farmer.phone_number ?? "",
        region: farmer.region ?? "",
        municipality: farmer.municipality ?? "",
        barangay: farmer.barangay ?? "",
        status: farmer.status ?? "Active"
    };
}

function getFarmerFullName(farmer) {
    return [
        farmer.first_name,
        farmer.middle_name ? farmer.middle_name.charAt(0) + "." : "",
        farmer.last_name,
        farmer.suffix
    ].filter(Boolean).join(" ");
}

async function fetchFarmers() {
    const tbody = document.getElementById("farmersTableBody");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:30px; text-align:center;">Loading farmers...</td></tr>`;
    }

    try {
        const data = await apiRequest(FARMERS_ENDPOINT, { method: "GET" });
        allFarmers = data;

        if (!Array.isArray(data)) {
            throw new Error("Invalid farmers response.");
        }

        FARMERS_DATA = data.map(normalizeFarmer);
        currentFarmersPage = 1;
        renderFarmersTable();
        return FARMERS_DATA;
    } catch (error) {
        console.error("Unable to load farmers:", error);
        FARMERS_DATA = [];
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:30px; text-align:center; color:#C0392B;">Failed to load farmers.<br><small>${escapeHtml(error.message || "Please check the FastAPI server.")}</small></td></tr>`;
        }
        updatePagination();
        return [];
    }
}

function renderFarmersTable() {
    const tbody = document.getElementById("farmersTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";
    const start = (currentFarmersPage - 1) * farmersPerPage;
    const end = start + farmersPerPage;
    const paginatedItems = FARMERS_DATA.slice(start, end);

    if (paginatedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:30px; text-align:center; color:#777;">No farmers found.</td></tr>`;
        updatePagination();
        return;
    }

    paginatedItems.forEach(function(farmer) {
        const tr = createFarmerTableRow(farmer);
        tbody.appendChild(tr);
    });

    updatePagination();
}

function createFarmerTableRow(farmer) {
    const tr = document.createElement("tr");
    tr.className = "clickable-row";

    const fullName = getFarmerFullName(farmer);

    tr.innerHTML = `
        <td><span class="pill">${escapeHtml(fullName)}</span></td>
        <td><span class="pill">${escapeHtml(farmer.rsbsa_id || "-")}</span></td>
        <td><span class="pill">${escapeHtml(farmer.municipality || "-")}</span></td>
        <td><span class="pill">${escapeHtml(farmer.barangay || "-")}</span></td>
        <td><span class="status-pill active">${escapeHtml(farmer.status || "Active")}</span></td>
    `;

    tr.addEventListener("click", function() {
        openManageFarmer(farmer);
    });

    return tr;
}

function updatePagination() {
    const total = FARMERS_DATA.length;
    const totalPages = Math.max(1, Math.ceil(total / farmersPerPage));

    if (currentFarmersPage > totalPages) currentFarmersPage = totalPages;

    const start = total === 0 ? 0 : (currentFarmersPage - 1) * farmersPerPage + 1;
    const end = Math.min(currentFarmersPage * farmersPerPage, total);

    const info = document.getElementById("paginationInfo");
    if (info) info.textContent = `Showing ${start}-${end} of ${total} farmers`;

    const prev = document.getElementById("prevPageBtn");
    if (prev) prev.disabled = currentFarmersPage <= 1;

    const next = document.getElementById("nextPageBtn");
    if (next) next.disabled = currentFarmersPage >= totalPages;

    const btns = document.getElementById("pageNumberBtns");
    if (btns) {
        btns.innerHTML = "";
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = `btn-page ${i === currentFarmersPage ? "active" : ""}`;
            btn.textContent = i;
            btn.type = "button";
            btn.addEventListener("click", function() {
                currentFarmersPage = i;
                renderFarmersTable();
            });
            btns.appendChild(btn);
        }
    }
}

function initFarmerSearch() {
    const searchInput = document.getElementById("searchFarmersInput");
    if (!searchInput) return;

    searchInput.addEventListener("input", function() {
        const keyword = this.value.toLowerCase().trim();

        if (!keyword) {
            currentFarmersPage = 1;
            renderFarmersTable();
            return;
        }

        const filtered = FARMERS_DATA.filter(function(farmer) {
            const searchableText = [
                farmer.rsbsa_id,
                farmer.first_name,
                farmer.middle_name,
                farmer.last_name,
                farmer.suffix,
                farmer.address,
                farmer.email_address,
                farmer.phone_number,
                farmer.sex,
                farmer.birthdate,
                farmer.region,
                farmer.municipality,
                farmer.barangay,
                farmer.status
            ].join(" ").toLowerCase();

            return searchableText.includes(keyword);
        });

        currentFarmersPage = 1;
        renderFilteredFarmers(filtered);
    });
}

function renderFilteredFarmers(data) {
    const tbody = document.getElementById("farmersTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:30px; text-align:center; color:#777;">No farmers found.</td></tr>`;
        updateSearchPaginationText(0);
        return;
    }

    data.forEach(function(farmer) {
        const tr = createFarmerTableRow(farmer);
        tbody.appendChild(tr);
    });

    updateSearchPaginationText(data.length);
}

function updateSearchPaginationText(resultCount) {
    const paginationInfo = document.getElementById("paginationInfo");
    if (!paginationInfo) return;

    paginationInfo.textContent = `Showing ${resultCount} of ${FARMERS_DATA.length} farmers`;
}

/* ============================================================
   FARMER SUBVIEWS
============================================================ */

function initFarmerSubviews() {
    const listSubview = document.getElementById("farmersListSubview");
    const regSubview = document.getElementById("registerFarmerSubview");
    const manSubview = document.getElementById("manageFarmerSubview");

    const addBtn = document.getElementById("addFarmerBtn");
    const cancelRegBtn = document.getElementById("cancelRegisterFarmerBtn");
    const backManBtn = document.getElementById("backFromManageFarmerBtn");
    const regForm = document.getElementById("registerFarmerForm");
    const toggleEditBtn = document.getElementById("toggleEditFarmerBtn");
    const deleteBtn = document.getElementById("deleteFarmerBtn");
    const confirmDeleteBtn = document.getElementById("confirmDeleteFarmerBtn");

    initFarmerSearch();

    // ADD FARMER
    addBtn?.addEventListener("click", function() {
        if (regForm) regForm.reset();
        setValue("regFarmerId", "");
        listSubview?.classList.add("hidden-element");
        regSubview?.classList.remove("hidden-element");
    });

    // CANCEL REGISTER
    cancelRegBtn?.addEventListener("click", function() {
        if (regForm) regForm.reset();
        listSubview?.classList.remove("hidden-element");
        regSubview?.classList.add("hidden-element");
    });

    // BACK FROM MANAGE
    backManBtn?.addEventListener("click", function() {
        manSubview?.classList.add("hidden-element");
        listSubview?.classList.remove("hidden-element");
        currentActiveFarmer = null;
        isEditMode = false;
    });

    // REGISTER FARMER
    regForm?.addEventListener("submit", async function(event) {
        event.preventDefault();

        const barangay = getValue("regBarangay");
        const municipality = getValue("regMunicipality");

        const farmerData = {
            rsbsa_id: getValue("regFarmerId"),
            first_name: getValue("regFirstName"),
            middle_name: getValue("regMiddleName"),
            last_name: getValue("regLastName"),
            suffix: getValue("regSuffix"),
            address: barangay + ", " + municipality,
            barangay: barangay,
            municipality: municipality,
            sex: getValue("regSex"),
            birthdate: getValue("regBirthdate"),
            phone_number: getValue("regPhone"),
            email_address: getValue("regEmail")
        };

        if (!farmerData.rsbsa_id || !farmerData.first_name || !farmerData.last_name || !farmerData.address) {
            alert("Please fill in all required fields.");
            return;
        }

        const confirmText = document.getElementById("confirmFarmerText");
        if (confirmText) {
            confirmText.textContent = "Register " + farmerData.first_name + " " + farmerData.last_name + " from " + farmerData.address + "?";
        }

        window._pendingFarmer = farmerData;
        document.getElementById("confirmFarmerModal")?.classList.add("show");
    });

    // CONFIRM SAVE FARMER
    document.getElementById("confirmSaveFarmerBtn")?.addEventListener("click", async function() {
        const farmerData = window._pendingFarmer;
        if (!farmerData) {
            alert("No farmer data to save.");
            return;
        }

        try {
            await apiRequest(FARMERS_ENDPOINT, {
                method: "POST",
                body: JSON.stringify(farmerData)
            });

            document.getElementById("confirmFarmerModal")?.classList.remove("show");
            await fetchFarmers();
            document.getElementById("farmerAddedModal")?.classList.add("show");
            regForm?.reset();
            window._pendingFarmer = null;
        } catch (error) {
            console.error("Create farmer error:", error);
            document.getElementById("confirmFarmerModal")?.classList.remove("show");
            alert("Failed to add farmer.\n\n" + (error.message || "Please check the FastAPI server."));
        }
    });

    // CLOSE FARMER ADDED MODAL
    document.getElementById("closeFarmerAddedBtn")?.addEventListener("click", function() {
        document.getElementById("farmerAddedModal")?.classList.remove("show");
        regSubview?.classList.add("hidden-element");
        listSubview?.classList.remove("hidden-element");
    });

    // EDIT / SAVE FARMER
    toggleEditBtn?.addEventListener("click", async function() {
        const editableInputs = document.querySelectorAll(".man-editable");

        if (!isEditMode) {
            isEditMode = true;
            editableInputs.forEach(function(input) {
                input.readOnly = false;
                input.classList.add("input-editable-active");
                input.classList.remove("input-readonly");
            });
            this.textContent = "Save Changes";

            // Create Cancel button
            let cancelBtn = document.getElementById("cancelEditFarmerBtn");
            if (!cancelBtn) {
                cancelBtn = document.createElement("button");
                cancelBtn.id = "cancelEditFarmerBtn";
                cancelBtn.className = "btn-outline-report";
                cancelBtn.textContent = "Cancel";
                cancelBtn.style.marginRight = "8px";
                this.parentNode.insertBefore(cancelBtn, this);
                cancelBtn.addEventListener("click", cancelFarmerEdit);
            }
            cancelBtn.style.display = "inline-flex";
            return;
        }

        if (!currentActiveFarmer) {
            alert("No farmer selected.");
            return;
        }

        const confirmSave = confirm("Are you sure you want to save these changes?\n\nFarmer: " + getFarmerFullName(currentActiveFarmer));
        if (!confirmSave) return;

        const updateData = {
            address: getValue("manAddress"),
            phone_number: getValue("manPhone"),
            email_address: getValue("manEmail")
        };

        try {
            const farmerId = currentActiveFarmer.farmer_id;

            await apiRequest(FARMERS_ENDPOINT + farmerId, {
                method: "PUT",
                body: JSON.stringify(updateData)
            });

            isEditMode = false;
            editableInputs.forEach(function(input) {
                input.readOnly = true;
                input.classList.remove("input-editable-active");
                input.classList.add("input-readonly");
            });

            this.textContent = "Edit Contact Info";

            const cancelBtn = document.getElementById("cancelEditFarmerBtn");
            if (cancelBtn) cancelBtn.style.display = "none";

            await fetchFarmers();
            alert("Farmer updated successfully.");
        } catch (error) {
            console.error("Update farmer error:", error);
            alert("Failed to update farmer.\n\n" + (error.message || "Check FastAPI server."));
        }
    });

    // DELETE FARMER
    deleteBtn?.addEventListener("click", function() {
        if (!currentActiveFarmer) {
            alert("No farmer selected.");
            return;
        }
        document.getElementById("deleteFarmerModal")?.classList.add("show");
    });

    // CONFIRM DELETE
    confirmDeleteBtn?.addEventListener("click", async function() {
        if (!currentActiveFarmer) return;

        try {
            const farmerId = currentActiveFarmer.farmer_id;

            await apiRequest(FARMERS_ENDPOINT + farmerId, {
                method: "DELETE"
            });

            document.getElementById("deleteFarmerModal")?.classList.remove("show");
            currentActiveFarmer = null;
            await fetchFarmers();

            manSubview?.classList.add("hidden-element");
            listSubview?.classList.remove("hidden-element");

            alert("Farmer deleted successfully.");
        } catch (error) {
            console.error("Delete farmer error:", error);
            document.getElementById("deleteFarmerModal")?.classList.remove("show");
            document.getElementById("deleteErrorModal")?.classList.add("show");
        }
    });

    // CLOSE DELETE ERROR MODAL
    document.getElementById("closeDeleteErrorBtn")?.addEventListener("click", function() {
        document.getElementById("deleteErrorModal")?.classList.remove("show");
    });

    document.getElementById("deleteErrorModal")?.addEventListener("click", function(event) {
        if (event.target === this) {
            this.classList.remove("show");
        }
    });

    // CANCEL DELETE
    document.getElementById("cancelDeleteFarmerBtn")?.addEventListener("click", function() {
        document.getElementById("deleteFarmerModal")?.classList.remove("show");
    });

    document.getElementById("deleteFarmerModal")?.addEventListener("click", function(event) {
        if (event.target === this) {
            this.classList.remove("show");
        }
    });

    // PAGINATION
    document.getElementById("prevPageBtn")?.addEventListener("click", function() {
        if (currentFarmersPage > 1) {
            currentFarmersPage--;
            renderFarmersTable();
        }
    });

    document.getElementById("nextPageBtn")?.addEventListener("click", function() {
        const totalPages = Math.max(1, Math.ceil(FARMERS_DATA.length / farmersPerPage));
        if (currentFarmersPage < totalPages) {
            currentFarmersPage++;
            renderFarmersTable();
        }
    });
}

/* ============================================================
   CANCEL FARMER EDIT
============================================================ */

function cancelFarmerEdit() {
    const farmer = currentActiveFarmer;
    if (!farmer) return;

    if (!confirm("Are you sure you want to cancel editing?\n\nYour changes will be discarded.")) return;

    setValue("manAddress", farmer.address || "");
    setValue("manPhone", farmer.phone_number || "");
    setValue("manEmail", farmer.email_address || "");

    const editableInputs = document.querySelectorAll(".man-editable");
    editableInputs.forEach(function(input) {
        input.readOnly = true;
        input.classList.remove("input-editable-active");
        input.classList.add("input-readonly");
    });

    isEditMode = false;

    const toggleBtn = document.getElementById("toggleEditFarmerBtn");
    if (toggleBtn) toggleBtn.textContent = "Edit Contact Info";

    const backBtn = document.getElementById("backFromManageFarmerBtn");
    if (backBtn) backBtn.style.display = "inline-flex";

    const deleteBtn = document.getElementById("deleteFarmerBtn");
    if (deleteBtn) deleteBtn.style.display = "inline-flex";

    const cancelBtn = document.getElementById("cancelEditFarmerBtn");
    if (cancelBtn) cancelBtn.style.display = "none";

    console.log("Farmer edit cancelled.");
}

/* ============================================================
   OPEN MANAGE FARMER
============================================================ */

function openManageFarmer(farmer) {
    if (!farmer) return;

    currentActiveFarmer = farmer;
    isEditMode = false;

    setValue("manFarmerId", farmer.rsbsa_id || "");
    setValue("manAddress", farmer.address || "");
    setValue("manFirstName", farmer.first_name || "");
    setValue("manMiddleName", farmer.middle_name || "");
    setValue("manLastName", farmer.last_name || "");
    setValue("manSuffix", farmer.suffix || "");
    setValue("manSex", farmer.sex || "");
    setValue("manBirthdate", farmer.birthdate || "");
    setValue("manPhone", farmer.phone_number || "");
    setValue("manEmail", farmer.email_address || "");

    document.querySelectorAll(".man-editable").forEach(function(input) {
        input.readOnly = true;
        input.classList.remove("input-editable-active");
        input.classList.add("input-readonly");
    });

    const editBtn = document.getElementById("toggleEditFarmerBtn");
    if (editBtn) editBtn.textContent = "Edit Contact Info";

    const backBtn = document.getElementById("backFromManageFarmerBtn");
    if (backBtn) backBtn.style.display = "inline-flex";

    const deleteBtn = document.getElementById("deleteFarmerBtn");
    if (deleteBtn) deleteBtn.style.display = "inline-flex";

    const cancelBtn = document.getElementById("cancelEditFarmerBtn");
    if (cancelBtn) cancelBtn.style.display = "none";

    document.getElementById("farmersListSubview")?.classList.add("hidden-element");
    document.getElementById("manageFarmerSubview")?.classList.remove("hidden-element");
}

/* ============================================================
   PLANTING INTENT
============================================================ */

/* ============================================================
   INITIALIZE PLANTING INTENT
============================================================ */

function initPlantingIntent() {
    const list = document.getElementById("plantingIntentListSubview");
    const formSubview = document.getElementById("submitPlantIntentSubview");
    const modal = document.getElementById("plantIntentSubmittedModal");

    fetchPlantingIntents();

    // ADD BUTTON
    document.getElementById("addPlantIntentBtn")?.addEventListener("click", function() {
        const form = document.getElementById("submitPlantIntentForm");
        if (form) form.reset();
        if (list) list.classList.add("hidden-element");
        if (formSubview) formSubview.classList.remove("hidden-element");
    });

    // CANCEL BUTTON
    document.getElementById("cancelPlantIntentBtn")?.addEventListener("click", function() {
        const form = document.getElementById("submitPlantIntentForm");
        if (form) form.reset();
        if (formSubview) formSubview.classList.add("hidden-element");
        if (list) list.classList.remove("hidden-element");
    });

    // BACK FROM DETAILS
    document.getElementById("backFromPlantingIntentDetailsBtn")?.addEventListener("click", function() {
        window.isEditingPlantingIntent = false;

        const cancelBtn = document.getElementById("cancelEditPlantingIntentBtn");
        if (cancelBtn) cancelBtn.remove();

        const editBtn = document.getElementById("editPlantingIntentBtn");
        if (editBtn) {
            editBtn.textContent = "Edit Details";
            editBtn.style.background = "#D97706";
            editBtn.disabled = false;
        }

        const submitBtn = document.getElementById("submitPlantingIntentBtn");
        if (submitBtn) {
            submitBtn.textContent = "Submit Report";
            submitBtn.style.display = "inline-flex";
            submitBtn.style.background = "#2E7D32";
            submitBtn.disabled = false;
        }

        const backBtn = document.getElementById("backFromPlantingIntentDetailsBtn");
        if (backBtn) backBtn.style.display = "inline-flex";

        const details = document.getElementById("plantingIntentDetailsSubview");
        if (details) details.classList.add("hidden-element");
        if (list) list.classList.remove("hidden-element");

        window.currentSelectedPlantingIntent = null;
        fetchPlantingIntents();
    });

    // EDIT BUTTON
    document.getElementById("editPlantingIntentBtn")?.addEventListener("click", function() {
        togglePlantingIntentEditMode();
    });

    // SUBMIT / PULL BUTTON
    document.getElementById("submitPlantingIntentBtn")?.addEventListener("click", async function() {
    const intent = window.currentSelectedPlantingIntent;
    if (!intent) {
        alert("No planting intent selected.");
        return;
    }

    const currentText = this.textContent.trim();

    // ====================================================
    // PULL SUBMISSION
    // ====================================================

    if (currentText.includes("Pull")) {
        if (!confirm("Are you sure you want to PULL this submission back for revisions?")) {
            return;
        }

        this.disabled = true;
        this.textContent = "Pulling...";

        try {
            let reportId = intent.report_id || intent.planting_intent_id;
            const allReports = await apiRequest(REPORT_SUBMISSIONS_ENDPOINT + "/all-reports", { method: "GET" });
            const foundReport = allReports.find(function(r) {
                return r.planting_intent_id === intent.planting_intent_id;
            });
            if (foundReport) {
                reportId = foundReport.report_id || foundReport.id;
            }

            await apiRequest(REPORT_SUBMISSIONS_ENDPOINT + "/" + reportId + "/pull", { method: "POST" });

            intent.status = "DRAFT";
            intent.revision_count = (intent.revision_count || 0) + 1;
            intent.updated_at = new Date().toISOString();
            intent.report_id = reportId;
            window.currentSelectedPlantingIntent = intent;

            const pullIndex = PLANTING_INTENTS_DATA.findIndex(function(item) {
                return item.planting_intent_id === intent.planting_intent_id;
            });
            if (pullIndex !== -1) {
                PLANTING_INTENTS_DATA[pullIndex].status = "DRAFT";
                PLANTING_INTENTS_DATA[pullIndex].revision_count = intent.revision_count;
                PLANTING_INTENTS_DATA[pullIndex].updated_at = intent.updated_at;
            }

            filteredPlantingIntents = [];
            currentPlantingIntentsPage = 1;
            renderPlantingIntentsTable();
            openPlantingIntentDetails(intent);

            alert("✅ Submission pulled back successfully. You can now edit the report.");

         } catch (error) {
            console.error("Pull error:", error);
            alert("Failed to pull submission.\n\n" + (error.message || "Please try again."));
            // Only reset label on failure — success path already set it via openPlantingIntentDetails()
            this.textContent = "Pull Submission";
        } finally {
            this.disabled = false;
        }

        // ✅ IMPORTANT: Stop here, don't run the submit code
        return;
    }

    // ====================================================
    // SUBMIT REPORT (Only runs if button text is NOT "Pull")
    // ====================================================

    if (!intent.planting_date) {
        alert("Planting date is required.");
        return;
    }

    const estimatedYield = String(intent.volume || "").replace(/,/g, "").replace(/kg/gi, "").trim();
    if (!estimatedYield || !/^\d+(\.\d+)?$/.test(estimatedYield)) {
        alert("Estimated yield must be a valid number.");
        return;
    }

    const encodedBy = localStorage.getItem("user_id");
    if (!encodedBy) {
        alert("Logged-in user ID was not found.");
        return;
    }

    if (!confirm("Are you sure you want to SUBMIT this planting report?")) {
        return;
    }

    this.disabled = true;
    this.textContent = "Submitting...";

    try {
        let reportId = null;
        const allReports = await apiRequest(REPORT_SUBMISSIONS_ENDPOINT + "/all-reports", { method: "GET" });
        const existingReport = allReports.find(function(r) {
            return r.planting_intent_id === intent.planting_intent_id;
        });

        if (existingReport) {
            reportId = existingReport.report_id;
            await apiRequest(API_BASE_URL + "/api/raw-plant-reports/" + reportId, {
                method: "PUT",
                body: JSON.stringify({
                    planting_date: intent.planting_date,
                    estimated_yield: estimatedYield
                })
            });
        } else {
            const createdReport = await apiRequest(RAW_PLANT_REPORTS_ENDPOINT + "/" + intent.planting_intent_id, {
                method: "POST"
            });
            reportId = createdReport?.report_id || createdReport?.id;
        }

        if (!reportId) throw new Error("No report ID found.");

        await apiRequest(REPORT_SUBMISSIONS_ENDPOINT + "/" + reportId + "/submit", {
            method: "POST"
        });

        intent.status = "FOR_MUNICIPAL_VALIDATION";
        intent.updated_at = new Date().toISOString();
        intent.report_id = reportId;
        window.currentSelectedPlantingIntent = intent;

        const submitIndex = PLANTING_INTENTS_DATA.findIndex(function(item) {
            return item.planting_intent_id === intent.planting_intent_id;
        });
        if (submitIndex !== -1) {
            PLANTING_INTENTS_DATA[submitIndex].status = "FOR_MUNICIPAL_VALIDATION";
            PLANTING_INTENTS_DATA[submitIndex].updated_at = intent.updated_at;
            PLANTING_INTENTS_DATA[submitIndex].report_id = reportId;
        }

        filteredPlantingIntents = [];
        currentPlantingIntentsPage = 1;
        renderPlantingIntentsTable();
        openPlantingIntentDetails(intent);

        alert("✅ Planting Report submitted successfully!\n\nStatus: FOR_MUNICIPAL_VALIDATION");

    } catch (error) {
        console.error("Submit error:", error);
        alert("Failed to submit planting report.\n\n" + (error.message || "Please try again."));
        // Only reset label on failure — success path already set it via openPlantingIntentDetails()
        this.textContent = "Submit Report";
    } finally {
        this.disabled = false;
    }
});


    // SUBMIT PLANTING INTENT FORM
    document.getElementById("submitPlantIntentForm")?.addEventListener("submit", async function(event) {
        event.preventDefault();
        await submitPlantingIntent();
    });

    // CLOSE SUCCESS MODAL
    document.getElementById("closePlantIntentSubmittedBtn")?.addEventListener("click", function() {
        if (modal) modal.classList.remove("show");
        if (formSubview) formSubview.classList.add("hidden-element");
        if (list) list.classList.remove("hidden-element");
        fetchPlantingIntents();
    });
}

/* ============================================================
   NORMALIZE PLANTING INTENT
============================================================ */

/* ============================================================
   NORMALIZE PLANTING INTENT (Continued)
============================================================ */

function normalizePlantingIntent(intent) {
    return {
        planting_intent_id: intent.planting_intent_id || intent.id || null,
        farmer_id: intent.farmer_id || null,
        farmer_name: intent.farmer_name || intent.name || "-",
        commodity: intent.commodity || intent.crop || "-",
        volume: intent.volume || intent.planned_volume || intent.quantity || "",
        location: intent.location || intent.municipality || intent.barangay || "-",
        planting_date: intent.planting_date || "",
        harvest_date: intent.harvest_date || intent.expected_harvest_date || "",
        remarks: intent.remarks || "",
        status: intent.status || intent.report_status || "Pending",
        created_at: intent.created_at || null,
        updated_at: intent.updated_at || null,
        revision_count: intent.revision_count || 0,
        report_id: intent.report_id || null
    };
}

/* ============================================================
   SEARCH PLANTING INTENTS
============================================================ */

function initializePlantingIntentSearch() {
    const searchInput = document.getElementById("searchPlantingIntentsInput");
    if (!searchInput) {
        console.warn("Search input #searchPlantingIntentsInput not found");
        return;
    }

    searchInput.addEventListener("input", function() {
        const keyword = this.value.toLowerCase().trim();

        if (!keyword) {
            filteredPlantingIntents = [];
            currentPlantingIntentsPage = 1;
            renderPlantingIntentsTable();
            return;
        }

        const searchWords = keyword.split(/\s+/).filter(function(w) { return w.length > 0; });

        const filtered = PLANTING_INTENTS_DATA.filter(function(intent) {
            const searchableFields = [
                intent.farmer_name || "",
                intent.commodity || "",
                intent.location || "",
                intent.remarks || "",
                intent.status || "",
                String(intent.volume || "")
            ];
            const searchableText = searchableFields.join(" ").toLowerCase();
            return searchWords.every(function(word) {
                return searchableText.includes(word);
            });
        });

        console.log("Search for '" + keyword + "' found " + filtered.length + " planting intents");

        filteredPlantingIntents = filtered;
        currentPlantingIntentsPage = 1;
        renderPlantingIntentsTable();
    });
}

/* ============================================================
   FETCH PLANTING INTENTS
============================================================ */

async function fetchPlantingIntents() {
    const tbody = document.getElementById("plantingIntentsTableBody");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:30px; text-align:center;">Loading planting intents...</td></tr>`;
    }

    try {
        console.log("Fetching planting intents:", PLANTING_INTENTS_ENDPOINT);
        const data = await apiRequest(PLANTING_INTENTS_ENDPOINT, { method: "GET" });
        console.log("Planting Intents API response:", data);

        if (!Array.isArray(data)) {
            throw new Error("Invalid planting intents response. Expected an array.");
        }

        PLANTING_INTENTS_DATA = data.map(normalizePlantingIntent);
        filteredPlantingIntents = [];
        currentPlantingIntentsPage = 1;
        renderPlantingIntentsTable();

        console.log("Successfully loaded " + PLANTING_INTENTS_DATA.length + " planting intent(s).");

        setTimeout(function() {
            const paginationContainer = document.querySelector("#plantingIntentListSubview .pagination-container");
            if (!paginationContainer) {
                createPlantingIntentPagination();
            }
        }, 100);

        return PLANTING_INTENTS_DATA;
    } catch (error) {
        console.error("Unable to load planting intents:", error);
        PLANTING_INTENTS_DATA = [];
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:30px; text-align:center; color:#C0392B;">Failed to load planting intents.<br><small>${escapeHtml(error.message || "Please check the FastAPI server.")}</small></td></tr>`;
        }
        handleAuthError(error);
        return [];
    }
}

/* ============================================================
   RENDER PLANTING INTENTS TABLE
============================================================ */

function renderPlantingIntentsTable() {
    const tbody = document.getElementById("plantingIntentsTableBody");
    if (!tbody) {
        console.warn("plantingIntentsTableBody not found.");
        return;
    }

    tbody.innerHTML = "";

    const searchInput = document.getElementById("searchPlantingIntentsInput");
    const isSearching = Boolean(searchInput?.value.trim());

    const dataSource = isSearching
        ? filteredPlantingIntents
        : PLANTING_INTENTS_DATA;

    const totalCount = dataSource.length;

  if (dataSource.length === 0) {
    const message = isSearching
        ? "No planting intents match your search."
        : "No planting intents found.";

    tbody.innerHTML = `
        <tr>
            <td colspan="7" style="padding:30px;text-align:center;color:#777;">
                ${message}
            </td>
        </tr>
    `;

    updatePlantingIntentPagination(0);
    return;
}

    const start = (currentPlantingIntentsPage - 1) * plantingIntentsPerPage;
    const end = start + plantingIntentsPerPage;
    const paginatedItems = dataSource.slice(start, end);

    if (paginatedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding:30px; text-align:center; color:#777;">No planting intents found on this page.</td></tr>`;
        return;
    }

    paginatedItems.forEach(function(intent) {
        const tr = document.createElement("tr");
        tr.className = "clickable-row";

        const farmerName = intent.farmer_name || "-";
        const commodity = intent.commodity || "-";
        const volume = formatPlantingVolume(intent.volume);
        const location = intent.location || "-";
        const plantingDate = formatPlantingDate(intent.planting_date);
        const harvestDate = formatPlantingDate(intent.harvest_date);
        const status = intent.status || "Pending";

        let statusClass = "pending";
        if (status === "FOR_MUNICIPAL_VALIDATION" || status === "FOR_PROVINCIAL_VALIDATION" || status === "FOR_DA_RFO_VALIDATION") {
            statusClass = "submitted";
        } else if (status === "FINAL_APPROVED") {
            statusClass = "approved";
        }

        tr.innerHTML = `
            <td><span class="pill">${escapeHtml(farmerName)}</span></td>
            <td><span class="pill">${escapeHtml(commodity)}</span></td>
            <td><span class="pill">${escapeHtml(volume)}</span></td>
            <td><span class="pill">${escapeHtml(location)}</span></td>
            <td><span class="pill">${escapeHtml(plantingDate)}</span></td>
            <td><span class="pill">${escapeHtml(harvestDate)}</span></td>
            <td><span class="status-pill ${statusClass}">${escapeHtml(status)}</span></td>
        `;

        tr.addEventListener("click", function() {
            openPlantingIntentDetails(intent);
        });

        tbody.appendChild(tr);
    });

    updatePlantingIntentPagination(totalCount);
}

/* ============================================================
   OPEN PLANTING INTENT DETAILS
============================================================ */

/* ============================================================
   OPEN PLANTING INTENT DETAILS - FIXED
============================================================ */

function openPlantingIntentDetails(intent) {
    console.log("Selected Planting Intent:", intent);

    const list = document.getElementById("plantingIntentListSubview");
    const details = document.getElementById("plantingIntentDetailsSubview");

    if (!details) {
        console.warn("plantingIntentDetailsSubview not found.");
        return;
    }

    window.currentSelectedPlantingIntent = intent;

    if (list) list.classList.add("hidden-element");
    details.classList.remove("hidden-element");

    // Display data
    setValue("detailPlantingIntentId", intent.planting_intent_id || "");
    setValue("detailFarmerName", intent.farmer_name || "");
    setValue("detailFarmerId", intent.farmer_id || "");
    setValue("detailCommodity", intent.commodity || "");
    setValue("detailVolume", formatPlantingVolume(intent.volume));
    setValue("detailLocation", intent.location || "");
    setValue("detailPlantingDate", intent.planting_date || "");
    setValue("detailHarvestDate", intent.harvest_date || "");
    setValue("detailRemarks", intent.remarks || "");

    // Display revision info
    const revisionInfo = document.getElementById("detailRevisionInfo");
    if (revisionInfo) {
        if (intent.revision_count !== undefined && intent.revision_count > 0) {
            revisionInfo.textContent = "Revision #" + intent.revision_count + " | Last updated: " + formatPlantingDate(intent.updated_at || intent.created_at);
            revisionInfo.style.display = "block";
        } else {
            revisionInfo.textContent = "Original submission";
            revisionInfo.style.display = "block";
        }
    }

    // Reset Edit Mode
    window.isEditingPlantingIntent = false;

    // Make all fields readonly
    const detailInputs = details.querySelectorAll("input, textarea, select");
    detailInputs.forEach(function(input) {
        if (input.tagName === "SELECT") {
            input.disabled = true;
        } else {
            input.readOnly = true;
        }
        input.classList.add("input-readonly");
        input.classList.remove("input-editable-active");
    });

    // Get button references
    const editBtn = document.getElementById("editPlantingIntentBtn");
    const submitBtn = document.getElementById("submitPlantingIntentBtn");
    const backBtn = document.getElementById("backFromPlantingIntentDetailsBtn");

    if (backBtn) backBtn.style.display = "inline-flex";

    // ✅ CHECK STATUS - Use the actual status from the intent object
    const status = intent.status || "PENDING";
    console.log("Current status:", status);
    
    // ✅ Check if status is DRAFT or PENDING (editable states)
    const isEditable = status === "DRAFT" || status === "PENDING" || status === "Pending";
    const isSubmitted = status === "FOR_MUNICIPAL_VALIDATION" || 
                        status === "FOR_PROVINCIAL_VALIDATION" || 
                        status === "FOR_DA_RFO_VALIDATION" ||
                        status === "SUBMITTED";

    console.log("isEditable:", isEditable);
    console.log("isSubmitted:", isSubmitted);

    if (isSubmitted) {
        // Already submitted - Show "Pull Submission" button
        if (submitBtn) {
            submitBtn.textContent = "Pull Submission";
            submitBtn.style.display = "inline-flex";
            submitBtn.style.background = "#D97706";
            submitBtn.style.color = "#fff";
            submitBtn.disabled = false;
            submitBtn.title = "Pull back this submission for revisions";
        }
        // Disable Edit button
        if (editBtn) {
            editBtn.textContent = "Edit Details";
            editBtn.style.background = "#999";
            editBtn.style.cursor = "not-allowed";
            editBtn.disabled = true;
        }
    } else if (isEditable) {
        // ✅ DRAFT/PENDING - Show "Submit Report" button
        if (submitBtn) {
            submitBtn.textContent = "Submit Report";
            submitBtn.style.display = "inline-flex";
            submitBtn.style.background = "#2E7D32";
            submitBtn.style.color = "#fff";
            submitBtn.disabled = false;
            submitBtn.title = "Submit this report for validation";
        }
        // ✅ ENABLE Edit button
        if (editBtn) {
            editBtn.textContent = "Edit Details";
            editBtn.style.background = "#D97706";
            editBtn.style.cursor = "pointer";
            editBtn.disabled = false;
        }
    } else {
        // Fallback - unknown status
        if (submitBtn) {
            submitBtn.textContent = "Submit Report";
            submitBtn.style.display = "inline-flex";
            submitBtn.style.background = "#2E7D32";
            submitBtn.style.color = "#fff";
            submitBtn.disabled = false;
        }
        if (editBtn) {
            editBtn.textContent = "Edit Details";
            editBtn.style.background = "#D97706";
            editBtn.style.cursor = "pointer";
            editBtn.disabled = false;
        }
    }

    // Remove Cancel button if exists
    var cancelBtn = document.getElementById("cancelEditPlantingIntentBtn");
    if (cancelBtn) cancelBtn.remove();
}

/* ============================================================
   TOGGLE PLANTING INTENT EDIT MODE
============================================================ */

function togglePlantingIntentEditMode() {
    const intent = window.currentSelectedPlantingIntent;
    if (!intent) {
        alert("No planting intent selected.");
        return;
    }

    const details = document.getElementById("plantingIntentDetailsSubview");
    if (!details) return;

    const editBtn = document.getElementById("editPlantingIntentBtn");
    const submitBtn = document.getElementById("submitPlantingIntentBtn");
    const backBtn = document.getElementById("backFromPlantingIntentDetailsBtn");
    const detailInputs = details.querySelectorAll("input, textarea, select");

    const existingCancel = document.getElementById("cancelEditPlantingIntentBtn");
    if (existingCancel) existingCancel.remove();

    if (!window.isEditingPlantingIntent) {
        window.isEditingPlantingIntent = true;

         detailInputs.forEach(function(input) {
            const id = input.id;
            if (id === "detailPlantingIntentId" || id === "detailFarmerId") return;
            if (input.tagName === "SELECT") {
                input.disabled = false;
            } else {
                input.readOnly = false;
            }
            input.classList.remove("input-readonly");
            input.classList.add("input-editable-active");
        });

        if (editBtn) {
            editBtn.textContent = "Save Changes";
            editBtn.style.background = "#2E7D32";
        }

        if (submitBtn) {
            submitBtn.style.display = "none";
        }

        if (backBtn) {
            backBtn.style.display = "none";
        }

        const cancelBtn = document.createElement("button");
        cancelBtn.id = "cancelEditPlantingIntentBtn";
        cancelBtn.className = "btn-outline-report";
        cancelBtn.textContent = "Cancel";
        cancelBtn.style.marginRight = "8px";
        editBtn.parentNode.insertBefore(cancelBtn, editBtn);

        cancelBtn.addEventListener("click", function() {
            cancelPlantingIntentEdit();
        });

        console.log("Entered edit mode. Back button hidden, Cancel button shown.");
    } else {
        const confirmSave = confirm("Are you sure you want to save these changes?");
        if (!confirmSave) return;
        savePlantingIntentChanges();
    }
}



/* ============================================================
   CANCEL PLANTING INTENT EDIT
============================================================ */

function cancelPlantingIntentEdit() {
    const intent = window.currentSelectedPlantingIntent;
    if (!intent) {
        console.warn("No planting intent to cancel edit.");
        return;
    }

    const details = document.getElementById("plantingIntentDetailsSubview");
    if (!details) return;

    if (!confirm("Are you sure you want to cancel editing?\n\nYour changes will be discarded.")) return;

    setValue("detailPlantingIntentId", intent.planting_intent_id || "");
    setValue("detailFarmerName", intent.farmer_name || "");
    setValue("detailFarmerId", intent.farmer_id || "");
    setValue("detailCommodity", intent.commodity || "");
    setValue("detailVolume", formatPlantingVolume(intent.volume));
    setValue("detailLocation", intent.location || "");
    setValue("detailPlantingDate", intent.planting_date || "");
    setValue("detailHarvestDate", intent.harvest_date || "");
    setValue("detailRemarks", intent.remarks || "");

   const detailInputs = details.querySelectorAll("input, textarea, select");
    detailInputs.forEach(function(input) {
        if (input.tagName === "SELECT") {
            input.disabled = true;
        } else {
            input.readOnly = true;
        }
        input.classList.add("input-readonly");
        input.classList.remove("input-editable-active");
    });

    window.isEditingPlantingIntent = false;

    const editBtn = document.getElementById("editPlantingIntentBtn");
    if (editBtn) {
        editBtn.textContent = "Edit Details";
        editBtn.style.background = "#D97706";
    }

    const submitBtn = document.getElementById("submitPlantingIntentBtn");
    if (submitBtn) {
        submitBtn.style.display = "inline-flex";
        submitBtn.textContent = "Submit Report";
        submitBtn.disabled = false;
        submitBtn.style.background = "#2E7D32";
    }

    const backBtn = document.getElementById("backFromPlantingIntentDetailsBtn");
    if (backBtn) backBtn.style.display = "inline-flex";

    const cancelBtn = document.getElementById("cancelEditPlantingIntentBtn");
    if (cancelBtn) cancelBtn.remove();

    console.log("Planting intent edit cancelled. Back button restored.");
}

/* ============================================================
   SAVE PLANTING INTENT CHANGES
============================================================ */

async function savePlantingIntentChanges() {
    const intent = window.currentSelectedPlantingIntent;
    if (!intent) {
        alert("No planting intent selected.");
        return;
    }

    function convertToAPIDate(dateString) {
        if (!dateString) return "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
        const dateParts = dateString.split('/');
        if (dateParts.length === 3) {
            let month = dateParts[0].trim().padStart(2, '0');
            let day = dateParts[1].trim().padStart(2, '0');
            let year = dateParts[2].trim();
            return year + "-" + month + "-" + day;
        }
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
        return dateString;
    }

    const rawPlantingDate = document.getElementById("detailPlantingDate")?.value || intent.planting_date;
    const rawHarvestDate = document.getElementById("detailHarvestDate")?.value || intent.harvest_date;

    const updatedData = {
        planting_intent_id: intent.planting_intent_id,
        farmer_name: document.getElementById("detailFarmerName")?.value || intent.farmer_name,
        farmer_id: intent.farmer_id,
        commodity: document.getElementById("detailCommodity")?.value || intent.commodity,
        volume: document.getElementById("detailVolume")?.value || intent.volume,
        location: document.getElementById("detailLocation")?.value || intent.location,
        planting_date: convertToAPIDate(rawPlantingDate),
        harvest_date: convertToAPIDate(rawHarvestDate),
        remarks: document.getElementById("detailRemarks")?.value || intent.remarks
    };

    try {
        if (!updatedData.planting_date || !updatedData.harvest_date || !updatedData.commodity) {
            alert("Please fill in all required fields.");
            return;
        }

        const volumeValue = String(updatedData.volume).replace(/,/g, "").replace(/kg/gi, "").trim();
        const payload = {
            farmer_id: updatedData.farmer_id,
            commodity: updatedData.commodity,
            volume: updatedData.volume,
            planting_date: updatedData.planting_date,
            harvest_date: updatedData.harvest_date,
            remarks: updatedData.remarks || null
        };

        const url = PLANTING_INTENTS_ENDPOINT + intent.planting_intent_id;
        const token = getAuthToken();

        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token ? "Bearer " + token : ""
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorData = null;
            try { errorData = await response.json(); } catch(e) {}
            let errorMessage = "Failed to update planting intent.";
            if (errorData && errorData.detail) errorMessage = errorData.detail;
            throw new Error(errorMessage);
        }

        await response.json();

        intent.farmer_name = updatedData.farmer_name;
        intent.commodity = updatedData.commodity;
        intent.volume = updatedData.volume;
        intent.location = updatedData.location;
        intent.planting_date = updatedData.planting_date;
        intent.harvest_date = updatedData.harvest_date;
        intent.remarks = updatedData.remarks;

        const index = PLANTING_INTENTS_DATA.findIndex(function(item) {
            return item.planting_intent_id === intent.planting_intent_id;
        });
        if (index !== -1) {
            PLANTING_INTENTS_DATA[index] = intent;
        }

        window.isEditingPlantingIntent = false;

         const details = document.getElementById("plantingIntentDetailsSubview");
        if (details) {
            const inputs = details.querySelectorAll("input, textarea, select");
            inputs.forEach(function(input) {
                if (input.tagName === "SELECT") {
                    input.disabled = true;
                } else {
                    input.readOnly = true;
                }
                input.classList.add("input-readonly");
                input.classList.remove("input-editable-active");
            });
        }

        const editBtn = document.getElementById("editPlantingIntentBtn");
        if (editBtn) {
            editBtn.textContent = "Edit Details";
            editBtn.style.background = "#D97706";
        }

        const submitBtn = document.getElementById("submitPlantingIntentBtn");
        if (submitBtn) {
            submitBtn.style.display = "inline-flex";
            submitBtn.textContent = "Submit Report";
            submitBtn.disabled = false;
        }

        const backBtn = document.getElementById("backFromPlantingIntentDetailsBtn");
        if (backBtn) backBtn.style.display = "inline-flex";

        const cancelBtn = document.getElementById("cancelEditPlantingIntentBtn");
        if (cancelBtn) cancelBtn.remove();

        renderPlantingIntentsTable();
        alert("Planting Intent updated successfully!");
    } catch (error) {
        console.error("Save planting intent error:", error);
        alert("Failed to update planting intent.\n\n" + error.message);
    }
}
/* ============================================================
   SUBMIT PLANTING INTENT (NEW INTENT)
============================================================ */

async function submitPlantingIntent() {
    const form = document.getElementById("submitPlantIntentForm");
    if (!form) {
        alert("Planting Intent form not found.");
        return;
    }

    const farmerNameSelect = document.getElementById("piFarmerName");
    const farmerName = farmerNameSelect ? farmerNameSelect.options[farmerNameSelect.selectedIndex]?.text || "" : "";
    const farmerId = document.getElementById("piFarmerId")?.value || "";
    const plantingDate = document.getElementById("piPlantDate")?.value || "";
    const harvestDate = document.getElementById("piHarvestDate")?.value || "";
    const commodity = document.getElementById("piCommodity")?.value?.trim() || "";
    const volume = document.getElementById("piVolume")?.value || "";
    const remarks = document.getElementById("piRemarks")?.value || "";

    if (!farmerName || farmerName === "Select Farmer") {
        alert("Please select a Farmer.");
        return;
    }
    if (!farmerId) {
        alert("Farmer ID is required.");
        return;
    }
    if (!plantingDate) {
        alert("Please select Planting Date.");
        return;
    }
    if (!harvestDate) {
        alert("Please select Harvest Date.");
        return;
    }
    if (!commodity) {
        alert("Please enter Commodity.");
        return;
    }
    if (!volume) {
        alert("Please enter Volume.");
        return;
    }

    const parsedFarmerId = Number(farmerId);
    if (!Number.isInteger(parsedFarmerId)) {
        alert("Farmer ID must be a valid number.");
        return;
    }

    const parsedVolume = Number(volume);
    if (isNaN(parsedVolume) || parsedVolume <= 0) {
        alert("Volume must be a valid positive number.");
        return;
    }

    const plantingIntentData = {
        farmer_id: parsedFarmerId,
        commodity: commodity,
        volume: parsedVolume,
        planting_date: plantingDate,
        harvest_date: harvestDate,
        remarks: remarks || undefined
    };

    console.log("Submitting planting intent:", plantingIntentData);

    try {
        const createdIntent = await apiRequest(PLANTING_INTENTS_ENDPOINT, {
            method: "POST",
            body: JSON.stringify(plantingIntentData)
        });

        console.log("Planting intent created:", createdIntent);

        await fetchPlantingIntents();

        const modal = document.getElementById("plantIntentSubmittedModal");
        if (modal) modal.classList.add("show");

    } catch (error) {
        console.error("Create planting intent error:", error);
        handleAuthError(error);
        alert("Failed to submit planting intent.\n\n" + (error.message || "Please check the FastAPI server."));
    }
}

/* ============================================================
   PLANTING INTENT PAGINATION
============================================================ */

function updatePlantingIntentPagination(totalCount) {
    const paginationContainer = document.querySelector("#plantingIntentListSubview .pagination-container");
    if (!paginationContainer) {
        createPlantingIntentPagination();
        const newContainer = document.querySelector("#plantingIntentListSubview .pagination-container");
        if (!newContainer) return;
        updatePaginationUI(newContainer, totalCount);
        return;
    }
    updatePaginationUI(paginationContainer, totalCount);
}

function createPlantingIntentPagination() {
    const listSubview = document.getElementById("plantingIntentListSubview");
    const card = listSubview?.querySelector(".card");

    if (!card || card.querySelector(".pagination-container")) return;

    const paginationDiv = document.createElement("div");
    paginationDiv.className = "pagination-container";
    paginationDiv.innerHTML = `
        <span class="pagination-info" id="plantingIntentPaginationInfo">
            Showing 0 of 0
        </span>
        <div class="pagination-controls">
            <button class="btn-page" id="prevPlantingIntentPageBtn" type="button" disabled>
                &laquo; Prev
            </button>
            <div id="plantingIntentPageNumberBtns" class="page-numbers-wrap"></div>
            <button class="btn-page" id="nextPlantingIntentPageBtn" type="button" disabled>
                Next &raquo;
            </button>
        </div>
    `;

    card.appendChild(paginationDiv);

    document.getElementById("prevPlantingIntentPageBtn")
        ?.addEventListener("click", function () {
            if (currentPlantingIntentsPage > 1) {
                currentPlantingIntentsPage--;
                renderPlantingIntentsTable();
            }
        });

    document.getElementById("nextPlantingIntentPageBtn")
        ?.addEventListener("click", function () {
            const searchInput = document.getElementById(
                "searchPlantingIntentsInput"
            );

            const dataSource = searchInput?.value.trim()
                ? filteredPlantingIntents
                : PLANTING_INTENTS_DATA;

            const totalPages = Math.max(
                1,
                Math.ceil(dataSource.length / plantingIntentsPerPage)
            );

            if (currentPlantingIntentsPage < totalPages) {
                currentPlantingIntentsPage++;
                renderPlantingIntentsTable();
            }
        });
}

function updatePaginationUI(container, totalCount) {
    const totalPages = Math.max(1, Math.ceil(totalCount / plantingIntentsPerPage));
    if (currentPlantingIntentsPage > totalPages) currentPlantingIntentsPage = totalPages;

    const start = totalCount === 0 ? 0 : ((currentPlantingIntentsPage - 1) * plantingIntentsPerPage) + 1;
    const end = Math.min(currentPlantingIntentsPage * plantingIntentsPerPage, totalCount);

    const info = container.querySelector(".pagination-info");
    if (info) info.textContent = "Showing " + start + "-" + end + " of " + totalCount + " planting intents";

    const prevBtn = container.querySelector("#prevPlantingIntentPageBtn");
    if (prevBtn) prevBtn.disabled = currentPlantingIntentsPage <= 1;

    const nextBtn = container.querySelector("#nextPlantingIntentPageBtn");
    if (nextBtn) nextBtn.disabled = currentPlantingIntentsPage >= totalPages;

    const pageBtns = container.querySelector("#plantingIntentPageNumberBtns");
    if (pageBtns) {
        pageBtns.innerHTML = "";
        const totalPagesToShow = Math.min(totalPages, 5);

        for (let i = 1; i <= totalPagesToShow; i++) {
            const pageBtn = document.createElement("button");
            pageBtn.className = "btn-page" + (i === currentPlantingIntentsPage ? " active" : "");
            pageBtn.textContent = i;
            pageBtn.type = "button";
            pageBtn.addEventListener("click", function() {
                currentPlantingIntentsPage = i;
                renderPlantingIntentsTable();
            });
            pageBtns.appendChild(pageBtn);
        }

        if (totalPages > 5) {
            const ellipsis = document.createElement("span");
            ellipsis.textContent = "...";
            ellipsis.style.padding = "0 8px";
            ellipsis.style.color = "#777";
            pageBtns.appendChild(ellipsis);

            const lastBtn = document.createElement("button");
            lastBtn.className = "btn-page" + (totalPages === currentPlantingIntentsPage ? " active" : "");
            lastBtn.textContent = totalPages;
            lastBtn.type = "button";
            lastBtn.addEventListener("click", function() {
                currentPlantingIntentsPage = totalPages;
                renderPlantingIntentsTable();
            });
            pageBtns.appendChild(lastBtn);
        }
    }
}

/* ============================================================
   FORMAT HELPERS
============================================================ */

function formatPlantingDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

function formatPlantingVolume(volume) {
    if (volume === null || volume === undefined || volume === "") return "-";
    if (typeof volume === "string" && volume.toLowerCase().includes("kg")) return volume;
    const numericVolume = Number(String(volume).replace(/,/g, ""));
    if (!isNaN(numericVolume)) return numericVolume.toLocaleString() + "kg";
    return String(volume);
}

/* ============================================================
   LOAD ALL REPORTS
============================================================ */

async function loadAllReports() {
    try {
        const endpoint = API_BASE_URL + "/api/report-submissions/all-reports";
        console.log("Fetching all submitted reports:", endpoint);
        const reports = await apiRequest(endpoint);
        console.log("All Reports API response:", reports);
        renderAllReports(reports);
    } catch (error) {
        console.error("Failed to load all submitted reports:", error);
    }
}

function renderAllReports(reports) {
    const container = document.getElementById("allReportsContainer");
    if (!container) {
        console.error("allReportsContainer not found.");
        return;
    }

    container.innerHTML = "";

    if (!reports || reports.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding: 40px; text-align: center; color: #777; font-size: 15px;">No submitted reports found.</div>`;
        return;
    }

    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "separate";
    table.style.borderSpacing = "0";
    table.style.marginTop = "8px";

    const thead = document.createElement("thead");
    thead.innerHTML = `
        <tr style="background: #DEDDDC;">
            <th style="text-align: center; font-size: 13px; font-weight: 700; color: #222; padding: 14px 10px;">#</th>
            <th style="text-align: center; font-size: 13px; font-weight: 700; color: #222; padding: 14px 10px;">Title</th>
            <th style="text-align: center; font-size: 13px; font-weight: 700; color: #222; padding: 14px 10px;">Planting Date</th>
            <th style="text-align: center; font-size: 13px; font-weight: 700; color: #222; padding: 14px 10px;">Estimated Yield</th>
            <th style="text-align: center; font-size: 13px; font-weight: 700; color: #222; padding: 14px 10px;">Status</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    reports.forEach(function(report, index) {
        const title = report.title || (report.commodity || "Crop") + " Harvest Report";
        const plantingDate = report.planting_date ? new Date(report.planting_date).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) : "N/A";
        const estimatedYield = report.estimated_yield ?? "N/A";
        const status = report.status || "UNKNOWN";

        let statusColor = "#8a8a8a";
        let statusBg = "#f0f0f0";
        if (status === "FINAL_APPROVED") {
            statusColor = "#118308";
            statusBg = "#e8f5e9";
        } else if (status === "FOR_MUNICIPAL_VALIDATION") {
            statusColor = "#E5A510";
            statusBg = "#fff8e1";
        } else if (status === "REJECTED") {
            statusColor = "#C0392B";
            statusBg = "#fde8e5";
        }

        const tr = document.createElement("tr");
        tr.style.cursor = "default";
        tr.addEventListener("mouseenter", function() { tr.style.backgroundColor = "#F6F3EB"; });
        tr.addEventListener("mouseleave", function() { tr.style.backgroundColor = "transparent"; });

        tr.innerHTML = `
            <td style="padding: 14px 8px; font-size: 13.5px; text-align: center; vertical-align: middle;">${index + 1}</td>
            <td style="padding: 14px 8px; font-size: 13.5px; text-align: center; vertical-align: middle; font-weight: 500;">${escapeHtml(title)}</td>
            <td style="padding: 14px 8px; font-size: 13.5px; text-align: center; vertical-align: middle;">${plantingDate}</td>
            <td style="padding: 14px 8px; font-size: 13.5px; text-align: center; vertical-align: middle;">${estimatedYield} kg</td>
            <td style="padding: 14px 8px; text-align: center; vertical-align: middle;">
                <span style="display: inline-block; padding: 6px 20px; border-radius: 999px; font-size: 12.5px; font-weight: 700; color: ${statusColor}; background: ${statusBg}; border: 1px solid ${statusColor}33;">${status}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    const summary = document.createElement("div");
    summary.style.cssText = "margin-top: 16px; padding-top: 14px; border-top: 1px solid #E5E5E5; font-size: 13px; color: #666; text-align: right;";
    summary.textContent = "Total: " + reports.length + " report(s) found.";
    container.appendChild(summary);
}

/* ============================================================
   OFFTAKE REQUESTS
============================================================ */

function initOfftakeRequest() {
    const list = document.getElementById("offtakeListSubview");
    const submitSub = document.getElementById("submitOfftakeSubview");
    const confirmSub = document.getElementById("confirmOfftakeSubview");
    const submittedModal = document.getElementById("offtakeSubmittedModal");

    fetchOfftakeRequests();

    document.getElementById("createOfftakeBtn")?.addEventListener("click", function() {
        currentOfftakeRequest = null;
        if (list) list.classList.add("hidden-element");
        if (submitSub) submitSub.classList.remove("hidden-element");
        if (confirmSub) confirmSub.classList.add("hidden-element");
    });

    document.getElementById("returnFromSubmitOfftakeBtn")?.addEventListener("click", function() {
        if (submitSub) submitSub.classList.add("hidden-element");
        if (confirmSub) confirmSub.classList.add("hidden-element");
        if (list) list.classList.remove("hidden-element");
    });

    document.getElementById("proceedOfftakeBtn")?.addEventListener("click", function() {
        const farmerSelect = document.getElementById("offtakeFarmerSelect");
        const farmerId = document.getElementById("offtakeFarmerId");

        if (!farmerSelect || !farmerSelect.value) {
            alert("Please select a farmer.");
            return;
        }
        if (farmerId) farmerId.value = farmerSelect.value;

        const data = collectOfftakeFormData();
        data.farmer_id = Number(farmerSelect.value);
        data.farmer_name = farmerSelect.options[farmerSelect.selectedIndex].text;

        if (!validateOfftakeForm(data)) return;

        currentOfftakeRequest = data;
        populateOfftakeReview(data);

        if (submitSub) submitSub.classList.add("hidden-element");
        if (confirmSub) confirmSub.classList.remove("hidden-element");
    });

    document.getElementById("backToSubmitOfftakeBtn")?.addEventListener("click", function() {
        if (currentOfftakeRequest) populateOfftakeForm(currentOfftakeRequest);
        if (confirmSub) confirmSub.classList.add("hidden-element");
        if (submitSub) submitSub.classList.remove("hidden-element");
    });

    document.getElementById("sendOfftakeBtn")?.addEventListener("click", async function() {
        if (!currentOfftakeRequest) {
            const data = collectOfftakeFormData();
            if (!validateOfftakeForm(data)) return;
            currentOfftakeRequest = data;
        }
        await submitOfftakeRequest();
    });

    document.getElementById("closeOfftakeSubmittedBtn")?.addEventListener("click", function() {
        const modal = document.getElementById("offtakeSubmittedModal")
        if (modal) modal.classList.remove("show");
        if (submittedModal) submittedModal.classList.remove("show");
        if (confirmSub) confirmSub.classList.add("hidden-element");
        if (submitSub) submitSub.classList.add("hidden-element");
        if (list) list.classList.remove("hidden-element");
        currentOfftakeRequest = null;
        resetOfftakeForm();
    });
}

async function fetchOfftakeRequests() {
    const tbody = document.getElementById("offtakeTableBody");
    if (!tbody) {
        console.error("offtakeTableBody not found.");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="6" style="padding:30px; text-align:center;">Loading offtake requests...</td></tr>`;

    try {
        const requests = await apiRequest(OFFTAKE_REQUESTS_ENDPOINT, { method: "GET" });
        console.log("Offtake Requests API response:", requests);

        if (!Array.isArray(allFarmers) || allFarmers.length === 0) {
            await fetchFarmers();
        }

        tbody.innerHTML = "";

        if (!requests || requests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:30px; text-align:center; color:#777;">No offtake requests found.</td></tr>`;
            return;
        }

        requests.forEach(function(request) {
            let farmer = null;
            const requestFarmerId = request.farmer_id;
            if (requestFarmerId) {
                farmer = allFarmers.find(function(f) { return f.farmer_id == requestFarmerId; });
            }

            let farmerName = "Unknown Farmer";
            let farmerLocation = "—";
            if (farmer) {
                farmerName = [farmer.first_name, farmer.middle_name, farmer.last_name, farmer.suffix].filter(Boolean).join(" ");
                farmerLocation = farmer.address || [farmer.barangay, farmer.municipality].filter(Boolean).join(", ") || "—";
            }

            const row = document.createElement("tr");
            row.className = "clickable-row";
            row.innerHTML = `
                <td><span class="pill">${escapeHtml(farmerName)}</span></td>
                <td><span class="pill">${escapeHtml(request.commodity || "—")}</span></td>
                <td><span class="pill">${escapeHtml(request.quantity || "—")} kg</span></td>
                <td><span class="pill">${escapeHtml(farmerLocation)}</span></td>
                <td><span class="pill">${escapeHtml(request.harvest_date || "—")}</span></td>
                <td><span class="status-pill submitted">Submitted</span></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Unable to load offtake requests:", error);
        tbody.innerHTML = `<tr><td colspan="6" style="padding:30px; text-align:center; color:#C0392B;">Failed to load offtake requests.<br><small>${escapeHtml(error.message || "Please check the FastAPI server.")}</small></td></tr>`;
    }
}

function collectOfftakeFormData() {
    return {
        farmer_name: getOfftakeValue(["offtakeFarmerName", "farmerName", "offtakeFarmer"]),
        farmer_id: getOfftakeValue(["offtakeFarmerId", "farmerId", "offtakeFarmerID"]),
        commodity: getOfftakeValue(["offtakeCommodity", "commodity"]),
        quantity: getOfftakeValue(["offtakeQty", "offtakeQuantity", "quantity"]),
        selling_price: getOfftakeValue(["offtakePrice", "offtakeSellingPrice", "sellingPrice"]),
        harvest_date: getOfftakeValue(["offtakeHarvestDate", "harvestDate"]),
        commodity_photo: getOfftakeValue(["offtakeCommodityPhoto", "commodityPhoto"]),
        buyer: getOfftakeValue(["offtakeBuyer", "buyer"]),
        delivery_location: getOfftakeValue(["offtakeLocation", "offtakeDeliveryLocation", "deliveryLocation"])
    };
}

function getOfftakeValue(ids) {
    for (var i = 0; i < ids.length; i++) {
        var element = document.getElementById(ids[i]);
        if (element) {
            return (element.value || "").toString().trim();
        }
    }
    return "";
}

function validateOfftakeForm(data) {
    if (!data.farmer_name) { alert("Please enter Farmer Name."); return false; }
    if (!data.farmer_id) { alert("Please enter Farmer ID."); return false; }
    if (!/^\d+$/.test(data.farmer_id)) { alert("Farmer ID must be a valid whole number."); return false; }
    if (!data.commodity) { alert("Please enter Commodity."); return false; }
    if (!data.quantity) { alert("Please enter Quantity."); return false; }
    var quantityValue = data.quantity.replace(/,/g, "").trim();
    if (!/^\d+(\.\d+)?$/.test(quantityValue)) { alert("Quantity must be a valid number."); return false; }
    if (!data.selling_price) { alert("Please enter Selling Price."); return false; }
    var sellingPriceValue = data.selling_price.replace(/,/g, "").replace(/₱/g, "").trim();
    if (!/^\d+(\.\d+)?$/.test(sellingPriceValue)) { alert("Selling Price must be a valid number."); return false; }
    if (!data.harvest_date) { alert("Please select Harvest Date."); return false; }
    return true;
}

function populateOfftakeReview(data) {
    var values = {
        farmer_name: data.farmer_name,
        farmer_id: data.farmer_id,
        commodity: data.commodity,
        quantity: data.quantity,
        selling_price: data.selling_price,
        harvest_date: formatPlantingDate(data.harvest_date),
        commodity_photo: data.commodity_photo || "",
        buyer: data.buyer || "",
        delivery_location: data.delivery_location || ""
    };

    setReviewValue(["reviewFarmerName", "confirmFarmerName", "reviewOfftakeFarmerName"], values.farmer_name);
    setReviewValue(["reviewFarmerId", "confirmFarmerId", "reviewOfftakeFarmerId"], values.farmer_id);
    setReviewValue(["reviewCommodity", "confirmCommodity", "reviewOfftakeCommodity"], values.commodity);
    setReviewValue(["reviewQuantity", "confirmQuantity", "reviewOfftakeQuantity"], values.quantity);
    setReviewValue(["reviewSellingPrice", "confirmSellingPrice", "reviewOfftakeSellingPrice"], values.selling_price);
    setReviewValue(["reviewHarvestDate", "confirmHarvestDate", "reviewOfftakeHarvestDate"], values.harvest_date);
    setReviewValue(["reviewCommodityPhoto", "confirmCommodityPhoto", "reviewOfftakeCommodityPhoto"], values.commodity_photo);
    setReviewValue(["reviewBuyer", "confirmBuyer", "reviewOfftakeBuyer"], values.buyer);
    setReviewValue(["reviewDeliveryLocation", "confirmLocation", "confirmDeliveryLocation", "reviewOfftakeDeliveryLocation"], values.delivery_location);
}

function setReviewValue(ids, value) {
    for (var i = 0; i < ids.length; i++) {
        var element = document.getElementById(ids[i]);
        if (element) {
            var safeValue = value || "-";
            element.textContent = safeValue;
            if ("value" in element) {
                element.value = value || "";
            }
            return;
        }
    }
}

function populateOfftakeForm(data) {
    setOfftakeValue(["offtakeFarmerName", "farmerName", "offtakeFarmer"], data.farmer_name);
    setOfftakeValue(["offtakeFarmerId", "farmerId", "offtakeFarmerID"], data.farmer_id);
    setOfftakeValue(["offtakeCommodity", "commodity"], data.commodity);
    setOfftakeValue(["offtakeQuantity", "quantity"], data.quantity);
    setOfftakeValue(["offtakeSellingPrice", "sellingPrice"], data.selling_price);
    setOfftakeValue(["offtakeHarvestDate", "harvestDate"], data.harvest_date);
    setOfftakeValue(["offtakeCommodityPhoto", "commodityPhoto"], data.commodity_photo);
    setOfftakeValue(["offtakeBuyer", "buyer"], data.buyer);
    setOfftakeValue(["offtakeDeliveryLocation", "deliveryLocation"], data.delivery_location);
}

function setOfftakeValue(ids, value) {
    for (var i = 0; i < ids.length; i++) {
        var element = document.getElementById(ids[i]);
        if (element) {
            element.value = value || "";
            return;
        }
    }
}

async function submitOfftakeRequest() {
    if (!currentOfftakeRequest) {
        alert("No Offtake Request data found.");
        return;
    }

    var sendOfftakeBtn = document.getElementById("sendOfftakeBtn");
    if (sendOfftakeBtn) {
        sendOfftakeBtn.disabled = true;
        sendOfftakeBtn.textContent = "Submitting...";
    }

    try {
        var data = currentOfftakeRequest;
        var farmerId = parseInt(data.farmer_id, 10);
        if (!Number.isInteger(farmerId)) {
            throw new Error("Farmer ID must be a valid whole number.");
        }

        var quantity = String(data.quantity).replace(/,/g, "").trim();
        var sellingPrice = String(data.selling_price).replace(/,/g, "").replace(/₱/g, "").trim();

        if (!/^\d+(\.\d+)?$/.test(quantity)) {
            throw new Error("Quantity must be a valid decimal number.");
        }
        if (!/^\d+(\.\d+)?$/.test(sellingPrice)) {
            throw new Error("Selling Price must be a valid decimal number.");
        }

        var payload = {
            farmer_id: farmerId,
            commodity: data.commodity,
            quantity: quantity,
            selling_price: sellingPrice,
            harvest_date: data.harvest_date,
            commodity_photo: data.commodity_photo || null
        };

        console.log("Submitting Offtake Request:", payload);

        var response = await apiRequest(OFFTAKE_REQUESTS_ENDPOINT, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        console.log("Offtake Request API response:", response);

        await fetchOfftakeRequests();

        var successModal = document.getElementById("offtakeSubmittedModal");
        if (successModal) successModal.classList.add("show");

    } catch (error) {
        console.error("Create Offtake Request error:", error);
        handleAuthError(error);
        alert("Failed to submit Offtake Request.\n\n" + (error.message || "Please check the FastAPI server."));
    } finally {
        if (sendOfftakeBtn) {
            sendOfftakeBtn.disabled = false;
            sendOfftakeBtn.textContent = "Submit Request";
        }
    }
}

function resetOfftakeForm() {
    var possibleFormIds = ["offtakeRequestForm", "submitOfftakeForm", "createOfftakeForm"];
    for (var i = 0; i < possibleFormIds.length; i++) {
        var form = document.getElementById(possibleFormIds[i]);
        if (form) {
            form.reset();
            break;
        }
    }
    currentOfftakeRequest = null;
}

/* ============================================================
   FAIR PRICE
============================================================ */

function initFairPrice() {
    var select = document.getElementById("fairPriceCropSelect");
    var img = document.getElementById("cropImageDisplay");

    if (!select || !img) return;

    select.addEventListener("change", function(event) {
        var crop = event.target.value;
        if (crop === "tomato") {
            img.src = "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80";
        } else {
            img.src = "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80";
        }
    });
}

/* ============================================================
   HELPER FUNCTIONS
============================================================ */

function getValue(id) {
    var element = document.getElementById(id);
    if (!element) return "";
    return (element.value || "").trim();
}

function setValue(id, value) {
    var element = document.getElementById(id);
    if (!element) {
        console.warn("Element with id \"" + id + "\" not found.");
        return;
    }
    var safeValue = value || "";
    if ("value" in element) {
        element.value = safeValue;
        return;
    }
    element.textContent = safeValue;
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* ============================================================
   FARMER DROPDOWN POPULATION
============================================================ */

function populateFarmerDropdowns() {
    var farmers = allFarmers || [];
    var dropdowns = ['piFarmerName', 'offtakeFarmerSelect'];

    dropdowns.forEach(function(dropdownId) {
        var dropdown = document.getElementById(dropdownId);
        if (dropdown) {
            dropdown.innerHTML = '';
            var defaultOpt = document.createElement('option');
            defaultOpt.value = '';
            defaultOpt.textContent = 'Select Farmer';
            dropdown.appendChild(defaultOpt);

            if (Array.isArray(farmers) && farmers.length > 0) {
                farmers.forEach(function(farmer) {
                    var option = document.createElement('option');
                    option.value = farmer.farmer_id;
                    var fullName = [farmer.first_name, farmer.middle_name, farmer.last_name, farmer.suffix].filter(Boolean).join(" ");
                    option.textContent = fullName || farmer.rsbsa_id || "Farmer " + farmer.farmer_id;
                    option.dataset.farmerId = farmer.farmer_id;
                    dropdown.appendChild(option);
                });
            }
        }
    });
}

function setupFarmerDropdownAutoFill() {
    var piFarmerName = document.getElementById('piFarmerName');
    var piFarmerId = document.getElementById('piFarmerId');
    if (piFarmerName && piFarmerId) {
        piFarmerName.addEventListener('change', function() {
            var selectedOption = this.options[this.selectedIndex];
            if (selectedOption && selectedOption.value) {
                piFarmerId.value = selectedOption.value;
            } else {
                piFarmerId.value = '';
            }
        });
    }

    var offtakeFarmerSelect = document.getElementById('offtakeFarmerSelect');
    var offtakeFarmerId = document.getElementById('offtakeFarmerId');
    if (offtakeFarmerSelect && offtakeFarmerId) {
        offtakeFarmerSelect.addEventListener('change', function() {
            var selectedOption = this.options[this.selectedIndex];
            if (selectedOption && selectedOption.value) {
                offtakeFarmerId.value = selectedOption.value;
            } else {
                offtakeFarmerId.value = '';
            }
        });
    }
}

function refreshFarmerDropdowns() {
    populateFarmerDropdowns();
    setupFarmerDropdownAutoFill();
}

// Override fetchFarmers to include dropdown refresh
var originalFetchFarmers = fetchFarmers;
fetchFarmers = async function() {
    var result = await originalFetchFarmers.call(this);
    if (allFarmers && allFarmers.length > 0) {
        refreshFarmerDropdowns();
    }
    return result;
};

// Initialize dropdowns on DOM load
document.addEventListener("DOMContentLoaded", function() {
    setTimeout(function() {
        if (allFarmers && allFarmers.length > 0) {
            refreshFarmerDropdowns();
        }
    }, 1000);
});


/* ============================================================
   FAIR PRICE MONTH DROPDOWN
============================================================ */

function initFairPriceMonthDropdown() {
    const monthButton = document.getElementById('fairPriceMonthButton');
    const monthDropdown = document.getElementById('customMonthDropdown');
    const monthMenu = document.getElementById('fairPriceMonthMenu');
    const monthText = document.getElementById('fairPriceMonthText');
    const monthSelect = document.getElementById('fairPriceMonthSelect');
    const monthOptions = document.querySelectorAll('.month-option');

    if (!monthButton || !monthDropdown || !monthMenu) {
        console.warn('Month dropdown elements not found.');
        return;
    }

    // Toggle dropdown on button click
    monthButton.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = monthDropdown.classList.contains('open');
        monthDropdown.classList.toggle('open');
        this.setAttribute('aria-expanded', !isOpen);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!monthDropdown.contains(e.target)) {
            monthDropdown.classList.remove('open');
            monthButton.setAttribute('aria-expanded', 'false');
        }
    });

    // Handle month option selection
    monthOptions.forEach(function(option) {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Update active state
            monthOptions.forEach(function(opt) {
                opt.classList.remove('active');
            });
            this.classList.add('active');
            
            // Update button text
            const value = this.getAttribute('data-value');
            const text = this.textContent.trim();
            monthText.textContent = text;
            
            // Update hidden select
            monthSelect.value = value;
            
            // Trigger change event on hidden select for any listeners
            const changeEvent = new Event('change', { bubbles: true });
            monthSelect.dispatchEvent(changeEvent);
            
            // Close dropdown
            monthDropdown.classList.remove('open');
            monthButton.setAttribute('aria-expanded', 'false');
            
            // Optional: Call a function to update the price display based on month
            if (typeof updateFairPriceDisplay === 'function') {
                updateFairPriceDisplay(value);
            }
        });
    });

    // Sync hidden select with button text when changed elsewhere
    monthSelect.addEventListener('change', function() {
        const selectedOption = document.querySelector('.month-option[data-value="' + this.value + '"]');
        if (selectedOption) {
            monthOptions.forEach(function(opt) {
                opt.classList.remove('active');
            });
            selectedOption.classList.add('active');
            monthText.textContent = selectedOption.textContent.trim();
        }
    });
}

// Optional: Update price display based on selected month
function updateFairPriceDisplay(month) {
    console.log('Month selected:', month);
    // You can add logic here to update the price metrics
    // based on the selected month (e.g., fetch price data for that month)
    // For example:
    // const crop = document.getElementById('fairPriceCropSelect').value;
    // updatePriceMetrics(crop, month);
}

/* ============================================================
   FORECAST RESULTS
============================================================ */

/* ============================================================
   FORECAST RESULTS - UPDATED
============================================================ */

/* ============================================================
   FORECAST RESULTS - INIT
============================================================ */

/* ============================================================
   FORECAST RESULTS - COMPLETE FIXED
============================================================ */

function initForecastResults() {
    console.log("Initializing Forecast Results...");
    
    const forecastView = document.getElementById("view-fair-prices");
    if (!forecastView) {
        console.warn("view-fair-prices not found in DOM");
        return;
    }
    
    console.log("Forecast view found:", forecastView);
    
    // Check if already visible
    if (forecastView.classList.contains("active-view")) {
        console.log("Fair Prices view is currently active, loading forecasts...");
        setTimeout(function() {
            loadForecastResults();
            setTimeout(initPriceChart, 500);
        }, 300);
    }
    
    // Listen for when the view becomes active
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (forecastView.classList.contains('active-view')) {
                    console.log("Fair Prices view became active, loading forecasts...");
                    loadForecastResults();
                    setTimeout(initPriceChart, 500);
                }
            }
        });
    });
    observer.observe(forecastView, { attributes: true });
    
    // Also listen for nav clicks
    const forecastNav = document.querySelector('.nav-item[data-view="fair-prices"]');
    if (forecastNav) {
        forecastNav.addEventListener('click', function() {
            console.log("Fair Prices nav clicked, loading forecasts...");
            setTimeout(function() {
                loadForecastResults();
                setTimeout(initPriceChart, 500);
            }, 200);
        });
    } else {
        console.warn("Nav item with data-view='fair-prices' not found");
    }
    
    // Safety check
    setTimeout(function() {
        if (forecastView.classList.contains('active-view')) {
            console.log("Safety check: loading forecasts...");
            loadForecastResults();
            setTimeout(initPriceChart, 500);
        }
    }, 1000);
}


async function loadForecastResults() {
    console.log("loadForecastResults() called...");
    
    const container = document.getElementById("forecastResultsContainer");
    if (!container) {
        console.warn("forecastResultsContainer not found.");
        return;
    }

    console.log("Container found, loading forecasts...");

    // Show loading state
    container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #777; font-size: 15px;">
            <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid #E5E5E5; border-top-color: #2E7D32; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 10px;"></div>
            <br>Loading forecast results...
        </div>
    `;

    try {
        console.log("Fetching from:", FORECASTS_ENDPOINT);
        const forecasts = await apiRequest(FORECASTS_ENDPOINT, { method: "GET" });
        console.log("Forecast Results API response:", forecasts);

        if (!Array.isArray(forecasts)) {
            throw new Error("Invalid forecast response.");
        }

        FORECASTS_DATA = forecasts;
        renderForecastResults(forecasts);
        
        // ✅ Initialize chart after rendering
        setTimeout(function() {
            initPriceChart();
        }, 300);

    } catch (error) {
        console.error("Failed to load forecast results:", error);
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #C0392B; font-size: 15px;">
                <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
                <strong>Failed to load forecast results.</strong>
                <br><small style="color: #999;">${escapeHtml(error.message || "Please check the FastAPI server.")}</small>
                <br><br>
                <button onclick="loadForecastResults()" style="padding: 8px 20px; background: #2E7D32; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    🔄 Retry
                </button>
            </div>
        `;
    }
}

// Update price metrics
function updatePriceMetrics(forecasts) {
    const lowestPriceEl = document.getElementById("lowestPriceDisplay");
    const highestPriceEl = document.getElementById("highestPriceDisplay");

    if (!lowestPriceEl || !highestPriceEl) return;

    const prices = (Array.isArray(forecasts) ? forecasts : [])
        .flatMap(function (forecast) {
            return [
                Number(forecast.forecast_price_low),
                Number(forecast.forecast_price_high)
            ];
        })
        .filter(Number.isFinite);

    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    lowestPriceEl.innerHTML =
        `₱${minPrice.toFixed(2)} <span>/kg</span>`;

    highestPriceEl.innerHTML =
        `₱${maxPrice.toFixed(2)} <span>/kg</span>`;
}

function getForecastDate(forecast) {
    return forecast?.forecast_date ||
        forecast?.date ||
        forecast?.created_at ||
        null;
}

function groupForecastsByYear(forecasts) {
    const grouped = {};

    if (!Array.isArray(forecasts)) return grouped;

    forecasts.forEach(function(forecast) {
        const date = new Date(getForecastDate(forecast));
        if (Number.isNaN(date.getTime())) return;

        const year = String(date.getFullYear());
        if (!grouped[year]) grouped[year] = [];
        grouped[year].push(forecast);
    });

    return grouped;
}

function groupForecastsByMonth(forecasts) {
    const grouped = {};

    if (!Array.isArray(forecasts)) return grouped;

    forecasts.forEach(function(forecast) {
        const date = new Date(getForecastDate(forecast));
        if (Number.isNaN(date.getTime())) return;

        const month = date.toLocaleString("en-US", { month: "long" });
        if (!grouped[month]) grouped[month] = [];
        grouped[month].push(forecast);
    });

    return grouped;
}


/* ============================================================
   FORECAST TOGGLE FUNCTIONS
============================================================ */

function toggleForecastYear(headerElement) {
    const content = headerElement.nextElementSibling;
    const arrow = headerElement.querySelector('span:last-child');

    if (!content) return;

    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    }
}

function toggleForecastMonth(headerElement) {
    const content = headerElement.nextElementSibling;
    const arrow = headerElement.querySelector('span:last-child');

    if (!content) return;

    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        if (arrow) arrow.style.transform = 'rotate(90deg)';
    } else {
        content.style.display = 'none';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    }
}

// Add CSS animation for loading spinner
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

/* ============================================================
   RENDER FORECAST RESULTS - COMPLETE
============================================================ */
function renderForecastResults(forecasts) {
    const container = document.getElementById("forecastResultsContainer");

    if (!container) {
        console.warn("forecastResultsContainer not found.");
        return;
    }

    if (!Array.isArray(forecasts) || forecasts.length === 0) {
        container.innerHTML = `
            <div style="padding:40px;text-align:center;color:#777;">
                📊 No forecast results available.
            </div>
        `;
        updatePriceMetrics([]);
        return;
    }

    console.log(
        "renderForecastResults called with",
        forecasts.length,
        "forecasts"
    );

    // Group forecasts by year
    const groupedByYear = groupForecastsByYear(forecasts);

    let html = '';

    // Sort years descending (newest first)
    const sortedYears = Object.keys(groupedByYear).sort().reverse();

    sortedYears.forEach(function(year) {
        const yearData = groupedByYear[year];
        
        // Group by month within the year
        const groupedByMonth = groupForecastsByMonth(yearData);

        html += `
            <div class="forecast-year-group" style="margin-bottom: 16px;">
                <div class="forecast-year-header" style="
                    background: #2E7D32;
                    color: #fff;
                    padding: 12px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-weight: 600;
                    font-size: 16px;
                    transition: background 0.2s;
                " onclick="toggleForecastYear(this)">
                    <span>📅 ${year} Projections</span>
                    <span style="font-size: 20px; transition: transform 0.3s; transform: ▶</span>
                </div>
                <div class="forecast-year-content" style="
                    background: #fff;
                    border: 1px solid #E5E5E5;
                    border-top: none;
                    border-radius: 0 0 8px 8px;
                    padding: 8px 12px;
                    margin-top: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease;
                ">
        `;

        // Sort months chronologically (January to December)
        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const sortedMonths = Object.keys(groupedByMonth).sort(function(a, b) {
            return monthOrder.indexOf(a) - monthOrder.indexOf(b);
        });

        sortedMonths.forEach(function(month, monthIndex) {
            const monthData = groupedByMonth[month];
            
            // Sort commodities alphabetically
            const sortedCommodities = monthData.sort(function(a, b) {
                const commodityA = a.commodity || '';
                const commodityB = b.commodity || '';
                return commodityA.localeCompare(commodityB);
            });

            // ✅ Check if this is the first month
            const isFirstMonth = monthIndex === 0;
            const displayStyle = isFirstMonth ? 'block' : 'none';
            const arrowRotation = isFirstMonth ? 'rotate(90deg)' : 'rotate(0deg)';

            html += `
                <div class="forecast-month-group" style="margin-bottom: 4px;">
                    <div class="forecast-month-header" style="
                        padding: 10px 12px;
                        cursor: pointer;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #F6F3EB;
                        border-radius: 6px;
                        font-weight: 500;
                        font-size: 14px;
                        transition: background 0.2s;
                    " onclick="toggleForecastMonth(this)">
                        <span>📆 ${month} ${year}</span>
                        <span style="font-size: 16px; transition: transform 0.3s; transform: ${arrowRotation};">▶</span>
                    </div>
                    <div class="forecast-month-content" style="
                        padding: 8px 12px;
                        background: #FAF8F5;
                        border-radius: 0 0 6px 6px;
                        display: ${displayStyle};
                    ">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="border-bottom: 2px solid #DEDDDC;">
                                    <th style="text-align: left; padding: 8px 6px; font-weight: 600; color: #333;">Commodity</th>
                                    <th style="text-align: center; padding: 8px 6px; font-weight: 600; color: #333;">Lower Price (₱)</th>
                                    <th style="text-align: center; padding: 8px 6px; font-weight: 600; color: #333;">Upper Price (₱)</th>
                                    <th style="text-align: center; padding: 8px 6px; font-weight: 600; color: #333;">Range</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            sortedCommodities.forEach(function(forecast, index) {
                const commodity = forecast.commodity || forecast.crop || '—';
                const lowerPrice = Number(forecast.forecast_price_low || 0);
                const upperPrice = Number(forecast.forecast_price_high || 0);
                const lowerPriceStr = lowerPrice.toFixed(2);
                const upperPriceStr = upperPrice.toFixed(2);
                const bgColor = index % 2 === 0 ? 'transparent' : '#F6F3EB';
                
                html += `
                    <tr style="background: ${bgColor}; border-bottom: 1px solid #F0EDE8;">
                        <td style="padding: 8px 6px; font-weight: 500;">${escapeHtml(commodity)}</td>
                        <td style="padding: 8px 6px; text-align: center;">₱${lowerPriceStr}</td>
                        <td style="padding: 8px 6px; text-align: center;">₱${upperPriceStr}</td>
                        <td style="padding: 8px 6px; text-align: center;">
                            <span style="
                                background: #2E7D32;
                                color: #fff;
                                padding: 2px 12px;
                                border-radius: 12px;
                                font-size: 12px;
                                font-weight: 600;
                            ">₱${lowerPriceStr} – ₱${upperPriceStr}</span>
                        </td>
                    </tr>
                `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // ✅ Auto-expand the first year
    const firstYearContent = container.querySelector('.forecast-year-content');
    if (firstYearContent) {
        firstYearContent.style.maxHeight = firstYearContent.scrollHeight + 'px';
    }

    // Update price metrics
    updatePriceMetrics(forecasts);

    // Add forecast count
    const countDiv = document.createElement('div');
    countDiv.style.cssText = 'margin-top: 12px; padding: 12px 0; font-size: 13px; color: #666; text-align: right; border-top: 1px solid #E5E5E5;';
    countDiv.textContent = `Total: ${forecasts.length} forecast(s) found.`;
    container.appendChild(countDiv);
    
    console.log("Forecast rendering complete!");
}
/* ============================================================
   PRICE TREND CHART
============================================================ */


function initPriceChart() {
    console.log("🔍 initPriceChart called...");
    
    const canvas = document.getElementById('priceTrendChart');
    if (!canvas) {
        console.warn('❌ Price trend chart canvas not found');
        return;
    }
    console.log('✅ Canvas found');
    
    if (typeof Chart === 'undefined') {
        console.warn('⚠️ Chart.js not loaded yet, waiting...');
        setTimeout(initPriceChart, 500);
        return;
    }
    console.log('✅ Chart.js loaded');
    
    const forecasts = FORECASTS_DATA || [];
    console.log('📊 Forecasts data:', forecasts.length, 'records');
    
    if (forecasts.length === 0) {
        console.warn('❌ No forecast data available for chart');
        if (canvas.parentElement) {
            canvas.parentElement.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #777; font-size: 15px;">
                    <div style="font-size: 40px; margin-bottom: 10px;">📊</div>
                    No price data available for chart.
                    <br><small style="color: #999;">Please load forecast data first.</small>
                </div>
            `;
        }
        return;
    }
    
    renderChart(forecasts, 'all');
}

function renderChart(forecasts, commodityFilter) {
    console.log("🔍 renderChart called with filter:", commodityFilter);
    
    const canvas = document.getElementById('priceTrendChart');
    if (!canvas) {
        console.warn('❌ Canvas not found');
        return;
    }
    
    // Destroy existing chart
    if (priceChartInstance) {
        console.log('🔄 Destroying existing chart...');
        priceChartInstance.destroy();
        priceChartInstance = null;
    }
    
    let filteredData = forecasts;
    if (commodityFilter !== 'all') {
        filteredData = forecasts.filter(function(f) {
            return f.commodity === commodityFilter;
        });
        console.log('📊 Filtered to', filteredData.length, 'records for', commodityFilter);
    }
    
    if (filteredData.length === 0) {
        console.warn('❌ No data for filter:', commodityFilter);
        if (canvas.parentElement) {
            canvas.parentElement.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #777; font-size: 15px;">
                    <div style="font-size: 40px; margin-bottom: 10px;">📊</div>
                    No data available for ${commodityFilter}.
                </div>
            `;
        }
        return;
    }
    
    // Group by commodity
    const commodities = {};
    filteredData.forEach(function(f) {
        const commodity = f.commodity || 'Unknown';
        if (!commodities[commodity]) {
            commodities[commodity] = [];
        }
        commodities[commodity].push(f);
    });
    console.log('📦 Commodities found:', Object.keys(commodities));
    
    // Sort by date
    Object.keys(commodities).forEach(function(commodity) {
        commodities[commodity].sort(function(a, b) {
            return new Date(getForecastDate(a) || 0) - new Date(getForecastDate(b) || 0);
        });
    });
    
    // Prepare datasets with professional colors
    const datasets = [];
    const colorPalette = {
        'Tomato': {
            main: '#E74C3C',
            light: 'rgba(231, 76, 60, 0.15)',
            gradient: ['rgba(231, 76, 60, 0.3)', 'rgba(231, 76, 60, 0.05)']
        },
        'Squash fruit': {
            main: '#F39C12',
            light: 'rgba(243, 156, 18, 0.15)',
            gradient: ['rgba(243, 156, 18, 0.3)', 'rgba(243, 156, 18, 0.05)']
        },
        'Red Onion': {
            main: '#8E44AD',
            light: 'rgba(142, 68, 173, 0.15)',
            gradient: ['rgba(142, 68, 173, 0.3)', 'rgba(142, 68, 173, 0.05)']
        },
        'White Onion': {
        main: '#1ABC9C',  // Teal/Cyan color
        light: 'rgba(26, 188, 156, 0.15)',
        gradient: ['rgba(26, 188, 156, 0.3)', 'rgba(26, 188, 156, 0.05)']
    },
    };
    
    const defaultColors = ['#E74C3C', '#F39C12', '#2ECC71', '#3498DB', '#9B59B6', '#1ABC9C', '#E67E22', '#2C3E50'];
    let colorIndex = 0;
    
    // Get all unique dates
    const allDates = [];
    Object.keys(commodities).forEach(function(commodity) {
        commodities[commodity].forEach(function(f) {
            const date = new Date(getForecastDate(f) || 0);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (!allDates.includes(dateStr)) {
                allDates.push(dateStr);
            }
        });
    });
    allDates.sort(function(a, b) {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA - dateB;
    });
    console.log('📅 Dates:', allDates);
    
    Object.keys(commodities).forEach(function(commodity, idx) {
        const data = commodities[commodity];
        
        let colorObj = colorPalette[commodity];
        if (!colorObj) {
            const mainColor = defaultColors[colorIndex % defaultColors.length];
            colorObj = {
                main: mainColor,
                light: mainColor + '33',
                gradient: [mainColor + '44', mainColor + '11']
            };
            colorIndex++;
        }
        
        const lowerPrices = [];
        const upperPrices = [];
        
        allDates.forEach(function(dateStr) {
            const found = data.find(function(f) {
                const d = new Date(getForecastDate(f) || 0);
                return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) === dateStr;
            });
            
            if (found) {
                lowerPrices.push(parseFloat(found.forecast_price_low || 0));
                upperPrices.push(parseFloat(found.forecast_price_high || 0));
            } else {
                lowerPrices.push(null);
                upperPrices.push(null);
            }
        });
        
        // Lower price - solid line with fill
        datasets.push({
            label: commodity + ' (Low)',
            data: lowerPrices,
            borderColor: colorObj.main,
            backgroundColor: function(context) {
                const chart = context.chart;
                const {ctx, chartArea} = chart;
                if (!chartArea) {
                    return colorObj.light;
                }
                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                gradient.addColorStop(0, colorObj.gradient[0]);
                gradient.addColorStop(1, colorObj.gradient[1]);
                return gradient;
            },
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: colorObj.main,
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            tension: 0.4,
            fill: true,
            spanGaps: false
        });
        
        // Upper price - dashed line
        datasets.push({
            label: commodity + ' (High)',
            data: upperPrices,
            borderColor: colorObj.main,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 4,
            pointBackgroundColor: colorObj.main,
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
            tension: 0.4,
            fill: false,
            spanGaps: false
        });
    });
    
    if (datasets.length === 0) {
        console.warn('❌ No datasets created');
        if (canvas.parentElement) {
            canvas.parentElement.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #777; font-size: 15px;">
                    <div style="font-size: 40px; margin-bottom: 10px;">📊</div>
                    No price data available for chart.
                </div>
            `;
        }
        return;
    }
    
    console.log('📊 Creating chart with', datasets.length, 'datasets');
    
    try {
        const ctx = canvas.getContext('2d');
        priceChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allDates,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 12,
                                weight: '600',
                                family: 'Plus Jakarta Sans'
                            },
                            boxWidth: 20,
                            boxHeight: 12,
                            padding: 16,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            color: '#2E2A22'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(46, 42, 34, 0.92)',
                        titleFont: {
                            size: 13,
                            weight: '700',
                            family: 'Plus Jakarta Sans'
                        },
                        bodyFont: {
                            size: 12,
                            weight: '500',
                            family: 'Plus Jakarta Sans'
                        },
                        padding: 12,
                        cornerRadius: 8,
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                let value = context.raw;
                                if (value !== null && value !== undefined) {
                                    const formatted = value.toFixed(2);
                                    label += ': ₱' + formatted + '/kg';
                                } else {
                                    label += ': No data';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: true,
                            borderColor: 'rgba(0,0,0,0.08)'
                        },
                        ticks: {
                            font: {
                                size: 11,
                                weight: '600',
                                family: 'Plus Jakarta Sans'
                            },
                            color: '#625E52',
                            maxRotation: 45,
                            minRotation: 30
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.06)',
                            drawBorder: true,
                            borderColor: 'rgba(0,0,0,0.08)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '₱' + value.toFixed(0);
                            },
                            font: {
                                size: 11,
                                weight: '600',
                                family: 'Plus Jakarta Sans'
                            },
                            color: '#625E52',
                            stepSize: 10
                        },
                        title: {
                            display: true,
                            text: 'Price (₱/kg)',
                            font: {
                                size: 12,
                                weight: '700',
                                family: 'Plus Jakarta Sans'
                            },
                            color: '#625E52'
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.4
                    },
                    point: {
                        hoverRadius: 8
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 20
                    }
                }
            }
        });
        console.log('✅ Chart rendered successfully!');
    } catch (error) {
        console.error('❌ Error creating chart:', error);
        if (canvas.parentElement) {
            canvas.parentElement.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #C0392B; font-size: 15px;">
                    <div style="font-size: 40px; margin-bottom: 10px;">⚠️</div>
                    Error creating chart: ${error.message}
                </div>
            `;
        }
    }
}

function updateChart(commodity) {
    console.log("🔍 updateChart called with:", commodity);
    
    const forecasts = FORECASTS_DATA || [];
    if (forecasts.length === 0) {
        console.warn('❌ No forecast data available for chart');
        return;
    }
    
    // Update button styles
    document.querySelectorAll('.fair-price-dashboard-container .btn-outline-report').forEach(function(btn) {
        const btnText = btn.textContent.trim();
        if (btnText === commodity || (commodity === 'all' && btnText === 'All')) {
            btn.style.background = '#2E7D32';
            btn.style.color = '#fff';
            btn.style.borderColor = '#2E7D32';
        } else {
            btn.style.background = '#FFFFFF';
            btn.style.color = 'var(--ink)';
            btn.style.borderColor = 'var(--border)';
        }
    });
    
    renderChart(forecasts, commodity);
}

console.log("✅ Price Trend Chart functions loaded!");