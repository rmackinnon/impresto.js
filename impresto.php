<?php

# Required Packages:
#   PECL-json (PHP <5.2.0)
#   PECL-memcached


# Memcached Configuration
define('MC_SERVER','127.0.0.1');
define('MC_PORT','11211');

# HTTP Long-Held Timeout, in seconds
define('HTTP_LONG_POLLING_TIMEOUT',30);

# Only sync with updates happened within the last 10 minutes
define('SLIDE_UPDATE_TIMEOUT', 600);

# Handles sending json-format replies
class REPLY {
	private static $HTTPStatusCodes = array(100=>'Continue',101=>'Switching Protocols',
				200=>'OK',201=>'Created',202=>'Accepted',203=>'Non-Authoritative Information',204=>'No Content',205=>'Reset Content',206=>'Partial Content',
				400=>'Bad Request',401=>'Unauthorized',402=>'Payment Required',403=>'Forbidden',404=>'Not Found',405=>'Method Not Allowed',406=>'Not Accepted',
				408=>'Request Timeout',409=>'Conflict',410=>'Gone',411=>'Length Required',412=>'Precondition Failed',413=>'Request Entry Too Large',
				414=>'Request-URI Too Long',415=>'Unsupported Media Type',416=>'Request Range Not Satisfiable',417=>'Expectation Failed',
				426=>'Upgrade Required',
				500=>'Internal Server Error',501=>'Not Implemented',502=>'Bad Gateway',503=>'Service Unavailable',504=>'Gateway Timeout',
				505=>'HTTP Version Not Supported');
	
	public static function data($data){
		exit(json_encode($data));
	}

	public static function ok() { self::http_code(200);}

	public static function accepted() { self::http_code(202);}

	public static function bad_request() { self::http_code(400);}

	public static function server_error() { self::http_code(500);}

	public static function timeout() { self::http_code(408);}

	public static function http_code($resultCode){
		self::data(array(
			'result'=>$resultCode,
			'resultText'=>self::$HTTPStatusCodes[$resultCode]
			));
	}
}

# Fetches Memcached data, stores and reads slide update info
class Mem {
	private $memcache;

	function __construct($id){

		### Find Memcached persistent instance
		$this->memcache = new \Memcached($id);
        $this->memcache->addServer(MC_SERVER,MC_PORT,40);

        if($this->memcache->isPristine()) {
        	### Set default values
	        $this->memcache->set('slideUpdateTime', 0);
	        $this->memcache->set('currentSlide', 0);
	    }
	}

	public function getTalkSlide(){
		return $this->memcache->get('currentSlide');
	}

	public function setTalkSlide($slideID){
		return $this->memcache->set('currentSlide', $slideID) 
				&& $this->memcache->set('slideUpdateTime', time());
	}

	public function getTalkSlideUpdateTime(){
		return $this->memcache->get('slideUpdateTime');
	}

}


# [Client]								[Server]
# (slide_update,time)------------------>(POST)
#											|
#										(compare time to slide_updateTime)<----------
#											|										|
#										<if slide_updateTime newer>---->(sleep)------
#											| Y
# [waitinf ajax]<-----------------------(send slide_number,time)


if (isset($_POST['data'])) {
	$json = json_decode($_POST['data'],true);

	# error decoding json
	if (is_null($json)) {
		REPLY::bad_request();
	}
}
else {
	REPLY::bad_request();
}

# Must set talkID and command
if(empty($json['talkID']) || empty($json['command'])) {
	REPLY::bad_request();
}

$command = htmlspecialchars($json['command']);
$talkID = htmlspecialchars($json['talkID']);
$mem = new Mem($talkID);

switch ($command) {
	case 'update_slide':  # Set current slide id

		if (empty($json['slideID'])){
			REPLY::bad_request();			
		} 
		$slideID = htmlspecialchars($json['slideID']);

		if($mem->setTalkSlide($slideID)) {
			REPLY::accepted();
		}
		else {
			REPLY::server_error();
		}
		break;

    case 'get_slide':  # Get last slide id

		if (!isset($json['slideUpdateTime'])) {
			REPLY::bad_request();
		}
		$lastClientUpdate = htmlspecialchars($json['slideUpdateTime']);

		# Start long polling
		for($h=0; $h<= HTTP_LONG_POLLING_TIMEOUT; $h++){
			# If the slide has been updated within the last 10 minutes and after the last check, send the current slide id to client

			$lastUpdate = $mem->getTalkSlideUpdateTime();
			if ($lastUpdate != $lastClientUpdate
				 && $lastUpdate > $lastClientUpdate - SLIDE_UPDATE_TIMEOUT ) {
				REPLY::data(array(
					'slideID'=>$mem->getTalkSlide(), 
					'slideUpdateTime'=>$lastUpdate,
					'result'=>200
					));
			}
			sleep(1);
		}
		REPLY::timeout();
		break;
} 



