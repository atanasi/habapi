#! /usr/bin/env node
"use strict";

const moment = require('moment');
const { Logger, UrlFetchApp } = require('./gapi');
const Fiber = require('fibers');

const authData = require('./authdata');

function startLoop() {
  function reschedule() {
    var now = moment();
    var next = now.clone().minutes(1).seconds(0).add(1,'h');
    // var next = now.clone().add(15,'s');
    // console.log(now);
    var interval = next.diff(now);
    const fiber = Fiber.current;
    var timeout = setTimeout(fiber.run.bind(fiber),interval);
//    console.log('reschedule in '+interval/1000);
    try {
      Fiber.yield();
    } catch (e) {
      console.log('Cancel from reschedule');
      clearTimeout(timeout);
      throw e;
    }
  }
  function invoke(f) {
      try {
        console.log('Start '+f.name);
        f();
        console.log('Finished '+f.name);
      } catch(e) {
        if (e.fiberCancellation) {
          console.log('Cancel from '+f.name);
          throw e;
        }
        console.log(e);
      }
  }
  function loop() {
    while (true) {
      invoke(scheduleCron);
      invoke(scheduleJoinQuest);
      reschedule();
    }
  }
  var f = Fiber(loop);
  f.run();
  return f;
}

function scheduleCron() {
   var habId = authData["id"]
   var habToken = authData["apitoken"];
 
   var paramsTemplate = {
     "method" : "post",
     "headers" : {
       "x-api-user" : habId, 
       "x-api-key" : habToken
     }
   }
   
   var params = paramsTemplate;
   UrlFetchApp.fetch("https://habitica.com/api/v3/cron", params);
 }

function scheduleJoinQuest() {
   var habId = authData['id'];
   var habToken = authData['apitoken'];
 
   var paramsTemplate = {
     "method" : "get",
     "headers" : {
       "x-api-user" : habId, 
       "x-api-key" : habToken    
     }
   }  
   var response = UrlFetchApp.fetch("https://habitica.com/api/v3/groups/party", paramsTemplate);
   var party = JSON.parse(response);
   
    if ((party.data.quest.key != undefined) && (party.data.quest.active != true) && (party.data.quest.members[habId] == undefined)){
    paramsTemplate = {
        "method" : "post",
        "headers" : {
          "x-api-user" : habId, 
          "x-api-key" : habToken
        }     
      }
      var params = paramsTemplate;
    
      UrlFetchApp.fetch("https://habitica.com/api/v3/groups/party/quests/accept", params);
      Logger.log("Quest accepted");
    } else {
      Logger.log("No quest invitation");
    }
}

var f = startLoop();
console.log('started');
/* setTimeout(function() {
  f.reset();
},3000); */
