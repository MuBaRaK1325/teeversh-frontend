const API="https://mayconnect-backend-1.onrender.com"

let cachedPlans=[]
let currentUser=null
let ws=null

let selectedNetwork=null
let selectedPlan=null

/* ================= HELPERS ================= */

function getToken(){ return localStorage.getItem("token") }
function el(id){ return document.getElementById(id) }

/* ================= MESSAGE ================= */

function showMsg(msg){
el("msgBox").innerHTML=`
<div style="text-align:center;color:white">
<p>${msg}</p>
<button onclick="closeModal('msgModal')" 
style="background:#6c5ce7;padding:12px;border:none;border-radius:10px;color:#fff;width:100%">
OK
</button>
</div>
`
openModal("msgModal")
}

/* ================= AUTH ================= */

function checkAuth(){
if(!getToken()){
window.location.href="login.html"
return false
}
return true
}

/* ================= LOAD ================= */

async function loadDashboard(){

if(!checkAuth()) return

try{
currentUser = JSON.parse(atob(getToken().split(".")[1]))
}catch{
logout()
return
}

document.body.style.display="block"

if(el("usernameDisplay")){
el("usernameDisplay").innerText="Hello "+currentUser.username
}

await loadAccount()
await loadPlans()
fetchTransactions()

setTimeout(connectWebSocket,1000)
}

/* ================= WALLET ================= */

function updateWallet(balance){
if(el("walletBalance")){
el("walletBalance").innerText="₦"+Number(balance).toLocaleString()
}
}

/* ================= TRANSACTIONS ================= */

async function fetchTransactions(){

try{
const res=await fetch(API+"/api/transactions",{
headers:{Authorization:"Bearer "+getToken()}
})

const tx=await res.json()

if(tx.length) updateWallet(tx[0].wallet_balance)

if(el("transactionHistory")){
el("transactionHistory").innerHTML=""
tx.slice(0,5).forEach(t=>el("transactionHistory").appendChild(txCard(t)))
}

}catch{}
}

function txCard(t){
const div=document.createElement("div")
div.className="transactionCard"
div.innerHTML=`
<strong>${t.type}</strong> ₦${t.amount}<br>
${t.phone||""}<br>
<span>${t.status}</span>
`
return div
}

/* ================= LOAD PLANS ================= */

async function loadPlans(){
const res=await fetch(API+"/api/plans",{
headers:{Authorization:"Bearer "+getToken()}
})

cachedPlans = await res.json()

console.log("PLANS:", cachedPlans) // DEBUG
}

/* ================= NETWORK SELECT ================= */

function selectNetwork(network, element){

selectedNetwork = network.toLowerCase()
selectedPlan = null

/* highlight */
document.querySelectorAll(".networkItem").forEach(n=>{
n.style.border="2px solid transparent"
})

element.style.border="3px solid #6c5ce7"
element.style.borderRadius="50%"

renderPlans()
}

/* ================= RENDER PLANS ================= */

function renderPlans(){

const list=el("planList")
if(!list) return

list.innerHTML=""

/* FIX: case-insensitive match */
const filtered = cachedPlans.filter(p=>
(p.network || "").toLowerCase() === selectedNetwork
)

if(!filtered.length){
list.innerHTML="<p style='color:white'>No plans available</p>"
return
}

filtered.forEach(p=>{

const div=document.createElement("div")
div.className="planItem"

div.style=`
background:#0c1a36;
padding:15px;
border-radius:12px;
margin-bottom:10px;
color:white;
`

div.innerHTML=`
<strong>${p.name}</strong><br>
<span style="color:#aaa">${p.validity}</span><br>
<span style="color:#6c5ce7;font-weight:bold">₦${p.price}</span>
`

div.onclick=()=>{
selectedPlan = p
openConfirmModal(p)
}

list.appendChild(div)

})
}

/* ================= CONFIRM MODAL ================= */

function openConfirmModal(plan){

el("msgBox").innerHTML=`
<div style="text-align:center;color:white">
<h3 style="color:#6c5ce7">Confirm Purchase</h3>
<p>${plan.name}</p>
<p>${plan.validity}</p>
<p style="font-size:20px">₦${plan.price}</p>

<button onclick="openPinModal()" style="background:#6c5ce7;margin-top:10px;padding:12px;border:none;border-radius:10px;color:#fff;width:100%">
Enter PIN
</button>

<button onclick="confirmBiometric()" style="margin-top:10px;padding:12px;border:none;border-radius:10px;width:100%">
Use Fingerprint
</button>

<button onclick="closeModal('msgModal')" style="margin-top:10px;padding:12px;width:100%">
Cancel
</button>
</div>
`

openModal("msgModal")
}

/* ================= PIN ================= */

function openPinModal(){
closeModal("msgModal")

/* FORCE modal visible */
el("pinModal").style.display="flex"
}

function confirmPurchase(){

const pin=el("pinInput").value

if(!pin) return showMsg("Enter PIN")

closeModal("pinModal")

buyData(pin)
}

/* ================= BUY DATA ================= */

async function buyData(pin){

const phone=el("dataPhone").value

if(!phone || !selectedPlan){
showMsg("Select plan & enter phone")
return
}

const res=await fetch(API+"/api/buy-data",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({
phone,
plan_id:selectedPlan.id,
pin
})
})

const data=await res.json()

if(res.ok){

showMsg("Purchase Successful ✅")

fetchTransactions()

}else{
showMsg(data.message)
}
}

/* ================= BIOMETRIC (REALISTIC, NO PASSKEY) ================= */

function confirmBiometric(){

if(localStorage.getItem("biometric")!=="true"){
showMsg("Enable biometric first")
return
}

/* simulate real biometric UI */
el("msgBox").innerHTML=`
<div style="text-align:center;color:white">
<h3>🔒 Biometric</h3>
<p>Touch fingerprint sensor...</p>

<button onclick="finishBiometric()" 
style="background:#6c5ce7;padding:12px;border:none;border-radius:10px;color:#fff;width:100%">
Continue
</button>
</div>
`

openModal("msgModal")
}

function finishBiometric(){
closeModal("msgModal")
buyData("biometric")
}

/* ================= TOGGLE BIOMETRIC ================= */

async function toggleBiometric(){

let state = localStorage.getItem("biometric")

if(state==="true"){
localStorage.setItem("biometric","false")
showMsg("Biometric Disabled ❌")
}else{

localStorage.setItem("biometric","true")

await fetch(API+"/api/biometric/enable",{
method:"POST",
headers:{Authorization:"Bearer "+getToken()}
})

showMsg("Biometric Enabled ✅")
}
}

/* ================= ACCOUNT ================= */

async function loadAccount(){

try{
const res=await fetch(API+"/api/me",{
headers:{Authorization:"Bearer "+getToken()}
})

const user=await res.json()

if(el("bankName")) el("bankName").innerText=user.bank_name||"N/A"
if(el("accountNumber")) el("accountNumber").innerText=user.account_number||"N/A"

}catch{}
}

/* ================= MODALS ================= */

function openModal(id){
if(el(id)) el(id).style.display="flex"
}

function closeModal(id){
if(el(id)) el(id).style.display="none"
}

/* ================= WS ================= */

function connectWebSocket(){

const wsURL=API.replace("https","wss")
ws=new WebSocket(wsURL+"?token="+getToken())

ws.onmessage=(msg)=>{
const data=JSON.parse(msg.data)
if(data.type==="wallet_update"){
updateWallet(data.balance)
}
}
}

/* ================= LOGOUT ================= */

function logout(){
try{ if(ws) ws.close() }catch{}
localStorage.clear()
window.location.href="login.html"
}

/* ================= START ================= */

document.addEventListener("DOMContentLoaded",loadDashboard)