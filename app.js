/* ================= CONFIG ================= */
const backendUrl = "https://mayconnect-backend-1.onrender.com";
const $ = id => document.getElementById(id);
const getToken = () => localStorage.getItem("token");
const adminEmail = "[abubakarmubarak3456@gmail.com](mailto:abubakarmubarak3456@gmail.com)";

/* ================= AUTH GUARD ================= */
(function authGuard() {
const path = location.pathname.toLowerCase();
const publicPages = ["login.html", "signup.html"];
const token = getToken();

if (!token && !publicPages.some(p => path.includes(p))) {
location.href = "login.html";
}
})();

/* ================= GLOBAL STATE ================= */
let selectedPlan = null;
let hasPin = false;
let isAdmin = false;

/* ================= NETWORK STATUS ================= */
const net = $("networkStatus");

function showNetwork(type) {
if (!net) return;

net.className = `network-status ${type}`;
net.textContent =
type === "slow"
? "Slow network detected"
: "You are offline";

net.classList.remove("hidden");

setTimeout(() => {
net.classList.add("hidden");
}, 3000);
}

window.addEventListener("offline", () => showNetwork("offline"));

/* ================= LOADER ================= */
const loader = $("splashLoader");
const loaderState = $("loaderState");

function showLoader() {
loader?.classList.remove("hidden");
loaderState.innerHTML = `<div class="splash-ring"></div>`;
}

function showSuccess() {
loaderState.innerHTML = `<div class="success-check">✓</div>`;
}

function hideLoader() {
loader?.classList.add("hidden");
}

/* ================= SOUND ================= */
const welcomeSound = $("welcomeSound");
const successSound = $("successSound");

function playSuccessSound() {
successSound?.play().catch(() => {});
}

/* ================= WALLET ================= */
async function updateWalletBalance() {
if (!getToken()) return;

try {
const res = await fetch(`${backendUrl}/api/wallet`, {
headers: {
Authorization: `Bearer ${getToken()}`
}
});

```
const data = await res.json();

if ($("walletBalance")) {
  $("walletBalance").textContent = `₦${data.balance || 0}`;
}
```

} catch (err) {
console.log("Wallet error", err);
}
}

/* ================= LOAD DATA PLANS FROM SERVER ================= */
async function loadPlans() {
const container = $("plansGrid");
if (!container) return;

try {
const res = await fetch(`${backendUrl}/api/plans`);
const plans = await res.json();

```
container.innerHTML = "";

plans.forEach(plan => {
  const div = document.createElement("div");
  div.className = "plan-card";

  div.innerHTML = `
    <small>${plan.network}</small>
    <h4>${plan.name}</h4>
    <small>${plan.validity || "Plan"}</small>
    <div class="price">₦${plan.price}</div>
  `;

  div.onclick = () => selectPlan(div, plan);
  container.appendChild(div);
});
```

} catch (err) {
console.log("Failed to load plans", err);
}
}

function selectPlan(card, plan) {
document.querySelectorAll(".plan-card").forEach(p => {
p.classList.remove("selected");
});

card.classList.add("selected");
selectedPlan = plan;

$("confirmOrderBtn")?.classList.remove("hidden");
}

/* ================= PIN MODAL ================= */
const pinInputs = document.querySelectorAll(".pin-inputs input");
let pinMode = "purchase";

function openPinModal(mode) {
pinMode = mode;

$("pinActionBtn").textContent =
mode === "set" ? "Verify PIN" : "Pay";

$("pinModal")?.classList.remove("hidden");
}

function closePinModal() {
$("pinModal")?.classList.add("hidden");
}

function clearPinInputs() {
pinInputs.forEach(i => (i.value = ""));
}

/* ================= CONFIRM ORDER ================= */
function confirmOrder() {
if (!selectedPlan) {
alert("Select a plan first");
return;
}

if (!$("phone")?.value) {
alert("Enter phone number");
return;
}

if (!hasPin) {
openPinModal("set");
return;
}

openPinModal("purchase");
}

/* ================= SUBMIT PIN ================= */
async function submitPin() {
const pin = [...pinInputs].map(i => i.value).join("");

if (!/^\d{4}$/.test(pin)) {
alert("Enter 4 digit PIN");
return;
}

showLoader();

try {

```
/* ===== SET PIN ===== */
if (pinMode === "set") {

  const res = await fetch(`${backendUrl}/api/set-pin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify({ pin })
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error);
  }

  hasPin = true;
  playSuccessSound();
  alert("PIN saved");

  closePinModal();
  return;
}

/* ===== PURCHASE ===== */
const res = await fetch(`${backendUrl}/api/wallet/purchase`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`
  },
  body: JSON.stringify({
    type: "data",
    pin,
    provider: selectedPlan.provider,
    details: {
      mobile_number: $("phone").value,
      plan: selectedPlan.plan_id || selectedPlan.id
    }
  })
});

const data = await res.json();

if (!res.ok) {
  throw new Error(data.error || "Purchase failed");
}

playSuccessSound();

$("receiptBody").innerHTML = `
  <div><b>Reference:</b> ${data.receipt.reference}</div>
  <div><b>Amount:</b> ₦${data.receipt.amount}</div>
  <div style="color:green"><b>Status:</b> SUCCESS</div>
`;

$("receiptModal")?.classList.remove("hidden");

updateWalletBalance();
closePinModal();
```

} catch (err) {
alert(err.message);
} finally {
hideLoader();
}
}

$("pinActionBtn")?.addEventListener("click", submitPin);

/* ================= MORE PANEL ================= */
function logout() {
localStorage.clear();
location.href = "login.html";
}

/* ================= CHECK PIN ================= */
async function checkPinStatus() {
try {
const res = await fetch(`${backendUrl}/api/wallet`, {
headers: {
Authorization: `Bearer ${getToken()}`
}
});

```
if (res.ok) {
  hasPin = true;
}
```

} catch {}
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", async () => {

welcomeSound?.play().catch(() => {});

const name = localStorage.getItem("name") || "User";
$("greeting").textContent = `Hello, ${name} 👋`;

const email = localStorage.getItem("email");
isAdmin = email === adminEmail;

await updateWalletBalance();
await loadPlans();
await checkPinStatus();

});

/* ================= AUTO WALLET REFRESH ================= */
setInterval(async () => {

if (!getToken()) return;

await updateWalletBalance();

}, 5 * 60 * 1000);
