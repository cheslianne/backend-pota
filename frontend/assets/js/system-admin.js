const API_BASE_URL = window.API_BASE_URL || "http://127.0.0.1:8000";


/* ============================================================
   AUTH
============================================================ */

function getAuthToken() {
    return localStorage.getItem("access_token");
}

function getAuthHeaders() {

    const token = getAuthToken();

    const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}


/* ============================================================
   API ERROR MESSAGE
============================================================ */

function getErrorMessage(data, fallback = "Something went wrong.") {

    if (!data) {
        return fallback;
    }

    if (Array.isArray(data.detail)) {

        return data.detail
            .map(error => {

                if (typeof error === "string") {
                    return error;
                }

                if (error?.msg) {
                    return error.msg;
                }

                return JSON.stringify(error);

            })
            .join("\n");
    }

    if (typeof data.detail === "string") {
        return data.detail;
    }

    if (
        typeof data.detail === "object" &&
        data.detail !== null
    ) {

        if (data.detail.message) {
            return data.detail.message;
        }

        if (data.detail.msg) {
            return data.detail.msg;
        }

        try {
            return JSON.stringify(data.detail);
        }
        catch {
            return fallback;
        }
    }

    if (typeof data.message === "string") {
        return data.message;
    }

    return fallback;
}


/* ============================================================
   HANDLE AUTH FAILURE
============================================================ */

function handleUnauthorized() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    window.location.href = "../index.html";
}


/* ============================================================
   INITIALIZE LOGGED IN USER
============================================================ */

function initializeLoggedInUser() {

    const token = localStorage.getItem("access_token");

    if (!token) {

        window.location.href = "../index.html";

        return false;
    }

    const username =
        localStorage.getItem("username") ||
        "Unknown User";

    const role =
        localStorage.getItem("role") ||
        "Unknown Role";

    const usernameElement =
        document.getElementById("loggedInUserName");

    const roleElement =
        document.getElementById("loggedInUserRole");

    if (usernameElement) {
        usernameElement.textContent = username;
    }

    if (roleElement) {
        roleElement.textContent = role;
    }

    return true;
}


/* ============================================================
   ADMIN ROLE
============================================================ */

function checkAdminRole() {

    const role =
        localStorage.getItem("role");

    if (role !== "System Administrator") {

        alert(
            "Access denied. System Administrator privileges required."
        );

        window.location.href = "../index.html";

        return false;
    }

    return true;
}


/* ============================================================
   HTML ESCAPE
============================================================ */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ============================================================
   ROLE STYLE
============================================================ */

function getRoleStyle(role) {

    const styles = {

        "System Administrator": {
            cls: "darkred",
            label: "System Administrator"
        },

        "DA-RFO Officer": {
            cls: "blue",
            label: "DA-RFO Officer"
        },

        "DA-RFO": {
            cls: "blue",
            label: "DA-RFO"
        },

        "Provincial Coordinator": {
            cls: "teal",
            label: "Provincial Coordinator"
        },

        "Provincial": {
            cls: "teal",
            label: "Provincial"
        },

        "Municipal Coordinator": {
            cls: "green",
            label: "Municipal Coordinator"
        },

        "Municipal": {
            cls: "green",
            label: "Municipal"
        },

        "AEW": {
            cls: "green",
            label: "AEW"
        }
    };

    return styles[role] || {
        cls: "green",
        label: role || "Unknown"
    };
}


/* ============================================================
   PAGINATION STATE
============================================================ */

let currentUserPage = 1;
const usersPerPage = 7;
let cachedUsers = [];

let currentAuditPage = 1;
const auditPerPage = 7;
let cachedAuditLogs = [];

let currentArchivedPage = 1;
const archivedPerPage = 7;
let cachedArchivedUsers = [];


function renderPagination(totalItems, itemsPerPage, currentPage, onPageChange) {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    return {
        currentPage,
        totalPages,
        paginatedSlice: (array) => {
            const start = (currentPage - 1) * itemsPerPage;
            return array.slice(start, start + itemsPerPage);
        },
        updateUI: (infoId, prevBtnId, nextBtnId, numbersId) => {
            const infoEl = document.getElementById(infoId);
            const prevBtn = document.getElementById(prevBtnId);
            const nextBtn = document.getElementById(nextBtnId);
            const numbersEl = document.getElementById(numbersId);

            const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
            const endItem = Math.min(currentPage * itemsPerPage, totalItems);

            if (infoEl) infoEl.textContent = `Showing ${startItem}-${endItem} of ${totalItems}`;
            if (prevBtn) prevBtn.disabled = currentPage === 1;
            if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;

            if (numbersEl) {
                numbersEl.innerHTML = "";

                let pages = [];
                if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                    if (currentPage <= 4) {
                        pages = [1, 2, 3, 4, 5, '...', totalPages];
                    } else if (currentPage >= totalPages - 3) {
                        pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                    } else {
                        pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
                    }
                }

                pages.forEach(p => {
                    if (p === '...') {
                        const span = document.createElement("span");
                        span.textContent = "...";
                        span.style.padding = "5px 8px";
                        span.style.color = "var(--muted)";
                        numbersEl.appendChild(span);
                    } else {
                        const btn = document.createElement("button");
                        btn.type = "button";
                        btn.className = `btn-page ${p === currentPage ? "active" : ""}`;
                        btn.textContent = p;
                        btn.addEventListener("click", () => onPageChange(p));
                        numbersEl.appendChild(btn);
                    }
                });
            }
        }
    };
}


/* ============================================================
   PSGC API (Philippine Standard Geographic Code)
   Public API — https://psgc.cloud/
============================================================ */

const PSGC_API = "https://psgc.cloud/api";

async function fetchRegions() {
    const res = await fetch(`${PSGC_API}/regions`);
    if (!res.ok) throw new Error("Failed to load regions");
    return res.json();
}

async function fetchProvinces(regionCode) {
    const res = await fetch(`${PSGC_API}/regions/${regionCode}/provinces`);
    if (!res.ok) throw new Error("Failed to load provinces");
    return res.json();
}

async function fetchMunicipalities(provinceCode) {
    const res = await fetch(
        `${PSGC_API}/provinces/${provinceCode}/cities-municipalities`
    );
    if (!res.ok) throw new Error("Failed to load municipalities");
    return res.json();
}

async function fetchMunicipalitiesFromRegion(regionCode) {
    const res = await fetch(
        `${PSGC_API}/regions/${regionCode}/cities-municipalities`
    );
    if (!res.ok) throw new Error("Failed to load municipalities");
    return res.json();
}


/* ============================================================
   LOCATION CASCADING DROPDOWNS
============================================================ */

async function initializeLocationDropdowns() {

    const regionSelect = document.getElementById("regionSelect");
    const provinceSelect = document.getElementById("provinceSelect");
    const municipalitySelect = document.getElementById("municipalitySelect");

    if (!regionSelect || !provinceSelect || !municipalitySelect) {
        console.warn("Location dropdowns not found in DOM.");
        return;
    }

    // ---- Load regions ----
    try {
        const regions = await fetchRegions();

        regionSelect.innerHTML = `<option value="" disabled selected>Select a region</option>`;
        regions.forEach(r => {
            const opt = document.createElement("option");
            opt.value = r.code;
            opt.textContent = r.name;
            regionSelect.appendChild(opt);
        });
    } catch (err) {
        console.error("Failed to load regions:", err);
        regionSelect.innerHTML = `<option value="" disabled selected>Failed to load regions</option>`;
        return;
    }

    // ---- Region change → load provinces ----
    regionSelect.addEventListener("change", async () => {
        const regionCode = regionSelect.value;

        // Reset downstream
        provinceSelect.innerHTML = `<option value="" disabled selected>Loading...</option>`;
        provinceSelect.disabled = true;
        municipalitySelect.innerHTML = `<option value="" disabled selected>Select a municipality</option>`;
        municipalitySelect.disabled = true;

        if (!regionCode) return;

        try {
            const provinces = await fetchProvinces(regionCode);

            if (provinces.length === 0) {
                // NCR — no provinces, load municipalities directly from region
                provinceSelect.innerHTML = `<option value="" disabled selected>N/A (no provinces)</option>`;

                const municipalities = await fetchMunicipalitiesFromRegion(regionCode);
                municipalitySelect.innerHTML = `<option value="" disabled selected>Select a municipality / city</option>`;
                municipalities.forEach(m => {
                    const opt = document.createElement("option");
                    opt.value = m.code;
                    opt.textContent = m.name;
                    municipalitySelect.appendChild(opt);
                });
                municipalitySelect.disabled = false;
                return;
            }

            provinceSelect.innerHTML = `<option value="" disabled selected>Select a province</option>`;
            provinces.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p.code;
                opt.textContent = p.name;
                provinceSelect.appendChild(opt);
            });
            provinceSelect.disabled = false;
        } catch (err) {
            console.error("Failed to load provinces:", err);
            provinceSelect.innerHTML = `<option value="" disabled selected>Failed to load</option>`;
        }
    });

    // ---- Province change → load municipalities ----
    provinceSelect.addEventListener("change", async () => {
        const provinceCode = provinceSelect.value;

        municipalitySelect.innerHTML = `<option value="" disabled selected>Loading...</option>`;
        municipalitySelect.disabled = true;

        if (!provinceCode) return;

        try {
            const municipalities = await fetchMunicipalities(provinceCode);

            municipalitySelect.innerHTML = `<option value="" disabled selected>Select a municipality / city</option>`;
            municipalities.forEach(m => {
                const opt = document.createElement("option");
                opt.value = m.code;
                opt.textContent = m.name;
                municipalitySelect.appendChild(opt);
            });
            municipalitySelect.disabled = false;
        } catch (err) {
            console.error("Failed to load municipalities:", err);
            municipalitySelect.innerHTML = `<option value="" disabled selected>Failed to load</option>`;
        }
    });
}


function resetLocationDropdowns() {

    const regionSelect = document.getElementById("regionSelect");
    const provinceSelect = document.getElementById("provinceSelect");
    const municipalitySelect = document.getElementById("municipalitySelect");

    if (regionSelect) regionSelect.selectedIndex = 0;

    if (provinceSelect) {
        provinceSelect.innerHTML = `<option value="" disabled selected>Select a province</option>`;
        provinceSelect.disabled = true;
    }

    if (municipalitySelect) {
        municipalitySelect.innerHTML = `<option value="" disabled selected>Select a municipality</option>`;
        municipalitySelect.disabled = true;
    }
}


/* ============================================================
   LOAD USERS
   GET /api/users
============================================================ */

async function loadUsers() {

    const userRows =
        document.getElementById("userRows");

    if (!userRows) {
        return;
    }

    userRows.innerHTML = `
        <tr>
            <td colspan="6" style="text-align:center;">
                Loading users...
            </td>
        </tr>
    `;

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/users`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );

        let data = {};

        try {
            data = await response.json();
        }
        catch {
            data = {};
        }

        console.log(
            "GET /api/users:",
            response.status,
            data
        );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (response.status === 403) {

            userRows.innerHTML = `
                <tr>
                    <td colspan="6" class="api-error">
                        ${escapeHTML(
                            getErrorMessage(
                                data,
                                "You do not have permission to view users."
                            )
                        )}
                    </td>
                </tr>
            `;

            return;
        }

        if (!response.ok) {

            throw new Error(
                getErrorMessage(
                    data,
                    "Failed to load users."
                )
            );
        }

        let users = [];

        if (Array.isArray(data)) {
            users = data;
        }
        else if (Array.isArray(data.users)) {
            users = data.users;
        }
        else if (Array.isArray(data.data)) {
            users = data.data;
        }
        else {
            throw new Error("Unexpected response format.");
        }

        cachedUsers = users;

        if (cachedUsers.length === 0) {
            userRows.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">
                        No users found.
                    </td>
                </tr>
            `;
            renderPagination(0, usersPerPage, currentUserPage, () => {}).updateUI("paginationInfo", "prevPageBtn", "nextPageBtn", "pageNumberBtns");
            return;
        }

        const pagination = renderPagination(
            cachedUsers.length,
            usersPerPage,
            currentUserPage,
            (newPage) => {
                currentUserPage = newPage;
                loadUsers();
            }
        );

        userRows.innerHTML = "";
        const paginatedUsers = pagination.paginatedSlice(cachedUsers);

        paginatedUsers.forEach(user => {

            const row =
                document.createElement("tr");

            const fullName =
                `${user.first_name || ""} ${user.last_name || ""}`
                    .trim() || "—";

            const username =
                user.username || "—";

            const role =
                user.role || "—";

            // Location — Municipality, Province, Region
            const locationParts = [
                user.municipality,
                user.province,
                user.region
            ].filter(Boolean);

            const locationText = locationParts.length
                ? locationParts.join(", ")
                : "—";

            let isActive = true;

            if (
                typeof user.is_active ===
                "boolean"
            ) {

                isActive =
                    user.is_active;

            }
            else if (
                typeof user.status ===
                "string"
            ) {

                isActive =
                    user.status.toLowerCase() ===
                    "active";
            }

            const roleStyle =
                getRoleStyle(role);

            const userId =
                user.user_id ??
                user.id ??
                "";

            row.innerHTML = `

                <td>
                    <span class="name-pill">
                        ${escapeHTML(fullName)}
                    </span>
                </td>

                <td>
                    <span class="username-pill">
                        ${escapeHTML(username)}
                    </span>
                </td>

                <td>
                    <span class="role ${roleStyle.cls}">
                        ${escapeHTML(roleStyle.label)}
                    </span>
                </td>

                <td>
                    <span class="location-pill">
                        ${escapeHTML(locationText)}
                    </span>
                </td>

                <td>
                    <span
                        class="status-badge ${
                            isActive
                                ? "active"
                                : "inactive"
                        }"
                    >
                        ${
                            isActive
                                ? "Active"
                                : "Inactive"
                        }
                    </span>
                </td>

                <td>

                    <button
                        class="${isActive ? 'btn-deactivate' : 'btn-reactivate'}"
                        type="button"
                        data-user-id="${escapeHTML(userId)}"
                        data-active="${isActive}"
                    >
                        ${isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button
                            class="btn-archive"
                            type="button"
                            data-user-id="${escapeHTML(userId)}"
                            data-user-name="${escapeHTML(fullName)}"
                        >
                            Archive
                        </button>

                 
                </td>
            `;

            userRows.appendChild(row);
        });

        pagination.updateUI("paginationInfo", "prevPageBtn", "nextPageBtn", "pageNumberBtns");

        document
            .querySelectorAll(
                "#userRows .btn-deactivate, #userRows .btn-reactivate"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        toggleUserStatus(button);
                    }
                );
            });
            document
            .querySelectorAll("#userRows .btn-archive")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        archiveUser(button);
                    }
                );
            });

        

    }
    catch (error) {

        console.error(
            "Load users error:",
            error
        );

        userRows.innerHTML = `
            <tr>
                <td colspan="6" class="api-error">

                    Failed to load users.

                    <br><br>

                    ${escapeHTML(error.message)}

                </td>
            </tr>
        `;
    }
}


/* ============================================================
   ACTIVATE / DEACTIVATE USER (Custom Modal)
   PATCH /api/users/{user_id}/status
============================================================ */

async function toggleUserStatus(button) {

    const userId = button.dataset.userId;
    const currentStatus = button.dataset.active === "true";

    if (!userId) {
        alert("User ID is missing.");
        return;
    }

    const modal = document.getElementById("confirmStatusModal");
    const titleEl = document.getElementById("statusModalTitle");
    const descEl = document.getElementById("statusModalDesc");
    const finalBtn = document.getElementById("finalStatusBtn");
    const cancelBtn = document.getElementById("cancelStatusBtn");

    if (!modal) return;

    if (titleEl) titleEl.textContent = currentStatus ? "Confirm Deactivation" : "Confirm Reactivation";
    if (descEl) descEl.textContent = currentStatus ? "Are you sure you want to deactivate this user?" : "Are you sure you want to reactivate this user?";

    if (currentStatus) {
        finalBtn.className = "btn-primary btn-danger";
        finalBtn.textContent = "Deactivate";
    } else {
        finalBtn.className = "btn-primary";
        finalBtn.textContent = "Reactivate";
    }

    modal.classList.add("show");

    const newFinalBtn = finalBtn.cloneNode(true);
    finalBtn.parentNode.replaceChild(newFinalBtn, finalBtn);

    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    document.getElementById("cancelStatusBtn").addEventListener("click", () => {
        modal.classList.remove("show");
    });

    document.getElementById("finalStatusBtn").addEventListener("click", async () => {
        modal.classList.remove("show");

        button.disabled = true;
        button.textContent = "Updating...";

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/users/${userId}/status`,
                {
                    method: "PATCH",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ is_active: !currentStatus })
                }
            );

            let data = {};
            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (response.status === 401) {
                handleUnauthorized();
                return;
            }

            if (!response.ok) {
                throw new Error(getErrorMessage(data, "Failed to update user status."));
            }

            await loadUsers();
            await loadAuditLogs();
        }
        catch (error) {
            console.error("Toggle user status error:", error);
            alert(error.message || "Unable to update user status.");
            button.disabled = false;
            button.textContent = currentStatus ? "Deactivate" : "Reactivate";
        }
    });
}

/* ============================================================
   ARCHIVE USER
   PATCH /api/users/{user_id}/archive
============================================================ */

/* ============================================================
   ARCHIVE USER
   PATCH /api/users/{user_id}/archive
============================================================ */

async function archiveUser(button) {

    const userId = button.dataset.userId;
    const userName = button.dataset.userName || "this user";

    if (!userId) {
        alert("User ID is missing.");
        return;
    }

    const modal = document.getElementById("confirmArchiveModal");
    const descEl = document.getElementById("archiveModalDesc");
    const finalBtn = document.getElementById("finalArchiveBtn");
    const cancelBtn = document.getElementById("cancelArchiveBtn");
    const remarksInput = document.getElementById("archiveRemarks");
    const remarksError = document.getElementById("archiveRemarksError");

    if (!modal) return;

    // ✅ Reset remarks field tuwing mag-o-open
    if (remarksInput) remarksInput.value = "";
    if (remarksError) remarksError.style.display = "none";

    if (descEl) {
        descEl.textContent =
            `Are you sure you want to archive "${userName}"? They will be moved to the Archived Users list.`;
    }

    modal.classList.add("show");

    const newFinalBtn = finalBtn.cloneNode(true);
    finalBtn.parentNode.replaceChild(newFinalBtn, finalBtn);

    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    document.getElementById("cancelArchiveBtn").addEventListener("click", () => {
        modal.classList.remove("show");
    });

    document.getElementById("finalArchiveBtn").addEventListener("click", async () => {

        // ✅ REQUIRED REMARKS VALIDATION
        const remarks = (document.getElementById("archiveRemarks")?.value || "").trim();

        if (!remarks) {
            const errEl = document.getElementById("archiveRemarksError");
            if (errEl) errEl.style.display = "block";
            document.getElementById("archiveRemarks")?.focus();
            return;   // ← huwag isara yung modal kung walang remarks
        }

        modal.classList.remove("show");

        button.disabled = true;
        button.textContent = "Archiving...";

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/users/${userId}/archive`,
                {
                    method: "PATCH",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        is_archived: true,
                        remarks: remarks        // ✅ NASA LOOB ng body
                    })
                }
            );

            let data = {};
            try { data = await response.json(); } catch { data = {}; }

            console.log("PATCH archive:", response.status, data);

            if (response.status === 401) { handleUnauthorized(); return; }

            if (!response.ok) {
                throw new Error(getErrorMessage(data, "Failed to archive user."));
            }

            const remainingOnPage =
                document.querySelectorAll("#userRows tr").length - 1;

            if (remainingOnPage <= 0 && currentUserPage > 1) {
                currentUserPage--;
            }

            await loadUsers();
            await loadArchivedUsers();
            await loadAuditLogs();

        }
        catch (error) {
            console.error("Archive user error:", error);
            alert(error.message || "Unable to archive user.");
            button.disabled = false;
            button.textContent = "Archive";
        }
    });
}

/* ============================================================
   LOAD ARCHIVED USERS
   GET /api/users/archived
============================================================ */

async function loadArchivedUsers() {

    const archivedRows = document.getElementById("archivedUserRows");
    if (!archivedRows) return;

    archivedRows.innerHTML = `
        <tr>
            <td colspan="6" style="text-align:center;">
                Loading archived users...
            </td>
        </tr>
    `;

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/users/archived`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );

        let data = {};
        try { data = await response.json(); } catch { data = {}; }

        console.log("GET archived:", response.status, data);

        if (response.status === 401) { handleUnauthorized(); return; }

        if (response.status === 403) {
            archivedRows.innerHTML = `
                <tr><td colspan="6" class="api-error">
                    ${escapeHTML(getErrorMessage(data, "You do not have permission to view archived users."))}
                </td></tr>
            `;
            return;
        }

        if (!response.ok) {
            throw new Error(getErrorMessage(data, "Failed to load archived users."));
        }

        let users = [];
        if (Array.isArray(data)) users = data;
        else if (Array.isArray(data.users)) users = data.users;
        else if (Array.isArray(data.data)) users = data.data;
        else throw new Error("Unexpected response format.");

        cachedArchivedUsers = users;

        if (cachedArchivedUsers.length === 0) {
            archivedRows.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">
                        No archived users found.
                    </td>
                </tr>
            `;
            renderPagination(0, archivedPerPage, currentArchivedPage, () => {})
                .updateUI("archivedPaginationInfo", "archivedPrevPageBtn", "archivedNextPageBtn", "archivedPageNumberBtns");
            return;
        }

        const pagination = renderPagination(
            cachedArchivedUsers.length,
            archivedPerPage,
            currentArchivedPage,
            (newPage) => {
                currentArchivedPage = newPage;
                loadArchivedUsers();
            }
        );

        archivedRows.innerHTML = "";
        const paginatedUsers = pagination.paginatedSlice(cachedArchivedUsers);

       paginatedUsers.forEach(user => {

    const row = document.createElement("tr");   // ← UNAHIN ito

    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "—";
    const username = user.username || "—";
    const role = user.role || "—";

    const locationParts = [user.municipality, user.province, user.region].filter(Boolean);
    const locationText = locationParts.length ? locationParts.join(", ") : "—";

    const archivedAt = formatAuditDate(user.archived_at ?? user.updated_at);
    const roleStyle = getRoleStyle(role);
    const userId = user.user_id ?? user.id ?? "";

    row.innerHTML = `
        <td><span class="name-pill">${escapeHTML(fullName)}</span></td>
        
        <td>
            <span class="role ${roleStyle.cls}">
                ${escapeHTML(roleStyle.label)}
            </span>
        </td>
        
        <td>
            <span class="status-badge inactive">
                ${escapeHTML(archivedAt)}
            </span>
        </td>
        <td>
            <button
                class="btn-reactivate"
                type="button"
                data-user-id="${escapeHTML(userId)}"
                data-user-name="${escapeHTML(fullName)}"
            >
                Restore
            </button>
        </td>
    `;

    // ✅ Click listener DITO — pagkatapos ma-create yung row
    row.style.cursor = "pointer";
    row.addEventListener("click", (event) => {
        if (event.target.closest(".btn-reactivate")) return;
        openArchiveDetails(user);
    });

    archivedRows.appendChild(row);
});
        pagination.updateUI("archivedPaginationInfo", "archivedPrevPageBtn", "archivedNextPageBtn", "archivedPageNumberBtns");

                // ✅ FIX: Rebind Next/Prev buttons para sa Archived Users
        const archPrevBtn = document.getElementById("archivedPrevPageBtn");
        const archNextBtn = document.getElementById("archivedNextPageBtn");

        if (archPrevBtn) {
            const newPrev = archPrevBtn.cloneNode(true);
            archPrevBtn.parentNode.replaceChild(newPrev, archPrevBtn);
            newPrev.addEventListener("click", () => {
                if (currentArchivedPage > 1) {
                    currentArchivedPage--;
                    loadArchivedUsers();
                }
            });
        }

        if (archNextBtn) {
            const newNext = archNextBtn.cloneNode(true);
            archNextBtn.parentNode.replaceChild(newNext, archNextBtn);
            newNext.addEventListener("click", () => {
                const totalPages = Math.ceil(cachedArchivedUsers.length / archivedPerPage) || 1;
                if (currentArchivedPage < totalPages) {
                    currentArchivedPage++;
                    loadArchivedUsers();
                }
            });
        }

        document
            .querySelectorAll("#archivedUserRows .btn-reactivate")
            .forEach(button => {
                button.addEventListener("click", () => restoreUser(button));
            });

       
    }
    catch (error) {
        console.error("Load archived users error:", error);
        archivedRows.innerHTML = `
            <tr><td colspan="6" class="api-error">
                Failed to load archived users.
                <br><br>
                ${escapeHTML(error.message)}
            </td></tr>
        `;
    }
}


/* ============================================================
   RESTORE ARCHIVED USER
   PATCH /api/users/{user_id}/archive
============================================================ */

async function restoreUser(button) {

    const userId = button.dataset.userId;
    const userName = button.dataset.userName || "this user";

    if (!userId) { alert("User ID is missing."); return; }

    const modal = document.getElementById("confirmRestoreModal");
    const descEl = document.getElementById("restoreModalDesc");
    const finalBtn = document.getElementById("finalRestoreBtn");
    const cancelBtn = document.getElementById("cancelRestoreBtn");

    if (!modal) return;

    if (descEl) {
        descEl.textContent =
            `Are you sure you want to restore "${userName}" back to the active users list?`;
    }

    modal.classList.add("show");

    const newFinalBtn = finalBtn.cloneNode(true);
    finalBtn.parentNode.replaceChild(newFinalBtn, finalBtn);

    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    document.getElementById("cancelRestoreBtn").addEventListener("click", () => {
        modal.classList.remove("show");
    });

    document.getElementById("finalRestoreBtn").addEventListener("click", async () => {
        modal.classList.remove("show");

        button.disabled = true;
        button.textContent = "Restoring...";

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/users/${userId}/archive`,
                {
                    method: "PATCH",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ is_archived: false })
                }
            );

            let data = {};
            try { data = await response.json(); } catch { data = {}; }

            console.log("PATCH restore:", response.status, data);

            if (response.status === 401) { handleUnauthorized(); return; }

            if (!response.ok) {
                throw new Error(getErrorMessage(data, "Failed to restore user."));
            }

            const remainingOnPage =
                document.querySelectorAll("#archivedUserRows tr").length - 1;

            if (remainingOnPage <= 0 && currentArchivedPage > 1) {
                currentArchivedPage--;
            }

            await loadUsers();
            await loadArchivedUsers();
            await loadAuditLogs();

        }
        catch (error) {
            console.error("Restore user error:", error);
            alert(error.message || "Unable to restore user.");
            button.disabled = false;
            button.textContent = "Restore";
        }
    });
}

/* ============================================================
   ARCHIVE DETAILS MODAL
============================================================ */

/* ============================================================
   ARCHIVE DETAILS FULL PAGE
============================================================ */

let currentArchiveUser = null;

function openArchiveDetails(user) {

    const view = document.getElementById("view-archive-details");
    if (!view) return;

    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "—";
    const username = user.username || "—";
    const role = user.role || "—";
    const locationParts = [user.municipality, user.province, user.region].filter(Boolean);
    const locationText = locationParts.length ? locationParts.join(", ") : "—";
    const archivedAt = formatAuditDate(user.archived_at ?? user.updated_at);
    const archivedBy = user.archived_by_name || "—";
    const remarks = user.archive_remarks || user.remarks || "No remarks provided.";

    // Initials para sa avatar
    const initials = (
        (user.first_name?.[0] || "") + (user.last_name?.[0] || "")
    ).toUpperCase() || "?";

    // Fill in the data
    document.getElementById("archiveDetailInitials").textContent = initials;
    document.getElementById("archiveDetailName").textContent = fullName;
    document.getElementById("archiveDetailUsername").textContent = `@${username}`;
    document.getElementById("archiveDetailRole").textContent = role;
    document.getElementById("archiveDetailLocation").textContent = locationText;
    document.getElementById("archiveDetailArchivedAt").textContent = archivedAt;
    document.getElementById("archiveDetailArchivedBy").textContent = archivedBy;
    document.getElementById("archiveDetailRemarks").textContent = remarks;

    // Store for restore action
    currentArchiveUser = user;

    // Switch view
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active-view"));
    view.classList.add("active-view");

    // Clear active state sa sidebar (walang active nav item)
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
}
/* ============================================================
   CREATE ACCOUNT
   POST /api/users/users
============================================================ */

async function createAccount(event) {

    event.preventDefault();

    const form =
        document.getElementById(
            "addAccountForm"
        );

    if (!form) {
        return;
    }

    const firstName =
        document.getElementById(
            "firstName"
        )?.value.trim();

    const lastName =
        document.getElementById(
            "lastName"
        )?.value.trim();

    const username =
        document.getElementById(
            "newUsername"
        )?.value.trim();

    const email =
        document.getElementById(
            "newEmail"
        )?.value.trim();

    const password =
        document.getElementById(
            "newPassword"
        )?.value;

    const confirmPassword =
        document.getElementById(
            "confirmPassword"
        )?.value;

    const phone =
        document.getElementById(
            "phoneNumber"
        )?.value.trim();

    const role =
        document.getElementById(
            "roleSelect"
        )?.value;

    // ---- LOCATION ----
    const regionSelect = document.getElementById("regionSelect");
    const provinceSelect = document.getElementById("provinceSelect");
    const municipalitySelect = document.getElementById("municipalitySelect");

    const regionCode = regionSelect?.value;
    const municipalityCode = municipalitySelect?.value;

    const regionName =
        regionSelect?.selectedOptions[0]?.textContent?.trim() || "";
    const provinceName =
        provinceSelect?.selectedOptions[0]?.textContent?.trim() || "";
    const municipalityName =
        municipalitySelect?.selectedOptions[0]?.textContent?.trim() || "";

    // Validation
    if (
        !firstName ||
        !lastName ||
        !username ||
        !email ||
        !password ||
        !confirmPassword ||
        !phone ||
        !role ||
        !regionCode ||
        !municipalityCode
    ) {

        alert(
            "Please fill in all required fields."
        );

        return;
    }

     // ✅ PHONE NUMBER VALIDATION — 11 digits only
    if (!/^\d{11}$/.test(phone)) {

        alert(
            "Phone number must be exactly 11 digits (numbers only)."
        );

        return;
    }

     // ✅ EMAIL VALIDATION — must end with @gmail.com
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {

        alert(
            "Email must be a valid @gmail.com address."
        );

        return;
    }
        // ✅ PASSWORD VALIDATION
    const passwordRules = [
        
        {
            test: (p) => p.length <= 32,
            msg: "maximum of 32 characters"
        },
        {
            test: (p) => /[A-Z]/.test(p),
            msg: "at least 1 uppercase letter (A-Z)"
        },
        {
            test: (p) => /[a-z]/.test(p),
            msg: "at least 1 lowercase letter (a-z)"
        },
        {
            test: (p) => /[0-9]/.test(p),
            msg: "at least 1 number (0-9)"
        },
        {
            test: (p) => /[!@#$%^&*(),.?":{}|<>_\-\[\]\/\\;'`~+=]/.test(p),
            msg: "at least 1 special character (!@#$%^&* etc.)"
        }
    ];

    const failedRules = passwordRules
        .filter(rule => !rule.test(password))
        .map(rule => rule.msg);

    if (failedRules.length > 0) {
        alert(
            "Password must contain:\n\n• " +
            failedRules.join("\n• ")
        );
        return;
    }

    if (password !== confirmPassword) {

        alert(
            "Passwords do not match."
        );

        return;
    }

    const submitButton =
        form.querySelector(
            'button[type="submit"]'
        );

    if (submitButton) {

        submitButton.disabled = true;
        submitButton.textContent = "Creating...";
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/users`,
                {
                    method: "POST",

                    headers:
                        getAuthHeaders(),

                    body:
                        JSON.stringify({

                            first_name:
                                firstName,

                            last_name:
                                lastName,

                            username:
                                username,

                            email_address:
                                email,

                            phone_number:
                                phone,

                            role:
                                role,

                            password:
                                password,

                            region:
                                regionName,

                            province:
                                provinceName,

                            municipality:
                                municipalityName

                        })
                }
            );

        let data = {};

        try {
            data = await response.json();
        }
        catch {
            data = {};
        }

        console.log(
            "POST /api/users/users:",
            response.status,
            data
        );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (response.status === 403) {

            throw new Error(
                getErrorMessage(
                    data,
                    "Only System Administrators can create accounts."
                )
            );
        }

        if (response.status === 422) {

            throw new Error(
                getErrorMessage(
                    data,
                    "Please check the account information."
                )
            );
        }

        if (response.status === 405) {

            throw new Error(
                "Method not allowed. Please check the API endpoint."
            );
        }

        if (!response.ok) {

            throw new Error(
                getErrorMessage(
                    data,
                    "Failed to create account."
                )
            );
        }

        form.reset();
        resetLocationDropdowns();

        // Go back to users view
        const addAccountView =
            document.getElementById(
                "view-add-account"
            );

        const usersView =
            document.getElementById(
                "view-users"
            );

        if (addAccountView && usersView) {

            addAccountView.classList.remove(
                "active-view"
            );

            usersView.classList.add(
                "active-view"
            );
        }

        await loadUsers();
        await loadAuditLogs();

        alert("Account created successfully!");

    }
    catch (error) {

        console.error(
            "Create account error:",
            error
        );

        alert(
            error.message ||
            "Unable to create account."
        );

    }
    finally {

        if (submitButton) {

            submitButton.disabled = false;
            submitButton.textContent =
                "Create Account";
        }
    }
}


/* ============================================================
   AUDIT LOGS
   GET /api/audit-logs
============================================================ */

async function loadAuditLogs() {

    const auditLogRows =
        document.getElementById(
            "auditLogRows"
        );

    if (!auditLogRows) {
        return;
    }

    auditLogRows.innerHTML = `
        <tr>
            <td
                colspan="5"
                style="text-align:center;"
            >
                Loading audit logs...
            </td>
        </tr>
    `;

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/audit-logs`,
                {
                    method: "GET",
                    headers:
                        getAuthHeaders()
                }
            );

        let data = {};

        try {
            data = await response.json();
        }
        catch {
            data = {};
        }

        console.log(
            "GET /api/audit-logs:",
            response.status,
            data
        );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (response.status === 403) {

            auditLogRows.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="api-error"
                    >
                        ${escapeHTML(
                            getErrorMessage(
                                data,
                                "You do not have permission to view audit logs."
                            )
                        )}
                    </td>
                </tr>
            `;

            return;
        }

        if (!response.ok) {

            throw new Error(
                getErrorMessage(
                    data,
                    "Failed to load audit logs."
                )
            );
        }

        let logs = [];

        if (Array.isArray(data)) {

            logs = data;

        }
        else if (Array.isArray(data.logs)) {

            logs = data.logs;

        }
        else if (Array.isArray(data.data)) {

            logs = data.data;

        }
        else {

            throw new Error(
                "Unexpected audit log response format."
            );
        }

        cachedAuditLogs = logs;

        if (cachedAuditLogs.length === 0) {

            auditLogRows.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        style="text-align:center;"
                    >
                        No audit logs found.
                    </td>
                </tr>
            `;
            renderPagination(0, auditPerPage, currentAuditPage, () => {}).updateUI("auditPaginationInfo", "auditPrevPageBtn", "auditNextPageBtn", "auditPageNumberBtns");
            return;
        }

        const pagination = renderPagination(
            cachedAuditLogs.length,
            auditPerPage,
            currentAuditPage,
            (newPage) => {
                currentAuditPage = newPage;
                loadAuditLogs();
            }
        );

        auditLogRows.innerHTML = "";
        const paginatedLogs = pagination.paginatedSlice(cachedAuditLogs);

        paginatedLogs.forEach(log => {

            const row =
                document.createElement("tr");

            const logId =
                log.log_id ??
                log.id ??
                "—";

            // Build full name safely
let userName = log.user_name;

if (!userName && log.user) {
    const fn = log.user.first_name || "";
    const ln = log.user.last_name || "";
    userName = `${fn} ${ln}`.trim() || null;
}

if (!userName) {
    userName = `User #${log.user_id ?? "—"}`;
}

            const action =
                log.action ??
                "—";

            const resourceType =
                log.resource_type ??
                log.entity_type ??
                "—";

            const resourceId =
                log.resource_id ??
                log.entity_id ??
                "—";

            const createdAt =
                formatAuditDate(
                    log.created_at ??
                    log.timestamp
                );

            row.innerHTML = `

                <td>
                    ${escapeHTML(logId)}
                </td>

                <td>
                    ${escapeHTML(userName)} 
                </td>

                <td>
                    <span class="audit-action">
                        ${escapeHTML(action)}
                    </span>
                </td>

                

                <td>
                    ${escapeHTML(createdAt)}
                </td>

                <td>

                    <button
                        type="button"
                        class="action-btn audit-view-btn"
                        data-log-id="${escapeHTML(logId)}"
                    >
                        View
                    </button>

                </td>
            `;

            auditLogRows.appendChild(row);
        });

        pagination.updateUI("auditPaginationInfo", "auditPrevPageBtn", "auditNextPageBtn", "auditPageNumberBtns");
        // ✅ FIX: Rebind Next/Prev buttons para sa Audit Logs
        const auditPrevBtn = document.getElementById("auditPrevPageBtn");
        const auditNextBtn = document.getElementById("auditNextPageBtn");

        if (auditPrevBtn) {
            const newPrev = auditPrevBtn.cloneNode(true);
            auditPrevBtn.parentNode.replaceChild(newPrev, auditPrevBtn);
            newPrev.addEventListener("click", () => {
                if (currentAuditPage > 1) {
                    currentAuditPage--;
                    loadAuditLogs();
                }
            });
        }

        if (auditNextBtn) {
            const newNext = auditNextBtn.cloneNode(true);
            auditNextBtn.parentNode.replaceChild(newNext, auditNextBtn);
            newNext.addEventListener("click", () => {
                const totalPages = Math.ceil(cachedAuditLogs.length / auditPerPage) || 1;
                if (currentAuditPage < totalPages) {
                    currentAuditPage++;
                    loadAuditLogs();
                }
            });
        }

        document
            .querySelectorAll(
                "#auditLogRows .audit-view-btn"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        viewAuditLog(
                            button.dataset.logId
                        );

                    }
                );

            });

    }
    catch (error) {

        console.error(
            "Load audit logs error:",
            error
        );

        auditLogRows.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="api-error"
                >

                    Failed to load audit logs.

                    <br><br>

                    ${escapeHTML(error.message)}

                </td>
            </tr>
        `;
    }
}




/* ============================================================
   FORMAT AUDIT DATE
============================================================ */

function formatAuditDate(value) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);
    }

    return date.toLocaleString(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );
}


/* ============================================================
   GET AUDIT LOG BY ID
   GET /api/audit-logs/{log_id}
============================================================ */

async function viewAuditLog(logId) {

    if (!logId) {

        alert(
            "Audit log ID is missing."
        );

        return;
    }

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/audit-logs/${logId}`,
                {
                    method: "GET",
                    headers:
                        getAuthHeaders()
                }
            );

        let data = {};

        try {
            data = await response.json();
        }
        catch {
            data = {};
        }

        console.log(
            "GET audit log:",
            response.status,
            data
        );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (response.status === 403) {

            throw new Error(
                getErrorMessage(
                    data,
                    "You do not have permission to view this audit log."
                )
            );
        }

        if (response.status === 404) {

            throw new Error(
                getErrorMessage(
                    data,
                    "Audit log not found."
                )
            );
        }

        if (!response.ok) {

            throw new Error(
                getErrorMessage(
                    data,
                    "Failed to load audit log."
                )
            );
        }

        const oldValues =
            data.old_values
                ? JSON.stringify(
                    data.old_values,
                    null,
                    2
                )
                : "None";

        const newValues =
            data.new_values
                ? JSON.stringify(
                    data.new_values,
                    null,
                    2
                )
                : "None";

        const contentContainer = document.getElementById("modalAuditContent");
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div><b>Log ID:</b> ${escapeHTML(data.log_id ?? "—")}</div>
                <div><b>User ID:</b> ${escapeHTML(data.user_id ?? "—")}</div>
                <div><b>Action:</b> <span class="role" style="background: var(--green-light); color: var(--green-dark);">${escapeHTML(data.action ?? "—")}</span></div>
                <div><b>Resource Type:</b> ${escapeHTML(data.resource_type ?? "—")}</div>
                <div><b>Resource ID:</b> ${escapeHTML(data.resource_id ?? "—")}</div>
                <div><b>Created At:</b> ${escapeHTML(formatAuditDate(data.created_at))}</div>
                <div><b>IP Address:</b> ${escapeHTML(data.ip_address ?? "—")}</div>
                <div><b>User Agent:</b> ${escapeHTML(data.user_agent ?? "—")}</div>
                <div style="margin-top: 4px;"><b>Old Values:</b><pre style="background: #F6F3EB; padding: 8px; border-radius: 6px; font-size: 12px; margin-top: 4px; overflow-x: auto;">${escapeHTML(oldValues)}</pre></div>
                <div style="margin-top: 4px;"><b>New Values:</b><pre style="background: #F6F3EB; padding: 8px; border-radius: 6px; font-size: 12px; margin-top: 4px; overflow-x: auto;">${escapeHTML(newValues)}</pre></div>
            `;
        }

        const auditModal = document.getElementById("auditDetailModal");
        if (auditModal) {
            auditModal.classList.add("show");
        }

    }
    catch (error) {

        console.error(
            "View audit log error:",
            error
        );

        alert(
            error.message ||
            "Unable to load audit log."
        );
    }
}


/* ============================================================
   ALERT STATUS
============================================================ */

let currentActiveCard = null;


function toggleCardStatus(button) {

    const unresolved =
        button.classList.contains(
            "unresolved"
        );

    if (unresolved) {

        button.textContent =
            "Acknowledged";

        button.classList.remove(
            "unresolved"
        );

        button.classList.add(
            "acknowledged"
        );

    }
    else {

        button.textContent =
            "Unresolved";

        button.classList.remove(
            "acknowledged"
        );

        button.classList.add(
            "unresolved"
        );
    }
}


/* ============================================================
   ALERTS
============================================================ */

function initializeAlerts() {

    document
        .querySelectorAll(
            ".status-pill-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    toggleCardStatus(
                        button
                    );
                }
            );

        });

    document
        .querySelectorAll(
            ".alert-card"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    currentActiveCard =
                        card;

                    const title =
                        card.querySelector(
                            ".alert-title"
                        )?.textContent ||
                        "—";

                    const desc =
                        card.querySelector(
                            ".alert-desc"
                        )?.textContent ||
                        "—";

                    const severity =
                        card.querySelector(
                            ".sev-pill"
                        );

                    const stats =
                        card.querySelectorAll(
                            ".alert-stats span b"
                        );

                    const date =
                        card.querySelector(
                            ".alert-date"
                        )?.textContent ||
                        "—";

                    const alertStatus =
                        card.querySelector(
                            ".status-pill-btn"
                        );

                    const titleElement =
                        document.getElementById(
                            "modalAlertTitle"
                        );

                    if (titleElement) {

                        titleElement.textContent =
                            title;
                    }

                    const descElement =
                        document.getElementById(
                            "modalAlertDesc"
                        );

                    if (descElement) {

                        descElement.textContent =
                            desc;
                    }

                    const modalSeverity =
                        document.getElementById(
                            "modalAlertSev"
                        );

                    if (
                        modalSeverity &&
                        severity
                    ) {

                        modalSeverity.textContent =
                            severity.textContent;

                        modalSeverity.className =
                            "sev-pill";

                        if (
                            severity.classList.contains(
                                "high"
                            )
                        ) {

                            modalSeverity.classList.add(
                                "high"
                            );

                        }
                        else if (
                            severity.classList.contains(
                                "medium"
                            )
                        ) {

                            modalSeverity.classList.add(
                                "medium"
                            );

                        }
                        else {

                            modalSeverity.classList.add(
                                "low"
                            );
                        }
                    }

                    const supply =
                        document.getElementById(
                            "modalAlertSupply"
                        );

                    if (supply) {

                        supply.textContent =
                            stats[0]?.textContent ||
                            "—";
                    }

                    const demand =
                        document.getElementById(
                            "modalAlertDemand"
                        );

                    if (demand) {

                        demand.textContent =
                            stats[1]?.textContent ||
                            "—";
                    }

                    const surplus =
                        document.getElementById(
                            "modalAlertSurplus"
                        );

                    if (surplus) {

                        surplus.textContent =
                            stats[2]?.textContent ||
                            "—";
                    }

                    const dateElement =
                        document.getElementById(
                            "modalAlertDate"
                        );

                    if (dateElement) {

                        dateElement.textContent =
                            date;
                    }

                    const toggleButton =
                        document.getElementById(
                            "toggleAlertStatusBtn"
                        );

                    if (
                        toggleButton &&
                        alertStatus
                    ) {

                        toggleButton.textContent =
                            alertStatus.classList.contains(
                                "unresolved"
                            )
                                ? "Acknowledge Alert"
                                : "Mark as Unresolved";
                    }

                    if (
                        typeof openModal ===
                        "function"
                    ) {

                        openModal(
                            "alertDetailModal"
                        );

                    }
                    else {

                        document
                            .getElementById(
                                "alertDetailModal"
                            )
                            ?.classList.add(
                                "show"
                            );
                    }

                }
            );

        });
}


/* ============================================================
   SEARCH USERS
============================================================ */

function initializeUserSearch() {

    const searchInput =
        document.getElementById(
            "searchUsers"
        );

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener(
        "input",
        () => {

            const search =
                searchInput.value
                    .trim()
                    .toLowerCase();

            document
                .querySelectorAll(
                    "#userRows tr"
                )
                .forEach(row => {

                    const text =
                        row.textContent
                            .toLowerCase();

                    row.style.display =
                        text.includes(search)
                            ? ""
                            : "none";
                });
        }
    );
}

/* ============================================================
   SEARCH ARCHIVED USERS
============================================================ */

function initializeArchivedSearch() {

    const searchInput = document.getElementById("searchArchived");

    if (!searchInput) {
        console.warn("Archived search input not found.");
        return;
    }

    searchInput.addEventListener("input", () => {

        const search = searchInput.value.trim().toLowerCase();
        const rows = document.querySelectorAll("#archivedUserRows tr");

        let visibleCount = 0;

        rows.forEach(row => {

            // Skip placeholder / empty rows
            if (row.querySelector("td[colspan]")) return;

            const text = row.textContent.toLowerCase();
            const match = !search || text.includes(search);

            row.style.display = match ? "" : "none";
            if (match) visibleCount++;
        });

        // Show/hide "No results" message
        const tbody = document.getElementById("archivedUserRows");
        if (!tbody) return;

        let emptyRow = tbody.querySelector(".archived-empty-row");

        if (visibleCount === 0 && rows.length > 0) {
            if (!emptyRow) {
                emptyRow = document.createElement("tr");
                emptyRow.className = "archived-empty-row";
                emptyRow.innerHTML = `
                    <td colspan="4" style="padding:30px; text-align:center; color:#999;">
                        No archived users found matching "<b>${escapeHTML(search)}</b>".
                    </td>
                `;
                tbody.appendChild(emptyRow);
            } else {
                emptyRow.querySelector("td").innerHTML = `
                    No archived users found matching "<b>${escapeHTML(search)}</b>".
                `;
                emptyRow.style.display = "";
            }
        } else if (emptyRow) {
            emptyRow.style.display = "none";
        }
    });
}

/* ============================================================
   SEARCH AUDIT LOGS
============================================================ */

function initializeAuditSearch() {

    const searchInput =
        document.getElementById(
            "searchAudit"
        );

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener(
        "input",
        () => {

            const search =
                searchInput.value
                    .trim()
                    .toLowerCase();

            document
                .querySelectorAll(
                    "#auditLogRows tr"
                )
                .forEach(row => {

                    const text =
                        row.textContent
                            .toLowerCase();

                    row.style.display =
                        text.includes(search)
                            ? ""
                            : "none";
                });
        }
    );
}



/* ============================================================
   SIDEBAR (Hover-Based)
============================================================ */

function initHoverSidebar() {

    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const sidebar = document.getElementById("sidebar");

    if (!hamburgerBtn || !sidebar) return;

    let hoverTimer = null;

    hamburgerBtn.addEventListener("mouseenter", function () {

        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }

        sidebar.classList.add("open");

        setTimeout(function () {
            if (window.leafletMap) {
                window.leafletMap.invalidateSize();
            }
        }, 300);
    });

    sidebar.addEventListener("mouseenter", function () {

        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    });

    sidebar.addEventListener("mouseleave", function () {

        hoverTimer = setTimeout(function () {
            sidebar.classList.remove("open");
        }, 200);
    });

    document.addEventListener("click", function (event) {

        const isInsideSidebar = sidebar.contains(event.target);
        const isHamburger = hamburgerBtn.contains(event.target);

        if (!isInsideSidebar && !isHamburger) {
            sidebar.classList.remove("open");
        }
    });

    sidebar.querySelectorAll(".nav-item").forEach(function (item) {

        item.addEventListener("click", function () {
            sidebar.classList.remove("open");
        });
    });

    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape") {
            sidebar.classList.remove("open");
        }
    });

    const signoutBtn = sidebar.querySelector(".signout");

    if (signoutBtn) {
        signoutBtn.addEventListener("click", function () {
            sidebar.classList.remove("open");
        });
    }
}


/* ============================================================
   DOM READY
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /* AUTH */

        if (
            !initializeLoggedInUser()
        ) {
            return;
        }

        if (
            !checkAdminRole()
        ) {
            return;
        }


        /* NAVIGATION */

        if (
            typeof initViewSwitching ===
            "function"
        ) {

            initViewSwitching();
        }


        /* SIDEBAR */

        if (typeof initHoverSidebar === "function") {
            initHoverSidebar();
        }


        /* USERS */

        loadUsers();

        /* AUDIT LOGS */

        loadAuditLogs();

       
         /* ARCHIVED USERS */

        loadArchivedUsers();

        /* LOCATION DROPDOWNS (cascading) */

        initializeLocationDropdowns();


       


        /* SEARCH */

        initializeUserSearch();
        initializeAuditSearch();
        initializeArchivedSearch();

    
        


        // User Pagination Next/Prev bindings
        const prevPageBtn = document.getElementById("prevPageBtn");
        const nextPageBtn = document.getElementById("nextPageBtn");

        if (prevPageBtn) {
            prevPageBtn.addEventListener("click", () => {
                if (currentUserPage > 1) {
                    currentUserPage--;
                    loadUsers();
                }
            });
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener("click", () => {
                currentUserPage++;
                loadUsers();
            });
        }


        // Audit Log Pagination Next/Prev bindings
        const auditPrevBtn = document.getElementById("auditPrevPageBtn");
        const auditNextBtn = document.getElementById("auditNextPageBtn");

        if (auditPrevBtn) {
            auditPrevBtn.addEventListener("click", () => {
                if (currentAuditPage > 1) {
                    currentAuditPage--;
                    loadAuditLogs();
                }
            });
        }

        if (auditNextBtn) {
            auditNextBtn.addEventListener("click", () => {
                currentAuditPage++;
                loadAuditLogs();
            });
        }


        /* CLOSE AUDIT LOG MODAL */
        const closeAuditBtn = document.getElementById("closeAuditModalBtn");
        const closeAuditX = document.getElementById("closeAuditModalX");
        const auditModal = document.getElementById("auditDetailModal");

        if (closeAuditBtn && auditModal) {
            closeAuditBtn.addEventListener("click", () => {
                auditModal.classList.remove("show");
            });
        }

        if (closeAuditX && auditModal) {
            closeAuditX.addEventListener("click", () => {
                auditModal.classList.remove("show");
            });
        }
                /* ARCHIVE DETAILS — Back to Archived Users */
        const backBtn1 = document.getElementById("backToArchivedBtn");
        const backBtn2 = document.getElementById("backToArchivedBtn2");

        function goBackToArchived() {
            document.querySelectorAll(".view").forEach(v => v.classList.remove("active-view"));
            const archivedView = document.getElementById("view-archived");
            if (archivedView) archivedView.classList.add("active-view");

            document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
            document.querySelector('.nav-item[data-view="archived"]')?.classList.add("active");
        }

        if (backBtn1) backBtn1.addEventListener("click", goBackToArchived);
        if (backBtn2) backBtn2.addEventListener("click", goBackToArchived);


        /* ARCHIVE DETAILS — Restore from details page */
        const restoreFromDetailsBtn = document.getElementById("restoreFromDetailsBtn");
        if (restoreFromDetailsBtn) {
            restoreFromDetailsBtn.addEventListener("click", () => {
                if (!currentArchiveUser) return;

                const fakeBtn = document.createElement("button");
                fakeBtn.dataset.userId = currentArchiveUser.user_id ?? currentArchiveUser.id;
                fakeBtn.dataset.userName = 
                    `${currentArchiveUser.first_name || ""} ${currentArchiveUser.last_name || ""}`.trim();
                
                restoreUser(fakeBtn);
            });
        }
                /* CLOSE ARCHIVE DETAILS MODAL */
        const closeArchiveDetailsBtn = document.getElementById("closeArchiveDetailsBtn");
        const closeArchiveDetailsX = document.getElementById("closeArchiveDetailsX");
        const archiveDetailsModal = document.getElementById("archiveDetailsModal");

        if (closeArchiveDetailsBtn && archiveDetailsModal) {
            closeArchiveDetailsBtn.addEventListener("click", () => {
                archiveDetailsModal.classList.remove("show");
            });
        }

        if (closeArchiveDetailsX && archiveDetailsModal) {
            closeArchiveDetailsX.addEventListener("click", () => {
                archiveDetailsModal.classList.remove("show");
            });
        }

        // Close kapag click sa labas ng modal
        if (archiveDetailsModal) {
            archiveDetailsModal.addEventListener("click", (event) => {
                if (event.target === archiveDetailsModal) {
                    archiveDetailsModal.classList.remove("show");
                }
            });
        }


        /* ADD ACCOUNT */

        const addButton =
            document.getElementById(
                "addAccountBtn"
            );

        if (addButton) {

            addButton.addEventListener(
                "click",
                () => {

                    const addAccountView =
                        document.getElementById(
                            "view-add-account"
                        );

                    const usersView =
                        document.getElementById(
                            "view-users"
                        );

                    if (addAccountView && usersView) {

                        usersView.classList.remove(
                            "active-view"
                        );

                        addAccountView.classList.add(
                            "active-view"
                        );

                        document
                            .querySelectorAll(
                                ".nav-item"
                            )
                            .forEach(item => {
                                item.classList.remove(
                                    "active"
                                );
                            });

                    } else {

                        alert(
                            "Add Account form is not available. Please check the page."
                        );
                    }

                }
            );
        }


        /* CANCEL */

        const cancelButton =
            document.getElementById(
                "cancelAddAccount"
            );

        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                () => {

                    const form =
                        document.getElementById(
                            "addAccountForm"
                        );

                    if (form) {
                        form.reset();
                    }

                    resetLocationDropdowns();

                    const addAccountView =
                        document.getElementById(
                            "view-add-account"
                        );

                    const usersView =
                        document.getElementById(
                            "view-users"
                        );

                    if (addAccountView && usersView) {

                        addAccountView.classList.remove(
                            "active-view"
                        );

                        usersView.classList.add(
                            "active-view"
                        );

                        document
                            .querySelectorAll(
                                ".nav-item"
                            )
                            .forEach(item => {
                                item.classList.remove(
                                    "active"
                                );
                            });

                        document
                            .querySelector(
                                '.nav-item[data-view="users"]'
                            )
                            ?.classList.add(
                                "active"
                            );

                    } else {

                        document
                            .querySelectorAll(
                                ".view"
                            )
                            .forEach(view => {
                                view.classList.remove(
                                    "active-view"
                                );
                            });

                        const usersView2 =
                            document.getElementById(
                                "view-users"
                            );

                        if (usersView2) {
                            usersView2.classList.add(
                                "active-view"
                            );
                        }
                    }

                }
            );
        }


        /* CREATE ACCOUNT */

        const form =
            document.getElementById(
                "addAccountForm"
            );

        if (form) {

            form.addEventListener(
                "submit",
                createAccount
            );
        }


        /* SUCCESS MODAL */

        const modalButton =
            document.getElementById(
                "modalOkBtn"
            );

        if (modalButton) {

            modalButton.addEventListener(
                "click",
                async () => {

                    if (
                        typeof closeModal ===
                        "function"
                    ) {

                        closeModal(
                            "successModal"
                        );

                    }
                    else {

                        document
                            .getElementById(
                                "successModal"
                            )
                            ?.classList.remove(
                                "show"
                            );
                    }

                    if (
                        typeof switchView ===
                        "function"
                    ) {

                        switchView(
                            "users"
                        );
                    }

                    await loadUsers();

                    await loadAuditLogs();

                }
            );
        }


        /* ALERTS */

        initializeAlerts();


        /* CLOSE ALERT MODAL */

        const closeAlert =
            document.getElementById(
                "closeAlertModalBtn"
            );

        if (closeAlert) {

            closeAlert.addEventListener(
                "click",
                () => {

                    if (
                        typeof closeModal ===
                        "function"
                    ) {

                        closeModal(
                            "alertDetailModal"
                        );

                    }
                    else {

                        document
                            .getElementById(
                                "alertDetailModal"
                            )
                            ?.classList.remove(
                                "show"
                            );
                    }

                }
            );
        }


        /* TOGGLE ALERT */

        const alertToggle =
            document.getElementById(
                "toggleAlertStatusBtn"
            );

        if (alertToggle) {

            alertToggle.addEventListener(
                "click",
                () => {

                    if (
                        currentActiveCard
                    ) {

                        const button =
                            currentActiveCard
                                .querySelector(
                                    ".status-pill-btn"
                                );

                        if (button) {

                            toggleCardStatus(
                                button
                            );
                        }
                    }

                    if (
                        typeof closeModal ===
                        "function"
                    ) {

                        closeModal(
                            "alertDetailModal"
                        );

                    }
                    else {

                        document
                            .getElementById(
                                "alertDetailModal"
                            )
                            ?.classList.remove(
                                "show"
                            );
                    }

                }
            );
        }


        /* SIGN OUT */

        const signOut =
            document.getElementById(
                "signOutButton"
            );

        const logoutModal =
            document.getElementById(
                "confirmLogoutModal"
            );

        const cancelLogoutBtn =
            document.getElementById(
                "cancelLogoutBtn"
            );

        const finalLogoutBtn =
            document.getElementById(
                "finalLogoutBtn"
            );

        if (signOut && logoutModal) {

            signOut.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    logoutModal.classList.add("show");
                }
            );
        }

        if (cancelLogoutBtn && logoutModal) {
            cancelLogoutBtn.addEventListener(
                "click",
                () => {
                    logoutModal.classList.remove("show");
                }
            );
        }

        if (finalLogoutBtn) {
            finalLogoutBtn.addEventListener(
                "click",
                () => {
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("token_type");
                    localStorage.removeItem("user_id");
                    localStorage.removeItem("username");
                    localStorage.removeItem("role");

                    window.location.href = "../index.html";
                }
            );
        }

    }
);