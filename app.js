const backendUrl = "https://mayconnect-backend-1.onrender.com";

const walletBalance = document.getElementById("walletBalance");
const greeting = document.getElementById("greeting");
const plansGrid = document.getElementById("plansGrid");

let selectedPlan = null;

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", async () => {

  const token = localStorage.getItem("token");

  const name = localStorage.getItem("name");

  if (greeting) {
    greeting.textContent = `Hello, ${name}`;
  }

  if (walletBalance && token) {

    const res = await fetch(`${backendUrl}/api/wallet`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    walletBalance.textContent = `₦${data.balance}`;
  }

  if (plansGrid) {
    loadPlans();
  }

});

/* ================= LOAD PLANS ================= */

async function loadPlans() {

  const res = await fetch(`${backendUrl}/api/plans`);

  const plans = await res.json();

  plansGrid.innerHTML = "";

  plans.forEach(plan => {

    const div = document.createElement("div");

    div.className = "plan-card";

    div.innerHTML = `
      <h4>${plan.network}</h4>
      <small>${plan.name}</small>
      <div class="price">₦${plan.price}</div>
    `;

    div.onclick = () => {

      document
        .querySelectorAll(".plan-card")
        .forEach(p => p.classList.remove("selected"));

      div.classList.add("selected");

      selectedPlan = plan;

      document
        .getElementById("confirmOrderBtn")
        ?.classList.remove("hidden");

    };

    plansGrid.appendChild(div);

  });

}

/* ================= PURCHASE ================= */

async function confirmOrder() {

  const phone = document.getElementById("phone")?.value;

  if (!selectedPlan) {
    alert("Select plan");
    return;
  }

  const token = localStorage.getItem("token");

  const res = await fetch(`${backendUrl}/api/purchase`, {

    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },

    body: JSON.stringify({
      planId: selectedPlan.id,
      phone
    })

  });

  const data = await res.json();

  if (data.success) {
    alert("Purchase successful");
    location.reload();
  } else {
    alert(data.message);
  }

}

/* ================= SET PIN ================= */

async function submitSetPin() {

  const inputs = document.querySelectorAll("#setPinModal input");

  let pin = "";

  inputs.forEach(i => pin += i.value);

  const token = localStorage.getItem("token");

  await fetch(`${backendUrl}/api/set-pin`, {

    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },

    body: JSON.stringify({ pin })

  });

  alert("PIN saved");

  document.getElementById("setPinModal").classList.add("hidden");

}

/* ================= ADMIN WITHDRAW ================= */

async function adminWithdraw() {

  const amount = prompt("Amount");

  const token = localStorage.getItem("token");

  const res = await fetch(`${backendUrl}/api/admin/withdraw`, {

    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },

    body: JSON.stringify({ amount })

  });

  const data = await res.json();

  alert(data.message);

}