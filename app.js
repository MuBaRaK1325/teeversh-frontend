const API="https://mayconnect-backend-1.onrender.com"

const welcomeSound=new Audio("sounds/welcome.mp3")
const successSound=new Audio("sounds/success.mp3")

let cachedPlans=[]

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

function animateWallet(balance){

const wallet=el("walletBalance")

if(wallet){
wallet.innerText="₦"+balance
}

}

/* ================= BIOMETRIC AUTH ================= */

async function biometricAuth(){

if(localStorage.getItem("biometric")!=="true") return true

if(!window.PublicKeyCredential){
showToast("Biometric not supported on this device")
return true
}

try{

const challenge=new Uint8Array(32)
window.crypto.getRandomValues(challenge)

await navigator.credentials.get({
publicKey:{
challenge:challenge,
timeout:60000,
userVerification:"preferred"
}
})

return true

}catch(e){

showToast("Biometric verification failed")

return false

}

}

/* ================= DASHBOARD ================= */

async function loadDashboard(){

const token=getToken()

if(!token){
window.location="login.html"
return
}

try{

const res=await fetch(API+"/api/me",{
headers:{Authorization:"Bearer "+token}
})

const user=await res.json()

el("usernameDisplay").innerText="Hello "+user.username

animateWallet(user.wallet_balance)

welcomeSound.play()

fetchTransactions()

loadPlans()

connectWalletWebSocket()

loadAdminProfit()

}catch{

showToast("Session expired")

window.location="login.html"

}

document.body.style.display="block"

}

/* ================= TRANSACTIONS ================= */

async function fetchTransactions(){

const res=await fetch(API+"/api/transactions",{
headers:{Authorization:"Bearer "+getToken()}
})

const tx=await res.json()

const container=el("transactionHistory")

if(!container)return

container.innerHTML=""

tx.slice(0,5).forEach(t=>{

const div=document.createElement("div")

div.className="transactionCard"

div.innerHTML=`
<strong>${t.type}</strong> ₦${t.amount}<br>
${t.phone||""}<br>
${t.status}<br>
<button onclick='showReceipt(${JSON.stringify(t)})'>Receipt</button>
`

container.appendChild(div)

})

}

async function loadAllTransactions(){

const res=await fetch(API+"/api/transactions",{
headers:{Authorization:"Bearer "+getToken()}
})

const tx=await res.json()

const container=el("allTransactions")

if(!container)return

container.innerHTML=""

tx.forEach(t=>{

const div=document.createElement("div")

div.className="transactionCard"

div.innerHTML=`
<strong>${t.type}</strong> ₦${t.amount}<br>
${t.phone||""}<br>
${t.status}<br>
${new Date(t.created_at).toLocaleString()}<br>
<button onclick='showReceipt(${JSON.stringify(t)})'>Receipt</button>
`

container.appendChild(div)

})

}

/* ================= DATA PLANS ================= */

async function loadPlans(){

const res=await fetch(API+"/api/plans")

const plans=await res.json()

cachedPlans=plans

updatePlans()

}

function updatePlans(){

const network=el("networkSelect")?.value
const select=el("planSelect")

if(!select)return

select.innerHTML=""

cachedPlans
.filter(p=>!network || p.network===network)
.forEach(plan=>{

const opt=document.createElement("option")

opt.value=plan.plan_id
opt.textContent=`${plan.name} - ₦${plan.price}`

select.appendChild(opt)

})

}

/* ================= BUY DATA ================= */

async function buyData(pin){

const phone=el("dataPhone").value
const planId=el("planSelect").value

if(!phone||!planId){
showToast("Fill all fields")
return
}

/* BIOMETRIC CHECK */

const bio=await biometricAuth()

if(!bio) return

try{

const res=await fetch(API+"/api/buy-data",{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},

body:JSON.stringify({
phone,
plan_id:planId,
pin
})

})

const data=await res.json()

if(data.success){

successSound.play()

showToast("Purchase successful")

fetchTransactions()

loadAdminProfit()

}else{

showToast(data.message||"Purchase failed")

}

}catch{

showToast("Network error")

}

}

/* ================= BUY AIRTIME ================= */

async function buyAirtime(pin){

const phone=el("airtimePhone").value
const amount=el("airtimeAmount").value

if(!phone || !amount){
showToast("Fill all fields")
return
}

/* BIOMETRIC CHECK */

const bio=await biometricAuth()

if(!bio) return

try{

const res=await fetch(API+"/api/buy-airtime",{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},

body:JSON.stringify({
phone,
amount,
pin
})

})

const data=await res.json()

if(data.success){

successSound.play()

showToast("Airtime sent successfully")

fetchTransactions()

loadAdminProfit()

}else{

showToast(data.message||"Purchase failed")

}

}catch{

showToast("Network error")

}

}

/* ================= RECEIPT ================= */

function showReceipt(t){

const text=`
📄 MAY CONNECT RECEIPT

Type: ${t.type}
Amount: ₦${t.amount}
Phone: ${t.phone||"-"}
Status: ${t.status}
Reference: ${t.reference||"-"}
Date: ${new Date(t.created_at).toLocaleString()}

Thank you for using MAY CONNECT
`

const share=encodeURIComponent(text)

const box=document.createElement("div")

Object.assign(box.style,{
position:"fixed",
top:"0",
left:"0",
width:"100%",
height:"100%",
background:"rgba(0,0,0,0.9)",
display:"flex",
alignItems:"center",
justifyContent:"center",
zIndex:"9999"
})

box.innerHTML=`

<div style="background:#08142c;padding:20px;border-radius:12px;width:90%;max-width:400px">

<h3>Transaction Receipt</h3>

<pre style="white-space:pre-wrap">${text}</pre>

<button onclick="window.open('https://wa.me/?text=${share}')">Share on WhatsApp</button>

<button onclick="navigator.clipboard.writeText('${t.reference||""}')">Copy Reference</button>

<button onclick="this.parentElement.parentElement.remove()">Close</button>

</div>
`

document.body.appendChild(box)

}

/* ================= BIOMETRIC TOGGLE ================= */

function toggleBiometric(){

const enabled=localStorage.getItem("biometric")==="true"

localStorage.setItem("biometric",!enabled)

showToast(!enabled?"Biometric enabled":"Biometric disabled")

}

/* ================= LOGOUT ================= */

function logout(){

localStorage.removeItem("token")

window.location="login.html"

}

/* ================= WEBSOCKET ================= */

let ws

function connectWalletWebSocket(){

const token=getToken()

ws=new WebSocket(API.replace(/^http/,"ws")+"?token="+token)

ws.onmessage=(msg)=>{

const data=JSON.parse(msg.data)

if(data.type==="wallet_update"){

animateWallet(data.balance)

fetchTransactions()

}

}

}

/* ================= ADMIN PROFIT ================= */

async function loadAdminProfit(){

if(!el("adminTotalProfit")) return

try{

const res=await fetch(API+"/api/admin/profits",{
headers:{Authorization:"Bearer "+getToken()}
})

const data=await res.json()

if(el("adminTotalProfit"))
el("adminTotalProfit").innerText="₦"+data.total_profit

}catch{

console.log("Profit API not ready")

}

}

setInterval(loadAdminProfit,30000)

/* ================= PASSWORD ================= */

function changePassword(){

const current=prompt("Current password")
const newPass=prompt("New password")
const confirm=prompt("Confirm new password")

if(newPass!==confirm){
showToast("Passwords do not match")
return
}

fetch(API+"/api/change-password",{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},

body:JSON.stringify({
currentPassword:current,
newPassword:newPass
})

}).then(r=>r.json()).then(d=>showToast(d.message))

}

/* ================= PIN ================= */

function changePin(){

const current=prompt("Current PIN")
const newPin=prompt("New PIN")
const confirm=prompt("Confirm new PIN")

if(newPin!==confirm){
showToast("PIN mismatch")
return
}

fetch(API+"/api/change-pin",{

method:"POST",

headers:{
"Content-Type":"application/json",
Authorization:"Bearer "+getToken()
},

body:JSON.stringify({
currentPin:current,
newPin:newPin
})

}).then(r=>r.json()).then(d=>showToast(d.message))

}

/* ================= START ================= */

document.addEventListener("DOMContentLoaded",()=>{

loadDashboard()

if(el("networkSelect")){
el("networkSelect").addEventListener("change",updatePlans)
}

})