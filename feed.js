#! /usr/bin/env node
"use strict";

const { Logger, UrlFetchApp } = require('./gapi');
const Fiber = require('fibers');

const authData = require('./authdata');

function sleep(ms) {
    var fiber = Fiber.current;
    setTimeout(function() {
        fiber.run();
    }, ms);
    Fiber.yield();
}

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

var petNames;
var colorNames;
var foodColors =
   { Honey: 'Golden',
     Fish: 'Skeleton',
     Meat: 'Base',
     RottenMeat: 'Zombie',
     CottonCandyPink: 'CottonCandyPink',
     Chocolate: 'Shade',
     Strawberry: 'Red',
     Potatoe: 'Desert',
     CottonCandyBlue: 'CottonCandyBlue',
     Milk: 'White' };
var foodTypes = {};
  
var feeding = {};

function makeTables(user) {
  var items = user.items;
  var eggs = items.eggs;
  petNames = Object.keys(eggs).sort();
  colorNames = Object.values(foodColors).sort();
  
  Object.keys(foodColors).forEach(function(color) {
    foodTypes[foodColors[color]] = color;
  });
  
  colorNames.forEach(function (color) {
    var res = [];
    feeding[color] = res;
    petNames.forEach(function (petType) {
      var petName = petType + '-' + color;
      var entry = {type: petType};
      if (items.mounts[petName]) entry.req = 0;
      else if (typeof items.pets[petName] !== 'number') entry.req=0;
      else if (items.pets[petName]<5) entry.req = 0;
      else entry.req = (50-items.pets[petName])/5;
      res.push(entry);
    });
    res.sort(function(x,y) {
      var i = x.req - y.req;
      if (i!==0) return i;
      else return x.type.localeCompare(y.type);
    });
  });
}

function feedPets() {
  var user = fetchProfile();
  makeTables(user);
  
  var food = user.items.food;
  var eggs = user.items.eggs;
  var potions = user.items.hatchingPotions;
  
  function hatchPet(pet,color){
    var url = "https://habitica.com/api/v3/user/hatch/"+pet+"/"+color;
    var params = {
        "method" : "post",
        "headers" : {
          "x-api-user" : authData['id'], 
          "x-api-key" : authData['apitoken']
        }
      };
      try {
        var response = UrlFetchApp.fetch(url, params);
        var result = JSON.parse(response);
        if (!result.success) console.log(result);
        else {
          console.log("Pet rehatched");
        }
      } catch(e) {
        console.log(e);
      }
  }
  
  function evolvePet(color,entry) {
    var req = entry.req;
    var pet = entry.type;
    var foodType = foodTypes[color];
    var petName = pet + "-"+color;
    console.log ("Evolving: "+petName+", "+req);
    for (var i = 0; i < req; i++) {
      var url = "https://habitica.com/api/v3/user/feed/"+petName+"/"+foodType;
      console.log ("Feeding "+petName+" with "+foodType);
      var params = {
        "method" : "post",
        "headers" : {
          "x-api-user" : authData['id'], 
          "x-api-key" : authData['apitoken']
        }
      };
      var retry = false;
      var rehatch = false;
      try {
        var response = UrlFetchApp.fetch(url, params);
        var result = JSON.parse(response);
        if (!result.success) console.log(result);
        else if (result.data === -1) {
          console.log("Mount acquired");
          rehatch = true;
        }
      } catch(e) {
        console.log(e);
        retry = true;
      }
      if (rehatch) {
        sleep (200);
        hatchPet(pet,color);
      }
      sleep (200);
    }
    
    food[foodType] -= req;
    potions[color] -= 1;
    eggs[pet] -= 1;
    entry.req = 0;
  }
  
  function tryFeed(foodType) {
    var count = food[foodType];
    var color = foodColors[foodType];
    if (!color) return;
    var candidates = feeding[color];
    for(var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (c.req == 0) continue;
      if (c.req > count) break;
      
      if (eggs[c.type] && potions[color]) {
        evolvePet(color,c);
        return true;
      }
    }
    return false;
  }
  
  Object.keys(food).forEach (function (foodType) { while (tryFeed(foodType)); });
}

Fiber(feedPets).run();
