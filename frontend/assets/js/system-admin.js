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
            <td colspan="5" style="text-align:center;">
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
                    <td colspan="5" class="api-error">
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

            throw new Error(
                "Unexpected response format."
            );
        }

        if (users.length === 0) {

            userRows.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center;">
                        No users found.
                    </td>
                </tr>
            `;

            return;
        }

        userRows.innerHTML = "";

        users.forEach(user => {

            const row =
                document.createElement("tr");

            const fullName =
                `${user.first_name || ""} ${user.last_name || ""}`
                    .trim() || "—";

            const username =
                user.username || "—";

            const role =
                user.role || "—";

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
                    <span
                        class="status-pill ${
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

                </td>
            `;

            userRows.appendChild(row);
        });

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

    }
    catch (error) {

        console.error(
            "Load users error:",
            error
        );

        userRows.innerHTML = `
            <tr>
                <td colspan="5" class="api-error">

                    Failed to load users.

                    <br><br>

                    ${escapeHTML(error.message)}

                </td>
            </tr>
        `;
    }
}


/* ============================================================
   ACTIVATE / DEACTIVATE USER
   PATCH /api/users/{user_id}/status
============================================================ */

async function toggleUserStatus(button) {

    const userId =
        button.dataset.userId;

    const currentStatus =
        button.dataset.active === "true";

    if (!userId) {

        alert("User ID is missing.");

        return;
    }

    const action =
        currentStatus
            ? "deactivate"
            : "reactivate";

    const confirmation =
        confirm(
            currentStatus
                ? "Are you sure you want to deactivate this user?"
                : "Are you sure you want to reactivate this user?"
        );

    if (!confirmation) {
        return;
    }

    button.disabled = true;
    button.textContent = "Updating...";

    try {

        console.log(
            `Attempting to ${action} user:`,
            userId
        );

        const response =
            await fetch(
                `${API_BASE_URL}/api/users/${userId}/status`,
                {
                    method: "PATCH",

                    headers:
                        getAuthHeaders(),

                    body:
                        JSON.stringify({
                            is_active:
                                !currentStatus
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
            "PATCH user status:",
            {
                userId,
                sent: {
                    is_active:
                        !currentStatus
                },
                status:
                    response.status,
                response:
                    data
            }
        );

        if (response.status === 401) {
            handleUnauthorized();
            return;
        }

        if (response.status === 403) {

            throw new Error(
                getErrorMessage(
                    data,
                    "You do not have permission to change user status."
                )
            );
        }

        if (response.status === 404) {

            throw new Error(
                getErrorMessage(
                    data,
                    "User not found."
                )
            );
        }

        if (response.status === 422) {

            throw new Error(
                getErrorMessage(
                    data,
                    "Invalid user status data."
                )
            );
        }

        if (!response.ok) {

            throw new Error(
                getErrorMessage(
                    data,
                    "Failed to update user status."
                )
            );
        }

        console.log(
            `User ${userId} successfully ${action}d.`,
            data
        );

        await loadUsers();

        await loadAuditLogs();

    }
    catch (error) {

        console.error(
            "Toggle user status error:",
            error
        );

        alert(
            error.message ||
            "Unable to update user status."
        );

        button.disabled = false;

        button.textContent =
            currentStatus
                ? "Deactivate"
                : "Reactivate";
    }
}


/* ============================================================
   CREATE ACCOUNT
   POST /api/users
============================================================ */

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

    // Validation
    if (
        !firstName ||
        !lastName ||
        !username ||
        !email ||
        !password ||
        !confirmPassword ||
        !phone ||
        !role
    ) {

        alert(
            "Please fill in all required fields."
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

        // ✅ FIXED: Correct API endpoint
        const response =
            await fetch(
                `${API_BASE_URL}/api/users/users`,
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
                                password

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

        alert("✅ Account created successfully!");

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
                colspan="7"
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
                        colspan="7"
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

        if (logs.length === 0) {

            auditLogRows.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        style="text-align:center;"
                    >
                        No audit logs found.
                    </td>
                </tr>
            `;

            return;
        }

        auditLogRows.innerHTML = "";

        logs.forEach(log => {

            const row =
                document.createElement("tr");

            const logId =
                log.log_id ??
                log.id ??
                "—";

            const userId =
                log.user_id ??
                "—";

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
                    ${escapeHTML(userId)}
                </td>

                <td>
                    <span class="audit-action">
                        ${escapeHTML(action)}
                    </span>
                </td>

                <td>
                    ${escapeHTML(resourceType)}
                </td>

                <td>
                    ${escapeHTML(resourceId)}
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
                    colspan="7"
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

        const details = `

Audit Log #${data.log_id ?? "—"}

User ID:
${data.user_id ?? "—"}

Action:
${data.action ?? "—"}

Resource Type:
${data.resource_type ?? "—"}

Resource ID:
${data.resource_id ?? "—"}

Created At:
${formatAuditDate(data.created_at)}

Old Values:
${oldValues}

New Values:
${newValues}

IP Address:
${data.ip_address ?? "—"}

User Agent:
${data.user_agent ?? "—"}

        `;

        alert(details);

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


        /* USERS */

        loadUsers();


        /* AUDIT LOGS */

        loadAuditLogs();


        /* SEARCH */

        initializeUserSearch();

        initializeAuditSearch();


        /* ADD ACCOUNT */

        const addButton =
            document.getElementById(
                "addAccountBtn"
            );

        if (addButton) {

            addButton.addEventListener(
                "click",
                () => {

                    // Show the Add Account form directly
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

                        // Update nav highlight
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

                        // Fallback: open modal or alert
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

                        // Update nav highlight
                        document
                            .querySelectorAll(
                                ".nav-item"
                            )
                            .forEach(item => {
                                item.classList.remove(
                                    "active"
                                );
                            });

                        // Highlight Manage Users nav item
                        document
                            .querySelector(
                                '.nav-item[data-view="users"]'
                            )
                            ?.classList.add(
                                "active"
                            );

                    } else {

                        // Fallback: reload users view
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

        if (signOut) {

            signOut.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    localStorage.removeItem(
                        "access_token"
                    );

                    localStorage.removeItem(
                        "token_type"
                    );

                    localStorage.removeItem(
                        "user_id"
                    );

                    localStorage.removeItem(
                        "username"
                    );

                    localStorage.removeItem(
                        "role"
                    );

                    window.location.href =
                        "../index.html";
                }
            );
        }

    }
);