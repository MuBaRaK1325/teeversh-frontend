const API="https://mayconnect-backend-1.onrender.com"

let cachedPlans=[]
let currentUser=null
let ws=null

let selectedNetwork=null
let selectedPlan=null
let purchaseType=""

/* ================= HELPERS ================= */

function getToken(){ return localStorage.getItem("token") }
function el(id){ return document.getElementById(id) }

function showMsg(msg){
if(!el("msgBox")) return alert(msg)

el("msgBox").innerHTML=`
<p>${msg}</p>
<button onclick="closeModal('msgModal')">Close</button>
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

/* ================= LOAD DASHBOARD ================= */

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

if(el("allTransactions")){
el("allTransactions").innerHTML=""
tx.forEach(t=>el("allTransactions").appendChild(txCard(t)))
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

const allPlans=await res.json()

cachedPlans = allPlans.filter(p=>{
if(currentUser.is_top_user){
return true
}else{
return p.is_top !== true
}
})
}

/* ================= NETWORK ================= */

function selectNetwork(network){
selectedNetwork = network
selectedPlan = null
renderPlans()
}

/* ================= RENDER PLANS ================= */

function renderPlans(){

const list=el("planList")
if(!list) return

list.innerHTML=""

const filtered = cachedPlans.filter(p=>p.network===selectedNetwork)

filtered.forEach(p=>{

const div=document.createElement("div")
div.className="planItem"

div.innerHTML=`
<strong>${p.name}</strong><br>
${p.validity}<br>
₦${p.price}
`

div.onclick=()=>{
selectedPlan = p
openConfirmModal(p)
}

list.appendChild(div)

})
}

/* ================= CONFIRM ================= */

function openConfirmModal(plan){

purchaseType="data"

el("msgBox").innerHTML=`
<h3>Confirm Purchase</h3>
<p>${plan.name}</p>
<p>${plan.validity}</p>
<p>₦${plan.price}</p>

<button onclick="openPinModal()">Enter PIN</button>
<button onclick="confirmBiometric()">Use Fingerprint</button>
<button onclick="closeModal('msgModal')">Cancel</button>
`

openModal("msgModal")
}

/* ================= PIN ================= */

function openPinModal(){
closeModal("msgModal")
openModal("pinModal")
}

function confirmPurchase(){

const pin=el("pinInput").value
if(!pin) return showMsg("Enter PIN")

closeModal("pinModal")

if(purchaseType==="data") buyData(pin)
}

/* ================= BUY DATA ================= */

async function buyData(pin){

const phone=el("dataPhone").value

if(!phone || !selectedPlan){
showMsg("Select plan and enter phone")
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

showReceipt("DATA", selectedPlan.price, phone)
fetchTransactions()

}else{
showMsg(data.message)
}
}

/* ================= BIOMETRIC ================= */

async function confirmBiometric(){

if(localStorage.getItem("biometric")!=="true"){
showMsg("Enable biometric first")
return
}

try{

await navigator.credentials.get({
publicKey:{
challenge:new Uint8Array(32),
timeout:60000
}
})

closeModal("msgModal")

if(purchaseType==="data"){
buyData("biometric")
}

}catch{
showMsg("Biometric failed")
}
}

/* ================= CHANGE PASSWORD ================= */

async function submitPassword(){

const oldPass=el("oldPassword").value
const newPass=el("newPassword").value

if(!oldPass||!newPass) return showMsg("Fill fields")

const res=await fetch(API+"/api/change-password",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({oldPass,newPass})
})

const data=await res.json()
showMsg(data.message)

closeModal("passwordModal")
}

/* ================= CHANGE PIN ================= */

async function submitPin(){

const oldPin=el("oldPin").value
const newPin=el("newPin").value

if(!oldPin||!newPin) return showMsg("Fill fields")

const res=await fetch(API+"/api/change-pin",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({oldPin,newPin})
})

const data=await res.json()
showMsg(data.message)

closeModal("pinModalBox")
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

function copyAccount(){
navigator.clipboard.writeText(el("accountNumber").innerText)
showMsg("Copied")
}

/* ================= MODALS ================= */

function openModal(id){
if(el(id)) el(id).style.display="flex"
}

function closeModal(id){
if(el(id)) el(id).style.display="none"
}

/* ================= NAVIGATION FIX ================= */

function showSection(id){
document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"))
if(el(id)) el(id).classList.add("active")
}

/* ================= WEBSOCKET ================= */

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