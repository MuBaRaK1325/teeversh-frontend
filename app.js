const API = "https://mayconnect-backend-1.onrender.com"
const token = localStorage.getItem("token")

/* ==============================
GLOBAL ERROR HANDLER (NO CRASH)
============================== */

window.onerror = function(msg, url, line, col, error){
console.error("Global Error:", msg)
showToast("Something went wrong ⚠️")
hideLoader()
return true
}

window.onunhandledrejection = function(e){
console.error("Promise Error:", e.reason)
showToast("Network issue ⚠️")
hideLoader()
}

/* ==============================
OFFLINE DETECTION
============================== */

window.addEventListener("offline",()=>{
showToast("⚠️ No internet connection")
})

window.addEventListener("online",()=>{
showToast("✅ Back online")
})

/* ==============================
SMART FETCH (AUTO RETRY)
============================== */

async function smartFetch(url, options={}, retries=2){

try{

const res = await fetch(url, options)

if(!res.ok){
if(retries > 0){
await new Promise(r=>setTimeout(r,1000))
return smartFetch(url, options, retries-1)
}
}

return res

}catch(err){

if(retries > 0){
await new Promise(r=>setTimeout(r,1000))
return smartFetch(url, options, retries-1)
}

throw err
}

}

/* ==============================
PAGE GUARD
============================== */

const page = window.location.pathname
const isLogin = page.endsWith("/") || page.includes("index.html")

if(!token && !isLogin){
window.location.href="index.html"
}

if(token && isLogin){
window.location.href="dashboard.html"
}

/* ==============================
SOUNDS
============================== */

const welcomeSound = new Audio("sounds/welcome.mp3")
const successSound = new Audio("sounds/success.mp3")

function playWelcome(){
welcomeSound.currentTime=0
welcomeSound.play().catch(()=>{})
}

function playSuccess(){
successSound.currentTime=0
successSound.play().catch(()=>{})
}

/* ==============================
LOADER (SAFE)
============================== */

function hideLoader(){

const loader=document.getElementById("splashLoader")
if(!loader) return

loader.classList.add("hide")

setTimeout(()=>{
loader.style.display="none"
},500)

}

/* force hide loader after 5s */

setTimeout(()=>{ hideLoader() },5000)

/* ==============================
TOAST
============================== */

function showToast(msg){

const toast=document.createElement("div")
toast.className="toast"
toast.innerText=msg

document.body.appendChild(toast)

setTimeout(()=>toast.remove(),3000)

}

/* ==============================
NETWORK PREFIX
============================== */

const NETWORK_PREFIX={
MTN:["0803","0806","0813","0816","0703","0706","0903","0906","0913","0916"],
AIRTEL:["0802","0808","0812","0701","0708","0901","0902","0907"],
GLO:["0805","0807","0811","0705","0905"],
"9MOBILE":["0809","0817","0818","0908","0909"]
}

/* ==============================
PHONE FORMAT
============================== */

function normalizePhone(phone){
return phone.replace(/\D/g,"")
}

function formatPhone(phone){

phone=normalizePhone(phone)

if(phone.startsWith("0")) return "+234"+phone.substring(1)
if(phone.startsWith("234")) return "+"+phone

return phone

}

/* ==============================
DETECT NETWORK
============================== */

function detectNetwork(phone){

phone=normalizePhone(phone)

const prefix=phone.substring(0,4)

for(const net in NETWORK_PREFIX){
if(NETWORK_PREFIX[net].includes(prefix)){
return net
}
}

return null

}

/* ==============================
NETWORK LOGO
============================== */

function showNetworkLogo(network){

const logo=document.getElementById("networkLogo")
if(!logo) return

const logos={
MTN:"logos/mtn.png",
AIRTEL:"logos/airtel.png",
GLO:"logos/glo.png",
"9MOBILE":"logos/9mobile.png"
}

if(network && logos[network]){
logo.src=logos[network]
logo.style.display="block"
}else{
logo.style.display="none"
}

}

/* ==============================
PHONE INPUT
============================== */

let typingTimer=null

function handlePhoneInput(input){

let phone=normalizePhone(input.value)

if(phone.length>11) phone=phone.slice(0,11)

input.value=phone

clearTimeout(typingTimer)

typingTimer=setTimeout(()=>{

if(phone.length>=4){

const network=detectNetwork(phone)

showNetworkLogo(network)

if(network){
loadPlans(network)
}

}

},400)

}

/* ==============================
SAVE RECIPIENT (FIXED)
============================== */

function saveRecipient(phone){

let contacts=JSON.parse(localStorage.getItem("recipients")||"[]")

if(!contacts.includes(phone)){
contacts.push(phone)
localStorage.setItem("recipients",JSON.stringify(contacts))
}

}

/* ==============================
LOGIN
============================== */

async function login(){

try{

const username=document.getElementById("loginUsername").value
const password=document.getElementById("loginPassword").value

const res=await smartFetch("${API}/api/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({username,password})
})

const data=await res.json()

if(!res.ok){
alert(data.message)
return
}

localStorage.setItem("token",data.token)

window.location.replace("dashboard.html")

}catch(err){
showToast("Login failed ⚠️")
}

}

/* ==============================
DASHBOARD
============================== */

async function loadDashboard(){

if(!token) return

try{

const res=await smartFetch("${API}/api/me",{
headers:{Authorization:"Bearer ${token}"}
})

if(!res.ok) throw new Error()

const user=await res.json()

const name=document.getElementById("usernameDisplay")
if(name){
name.innerText="Hello 👋 ${user.username}"
}

animateBalance(Number(user.wallet_balance||0))

if(user.is_admin){
const adminPanel=document.getElementById("adminPanel")
if(adminPanel) adminPanel.style.display="block"
}

loadTransactions()
playWelcome()

}catch(err){

showToast("Session expired")

localStorage.removeItem("token")

setTimeout(()=>{
window.location.replace("index.html")
},1500)

}

hideLoader()

}

if(page.includes("dashboard.html")){
window.addEventListener("load",loadDashboard)
}

/* ==============================
BALANCE
============================== */

function animateBalance(balance){

const el=document.getElementById("walletBalance")
if(!el) return

let start=0
const step=balance/40

const timer=setInterval(()=>{

start+=step

if(start>=balance){
el.innerText="₦"+balance.toLocaleString()
clearInterval(timer)
}else{
el.innerText="₦"+Math.floor(start).toLocaleString()
}

},30)

}

/* ==============================
LOAD PLANS
============================== */

async function loadPlans(network){

const container=document.getElementById("plans")
if(!container) return

try{

const res=await smartFetch("${API}/api/plans?network=${network}",{
headers:{Authorization:"Bearer ${token}"}
})

let plans=await res.json()

if(!Array.isArray(plans)) return

const unique=[...new Map(plans.map(p=>[p.plan_id,p])).values()]
unique.sort((a,b)=>a.price-b.price)

container.innerHTML=""

unique.forEach(plan=>{
container.innerHTML+=`

<div class="planCard">
<h4>${plan.plan_name}</h4>
<p>₦${Number(plan.price).toLocaleString()}</p>
<button onclick="openPinModal(${plan.plan_id},'data')">Buy</button>
</div>
`
})}catch(err){
showToast("Failed to load plans")
}

}

/* ==============================
PURCHASE
============================== */

let selectedPlan=null
let purchaseType=null

function openPinModal(id,type){
selectedPlan=id
purchaseType=type
document.getElementById("pinModal").style.display="flex"
}

function closePinModal(){
document.getElementById("pinModal").style.display="none"
}

async function confirmPurchase(){

try{

const phone=formatPhone(document.getElementById("phone").value)
const pin=document.getElementById("pin").value

let endpoint=""
let body={}

if(purchaseType==="data"){
endpoint="/api/buy-data"
body={plan_id:selectedPlan,phone,pin}
}

if(purchaseType==="airtime"){
const amount=document.getElementById("airtimeAmount").value
const network=detectNetwork(phone)
endpoint="/api/buy-airtime"
body={network,phone,amount,pin}
}

const res=await smartFetch("${API}${endpoint}",{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:"Bearer ${token}"
},
body:JSON.stringify(body)
})

const data=await res.json()

if(!res.ok){
alert(data.message)
return
}

playSuccess()
showToast("✅ Purchase Successful")

closePinModal()
saveRecipient(phone)

if(page.includes("dashboard")){
loadDashboard()
}

}catch(err){
showToast("Transaction failed ⚠️")
}

}

/* ==============================
LOGOUT
============================== */

function logout(){
localStorage.removeItem("token")
window.location.replace("index.html")
}