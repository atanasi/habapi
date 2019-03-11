#! /usr/bin/env node
"use strict";

const { Logger, UrlFetchApp } = require('./gapi');
const Fiber = require('fibers');

const authData = require('./authdata');

function buyArmoire() {
 
   var url = "https://habitica.com/api/v3/user/buy-armoire";
   var response;
   
   //set paramaters
   var params = {
     "method" : "post",
     "headers" : {
       "x-api-user" : authData['id'], 
       "x-api-key" : authData['apitoken']
     }
   }
   var result;
  try {
   response = UrlFetchApp.fetch(url, params)
   result = JSON.parse(response);
  } catch (e) {
    console.log(e);
    return true;
  }
     Logger.log(result.message)
     if (result.data.armoire.type == 'food') {
       Logger.log("You gained " + result.data.armoire.dropText + ".")
     } else {
       Logger.log("You gained " + result.data.armoire.value + " " + result.data.armoire.type + ".")    
     }
   return false;
 }

function sleep(ms) {
    var fiber = Fiber.current;
    setTimeout(function() {
        fiber.run();
    }, ms);
    Fiber.yield();
}

function tryCast(fn) {
  var maxRetries = 5;
  var r = 0;
  
  while (true) {
    var retry = fn();
    if (retry) {
      if (r >= maxRetries) throw "too many retries";
      r++;
      sleep(200);
    } else break;
  }
  sleep(200);
}

function loop() {
  var a = process.argv[2];
  var n = parseInt(a);
  var retries = 0;
  for (var i=0; i < n; i++) {
    console.log ("buying armoire " + i);
    tryCast(buyArmoire);
  }
}

Fiber(loop).run();
