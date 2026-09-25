const API_BASE_URL = "http://127.0.0.1:8000";


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


function getErrorMessage(data, fallback = "Something went wrong.") {
    if (!data) return fallback;
    if (Array.isArray(data.detail)) {
        return data.detail.map(error => {
            if (typeof error === "string") return error;
            if (error?.msg) return error.msg;
            return JSON.stringify(error);
        }).join("\n");
    }
    if (typeof data.detail === "string") return data.detail;
    if (typeof data.detail === "object" && data.detail !== null) {
        if (data.detail.message) return data.detail.message;
        if (data.detail.msg) return data.detail.msg;
        try { return JSON.stringify(data.detail); } catch { return fallback; }
    }
    if (typeof data.message === "string") return data.message;
    return fallback;
}


function handleUnauthorized() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    window.location.href = "../index.html";
}


function initializeLoggedInUser() {
    const token = localStorage.getItem("access_token");
    if (!token) {
        window.location.href = "../index.html";
        return false;
    }
    // ✅ Priority: user_display_name > username
    const username =
        localStorage.getItem("user_display_name") ||
        localStorage.getItem("username") ||
        "Unknown User";
    const role = localStorage.getItem("role") || "Unknown Role";
    const usernameElement = document.getElementById("loggedInUserName");
    const roleElement = document.getElementById("loggedInUserRole");
    if (usernameElement) usernameElement.textContent = username;
    if (roleElement) roleElement.textContent = role;
    return true;
}


function checkAdminRole() {
    const role = localStorage.getItem("role");
    if (role !== "System Administrator") {
        alert("Access denied. System Administrator privileges required.");
        window.location.href = "../index.html";
        return false;
    }
    return true;
}


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function getRoleStyle(role) {
    const styles = {
        "System Administrator": { cls: "darkred", label: "System Administrator" },
        "DA-RFO Officer": { cls: "blue", label: "DA-RFO Officer" },
        "DA-RFO": { cls: "blue", label: "DA-RFO" },
        "Provincial Coordinator": { cls: "teal", label: "Provincial Coordinator" },
        "Provincial": { cls: "teal", label: "Provincial" },
        "Municipal Coordinator": { cls: "green", label: "Municipal Coordinator" },
        "Municipal": { cls: "green", label: "Municipal" },
        "AEW": { cls: "green", label: "AEW" }
    };
    return styles[role] || { cls: "green", label: role || "Unknown" };
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
   PSGC API & LOCATION DROPDOWNS
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
    const res = await fetch(`${PSGC_API}/provinces/${provinceCode}/cities-municipalities`);
    if (!res.ok) throw new Error("Failed to load municipalities");
    return res.json();
}


async function fetchMunicipalitiesFromRegion(regionCode) {
    const res = await fetch(`${PSGC_API}/regions/${regionCode}/cities-municipalities`);
    if (!res.ok) throw new Error("Failed to load municipalities");
    return res.json();
}


async function initializeLocationDropdowns() {
    const regionSelect = document.getElementById("regionSelect");
    const provinceSelect = document.getElementById("provinceSelect");
    const municipalitySelect = document.getElementById("municipalitySelect");


    if (!regionSelect || !provinceSelect || !municipalitySelect) return;


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
        regionSelect.innerHTML = `<option value="" disabled selected>Failed to load regions</option>`;
        return;
    }


    regionSelect.addEventListener("change", async () => {
        const regionCode = regionSelect.value;
        provinceSelect.innerHTML = `<option value="" disabled selected>Loading...</option>`;
        provinceSelect.disabled = true;
        municipalitySelect.innerHTML = `<option value="" disabled selected>Select a municipality</option>`;
        municipalitySelect.disabled = true;


        if (!regionCode) return;


        try {
            const provinces = await fetchProvinces(regionCode);
            if (provinces.length === 0) {
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
            provinceSelect.innerHTML = `<option value="" disabled selected>Failed to load</option>`;
        }
    });


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
============================================================ */
async function loadUsers() {
    const userRows = document.getElementById("userRows");
    if (!userRows) return;


    userRows.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading users...</td></tr>`;


    try {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
            method: "GET",
            headers: getAuthHeaders()
        });
        let data = {};
        try { data = await response.json(); } catch { data = {}; }


        if (response.status === 401) { handleUnauthorized(); return; }
        if (response.status === 403) {
            userRows.innerHTML = `<tr><td colspan="6" class="api-error">${escapeHTML(getErrorMessage(data, "You do not have permission to view users."))}</td></tr>`;
            return;
        }
        if (!response.ok) throw new Error(getErrorMessage(data, "Failed to load users."));


        let users = [];
        if (Array.isArray(data)) users = data;
        else if (Array.isArray(data.users)) users = data.users;
        else if (Array.isArray(data.data)) users = data.data;
        else throw new Error("Unexpected response format.");


        cachedUsers = users;
        updateRoleSummaryCards(cachedUsers); 


        if (cachedUsers.length === 0) {
            userRows.innerHTML = `<tr><td colspan="6" style="text-align:center;">No users found.</td></tr>`;
            renderPagination(0, usersPerPage, currentUserPage, () => {}).updateUI("paginationInfo", "prevPageBtn", "nextPageBtn", "pageNumberBtns");
            return;
        }


        const pagination = renderPagination(cachedUsers.length, usersPerPage, currentUserPage, (newPage) => {
            currentUserPage = newPage;
            loadUsers();
        });


        userRows.innerHTML = "";
        pagination.paginatedSlice(cachedUsers).forEach(user => {
            const row = document.createElement("tr");
            const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "—";
            const username = user.username || "—";
            const role = user.role || "—";
            const locationParts = [user.municipality, user.province, user.region].filter(Boolean);
            const locationText = locationParts.length ? locationParts.join(", ") : "—";
            let isActive = true;
            if (typeof user.is_active === "boolean") isActive = user.is_active;
            else if (typeof user.status === "string") isActive = user.status.toLowerCase() === "active";


            const roleStyle = getRoleStyle(role);
            const userId = user.user_id ?? user.id ?? "";


            row.innerHTML = `
                <td><span class="name-pill">${escapeHTML(fullName)}</span></td>
                <td><span class="username-pill">${escapeHTML(username)}</span></td>
                <td><span class="role ${roleStyle.cls}">${escapeHTML(roleStyle.label)}</span></td>
                <td><span class="location-pill">${escapeHTML(locationText)}</span></td>
                <td><span class="status-badge ${isActive ? "active" : "inactive"}">${isActive ? "Active" : "Inactive"}</span></td>
                <td>
                    <button class="${isActive ? 'btn-deactivate' : 'btn-reactivate'}" type="button" data-user-id="${escapeHTML(userId)}" data-active="${isActive}">
                        ${isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button class="btn-archive" type="button" data-user-id="${escapeHTML(userId)}" data-user-name="${escapeHTML(fullName)}">
                        Archive
                    </button>
                </td>
            `;
            userRows.appendChild(row);
        });


        pagination.updateUI("paginationInfo", "prevPageBtn", "nextPageBtn", "pageNumberBtns");

        const prevBtn = document.getElementById("prevPageBtn");
const nextBtn = document.getElementById("nextPageBtn");

if (prevBtn) {
    const newPrev = prevBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrev, prevBtn);
    newPrev.addEventListener("click", () => {
        if (currentUserPage > 1) {
            currentUserPage--;
            loadUsers();
        }
    });
}

if (nextBtn) {
    const newNext = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNext, nextBtn);
    newNext.addEventListener("click", () => {
        const totalPages = Math.ceil(cachedUsers.length / usersPerPage) || 1;
        if (currentUserPage < totalPages) {
            currentUserPage++;
            loadUsers();
        }
    });
}

        document.querySelectorAll("#userRows .btn-deactivate, #userRows .btn-reactivate").forEach(button => {
            button.addEventListener("click", () => toggleUserStatus(button));
        });
        document.querySelectorAll("#userRows .btn-archive").forEach(button => {
            button.addEventListener("click", () => archiveUser(button));
        });


    } catch (error) {
        userRows.innerHTML = `<tr><td colspan="6" class="api-error">Failed to load users.<br><br>${escapeHTML(error.message)}</td></tr>`;
    }
}
/* ============================================================
   ROLE SUMMARY CARDS
============================================================ */
function updateRoleSummaryCards(users) {
    const counts = {
        "AEW": 0,
        "Municipal Coordinator": 0,
        "Provincial Coordinator": 0,
        "DA-RFO": 0
    };

    (users || []).forEach(user => {
        const role = user.role || "";
        // Match exact or alias
        if (role === "AEW" || role === "Agricultural Extension Worker") {
            counts["AEW"]++;
        } else if (role === "Municipal Coordinator" || role === "Municipal") {
            counts["Municipal Coordinator"]++;
        } else if (role === "Provincial Coordinator" || role === "Provincial") {
            counts["Provincial Coordinator"]++;
        } else if (role === "DA-RFO" || role === "DA-RFO Officer") {
            counts["DA-RFO"]++;
        }
    });

    const setCount = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setCount("countAEW", counts["AEW"]);
    setCount("countMunicipal", counts["Municipal Coordinator"]);
    setCount("countProvincial", counts["Provincial Coordinator"]);
    setCount("countDARFO", counts["DA-RFO"]);
}

/* ============================================================
   ARCHIVED SUMMARY CARDS
============================================================ */
function updateArchivedSummaryCards(users) {
    const counts = {
        "AEW": 0,
        "Municipal Coordinator": 0,
        "Provincial Coordinator": 0,
        "DA-RFO": 0
    };

    (users || []).forEach(user => {
        const role = user.role || "";
        if (role === "AEW" || role === "Agricultural Extension Worker") {
            counts["AEW"]++;
        } else if (role === "Municipal Coordinator" || role === "Municipal") {
            counts["Municipal Coordinator"]++;
        } else if (role === "Provincial Coordinator" || role === "Provincial") {
            counts["Provincial Coordinator"]++;
        } else if (role === "DA-RFO" || role === "DA-RFO Officer") {
            counts["DA-RFO"]++;
        }
    });

    const setCount = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setCount("archivedCountTotal", (users || []).length);
    setCount("archivedCountAEW", counts["AEW"]);
    setCount("archivedCountMunicipal", counts["Municipal Coordinator"]);
    setCount("archivedCountProvincial", counts["Provincial Coordinator"]);
    setCount("archivedCountDARFO", counts["DA-RFO"]);
}

/* ============================================================
   TOGGLE USER STATUS
============================================================ */
async function toggleUserStatus(button) {
    const userId = button.dataset.userId;
    const currentStatus = button.dataset.active === "true";
    if (!userId) return;


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


    document.getElementById("cancelStatusBtn").addEventListener("click", () => modal.classList.remove("show"));
    document.getElementById("finalStatusBtn").addEventListener("click", async () => {
        modal.classList.remove("show");
        button.disabled = true;
        button.textContent = "Updating...";


        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/status`, {
                method: "PATCH",
                headers: getAuthHeaders(),
                body: JSON.stringify({ is_active: !currentStatus })
            });
            let data = {};
            try { data = await response.json(); } catch { data = {}; }
            if (response.status === 401) { handleUnauthorized(); return; }
            if (!response.ok) throw new Error(getErrorMessage(data, "Failed to update user status."));


            await loadUsers();
            await loadAuditLogs();
        } catch (error) {
            alert(error.message || "Unable to update user status.");
            button.disabled = false;
            button.textContent = currentStatus ? "Deactivate" : "Reactivate";
        }
    });
}


/* ============================================================
   ARCHIVE USER
============================================================ */
async function archiveUser(button) {
    const userId = button.dataset.userId;
    const userName = button.dataset.userName || "this user";
    if (!userId) return;


    const modal = document.getElementById("confirmArchiveModal");
    const descEl = document.getElementById("archiveModalDesc");
    const finalBtn = document.getElementById("finalArchiveBtn");
    const cancelBtn = document.getElementById("cancelArchiveBtn");
    const remarksInput = document.getElementById("archiveRemarks");
    const remarksError = document.getElementById("archiveRemarksError");


    if (!modal) return;
    if (remarksInput) remarksInput.value = "";
    if (remarksError) remarksError.style.display = "none";
    if (descEl) descEl.textContent = `Are you sure you want to archive "${userName}"? They will be moved to the Archived Users list.`;


    modal.classList.add("show");


    const newFinalBtn = finalBtn.cloneNode(true);
    finalBtn.parentNode.replaceChild(newFinalBtn, finalBtn);
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);


    document.getElementById("cancelArchiveBtn").addEventListener("click", () => modal.classList.remove("show"));
    document.getElementById("finalArchiveBtn").addEventListener("click", async () => {
        const remarks = (document.getElementById("archiveRemarks")?.value || "").trim();
        if (!remarks) {
            if (remarksError) remarksError.style.display = "block";
            document.getElementById("archiveRemarks")?.focus();
            return;
        }


        modal.classList.remove("show");
        button.disabled = true;
        button.textContent = "Archiving...";


        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/archive`, {
                method: "PATCH",
                headers: getAuthHeaders(),
                body: JSON.stringify({ is_archived: true, remarks: remarks })
            });
            let data = {};
            try { data = await response.json(); } catch { data = {}; }
            if (response.status === 401) { handleUnauthorized(); return; }
            if (!response.ok) throw new Error(getErrorMessage(data, "Failed to archive user."));


            const remainingOnPage = document.querySelectorAll("#userRows tr").length - 1;
            if (remainingOnPage <= 0 && currentUserPage > 1) currentUserPage--;


            await loadUsers();
            await loadArchivedUsers();
            await loadAuditLogs();
        } catch (error) {
            alert(error.message || "Unable to archive user.");
            button.disabled = false;
            button.textContent = "Archive";
        }
    });
}


/* ============================================================
   LOAD ARCHIVED USERS
============================================================ */
async function loadArchivedUsers() {
    const archivedRows = document.getElementById("archivedUserRows");
    if (!archivedRows) return;


    archivedRows.innerHTML = `<tr><td colspan="4" style="text-align:center;">Loading archived users...</td></tr>`;


    try {
        const response = await fetch(`${API_BASE_URL}/api/users/archived`, {
            method: "GET",
            headers: getAuthHeaders()
        });
        let data = {};
        try { data = await response.json(); } catch { data = {}; }


        if (response.status === 401) { handleUnauthorized(); return; }
        if (!response.ok) throw new Error(getErrorMessage(data, "Failed to load archived users."));


        let users = [];
        if (Array.isArray(data)) users = data;
        else if (Array.isArray(data.users)) users = data.users;
        else if (Array.isArray(data.data)) users = data.data;


        cachedArchivedUsers = users;
        updateArchivedSummaryCards(cachedArchivedUsers);


        if (cachedArchivedUsers.length === 0) {
            archivedRows.innerHTML = `<tr><td colspan="4" style="text-align:center;">No archived users found.</td></tr>`;
            renderPagination(0, archivedPerPage, currentArchivedPage, () => {}).updateUI("archivedPaginationInfo", "archivedPrevPageBtn", "archivedNextPageBtn", "archivedPageNumberBtns");
            return;
        }


        const pagination = renderPagination(cachedArchivedUsers.length, archivedPerPage, currentArchivedPage, (newPage) => {
            currentArchivedPage = newPage;
            loadArchivedUsers();
        });


       archivedRows.innerHTML = "";
pagination.paginatedSlice(cachedArchivedUsers).forEach(user => {
    const row = document.createElement("tr");
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "—";
    const role = user.role || "—";
    const archivedAt = formatAuditDate(user.archived_at ?? user.updated_at);
    const roleStyle = getRoleStyle(role);
    const userId = user.user_id ?? user.id ?? "";

    row.innerHTML = `
        <td><span class="name-pill">${escapeHTML(fullName)}</span></td>
        <td><span class="role ${roleStyle.cls}">${escapeHTML(roleStyle.label)}</span></td>
        <td><span class="status-badge inactive">${escapeHTML(archivedAt)}</span></td>
        <td>
            <button class="btn-reactivate" type="button" data-user-id="${escapeHTML(userId)}" data-user-name="${escapeHTML(fullName)}">
                Restore
            </button>
        </td>
    `;

    // ✅ Click listener para sa Archive Details — NASA LOOB ng forEach
    row.style.cursor = "pointer";
    row.addEventListener("click", (event) => {
        if (event.target.closest(".btn-reactivate")) return;
        openArchiveDetails(user);
    });

    archivedRows.appendChild(row);
});

  



        pagination.updateUI("archivedPaginationInfo", "archivedPrevPageBtn", "archivedNextPageBtn", "archivedPageNumberBtns");


        document.querySelectorAll("#archivedUserRows .btn-reactivate").forEach(button => {
            button.addEventListener("click", (e) => {
                e.stopPropagation();
                restoreUser(button);
            });
        });

        
    } catch (error) {
        archivedRows.innerHTML = `<tr><td colspan="4" class="api-error">Failed to load archived users.</td></tr>`;
    }
}


async function restoreUser(button) {
    const userId = button.dataset.userId;
    const userName = button.dataset.userName || "this user";
    if (!userId) return;


    const modal = document.getElementById("confirmRestoreModal");
    const descEl = document.getElementById("restoreModalDesc");
    const finalBtn = document.getElementById("finalRestoreBtn");
    const cancelBtn = document.getElementById("cancelRestoreBtn");


    if (!modal) return;
    if (descEl) descEl.textContent = `Are you sure you want to restore "${userName}" back to the active users list?`;


    modal.classList.add("show");


    const newFinalBtn = finalBtn.cloneNode(true);
    finalBtn.parentNode.replaceChild(newFinalBtn, finalBtn);
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);


    document.getElementById("cancelRestoreBtn").addEventListener("click", () => modal.classList.remove("show"));
    document.getElementById("finalRestoreBtn").addEventListener("click", async () => {
        modal.classList.remove("show");
        button.disabled = true;
        button.textContent = "Restoring...";


        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}/archive`, {
                method: "PATCH",
                headers: getAuthHeaders(),
                body: JSON.stringify({ is_archived: false })
            });
            let data = {};
            try { data = await response.json(); } catch { data = {}; }
            if (response.status === 401) { handleUnauthorized(); return; }
            if (!response.ok) throw new Error(getErrorMessage(data, "Failed to restore user."));


            await loadUsers();
            await loadArchivedUsers();
            await loadAuditLogs();
        } catch (error) {
            alert(error.message || "Unable to restore user.");
            button.disabled = false;
            button.textContent = "Restore";
        }
    });
}

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

    const initials = (
        (user.first_name?.[0] || "") + (user.last_name?.[0] || "")
    ).toUpperCase() || "?";

    document.getElementById("archiveDetailInitials").textContent = initials;
    document.getElementById("archiveDetailName").textContent = fullName;
    document.getElementById("archiveDetailUsername").textContent = `@${username}`;
    document.getElementById("archiveDetailRole").textContent = role;
    document.getElementById("archiveDetailLocation").textContent = locationText;
    document.getElementById("archiveDetailArchivedAt").textContent = archivedAt;
    document.getElementById("archiveDetailArchivedBy").textContent = archivedBy;
    document.getElementById("archiveDetailRemarks").textContent = remarks;

    currentArchiveUser = user;

    document.querySelectorAll(".view").forEach(v => v.classList.remove("active-view"));
    view.classList.add("active-view");

    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));

    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ============================================================
   CREATE ACCOUNT
============================================================ */
async function createAccount(event) {
    event.preventDefault();
    const form = document.getElementById("addAccountForm");
    if (!form) return;


    const firstName = document.getElementById("firstName")?.value.trim();
    const lastName = document.getElementById("lastName")?.value.trim();
    const username = document.getElementById("newUsername")?.value.trim();
    const email = document.getElementById("newEmail")?.value.trim();
    const password = document.getElementById("newPassword")?.value;
    const confirmPassword = document.getElementById("confirmPassword")?.value;
    const phone = document.getElementById("phoneNumber")?.value.trim();
    const role = document.getElementById("roleSelect")?.value;


    const regionSelect = document.getElementById("regionSelect");
    const provinceSelect = document.getElementById("provinceSelect");
    const municipalitySelect = document.getElementById("municipalitySelect");


    const regionCode = regionSelect?.value;
    const municipalityCode = municipalitySelect?.value;
    const regionName = regionSelect?.selectedOptions[0]?.textContent?.trim() || "";
    const provinceName = provinceSelect?.selectedOptions[0]?.textContent?.trim() || "";
    const municipalityName = municipalitySelect?.selectedOptions[0]?.textContent?.trim() || "";


    if (!firstName || !lastName || !username || !email || !password || !confirmPassword || !phone || !role || !regionCode || !municipalityCode) {
        alert("Please fill in all required fields.");
        return;
    }
    if (!/^\d{11}$/.test(phone)) {
        alert("Phone number must be exactly 11 digits (numbers only).");
        return;
    }
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
        alert("Email must be a valid @gmail.com address.");
        return;
    }
    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }


    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Creating...";
    }


    try {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                username: username,
                email_address: email,
                phone_number: phone,
                role: role,
                password: password,
                region: regionName,
                province: provinceName,
                municipality: municipalityName
            })
        });


        let data = {};
        try { data = await response.json(); } catch { data = {}; }
        if (response.status === 401) { handleUnauthorized(); return; }
        if (!response.ok) throw new Error(getErrorMessage(data, "Failed to create account."));


        form.reset();
        resetLocationDropdowns();


        document.getElementById("view-add-account")?.classList.remove("active-view");
        document.getElementById("view-users")?.classList.add("active-view");


        await loadUsers();
        await loadAuditLogs();
        alert("Account created successfully!");
    } catch (error) {
        alert(error.message || "Unable to create account.");
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Create Account";
        }
    }
}


/* ============================================================
   AUDIT LOGS & FILTERING (Date & Action)
============================================================ */
async function loadAuditLogs() {
    const auditLogRows = document.getElementById("auditLogRows");
    if (!auditLogRows) return;


    auditLogRows.innerHTML = `<tr><td colspan="5" style="text-align:center;">Loading audit logs...</td></tr>`;


    try {
        const response = await fetch(`${API_BASE_URL}/api/audit-logs`, {
            method: "GET",
            headers: getAuthHeaders()
        });
        let data = {};
        try { data = await response.json(); } catch { data = {}; }


        if (response.status === 401) { handleUnauthorized(); return; }
        if (response.status === 403) {
            auditLogRows.innerHTML = `<tr><td colspan="5" class="api-error">${escapeHTML(getErrorMessage(data, "You do not have permission to view audit logs."))}</td></tr>`;
            return;
        }
        if (!response.ok) throw new Error(getErrorMessage(data, "Failed to load audit logs."));


        let logs = [];
        if (Array.isArray(data)) logs = data;
        else if (Array.isArray(data.logs)) logs = data.logs;
        else if (Array.isArray(data.data)) logs = data.data;
        else throw new Error("Unexpected audit log response format.");


        cachedAuditLogs = logs;
        populateAuditActionDropdown(cachedAuditLogs);
        renderFilteredAuditLogs();


    } catch (error) {
        auditLogRows.innerHTML = `<tr><td colspan="5" class="api-error">Failed to load audit logs.<br><br>${escapeHTML(error.message)}</td></tr>`;
    }
}


function populateAuditActionDropdown(logs) {
    const actionSelect = document.getElementById("filterAuditAction");
    if (!actionSelect) return;


    const currentVal = actionSelect.value;
    const actions = [...new Set(logs.map(log => log.action).filter(Boolean))].sort();


    actionSelect.innerHTML = `<option value="">All Actions</option>`;
    actions.forEach(action => {
        const opt = document.createElement("option");
        opt.value = action;
        opt.textContent = action;
        actionSelect.appendChild(opt);
    });
    actionSelect.value = currentVal;
}


function renderFilteredAuditLogs() {
    const auditLogRows = document.getElementById("auditLogRows");
    if (!auditLogRows) return;


    const searchInput = document.getElementById("searchAudit")?.value.trim().toLowerCase() || "";
    const actionFilter = document.getElementById("filterAuditAction")?.value || "";
    const dateFilter = document.getElementById("filterAuditDate")?.value || "";


    const filteredLogs = cachedAuditLogs.filter(log => {
        // Search text check across log details
        const logIdStr = String(log.log_id ?? log.id ?? "").toLowerCase();
        let userName = log.user_name || "";
        if (!userName && log.user) {
            userName = `${log.user.first_name || ""} ${log.user.last_name || ""}`.trim();
        }
        const actionStr = String(log.action ?? "").toLowerCase();
        const createdAtStr = String(log.created_at ?? log.timestamp ?? "");


        const matchesSearch = !searchInput ||
            logIdStr.includes(searchInput) ||
            userName.toLowerCase().includes(searchInput) ||
            actionStr.includes(searchInput) ||
            createdAtStr.toLowerCase().includes(searchInput);


        // Action filter check
        const matchesAction = !actionFilter || log.action === actionFilter;


        // Date filter check (compare YYYY-MM-DD format)
        let matchesDate = true;
        if (dateFilter) {
            const logDateVal = log.created_at ?? log.timestamp;
            if (logDateVal) {
                const logDateOnly = new Date(logDateVal).toISOString().split('T')[0];
                matchesDate = (logDateOnly === dateFilter);
            } else {
                matchesDate = false;
            }
        }


        return matchesSearch && matchesAction && matchesDate;
    });


    if (filteredLogs.length === 0) {
        auditLogRows.innerHTML = `<tr><td colspan="5" style="text-align:center;">No matching audit logs found.</td></tr>`;
        renderPagination(0, auditPerPage, currentAuditPage, () => {}).updateUI("auditPaginationInfo", "auditPrevPageBtn", "auditNextPageBtn", "auditPageNumberBtns");
        return;
    }


    const pagination = renderPagination(filteredLogs.length, auditPerPage, currentAuditPage, (newPage) => {
        currentAuditPage = newPage;
        renderFilteredAuditLogs();
    });


    auditLogRows.innerHTML = "";
    pagination.paginatedSlice(filteredLogs).forEach(log => {
        const row = document.createElement("tr");
        const logId = log.log_id ?? log.id ?? "—";
        let userName = log.user_name;
        if (!userName && log.user) {
            userName = `${log.user.first_name || ""} ${log.user.last_name || ""}`.trim() || null;
        }
        if (!userName) userName = `User #${log.user_id ?? "—"}`;


        const action = log.action ?? "—";
        const createdAt = formatAuditDate(log.created_at ?? log.timestamp);


        row.innerHTML = `
            <td>${escapeHTML(logId)}</td>
            <td>${escapeHTML(userName)}</td>
            <td><span class="role" style="background: var(--green-light); color: var(--green-dark);">${escapeHTML(action)}</span></td>
            <td>${escapeHTML(createdAt)}</td>
            <td>
                <button type="button" class="action-btn audit-view-btn" data-log-id="${escapeHTML(logId)}">
                    View
                </button>
            </td>
        `;
        auditLogRows.appendChild(row);
    });


    pagination.updateUI("auditPaginationInfo", "auditPrevPageBtn", "auditNextPageBtn", "auditPageNumberBtns");
   

// ✅ Re-bind Next/Prev buttons para sa Audit Logs
const auditPrevBtn = document.getElementById("auditPrevPageBtn");
const auditNextBtn = document.getElementById("auditNextPageBtn");

if (auditPrevBtn) {
    const newPrev = auditPrevBtn.cloneNode(true);
    auditPrevBtn.parentNode.replaceChild(newPrev, auditPrevBtn);
    newPrev.addEventListener("click", () => {
        if (currentAuditPage > 1) {
            currentAuditPage--;
            renderFilteredAuditLogs();
        }
    });
}

if (auditNextBtn) {
    const newNext = auditNextBtn.cloneNode(true);
    auditNextBtn.parentNode.replaceChild(newNext, auditNextBtn);
    newNext.addEventListener("click", () => {
        const searchInput = document.getElementById("searchAudit")?.value.trim().toLowerCase() || "";
        const actionFilter = document.getElementById("filterAuditAction")?.value || "";
        const dateFilter = document.getElementById("filterAuditDate")?.value || "";

        const filteredLogs = cachedAuditLogs.filter(log => {
            const logIdStr = String(log.log_id ?? log.id ?? "").toLowerCase();
            let userName = log.user_name || "";
            if (!userName && log.user) {
                userName = `${log.user.first_name || ""} ${log.user.last_name || ""}`.trim();
            }
            const actionStr = String(log.action ?? "").toLowerCase();
            const createdAtStr = String(log.created_at ?? log.timestamp ?? "");

            const matchesSearch = !searchInput ||
                logIdStr.includes(searchInput) ||
                userName.toLowerCase().includes(searchInput) ||
                actionStr.includes(searchInput) ||
                createdAtStr.toLowerCase().includes(searchInput);

            const matchesAction = !actionFilter || log.action === actionFilter;

            let matchesDate = true;
            if (dateFilter) {
                const logDateVal = log.created_at ?? log.timestamp;
                if (logDateVal) {
                    const logDateOnly = new Date(logDateVal).toISOString().split('T')[0];
                    matchesDate = (logDateOnly === dateFilter);
                } else {
                    matchesDate = false;
                }
            }

            return matchesSearch && matchesAction && matchesDate;
        });

        const totalPages = Math.ceil(filteredLogs.length / auditPerPage) || 1;
        if (currentAuditPage < totalPages) {
            currentAuditPage++;
            renderFilteredAuditLogs();
        }
    });
}

    

    document.querySelectorAll("#auditLogRows .audit-view-btn").forEach(button => {
        button.addEventListener("click", () => viewAuditLog(button.dataset.logId));
    });
}


function formatAuditDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-PH", {
        year: "numeric", month: "short", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
}


async function viewAuditLog(logId) {
    if (!logId) return;


    try {
        const response = await fetch(`${API_BASE_URL}/api/audit-logs/${logId}`, {
            method: "GET",
            headers: getAuthHeaders()
        });
        let data = {};
        try { data = await response.json(); } catch { data = {}; }


        if (response.status === 401) { handleUnauthorized(); return; }
        if (!response.ok) throw new Error(getErrorMessage(data, "Failed to load audit log."));


        const oldValues = data.old_values ? JSON.stringify(data.old_values, null, 2) : "None";
        const newValues = data.new_values ? JSON.stringify(data.new_values, null, 2) : "None";


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


        document.getElementById("auditDetailModal")?.classList.add("show");
    } catch (error) {
        alert(error.message || "Unable to load audit log.");
    }
}


/* ============================================================
   SIDEBAR & SEARCH INITIALIZATION
============================================================ */
function initHoverSidebar() {
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const sidebar = document.getElementById("sidebar");
    if (!hamburgerBtn || !sidebar) return;


    let hoverTimer = null;
    hamburgerBtn.addEventListener("mouseenter", () => {
        if (hoverTimer) clearTimeout(hoverTimer);
        sidebar.classList.add("open");
    });
    sidebar.addEventListener("mouseenter", () => {
        if (hoverTimer) clearTimeout(hoverTimer);
    });
    sidebar.addEventListener("mouseleave", () => {
        hoverTimer = setTimeout(() => sidebar.classList.remove("open"), 200);
    });
    document.addEventListener("click", (event) => {
        if (!sidebar.contains(event.target) && !hamburgerBtn.contains(event.target)) {
            sidebar.classList.remove("open");
        }
    });
}

/* ============================================================
   PROFILE & AVATAR PERSISTENCE (System Admin)
============================================================ */

function initProfileModal() {
    const openProfileBtn = document.getElementById("openProfileBtn");
    const profileModal = document.getElementById("profileModal");
    const closeProfileModalBtn = document.getElementById("closeProfileModalBtn");
    const profileForm = document.getElementById("profileForm");

    const profileUsername = document.getElementById("profileUsername");
    const profileFirstName = document.getElementById("profileFirstName");
    const profileLastName = document.getElementById("profileLastName");
    const profileBirthdate = document.getElementById("profileBirthdate");
    const avatarOptions = document.querySelectorAll(".avatar-option");

    const customAlertModal = document.getElementById("customAlertModal");
    const customAlertText = document.getElementById("customAlertText");
    const closeCustomAlertBtn = document.getElementById("closeCustomAlertBtn");

    if (!openProfileBtn || !profileModal) return;

    function showCustomAlert(message) {
        if (customAlertText) customAlertText.textContent = message;
        if (customAlertModal) customAlertModal.classList.add("show");
    }

    closeCustomAlertBtn?.addEventListener("click", () => {
        customAlertModal?.classList.remove("show");
    });

    let currentSelectedSrc = localStorage.getItem("user_avatar_src") || "../images/1.png";

    function loadSavedProfile() {
        const savedName = localStorage.getItem("user_display_name");
        if (savedName) {
            const displayNameEl = document.getElementById("loggedInUserName");
            if (displayNameEl) displayNameEl.textContent = savedName;
        }

        const savedAvatar = localStorage.getItem("user_avatar_src");
        if (savedAvatar) {
            currentSelectedSrc = savedAvatar;
            const avatarBox = document.querySelector(".user-info .avatar");
            if (avatarBox) {
                avatarBox.innerHTML = '<img src="' + savedAvatar + '" alt="Avatar">';
                avatarBox.style.background = "transparent";
            }
        }
    }

    loadSavedProfile();

    // Open profile modal
    openProfileBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        const currentName = document.getElementById("loggedInUserName")?.textContent || "System Admin";
        const nameParts = currentName.trim().split(" ");

        if (profileFirstName) profileFirstName.value = nameParts[0] || "";
        if (profileLastName) profileLastName.value = nameParts.slice(1).join(" ") || "";

        if (profileUsername) {
            profileUsername.value = localStorage.getItem("username") || localStorage.getItem("user_id") || "sysadmin";
        }
        if (profileBirthdate) {
            profileBirthdate.value = localStorage.getItem("user_birthdate") || "1990-01-15";
        }

        avatarOptions.forEach(opt => {
            opt.classList.toggle("selected", opt.dataset.avatarImg === currentSelectedSrc);
        });

        profileModal.classList.add("show");
    });

    // Avatar selection
    avatarOptions.forEach(opt => {
        opt.addEventListener("click", () => {
            avatarOptions.forEach(el => el.classList.remove("selected"));
            opt.classList.add("selected");
            currentSelectedSrc = opt.dataset.avatarImg;
        });
    });

    // Close modal
    closeProfileModalBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        profileModal.classList.remove("show");
    });

    // Close on overlay click
    profileModal.addEventListener("click", (e) => {
        if (e.target === profileModal) profileModal.classList.remove("show");
    });

    // Save profile
    profileForm?.addEventListener("submit", (e) => {
        e.preventDefault();

        const fName = profileFirstName.value.trim();
        const lName = profileLastName.value.trim();
        const bDate = profileBirthdate.value;

        if (!fName || !lName || !bDate) {
            showCustomAlert("Pakisagutan ang lahat ng kinakailangang fields.");
            return;
        }

        localStorage.setItem("user_display_name", fName + " " + lName);
        localStorage.setItem("user_birthdate", bDate);
        localStorage.setItem("user_avatar_src", currentSelectedSrc);

        loadSavedProfile();

        profileModal.classList.remove("show");
        showCustomAlert("Profile updated and saved successfully!");
    });
}

document.addEventListener("DOMContentLoaded", () => {
    if (!initializeLoggedInUser()) return;
    if (!checkAdminRole()) return;


    if (typeof initViewSwitching === "function") initViewSwitching();
    if (typeof initHoverSidebar === "function") initHoverSidebar();


    loadUsers();
    loadAuditLogs();
    loadArchivedUsers();
    initializeLocationDropdowns();
    initProfileModal(); 

    /* ARCHIVE DETAILS — Back to Archived Users */
const backBtn2 = document.getElementById("backToArchivedBtn2");

function goBackToArchived() {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active-view"));
    const archivedView = document.getElementById("view-archived");
    if (archivedView) archivedView.classList.add("active-view");

    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    document.querySelector('.nav-item[data-view="archived"]')?.classList.add("active");
}

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

    // Search and Filter Listeners
    document.getElementById("searchUsers")?.addEventListener("input", (e) => {
        const search = e.target.value.trim().toLowerCase();
        document.querySelectorAll("#userRows tr").forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(search) ? "" : "none";
        });
    });

    // ✅ IDAGDAG ITO — Archived Users search
document.getElementById("searchArchived")?.addEventListener("input", (e) => {
    const search = e.target.value.trim().toLowerCase();
    let visibleCount = 0;

    document.querySelectorAll("#archivedUserRows tr").forEach(row => {
        // Skip placeholder rows
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

    if (visibleCount === 0 && search) {
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

    document.getElementById("searchAudit")?.addEventListener("input", () => {
        currentAuditPage = 1;
        renderFilteredAuditLogs();
    });


    document.getElementById("filterAuditAction")?.addEventListener("change", () => {
        currentAuditPage = 1;
        renderFilteredAuditLogs();
    });


    document.getElementById("filterAuditDate")?.addEventListener("input", () => {
        currentAuditPage = 1;
        renderFilteredAuditLogs();
    });


    document.getElementById("resetAuditFiltersBtn")?.addEventListener("click", () => {
        const searchInput = document.getElementById("searchAudit");
        const actionSelect = document.getElementById("filterAuditAction");
        const dateInput = document.getElementById("filterAuditDate");
        if (searchInput) searchInput.value = "";
        if (actionSelect) actionSelect.value = "";
        if (dateInput) dateInput.value = "";
        currentAuditPage = 1;
        renderFilteredAuditLogs();
    });


    // Modals Close handlers
    const closeAuditBtn = document.getElementById("closeAuditModalBtn");
    const closeAuditX = document.getElementById("closeAuditModalX");
    const auditModal = document.getElementById("auditDetailModal");
    [closeAuditBtn, closeAuditX].forEach(btn => {
        btn?.addEventListener("click", () => auditModal?.classList.remove("show"));
    });


    // Add Account views toggle
    document.getElementById("addAccountBtn")?.addEventListener("click", () => {
        document.getElementById("view-users")?.classList.remove("active-view");
        document.getElementById("view-add-account")?.classList.add("active-view");
    });


    document.getElementById("cancelAddAccount")?.addEventListener("click", () => {
        document.getElementById("addAccountForm")?.reset();
        resetLocationDropdowns();
        document.getElementById("view-add-account")?.classList.remove("active-view");
        document.getElementById("view-users")?.classList.add("active-view");
    });


    document.getElementById("addAccountForm")?.addEventListener("submit", createAccount);


    // Logout
    document.getElementById("signOutButton")?.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("confirmLogoutModal")?.classList.add("show");
    });
    document.getElementById("cancelLogoutBtn")?.addEventListener("click", () => {
        document.getElementById("confirmLogoutModal")?.classList.remove("show");
    });
    document.getElementById("finalLogoutBtn")?.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "../index.html";
    });
});

