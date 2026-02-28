const API = "https://mayconnect-backend-1.onrender.com"

/* =========================
SOUNDS
========================= */

const welcomeSound = new Audio("/sounds/welcome.mp3")
const successSound = new Audio("/sounds/success.mp3")

/* =========================
HELPERS
========================= */

function token(){
return localStorage.getItem("token")
}

function authHeader(){
return {
Authorization:"Bearer "+token(),
"Content-Type":"application/json"
}
}

function logout(){
localStorage.removeItem("token")
window.location="login.html"
}

/* =========================
TAB SYSTEM (FIXED)
========================= */

function openTab(tabId){

const tabs = document.querySelectorAll(".tab")

tabs.forEach(tab=>{
tab.style.display="none"
})

const activeTab = document.getElementById(tabId)

if(activeTab){
activeTab.style.display="block"
}else{
console.warn("Tab not found:", tabId)
}

}

/* =========================
LOGIN
========================= */

async function login(){

const username=document.getElementById("username").value
const password=document.getElementById("password").value

const res = await fetch(API+"/api/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({username,password})
})

const data = await res.json()

if(!res.ok){
alert(data.message || "Login failed")
return
}

localStorage.setItem("token",data.token)
window.location="dashboard.html"
}

/* =========================
SIGNUP
========================= */

async function signup(){

const username=document.getElementById("username").value
const email=document.getElementById("email").value
const password=document.getElementById("password").value

const res = await fetch(API+"/api/signup",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({username,email,password})
})

const data = await res.json()

if(!res.ok){
alert(data.message)
return
}

localStorage.setItem("token",data.token)
window.location="dashboard.html"
}

/* =========================
LOAD DASHBOARD
========================= */

async function loadDashboard(){

const res = await fetch(API+"/api/me",{ headers:authHeader() })

if(res.status===401){
logout()
return
}

const user = await res.json()

document.getElementById("usernameDisplay").innerText = user.username
document.getElementById("walletBalance").innerText =
"₦"+Number(user.wallet_balance).toLocaleString()

welcomeSound.play()

// SHOW ADMIN BUTTON
if(user.is_admin){

const adminBtn=document.getElementById("adminBtn")
if(adminBtn){
adminBtn.style.display="block"
}

}

}

/* =========================
LOAD DATA PLANS
========================= */

async function loadPlans(){

const res = await fetch(API+"/api/plans")
const plans = await res.json()

const box=document.getElementById("plans")
if(!box) return

box.innerHTML=""

plans.forEach(p=>{
box.innerHTML+=`
<option value="${p.plan_id}">
${p.network} ${p.name} - ₦${Number(p.price).toLocaleString()}
</option>
`
})
}

/* =========================
BUY DATA
========================= */

async function buyData(){

const phone=document.getElementById("phone").value
const plan_id=document.getElementById("plans").value
const pin=prompt("Enter transaction PIN")

if(!pin) return

const res = await fetch(API+"/api/buy-data",{
method:"POST",
headers:authHeader(),
body:JSON.stringify({ phone, plan_id, pin })
})

const data = await res.json()

if(!res.ok){
alert(data.message)
return
}

successSound.play()
alert("Data purchase successful")

loadDashboard()
loadTransactions()
}

/* =========================
BUY AIRTIME
========================= */

async function buyAirtime(){

const phone=document.getElementById("airtimePhone").value
const network=document.getElementById("airtimeNetwork").value
const amount=document.getElementById("airtimeAmount").value
const pin=prompt("Enter PIN")

if(!pin) return

const res = await fetch(API+"/api/buy-airtime",{
method:"POST",
headers:authHeader(),
body:JSON.stringify({ phone, network, amount, pin })
})

const data = await res.json()

if(!res.ok){
alert(data.message)
return
}

successSound.play()
alert("Airtime sent successfully")

loadDashboard()
loadTransactions()
}

/* =========================
SET PIN
========================= */

async function setPin(){

const pin=document.getElementById("newPin").value
const confirm=document.getElementById("confirmPin").value

if(pin!==confirm){
alert("Pin does not match")
return
}

const res = await fetch(API+"/api/set-pin",{
method:"POST",
headers:authHeader(),
body:JSON.stringify({pin})
})

const data = await res.json()
alert(data.message)
}

/* =========================
TRANSACTIONS
========================= */

async function loadTransactions(){

const res = await fetch(API+"/api/transactions",{ headers:authHeader() })
const tx = await res.json()

const box=document.getElementById("transactions")
if(!box) return

box.innerHTML=""

tx.forEach(t=>{
box.innerHTML+=`
<div class="txCard">
<div>${t.type.toUpperCase()}</div>
<div>₦${Number(t.amount).toLocaleString()}</div>
<div>${new Date(t.created_at).toLocaleString()}</div>
</div>
`
})
}

/* =========================
ADMIN PROFIT
========================= */

async function loadAdmin(){

const res = await fetch(API+"/api/admin/profit",{ headers:authHeader() })

if(!res.ok){
return
}

const data = await res.json()

const bal=document.getElementById("adminBalance")
if(bal){
bal.innerText="₦"+Number(data.admin_wallet).toLocaleString()
}

}

/* =========================
ADMIN WITHDRAW
========================= */

async function adminWithdraw(){

const amount=document.getElementById("amount").value
const bank=document.getElementById("bank").value
const account_number=document.getElementById("account_number").value
const account_name=document.getElementById("account_name").value

const res = await fetch(API+"/api/admin/withdraw",{
method:"POST",
headers:authHeader(),
body:JSON.stringify({
amount,
bank,
account_number,
account_name
})
})

const data = await res.json()

if(!res.ok){
alert(data.message)
return
}

successSound.play()
alert("Withdrawal submitted")

loadAdmin()
}

/* =========================
MORE TAB LOADER
========================= */

function loadMoreTab(){
openTab("moreTab")
}

/* =========================
PAGE INIT
========================= */

window.addEventListener("DOMContentLoaded",()=>{

if(document.getElementById("usernameDisplay")){
loadDashboard()
loadPlans()
loadTransactions()
}

if(document.getElementById("adminBalance")){
loadAdmin()
}

})