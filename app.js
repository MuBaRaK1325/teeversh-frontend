const API="https://mayconnect-backend-1.onrender.com"

let cachedPlans=[]
let currentUser=null
let selectedPlan=null
let selectedNetwork=null
let ws=null

/* HELPERS */
function getToken(){return localStorage.getItem("token")}
function el(id){return document.getElementById(id)}

function showMsg(msg){
el("msgBox").innerText=msg
openModal("msgModal")
}

/* AUTH */
function checkAuth(){
if(!getToken()){
window.location.href="login.html"
return false
}
return true
}

/* LOAD DASHBOARD */
async function loadDashboard(){

if(!checkAuth()) return

try{
currentUser = JSON.parse(atob(getToken().split(".")[1]))
}catch{
logout(); return
}

document.body.style.display="block"
el("usernameDisplay").innerText="Hello "+currentUser.username

await loadAccount()
await loadPlans()
fetchTransactions()

setTimeout(connectWebSocket,1000)
}

/* WALLET */
function updateWallet(balance){
el("walletBalance").innerText="₦"+Number(balance||0).toLocaleString()
}

/* TRANSACTIONS */
async function fetchTransactions(){
try{
const res=await fetch(API+"/api/transactions",{headers:{Authorization:"Bearer "+getToken()}})
const tx=await res.json()

if(tx.length) updateWallet(tx[0].wallet_balance)

const home=el("transactionHistory")
const all=el("allTransactions")

home.innerHTML=""
all.innerHTML=""

tx.slice(0,5).forEach(t=>home.appendChild(txCard(t)))
tx.forEach(t=>all.appendChild(txCard(t)))

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

/* LOAD PLANS */
async function loadPlans(){
const res=await fetch(API+"/api/plans",{headers:{Authorization:"Bearer "+getToken()}})
cachedPlans=await res.json()
}

/* SELECT NETWORK */
function selectNetwork(network){
selectedNetwork=network
renderPlans()
}

/* RENDER PLANS */
function renderPlans(){

const list=el("planList")
list.innerHTML=""

const filtered = cachedPlans.filter(p=>p.network===selectedNetwork)

filtered.forEach(p=>{

const price = currentUser.is_top_user && p.top_price ? p.top_price : p.price

const div=document.createElement("div")
div.className="planItem"
div.innerHTML=`
<strong>${p.name}</strong><br>
${p.validity}<br>
₦${price}
`

div.onclick=()=>{
selectedPlan=p
highlightPlan(div)
openModal("confirmModal")
}

list.appendChild(div)
})
}

/* HIGHLIGHT */
function highlightPlan(elm){
document.querySelectorAll(".planItem").forEach(p=>p.classList.remove("active"))
elm.classList.add("active")
}

/* BUY DATA */
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

/* BIOMETRIC (REAL FLOW READY) */
async function confirmBiometric(){

try{
const challenge = new Uint8Array(32)
crypto.getRandomValues(challenge)

await navigator.credentials.get({
publicKey:{
challenge,
timeout:60000,
userVerification:"required"
}
})

await buyData("biometric")

}catch{
showMsg("Biometric failed")
}
}

/* PASSWORD */
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

/* PIN */
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

/* RECEIPT */
function showReceipt(type,amount,phone){

el("receiptContent").innerHTML=`
<h3>🧾 Receipt</h3>
<p>${type}</p>
<p>₦${amount}</p>
<p>${phone}</p>
<p>SUCCESS</p>
<button onclick="closeModal('receiptModal')">Close</button>
`

openModal("receiptModal")
}

/* ACCOUNT */
async function loadAccount(){
const res=await fetch(API+"/api/me",{headers:{Authorization:"Bearer "+getToken()}})
const user=await res.json()

el("bankName").innerText=user.bank_name||"N/A"
el("accountNumber").innerText=user.account_number||"N/A"
}

/* WS */
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

/* LOGOUT */
function logout(){
try{if(ws) ws.close()}catch{}
localStorage.clear()
window.location.href="login.html"
}

/* INIT */
document.addEventListener("DOMContentLoaded",loadDashboard)