const API = "https://mayconnect-backend-1.onrender.com";

let cachedPlans = [];
let cachedAdminPlans = [];
let currentUser = null;
let ws = null;

let selectedNetwork = null;
let selectedPlan = null;
let airtimeNetwork = null;
let actionType = null;
let editingPlanId = null;
let selectedPlanId = null;
let selectedPhone = null;

/* ================= HELPERS ================= */
function getToken() { return localStorage.getItem("token"); }
function el(id) { return document.getElementById(id); }
function formatNaira(num) { return "₦" + Number(num || 0).toLocaleString(); }
function formatDate(date) { return new Date(date).toLocaleDateString('en-GB'); }
function openModal(id) { const m = el(id); if (m) m.style.display = "flex"; }
function closeModal(id) { const m = el(id); if (m) m.style.display = "none"; }

/* ================= WEBAUTHN HELPERS ================= */
// Base64URL encode ArrayBuffer -> String
function bufferEncode(value) {
  if (!value) return null;
  const uint8Array = new Uint8Array(value);
  let binary = '';
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary)
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');
}

// Base64URL decode String -> ArrayBuffer
function bufferDecode(value) {
  if (!value) return null;
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}


/* ================= MESSAGE ================= */
function showMsg(msg, type = "info") {
  const color = type === "error"? "#ff4d4d" : type === "success"? "#00c853" : "#2196f3";
  el("msgBox").innerHTML = `
    <div style="text-align:center">
      <p style="color:${color}">${msg}</p>
      <button onclick="closeModal('msgModal')" class="primaryBtn">OK</button>
    </div>`;
  openModal("msgModal");
}

/* ================= LOADER ================= */
function showLoader(text = "Processing...") {
  el("msgBox").innerHTML = `<p style="text-align:center">${text}</p>`;
  openModal("msgModal");
}
function hideLoader() { closeModal("msgModal"); }

/* ================= AUTH ================= */
function checkAuth() {
  if (!getToken()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

/* ================= LOAD DASHBOARD ================= */
async function loadDashboard() {
  if (!checkAuth()) return;

  try {
    const res = await fetch(API + "/api/me", { headers: { Authorization: "Bearer " + getToken() } });
    currentUser = await res.json();
    window.CURRENT_USER_ID = currentUser.id;
  } catch {
    logout();
    return;
  }

  if (el("usernameDisplay")) el("usernameDisplay").innerText = "Hello " + currentUser.username;
  if (el("companyBadge")) el("companyBadge").innerText = currentUser.company.toUpperCase();

  if (currentUser && currentUser.is_admin === true) {
    document.querySelectorAll(".adminOnly").forEach(e => e.style.display = "block");
    if (el("adminWalletBalance")) el("adminWalletBalance").innerText = formatNaira(currentUser.admin_wallet);
    if (el("adminWalletBalance2")) el("adminWalletBalance2").innerText = formatNaira(currentUser.admin_wallet);
  }

  initNavigation();
  await loadAccount();
  await loadPlans();
  fetchTransactions();
  if (currentUser.is_admin) loadAdminData();
  checkBiometricStatus();

  setTimeout(connectWebSocket, 1000);
}

/* ================= NAV ================= */
function initNavigation() {
  document.querySelectorAll(".section").forEach(s => s.style.display = "none");
  el("home").style.display = "block";
}

function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.style.display = "none");
  el(id).style.display = "block";
  if (id === "profitDashboard") loadProfitDashboard();
  if (id === "topUsersManager") loadTopUsers();
  if (id === "withdrawals") loadWithdrawals();
  if (id === "plansManager") loadAdminPlans();
  if (id === "usersManager") loadAdminUsers();
}

/* ================= WALLET ================= */
function updateWallet(balance) {
  if (el("walletBalance")) el("walletBalance").innerText = formatNaira(balance);
}

function loadWallet() {
  loadAccount();
}

/* ================= COPY ACCOUNT ================= */
function copyAccount() {
  const acc = el("accountNumber").innerText;
  navigator.clipboard.writeText(acc);
  showMsg("Account number copied!", "success");
}

/* ================= TRANSACTIONS ================= */
async function fetchTransactions() {
  try {
    const res = await fetch(API + "/api/transactions", {
      headers: { Authorization: "Bearer " + getToken() }
    });
    const tx = await res.json();

    if (el("transactionHistory")) {
      el("transactionHistory").innerHTML = "";
      tx.slice(0, 5).forEach(t => el("transactionHistory").appendChild(txCard(t)));
    }

    if (el("allTransactions")) {
      el("allTransactions").innerHTML = "";
      tx.forEach(t => el("allTransactions").appendChild(txCard(t)));
    }
  } catch {}
}

function txCard(t) {
  const div = document.createElement("div");
  div.className = "transactionCard";
  const statusColor = t.status === "SUCCESS"? "#00c853" : t.status === "FAILED"? "#ff4d4d" : "#ffa000";
  div.innerHTML = `
    <strong>${t.type}</strong> ${formatNaira(t.amount)}<br>
    ${t.phone || t.network || ""}<br>
    <span style="color:${statusColor}">${t.status}</span>
    <small style="float:right">${formatDate(t.created_at)}</small>`;
  return div;
}

/* ================= PLANS ================= */
async function loadPlans() {
  try {
    const res = await fetch(API + "/api/plans", {
      headers: { Authorization: "Bearer " + getToken() }
    });
    const data = await res.json();
    cachedPlans = Array.isArray(data)? data : [];
  } catch (e) {
    console.log("PLANS ERROR", e);
  }
}

function selectNetwork(network, element) {
  selectedNetwork = (network || "").toLowerCase();
  selectedPlan = null;
  document.querySelectorAll(".networkItem").forEach(n => n.classList.remove("active"));
  if (element) element.classList.add("active");
  renderPlans();
}

function selectAirtimeNetwork(network, element) {
  airtimeNetwork = network;
  document.querySelectorAll(".airtimeNet").forEach(n => n.classList.remove("active"));
  if (element) element.classList.add("active");
}

function renderPlans() {
  const list = el("planList");
  if (!list) return;

  list.innerHTML = "";

  if (!selectedNetwork) {
    list.innerHTML = "<p>Select a network first</p>";
    return;
  }

  const filtered = cachedPlans.filter(p => (p.network || "").toLowerCase() === selectedNetwork);

  if (!filtered.length) {
    list.innerHTML = "<p>No plans available for this network</p>";
    return;
  }

  filtered.forEach(p => {
    const div = document.createElement("div");
    div.className = "planItem";
    const priceDisplay = currentUser?.is_top_user && p.top_price? p.top_price : p.price;
    const badge = currentUser?.is_top_user && p.top_price? `<span class="topUserBadge">TOP</span>` : "";

    div.innerHTML = `
      <strong>${p.name}</strong> ${badge}<br>
      ${p.validity || ""}<br>
      <strong>${formatNaira(priceDisplay)}</strong>
    `;

    div.onclick = () => {
      selectedPlan = {...p, price: priceDisplay};
      openPurchaseModal(p.id, p.name, priceDisplay);
    };

    list.appendChild(div);
  });
}

// ================= WEBAUTHN - FRONTEND =================

// Base64URL <-> ArrayBuffer helpers
function bufferDecode(value) {
  value = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = value.length % 4;
  if (pad) value += '='.repeat(4 - pad);
  const str = atob(value);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes.buffer;
}

function bufferEncode(value) {
  const bytes = new Uint8Array(value);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function checkBiometricStatus() {
  if (!getToken()) return;

  const browserSupports = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
  const statusEl = el('biometricStatus');
  const enableBtn = el('enableBiometricBtn');
  const loginBtn = el('biometricLoginBtn');

  if (!browserSupports) {
    if (statusEl) statusEl.innerText = 'Not supported on this device';
    if (enableBtn) enableBtn.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(API + '/api/auth/webauthn/check-enabled', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    }).then(r => r.json());

    if (res.enabled) {
      if (statusEl) statusEl.innerText = 'Enabled ✓';
      if (enableBtn) enableBtn.style.display = 'none';
      if (loginBtn) loginBtn.style.display = 'inline-block';
    } else {
      if (statusEl) statusEl.innerText = 'Available - click to enable';
      if (enableBtn) enableBtn.style.display = 'block';
      if (loginBtn) loginBtn.style.display = 'none';
    }
  } catch(e) {
    console.log('Biometric check failed:', e);
    if (statusEl) statusEl.innerText = 'Check failed';
  }
}

async function enableBiometric() {
  if (!window.PublicKeyCredential) {
    logToScreen('ERROR: WebAuthn not supported');
    return showMsg('Biometric not supported on this device/browser', 'error');
  }

  try {
    logToScreen('1. Starting...');
    logToScreen('2. Hostname: ' + window.location.hostname);
    logToScreen('3. Protocol: ' + window.location.protocol);
    
    const start = await fetch(API + '/api/auth/webauthn/register-start', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    }).then(r => r.json());

    if (start.error) throw new Error(start.error);
    
    logToScreen('4. Got options from server');
    logToScreen('5. rpId from server: ' + start.rpId);
    logToScreen('6. excludeCreds count: ' + (start.excludeCredentials?.length || 0));
    logToScreen('7. challenge type: ' + typeof start.challenge);

    const options = {
    ...start,
      challenge: bufferDecode(start.challenge),
      user: {...start.user, id: bufferDecode(start.user.id) }
    };

    if (options.excludeCredentials && options.excludeCredentials.length > 0) {
      logToScreen('8. Decoding excludeCredentials...');
      options.excludeCredentials = options.excludeCredentials.map(cred => ({
      ...cred,
        id: bufferDecode(cred.id)
      }));
    } else {
      logToScreen('8. No excludeCredentials, deleting field');
      delete options.excludeCredentials;
    }

    logToScreen('9. Calling navigator.credentials.create...');
    
    const cred = await navigator.credentials.create({
      publicKey: options,
      signal: AbortSignal.timeout(60000)
    });
    
    logToScreen('10. SUCCESS: Fingerprint created!');
    
    showLoader('Saving credential...');

    const credential = {
      id: cred.id,
      rawId: bufferEncode(cred.rawId),
      response: {
        attestationObject: bufferEncode(cred.response.attestationObject),
        clientDataJSON: bufferEncode(cred.response.clientDataJSON)
      },
      type: cred.type,
      clientExtensionResults: cred.getClientExtensionResults()
    };

    const finish = await fetch(API + '/api/auth/webauthn/register-finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(credential)
    }).then(r => r.json());

    hideLoader();
    if (finish.verified) {
      logToScreen('11. Backend verified!');
      showMsg('Fingerprint enabled successfully!', 'success');
      checkBiometricStatus();
    } else {
      logToScreen('11. Backend error: ' + (finish.error || 'Unknown'));
      showMsg('Failed: ' + (finish.error || 'Unknown'), 'error');
    }
  } catch (e) {
    hideLoader();
    logToScreen('ERROR: ' + e.name + ' - ' + e.message);
    console.error('Biometric error:', e);
    if (e.name === 'NotAllowedError') {
      showMsg('Biometric cancelled or timed out', 'error');
    } else if (e.name === 'InvalidStateError') {
      showMsg('Biometric already enabled. Clear site data first.', 'error');
    } else {
      showMsg('Error: ' + e.message, 'error');
    }
  }
}

async function loginWithBiometric() {
  const email = prompt('Enter your email:');
  if (!email) return;

  try {
    showLoader('Starting biometric login...');
    const start = await fetch(API + '/api/auth/webauthn/login-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }).then(r => r.json());

    if (start.error) throw new Error(start.error);

    hideLoader();
    showLoader('Touch fingerprint sensor...');

    const options = {
    ...start,
      challenge: bufferDecode(start.challenge),
      allowCredentials: start.allowCredentials.map(cred => ({
      ...cred,
        id: bufferDecode(cred.id)
      }))
    };

    const assertion = await navigator.credentials.get({
      publicKey: options,
      signal: AbortSignal.timeout(60000)
    });

    showLoader('Verifying...');

    const credential = {
      id: assertion.id,
      rawId: bufferEncode(assertion.rawId),
      response: {
        authenticatorData: bufferEncode(assertion.response.authenticatorData),
        clientDataJSON: bufferEncode(assertion.response.clientDataJSON),
        signature: bufferEncode(assertion.response.signature),
        userHandle: assertion.response.userHandle? bufferEncode(assertion.response.userHandle) : null
      },
      type: assertion.type,
      clientExtensionResults: assertion.getClientExtensionResults()
    };

    const finish = await fetch(API + '/api/auth/webauthn/login-finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({...credential, email })
    }).then(r => r.json());

    hideLoader();
    if (finish.token) {
      localStorage.setItem('token', finish.token);
      location.reload();
    } else {
      showMsg('Biometric login failed: ' + (finish.error || 'Unknown'), 'error');
    }
  } catch (e) {
    hideLoader();
    console.error('Biometric login error:', e);
    if (e.name === 'NotAllowedError') {
      showMsg('Biometric cancelled or timed out', 'error');
    } else {
      showMsg('Biometric error: ' + e.message, 'error');
    }
  }
}

// Helper functions you should already have
function el(id) { return document.getElementById(id); }
function getToken() { return localStorage.getItem('token'); }
function showMsg(msg, type) { alert(msg); }
function showLoader(msg) { console.log('Loader:', msg); }
function hideLoader() { console.log('Loader hidden'); }

// Run on page load if user is logged in
document.addEventListener('DOMContentLoaded', () => {
  if (getToken()) checkBiometricStatus();
});

/* ================= PURCHASE MODAL - NULL SAFE ================= */
async function openPurchaseModal(planId, planName, planPrice) {
  selectedPlanId = planId;
  selectedPhone = el('dataPhone')?.value;

  if (!selectedPhone) return showMsg('Enter phone number first', 'error');

  actionType = "DATA";
  const pinInput = el('pinInput');
  const pinTitle = el('pinModalTitle');
  const pinDetails = el('pinModalDetails');
  const bioBtn = el('biometricPurchaseBtn');

  if (pinInput) pinInput.value = '';
  if (pinTitle) pinTitle.innerText = 'Confirm Purchase';
  if (pinDetails) pinDetails.innerHTML = `<strong>${planName}</strong><br>${formatNaira(planPrice)}<br>To: ${selectedPhone}`;

  try {
    const res = await fetch(API + '/api/auth/webauthn/check-enabled', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    const data = await res.json();
    if (bioBtn) bioBtn.style.display = data.enabled? 'inline-block' : 'none';
  } catch (e) {
    console.log('Biometric check failed:', e);
  }

  openModal('pinModal');
  setTimeout(() => el('pinInput')?.focus(), 100);
}

function openAirtimePin() {
  const phone = el("airtimePhone").value;
  const amount = el("airtimeAmount").value;
  if (!phone ||!amount ||!airtimeNetwork) return showMsg("Fill all fields", "error");

  selectedPhone = phone;
  actionType = "AIRTIME";
  const pinInput = el('pinInput');
  const pinTitle = el('pinModalTitle');
  const pinDetails = el('pinModalDetails');

  if (pinInput) pinInput.value = '';
  if (pinTitle) pinTitle.innerText = 'Confirm Airtime';
  if (pinDetails) pinDetails.innerHTML = `<strong>${airtimeNetwork.toUpperCase()} Airtime</strong><br>${formatNaira(amount)}<br>To: ${phone}`;

  fetch(API + '/api/auth/webauthn/check-enabled', {
    headers: { 'Authorization': 'Bearer ' + getToken() }
  }).then(r => r.json()).then(data => {
    const bioBtn = el('biometricPurchaseBtn');
    if (bioBtn) bioBtn.style.display = data.enabled? 'inline-block' : 'none';
  }).catch(() => {});

  openModal('pinModal');
  setTimeout(() => el('pinInput')?.focus(), 100);
}

function confirmPurchase() {
  const pin = el('pinInput')?.value;
  if (!pin) return showMsg('Enter PIN', 'error');
  closeModal('pinModal');

  if (actionType === "DATA") buyData(pin);
  if (actionType === "AIRTIME") buyAirtime(pin);
}

async function purchaseWithBiometric() {
  if (!selectedPhone) return showMsg('Enter phone number first', 'error');

  try {
    closeModal('pinModal');
    showLoader('Verify fingerprint...');

    const start = await fetch(API + '/api/auth/webauthn/verify-purchase', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + getToken() }
    }).then(r => r.json());

    hideLoader();
    
    // FIX: Convert challenge and allowCredentials to ArrayBuffer
    start.challenge = bufferDecode(start.challenge);
    start.allowCredentials = start.allowCredentials.map(cred => ({
     ...cred,
      id: bufferDecode(cred.id)
    }));

    const assertion = await navigator.credentials.get({ publicKey: start });

    // FIX: Convert back to base64url for sending
    const credential = {
      id: assertion.id,
      rawId: bufferEncode(assertion.rawId),
      response: {
        authenticatorData: bufferEncode(assertion.response.authenticatorData),
        clientDataJSON: bufferEncode(assertion.response.clientDataJSON),
        signature: bufferEncode(assertion.response.signature),
        userHandle: assertion.response.userHandle? bufferEncode(assertion.response.userHandle) : null
      },
      type: assertion.type
    };

    showLoader('Verifying...');
    const verify = await fetch(API + '/api/auth/webauthn/verify-purchase-finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify(credential)
    }).then(r => r.json());

    hideLoader();
    if (!verify.verified) return showMsg('Fingerprint verification failed', 'error');

    if (actionType === "DATA") buyData('biometric_verified');
    if (actionType === "AIRTIME") buyAirtime('biometric_verified');

  } catch (e) {
    hideLoader();
    if (e.name === 'NotAllowedError') {
      showMsg('Fingerprint cancelled', 'error');
    } else {
      showMsg('Error: ' + e.message, 'error');
    }
  }
}

/* ================= BUY DATA ================= */
async function buyData(pin) {
  const phone = selectedPhone || el("dataPhone")?.value;

  if (!phone ||!selectedPlanId) return showMsg("Select plan & enter phone", "error");
  if (!pin) return showMsg("Enter PIN", "error");

  showLoader("Purchasing data...");

  try {
    const res = await fetch(API + "/api/buy-data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ phone, plan_id: selectedPlanId, pin })
    });

    const data = await res.json();
    hideLoader();

    if (res.ok && data.success!== false) {
      showMsg("Data purchase successful ✅", "success");
      updateWallet(data.balance);
      fetchTransactions();
      if (el("dataPhone")) el("dataPhone").value = '';
    } else {
      showMsg(data.message || "Purchase failed", "error");
    }
  } catch (err) {
    hideLoader();
    console.log('Buy error:', err);
    showMsg("Network error. Try again.", "error");
  }
}

/* ================= BUY AIRTIME ================= */
async function buyAirtime(pin) {
  const phone = selectedPhone || el("airtimePhone")?.value;
  const amount = el("airtimeAmount")?.value;

  if (!phone ||!amount ||!airtimeNetwork) return showMsg("Fill all fields", "error");
  if (!pin) return showMsg("Enter PIN", "error");

  showLoader("Purchasing airtime...");

  try {
    const res = await fetch(API + "/api/buy-airtime", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ phone, amount, network: airtimeNetwork, pin })
    });

    const data = await res.json();
    hideLoader();

    if (res.ok && data.success!== false) {
      showMsg("Airtime purchase successful ✅", "success");
      updateWallet(data.balance);
      fetchTransactions();
      if (el("airtimePhone")) el("airtimePhone").value = '';
      if (el("airtimeAmount")) el("airtimeAmount").value = '';
    } else {
      showMsg(data.message || "Purchase failed", "error");
    }
  } catch (err) {
    hideLoader();
    showMsg("Network error. Try again.", "error");
  }
}

/* ================= FUND ================= */
function openFundModal() {
  el("msgBox").innerHTML = `
    <div style="text-align:center">
      <h3>Fund Wallet</h3>
      <input id="fundAmount" type="number" placeholder="Enter amount" />
      <br><br>
      <button onclick="confirmFund()" class="primaryBtn">Pay with Paystack</button>
    </div>`;
  openModal("msgModal");
}

async function confirmFund() {
  const amount = el("fundAmount")?.value;
  if (!amount || amount < 100) return showMsg("Minimum funding is ₦100", "error");

  showLoader("Initializing payment...");
  try {
    const res = await fetch(API + "/api/fund/init", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ amount })
    });
    const data = await res.json();
    hideLoader();
    if (data.url) window.location.href = data.url;
    else showMsg(data.message || "Payment failed", "error");
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}

/* ================= ADMIN: PROFIT DASHBOARD ================= */
async function loadProfitDashboard() {
  const from = el("profitFrom")?.value || new Date(new Date().setDate(1)).toISOString().split('T')[0];
  const to = el("profitTo")?.value || new Date().toISOString().split('T')[0];

  showLoader("Loading profit data...");
  try {
    const res = await fetch(`${API}/admin/profit?from=${from}&to=${to}`, {
      headers: { Authorization: "Bearer " + getToken() }
    });
    const data = await res.json();
    hideLoader();

    if (el("totalProfit")) el("totalProfit").innerText = formatNaira(data.total);
    if (el("adminWalletBalance")) el("adminWalletBalance").innerText = formatNaira(data.admin_wallet);
    if (el("adminWalletBalance2")) el("adminWalletBalance2").innerText = formatNaira(data.admin_wallet);

    const table = el("profitTable");
    if (table) {
      table.innerHTML = `<tr><th>Date</th><th>Sales</th><th>Profit</th></tr>`;
      data.daily.forEach(d => {
        table.innerHTML += `<tr>
          <td>${formatDate(d.date)}</td>
          <td>${d.total_sales}</td>
          <td>${formatNaira(d.total_profit)}</td>
        </tr>`;
      });
    }
  } catch {
    hideLoader();
    showMsg("Failed to load profit data", "error");
  }
}

/* ================= ADMIN: TOP USERS ================= */
async function loadTopUsers() {
  try {
    const res = await fetch(API + "/admin/top-users", {
      headers: { Authorization: "Bearer " + getToken() }
    });
    const users = await res.json();
    const list = el("topUsersList");
    if (list) {
      list.innerHTML = "";
      users.forEach(u => {
        list.innerHTML += `<div class="userCard">
          <strong>${u.username}</strong> - ${u.email}<br>
          Spent: ${formatNaira(u.total_spent)} | Profit: ${formatNaira(u.total_profit_generated)}
          ${u.is_top_user? `<button onclick="removeTopUser('${u.email}')" class="dangerBtn">Remove</button>` : ''}
        </div>`;
      });
    }
  } catch {}
}

async function addTopUser() {
  const email = el("topUserEmail")?.value;
  if (!email) return showMsg("Enter email", "error");

  showLoader("Adding top user...");
  try {
    const res = await fetch(API + "/admin/top-users/add", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    hideLoader();
    showMsg(data.message, res.ok? "success" : "error");
    if (res.ok) loadTopUsers();
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}

async function removeTopUser(email) {
  showLoader("Removing...");
  try {
    const res = await fetch(API + "/admin/top-users/remove", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    hideLoader();
    showMsg(data.message, res.ok? "success" : "error");
    if (res.ok) loadTopUsers();
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}

/* ================= ADMIN: PLANS MANAGER ================= */
async function loadAdminPlans() {
  try {
    const res = await fetch(API + "/admin/plans", {
      headers: { Authorization: "Bearer " + getToken() }
    });
    const plans = await res.json();
    cachedAdminPlans = plans;
    const list = el("adminPlansList");
    if (list) {
      list.innerHTML = "";
      plans.forEach(p => {
        const statusColor = p.is_active? "#00c853" : "#ff4d4d";
        const restrictBadge = p.restricted? `<span class="badge badgeWarning">RESTRICTED</span>` : '';
        const providerBadge = p.provider? `<span class="badge">${p.provider.toUpperCase()}</span>` : '';
        list.innerHTML += `<div class="planCard">
          <strong>${p.name}</strong> - ${p.network} ${restrictBadge} ${providerBadge}<br>
          Price: ${formatNaira(p.price)} | Top: ${formatNaira(p.top_price)} | Cost: ${formatNaira(p.cost)}<br>
          Provider: ${p.provider || 'N/A'} | Net ID: ${p.network_id || 'N/A'} | API ID: ${p.api_plan_id || 'N/A'}<br>
          <span style="color:${statusColor}">${p.is_active? 'Active' : 'Disabled'}</span>
          <button onclick="editPlan(${p.id})" class="primaryBtn">Edit</button>
          <button onclick="togglePlan(${p.id}, ${!p.is_active})" class="dangerBtn">${p.is_active? 'Disable' : 'Enable'}</button>
        </div>`;
      });
    }
  } catch {}
}

async function addPlan() {
  const plan = {
    plan_id: el("newPlanId")?.value,
    network: el("newPlanNetwork")?.value,
    name: el("newPlanName")?.value,
    price: el("newPlanPrice")?.value,
    top_price: el("newPlanTopPrice")?.value,
    cost: el("newPlanCost")?.value,
    validity: el("newPlanValidity")?.value,
    restricted: el("newPlanRestricted")?.checked,
    provider: el("newPlanProvider")?.value,
    network_id: el("newPlanNetworkId")?.value,
    api_plan_id: el("newPlanApiId")?.value
  };

  if (!plan.plan_id ||!plan.network ||!plan.name ||!plan.price ||!plan.cost ||!plan.provider ||!plan.network_id ||!plan.api_plan_id) {
    return showMsg("Fill all required fields including provider details", "error");
  }

  showLoader("Adding plan...");
  try {
    const res = await fetch(API + "/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify(plan)
    });
    const data = await res.json();
    hideLoader();
    showMsg(data.message, res.ok? "success" : "error");
    if (res.ok) {
      loadAdminPlans();
      loadPlans();
      ["newPlanId","newPlanName","newPlanPrice","newPlanTopPrice","newPlanCost","newPlanValidity","newPlanProvider","newPlanNetworkId","newPlanApiId"].forEach(id => {
        if (el(id)) el(id).value = "";
      });
      if (el("newPlanRestricted")) el("newPlanRestricted").checked = false;
    }
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}

async function togglePlan(id, is_active) {
  showLoader("Updating...");
  try {
    const res = await fetch(`${API}/admin/plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ is_active })
    });
    const data = await res.json();
    hideLoader();
    showMsg(data.message, res.ok? "success" : "error");
    if (res.ok) {
      loadAdminPlans();
      loadPlans();
    }
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}

async function editPlan(id) {
  const plan = cachedAdminPlans.find(p => p.id === id);
  if (!plan) return showMsg("Plan not found", "error");

  editingPlanId = id;

  if (el("editPlanName")) el("editPlanName").value = plan.name || "";
  if (el("editPlanPrice")) el("editPlanPrice").value = plan.price || "";
  if (el("editPlanTopPrice")) el("editPlanTopPrice").value = plan.top_price || "";
  if (el("editPlanCost")) el("editPlanCost").value = plan.cost || "";
  if (el("editPlanValidity")) el("editPlanValidity").value = plan.validity || "";
  if (el("editPlanRestricted")) el("editPlanRestricted").checked = plan.restricted || false;
  if (el("editPlanProvider")) el("editPlanProvider").value = plan.provider || "";
  if (el("editPlanNetworkId")) el("editPlanNetworkId").value = plan.network_id || "";
  if (el("editPlanApiId")) el("editPlanApiId").value = plan.api_plan_id || "";
  if (el("editPlanActive")) el("editPlanActive").checked = plan.is_active!== false;

  openModal("editPlanModal");
}

async function savePlanEdit() {
  if (!editingPlanId) return;

  const updated = {
    name: el("editPlanName")?.value,
    price: el("editPlanPrice")?.value,
    top_price: el("editPlanTopPrice")?.value,
    cost: el("editPlanCost")?.value,
    validity: el("editPlanValidity")?.value,
    restricted: el("editPlanRestricted")?.checked,
    provider: el("editPlanProvider")?.value,
    network_id: el("editPlanNetworkId")?.value,
    api_plan_id: el("editPlanApiId")?.value,
    is_active: el("editPlanActive")?.checked
  };

  if (!updated.name ||!updated.price ||!updated.cost ||!updated.provider ||!updated.network_id ||!updated.api_plan_id) {
    return showMsg("Name, Price, Cost, Provider, Network ID and API Plan ID are required", "error");
  }

  showLoader("Updating plan...");
  try {
    const res = await fetch(`${API}/admin/plans/${editingPlanId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify(updated)
    });
    const data = await res.json();
    hideLoader();
    closeModal("editPlanModal");
    showMsg(data.message, res.ok? "success" : "error");
    if (res.ok) {
      loadAdminPlans();
      loadPlans();
    }
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}

/* ================= ADMIN: USERS MANAGER ================= */
async function loadAdminUsers() {
  const search = el("userSearch")?.value || "";
  try {
    const res = await fetch(`${API}/admin/users?search=${search}`, {
      headers: { Authorization: "Bearer " + getToken() }
    });
    const users = await res.json();
    const list = el("adminUsersList");
    if (list) {
      list.innerHTML = "";
      users.forEach(u => {
        list.innerHTML += `<div class="userCard">
          <strong>${u.username}</strong> - ${u.email}<br>
          Wallet: ${formatNaira(u.wallet_balance)} | Phone: ${u.phone || 'N/A'}<br>
          Top User: ${u.is_top_user? 'Yes' : 'No'}<br>
          <button onclick="toggleUserTop(${u.id}, ${!u.is_top_user})" class="primaryBtn">
            ${u.is_top_user? 'Remove Top' : 'Make Top'}
          </button>
        </div>`;
      });
    }
  } catch {}
}

async function toggleUserTop(id, is_top_user) {
  showLoader("Updating...");
  try {
    const res = await fetch(`${API}/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ is_top_user })
    });
    const data = await res.json();
    hideLoader();
    showMsg(data.message, res.ok? "success" : "error");
    if (res.ok) loadAdminUsers();
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}

/* ================= ADMIN: WITHDRAWALS ================= */
async function loadWithdrawals() {
  try {
    const res = await fetch(API + "/admin/withdrawals", {
      headers: { Authorization: "Bearer " + getToken() }
    });
    const wds = await res.json();
    const list = el("withdrawalsList");
    if (list) {
      list.innerHTML = "";
      wds.forEach(w => {
        const statusColor = w.status === "PAID"? "#00c853" : w.status === "PENDING"? "#ffa000" : "#ff4d4d";
        list.innerHTML += `<div class="withdrawCard">
          <strong>${formatNaira(w.amount)}</strong> - ${w.bank_name}<br>
          ${w.account_number} - ${w.account_name}<br>
          <span style="color:${statusColor}">${w.status}</span>
          ${w.status === "PENDING"? `<button onclick="approveWithdrawal('${w.reference}')" class="primaryBtn">Mark Paid</button>` : ""}
        </div>`;
      });
    }
  } catch {}
}

async function requestWithdrawal() {
  const amount = el("withdrawAmount")?.value;
  const bank_name = el("withdrawBank")?.value;
  const account_number = el("withdrawAccountNumber")?.value;
  const account_name = el("withdrawAccountName")?.value;

  if (!amount ||!bank_name ||!account_number ||!account_name) {
    return showMsg("Fill all fields", "error");
  }

  showLoader("Creating request...");
  try {
    const res = await fetch(API + "/admin/withdraw-request", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ amount, bank_name, account_number, account_name })
    });
    const data = await res.json();
    hideLoader();
    showMsg(data.message, res.ok? "success" : "error");
    if (res.ok) {
      loadWithdrawals();
      loadDashboard();
    }
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}

async function approveWithdrawal(reference) {
  showLoader("Approving...");
  try {
    const res = await fetch(API + "/admin/withdraw/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
      body: JSON.stringify({ reference })
    });
    const data = await res.json();
    hideLoader();
    showMsg(data.message, res.ok? "success" : "error");
    if (res.ok) {
      loadWithdrawals();
      loadDashboard();
    }
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}


/* ================= REVERSAL ================= */
async function reverseTransaction() {
  const reference = el("reverseRef")?.value;
  if (!reference) return showMsg("Enter transaction reference", "error");

  showLoader("Reversing...");
  const res = await fetch(API + "/api/admin/reverse", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
    body: JSON.stringify({ reference })
  });
  const data = await res.json();
  hideLoader();
  showMsg(data.message, res.ok? "success" : "error");
  if (res.ok) fetchTransactions();
}

/* ================= ACCOUNT ================= */
async function loadAccount() {
  const res = await fetch(API + "/api/me", { headers: { Authorization: "Bearer " + getToken() } });
  const user = await res.json();

  if (el("bankName")) el("bankName").innerText = user.bank_name || "N/A";
  if (el("accountNumber")) el("accountNumber").innerText = user.account_number || "N/A";
  if (el("accountName")) el("accountName").innerText = user.account_name || "N/A";

  if (!user.account_number && el("generateAccountBtn")) {
    el("generateAccountBtn").style.display = "block";
  }

  updateWallet(user.wallet_balance);
}

async function generateAccount() {
  showLoader("Creating your dedicated account...");
  try {
    const res = await fetch(API + "/api/generate-account", {
      method: "POST",
      headers: { Authorization: "Bearer " + getToken() }
    });
    const data = await res.json();
    hideLoader();
    showMsg(data.message, res.ok? "success" : "error");
    if (res.ok) {
      if (el("generateAccountBtn")) el("generateAccountBtn").style.display = "none";
      await loadAccount();
    }
  } catch {
    hideLoader();
    showMsg("Server error", "error");
  }
}

/* ================= PASSWORD & PIN ================= */
async function submitPassword() {
  const oldPass = el("oldPassword").value;
  const newPass = el("newPassword").value;
  if (!oldPass ||!newPass) return showMsg("Fill fields", "error");

  showLoader("Updating...");
  const res = await fetch(API + "/api/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
    body: JSON.stringify({ oldPass, newPass })
  });
  const data = await res.json();
  hideLoader();
  showMsg(data.message, res.ok ? "success" : "error");
}

async function submitPin() {
  const oldPin = el("oldPin").value;
  const newPin = el("newPin").value;
  if (!oldPin ||!newPin) return showMsg("Fill fields", "error");

  showLoader("Updating...");
  const res = await fetch(API + "/api/change-pin", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getToken() },
    body: JSON.stringify({ oldPin, newPin })
  });
  const data = await res.json();
  hideLoader();
  showMsg(data.message, res.ok ? "success" : "error");
}

/* ================= ADMIN DATA LOADER ================= */
function loadAdminData() {
  loadProfitDashboard();
  loadTopUsers();
  loadWithdrawals();
  loadAdminPlans();
  loadAdminUsers();
}

/* ================= MODAL ================= */
function openModal(id) { el(id).style.display = "flex"; }
function closeModal(id) { el(id).style.display = "none"; }

/* ================= WS ================= */
function connectWebSocket() {
  const wsURL = API.replace("https", "wss");
  ws = new WebSocket(wsURL + "?token=" + getToken());
  ws.onmessage = msg => {
    const data = JSON.parse(msg.data);
    if (data.type === "wallet_update") updateWallet(data.balance);
  };
  ws.onerror = () => console.log("WS error");
  ws.onclose = () => setTimeout(connectWebSocket, 5000);
}

/* ================= LOGOUT ================= */
function logout() {
  if (ws) ws.close();
  localStorage.clear();
  window.location.href = "login.html";
}

/* ================= START ================= */
document.addEventListener("DOMContentLoaded", loadDashboard);