const token = localStorage.getItem('token');
const userRole = localStorage.getItem('role');


let mapInstance = null;


const REPORT_DATA = {
  '1': { name: 'Pedro Manalang', commodity: 'Onion', volume: '15,000kg', location: 'Sta. Monica', planting: 'February 1, 2026', harvesting: 'San Juan' },
  '2': { name: 'Ana Reyes', commodity: 'Tomato', volume: '9,200kg', location: 'Sta. Barbara', planting: 'January 20, 2026', harvesting: 'Sta. Barbara' },
  '3': { name: 'Rico Villanueva', commodity: 'Cabbage', volume: '6,500kg', location: 'Sta. Lucia', planting: 'January 15, 2026', harvesting: 'Sta. Lucia' }
};


const municipalities = [
  { name: 'San Fernando', lat: 15.0333, lng: 120.6900, status: 'balanced', detail: 'Rice supply matches demand' },
  { name: 'Angeles City', lat: 15.1450, lng: 120.5930, status: 'deficit', detail: 'Vegetable demand exceeds supply by 15%' },
  { name: 'Mabalacat', lat: 15.2226, lng: 120.5730, status: 'surplus', detail: 'Onion supply exceeds demand by 22%' },
  { name: 'Guagua', lat: 14.9797, lng: 120.6353, status: 'deficit', detail: 'Corn demand exceeds supply by 9%' },
  { name: 'Lubao', lat: 14.9333, lng: 120.6000, status: 'balanced', detail: 'Rice supply matches demand' },
  { name: 'Porac', lat: 15.0667, lng: 120.5333, status: 'no-data', detail: 'No recent report submitted' },
  { name: 'Candaba', lat: 15.0961, lng: 120.8228, status: 'surplus', detail: 'Fish supply exceeds demand by 30%' },
  { name: 'Arayat', lat: 15.1428, lng: 120.7472, status: 'no-data', detail: 'No recent report submitted' }
];


const STATUS_COLORS = {
  surplus: '#c0392b',
  deficit: '#e6b800',
  balanced: '#3d8b40',
  'no-data': '#8a8a8a'
};


// 2. LIFECYCLE INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initNotifDropdown();
  initViewNavigation();
  initMap();
  initReportsSection();
  initSignout();
});


// ---------- Sidebar & Navigation ----------
function initSidebar() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');


  if (hamburgerBtn && sidebar) {
    hamburgerBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      setTimeout(() => {
        if (mapInstance) mapInstance.invalidateSize();
      }, 300);
    });
  }
}


function initNotifDropdown() {
  const bellBtn = document.getElementById('bellBtn');
  const notifDropdown = document.getElementById('notifDropdown');


  if (!bellBtn || !notifDropdown) return;


  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdown.classList.toggle('show');
  });


  document.addEventListener('click', (e) => {
    if (!notifDropdown.contains(e.target) && e.target !== bellBtn) {
      notifDropdown.classList.remove('show');
    }
  });


  document.querySelector('.notif-item[data-goto="report"]')?.addEventListener('click', () => {
    switchView('report');
    notifDropdown.classList.remove('show');
  });
}


function initViewNavigation() {
  const navButtons = document.querySelectorAll('.nav-item[data-view]');


  navButtons.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}


function switchView(viewKey) {
  const views = document.querySelectorAll('.view');
  const navButtons = document.querySelectorAll('.nav-item[data-view]');


  views.forEach(v => v.classList.remove('active-view'));
  const targetView = document.getElementById('view-' + viewKey);
  if (targetView) targetView.classList.add('active-view');


  navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewKey));


  if (viewKey === 'map' && mapInstance) {
    setTimeout(() => mapInstance.invalidateSize(), 50);
  }
}


function initSignout() {
  const signoutBtn = document.getElementById('signoutBtn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = '../index.html';
    });
  }
}


// ---------- Leaflet Map Setup ----------
function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl) return;


  const pampangaBounds = L.latLngBounds([14.85, 120.35], [15.35, 120.95]);


  mapInstance = L.map('map', {
    maxBounds: pampangaBounds,
    maxBoundsViscosity: 1.0,
    minZoom: 10
  }).setView([15.0794, 120.6200], 10);


  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(mapInstance);


  municipalities.forEach(m => {
    const marker = L.circleMarker([m.lat, m.lng], {
      radius: 9,
      fillColor: STATUS_COLORS[m.status],
      color: '#fff',
      weight: 2,
      fillOpacity: 0.9
    }).addTo(mapInstance);


    marker.bindPopup(
      `<div class="popup-title">${m.name}</div>` +
      `<div class="popup-status">${m.detail}</div>`
    );
  });


  const bounds = L.latLngBounds(municipalities.map(m => [m.lat, m.lng]));
  mapInstance.fitBounds(bounds, { padding: [30, 30] });
}


// ---------- Reports Section Logic ----------
function initReportsSection() {
  const reportListSubview = document.getElementById('reportListSubview');
  const reportDetailSubview = document.getElementById('reportDetailSubview');
  const reportModal = document.getElementById('reportModal');
  const reportModalText = document.getElementById('reportModalText');
  const flagBtn = document.getElementById('flagBtn');
  const approveBtn = document.getElementById('approveBtn');
  const returnBtn = document.getElementById('returnBtn');


  function showReportSubview(subview) {
    reportListSubview.classList.remove('active-subview');
    reportDetailSubview.classList.remove('active-subview');
    subview.classList.add('active-subview');
  }


  // view on report click
  document.querySelectorAll('.report-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const data = REPORT_DATA[btn.dataset.reportId];
      if (data) {
        document.getElementById('detailName').textContent = data.name;
        document.getElementById('detailCommodity').textContent = data.commodity;
        document.getElementById('detailVolume').textContent = data.volume;
        document.getElementById('detailLocation').textContent = data.location;
        document.getElementById('detailPlanting').textContent = data.planting;
        document.getElementById('detailHarvesting').textContent = data.harvesting;
      }


      if (flagBtn && approveBtn && returnBtn) {
        flagBtn.classList.remove('active');
        approveBtn.classList.remove('active');
        flagBtn.textContent = 'Flag for Revision';
        flagBtn.disabled = false;
        approveBtn.disabled = false;
        returnBtn.disabled = false;
      }


      showReportSubview(reportDetailSubview);
    });
  });


  returnBtn?.addEventListener('click', () => {
    showReportSubview(reportListSubview);
  });


  function finalizeReport(action) {
    if (!flagBtn || !approveBtn || !returnBtn) return;
    flagBtn.disabled = true;
    approveBtn.disabled = true;
    returnBtn.disabled = true;


    if (action === 'flag') {
      flagBtn.classList.add('active');
      flagBtn.textContent = 'Flagged';
      reportModalText.textContent = 'Report Flagged for Revision — Farmer will be notified.';
    } else {
      approveBtn.classList.add('active');
      reportModalText.textContent = 'Report Submitted to Regional Level';
    }


    reportModal.classList.add('show');
  }


  flagBtn?.addEventListener('click', () => finalizeReport('flag'));
  approveBtn?.addEventListener('click', () => finalizeReport('approve'));


  document.getElementById('reportModalConfirmBtn')?.addEventListener('click', () => {
    reportModal.classList.remove('show');
    showReportSubview(reportListSubview);
  });


  document.getElementById('viewAttachmentsBtn')?.addEventListener('click', () => {
    alert('No attachments available in this record.');
  });


  document.getElementById('submitReportBtn')?.addEventListener('click', () => {
    alert('Submit Report form is ready for backend connection.');
  });
}

