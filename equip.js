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

function sleep(ms) {
    var fiber = Fiber.current;
    setTimeout(function() {
        fiber.run();
    }, ms);
    Fiber.yield();
}

function readInput(s) {
  var res = '';
  var fiber = Fiber.current;
  s.on('data', function(chunk) { res += chunk; });
  s.on('end', function() { fiber.run(); });
  Fiber.yield();
  return res;
}

function equip(g) {
      var params = {
       "method" : "post",
       "headers" : {
         "x-api-user" : authData['id'], 
         "x-api-key" : authData['apitoken']
       }
     }
     var result;
    try {
      var resp = UrlFetchApp.fetch("https://habitica.com/api/v3/user/equip/equipped/"+g, params);
      result = JSON.parse(resp);
     } catch(e) {
       console.log(e);
       return true;
     }
     if (!result.success) console.log("... failed");
}

function loop() {
  var a;
  if (process.argv.length>2) a = process.argv[2];
  else a = "load";
  var n, p;
  if (a === "save") {
    p = fetchProfile();
    console.log(JSON.stringify(p.items.gear.equipped));
  } else if (a === "load") {
    p = fetchProfile();
    var curr = p.items.gear.equipped;
    var gear = JSON.parse(readInput(process.stdin));
    for (var k in gear) {
      if (gear[k] !== curr[k]) {
        console.log ("Equipping "+gear[k]);
        equip(gear[k]);
        sleep(200);
      }
    }
  }
}

Fiber(loop).run();
