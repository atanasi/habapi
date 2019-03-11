const request = require('request');
const Fiber = require('fibers');

function checkedYield(unwind) {
  var res;
  try { res = Fiber.yield(); }
  catch (e) { if (unwind) unwind();
    e.fiberCancellation = true;
    throw e; }
  return res;
}

const UrlFetchApp = {
  fetch : function(url, options) {
    var retries = 0;
    if (typeof options.retries === "number") retries = options.retries;
    options.uri = url;
    if (typeof options.timeout === "undefined") options.timeout = 30*1000;
    if (typeof options.method === "undefined") options.method = "GET";
    const fiber = Fiber.current;
    while (true) {
      var canceled = false;
      var req=request(options,function(error,resp,body) {
        if (!canceled) fiber.run({body: body, error: error });
      });
      var res = checkedYield(() => { canceled=true; req.abort(); });
      
      if (typeof res.body === "string") {
          return res.body;
      } else {
        if (retries<=0) {
          throw res.error;
        } else {
          console.log(res.error);
          retries--;
          console.log("Retrying with "+retries+" retries remaining...");
        }
      }
    }
  }
};
const Logger = {
  log : function(msg) { console.log(msg); }
};

module.exports = { UrlFetchApp: UrlFetchApp, Logger: Logger };
