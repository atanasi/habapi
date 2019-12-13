const request = require('request');

function fetch(url, options, cb) {
    let retries = 0;
    if (typeof options.retries === "number") retries = options.retries;
    options.uri = url;
    if (typeof options.timeout === "undefined") options.timeout = 30*1000;
    if (typeof options.method === "undefined") options.method = "GET";
    
    let canceled=false;
    let req;
    function loop() {
      req=request(options,function(error,resp,body) {
        if (!canceled) {
	      if (typeof resp.body === "string") {
			cb(null,resp.body);
		  } else {
			if (retries<=0) {
				cb(resp.error);
			} else {
				log(resp.error);
				retries--;
				log("Retrying with "+retries+" retries remaining...");
				loop();
			}
		  }
        }
      });
    }
	loop();
	return {cancel: ()=>{canceled=true; req.abort();}};
}

function log (msg) { console.log(msg); }

module.exports = { log, fetch };
