const form = document.getElementById('loginForm');
const emailField = document.getElementById('emailField');
const passwordField = document.getElementById('passwordField');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const formStatus = document.getElementById('formStatus');

const loginNotice = sessionStorage.getItem('esaka_login_notice');
if (loginNotice && formStatus) {
  formStatus.className = 'form-status error show';
  formStatus.textContent = loginNotice;
  sessionStorage.removeItem('esaka_login_notice');
}




// Eye icon elements
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const eyeIcon = document.getElementById('eyeIcon');
const eyeOffIcon = document.getElementById('eyeOffIcon');




// Toggle Password Visibility Logic
if (togglePasswordBtn && passwordInput) {
  togglePasswordBtn.addEventListener('click', () => {
    const isMasked = passwordInput.getAttribute('type') === 'password';
   
    if (isMasked) {
      // Unhide password -> Show open eye
      passwordInput.setAttribute('type', 'text');
      eyeIcon.style.display = 'block';
      eyeOffIcon.style.display = 'none';
    } else {
      // Hide password -> Show closed eye
      passwordInput.setAttribute('type', 'password');
      eyeIcon.style.display = 'none';
      eyeOffIcon.style.display = 'block';
    }
  });
}




// FastAPI backend
const API_BASE_URL = window.API_BASE_URL || 'https://esaka-backend-production.up.railway.app';




/* ---------- Field Validation ---------- */




function setError(fieldEl, isInvalid) {
  fieldEl.classList.toggle('has-error', isInvalid);




  const input = fieldEl.querySelector('input');
  if (input) {
    input.classList.toggle('invalid', isInvalid);
  }
}




/* ---------- Role-Based Dashboard ---------- */




function getDashboardByRole(role) {
  const dashboards = {
    'System Administrator': './dashboards/system-admin.html',
    'Agricultural Extension Worker': './dashboards/aew.html',
    'DA-RFO Officer': './dashboards/da.html',
    'DA-RFO': './dashboards/da.html',
    'Municipal Coordinator': './dashboards/municipal.html',
    'Municipal': './dashboards/municipal.html',
    'Provincial Coordinator': './dashboards/provincial.html',
    'Provincial': './dashboards/provincial.html',
    'AEW': './dashboards/aew.html'         // Add this
  };




  return dashboards[role] || null;
}




/* ---------- Login ---------- */




form.addEventListener('submit', async (e) => {
  e.preventDefault();




  const username = emailInput.value.trim();
  const password = passwordInput.value.trim();




  let hasError = false;




  // Validate username
  if (username === '') {
    setError(emailField, true);
    hasError = true;
  } else {
    setError(emailField, false);
  }




  // Validate password
  if (password === '') {
    setError(passwordField, true);
    hasError = true;
  } else {
    setError(passwordField, false);
  }




  // Stop if validation failed
  if (hasError) {
    formStatus.textContent = '';
    formStatus.classList.remove('show');
    return;
  }




  // Show loading message
  formStatus.className = 'form-status show';
  formStatus.textContent = 'Logging in...';




  try {
    /* ---------- Send Login Request to FastAPI ---------- */
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        username: username,
        password: password
      })
    });




    const data = await response.json();




    /* ---------- Handle Failed Login ---------- */
    if (!response.ok) {
      throw new Error(
        [401, 403].includes(response.status)
          ? 'Invalid credentials.'
          : data.detail || 'Unable to log in.'
      );
    }

    const sessionResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'include'
    });
    if (!sessionResponse.ok) {
      throw new Error(
        'Your credentials were accepted, but your login session could not be established. Please try again.'
      );
    }
    const sessionUser = await sessionResponse.json();


    /* ---------- Save Non-sensitive Session Display Data ---------- */
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('token_type');
    localStorage.setItem('user_id', sessionUser.user_id);
    localStorage.setItem('username', sessionUser.username);
    localStorage.setItem('role', sessionUser.role);



    /* ---------- Determine Dashboard ---------- */
    const dashboard = getDashboardByRole(sessionUser.role);



    if (!dashboard) {
      throw new Error(
        `No dashboard configured for role: ${sessionUser.role}`
      );
    }




    /* ---------- Login Successful ---------- */
    formStatus.className = 'form-status show';
    formStatus.textContent = 'Login successful! Redirecting...';




    setTimeout(() => {
      window.location.href = dashboard;
    }, 600);




  } catch (error) {
    console.error('Login error:', error);
    formStatus.className = 'form-status error show';
    formStatus.textContent = error.message || 'Unable to connect to the server.';
  }
});
