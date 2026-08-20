/* ============================================================
   eSAKA — AEW DASHBOARD
   Complete Frontend JavaScript
   Farmers API Integration + Dashboard Functions
============================================================ */


/* ============================================================
   API CONFIGURATION
============================================================ */

const API_BASE_URL = "http://127.0.0.1:8000";

const FARMERS_ENDPOINT =
    `${API_BASE_URL}/api/farmers/farmers/`;


/* ============================================================
   AUTH
============================================================ */

function getAuthToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        null
    );
}


function getAuthHeaders() {

    const token = getAuthToken();

    const headers = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}


/* ============================================================
   STATE
============================================================ */

let FARMERS_DATA = [];

let currentFarmersPage = 1;

const farmersPerPage = 10;

let currentActiveFarmer = null;

let isEditMode = false;

let mapInstance = null;


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

    console.log("=================================");
    console.log("eSaka AEW Dashboard loaded.");
    console.log("=================================");

    initSidebar();

    initViewNavigation();

    initMap();

    initFarmerSubviews();

    initPlantingIntent();

    initOfftakeRequest();

    initFairPrice();

    initSignout();

    setupUserProfile();

    await fetchFarmers();
});


/* ============================================================
   USER PROFILE
============================================================ */

function setupUserProfile() {

    const storedName =
        localStorage.getItem("full_name") ||
        localStorage.getItem("name") ||
        localStorage.getItem("username");

    const storedRole =
        localStorage.getItem("role");

    const nameElement =
        document.getElementById("userDisplayName");

    const roleElement =
        document.getElementById("userDisplayRole");


    if (nameElement && storedName) {

        nameElement.textContent =
            storedName;
    }


    if (roleElement && storedRole) {

        roleElement.textContent =
            storedRole;
    }
}


/* ============================================================
   GENERIC API REQUEST HELPER
============================================================ */

async function apiRequest(
    url,
    options = {}
) {

    const response =
        await fetch(
            url,
            {
                ...options,
                headers: {
                    ...getAuthHeaders(),
                    ...(options.headers || {})
                }
            }
        );


    let data = null;

    const contentType =
        response.headers.get("content-type") || "";


    if (
        contentType.includes(
            "application/json"
        )
    ) {

        try {

            data =
                await response.json();

        } catch (error) {

            data = null;
        }

    } else {

        try {

            data =
                await response.text();

        } catch (error) {

            data = null;
        }
    }


    if (!response.ok) {

        let message =
            `HTTP ${response.status}`;

        if (
            data &&
            typeof data === "object"
        ) {

            if (data.detail) {

                if (
                    typeof data.detail ===
                    "string"
                ) {

                    message =
                        data.detail;

                } else {

                    message =
                        JSON.stringify(
                            data.detail
                        );
                }
            }
        }

        else if (
            typeof data === "string" &&
            data.trim()
        ) {

            message = data;
        }


        const error =
            new Error(message);

        error.status =
            response.status;

        error.data =
            data;

        throw error;
    }


    return data;
}


/* ============================================================
   AUTH ERROR HANDLER
============================================================ */

function handleAuthError(error) {

    if (
        error &&
        (
            error.status === 401 ||
            error.status === 403
        )
    ) {

        console.warn(
            "Authentication/authorization error:",
            error
        );

        /*
         * Do not immediately redirect here.
         * The backend may return 403 for role restrictions.
         * We simply notify the user.
         */

        return true;
    }

    return false;
}


/* ============================================================
   FETCH FARMERS
============================================================ */

async function fetchFarmers() {

    const tbody =
        document.getElementById(
            "farmersTableBody"
        );


    if (tbody) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6"
                    style="padding:30px; text-align:center;">
                    Loading farmers...
                </td>
            </tr>
        `;
    }


    try {

        console.log(
            "Fetching farmers:",
            FARMERS_ENDPOINT
        );


        const data =
            await apiRequest(
                FARMERS_ENDPOINT,
                {
                    method: "GET"
                }
            );


        console.log(
            "Farmers API response:",
            data
        );


        if (!Array.isArray(data)) {

            throw new Error(
                "Invalid farmers response. Expected an array."
            );
        }


        FARMERS_DATA =
            data.map(
                farmer => normalizeFarmer(farmer)
            );


        currentFarmersPage = 1;


        renderFarmersTable();


        console.log(
            `Successfully loaded ${FARMERS_DATA.length} farmer(s).`
        );


        return FARMERS_DATA;


    } catch (error) {

        console.error(
            "Unable to load farmers:",
            error
        );


        FARMERS_DATA = [];


        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="6"
                        style="
                            padding:30px;
                            text-align:center;
                            color:#C0392B;
                        ">
                        Failed to load farmers.
                        <br>
                        <small>
                            ${escapeHtml(
                                error.message ||
                                "Please check the FastAPI server."
                            )}
                        </small>
                    </td>
                </tr>
            `;
        }


        updatePagination();


        handleAuthError(error);


        return [];
    }
}


/* ============================================================
   NORMALIZE FARMER DATA
============================================================ */

function normalizeFarmer(farmer) {

    return {

        farmer_id:
            farmer.farmer_id ?? null,

        rsbsa_id:
            farmer.rsbsa_id ?? "",

        first_name:
            farmer.first_name ?? "",

        middle_name:
            farmer.middle_name ?? "",

        last_name:
            farmer.last_name ?? "",

        suffix:
            farmer.suffix ?? "",

        address:
            farmer.address ?? "",

        sex:
            farmer.sex ?? "",

        birthdate:
            farmer.birthdate ?? "",

        email_address:
            farmer.email_address ?? "",

        phone_number:
            farmer.phone_number ?? "",

        region:
            farmer.region ?? "",

        municipality:
            farmer.municipality ?? "",

        barangay:
            farmer.barangay ?? "",

        status:
            farmer.status ?? "Active"
    };
}


/* ============================================================
   SIDEBAR
============================================================ */

function initSidebar() {

    const hamburgerBtn =
        document.getElementById(
            "hamburgerBtn"
        );

    const sidebar =
        document.getElementById(
            "sidebar"
        );


    if (
        !hamburgerBtn ||
        !sidebar
    ) {
        return;
    }


    hamburgerBtn.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "open"
            );


            setTimeout(
                () => {

                    if (mapInstance) {

                        mapInstance.invalidateSize();
                    }

                },
                300
            );
        }
    );
}


/* ============================================================
   VIEW NAVIGATION
============================================================ */

function initViewNavigation() {

    const navButtons =
        document.querySelectorAll(
            ".nav-item[data-view]"
        );

    const views =
        document.querySelectorAll(
            ".view"
        );


    navButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const targetViewKey =
                        button.dataset.view;


                    views.forEach(
                        view => {

                            view.classList.remove(
                                "active-view"
                            );
                        }
                    );


                    const targetView =
                        document.getElementById(
                            "view-" +
                            targetViewKey
                        );


                    if (targetView) {

                        targetView.classList.add(
                            "active-view"
                        );
                    }


                    navButtons.forEach(
                        navButton => {

                            navButton.classList.toggle(
                                "active",
                                navButton === button
                            );
                        }
                    );


                    if (
                        targetViewKey === "map" &&
                        mapInstance
                    ) {

                        setTimeout(
                            () => {

                                mapInstance.invalidateSize();

                            },
                            100
                        );
                    }
                }
            );
        }
    );
}


/* ============================================================
   SIGN OUT
============================================================ */

function initSignout() {

    const signoutBtn =
        document.getElementById(
            "signoutBtn"
        );


    if (!signoutBtn) {
        return;
    }


    signoutBtn.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "access_token"
            );

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "full_name"
            );

            localStorage.removeItem(
                "name"
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


/* ============================================================
   LEAFLET MAP
============================================================ */

function initMap() {

    const mapEl =
        document.getElementById(
            "map"
        );


    if (!mapEl) {
        return;
    }


    if (
        typeof L === "undefined"
    ) {

        console.warn(
            "Leaflet is not loaded."
        );

        return;
    }


    const pampangaBounds =
        L.latLngBounds(
            [14.85, 120.35],
            [15.35, 120.95]
        );


    mapInstance =
        L.map(
            "map",
            {
                maxBounds:
                    pampangaBounds,

                maxBoundsViscosity:
                    1.0,

                minZoom:
                    10
            }
        )
        .setView(
            [15.0794, 120.6200],
            10
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                "&copy; OpenStreetMap contributors",

            maxZoom:
                18
        }
    ).addTo(
        mapInstance
    );
}


/* ============================================================
   FARMERS TABLE
============================================================ */

function renderFarmersTable() {

    const tbody =
        document.getElementById(
            "farmersTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    const start =
        (
            currentFarmersPage - 1
        ) *
        farmersPerPage;


    const end =
        start +
        farmersPerPage;


    const paginatedItems =
        FARMERS_DATA.slice(
            start,
            end
        );


    if (
        paginatedItems.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6"
                    style="
                        padding:30px;
                        text-align:center;
                        color:#777;
                    ">
                    No farmers found.
                </td>
            </tr>
        `;


        updatePagination();

        return;
    }


    paginatedItems.forEach(
        farmer => {

            const tr =
                createFarmerTableRow(
                    farmer
                );


            tbody.appendChild(
                tr
            );
        }
    );


    updatePagination();
}


/* ============================================================
   CREATE FARMER TABLE ROW
============================================================ */

function createFarmerTableRow(farmer) {

    const tr =
        document.createElement(
            "tr"
        );


    tr.className =
        "clickable-row";


    const fullName =
        getFarmerFullName(
            farmer
        );


    tr.innerHTML = `

        <td>
            <span class="pill">
                ${escapeHtml(
                    fullName
                )}
            </span>
        </td>

        <td>
            <span class="pill">
                ${escapeHtml(
                    farmer.rsbsa_id || "-"
                )}
            </span>
        </td>

        <td>
            <span class="pill">
                ${escapeHtml(
                    farmer.region || "-"
                )}
            </span>
        </td>

        <td>
            <span class="pill">
                ${escapeHtml(
                    farmer.municipality || "-"
                )}
            </span>
        </td>

        <td>
            <span class="pill">
                ${escapeHtml(
                    farmer.barangay || "-"
                )}
            </span>
        </td>

        <td>
            <span class="status-pill active">
                ${escapeHtml(
                    farmer.status || "Active"
                )}
            </span>
        </td>
    `;


    tr.addEventListener(
        "click",
        () => {

            openManageFarmer(
                farmer
            );
        }
    );


    return tr;
}


/* ============================================================
   FARMER FULL NAME
============================================================ */

function getFarmerFullName(farmer) {

    return [
        farmer.first_name,

        farmer.middle_name
            ? farmer.middle_name.charAt(0) + "."
            : "",

        farmer.last_name,

        farmer.suffix
    ]
    .filter(Boolean)
    .join(" ");
}


/* ============================================================
   PAGINATION
============================================================ */

function updatePagination() {

    const paginationInfo =
        document.getElementById(
            "paginationInfo"
        );

    const pageNumberBtns =
        document.getElementById(
            "pageNumberBtns"
        );

    const prevPageBtn =
        document.getElementById(
            "prevPageBtn"
        );

    const nextPageBtn =
        document.getElementById(
            "nextPageBtn"
        );


    const total =
        FARMERS_DATA.length;


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                total /
                farmersPerPage
            )
        );


    if (
        currentFarmersPage >
        totalPages
    ) {

        currentFarmersPage =
            totalPages;
    }


    const start =
        total === 0
            ? 0
            : (
                (
                    currentFarmersPage - 1
                ) *
                farmersPerPage
            ) + 1;


    const end =
        Math.min(
            currentFarmersPage *
            farmersPerPage,
            total
        );


    if (paginationInfo) {

        paginationInfo.textContent =
            `Showing ${start}-${end} of ${total} farmers`;
    }


    if (prevPageBtn) {

        prevPageBtn.disabled =
            currentFarmersPage <= 1;
    }


    if (nextPageBtn) {

        nextPageBtn.disabled =
            currentFarmersPage >=
            totalPages;
    }


    if (pageNumberBtns) {

        pageNumberBtns.innerHTML = "";


        for (
            let i = 1;
            i <= totalPages;
            i++
        ) {

            const pageBtn =
                document.createElement(
                    "button"
                );


            pageBtn.className =
                `btn-page ${
                    i === currentFarmersPage
                        ? "active"
                        : ""
                }`;


            pageBtn.textContent =
                i;


            pageBtn.type =
                "button";


            pageBtn.addEventListener(
                "click",
                () => {

                    currentFarmersPage =
                        i;

                    renderFarmersTable();
                }
            );


            pageNumberBtns.appendChild(
                pageBtn
            );
        }
    }
}


/* ============================================================
   FARMER SEARCH
============================================================ */

function initFarmerSearch() {

    const searchInput =
        document.getElementById(
            "searchFarmersInput"
        );


    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
        "input",
        () => {

            const keyword =
                searchInput.value
                    .toLowerCase()
                    .trim();


            if (!keyword) {

                currentFarmersPage =
                    1;

                renderFarmersTable();

                return;
            }


            const filtered =
                FARMERS_DATA.filter(
                    farmer => {

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

                        ]
                        .join(" ")
                        .toLowerCase();


                        return searchableText
                            .includes(
                                keyword
                            );
                    }
                );


            currentFarmersPage =
                1;


            renderFilteredFarmers(
                filtered
            );
        }
    );
}


/* ============================================================
   RENDER SEARCH RESULTS
============================================================ */

function renderFilteredFarmers(data) {

    const tbody =
        document.getElementById(
            "farmersTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    if (data.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6"
                    style="
                        padding:30px;
                        text-align:center;
                        color:#777;
                    ">
                    No farmers found.
                </td>
            </tr>
        `;


        updateSearchPaginationText(
            0
        );

        return;
    }


    data.forEach(
        farmer => {

            const tr =
                createFarmerTableRow(
                    farmer
                );


            tbody.appendChild(
                tr
            );
        }
    );


    updateSearchPaginationText(
        data.length
    );
}


/* ============================================================
   SEARCH PAGINATION TEXT
============================================================ */

function updateSearchPaginationText(
    resultCount
) {

    const paginationInfo =
        document.getElementById(
            "paginationInfo"
        );


    if (!paginationInfo) {
        return;
    }


    paginationInfo.textContent =
        `Showing ${resultCount} of ${FARMERS_DATA.length} farmers`;
}


/* ============================================================
   FARMER SUBVIEWS
============================================================ */

function initFarmerSubviews() {

    const listSubview =
        document.getElementById(
            "farmersListSubview"
        );

    const regSubview =
        document.getElementById(
            "registerFarmerSubview"
        );

    const manSubview =
        document.getElementById(
            "manageFarmerSubview"
        );

    const addBtn =
        document.getElementById(
            "addFarmerBtn"
        );

    const cancelRegBtn =
        document.getElementById(
            "cancelRegisterFarmerBtn"
        );

    const backManBtn =
        document.getElementById(
            "backFromManageFarmerBtn"
        );

    const regForm =
        document.getElementById(
            "registerFarmerForm"
        );

    const toggleEditBtn =
        document.getElementById(
            "toggleEditFarmerBtn"
        );

    const deleteBtn =
        document.getElementById(
            "deleteFarmerBtn"
        );

    const confirmDeleteBtn =
        document.getElementById(
            "confirmDeleteFarmerBtn"
        );


    /* --------------------------------------------------------
       SEARCH
    -------------------------------------------------------- */

    initFarmerSearch();


    /* --------------------------------------------------------
       ADD FARMER
    -------------------------------------------------------- */

    addBtn?.addEventListener(
        "click",
        () => {

            if (regForm) {

                regForm.reset();
            }


            setValue(
                "regFarmerId",
                ""
            );


            listSubview?.classList.add(
                "hidden-element"
            );


            regSubview?.classList.remove(
                "hidden-element"
            );
        }
    );


    /* --------------------------------------------------------
       CANCEL REGISTER
    -------------------------------------------------------- */

    cancelRegBtn?.addEventListener(
        "click",
        () => {

            regSubview?.classList.add(
                "hidden-element"
            );


            listSubview?.classList.remove(
                "hidden-element"
            );
        }
    );


    /* --------------------------------------------------------
       BACK FROM MANAGE
    -------------------------------------------------------- */

    backManBtn?.addEventListener(
        "click",
        () => {

            manSubview?.classList.add(
                "hidden-element"
            );


            listSubview?.classList.remove(
                "hidden-element"
            );


            currentActiveFarmer =
                null;


            isEditMode =
                false;
        }
    );


    /* --------------------------------------------------------
       REGISTER FARMER
    -------------------------------------------------------- */

    regForm?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const farmerData = {

                rsbsa_id:
                    getValue(
                        "regFarmerId"
                    ),

                first_name:
                    getValue(
                        "regFirstName"
                    ),

                middle_name:
                    getValue(
                        "regMiddleName"
                    ),

                last_name:
                    getValue(
                        "regLastName"
                    ),

                suffix:
                    getValue(
                        "regSuffix"
                    ),

                address:
                    getValue(
                        "regAddress"
                    ),

                sex:
                    getValue(
                        "regSex"
                    ),

                birthdate:
                    getValue(
                        "regBirthdate"
                    ),

                phone_number:
                    getValue(
                        "regPhone"
                    ),

                email_address:
                    getValue(
                        "regEmail"
                    )
            };


            console.log(
                "Submitting farmer:",
                farmerData
            );


            try {

                const createdFarmer =
                    await apiRequest(
                        FARMERS_ENDPOINT,
                        {
                            method: "POST",

                            body:
                                JSON.stringify(
                                    farmerData
                                )
                        }
                    );


                console.log(
                    "Created farmer:",
                    createdFarmer
                );


                await fetchFarmers();


                document
                    .getElementById(
                        "farmerAddedModal"
                    )
                    ?.classList.add(
                        "show"
                    );


            } catch (error) {

                console.error(
                    "Create farmer error:",
                    error
                );


                handleAuthError(
                    error
                );


                alert(
                    "Failed to add farmer.\n\n" +
                    (
                        error.message ||
                        "Please check the FastAPI server."
                    )
                );
            }
        }
    );


    /* --------------------------------------------------------
       CLOSE FARMER ADDED MODAL
    -------------------------------------------------------- */

    document
        .getElementById(
            "closeFarmerAddedBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "farmerAddedModal"
                    )
                    ?.classList.remove(
                        "show"
                    );


                regSubview?.classList.add(
                    "hidden-element"
                );


                listSubview?.classList.remove(
                    "hidden-element"
                );
            }
        );


    /* --------------------------------------------------------
       EDIT / SAVE FARMER
    -------------------------------------------------------- */

    toggleEditBtn?.addEventListener(
        "click",
        async () => {

            const editableInputs =
                document.querySelectorAll(
                    ".man-editable"
                );


            if (!isEditMode) {

                isEditMode =
                    true;


                editableInputs.forEach(
                    input => {

                        input.readOnly =
                            false;


                        input.classList.add(
                            "input-editable-active"
                        );


                        input.classList.remove(
                            "input-readonly"
                        );
                    }
                );


                toggleEditBtn.textContent =
                    "Save Changes";


                return;
            }


            if (!currentActiveFarmer) {

                alert(
                    "No farmer selected."
                );

                return;
            }


            const updateData = {

                address:
                    getValue(
                        "manAddress"
                    ),

                phone_number:
                    getValue(
                        "manPhone"
                    ),

                email_address:
                    getValue(
                        "manEmail"
                    )
            };


            try {

                const farmerId =
                    currentActiveFarmer.farmer_id;


                const response =
                    await apiRequest(
                        `${FARMERS_ENDPOINT}${farmerId}`,
                        {
                            method: "PUT",

                            body:
                                JSON.stringify(
                                    updateData
                                )
                        }
                    );


                console.log(
                    "Updated farmer:",
                    response
                );


                isEditMode =
                    false;


                editableInputs.forEach(
                    input => {

                        input.readOnly =
                            true;


                        input.classList.remove(
                            "input-editable-active"
                        );


                        input.classList.add(
                            "input-readonly"
                        );
                    }
                );


                toggleEditBtn.textContent =
                    "Edit Contact Info";


                await fetchFarmers();


                const updatedFarmer =
                    FARMERS_DATA.find(
                        farmer =>
                            farmer.farmer_id ===
                            farmerId
                    );


                if (updatedFarmer) {

                    openManageFarmer(
                        updatedFarmer
                    );
                }


                alert(
                    "Farmer updated successfully."
                );


            } catch (error) {

                console.error(
                    "Update farmer error:",
                    error
                );


                handleAuthError(
                    error
                );


                alert(
                    "Failed to update farmer.\n\n" +
                    (
                        error.message ||
                        "Please check the FastAPI server."
                    )
                );
            }
        }
    );


    /* --------------------------------------------------------
       DELETE BUTTON
    -------------------------------------------------------- */

    deleteBtn?.addEventListener(
        "click",
        () => {

            if (!currentActiveFarmer) {

                alert(
                    "No farmer selected."
                );

                return;
            }


            document
                .getElementById(
                    "deleteFarmerModal"
                )
                ?.classList.add(
                    "show"
                );
        }
    );


    /* --------------------------------------------------------
       CONFIRM DELETE
    -------------------------------------------------------- */

    confirmDeleteBtn?.addEventListener(
        "click",
        async () => {

            if (!currentActiveFarmer) {
                return;
            }


            try {

                const farmerId =
                    currentActiveFarmer.farmer_id;


                await apiRequest(
                    `${FARMERS_ENDPOINT}${farmerId}`,
                    {
                        method: "DELETE"
                    }
                );


                document
                    .getElementById(
                        "deleteFarmerModal"
                    )
                    ?.classList.remove(
                        "show"
                    );


                currentActiveFarmer =
                    null;


                await fetchFarmers();


                manSubview?.classList.add(
                    "hidden-element"
                );


                listSubview?.classList.remove(
                    "hidden-element"
                );


                alert(
                    "Farmer deleted successfully."
                );


            } catch (error) {

                console.error(
                    "Delete farmer error:",
                    error
                );


                handleAuthError(
                    error
                );


                alert(
                    "Failed to delete farmer.\n\n" +
                    (
                        error.message ||
                        "Please check the FastAPI server."
                    )
                );
            }
        }
    );


    /* --------------------------------------------------------
       PAGINATION PREVIOUS
    -------------------------------------------------------- */

    document
        .getElementById(
            "prevPageBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                if (
                    currentFarmersPage > 1
                ) {

                    currentFarmersPage--;

                    renderFarmersTable();
                }
            }
        );


    /* --------------------------------------------------------
       PAGINATION NEXT
    -------------------------------------------------------- */

    document
        .getElementById(
            "nextPageBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                const totalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            FARMERS_DATA.length /
                            farmersPerPage
                        )
                    );


                if (
                    currentFarmersPage <
                    totalPages
                ) {

                    currentFarmersPage++;

                    renderFarmersTable();
                }
            }
        );


    /* --------------------------------------------------------
       CLOSE DELETE MODAL
       Supports common close button IDs if present.
    -------------------------------------------------------- */

    const closeDeleteModalIds = [
        "closeDeleteFarmerBtn",
        "cancelDeleteFarmerBtn"
    ];


    closeDeleteModalIds.forEach(
        id => {

            document
                .getElementById(id)
                ?.addEventListener(
                    "click",
                    () => {

                        document
                            .getElementById(
                                "deleteFarmerModal"
                            )
                            ?.classList.remove(
                                "show"
                            );
                    }
                );
        }
    );
}


/* ============================================================
   OPEN MANAGE FARMER
============================================================ */

function openManageFarmer(
    farmer
) {

    if (!farmer) {
        return;
    }


    currentActiveFarmer =
        farmer;


    isEditMode =
        false;


    setValue(
        "manFarmerId",
        farmer.rsbsa_id || ""
    );


    setValue(
        "manAddress",
        farmer.address || ""
    );


    setValue(
        "manFirstName",
        farmer.first_name || ""
    );


    setValue(
        "manMiddleName",
        farmer.middle_name || ""
    );


    setValue(
        "manLastName",
        farmer.last_name || ""
    );


    setValue(
        "manSuffix",
        farmer.suffix || ""
    );


    setValue(
        "manSex",
        farmer.sex || ""
    );


    setValue(
        "manBirthdate",
        farmer.birthdate || ""
    );


    setValue(
        "manPhone",
        farmer.phone_number || ""
    );


    setValue(
        "manEmail",
        farmer.email_address || ""
    );


    document
        .querySelectorAll(
            ".man-editable"
        )
        .forEach(
            input => {

                input.readOnly =
                    true;


                input.classList.remove(
                    "input-editable-active"
                );


                input.classList.add(
                    "input-readonly"
                );
            }
        );


    const editBtn =
        document.getElementById(
            "toggleEditFarmerBtn"
        );


    if (editBtn) {

        editBtn.textContent =
            "Edit Contact Info";
    }


    document
        .getElementById(
            "farmersListSubview"
        )
        ?.classList.add(
            "hidden-element"
        );


    document
        .getElementById(
            "manageFarmerSubview"
        )
        ?.classList.remove(
            "hidden-element"
        );
}


/* ============================================================
   PLANTING INTENT
============================================================ */

function initPlantingIntent() {

    const list =
        document.getElementById(
            "plantingIntentListSubview"
        );

    const formSubview =
        document.getElementById(
            "submitPlantIntentSubview"
        );

    const modal =
        document.getElementById(
            "plantIntentSubmittedModal"
        );


    /* ADD */

    document
        .getElementById(
            "addPlantIntentBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                list?.classList.add(
                    "hidden-element"
                );


                formSubview?.classList.remove(
                    "hidden-element"
                );
            }
        );


    /* CANCEL */

    document
        .getElementById(
            "cancelPlantIntentBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                formSubview?.classList.add(
                    "hidden-element"
                );


                list?.classList.remove(
                    "hidden-element"
                );
            }
        );


    /* SUBMIT */

    document
        .getElementById(
            "submitPlantIntentForm"
        )
        ?.addEventListener(
            "submit",
            event => {

                event.preventDefault();


                modal?.classList.add(
                    "show"
                );
            }
        );


    /* CLOSE */

    document
        .getElementById(
            "closePlantIntentSubmittedBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                modal?.classList.remove(
                    "show"
                );


                formSubview?.classList.add(
                    "hidden-element"
                );


                list?.classList.remove(
                    "hidden-element"
                );
            }
        );
}


/* ============================================================
   OFFTAKE REQUEST
============================================================ */

function initOfftakeRequest() {

    const list =
        document.getElementById(
            "offtakeListSubview"
        );

    const submitSub =
        document.getElementById(
            "submitOfftakeSubview"
        );

    const confirmSub =
        document.getElementById(
            "confirmOfftakeSubview"
        );

    const modal =
        document.getElementById(
            "offtakeSubmittedModal"
        );


    /* CREATE */

    document
        .getElementById(
            "createOfftakeBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                list?.classList.add(
                    "hidden-element"
                );


                submitSub?.classList.remove(
                    "hidden-element"
                );
            }
        );


    /* RETURN */

    document
        .getElementById(
            "returnFromSubmitOfftakeBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                submitSub?.classList.add(
                    "hidden-element"
                );


                list?.classList.remove(
                    "hidden-element"
                );
            }
        );


    /* PROCEED */

    document
        .getElementById(
            "proceedOfftakeBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                submitSub?.classList.add(
                    "hidden-element"
                );


                confirmSub?.classList.remove(
                    "hidden-element"
                );
            }
        );


    /* BACK */

    document
        .getElementById(
            "backToSubmitOfftakeBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                confirmSub?.classList.add(
                    "hidden-element"
                );


                submitSub?.classList.remove(
                    "hidden-element"
                );
            }
        );


    /* SEND */

    document
        .getElementById(
            "sendOfftakeBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                modal?.classList.add(
                    "show"
                );
            }
        );


    /* CLOSE */

    document
        .getElementById(
            "closeOfftakeSubmittedBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                modal?.classList.remove(
                    "show"
                );


                confirmSub?.classList.add(
                    "hidden-element"
                );


                list?.classList.remove(
                    "hidden-element"
                );
            }
        );
}


/* ============================================================
   FAIR PRICE
============================================================ */

function initFairPrice() {

    const select =
        document.getElementById(
            "fairPriceCropSelect"
        );

    const img =
        document.getElementById(
            "cropImageDisplay"
        );


    if (
        !select ||
        !img
    ) {
        return;
    }


    select.addEventListener(
        "change",
        event => {

            const crop =
                event.target.value;


            if (
                crop === "tomato"
            ) {

                img.src =
                    "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80";

            } else {

                img.src =
                    "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80";
            }
        }
    );
}


/* ============================================================
   HELPER — GET INPUT VALUE
============================================================ */

function getValue(id) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return "";
    }


    return (
        element.value ??
        ""
    ).trim();
}


/* ============================================================
   HELPER — SET INPUT VALUE
============================================================ */

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.value =
            value ?? "";
    }
}


/* ============================================================
   HELPER — ESCAPE HTML
============================================================ */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
    .replaceAll(
        "&",
        "&amp;"
    )
    .replaceAll(
        "<",
        "&lt;"
    )
    .replaceAll(
        ">",
        "&gt;"
    )
    .replaceAll(
        '"',
        "&quot;"
    )
    .replaceAll(
        "'",
        "&#039;"
    );
}


/* ============================================================
   OPTIONAL DEBUG HELPERS
============================================================ */

function getCurrentFarmer() {

    return currentActiveFarmer;
}


function getAllFarmers() {

    return FARMERS_DATA;
}


/* ============================================================
   END OF AEW.JS
============================================================ */