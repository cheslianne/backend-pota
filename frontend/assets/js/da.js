/* ============================================================
   eSAKA — DA-RFO OFFICER DASHBOARD
   Dynamic Buyer Registry + Map + Alert Threshold + Reports

   Backend:
   GET  /api/buyer-status/pending
   GET  /api/buyer-status/verified
   PUT  /api/buyer-status/{buyer_status_id}/verify
   PUT  /api/buyer-status/{buyer_status_id}/reject

   Buyer Attachment:
   GET  /api/buyer-registry/{buyer_registry_id}/attachment
============================================================ */


/* ============================================================
   API CONFIGURATION
============================================================ */

const API_BASE_URL = "http://127.0.0.1:8000";

const PENDING_BUYERS_ENDPOINT =
    `${API_BASE_URL}/api/buyer-status/pending`;

const VERIFIED_BUYERS_ENDPOINT =
    `${API_BASE_URL}/api/buyer-status/verified`;

const BUYER_STATUS_ENDPOINT =
    `${API_BASE_URL}/api/buyer-status`;

const BUYER_ATTACHMENT_ENDPOINT =
    `${API_BASE_URL}/api/buyer-registry/buyer-registry`;


/* ============================================================
   AUTH
============================================================ */

function getAuthToken() {

    return (
        localStorage.getItem("access_token") ||
        localStorage.getItem("token")
    );

}


function getAuthHeaders(includeContentType = true) {

    const token = getAuthToken();

    const headers = {};

    if (includeContentType) {

        headers["Content-Type"] =
            "application/json";

    }

    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;

    }

    return headers;

}


/* ============================================================
   GLOBAL VARIABLES
============================================================ */

let mapInstance = null;

let currentSelectedBuyer = null;

let pendingBuyersCache = [];

let verifiedBuyersCache = [];


/* ============================================================
   PAGE INITIALIZATION
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    initSidebar();

    initViewNavigation();

    initMap();

    initBuyerRegistry();

    initAlertThreshold();

    initReportsSection();

    initSignout();

    initModalListeners();

    loadUserInformation();

});


/* ============================================================
   LOAD USER INFORMATION
============================================================ */

function loadUserInformation() {

    const userName =
        localStorage.getItem("username") ||
        localStorage.getItem("name") ||
        localStorage.getItem("full_name");

    const role =
        localStorage.getItem("role");

    const userDisplayName =
        document.getElementById("userDisplayName");

    const userDisplayRole =
        document.getElementById("userDisplayRole");


    if (userName && userDisplayName) {

        userDisplayName.textContent =
            userName;

    }


    if (role && userDisplayRole) {

        const roleMap = {

            admin: "System Administrator",

            darfo: "DA-RFO Officer",

            aew: "Agricultural Extension Worker",

            farmer: "Farmer",

            coop: "Cooperative",

            lgu: "LGU"

        };

        userDisplayRole.textContent =
            roleMap[role] || role;

    }

}


/* ============================================================
   SIDEBAR
============================================================ */

function initSidebar() {

    const hamburgerBtn =
        document.getElementById("hamburgerBtn");

    const sidebar =
        document.getElementById("sidebar");


    if (!hamburgerBtn || !sidebar) {

        return;

    }


    hamburgerBtn.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle("open");


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
        document.querySelectorAll(".view");


    navButtons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const targetViewKey =
                    button.dataset.view;


                /* --------------------------------------------
                   HIDE ALL VIEWS
                -------------------------------------------- */

                views.forEach(view => {

                    view.classList.remove(
                        "active-view"
                    );

                });


                /* --------------------------------------------
                   SHOW TARGET VIEW
                -------------------------------------------- */

                const targetView =
                    document.getElementById(
                        "view-" + targetViewKey
                    );


                if (targetView) {

                    targetView.classList.add(
                        "active-view"
                    );

                }


                /* --------------------------------------------
                   UPDATE ACTIVE NAV BUTTON
                -------------------------------------------- */

                navButtons.forEach(navButton => {

                    navButton.classList.toggle(
                        "active",
                        navButton === button
                    );

                });


                /* --------------------------------------------
                   FIX MAP SIZE
                -------------------------------------------- */

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


                /* --------------------------------------------
                   REFRESH BUYER REGISTRY
                -------------------------------------------- */

                if (
                    targetViewKey === "buyer-registry"
                ) {

                    loadBuyerRegistry();

                }

            }
        );

    });

}


/* ============================================================
   SIGN OUT
============================================================ */

function initSignout() {

    const signoutBtn =
        document.getElementById("signoutBtn");


    if (!signoutBtn) {

        return;

    }


    signoutBtn.addEventListener(
        "click",
        () => {

            localStorage.clear();

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
        document.getElementById("map");


    if (
        !mapEl ||
        typeof L === "undefined"
    ) {

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

                maxBoundsViscosity: 1.0,

                minZoom: 10

            }
        ).setView(
            [15.0794, 120.6200],
            10
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {

            attribution:
                "&copy; OpenStreetMap contributors",

            maxZoom: 18

        }
    ).addTo(mapInstance);

}


/* ============================================================
   BUYER REGISTRY INITIALIZATION
============================================================ */

function initBuyerRegistry() {

    /* --------------------------------------------
       INITIAL LOAD
    -------------------------------------------- */

    loadBuyerRegistry();


    /* --------------------------------------------
       RETURN TO BUYER LIST
    -------------------------------------------- */

    const returnBuyerListBtn =
        document.getElementById(
            "returnBuyerListBtn"
        );


    returnBuyerListBtn?.addEventListener(
        "click",
        () => {

            showBuyerList();

        }
    );


    /* --------------------------------------------
       VIEW BUYER ATTACHMENT
    -------------------------------------------- */

    const viewBuyerAttachmentBtn =
        document.getElementById(
            "viewBuyerAttachmentBtn"
        );


    viewBuyerAttachmentBtn?.addEventListener(
        "click",
        async () => {

            if (!currentSelectedBuyer) {

                showError(
                    "No buyer application selected."
                );

                return;

            }


            await viewBuyerAttachment(
                currentSelectedBuyer
            );

        }
    );


    /* --------------------------------------------
       APPROVE BUYER BUTTON
    -------------------------------------------- */

    const approveBuyerBtn =
        document.getElementById(
            "approveBuyerBtn"
        );


    approveBuyerBtn?.addEventListener(
        "click",
        () => {

            if (!currentSelectedBuyer) {

                showError(
                    "No buyer application selected."
                );

                return;

            }


            const modal =
                document.getElementById(
                    "confirmApproveModal"
                );


            modal?.classList.add("show");

        }
    );


    /* --------------------------------------------
       REJECT BUYER BUTTON
    -------------------------------------------- */

    const rejectBuyerBtn =
        document.getElementById(
            "rejectBuyerBtn"
        );


    rejectBuyerBtn?.addEventListener(
        "click",
        () => {

            if (!currentSelectedBuyer) {

                showError(
                    "No buyer application selected."
                );

                return;

            }


            const modal =
                document.getElementById(
                    "confirmRejectModal"
                );


            modal?.classList.add("show");

        }
    );


    /* --------------------------------------------
       CONFIRM APPROVE
    -------------------------------------------- */

    const confirmApproveBtn =
        document.getElementById(
            "confirmApproveBtn"
        );


    confirmApproveBtn?.addEventListener(
        "click",
        async () => {

            await approveSelectedBuyer();

        }
    );


    /* --------------------------------------------
       CONFIRM REJECT
    -------------------------------------------- */

    const confirmRejectBtn =
        document.getElementById(
            "confirmRejectBtn"
        );


    confirmRejectBtn?.addEventListener(
        "click",
        async () => {

            await rejectSelectedBuyer();

        }
    );

}


/* ============================================================
   VIEW BUYER ATTACHMENT
============================================================ */

async function viewBuyerAttachment(buyer) {

    if (!buyer) {

        showError(
            "No buyer application selected."
        );

        return;

    }


    /* --------------------------------------------
       GET BUYER REGISTRY ID
    -------------------------------------------- */

    const buyerRegistryId =
        buyer.buyer_registry_id ||
        buyer.buyerRegistryId ||
        buyer.id;


    if (!buyerRegistryId) {

        console.error(
            "BUYER OBJECT:",
            buyer
        );

        showError(
            "Buyer registry ID is missing."
        );

        return;

    }


    const button =
        document.getElementById(
            "viewBuyerAttachmentBtn"
        );


    try {

        if (button) {

            button.disabled = true;

            button.dataset.originalText =
                button.textContent;

            button.textContent =
                "Opening...";

        }


        /* --------------------------------------------
           ATTACHMENT ENDPOINT
        -------------------------------------------- */

        const endpoint =
            `${BUYER_ATTACHMENT_ENDPOINT}/${buyerRegistryId}/attachment`;


        console.log(
            "VIEW BUYER ATTACHMENT:",
            endpoint
        );


        const response =
            await fetch(
                endpoint,
                {
                    method: "GET",
                    headers: getAuthHeaders(false)
                }
            );


        /* --------------------------------------------
           HANDLE API ERROR
        -------------------------------------------- */

        if (!response.ok) {

            const errorText =
                await response.text();

            let errorMessage =
                "Unable to load buyer attachment.";


            try {

                const errorData =
                    JSON.parse(errorText);


                errorMessage =
                    errorData.detail ||
                    errorData.message ||
                    errorMessage;

            } catch {

                if (errorText) {

                    errorMessage =
                        errorText;

                }

            }


            throw new Error(
                `Status ${response.status}: ${errorMessage}`
            );

        }


        /* --------------------------------------------
           CHECK CONTENT TYPE
        -------------------------------------------- */

        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        /* --------------------------------------------
           IF DIRECT FILE RESPONSE
        -------------------------------------------- */

        if (
            !contentType.includes(
                "application/json"
            )
        ) {

            const blob =
                await response.blob();


            if (!blob.size) {

                throw new Error(
                    "The buyer attachment is empty."
                );

            }


            const blobUrl =
                URL.createObjectURL(
                    blob
                );


            window.open(
                blobUrl,
                "_blank"
            );


            setTimeout(
                () => {

                    URL.revokeObjectURL(
                        blobUrl
                    );

                },
                60000
            );


            return;

        }


        /* --------------------------------------------
           IF JSON RESPONSE
        -------------------------------------------- */

        const data =
            await response.json();


        console.log(
            "BUYER ATTACHMENT DATA:",
            data
        );


        const attachmentUrl =
            data.attachment_url ||
            data.file_url ||
            data.document_url ||
            data.url ||
            data.attachment_path ||
            data.file_path ||
            data.document_path;


        if (!attachmentUrl) {

            throw new Error(
                "No attachment was found for this buyer."
            );

        }


        /* --------------------------------------------
           HANDLE RELATIVE URL
        -------------------------------------------- */

        let finalUrl =
            attachmentUrl;


        if (
            !attachmentUrl.startsWith(
                "http://"
            ) &&
            !attachmentUrl.startsWith(
                "https://"
            ) &&
            !attachmentUrl.startsWith(
                "blob:"
            ) &&
            !attachmentUrl.startsWith(
                "data:"
            )
        ) {

            if (
                attachmentUrl.startsWith("/")
            ) {

                finalUrl =
                    `${API_BASE_URL}${attachmentUrl}`;

            } else {

                finalUrl =
                    `${API_BASE_URL}/${attachmentUrl}`;

            }

        }


        console.log(
            "OPENING ATTACHMENT:",
            finalUrl
        );


        window.open(
            finalUrl,
            "_blank"
        );


    } catch (error) {

        console.error(
            "VIEW BUYER ATTACHMENT ERROR:",
            error
        );


        alert(
            error.message ||
            "Failed to open buyer attachment."
        );


    } finally {

        if (button) {

            button.disabled = false;

            button.textContent =
                button.dataset.originalText ||
                "View Attachment";

        }

    }

}


/* ============================================================
   LOAD BUYER REGISTRY
============================================================ */

async function loadBuyerRegistry() {

    await Promise.all(
        [
            loadPendingBuyers(),
            loadVerifiedBuyers()
        ]
    );

}


/* ============================================================
   LOAD PENDING BUYERS
============================================================ */

async function loadPendingBuyers() {

    const tbody =
        document.getElementById(
            "pendingBuyersBody"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML = `
        <tr>
            <td colspan="2">
                Loading pending buyer applications...
            </td>
        </tr>
    `;


    try {

        const response =
            await fetch(
                PENDING_BUYERS_ENDPOINT,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `Failed to fetch pending buyers.
Status: ${response.status}
${errorText}`
            );

        }


        const data =
            await response.json();


        pendingBuyersCache =
            Array.isArray(data)
                ? data
                : [];


        renderPendingBuyers(
            pendingBuyersCache
        );


    } catch (error) {

        console.error(
            "LOAD PENDING BUYERS ERROR:",
            error
        );


        tbody.innerHTML = `
            <tr>
                <td colspan="2">

                    <strong>
                        Unable to load pending buyers.
                    </strong>

                    <br>

                    <small>
                        Check if FastAPI is running
                        and the endpoint is available.
                    </small>

                </td>
            </tr>
        `;

    }

}


/* ============================================================
   RENDER PENDING BUYERS
============================================================ */

function renderPendingBuyers(buyers) {

    const tbody =
        document.getElementById(
            "pendingBuyersBody"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML = "";


    if (!buyers.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="2">
                    No pending buyer applications.
                </td>
            </tr>
        `;

        return;

    }


    buyers.forEach(
        buyer => {

            const row =
                document.createElement("tr");


            row.className =
                "clickable-row";


            row.dataset.buyerStatusId =
                buyer.buyer_status_id ?? "";


            row.dataset.buyerRegistryId =
                buyer.buyer_registry_id ?? "";


            row.innerHTML = `
                <td>
                    <span class="pill">
                        ${escapeHtml(
                            buyer.organization || "N/A"
                        )}
                    </span>
                </td>

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            buyer.contact_person || "N/A"
                        )}
                    </span>
                </td>
            `;


            row.addEventListener(
                "click",
                () => {

                    openBuyerReview(
                        buyer
                    );

                }
            );


            tbody.appendChild(row);

        }
    );

}


/* ============================================================
   LOAD VERIFIED BUYERS
============================================================ */

async function loadVerifiedBuyers() {

    const tbody =
        document.getElementById(
            "verifiedBuyersBody"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML = `
        <tr>
            <td colspan="5">
                Loading verified buyers...
            </td>
        </tr>
    `;


    try {

        const response =
            await fetch(
                VERIFIED_BUYERS_ENDPOINT,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `Failed to fetch verified buyers.
Status: ${response.status}
${errorText}`
            );

        }


        const data =
            await response.json();


        verifiedBuyersCache =
            Array.isArray(data)
                ? data
                : [];


        renderVerifiedBuyers(
            verifiedBuyersCache
        );


    } catch (error) {

        console.error(
            "LOAD VERIFIED BUYERS ERROR:",
            error
        );


        tbody.innerHTML = `
            <tr>
                <td colspan="5">

                    <strong>
                        Unable to load verified buyers.
                    </strong>

                    <br>

                    <small>
                        Check if FastAPI is running
                        and the endpoint is available.
                    </small>

                </td>
            </tr>
        `;

    }

}


/* ============================================================
   RENDER VERIFIED BUYERS
============================================================ */

function renderVerifiedBuyers(buyers) {

    const tbody =
        document.getElementById(
            "verifiedBuyersBody"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML = "";


    if (!buyers.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    No verified buyers found.
                </td>
            </tr>
        `;

        return;

    }


    buyers.forEach(
        buyer => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            buyer.organization || "N/A"
                        )}
                    </span>
                </td>

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            buyer.contact_person || "N/A"
                        )}
                    </span>
                </td>

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            buyer.email_address || "N/A"
                        )}
                    </span>
                </td>

                <td>
                    <span class="pill">
                        ${escapeHtml(
                            getBuyerCommodities(buyer)
                        )}
                    </span>
                </td>

                <td>
                    <span class="status-text-verified">
                        Verified
                    </span>
                </td>

            `;


            tbody.appendChild(row);

        }
    );

}


/* ============================================================
   OPEN BUYER REVIEW
============================================================ */

function openBuyerReview(buyer) {

    currentSelectedBuyer =
        buyer;


    const buyerRegistryList =
        document.getElementById(
            "buyerRegistryList"
        );


    const buyerReviewDetails =
        document.getElementById(
            "buyerReviewDetails"
        );


    /* --------------------------------------------
       ORGANIZATION
    -------------------------------------------- */

    const reviewOrg =
        document.getElementById(
            "reviewOrg"
        );


    if (reviewOrg) {

        reviewOrg.textContent =
            buyer.organization || "N/A";

    }


    /* --------------------------------------------
       CONTACT PERSON
    -------------------------------------------- */

    const reviewContact =
        document.getElementById(
            "reviewContact"
        );


    if (reviewContact) {

        reviewContact.textContent =
            buyer.contact_person || "N/A";

    }


    /* --------------------------------------------
       EMAIL
    -------------------------------------------- */

    const reviewEmail =
        document.getElementById(
            "reviewEmail"
        );


    if (reviewEmail) {

        reviewEmail.textContent =
            buyer.email_address || "N/A";

    }


    /* --------------------------------------------
       COMMODITIES
    -------------------------------------------- */

    renderReviewCommodities(
        buyer
    );


    /* --------------------------------------------
       MESSAGE
    -------------------------------------------- */

    const messageTextarea =
        document.querySelector(
            "#buyerReviewDetails textarea"
        );


    if (messageTextarea) {

        messageTextarea.value =
            buyer.message ||
            "No message provided.";

    }


    /* --------------------------------------------
       SHOW REVIEW
    -------------------------------------------- */

    buyerRegistryList?.classList.add(
        "hidden-element"
    );


    buyerReviewDetails?.classList.remove(
        "hidden-element"
    );

}


/* ============================================================
   RENDER REVIEW COMMODITIES
============================================================ */

function renderReviewCommodities(buyer) {

    const container =
        document.getElementById(
            "reviewCommodities"
        );


    if (!container) {

        return;

    }


    container.innerHTML = "";


    const commodities =
        getCommodityArray(
            buyer
        );


    if (!commodities.length) {

        const span =
            document.createElement(
                "span"
            );


        span.className =
            "pill";


        span.textContent =
            "Not specified";


        container.appendChild(
            span
        );


        return;

    }


    commodities.forEach(
        commodity => {

            const span =
                document.createElement(
                    "span"
                );


            span.className =
                "pill";


            span.textContent =
                commodity;


            container.appendChild(
                span
            );

        }
    );

}


/* ============================================================
   GET COMMODITY ARRAY
============================================================ */

function getCommodityArray(buyer) {

    if (!buyer) {

        return [];

    }


    /* --------------------------------------------
       ARRAY
    -------------------------------------------- */

    if (
        Array.isArray(
            buyer.commodities
        )
    ) {

        return buyer.commodities
            .map(
                item =>
                    String(item).trim()
            )
            .filter(Boolean);

    }


    /* --------------------------------------------
       STRING
    -------------------------------------------- */

    if (
        typeof buyer.commodities === "string"
    ) {

        return buyer.commodities
            .split(",")
            .map(
                item =>
                    item.trim()
            )
            .filter(Boolean);

    }


    /* --------------------------------------------
       SINGLE COMMODITY
    -------------------------------------------- */

    if (buyer.commodity) {

        return [
            String(
                buyer.commodity
            ).trim()
        ];

    }


    return [];

}


/* ============================================================
   GET COMMODITIES FOR TABLE
============================================================ */

function getBuyerCommodities(buyer) {

    const commodities =
        getCommodityArray(
            buyer
        );


    if (!commodities.length) {

        return "Not specified";

    }


    return commodities.join(
        ", "
    );

}


/* ============================================================
   RETURN TO BUYER LIST
============================================================ */

function showBuyerList() {

    const buyerRegistryList =
        document.getElementById(
            "buyerRegistryList"
        );


    const buyerReviewDetails =
        document.getElementById(
            "buyerReviewDetails"
        );


    buyerReviewDetails?.classList.add(
        "hidden-element"
    );


    buyerRegistryList?.classList.remove(
        "hidden-element"
    );


    currentSelectedBuyer =
        null;

}


/* ============================================================
   APPROVE SELECTED BUYER
============================================================ */

async function approveSelectedBuyer() {

    if (!currentSelectedBuyer) {

        showError(
            "No buyer application selected."
        );

        return;

    }


    const buyerStatusId =
        currentSelectedBuyer.buyer_status_id;


    if (!buyerStatusId) {

        showError(
            "Buyer status ID is missing."
        );

        return;

    }


    const confirmButton =
        document.getElementById(
            "confirmApproveBtn"
        );


    try {

        setButtonLoading(
            confirmButton,
            "Approving..."
        );


        const response =
            await fetch(
                `${BUYER_STATUS_ENDPOINT}/${buyerStatusId}/verify`,
                {
                    method: "PUT",
                    headers: getAuthHeaders()
                }
            );


        const data =
            await parseResponse(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                "Unable to approve buyer."
            );

        }


        console.log(
            "BUYER APPROVED:",
            data
        );


        closeModal(
            "confirmApproveModal"
        );


        alert(
            "Buyer verified successfully."
        );


        currentSelectedBuyer =
            null;


        showBuyerList();


        /* --------------------------------------------
           REFRESH BOTH TABLES
        -------------------------------------------- */

        await loadBuyerRegistry();


    } catch (error) {

        console.error(
            "APPROVE BUYER ERROR:",
            error
        );


        alert(
            error.message ||
            "Failed to approve buyer."
        );

    } finally {

        resetButton(
            confirmButton,
            "Yes, Approve"
        );

    }

}


/* ============================================================
   REJECT SELECTED BUYER
============================================================ */

async function rejectSelectedBuyer() {

    if (!currentSelectedBuyer) {

        showError(
            "No buyer application selected."
        );

        return;

    }


    const buyerStatusId =
        currentSelectedBuyer.buyer_status_id;


    if (!buyerStatusId) {

        showError(
            "Buyer status ID is missing."
        );

        return;

    }


    const confirmButton =
        document.getElementById(
            "confirmRejectBtn"
        );


    try {

        setButtonLoading(
            confirmButton,
            "Rejecting..."
        );


        const response =
            await fetch(
                `${BUYER_STATUS_ENDPOINT}/${buyerStatusId}/reject`,
                {
                    method: "PUT",
                    headers: getAuthHeaders()
                }
            );


        const data =
            await parseResponse(
                response
            );


        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.message ||
                "Unable to reject buyer."
            );

        }


        console.log(
            "BUYER REJECTED:",
            data
        );


        closeModal(
            "confirmRejectModal"
        );


        alert(
            "Buyer application rejected."
        );


        currentSelectedBuyer =
            null;


        showBuyerList();


        /* --------------------------------------------
           REFRESH BOTH TABLES
        -------------------------------------------- */

        await loadBuyerRegistry();


    } catch (error) {

        console.error(
            "REJECT BUYER ERROR:",
            error
        );


        alert(
            error.message ||
            "Failed to reject buyer."
        );

    } finally {

        resetButton(
            confirmButton,
            "Yes, Reject"
        );

    }

}


/* ============================================================
   PARSE API RESPONSE
============================================================ */

async function parseResponse(response) {

    const text =
        await response.text();


    if (!text) {

        return {};

    }


    try {

        return JSON.parse(
            text
        );

    } catch {

        return {
            detail: text
        };

    }

}


/* ============================================================
   BUTTON LOADING
============================================================ */

function setButtonLoading(
    button,
    text
) {

    if (!button) {

        return;

    }


    button.disabled =
        true;


    button.dataset.originalText =
        button.textContent;


    button.textContent =
        text;

}


/* ============================================================
   RESET BUTTON
============================================================ */

function resetButton(
    button,
    defaultText
) {

    if (!button) {

        return;

    }


    button.disabled =
        false;


    button.textContent =
        defaultText;

}


/* ============================================================
   CLOSE MODAL
============================================================ */

function closeModal(modalId) {

    const modal =
        document.getElementById(
            modalId
        );


    modal?.classList.remove(
        "show"
    );

}


/* ============================================================
   ERROR MESSAGE
============================================================ */

function showError(message) {

    console.error(
        message
    );


    alert(
        message
    );

}


/* ============================================================
   ESCAPE HTML
============================================================ */

function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* ============================================================
   ALERT THRESHOLD
============================================================ */

function initAlertThreshold() {

    const thresholdRange =
        document.getElementById(
            "thresholdRange"
        );


    const thresholdValue =
        document.getElementById(
            "thresholdValue"
        );


    const chips =
        document.querySelectorAll(
            ".threshold-chip"
        );


    const saveBtn =
        document.getElementById(
            "saveConfigBtn"
        );


    /* --------------------------------------------
       UPDATE THRESHOLD UI
    -------------------------------------------- */

    function updateThreshold(value) {

        if (thresholdRange) {

            thresholdRange.value =
                value;

        }


        if (thresholdValue) {

            thresholdValue.textContent =
                `${value}%`;

        }


        chips.forEach(
            chip => {

                chip.classList.toggle(
                    "active",
                    chip.dataset.val ===
                    String(value)
                );

            }
        );

    }


    /* --------------------------------------------
       RANGE INPUT
    -------------------------------------------- */

    thresholdRange?.addEventListener(
        "input",
        event => {

            updateThreshold(
                event.target.value
            );

        }
    );


    /* --------------------------------------------
       THRESHOLD CHIPS
    -------------------------------------------- */

    chips.forEach(
        chip => {

            chip.addEventListener(
                "click",
                () => {

                    updateThreshold(
                        chip.dataset.val
                    );

                }
            );

        }
    );


    /* --------------------------------------------
       SAVE CONFIGURATION
    -------------------------------------------- */

    saveBtn?.addEventListener(
        "click",
        async () => {

            const commodity =
                document.getElementById(
                    "commoditySelect"
                )?.value;


            const baseDemand =
                document.getElementById(
                    "baseDemandInput"
                )?.value;


            const oversupplyThreshold =
                thresholdRange?.value;


            const etlSchedule =
                document.getElementById(
                    "etlSelect"
                )?.value;


            const payload = {

                commodity:
                    commodity || null,

                baseDemand:
                    baseDemand || null,

                oversupplyThreshold:
                    oversupplyThreshold || null,

                etlSchedule:
                    etlSchedule || null

            };


            console.log(
                "Threshold configuration:",
                payload
            );


            alert(
                "Threshold configuration saved successfully!"
            );

        }
    );

}


/* ============================================================
   REPORTS
============================================================ */

function initReportsSection() {

    const reportListSubview =
        document.getElementById(
            "reportListSubview"
        );


    const reportDetailSubview =
        document.getElementById(
            "reportDetailSubview"
        );


    const reportApprovedModal =
        document.getElementById(
            "reportApprovedModal"
        );


    const flagReportBtn =
        document.getElementById(
            "flagReportBtn"
        );


    const approveReportBtn =
        document.getElementById(
            "approveReportBtn"
        );


    const returnReportListBtn =
        document.getElementById(
            "returnReportListBtn"
        );


    const closeReportApprovedBtn =
        document.getElementById(
            "closeReportApprovedBtn"
        );


    /* --------------------------------------------
       REPORT LIST
    -------------------------------------------- */

    document
        .querySelectorAll(".report-item")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    reportListSubview?.classList.add(
                        "hidden-element"
                    );


                    reportDetailSubview?.classList.remove(
                        "hidden-element"
                    );


                    if (flagReportBtn) {

                        flagReportBtn.classList.remove(
                            "active"
                        );


                        flagReportBtn.textContent =
                            "Flag for Revision";

                    }

                }
            );

        });


    /* --------------------------------------------
       RETURN TO REPORT LIST
    -------------------------------------------- */

    returnReportListBtn?.addEventListener(
        "click",
        () => {

            reportDetailSubview?.classList.add(
                "hidden-element"
            );


            reportListSubview?.classList.remove(
                "hidden-element"
            );

        }
    );


    /* --------------------------------------------
       FLAG REPORT
    -------------------------------------------- */

    flagReportBtn?.addEventListener(
        "click",
        () => {

            flagReportBtn.classList.toggle(
                "active"
            );


            flagReportBtn.textContent =
                flagReportBtn.classList.contains(
                    "active"
                )
                    ? "Flagged"
                    : "Flag for Revision";

        }
    );


    /* --------------------------------------------
       APPROVE REPORT
    -------------------------------------------- */

    approveReportBtn?.addEventListener(
        "click",
        () => {

            reportApprovedModal?.classList.add(
                "show"
            );

        }
    );


    /* --------------------------------------------
       CLOSE APPROVED MODAL
    -------------------------------------------- */

    closeReportApprovedBtn?.addEventListener(
        "click",
        () => {

            reportApprovedModal?.classList.remove(
                "show"
            );


            reportDetailSubview?.classList.add(
                "hidden-element"
            );


            reportListSubview?.classList.remove(
                "hidden-element"
            );

        }
    );

}


/* ============================================================
   MODAL LISTENERS
============================================================ */

function initModalListeners() {

    /* --------------------------------------------
       CLICK OUTSIDE MODAL
    -------------------------------------------- */

    document
        .querySelectorAll(".modal-overlay")
        .forEach(modal => {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target === modal
                    ) {

                        modal.classList.remove(
                            "show"
                        );

                    }

                }
            );

        });


    /* --------------------------------------------
       CANCEL BUTTONS
    -------------------------------------------- */

    document
        .querySelectorAll(".modal-cancel-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const modal =
                        button.closest(
                            ".modal-overlay"
                        );


                    modal?.classList.remove(
                        "show"
                    );

                }
            );

        });

}