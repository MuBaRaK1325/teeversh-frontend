const API="https://mayconnect-backend-1.onrender.com"

let cachedPlans=[]
let currentBalance=0
let currentUser=null
let ws=null
let purchaseType=""

/* HELPERS */
function getToken(){return localStorage.getItem("token")}
function el(id){return document.getElementById(id)}

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

/* AUTH */
function checkAuth(){
if(!getToken()){
window.location.href="login.html"
return false
}
return true
}

/* DASHBOARD */
function loadDashboard(){

if(!checkAuth()) return

try{
currentUser = JSON.parse(atob(getToken().split(".")[1]))
}catch{
logout(); return
}

document.body.style.display="block"

if(el("usernameDisplay")){
el("usernameDisplay").innerText="Hello "+currentUser.username
}

if(currentUser.is_admin){
el("admin").style.display="block"
}

fetchTransactions()
loadPlans()
loadAdminProfit()
loadAccount()

setTimeout(connectWebSocket,1000)
}

/* WALLET */
function animateWallet(balance){
currentBalance=Number(balance||0)
if(el("walletBalance")){
el("walletBalance").innerText="₦"+currentBalance.toLocaleString()
}
}

/* TRANSACTIONS */
async function fetchTransactions(){
try{
const res=await fetch(API+"/api/transactions",{headers:{Authorization:"Bearer "+getToken()}})
const tx=await res.json()

if(tx.length){
animateWallet(tx[0].wallet_balance)
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

/* PLANS */
async function loadPlans(){
const res=await fetch(API+"/api/plans",{headers:{Authorization:"Bearer "+getToken()}})
cachedPlans=await res.json()
renderPlans()
}

function renderPlans(){
const list=el("planList")
if(!list) return

list.innerHTML=""

cachedPlans.forEach(p=>{
const div=document.createElement("div")
div.className="planItem"
div.innerHTML=`
<strong>${p.name}</strong><br>
${p.validity}<br>
₦${p.price}
`
div.onclick=()=>selectPlan(p.id)
list.appendChild(div)
})
}

let selectedPlan=null
function selectPlan(id){
selectedPlan=id
showToast("Plan Selected")
}

/* BUY DATA */
async function buyData(pin){

const phone=el("dataPhone").value

if(!phone || !selectedPlan){
showToast("Fill all fields")
return
}

const res=await fetch(API+"/api/buy-data",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},
body:JSON.stringify({phone,plan_id:selectedPlan,pin})
})

const data=await res.json()

if(res.ok){
showToast("Data Sent ✅")
showReceipt("DATA", data.amount || "—", phone)
fetchTransactions()
}else{
showToast(data.message)
}
}

/* BIOMETRIC */
async function confirmBiometric(){

if(localStorage.getItem("biometric")!=="true"){
showToast("Enable biometric first")
return
}

try{
await navigator.credentials.get({
publicKey:{challenge:new Uint8Array(32),timeout:60000}
})
}catch{}

if(purchaseType==="data") buyData("biometric")
}

/* TOGGLE BIOMETRIC */
function toggleBiometric(){
let state=localStorage.getItem("biometric")
localStorage.setItem("biometric", state==="true"?"false":"true")
showToast(state==="true"?"Disabled":"Enabled")
}

/* MODALS */
function openModal(id){el(id).style.display="flex"}
function closeModal(id){el(id).style.display="none"}

/* PASSWORD */
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

/* PIN */
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

/* RECEIPT */
function showReceipt(type,amount,phone){
el("receiptContent").innerHTML=`
<h3>🧾 Receipt</h3>
<p>${type}</p>
<p>₦${amount}</p>
<p>${phone}</p>
<button onclick="closeModal('receiptModal')">Close</button>
`
openModal("receiptModal")
}

/* FUND ACCOUNT */
async function loadAccount(){
try{
const res=await fetch(API+"/api/login",{headers:{Authorization:"Bearer "+getToken()}})
const user=await res.json()

el("bankName").innerText=user.bank_name||"N/A"
el("accountNumber").innerText=user.account_number||"N/A"
}catch{}
}

function copyAccount(){
navigator.clipboard.writeText(el("accountNumber").innerText)
showToast("Copied")
}

/* ADMIN */
async function loadAdminProfit(){
try{
const res=await fetch(API+"/api/admin/profits",{headers:{Authorization:"Bearer "+getToken()}})
if(!res.ok) return
const data=await res.json()
el("adminTotalProfit").innerText="₦"+data.total_profit
}catch{}
}

/* WS */
function connectWebSocket(){
const wsURL=API.replace("https","wss")
ws=new WebSocket(wsURL+"?token="+getToken())

ws.onmessage=(msg)=>{
const data=JSON.parse(msg.data)
if(data.type==="wallet_update"){
animateWallet(data.balance)
}
}
}

/* LOGOUT */
function logout(){
try{if(ws) ws.close()}catch{}
localStorage.clear()
window.location.href="login.html"
}

/* START */
document.addEventListener("DOMContentLoaded",loadDashboard)