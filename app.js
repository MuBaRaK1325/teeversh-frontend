const API="https://mayconnect-backend-1.onrender.com"

let cachedPlans=[]
let currentUser=null
let ws=null

let selectedNetwork=null
let selectedPlan=null
let purchaseType=""

/* ================= HELPERS ================= */

function getToken(){
return localStorage.getItem("token")
}

function el(id){
return document.getElementById(id)
}

function showToast(msg){
const t=document.createElement("div")
t.innerText=msg

Object.assign(t.style,{
position:"fixed",
bottom:"30px",
left:"50%",
transform:"translateX(-50%)",
background:"#000",
padding:"12px 20px",
borderRadius:"8px",
color:"#fff",
zIndex:"9999"
})

document.body.appendChild(t)
setTimeout(()=>t.remove(),3000)
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

function loadDashboard(){

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

fetchTransactions()
loadPlans()

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

const res=await fetch(API+"/api/transactions",{
headers:{Authorization:"Bearer "+getToken()}
})

const tx=await res.json()

if(tx.length){
updateWallet(tx[0].wallet_balance)
}

const home=el("transactionHistory")
const all=el("allTransactions")

if(home){
home.innerHTML=""
tx.slice(0,5).forEach(t=>home.appendChild(txCard(t)))
}

if(all){
all.innerHTML=""
tx.forEach(t=>all.appendChild(txCard(t)))
}
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

/* ✅ FILTER BY USER TYPE */
cachedPlans = allPlans.filter(p=>{
if(currentUser.is_top_user){
return true
}else{
return p.is_top !== true
}
})
}

/* ================= NETWORK CLICK ================= */

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

/* ================= CONFIRM MODAL ================= */

function openConfirmModal(plan){

purchaseType="data"

const box=el("msgBox")

box.innerHTML=`
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

/* ================= PIN FLOW ================= */

function openPinModal(){
closeModal("msgModal")
openModal("pinModal")
}

function confirmPurchase(){

const pin=el("pinInput").value
if(!pin) return showToast("Enter PIN")

closeModal("pinModal")

if(purchaseType==="data") buyData(pin)
}

/* ================= BUY DATA ================= */

async function buyData(pin){

const phone=el("dataPhone").value

if(!phone || !selectedPlan){
showToast("Select plan & enter phone")
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

showToast("Success ✅")

showReceipt(
"DATA",
selectedPlan.price,
phone
)

fetchTransactions()

}else{
showError(data.message)
}
}

/* ================= ERROR MODAL ================= */

function showError(msg){

const box=el("msgBox")

box.innerHTML=`
<h3>❌ Failed</h3>
<p>${msg}</p>
<button onclick="closeModal('msgModal')">Close</button>
`

openModal("msgModal")
}

/* ================= RECEIPT ================= */

function showReceipt(type,amount,phone){

const box=el("receiptContent")

box.innerHTML=`
<h3>🧾 Receipt</h3>
<p>${type}</p>
<p>₦${amount}</p>
<p>${phone}</p>
<p>Status: SUCCESS</p>
<button onclick="closeModal('receiptModal')">Close</button>
`

openModal("receiptModal")
}

/* ================= BIOMETRIC ================= */

async function confirmBiometric(){

if(localStorage.getItem("biometric")!=="true"){
showToast("Enable biometric first")
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
showToast("Biometric failed")
}
}

/* ================= TOGGLE BIOMETRIC ================= */

function toggleBiometric(){

const state=localStorage.getItem("biometric")

if(state==="true"){
localStorage.setItem("biometric","false")
showToast("Biometric Disabled")
}else{
localStorage.setItem("biometric","true")
showToast("Biometric Enabled")
}
}

/* ================= CHANGE PASSWORD ================= */

async function submitPassword(){

const oldPass=el("oldPassword").value
const newPass=el("newPassword").value

if(!oldPass||!newPass) return showToast("Fill fields")

const res=await fetch(API+"/api/change-password",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({oldPass,newPass})
})

const data=await res.json()
showToast(data.message)

closeModal("passwordModal")
}

/* ================= CHANGE PIN ================= */

async function submitPin(){

const oldPin=el("oldPin").value
const newPin=el("newPin").value

if(!oldPin||!newPin) return showToast("Fill fields")

const res=await fetch(API+"/api/change-pin",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({oldPin,newPin})
})

const data=await res.json()
showToast(data.message)

closeModal("pinModalBox")
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