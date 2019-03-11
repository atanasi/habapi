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
  // TODO: Use the API to collect all pet names.
  const questPetNames = [
    "Alligator","Armadillo", "Axolotl", "Badger", "Beetle", "Bunny",
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
 
  // Common variables.
  var paramsTemplate = {
    "method": "get",
    "headers": {
      "x-api-user": habId,
      "x-api-key": habToken
    }, "retries": 5
  }
  var i;
  var len;
 
  // Build a dictionary memberName -> memberID.
  var partyMembers = JSON.parse(UrlFetchApp.fetch("https://habitica.com/api/v3/groups/party/members", paramsTemplate));
  var memberName;
  var memberID;
  var membersIDs = {};
  var myName;
  for (i = 0, len = partyMembers.data.length; i < len; ++i) {
    memberName = partyMembers.data[i]["profile"]["name"];
    memberID = partyMembers.data[i]["id"];
    membersIDs[memberName] = memberID;
    
    if (memberID===habId) myName = memberName;
  }
 
  // ------------ //
  // COLLECT DATA //
  // ------------ //
 
  // Variables used to collect the quest pet data.
  var urlRequest = "https://habitica.com/api/v3/members/";
  var memberProfile;
  var fullPetName;
  var petName;
  var memberPetsAndMounts;
 
  // Collect the data.
  var membersPetCounts = {}; // Quest pet counts by member.
  var partyPetCounts = {}; // Total quest pet counts.
  var partyPetDeltas = {};
  var memberPetDeltas = {};
  var partyPetMin = {};
  
  var partyClasses = {};
  var myNeeded = {};
 
  // Initialize total quest pet counts.
  for (i = 0, len = questPetNames.length; i < len; ++i) {
    petName = questPetNames[i];
    partyPetCounts[petName] = 0.0;
    partyPetDeltas[petName] = 0.0;
    partyPetMin[petName] = null;
  }
 
  for (memberName in membersIDs) {
    membersPetCounts[memberName] = {}; // Initialize member data.
    memberPetDeltas[memberName] = {};
    memberID = membersIDs[memberName];
    memberProfile = JSON.parse(UrlFetchApp.fetch(urlRequest + memberID, {"method" : "get", "retries": 5}));
 
 
    var memberClass = memberProfile.data.stats.class;
    if (!(memberClass in partyClasses)) partyClasses[memberClass]=0;
    partyClasses[memberClass]++;
 
    // Collect data about unhatched eggs of quest pets.
    for (i = 0, len = questPetNames.length; i < len; ++i) {
      petName = questPetNames[i];
      if (petName in memberProfile.data.items.eggs) {
        membersPetCounts[memberName][petName] = memberProfile.data.items.eggs[petName]
      } else {
        membersPetCounts[memberName][petName] = 0.0;
      }
    }
 
    // Collect data about all the hatched pets and mounts.
    memberPetsAndMounts = [];
    for (petName in memberProfile.data.items.pets) {
      // Pets that were hatched and the fed into a mount
      // remain in the dictionary with value -1.
      if (memberProfile.data.items.pets[petName] !== -1) {
        memberPetsAndMounts.push(petName);
      }
    }
    memberPetsAndMounts = memberPetsAndMounts.concat(Object.keys(memberProfile.data.items.mounts))
    for (i = 0, len = memberPetsAndMounts.length; i < len; ++i) {
      // Ignore special Royal Purple Gryphon pet and mount.
      if (memberPetsAndMounts[i] === "Gryphon-RoyalPurple") {
        continue;
      }
      petName = memberPetsAndMounts[i].split("-")[0];
      //if (petName.indexOf("Gryphon") !== -1) {
      //  Logger.log(petName);
      //}
      // Add only info about quest pets.
      if (petName in membersPetCounts[memberName]) {
        membersPetCounts[memberName][petName] += 1;
      }
    }
   
   var delta;
   var clamped;
   var gain;
    
    // Cut maximum number of pets+mounts+eggs to 20 and update total counts.
    for (petName in membersPetCounts[memberName]) {
      clamped = Math.min(20, membersPetCounts[memberName][petName]);
      if (petName === 'Egg') gain=10;
      else gain=3;
      delta = Math.min(gain, 20 - clamped);
      membersPetCounts[memberName][petName] = clamped;
      memberPetDeltas[memberName][petName] = delta;
      partyPetCounts[petName] += clamped;
      if (partyPetMin[petName]===null || partyPetMin[petName]>clamped)
        partyPetMin[petName]=clamped;
      
      if (memberName===myName) {
        myNeeded[petName] = Math.ceil((20 - clamped)/gain);
      }
    }
    for (i = 0, len = questPetNames.length; i < len; ++i) {
      petName = questPetNames[i];
      if (petName === 'Egg') gain=10;
      else gain=3;
      if (petName in memberPetDeltas[memberName])
        delta = memberPetDeltas[memberName][petName];
      else delta = gain;
      partyPetDeltas[petName] += delta;
    }
  }
 
  // ------------------------ //
  // ORDER PET QUESTS BY NEED //
  // ------------------------ //
 
  var sortedPetQuests = Object.keys(partyPetCounts).sort(function(a,b){return partyPetCounts[a]-partyPetCounts[b]})
  for (i = 0, len = sortedPetQuests.length; i < len; ++i) {
    petName = sortedPetQuests[i];
    delta = partyPetDeltas[petName];
    Logger.log(petName + ": " + partyPetCounts[petName].toString() + " [ + "+delta+" ] (min "+partyPetMin[petName]+") [my need "+myNeeded[petName] +"]")
  }
 
  // Print most recent URL for Habitica Party Progress Info tool.
  var toolURL = "https://habiticapartytools.surge.sh/?users="
  for (memberName in membersIDs) {
    memberID = membersIDs[memberName];
    toolURL += memberID + "|"
  }
  Logger.log(toolURL)
  Logger.log(partyClasses);
}

Fiber(printMostWantedQuests).run();
