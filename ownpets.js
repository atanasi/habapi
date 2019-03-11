#! /usr/bin/env node
"use strict";
const request = require('request');
const Fiber = require('fibers');

const { Logger, UrlFetchApp } = require('./gapi');
const authData = require('./authdata');

function printMostWantedQuests() {
 
  var habId = authData["id"];
  var habToken = authData["apitoken"];
 
  // A list of all the pets we're interested in.
  const questPetNames = [
    "Alligator", "Armadillo", "Axolotl", "Badger", "Beetle", "Bunny",
    "Butterfly", "Cheetah", "Cow", "Cuttlefish", "Deer",
    "Egg", "Falcon", "Ferret", "Frog", "Gryphon",
    "GuineaPig", "Hedgehog", "Hippo", "Horse", "Kangaroo",
    "Monkey", "Nudibranch", "Octopus", "Owl", "Parrot",
    "Peacock", "Penguin", "Pterodactyl", "Rat", "Rock",
    "Rooster", "Sabretooth", "SeaSerpent", "Seahorse",
    "Sheep", "Slime", "Sloth", "Snail", "Snake",
    "Spider", "Squirrel", "TRex", "Treeling", "Triceratops",
    "Turtle", "Unicorn", "Velociraptor","Whale", "Yarn"
  ];
 
  // Retrieve the list of party members with their IDs.
  var paramsTemplate = {
    "method": "get",
    "headers": {
      "x-api-user": habId,
      "x-api-key": habToken
    }
  }
  var i;
 
  var memberID = habId;
  // ------------ //
  // COLLECT DATA //
  // ------------ //
 
  // Variables used to collect the quest pet data.
  var urlRequest = "https://habitica.com/api/v3/members/";
  var memberProfile = JSON.parse(UrlFetchApp.fetch(urlRequest + memberID, {"method" : "get"}));
  
  var fullPetName;
  var petName;
  var memberPetsAndMounts;
 
  // Collect the data.
  var petCounts = {};
  var eggCounts = {};
  var mountCounts = {};
 
  // Initialize total quest pet counts.
  for (i = 0; i < questPetNames.length; i++) {
    petName = questPetNames[i];
    petCounts[petName] = 0.0;
    eggCounts[petName] = 0.0;
    mountCounts[petName] = 0.0;
  }
 
    // Collect data about unhatched eggs of quest pets.
    for (i = 0; i < questPetNames.length; i++) {
      petName = questPetNames[i];
      if (petName in memberProfile.data.items.eggs) {
        eggCounts[petName] = memberProfile.data.items.eggs[petName];
      }
    }
 
    // Collect data about all the hatched pets and mounts.
    function laske (t,res) {
      var k = Object.keys(t);
      for (i = 0; i < k.length; i++) {
        var val = t[k[i]];
        if (val === -1) continue;
        var parts = k[i].split("-");
        var petName = parts[0];
        var color = parts[1];
        if (color === "RoyalPurple") continue;
        // Add only info about quest pets.
        if (petName in res) {
          res[petName] += 1;
        }
      }
    }
    laske (memberProfile.data.items.pets,petCounts);
    laske (memberProfile.data.items.mounts,mountCounts);
 
  // ------------------------ //
  // ORDER PET QUESTS BY NEED //
  // ------------------------ //
 
  function petval (x) { return Math.min(20,eggCounts[x]+petCounts[x]+mountCounts[x]); }
  var sortedPetQuests = questPetNames.sort(function(a,b){
    var i = petval(a)-petval(b);
    if (i) return i;
    else return a.localeCompare(b); })
  
  var eggTotal = 0;
  var mountTotal = 0;
  var maxTotal = 0;
  var fullCount = 0;
  
  for (i = 0; i < sortedPetQuests.length; i++) {
    petName = sortedPetQuests[i];
    var eggs = eggCounts[petName];
    var pets = petCounts[petName];
    var mounts = mountCounts[petName];
    
    var sum = eggs + pets + mounts;
    maxTotal += 20;
    mountTotal += mounts;
    if (sum >= 20) {
      eggTotal += 20;
      fullCount++;
    } else eggTotal += sum;

    var suffix = "";
    if (eggs > 0 && pets < 10) suffix = " *** ";
    else if (sum >= 20) suffix = " !!! ";
    else if (pets < 10 && mounts > 0) suffix = " -- ? ";
    else if (eggs > 0) suffix = " --- ";
    Logger.log(petName + ": " + eggs + " + " + pets + " + " + mounts + " ("+sum+")"+suffix)
  }
  Logger.log ("Egg amount: "+eggTotal+" of "+maxTotal);
  Logger.log ("Mount amount: "+mountTotal+" of "+(maxTotal/2));
  Logger.log ("* "+fullCount + " pet types full");
}

Fiber(printMostWantedQuests).run();
