#! /usr/bin/env node
"use strict";

const { Logger, UrlFetchApp } = require('./gapi');
const Fiber = require('fibers');

const authData = require('./authdata');

function fetchProfile() {
   var url = "https://habitica.com/api/v3/members/"+authData["id"];
   var response;
   
   //set paramaters
   var params = {
     "method" : "get",
     "headers" : {
       "x-api-user" : authData['id'], 
       "x-api-key" : authData['apitoken']
     }
   }
   var result;
   response = UrlFetchApp.fetch(url, params)
   result = JSON.parse(response);
   if (result.success) return result.data;
   else {
     console.log(result);
     throw "InvalidResponse";
   }
}

function spellCaster(spellCode) {
  if (!spellCode) spellCode = "earth";
  return function () {
    var params = {
       "method" : "post",
       "headers" : {
         "x-api-user" : authData['id'], 
         "x-api-key" : authData['apitoken']
       }
     }
     
     // console.log("casting");
     var result;
     try {
      var resp = UrlFetchApp.fetch("https://habitica.com/api/v3/user/class/cast/"+spellCode, params);
      result = JSON.parse(resp);
     } catch(e) {
       console.log(e);
       return true;
     }
     var msg = "failed";
     if (result.success) msg = "success";
     else throw "cast failed";
     // console.log(msg);
     return false;
  };
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

function spellInfo(offset) {
  var p = fetchProfile();
  var cl = p.stats.class;

  var spellName;
  var spellCode;
  var spellCost;
  
  if (cl==='wizard') {
  spellName = "earthquake";
  spellCode = "earth";
  spellCost = 35.0;
  } else if (cl==='healer') {
  spellName = "protective aura";
  spellCode = "protectAura";
  spellCost = 30.0;
  } else if (cl==='warrior') {
  spellName = "valorous presence";
  spellCode = "valorousPresence";
  spellCost = 20.0;
  } else if (cl==='rogue') {
  spellName = "tools of the trade";
  spellCode = "toolsOfTrade";
  spellCost = 25.0;
  } else throw "Invalid class "+cl;
  
  var mp = p.stats.mp;
  return { count: Math.floor((mp+offset)/spellCost),
    spellName: spellName, spellCode: spellCode };
}

function loop() {
  var a = process.argv[2];
  var sp, n;
  if (a === "all") {
    sp = spellInfo(0);
  } else {
    n = parseInt(a);
    sp = spellInfo(n);
    if (n >= 0) sp.count = n;
  }
  var retries = 0;
  for (var i=0; i < sp.count; i++) {
    console.log ("casting "+ sp.spellName + " " + i);
    tryCast(spellCaster(sp.spellCode));
  }
}

Fiber(loop).run();
