// server.js
// where your node app starts

// we've started you off with Express (https://expressjs.com/)
// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
const express = require("express");
const app = express();

const bodyParser = require("body-parser");
app.use(bodyParser.raw({ type: "*/*" }));

const morgan = require("morgan");
app.use(morgan("combined"));

const cors = require("cors");
app.use(cors());

app.get("/sourcecode", (req, res) => {
  res.send(
    require("fs")
      .readFileSync(__filename)
      .toString()
  );
});


//Users
let users = new Map();

function setPassword (username, password) {
  users.set(username, password);
}


//Sessions
let sessions = new Map();

function isValidToken(token) {
  if (sessions.has(token)) {
    return sessions.get(token)["username"];
  }
  return false;
}

function getToken() {
  let token = "";
  let chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 6; i++)
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

function setSession(username) {
  let token = getToken();
  sessions.set(token, {"username":username, "cart":[], "purchase":[]});
  return token;
}

// Listings 
let listings = []
let stats = []

function createListing(price, description, itemId, seller) {
  listings.push({"price":price,"description":description,"itemId":itemId,"sellerUsername":seller})
  stats.push({"itemId":itemId,"status":"available"})
}

function getId() {
  let token = "";
  let chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 7; i++)
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

function getListing(givenId){
  let listing = listings.find (obj => {
    return obj.itemId === givenId
  })
  if (listing !== undefined){
    return listing
  }
  return false
}

function listingBySeller(seller){
  let result = []
  for (let i =0;i<listings.length;i++){
    if(listings[i].sellerUsername === seller){
      result.push(listings[i])
    }
  }
  return result
}

function modifyPrice (givenId, price){
  for (let i = 0; i < listings.length; i++){
    if (listings[i].itemId === givenId){
      listings[i].price = price;
    }
  }
}

function modifyDescription(givenId, description){
  for (let i = 0; i < listings.length; i++){
    if (listings[i].itemId === givenId){
      listings[i].description = description;
    }
  }
}

// Cart
function addToCart (token, givenId) {
  let toAdd = getListing(givenId)
  sessions.get(token)["cart"].push(toAdd)
}

function sold (givenId){
  for (let i = 0; i<stats.length;i++){
    if(stats[i].itemId === givenId){
      stats[i].status = "sold"
    }
  }
}

function purchase (token){
  let cart = sessions.get(token)["cart"]
   for (let i = 0; i < cart.length; i++){
    for (let j = 0; j < listings.length; j++){
      if (listings[j].itemId === cart[i].itemId){
        sessions.get(token)["purchase"].push({"price": cart[i].price, "description": cart[i].description, "sellerUsername":cart[i].sellerUsername, "itemId": cart[i].itemId})
        sessions.get(token)["cart"].splice(j,1)
        sold(listings[j].itemId)
      }
    }
  }
}

function ship (givenId){
  for (let i = 0; i<stats.length;i++){
    if(stats[i].itemId === givenId){
      stats[i].status = "shipped"
    }
  }
}

function isSelling (seller,givenId){
  for(let i = 0;i<listings.length;i++){
    if (listings[i].sellerUsername === seller && listings[i].itemId === givenId){
      return true
    }
  }
  return false
}

function checkStatus (givenId){
  for (let i = 0; i<stats.length;i++){
    if(stats[i].itemId === givenId){
      return stats[i].status
    }
  }
}

function checkCart (token){
  let cart = sessions.get(token)["cart"]
  for(let i = 0; i < cart.length; i++){
    let status = checkStatus(cart[i].itemId)
    if (status !== "available"){
      return false
      break
    }
    return true
  }
}

//Chat
let chats = []

function sendMessage (destination, from, content){
  chats.push({"destination":destination,"from":from,"contents":content})
}

function seeMessages (from, destination){
  let messages = []
  for (let i = 0; i<chats.length;i++){
    if (chats[i].destination===destination && chats[i].from===from || chats[i].destination===from && chats[i].from===destination){
      messages.push({"from":chats[i].from,"contents":chats[i].contents})
    }
  }
  return messages
}

//Reviews
let reviews = new Map()

function addReview (itemId, buyer, stars, content){
  reviews.set(itemId,{"from":buyer,"numStars":stars,"contents":content})
}

function didUserPurchased(token, givenId){
  let purchases = sessions.get(token)["purchase"]
  for (let i = 0; i<purchases.length;i++){
    if (purchases[i].itemId === givenId){
      return true
    }
  }
  return false
}

function getReviewBySeller(seller){
  let results = []
  let sellerListings = listingBySeller(seller)
  for (let i =0;i<sellerListings.length;i++){
    let itemId = sellerListings[i].itemId
    if (reviews.has(itemId)){
      results.push(reviews.get(itemId))
    }
  }
  return results
}


//create an account
app.post("/signup", (req, res) => {
  let parsed = JSON.parse(req.body);
  if (!parsed.password) {
    res.send({"success": false, "reason": "password field missing" });
    return;
  }
  if (!parsed.username) {
    res.send({"success": false,"reason": "username field missing" });
    return;
  }
  if (users.has(parsed.username)) {
    res.send({"success": false,"reason": "Username exists" });
    return
  }
  setPassword(parsed.username,parsed.password)
  res.send({"success": true });
});

//login
app.post("/login", (req, res) => {
  let parsed = JSON.parse(req.body);
  let usr = parsed.username;
  if (!parsed.password) {
    res.send({"success": false,"reason": "password field missing" });
    return
  }
  if (!parsed.username) {
    res.send({"success": false,"reason": "username field missing" });
    return
  }
  if (!users.has(usr)) {
    res.send({"success": false,"reason": "User does not exist" });
    return
  }

  let typedPsw = parsed.password;
  let expectedPsw = users.get(usr);
  if (typedPsw !== expectedPsw) {
    res.send({"success": false,"reason": "Invalid password" });
    return
  }
  let token = setSession(usr);
  res.send({"success": true,"token": token });
});

//Change password
app.post("/change-password", (req, res) => {
  let parsed = JSON.parse(req.body);
  let token = req.get("token");
  if (!token) {
    res.send({"success": false,"reason": "token field missing" });
    return
  }
  let username = isValidToken(token);
  if (!username) {
    res.send({"success": false,"reason": "Invalid token" });
    return
  }

  let oldPsw = users.get(username)
  if (oldPsw !== parsed.oldPassword){
    res.send({"success": false,"reason": "Unable to authenticate" });
    return
  }
  setPassword(username,parsed.newPassword)
  res.send({"success": true });
})

//Create Listing
app.post("/create-listing", (req, res) => {
  let parsed = JSON.parse(req.body);
  let token = req.get("token");
  if (!token) {
    res.send({"success": false,"reason": "token field missing" });
    return
  }
  let username = isValidToken(token);
  if (!username) {
    res.send({"success": false,"reason": "Invalid token" });
    return
  }
  if (!parsed.price) {
    res.send({"success": false,"reason": "price field missing" });
    return
  }
  if (!parsed.description) {
    res.send({"success": false, "reason": "description field missing" });
    return
  }
  let listingId = getId()
  createListing(parsed.price,parsed.description,listingId,username)
  res.send({"success":true,"listingId":listingId})
})

//Get info on listing
app.get("/listing", (req, res) => {
  let itemId = req.query.listingId
  let listing = getListing(itemId)
  if(!listing){
    res.send({"success": false, reason: "Invalid listing id"});
    return
  }
  res.send({"success":true,"listing":listing})
})

//Modifify listing
app.post("/modify-listing", (req, res) => {
  let parsed = JSON.parse(req.body);
  let token = req.get("token");
  if (!token) {
    res.send({"success": false,"reason": "token field missing"});
    return
  }
  let username = isValidToken(token);
  if (!username) {
    res.send({"success": false,"reason": "Invalid token" });
    return
  }
  if (!parsed.itemid) {
    res.send({"success": false,"reason":"itemid field missing"});
    return
  }
  if (parsed.price){
    modifyPrice(parsed.itemid, parsed.price)
    res.send({"success":true})
  }
  if (parsed.description){
    modifyDescription(parsed.itemid, parsed.description)
    res.send({"success":true})
  }
})

//Add to cart
app.post("/add-to-cart", (req, res) => {
  let parsed = JSON.parse(req.body);
  let token = req.get("token");
  let username = isValidToken(token);
  if (!username) {
    res.send({"success": false,"reason": "Invalid token" });
    return
  }
  if (!parsed.itemid) {
    res.send({"success": false,"reason":"itemid field missing"});
    return
  }
  
  let listing = getListing(parsed.itemid)
  if(!listing){
    res.send({"success": false, reason: "Item not found"});
    return
  }
  addToCart(token,parsed.itemid)
  res.send({"success":true})
})

//See cart
app.get("/cart", (req, res) => {
  let token = req.get("token");
  let username = isValidToken(token);
  if (!username) {
    res.send({"success": false,"reason": "Invalid token" });
    return
  }
  res.send({"success":true,"cart": sessions.get(token)["cart"]})
})

//Checkout
app.post("/checkout", (req, res) => {
  let token = req.get("token");
  let username = isValidToken(token);
  if (!username) {
    res.send({"success": false,"reason": "Invalid token" });
    return
  }
  if (sessions.get(token)["cart"].length === 0){
    res.send({"success": false,"reason": "Empty cart" });
    return
  }
  
  let availableItems = checkCart(token)
  if (!availableItems){
    res.send({"success":false,"reason":"Item in cart no longer available"});
    return
  }
  purchase(token)
  res.send({"success":true})
})

//See purchase history
app.get("/purchase-history", (req, res) => {
  let token = req.get("token");
  let username = isValidToken(token);
  if (!username) {
    res.send({"success": false,"reason": "Invalid token" });
    return
  }
  res.send({"success":true,"purchased": sessions.get(token)["purchase"]})
})

//Chat
app.post("/chat", (req, res) => {
  let token = req.get("token");
  let username = isValidToken(token);
  if (!username) {
    res.send({"success": false,"reason": "Invalid token" });
    return
  }
  if (!JSON.parse(req.body).destination) {
    res.send({"success":false,"reason":"destination field missing"})
    return
  }
  if (!JSON.parse(req.body).contents){
    res.send({"success":false,"reason":"contents field missing"})
    return
  }
  if (!users.has(JSON.parse(req.body).destination)){
    res.send({"success":false,"reason":"Destination user does not exist"})
    return
  }
  sendMessage(JSON.parse(req.body).destination, username, JSON.parse(req.body).contents)
  res.send({"success":true})
})

//See messages
app.post("/chat-messages", (req, res) => {
  let token = req.get("token");
  let username = isValidToken(token);
  if (!username) {
    res.send({"success": false,"reason": "Invalid token" });
    return
  }
  if (!JSON.parse(req.body).destination){
    res.send({"success":false,"reason":"destination field missing"})
    return
  }
  if (!users.has(JSON.parse(req.body).destination)){
    res.send({"success":false,"reason":"Destination user not found"})
    return
  }
  let messages = seeMessages(username,JSON.parse(req.body).destination)
  res.send({"success":true, "messages":messages})
})

//Ship an item
app.post("/ship", (req, res) => {
  let token = req.get("token");
  let parsed = JSON.parse(req.body);
  let username = isValidToken(token);
  if (!username) {
    res.send({"success": false,"reason": "Invalid token" });
    return
  }
  if (!parsed.itemid) {
    res.send({"success": false,"reason":"itemid field missing"});
    return
  }
  let status = checkStatus(parsed.itemid)
  if (!isSelling(username,parsed.itemid)){
    res.send({"success":false,"reason":"User is not selling that item"})
    return
  }
  if (status === "available"){
    res.send({"success":false,"reason":"Item was not sold"})
    return
  }
  if (status === "shipped"){
    res.send({"success":false,"reason":"Item has already shipped"})
    return
  }
  ship(parsed.itemid)
  res.send({"success":true})
})

//Get shipping status
app.get("/status", (req,res) => {
  let itemId = req.query.itemid
  let status = checkStatus(itemId)
  if (status === "available"){
    res.send({"success":false,"reason":"Item not sold"})
    return
  }
  if (status === "shipped"){
    res.send({"success":true,"status":"shipped"})
    return
  }
  res.send({"success":true,"status":"not-shipped"})
})

//Review a seller
app.post("/review-seller", (req,res) => {
  let token = req.get("token");
  let parsed = JSON.parse(req.body);
  let username = isValidToken(token);
  if (!username) {
    res.send({"success": false,"reason": "Invalid token" });
    return
  }
  if (reviews.has(parsed.itemid)){
    res.send({"success":false,"reason":"This transaction was already reviewed"})
    return
  }
  if (!didUserPurchased(token,parsed.itemid)){
    res.send({"success":false,"reason":"User has not purchased this item"})
    return
  }
  addReview(parsed.itemid,username,parsed.numStars,parsed.contents)
  res.send({success:true})
})

//See seller reviews
app.get("/reviews", (req,res) => {
  let seller = req.query.sellerUsername
  let sellerReviews = getReviewBySeller(seller)
  res.send({success:true,reviews: sellerReviews})
})

//See all items that a user is currently selling
app.get("/selling", (req,res) => {
  if(!req.query.sellerUsername){
    res.send({"success":false,"reason":"sellerUsername field missing"})
  }
  let listings = listingBySeller(req.query.sellerUsername)
  res.send({"success": true, "selling": listings})
})


const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

  