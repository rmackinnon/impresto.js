impresto.js-1.0.0
==============
im-/'prestō/ 'n': The client-side control of a one-to-many [impress.js](https://github.com/bartaz/impress.js) slide show. To be used with the sample.php or the [Prestidigitation server](https://github.com/rmackinnon/prestidigitator) when available.

About
--------------
Have you ever seen a [TED](http://www.ted.com) or [TEDx](http://www.ted.com/tedx) talk and wanted to do something similar?  In large expensive talks and presentations you have a [wiki: teleprompter] displaying your script/notes and a 10ft viewable timer on stage, and a large projection screen/system displaying your content.  Say you, as one person, want to be able to leverage the power of these tools to create or show your own talk in any scale?  Say you want to have audience members all over the globe view the same talk that you are giving with audio piped in via some other media, and control what page they're viewing?

Impresto allows you to remotely control the page being viewed in other browsers while giving you easy to read notes and timer.  It can be used locally: 2 browsers, and local daemon on one machine; or remotely: 1 local browser, and _n_ remote audience browsers.

Client-side Moving Parts
--------------
Impresto enabled impress.js presentations are broken up into two types of views:
- Audience: The viewer facing content
- Narrator: The presentor

Within each impress.js slide, the addition of a _notes_ class defined div section sets text to be displayed to the narrator only.  This text, by default, is sized to be read able from a distance, not chaining you to your screen like some other presentation software, allowing you to roam while speaking.

Client-Server Interaction
--------------
At this time the client performs AJAX calls back to a server running the sample php code.
- Client: Start Connection

| Client |        | Server |
| ------ | ------ | -----: |
| api.connect(serverURL,sessionID) | | Waiting for connection |
| // Initiate connection variables | | |

- Narrator: Update Slide

| Client |        | Server |
| ------ | ------ | -----: |
| api.startSync(true) | ====> | host:sample.php |
| AJAX Call to Server, wait for response | command: update_slide; slideID: x |  Server cleanses strings, and sets slide time to time()|
| response | <==== | host:sample.php |
| | result: 202; resultText: Accepted | Return slide_update accepted |

- Audience: Get Slide

| Client |        | Server |
| ------ | ------ | -----: |
| api.startSync(false) | ====> | host:sample.php |
| AJAX Call to Server with current time | command: get_slide; slideUpdateTime: unixtime |  Server cleanses strings, gets slide time from memcache, compares time, if time differs, returns update|
| response | <==== | host:sample.php |
| | result: 200; slideID: y; slideUpdateTime: $lastUpdate | Return JSON string |
| Change to slideID | | |

Javascript Nuts & Bolts
--------------
The javascript API functions returned by the original impress() still work.  We have added 3 additional methods allowing syncing between audience members and narrator.  These 3 new functions added by impresto are:
- connect: Connect to the Prestidigitation server
- startSync: Start talking to the Prestidigitator (Show me some tricks)
- stopSync: Stop talking to the Prestidigitator (His tricks are old now)

Javascript Functions
--------------
* connect(str serverUrl,str sessionId): This method is used to setup the initial connection.  At this time only AJAX calls are allowed.  In the future Impresto will support AJAX and WebSockets with [prestidigitator](https://github.com/rmackinnon/prestidigitator).
 - Variables:

    serverUrl: url pointing to the impresto php script
    sessionID: an unique identifier shared among all meeting attendants

    <script>
      api.connect(serverUrl, sessionId);
    </script>
    
* startSync(boolean): This method is used to start transmitting sync requests and updates. 
 - Variables:
    asNarrator: Pass true if the user is a narrator and push slide change to other users. Define false if the user is an audience and could read the slides only. Defaults to false.

    <script>
      api.startSync(as_narrator);
    </script>

* stopSync():  This method is used to stop the transmission of sync requests and updates

    <script>
      api.stopSync();
    </script>

DIY Demo Running
--------------
Sample php code requirements:
- Memcached daemon or server
- PECL-memcached

OK Enough Show Me Already!
--------------
So you want to play with it huh?  Check out [http://rmackinnon.github.io/impresto.js/](http://rmackinnon.github.io/impresto.js/).
