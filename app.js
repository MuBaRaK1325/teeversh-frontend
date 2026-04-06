const API="https://mayconnect-backend-1.onrender.com"

const welcomeSound=new Audio("sounds/welcome.mp3")
const successSound=new Audio("sounds/success.mp3")

let cachedPlans=[]
let currentBalance=0
let currentUser=null
let ws=null
let hasPlayedWelcome=false

/* ================= HELPERS ================= */

function getToken(){
return localStorage.getItem("token")
}

function el(id){
return document.getElementById(id)
}

function showLoader(){
if(el("loader")) el("loader").style.display="flex"
}

function hideLoader(){
if(el("loader")) el("loader").style.display="none"
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
const token=getToken()
if(!token){
window.location.replace("index.html")
return false
}
return true
}

/* ================= DASHBOARD ================= */

function loadDashboard(){

if(!checkAuth()) return

showLoader()

let payload

try{
payload = JSON.parse(atob(getToken().split(".")[1]))
}catch{
logout()
return
}

currentUser = payload

/* SHOW UI IMMEDIATELY (NO MORE STUCK SCREEN) */
document.body.style.display="block"

/* USER */
if(el("usernameDisplay")){
el("usernameDisplay").innerText="Hello "+payload.username
}

/* ADMIN */
if(payload.is_admin && el("admin")){
el("admin").style.display="block"
}

/* SOUND ONCE */
if(!hasPlayedWelcome){
welcomeSound.play().catch(()=>{})
hasPlayedWelcome=true
}

/* 🔥 IMPORTANT: DO NOT AWAIT */
fetchTransactions()
loadPlans()
loadAdminProfit()

/* WS */
setTimeout(connectWebSocket,1000)

/* HIDE LOADER FAST */
setTimeout(hideLoader,500)

}

/* ================= WALLET ================= */

function animateWallet(balance){
currentBalance=Number(balance||0)

if(el("walletBalance")){
el("walletBalance").innerText="₦"+currentBalance.toLocaleString()
}
}

/* ================= TRANSACTIONS ================= */

async function fetchTransactions(){

try{

const res=await fetch(API+"/api/transactions",{
headers:{Authorization:"Bearer "+getToken()}
})

if(!res.ok) return

const tx=await res.json()

if(tx.length){
animateWallet(tx[0].wallet_balance || 0)
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

}catch(err){
console.log("TX ERROR:", err)
}

}

function txCard(t){

const div=document.createElement("div")
div.className="transactionCard"

div.innerHTML=`
<strong>${t.type}</strong> ₦${t.amount}<br>
${t.phone||""}<br>
<span>${t.status}</span><br>
<button onclick='showReceipt(${JSON.stringify(t)})'>Receipt</button>
`

return div
}

/* ================= RECEIPT ================= */

function showReceipt(t){

if(!el("receiptContent")) return

el("receiptContent").innerHTML=`
<p><b>Type:</b> ${t.type}</p>
<p><b>Amount:</b> ₦${t.amount}</p>
<p><b>Phone:</b> ${t.phone||"-"}</p>
<p><b>Status:</b> ${t.status}</p>
`

el("receiptModal").style.display="flex"
}

function closeReceipt(){
if(el("receiptModal")) el("receiptModal").style.display="none"
}

/* ================= PLANS ================= */

async function loadPlans(){

try{

const res=await fetch(API+"/api/plans",{
headers:{Authorization:"Bearer "+getToken()}
})

if(!res.ok) return

const plans=await res.json()

cachedPlans=plans.filter(p=>p.company===currentUser.company)

updatePlans()

}catch(err){
console.log("PLANS ERROR:", err)
}

}

function updatePlans(){

const network=el("networkSelect")?.value
const select=el("planSelect")

if(!select) return

select.innerHTML=""

cachedPlans
.filter(p=>!network || p.network===network)
.forEach(plan=>{
const opt=document.createElement("option")
opt.value=plan.id
opt.textContent=`${plan.name} - ₦${plan.price}`
select.appendChild(opt)
})

}

/* ================= BUY ================= */

async function buyData(pin){

const phone=el("dataPhone").value
const planId=el("planSelect").value

if(!phone || !planId){
showToast("Fill all fields")
return
}

try{

const res=await fetch(API+"/api/buy-data",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({phone,plan_id:planId,pin})
})

const data=await res.json()

if(res.ok){
successSound.play()
showToast("Success")
fetchTransactions()
}else{
showToast(data.message||"Failed")
}

}catch{
showToast("Network error")
}

}

/* ================= ADMIN ================= */

async function loadAdminProfit(){

if(!el("adminTotalProfit")) return

try{

const res=await fetch(API+"/api/admin/profits",{
headers:{Authorization:"Bearer "+getToken()}
})

if(!res.ok) return

const data=await res.json()

el("adminTotalProfit").innerText="₦"+(data.total_profit||0)

}catch(err){
console.log("ADMIN ERROR:", err)
}

}

function toggleBiometric(){
const val=localStorage.getItem("biometric")==="true"
localStorage.setItem("biometric",(!val))
showToast("Biometric "+(!val?"Enabled":"Disabled"))
}

/* ================= WS ================= */

function connectWebSocket(){

if(ws){
try{ws.close()}catch{}
}

try{

const wsURL=API.replace("https","wss")

ws=new WebSocket(wsURL+"?token="+getToken())

ws.onmessage=(msg)=>{
const data=JSON.parse(msg.data)

if(data.type==="wallet_update"){
animateWallet(data.balance)
fetchTransactions()
}
}

ws.onclose=()=>{
setTimeout(connectWebSocket,5000)
}

}catch(err){
console.log("WS ERROR:", err)
}

}

/* ================= LOGOUT ================= */

function logout(){

try{
if(ws) ws.close()
}catch{}

localStorage.clear()

/* 🔥 FINAL FIX */
window.location.replace("index.html")

}

/* ================= START ================= */

document.addEventListener("DOMContentLoaded",()=>{

loadDashboard()

if(el("networkSelect")){
el("networkSelect").addEventListener("change",updatePlans)
}

})