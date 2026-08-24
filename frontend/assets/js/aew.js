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


const PLANTING_INTENTS_ENDPOINT =
    `${API_BASE_URL}/api/planting-intents/`;

const RAW_PLANT_REPORTS_ENDPOINT =
    `${API_BASE_URL}/api/raw-plant-reports/from-planting-intent`;
const REPORT_SUBMISSIONS_ENDPOINT =
    `${API_BASE_URL}/api/report-submissions`;




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
let allFarmers = []; 
let allBuyers =[];


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

    await loadAllReports();
    await fetchOfftakeRequests();
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

        allFarmers = data;

populateOfftakeFarmerSelect();
setupOfftakeFarmerDropdown();




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

function populateOfftakeFarmerSelect() {

    const select = document.getElementById("offtakeFarmerSelect");

    if (!select) {
        console.error("offtakeFarmerSelect not found.");
        return;
    }

    select.innerHTML = `
        <option value="">Select Farmer</option>
    `;

    if (!Array.isArray(allFarmers) || allFarmers.length === 0) {
        console.warn("No farmers available.");
        return;
    }

    allFarmers.forEach(farmer => {

        const fullName = [
            farmer.first_name,
            farmer.middle_name,
            farmer.last_name,
            farmer.suffix
        ]
        .filter(Boolean)
        .join(" ");

        const option = document.createElement("option");

        option.value = farmer.farmer_id;
        option.textContent = fullName;

        select.appendChild(option);
    });
}

function setupOfftakeFarmerDropdown() {

    const select = document.getElementById("offtakeFarmerSelect");
    const farmerIdInput = document.getElementById("offtakeFarmerId");

    if (!select || !farmerIdInput) {
        return;
    }

    select.addEventListener("change", function () {

        farmerIdInput.value = this.value || "";

    });
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


    const tr = document.createElement("tr");


    tr.className = "clickable-row";


    const fullName = getFarmerFullName(farmer);


    tr.innerHTML = `
        <td>
            <span class="pill">
                ${escapeHtml(fullName)}
            </span>
        </td>


        <td>
            <span class="pill">
                ${escapeHtml(farmer.rsbsa_id || "-")}
            </span>
        </td>


        <td>
            <span class="pill">
                ${escapeHtml(farmer.municipality || "-")}
            </span>
        </td>


        <td>
            <span class="pill">
                ${escapeHtml(farmer.barangay || "-")}
            </span>
        </td>


        <td>
            <span class="status-pill active">
                ${escapeHtml(farmer.status || "Active")}
            </span>
        </td>
    `;


    tr.addEventListener("click", () => {
        openManageFarmer(farmer);
    });


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

let PLANTING_INTENTS_DATA = [];


/* ============================================================
   INITIALIZE PLANTING INTENT
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


    /* --------------------------------------------------------
       LOAD PLANTING INTENTS
    -------------------------------------------------------- */

    fetchPlantingIntents();


    /* --------------------------------------------------------
       ADD
    -------------------------------------------------------- */

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


    /* --------------------------------------------------------
       CANCEL
    -------------------------------------------------------- */

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

        /* --------------------------------------------------------
   BACK FROM DETAILS
-------------------------------------------------------- */

document
    .getElementById(
        "backFromPlantingIntentDetailsBtn"
    )
    ?.addEventListener(
        "click",
        () => {

            document
                .getElementById(
                    "plantingIntentDetailsSubview"
                )
                ?.classList.add(
                    "hidden-element"
                );

            list?.classList.remove(
                "hidden-element"
            );

            window.currentSelectedPlantingIntent =
                null;
        }
    );

    /* ============================================================
   SUBMIT PLANTING INTENT → RAW PLANT REPORT
   FLOW:
   Planting Intent
        ↓
   Create RawPlantReport
        ↓
   Get report_id
        ↓
   Submit Report
        ↓
   FOR_MUNICIPAL_VALIDATION
============================================================ */

document
    .getElementById(
        "submitPlantingIntentBtn"
    )
    ?.addEventListener(
        "click",
        async () => {

            const intent =
                window.currentSelectedPlantingIntent;


            if (!intent) {

                alert(
                    "No planting intent selected."
                );

                return;
            }


            console.log(
                "Submitting Planting Intent:",
                intent
            );


            /* ====================================================
               VALIDATE PLANTING DATE
            ==================================================== */

            if (!intent.planting_date) {

                alert(
                    "Planting date is required."
                );

                return;
            }


            /* ====================================================
               ESTIMATED YIELD
               
               For now:
               Planting Intent volume = Estimated Yield
            ==================================================== */

            const estimatedYield =
                String(
                    intent.volume ?? ""
                )
                .replace(/,/g, "")
                .replace(/kg/gi, "")
                .trim();


            if (
                !estimatedYield ||
                !/^\d+(\.\d+)?$/.test(
                    estimatedYield
                )
            ) {

                alert(
                    "Estimated yield must be a valid number."
                );

                return;
            }


            /* ====================================================
               RAW PLANT REPORT PAYLOAD
               
               municipal_coordinator_id = NULL
               encoded_by = handled by backend
            ==================================================== */

           const encodedBy =
    localStorage.getItem("user_id");

if (!encodedBy) {

    alert(
        "Logged-in user ID was not found."
    );

    return;
}


const rawPlantReportData = {

    planting_date:
        intent.planting_date,

    estimated_yield:
        estimatedYield,

    municipal_coordinator_id:
        null,

    encoded_by:
        Number(encodedBy)
};


            console.log(
                "Raw Plant Report payload:",
                rawPlantReportData
            );


            try {

                /* =================================================
                   STEP 1 — CREATE RAW PLANT REPORT
                ================================================= */

                const createdReport =
    await apiRequest(
        `${RAW_PLANT_REPORTS_ENDPOINT}/${intent.planting_intent_id}`,
        {
            method: "POST"
        }
    );


                console.log(
                    "Raw Plant Report created:",
                    createdReport
                );


                /* =================================================
                   STEP 2 — GET REPORT ID
                ================================================= */

                const reportId =
                    createdReport?.report_id ??
                    createdReport?.id;


                if (!reportId) {

                    throw new Error(
                        "Raw Plant Report was created, but no report ID was returned by the API."
                    );
                }


                console.log(
                    "Created Raw Plant Report ID:",
                    reportId
                );


                /* =================================================
                   STEP 3 — SUBMIT REPORT
                   
                   POST:
                   /api/report-submissions/{report_id}/submit
                ================================================= */

                const submissionResponse =
                    await apiRequest(
                        `${REPORT_SUBMISSIONS_ENDPOINT}/${reportId}/submit`,
                        {
                            method: "POST"
                        }
                    );


                console.log(
                    "Report Submission response:",
                    submissionResponse
                );


                /* =================================================
                   SUCCESS
                ================================================= */

                alert(
                    "Planting Report submitted successfully.\n\n" +
                    "Status: FOR_MUNICIPAL_VALIDATION"
                );


                /* =================================================
                   RETURN TO PLANTING INTENT LIST
                ================================================= */

                document
                    .getElementById(
                        "plantingIntentDetailsSubview"
                    )
                    ?.classList.add(
                        "hidden-element"
                    );


                document
                    .getElementById(
                        "plantingIntentListSubview"
                    )
                    ?.classList.remove(
                        "hidden-element"
                    );


                /* =================================================
                   CLEAR SELECTED INTENT
                ================================================= */

                window.currentSelectedPlantingIntent =
                    null;


                /* =================================================
                   RELOAD PLANTING INTENTS
                ================================================= */

                await fetchPlantingIntents();


            } catch (error) {

                console.error(
                    "Submit Planting Report error:",
                    error
                );


                handleAuthError(
                    error
                );


                alert(
                    "Failed to submit planting report.\n\n" +
                    (
                        error.message ||
                        "Please check the FastAPI server."
                    )
                );
            }
        }
    );
    ;

    /* --------------------------------------------------------
       SUBMIT
    -------------------------------------------------------- */

    document
        .getElementById(
            "submitPlantIntentForm"
        )
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                await submitPlantingIntent();
            }
        );


    /* --------------------------------------------------------
       CLOSE SUCCESS MODAL
    -------------------------------------------------------- */

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

                fetchPlantingIntents();
            }
        );
}
/* ============================================================
   FETCH PLANTING INTENTS FROM FASTAPI
============================================================ */

async function fetchPlantingIntents() {

    const tbody =
        document.getElementById(
            "plantingIntentsTableBody"
        );

    if (tbody) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6"
                    style="
                        padding:30px;
                        text-align:center;
                    "
                >
                    Loading planting intents...
                </td>
            </tr>
        `;
    }

    try {

        console.log(
            "Fetching planting intents:",
            PLANTING_INTENTS_ENDPOINT
        );

        const data =
            await apiRequest(
                PLANTING_INTENTS_ENDPOINT,
                {
                    method: "GET"
                }
            );

        console.log(
            "Planting Intents API response:",
            data
        );

        if (!Array.isArray(data)) {

            throw new Error(
                "Invalid planting intents response. Expected an array."
            );
        }

        PLANTING_INTENTS_DATA =
            data.map(
                intent =>
                    normalizePlantingIntent(
                        intent
                    )
            );

        renderPlantingIntentsTable();

        console.log(
            `Successfully loaded ${PLANTING_INTENTS_DATA.length} planting intent(s).`
        );

        return PLANTING_INTENTS_DATA;

    } catch (error) {

        console.error(
            "Unable to load planting intents:",
            error
        );

        PLANTING_INTENTS_DATA = [];

        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="6"
                        style="
                            padding:30px;
                            text-align:center;
                            color:#C0392B;
                        "
                    >
                        Failed to load planting intents.
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

        handleAuthError(error);

        return [];
    }
}

// ============================================================
// FETCH ALL SUBMITTED REPORTS
// ============================================================

async function loadAllReports() {
    try {
        const endpoint =
            `${API_BASE_URL}/api/report-submissions/all-reports`;

        console.log("Fetching all submitted reports:", endpoint);

        const reports = await apiRequest(endpoint);

        console.log("All Reports API response:", reports);

        renderAllReports(reports);

    } catch (error) {
        console.error(
            "Failed to load all submitted reports:",
            error
        );
    }
}
// ============================================================
// RENDER ALL REPORTS - TABLE FORMAT
// ============================================================

function renderAllReports(reports) {

    const container =
        document.getElementById("allReportsContainer");

    if (!container) {
        console.error(
            "allReportsContainer not found."
        );
        return;
    }

    // Clear container
    container.innerHTML = "";

    if (!reports || reports.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="
                padding: 40px;
                text-align: center;
                color: #777;
                font-size: 15px;
            ">
                No submitted reports found.
            </div>
        `;
        return;
    }

    // Create table
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "separate";
    table.style.borderSpacing = "0";
    table.style.marginTop = "8px";

    // Table Header
    const thead = document.createElement("thead");
    thead.innerHTML = `
        <tr style="background: #DEDDDC;">
            <th style="
                text-align: center;
                font-size: 13px;
                font-weight: 700;
                color: #222;
                padding: 14px 10px;
                border-top-left-radius: 8px;
                border-bottom-left-radius: 8px;
            ">#</th>
            <th style="
                text-align: center;
                font-size: 13px;
                font-weight: 700;
                color: #222;
                padding: 14px 10px;
            ">Title</th>
            <th style="
                text-align: center;
                font-size: 13px;
                font-weight: 700;
                color: #222;
                padding: 14px 10px;
            ">Planting Date</th>
            <th style="
                text-align: center;
                font-size: 13px;
                font-weight: 700;
                color: #222;
                padding: 14px 10px;
            ">Estimated Yield</th>
            <th style="
                text-align: center;
                font-size: 13px;
                font-weight: 700;
                color: #222;
                padding: 14px 10px;
                border-top-right-radius: 8px;
                border-bottom-right-radius: 8px;
            ">Status</th>
        </tr>
    `;
    table.appendChild(thead);

    // Table Body
    const tbody = document.createElement("tbody");
    
    reports.forEach((report, index) => {
        
        const title =
            report.title ||
            `${report.commodity || "Crop"} Harvest Report`;

        const plantingDate =
            report.planting_date
                ? new Date(report.planting_date)
                    .toLocaleDateString("en-US", {
                        month: "numeric",
                        day: "numeric",
                        year: "numeric"
                    })
                : "N/A";

        const estimatedYield =
            report.estimated_yield ?? "N/A";

        // Get status with proper color styling
        const status = report.status || "UNKNOWN";
        let statusColor = "#8a8a8a"; // default gray
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
        
        // Add hover effect
        tr.addEventListener("mouseenter", () => {
            tr.style.backgroundColor = "#F6F3EB";
        });
        tr.addEventListener("mouseleave", () => {
            tr.style.backgroundColor = "transparent";
        });

        tr.innerHTML = `
            <td style="
                padding: 14px 8px;
                font-size: 13.5px;
                text-align: center;
                vertical-align: middle;
            ">${index + 1}</td>
            <td style="
                padding: 14px 8px;
                font-size: 13.5px;
                text-align: center;
                vertical-align: middle;
                font-weight: 500;
            ">${title}</td>
            <td style="
                padding: 14px 8px;
                font-size: 13.5px;
                text-align: center;
                vertical-align: middle;
            ">${plantingDate}</td>
            <td style="
                padding: 14px 8px;
                font-size: 13.5px;
                text-align: center;
                vertical-align: middle;
            ">${estimatedYield} kg</td>
            <td style="
                padding: 14px 8px;
                text-align: center;
                vertical-align: middle;
            ">
                <span style="
                    display: inline-block;
                    padding: 6px 20px;
                    border-radius: 999px;
                    font-size: 12.5px;
                    font-weight: 700;
                    color: ${statusColor};
                    background: ${statusBg};
                    border: 1px solid ${statusColor}33;
                ">
                    ${status}
                </span>
            </td>
        `;

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    // Add summary
    const summary = document.createElement("div");
    summary.style.cssText = `
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid #E5E5E5;
        font-size: 13px;
        color: #666;
        text-align: right;
    `;
    summary.textContent = `Total: ${reports.length} report(s) found.`;
    container.appendChild(summary);
}

/* ============================================================
   NORMALIZE PLANTING INTENT
============================================================ */

function normalizePlantingIntent(intent) {

    return {

        // ID
        planting_intent_id:
            intent.planting_intent_id ??
            intent.id ??
            null,


        // FARMER
        farmer_id:
            intent.farmer_id ??
            null,


        farmer_name:
            intent.farmer_name ??
            intent.name ??
            "-",


        // COMMODITY
        commodity:
            intent.commodity ??
            intent.crop ??
            "-",


        // VOLUME
        volume:
            intent.volume ??
            intent.planned_volume ??
            intent.quantity ??
            "",


        // LOCATION
        location:
            intent.location ??
            intent.municipality ??
            intent.barangay ??
            "-",


        // DATES
        planting_date:
            intent.planting_date ??
            "",


        harvest_date:
            intent.harvest_date ??
            intent.expected_harvest_date ??
            "",


        // REMARKS
        remarks:
            intent.remarks ??
            "",
       
            status:
            intent.status ??
             "Pending",


        // CREATED AT
        created_at:
            intent.created_at ??
            null
    };
}
/* ============================================================
   RENDER PLANTING INTENTS TABLE
============================================================ */

function renderPlantingIntentsTable() {

    const tbody =
        document.getElementById(
            "plantingIntentsTableBody"
        );


    if (!tbody) {
        console.warn(
            "plantingIntentsTableBody not found."
        );

        return;
    }


    tbody.innerHTML = "";


    if (
        PLANTING_INTENTS_DATA.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="
                        padding:30px;
                        text-align:center;
                        color:#777;
                    "
                >
                    No planting intents found.
                </td>
            </tr>
        `;

        return;
    }


    PLANTING_INTENTS_DATA.forEach(
        intent => {

            const tr =
                document.createElement(
                    "tr"
                );


            tr.className =
                "clickable-row";


            tr.innerHTML = `
                <td>
                    <span class="pill">
                        ${escapeHtml(
                            intent.farmer_name || "-"
                        )}
                    </span>
                </td>

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            intent.commodity || "-"
                        )}
                    </span>
                </td>

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            formatPlantingVolume(
                                intent.volume
                            )
                        )}
                    </span>
                </td>

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            intent.location || "-"
                        )}
                    </span>
                </td>

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            formatPlantingDate(
                                intent.planting_date
                            )
                        )}
                    </span>
                </td>

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            formatPlantingDate(
                                intent.harvest_date
                            )
                        )}
                    </span>
                </td>

                <td>
    <span class="status-pill pending">
        ${escapeHtml(
            intent.status || "Pending"
        )}
    </span>
</td>
            `;


            tr.addEventListener(
                "click",
                () => {

                    openPlantingIntentDetails(
                        intent
                    );
                }
            );


            tbody.appendChild(
                tr
            );
        }
    );
}
/* ============================================================
   OPEN PLANTING INTENT DETAILS
============================================================ */

function openPlantingIntentDetails(intent) {

    console.log(
        "Selected Planting Intent:",
        intent
    );

    const list =
        document.getElementById(
            "plantingIntentListSubview"
        );

    const details =
        document.getElementById(
            "plantingIntentDetailsSubview"
        );

    if (!details) {

        console.warn(
            "plantingIntentDetailsSubview not found."
        );

        return;
    }


    /* ========================================================
       SAVE SELECTED PLANTING INTENT
    ======================================================== */

    window.currentSelectedPlantingIntent =
        intent;


    /* ========================================================
       HIDE LIST
    ======================================================== */

    list?.classList.add(
        "hidden-element"
    );


    /* ========================================================
       SHOW DETAILS
    ======================================================== */

    details.classList.remove(
        "hidden-element"
    );


    /* ========================================================
       DISPLAY DATA
    ======================================================== */

    setValue(
        "detailPlantingIntentId",
        intent.planting_intent_id || ""
    );

    setValue(
        "detailFarmerName",
        intent.farmer_name || ""
    );

    setValue(
        "detailFarmerId",
        intent.farmer_id || ""
    );

    setValue(
        "detailCommodity",
        intent.commodity || ""
    );

    setValue(
        "detailVolume",
        formatPlantingVolume(
            intent.volume
        )
    );

    setValue(
        "detailLocation",
        intent.location || ""
    );

    setValue(
        "detailPlantingDate",
        formatPlantingDate(
            intent.planting_date
        )
    );

    setValue(
        "detailHarvestDate",
        formatPlantingDate(
            intent.harvest_date
        )
    );

    setValue(
        "detailRemarks",
        intent.remarks || ""
    );
}

/* ============================================================
   SUBMIT PLANTING INTENT TO FASTAPI
============================================================ */

async function submitPlantingIntent() {

    const form =
        document.getElementById(
            "submitPlantIntentForm"
        );


    if (!form) {

        alert(
            "Planting Intent form not found."
        );

        return;
    }


    /*
     * Actual HTML order:
     *
     * 0 = Farmer Name
     * 1 = Planting Date
     * 2 = Farmer ID
     * 3 = Harvest Date
     * 4 = Commodity
     * 5 = Volume
     */

    const inputs =
        form.querySelectorAll(
            "input"
        );


    const farmerName =
        inputs[0]?.value.trim() || "";


    const plantingDate =
        inputs[1]?.value || "";


    const farmerId =
        inputs[2]?.value.trim() || "";


    const harvestDate =
        inputs[3]?.value || "";


    const commodity =
        inputs[4]?.value.trim() || "";


    const volume =
        inputs[5]?.value || "";


    /*
     * Validate required fields
     */

    if (!farmerName) {

        alert(
            "Please enter Farmer Name."
        );

        return;
    }


    if (!farmerId) {

        alert(
            "Please enter Farmer ID."
        );

        return;
    }


    if (!plantingDate) {

        alert(
            "Please select Planting Date."
        );

        return;
    }


    if (!harvestDate) {

        alert(
            "Please select Harvest Date."
        );

        return;
    }


    if (!commodity) {

        alert(
            "Please enter Commodity."
        );

        return;
    }


    if (!volume) {

        alert(
            "Please enter Volume."
        );

        return;
    }


    /*
     * Farmer ID MUST be an integer
     */

    const parsedFarmerId =
        Number(farmerId);


    if (
        !Number.isInteger(
            parsedFarmerId
        )
    ) {

        alert(
            "Farmer ID must be a valid number."
        );

        return;
    }


    /*
     * Volume MUST be numeric
     */

    const parsedVolume =
        Number(volume);


    if (
        Number.isNaN(
            parsedVolume
        )
    ) {

        alert(
            "Volume must be a valid number."
        );

        return;
    }


    /*
     * Payload sent to FastAPI
     */

    const plantingIntentData = {

        farmer_id:
            parsedFarmerId,

        commodity:
            commodity,

        volume:
            parsedVolume,

        planting_date:
            plantingDate,

        harvest_date:
            harvestDate
    };


    console.log(
        "Submitting planting intent:",
        plantingIntentData
    );


    try {

        const createdIntent =
            await apiRequest(
                PLANTING_INTENTS_ENDPOINT,
                {
                    method: "POST",

                    body:
                        JSON.stringify(
                            plantingIntentData
                        )
                }
            );


        console.log(
            "Planting intent created:",
            createdIntent
        );


        /*
         * Reload table
         */

        await fetchPlantingIntents();


        /*
         * Show success modal
         */

        document
            .getElementById(
                "plantIntentSubmittedModal"
            )
            ?.classList.add(
                "show"
            );


    } catch (error) {

        console.error(
            "Create planting intent error:",
            error
        );


        handleAuthError(
            error
        );


        alert(
            "Failed to submit planting intent.\n\n" +
            (
                error.message ||
                "Please check the FastAPI server."
            )
        );
    }
}


/* ============================================================
   FORMAT PLANTING DATE
============================================================ */

function formatPlantingDate(
    dateString
) {

    if (!dateString) {

        return "-";
    }


    const date =
        new Date(
            dateString
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return dateString;
    }


    return date.toLocaleDateString(
        "en-US",
        {
            month: "numeric",
            day: "numeric",
            year: "numeric"
        }
    );
}


/* ============================================================
   FORMAT VOLUME
============================================================ */

function formatPlantingVolume(
    volume
) {

    if (
        volume === null ||
        volume === undefined ||
        volume === ""
    ) {

        return "-";
    }


    /*
     * Keep existing formatted values
     * such as "15,000kg".
     */

    if (
        typeof volume === "string" &&
        volume.toLowerCase().includes("kg")
    ) {

        return volume;
    }


    const numericVolume =
        Number(
            String(volume)
                .replace(/,/g, "")
        );


    if (
        !Number.isNaN(
            numericVolume
        )
    ) {

        return (
            numericVolume.toLocaleString() +
            "kg"
        );
    }


    return String(
        volume
    );
}
/* ============================================================
   OFFTAKE REQUEST
   FLOW:
   Create Request
        ↓
   Fill-up Details
        ↓
   Proceed
        ↓
   Review & Confirm Offtake Letter
        ↓
   Edit Details OR Submit Request
        ↓
   Confirm Offtake Submission Modal
        ↓
   Confirm Dispatch
        ↓
   API POST
        ↓
   Offtake Submitted
============================================================ */

const OFFTAKE_REQUESTS_ENDPOINT =
    `${API_BASE_URL}/api/offtake-requests/`;


/* ============================================================
   OFFTAKE STATE
============================================================ */

let currentOfftakeRequest = null;
let OFFTAKE_REQUESTS_DATA = [];


/* ============================================================
   INITIALIZE OFFTAKE REQUEST
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

    const submittedModal =
        document.getElementById(
            "offtakeSubmittedModal"
        );
    
        fetchOfftakeRequests();


    /* ========================================================
       CREATE OFFTAKE REQUEST
    ======================================================== */

    document
        .getElementById(
            "createOfftakeBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                currentOfftakeRequest = null;

                list?.classList.add(
                    "hidden-element"
                );

                submitSub?.classList.remove(
                    "hidden-element"
                );

                confirmSub?.classList.add(
                    "hidden-element"
                );
            }
        );


    /* ========================================================
       RETURN FROM SUBMIT FORM
    ======================================================== */

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

                confirmSub?.classList.add(
                    "hidden-element"
                );

                list?.classList.remove(
                    "hidden-element"
                );
            }
        );

/* ========================================================
   PROCEED TO REVIEW
======================================================== */

document
    .getElementById("proceedOfftakeBtn")
    ?.addEventListener("click", () => {

        const farmerSelect =
            document.getElementById("offtakeFarmerSelect");

        const farmerId =
            document.getElementById("offtakeFarmerId");

        /* CHECK FARMER */
        if (!farmerSelect || !farmerSelect.value) {

            alert("Please select a farmer.");

            return;
        }

        /* MAKE SURE FARMER ID IS SET */
        if (farmerId) {
            farmerId.value = farmerSelect.value;
        }

        /* COLLECT OTHER FORM DATA */
        const data =
            collectOfftakeFormData();

        /* OVERRIDE FARMER DATA */
        data.farmer_id =
            Number(farmerSelect.value);

        data.farmer_name =
            farmerSelect.options[
                farmerSelect.selectedIndex
            ].text;

        /* VALIDATE */
        if (!validateOfftakeForm(data)) {
            return;
        }

        /* SAVE CURRENT REQUEST */
        currentOfftakeRequest = data;

        /* POPULATE REVIEW */
        populateOfftakeReview(data);

        /* SHOW REVIEW */
        submitSub?.classList.add(
            "hidden-element"
        );

        confirmSub?.classList.remove(
            "hidden-element"
        );
    });
    /* ========================================================
       EDIT DETAILS
       REVIEW → FORM
    ======================================================== */
document
    .getElementById(
        "backToSubmitOfftakeBtn"
    )
    ?.addEventListener(
        "click",
        () => {

            if (
                currentOfftakeRequest
            ) {

                populateOfftakeForm(
                    currentOfftakeRequest
                );
            }

            confirmSub?.classList.add(
                "hidden-element"
            );

            submitSub?.classList.remove(
                "hidden-element"
            );
        }
    );
    
    /* ========================================================
       SUBMIT REQUEST
       REVIEW → CONFIRM MODAL
    ======================================================== */
document
    .getElementById("sendOfftakeBtn")
    ?.addEventListener(
        "click",
        async () => {

            if (!currentOfftakeRequest) {

                const data =
                    collectOfftakeFormData();

                if (!validateOfftakeForm(data)) {
                    return;
                }

                currentOfftakeRequest = data;
            }

            await submitOfftakeRequest();
        }
    );
    /* ========================================================
       CONFIRM DISPATCH
       FINAL API SUBMISSION
    ======================================================== */

    document
        .getElementById(
            "confirmDispatchBtn"
        )
        ?.addEventListener(
            "click",
            async () => {

                await submitOfftakeRequest();
            }
        );


    /*
     * Alternative confirmation button.
     */

    if (
        !document.getElementById(
            "confirmDispatchBtn"
        )
    ) {

        document
            .getElementById(
                "confirmOfftakeDispatchBtn"
            )
            ?.addEventListener(
                "click",
                async () => {

                    await submitOfftakeRequest();
                }
            );
    }


    /* ========================================================
       CLOSE SUCCESS MODAL
    ======================================================== */

    document
        .getElementById(
            "closeOfftakeSubmittedBtn"
        )
        ?.addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "offtakeSuccessModal"
                    )
                    ?.classList.remove(
                        "show"
                    );


                submittedModal?.classList.remove(
                    "show"
                );


                confirmSub?.classList.add(
                    "hidden-element"
                );


                submitSub?.classList.add(
                    "hidden-element"
                );


                list?.classList.remove(
                    "hidden-element"
                );


                currentOfftakeRequest =
                    null;


                resetOfftakeForm();
            }
        );
}

/* ============================================================
   FETCH ALL OFFTAKE REQUESTS
============================================================ */
/* ============================================================
   FETCH ALL OFFTAKE REQUESTS
============================================================ */
async function fetchOfftakeRequests() {

    const tbody = document.getElementById("offtakeTableBody");

    if (!tbody) {
        console.error("offtakeTableBody not found.");
        return;
    }

    // Show loading state
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="padding:30px; text-align:center;">
                Loading offtake requests...
            </td>
        </tr>
    `;

    try {

        const url = `${API_BASE_URL}/api/offtake-requests/`;

        console.log("Fetching offtake requests:", url);

        const requests = await apiRequest(url, { method: "GET" });

        console.log("Offtake Requests API response:", requests);

        // ========================================================
        // IMPORTANT: Ensure farmers are loaded first
        // ========================================================
        
        // If allFarmers is empty, try to fetch farmers first
        if (!Array.isArray(allFarmers) || allFarmers.length === 0) {
            console.warn("allFarmers is empty. Fetching farmers first...");
            await fetchFarmers();
        }

        // Normalize farmers for lookup
        const farmersMap = new Map();
        
        if (Array.isArray(allFarmers)) {
            allFarmers.forEach(farmer => {
                // Store both string and number versions for lookup
                const farmerId = farmer.farmer_id;
                farmersMap.set(String(farmerId), farmer);
                farmersMap.set(Number(farmerId), farmer);
            });
        }

        console.log("Farmers Map:", farmersMap);

        tbody.innerHTML = "";

        if (!Array.isArray(requests) || requests.length === 0) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding:30px; text-align:center; color:#777;">
                        No offtake requests found.
                    </td>
                </tr>
            `;

            return;
        }

        // ========================================================
        // RENDER OFFTAKE REQUESTS
        // ========================================================

        requests.forEach(request => {

            // Find farmer using both string and number comparison
            let farmer = null;
            const requestFarmerId = request.farmer_id;
            
            if (requestFarmerId) {
                // Try both string and number versions
                farmer = farmersMap.get(String(requestFarmerId)) || 
                        farmersMap.get(Number(requestFarmerId));
            }

            // ====================================================
            // FARMER NAME
            // ====================================================

            let farmerName = "Unknown Farmer";
            let farmerLocation = "—";

            if (farmer) {

                farmerName = [
                    farmer.first_name,
                    farmer.middle_name,
                    farmer.last_name,
                    farmer.suffix
                ]
                .filter(Boolean)
                .join(" ");

                // Build location
                farmerLocation = 
                    farmer.address ||
                    [farmer.barangay, farmer.municipality]
                        .filter(Boolean)
                        .join(", ") ||
                    "—";

                console.log(`Found farmer: ${farmerName} (ID: ${farmer.farmer_id}) for request ID: ${requestFarmerId}`);
            } else {
                console.warn(`No farmer found for ID: ${requestFarmerId}`);
            }

            // ====================================================
            // CREATE TABLE ROW
            // ====================================================

            const row = document.createElement("tr");
            row.className = "clickable-row";

            row.innerHTML = `
                <td>
                    <span class="pill">${escapeHtml(farmerName)}</span>
                </td>

                <td>
                    <span class="pill">${escapeHtml(request.commodity || "—")}</span>
                </td>

                <td>
                    <span class="pill">${escapeHtml(request.quantity || "—")} kg</span>
                </td>

                <td>
                    <span class="pill">${escapeHtml(farmerLocation)}</span>
                </td>

                <td>
                    <span class="pill">${escapeHtml(request.harvest_date || "—")}</span>
                </td>

                <td>
                    <span class="status-pill submitted">Submitted</span>
                </td>
            `;

            tbody.appendChild(row);
        });

        console.log(`Successfully rendered ${requests.length} offtake request(s).`);

    } catch (error) {

        console.error("Unable to load offtake requests:", error);

        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="padding:30px; text-align:center; color:#C0392B;">
                    Failed to load offtake requests.
                    <br>
                    <small>${escapeHtml(error.message || "Please check the FastAPI server.")}</small>
                </td>
            </tr>
        `;

        handleAuthError(error);

        return [];
    }
}
/* ============================================================
   RENDER OFFTAKE REQUESTS TABLE
============================================================ */

function renderOfftakeRequestsTable() {

    const tbody =
        document.getElementById(
            "offtakeRequestsTableBody"
        );

    if (!tbody) {

        console.warn(
            "offtakeRequestsTableBody not found."
        );

        return;
    }

    tbody.innerHTML = "";

    if (
        OFFTAKE_REQUESTS_DATA.length === 0
    ) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6"
                    style="
                        padding:30px;
                        text-align:center;
                        color:#777;
                    ">
                    No offtake requests found.
                </td>
            </tr>
        `;

        return;
    }

    OFFTAKE_REQUESTS_DATA.forEach(
        request => {

            const tr =
                document.createElement("tr");

            const farmerName =
                request.farmer_name ||
                request.name ||
                "-";

            const commodity =
                request.commodity ||
                "-";

            const quantity =
                request.quantity ??
                request.volume ??
                "-";

            const location =
                request.location ||
                request.delivery_location ||
                request.municipality ||
                "-";

            const harvestDate =
                request.harvest_date
                    ? formatPlantingDate(
                        request.harvest_date
                    )
                    : "-";

            const status =
                request.status ||
                "PENDING";

            tr.innerHTML = `
                <td>
                    <span class="pill">
                        ${escapeHtml(
                            farmerName
                        )}
                    </span>
                </td>

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            commodity
                        )}
                    </span>
                </td>

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            quantity
                        )}
                    </span>
                </td>

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            location
                        )}
                    </span>
                </td>

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            harvestDate
                        )}
                    </span>
                </td>

                <td>
                    <span class="status-pill pending">
                        ${escapeHtml(
                            status
                        )}
                    </span>
                </td>
            `;

            tbody.appendChild(tr);
        }
    );
}

/* ============================================================
   COLLECT OFFTAKE FORM DATA
============================================================ */

function collectOfftakeFormData() {

    return {

        farmer_name:
            getOfftakeValue(
                [
                    "offtakeFarmerName",
                    "farmerName",
                    "offtakeFarmer"
                ]
            ),

        farmer_id:
            getOfftakeValue(
                [
                    "offtakeFarmerId",
                    "farmerId",
                    "offtakeFarmerID"
                ]
            ),

        commodity:
            getOfftakeValue(
                [
                    "offtakeCommodity",
                    "commodity"
                ]
            ),
quantity:
    getOfftakeValue(
        [
            "offtakeQty",
            "offtakeQuantity",
            "quantity"
        ]
    ),
selling_price:
    getOfftakeValue(
        [
            "offtakePrice",
            "offtakeSellingPrice",
            "sellingPrice"
        ]
    ),

        harvest_date:
            getOfftakeValue(
                [
                    "offtakeHarvestDate",
                    "harvestDate"
                ]
            ),

        commodity_photo:
            getOfftakeValue(
                [
                    "offtakeCommodityPhoto",
                    "commodityPhoto"
                ]
            ),

        /*
         * These can still be collected for display
         * if your HTML has them.
         *
         * They will NOT be sent to the API because
         * they are not included in the API schema
         * shown in your JSON response.
         */

        buyer:
            getOfftakeValue(
                [
                    "offtakeBuyer",
                    "buyer"
                ]
            ),
delivery_location:
    getOfftakeValue(
        [
            "offtakeLocation",
            "offtakeDeliveryLocation",
            "deliveryLocation"
        ]
    )
    };
}


/* ============================================================
   GET OFFTAKE VALUE
============================================================ */

function getOfftakeValue(ids) {

    for (
        const id of ids
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            return (
                element.value ??
                ""
            )
            .toString()
            .trim();
        }
    }


    return "";
}


/* ============================================================
   SET OFFTAKE VALUE
============================================================ */

function setOfftakeValue(
    ids,
    value
) {

    for (
        const id of ids
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.value =
                value ?? "";

            return;
        }
    }
}


/* ============================================================
   VALIDATE OFFTAKE FORM
============================================================ */

function validateOfftakeForm(
    data
) {

    if (!data.farmer_name) {

        alert(
            "Please enter Farmer Name."
        );

        return false;
    }


    if (!data.farmer_id) {

        alert(
            "Please enter Farmer ID."
        );

        return false;
    }


    if (!/^\d+$/.test(
        data.farmer_id
    )) {

        alert(
            "Farmer ID must be a valid whole number."
        );

        return false;
    }


    if (!data.commodity) {

        alert(
            "Please enter Commodity."
        );

        return false;
    }


    if (!data.quantity) {

        alert(
            "Please enter Quantity."
        );

        return false;
    }


    /*
     * Decimal validation.
     *
     * Allows:
     * 100
     * 100.50
     * 1,000
     * 1,000.50
     */

    const quantityValue =
        data.quantity
            .replace(/,/g, "")
            .trim();


    if (
        !/^\d+(\.\d+)?$/.test(
            quantityValue
        )
    ) {

        alert(
            "Quantity must be a valid number."
        );

        return false;
    }


    if (!data.selling_price) {

        alert(
            "Please enter Selling Price."
        );

        return false;
    }


    const sellingPriceValue =
        data.selling_price
            .replace(/,/g, "")
            .replace(/₱/g, "")
            .trim();


    if (
        !/^\d+(\.\d+)?$/.test(
            sellingPriceValue
        )
    ) {

        alert(
            "Selling Price must be a valid number."
        );

        return false;
    }


    if (!data.harvest_date) {

        alert(
            "Please select Harvest Date."
        );

        return false;
    }


    return true;
}


/* ============================================================
   POPULATE REVIEW
============================================================ */

function populateOfftakeReview(
    data
) {

    const values = {

        farmer_name:
            data.farmer_name,

        farmer_id:
            data.farmer_id,

        commodity:
            data.commodity,

        quantity:
            data.quantity,

        selling_price:
            data.selling_price,

        harvest_date:
            formatPlantingDate(
                data.harvest_date
            ),

        commodity_photo:
            data.commodity_photo || "",

        buyer:
            data.buyer || "",

        delivery_location:
            data.delivery_location || ""
    };


    setReviewValue(
        [
            "reviewFarmerName",
            "confirmFarmerName",
            "reviewOfftakeFarmerName"
        ],
        values.farmer_name
    );



    setReviewValue(
        [
            "reviewFarmerId",
            "confirmFarmerId",
            "reviewOfftakeFarmerId"
        ],
        values.farmer_id
    );


    setReviewValue(
        [
            "reviewCommodity",
            "confirmCommodity",
            "reviewOfftakeCommodity"
        ],
        values.commodity
    );


    setReviewValue(
        [
            "reviewQuantity",
            "confirmQuantity",
            "reviewOfftakeQuantity"
        ],
        values.quantity
    );


    setReviewValue(
        [
            "reviewSellingPrice",
            "confirmSellingPrice",
            "reviewOfftakeSellingPrice"
        ],
        values.selling_price
    );


    setReviewValue(
        [
            "reviewHarvestDate",
            "confirmHarvestDate",
            "reviewOfftakeHarvestDate"
        ],
        values.harvest_date
    );


    setReviewValue(
        [
            "reviewCommodityPhoto",
            "confirmCommodityPhoto",
            "reviewOfftakeCommodityPhoto"
        ],
        values.commodity_photo
    );


    /*
     * Optional UI fields.
     * These are only displayed if they exist.
     */

    setReviewValue(
        [
            "reviewBuyer",
            "confirmBuyer",
            "reviewOfftakeBuyer"
        ],
        values.buyer
    );

setReviewValue(
    [
        "reviewDeliveryLocation",
        "confirmLocation",
        "confirmDeliveryLocation",
        "reviewOfftakeDeliveryLocation"
    ],
    values.delivery_location
);
}


/* ============================================================
   SET REVIEW VALUE
============================================================ */

function setReviewValue(
    ids,
    value
) {

    for (
        const id of ids
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            const safeValue =
                value || "-";


            /*
             * Works for normal text elements.
             */

            element.textContent =
                safeValue;


            /*
             * Also works for input elements.
             */

            if (
                "value" in element
            ) {

                element.value =
                    value || "";
            }


            return;
        }
    }
}


/* ============================================================
   POPULATE FORM AFTER EDIT
============================================================ */

function populateOfftakeForm(
    data
) {

    setOfftakeValue(
        [
            "offtakeFarmerName",
            "farmerName",
            "offtakeFarmer"
        ],
        data.farmer_name
    );


    setOfftakeValue(
        [
            "offtakeFarmerId",
            "farmerId",
            "offtakeFarmerID"
        ],
        data.farmer_id
    );


    setOfftakeValue(
        [
            "offtakeCommodity",
            "commodity"
        ],
        data.commodity
    );


    setOfftakeValue(
        [
            "offtakeQuantity",
            "quantity"
        ],
        data.quantity
    );


    setOfftakeValue(
        [
            "offtakeSellingPrice",
            "sellingPrice"
        ],
        data.selling_price
    );


    setOfftakeValue(
        [
            "offtakeHarvestDate",
            "harvestDate"
        ],
        data.harvest_date
    );


    setOfftakeValue(
        [
            "offtakeCommodityPhoto",
            "commodityPhoto"
        ],
        data.commodity_photo
    );


    setOfftakeValue(
        [
            "offtakeBuyer",
            "buyer"
        ],
        data.buyer
    );


    setOfftakeValue(
        [
            "offtakeDeliveryLocation",
            "deliveryLocation"
        ],
        data.delivery_location
    );
}


/* ============================================================
   FINAL API SUBMISSION
============================================================ */

async function submitOfftakeRequest() {

    if (
        !currentOfftakeRequest
    ) {

        alert(
            "No Offtake Request data found."
        );

        return;
    }


    const sendOfftakeBtn =
    document.getElementById("sendOfftakeBtn");

if (sendOfftakeBtn) {
    sendOfftakeBtn.disabled = true;
    sendOfftakeBtn.textContent = "Submitting...";
}


    try {

        const data =
            currentOfftakeRequest;


        /* ====================================================
           FARMER ID
        ==================================================== */

        const farmerId =
            parseInt(
                data.farmer_id,
                10
            );


        if (
            !Number.isInteger(
                farmerId
            )
        ) {

            throw new Error(
                "Farmer ID must be a valid whole number."
            );
        }


        /* ====================================================
           DECIMAL VALUES
           
           IMPORTANT:
           DO NOT use Number() here.
           
           FastAPI/Pydantic Decimal can safely receive
           decimal values as strings.
           ==================================================== */

        const quantity =
            String(
                data.quantity
            )
            .replace(/,/g, "")
            .trim();


        const sellingPrice =
            String(
                data.selling_price
            )
            .replace(/,/g, "")
            .replace(/₱/g, "")
            .trim();


        /* ====================================================
           VALIDATE DECIMAL VALUES
        ==================================================== */

        if (
            !/^\d+(\.\d+)?$/.test(
                quantity
            )
        ) {

            throw new Error(
                "Quantity must be a valid decimal number."
            );
        }


        if (
            !/^\d+(\.\d+)?$/.test(
                sellingPrice
            )
        ) {

            throw new Error(
                "Selling Price must be a valid decimal number."
            );
        }


        /* ====================================================
           API PAYLOAD
           
           MATCHES THE OFFTAKE API RESPONSE/SCHEMA:
           
           farmer_id
           commodity
           quantity
           selling_price
           harvest_date
           commodity_photo
           ==================================================== */

        const payload = {

            farmer_id:
                farmerId,

            commodity:
                data.commodity,

            quantity:
                quantity,

            selling_price:
                sellingPrice,

            harvest_date:
                data.harvest_date,

            commodity_photo:
                data.commodity_photo || null
                
        };


        console.log(
            "================================="
        );

        console.log(
            "Submitting Offtake Request:"
        );

        console.log(
            payload
        );

        console.log(
            "================================="
        );


        /* ====================================================
           FINAL API CALL
        ==================================================== */

        const response =
            await apiRequest(
                OFFTAKE_REQUESTS_ENDPOINT,
                {
                    method: "POST",

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        console.log(
            "Offtake Request API response:",
            response
        );

        await fetchOfftakeRequests();


        /* ====================================================
           CLOSE CONFIRMATION MODAL
        ==================================================== */

        document
            .getElementById(
                "offtakeSubmittedModal"
            )
            ?.classList.remove(
                "show"
            );


        /* ====================================================
           SHOW SUCCESS MODAL
        ==================================================== */

        document
            .getElementById(
                "offtakeSuccessModal"
            )
            ?.classList.add(
                "show"
            );


    } catch (error) {

        console.error(
            "Create Offtake Request error:",
            error
        );


        handleAuthError(
            error
        );


        alert(
            "Failed to submit Offtake Request.\n\n" +
            (
                error.message ||
                "Please check the FastAPI server."
            )
        );


    } finally {

       if (sendOfftakeBtn) {
    sendOfftakeBtn.disabled = false;
    sendOfftakeBtn.textContent = "Submit Request";
}
    }
}


/* ============================================================
   RESET OFFTAKE FORM
============================================================ */

function resetOfftakeForm() {

    const possibleFormIds = [

        "offtakeRequestForm",

        "submitOfftakeForm",

        "createOfftakeForm"

    ];


    for (
        const id of possibleFormIds
    ) {

        const form =
            document.getElementById(
                id
            );


        if (form) {

            form.reset();

            break;
        }
    }


    currentOfftakeRequest =
        null;
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
   HELPER — SET INPUT / TEXT VALUE
============================================================ */

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );

    if (!element) {
        console.warn(
            `Element with id "${id}" not found.`
        );
        return;
    }

    const safeValue =
        value ?? "";

    /*
     * INPUT / SELECT / TEXTAREA
     */
    if (
        "value" in element
    ) {

        element.value =
            safeValue;

        return;
    }

    /*
     * DIV / SPAN / P / TD / LABEL / etc.
     */
    element.textContent =
        safeValue;
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