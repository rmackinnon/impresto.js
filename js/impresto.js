
/* 
	impresto.js
	an extension to impress.js
*/

if(impress == undefined) {
	console.log("Must include impress.js first");
}
else {
	var impress_base = impress;
	impress = function() {

		var isSyncing = false;
		var isNarrator = false;
		var serverURL;
		var talkID;

		// Updating status
		var send_error;
		var get_error;
		var waiting_for_update;

		// Register for slide changing events 
		// If narator changes slide, send new slide id to server
		document.getElementById("impress").addEventListener("impress:stepenter", function(evt) {
			if(isSyncing && isNarrator) {
				sendUpdate(evt.target.id);
			}
		});

		// Sync related api functions
		var api = {
			init: init,
			connect: connect,
			startSync: startSync,
			stopSync: stopSync
		}

		return api;


		/* 
			Initiate presentation
			Replace the original init() to enable chaining
		*/
		function init() {
			// Initiate impress object
			var api_base = impress_base();
			api_base.init();

			// Add original impression.js api functions to api
			for(var i in api_base) {
				if(api[i] == undefined) {
					api[i] = api_base[i];
				}
			}

			return api;
		};

		/*
			Set up connection parameters
			server_url: url pointing to the impresto php script
			talk_id: an unique identifier shared among all meeting attendants			
		*/
		function connect(server_url, talk_id) {
			serverURL = server_url;
			talkID = hash(document.body.innerHTML) + "-" + talk_id;	
			return api;
		}

	    /* 
	    	Start syncing. 
	    	as_narrator: 
	    		pass true if the user is a narrator and push slide change to other users.
	    		false if the user is an audience and could read the slides only
	    */
		function startSync(as_narrator) {
			if(!isSyncing && serverURL!=null) {
				send_error = false,
				get_error = false;
				isSyncing = true;
				isNarrator = as_narrator;

				setGlobalState("impress-narrator", isNarrator);
				setGlobalState("impress-sync-open", true);

				getUpdate(0);
			}
			return api;
		}

		/*
			Stop syncing
		*/
		function stopSync() {
			isSyncing = false;
			setGlobalState("expect-sync-open", false);
			return api;
		}

		/* 
			Submit current slide id to server
		*/
		function sendUpdate(slideID) {

			var passdata = {
				command: "update_slide", 
				talkID: talkID,
				slideID: slideID,
			};
			
			post(serverURL, 
				passdata, 
				function(msg, status) {
					var success = false;
					try {
						var response = JSON.parse(msg);
						if(response.result == 202) {
							success = true;
						}
						else {
							console.log("Error sending update: " + response.resultText);
						}
					} catch(exception) {
						console.log("Error sending update: Invalid server reply");
					}

					send_error = !success;
					setGlobalState("impress-sync-error", send_error | get_error);					
				});
		}
		
		/* 
			Use long polling to check the last slide id stored on the server
			timestamp: time stamp of last update
		*/
		function getUpdate(timestamp) {
			if(waiting_for_update)  {
				// Do not connect if another connection is already open
				return;
			}
			waiting_for_update = true;

			var passdata = {
				command: "get_slide",
				slideUpdateTime: timestamp, 
				talkID: talkID
			}
			post(serverURL, 
				passdata,
				function(msg, status){
					waiting_for_update = false;
					if(isSyncing) {

						var success = false;
						var new_timestamp = timestamp;
						try {
								var response = JSON.parse(msg);
								if(response.result == 200) {
									// updated slide id received
									api.goto(response.slideID);
									new_timestamp = response.slideUpdateTime;
									success = true;
								}
								else if (response.result == 408) {
									// no update before timeout
									success = true;
								}
								else {
									console.log("Error getting update: " + response.resultText);
								}
						} catch(exception) {
							console.log("Error getting update: Invalid server reply");
						}

						if(success) {
							// restart connection
							getUpdate(new_timestamp);
						}
						else {
							// wait and retry
							setTimeout(function() { getUpdate(new_timestamp)}, 15000);
						}

						get_error = !success;
						setGlobalState("impress-sync-error", send_error | get_error);
					}	
				});
		}

		/*
			Add/remove class name on <body>
		*/
		function setGlobalState(name, enable) {
			document.body.classList[enable? "add":"remove"](name);
		}

		/* 
			Talk to server via AJAX post
		*/
		function post(url, passData, callback) {
			var AJAX= window.XMLHttpRequest? new XMLHttpRequest() : new ActiveXObject("Microsoft.XmlHttp");
			if (AJAX) {
				AJAX.onreadystatechange = function() {
					if (AJAX.readyState == 4) {
						callback(AJAX.responseText, AJAX.status);
						AJAX = null;
					}
				}
				AJAX.open("POST", url, true);
				AJAX.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
				AJAX.send("data=" + JSON.stringify(passData));
			}
			return AJAX;
		}

		/* 
			Generate a unique page ID
			Described by http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
		*/
		function hash (str){
		    var hash = 0, i, c;
		    for (i = 0, l = str.length; i < l; i++) {
		        c  = str.charCodeAt(i);
		        hash  = ((hash<<5)-hash)+c;
		        hash |= 0; // Convert to 32bit integer
		    }
		    return hash;
		};

	}
}