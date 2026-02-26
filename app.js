const API = "https://your-backend-url.onrender.com"

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
LOGIN
========================= */

async function login(){

const username=document.getElementById("username").value
const password=document.getElementById("password").value

try{

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

}catch(err){

alert("Server error")

}

}

/* =========================
SIGNUP
========================= */

async function signup(){

const username=document.getElementById("username").value
const email=document.getElementById("email").value
const password=document.getElementById("password").value

try{

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

}catch(err){

alert("Signup error")

}

}

/* =========================
LOAD USER (DASHBOARD)
========================= */

async function loadDashboard(){

try{

const res = await fetch(API+"/api/me",{
headers:authHeader()
})

if(res.status===401){
logout()
return
}

const user = await res.json()

document.getElementById("usernameDisplay").innerText=user.username
document.getElementById("walletBalance").innerText="₦"+user.wallet_balance

welcomeSound.play()

if(user.is_admin){

const adminBtn=document.getElementById("adminBtn")

if(adminBtn){
adminBtn.style.display="block"
}

}

}catch(err){

console.log(err)

}

}

/* =========================
LOAD DATA PLANS
========================= */

async function loadPlans(){

try{

const res = await fetch(API+"/api/plans")
const plans = await res.json()

const box=document.getElementById("plans")

if(!box) return

box.innerHTML=""

plans.forEach(p=>{

box.innerHTML+=`
<option value="${p.plan_id}">
${p.network} ${p.name} - ₦${p.price}
</option>
`

})

}catch(err){

console.log(err)

}

}

/* =========================
BUY DATA
========================= */

async function buyData(){

const phone=document.getElementById("phone").value
const plan_id=document.getElementById("plans").value
const pin=prompt("Enter transaction PIN")

if(!pin) return

try{

const res = await fetch(API+"/api/buy-data",{

method:"POST",

headers:authHeader(),

body:JSON.stringify({
phone,
plan_id,
pin
})

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

}catch(err){

alert("Transaction error")

}

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

try{

const res = await fetch(API+"/api/buy-airtime",{

method:"POST",

headers:authHeader(),

body:JSON.stringify({
phone,
network,
amount,
pin
})

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

}catch(err){

alert("Airtime error")

}

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

try{

const res = await fetch(API+"/api/set-pin",{

method:"POST",

headers:authHeader(),

body:JSON.stringify({pin})

})

const data = await res.json()

alert(data.message)

}catch(err){

alert("Pin error")

}

}

/* =========================
TRANSACTIONS
========================= */

async function loadTransactions(){

try{

const res = await fetch(API+"/api/transactions",{
headers:authHeader()
})

const tx = await res.json()

const box=document.getElementById("transactions")

if(!box) return

box.innerHTML=""

tx.forEach(t=>{

box.innerHTML+=`

<div class="txCard">

<div>${t.type.toUpperCase()}</div>

<div>₦${t.amount}</div>

<div>${new Date(t.created_at).toLocaleString()}</div>

</div>

`

})

}catch(err){

console.log(err)

}

}

/* =========================
ADMIN PAGE
========================= */

async function loadAdmin(){

try{

const res = await fetch(API+"/api/admin/profit",{
headers:authHeader()
})

const data = await res.json()

document.getElementById("adminBalance").innerText="₦"+data.admin_wallet

}catch(err){

console.log(err)

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

try{

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

}catch(err){

alert("Withdraw error")

}

}

/* =========================
MORE TAB
========================= */

function openTab(tab){

const tabs=document.querySelectorAll(".tab")

tabs.forEach(t=>t.style.display="none")

document.getElementById(tab).style.display="block"

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

})