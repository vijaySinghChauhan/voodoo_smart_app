(self["webpackChunkVooDooSmart"] = self["webpackChunkVooDooSmart"] || []).push([["src_screens_audio_AudioCallScreen_tsx"],{

/***/ "./node_modules/react-native-incall-manager/index.js":
/*!***********************************************************!*\
  !*** ./node_modules/react-native-incall-manager/index.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react_native__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react-native */ "./node_modules/react-native-web/dist/exports/Platform/index.js");
/* harmony import */ var react_native__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react-native */ "./node_modules/react-native-web/dist/exports/Vibration/index.js");

var _InCallManager = (__webpack_require__(/*! react-native */ "./node_modules/react-native-web/dist/index.js").NativeModules).InCallManager;


class InCallManager {
    constructor() {
        this.vibrate = false;
        this.audioUriMap = {
            ringtone: { _BUNDLE_: null, _DEFAULT_: null},
            ringback: { _BUNDLE_: null, _DEFAULT_: null},
            busytone: { _BUNDLE_: null, _DEFAULT_: null},
        };
    }

    start(setup) {
        setup = (setup === undefined) ? {} : setup;
        let auto = (setup.auto === false) ? false : true;
        let media = (setup.media === 'video') ? 'video' : 'audio';
        let ringback = (!!setup.ringback) ? (typeof setup.ringback === 'string') ? setup.ringback : "" : "";
        _InCallManager.start(media, auto, ringback);
    }

    stop(setup) {
        setup = (setup === undefined) ? {} : setup;
        let busytone = (!!setup.busytone) ? (typeof setup.busytone === 'string') ? setup.busytone : "" : "";
        _InCallManager.stop(busytone);
    }

    turnScreenOff() {
        _InCallManager.turnScreenOff();
    }

    turnScreenOn() {
        _InCallManager.turnScreenOn();
    }

    async getIsWiredHeadsetPluggedIn() {
        let isPluggedIn = await _InCallManager.getIsWiredHeadsetPluggedIn();
        return { isWiredHeadsetPluggedIn: isPluggedIn };
    }

    setFlashOn(enable, brightness) {
        if (react_native__WEBPACK_IMPORTED_MODULE_0__["default"].OS === 'ios') {
            enable = (enable === true) ? true : false;
            brightness = (typeof brightness === 'number') ? brightness : 0;
            _InCallManager.setFlashOn(enable, brightness);
        } else {
            console.log("Android doesn't support setFlashOn(enable, brightness)");
        }
    }


    setKeepScreenOn(enable) {
        enable = (enable === true) ? true : false;
        _InCallManager.setKeepScreenOn(enable);
    }

    setSpeakerphoneOn(enable) {
        enable = (enable === true) ? true : false;
        _InCallManager.setSpeakerphoneOn(enable);
    }

    setForceSpeakerphoneOn(_flag) {
        let flag = (typeof _flag === "boolean") ? (_flag) ? 1 : -1 : 0;
        _InCallManager.setForceSpeakerphoneOn(flag);
    }

    setMicrophoneMute(enable) {
        enable = (enable === true) ? true : false;
        _InCallManager.setMicrophoneMute(enable);
    }

    startRingtone(ringtone, vibrate_pattern, ios_category, seconds) {
        ringtone = (typeof ringtone === 'string') ? ringtone : "_DEFAULT_";
        this.vibrate = (Array.isArray(vibrate_pattern)) ? true : false;
        ios_category = (ios_category === 'playback') ? 'playback' : "default";
        seconds = (typeof seconds === 'number' && seconds > 0) ? parseInt(seconds) : -1; // --- android only, default looping

        if (react_native__WEBPACK_IMPORTED_MODULE_0__["default"].OS === 'android') {
            _InCallManager.startRingtone(ringtone, seconds);
        } else {
            _InCallManager.startRingtone(ringtone, ios_category);
        }

        // --- should not use repeat, it may cause infinite loop in some cases.
        if (this.vibrate) {
            react_native__WEBPACK_IMPORTED_MODULE_1__["default"].vibrate(vibrate_pattern, false); // --- ios needs RN 0.34 to support vibration pattern
        }
    }

    stopRingtone() {
        if (this.vibrate) {
            react_native__WEBPACK_IMPORTED_MODULE_1__["default"].cancel();
        }
        _InCallManager.stopRingtone();
    }

    startProximitySensor() {
        _InCallManager.startProximitySensor();
    }
  
    stopProximitySensor() {
        _InCallManager.stopProximitySensor();
    }

    startRingback(ringback) {
        ringback = (typeof ringback === 'string') ? ringback : "_DTMF_";
        _InCallManager.startRingback(ringback);
    }

    stopRingback() {
        _InCallManager.stopRingback();
    }

    pokeScreen(_timeout) {
        if (react_native__WEBPACK_IMPORTED_MODULE_0__["default"].OS === 'android') {
            let timeout = (typeof _timeout === "number" && _timeout > 0) ? _timeout : 3000; // --- default 3000 ms
            _InCallManager.pokeScreen(timeout);
        } else {
            console.log("ios doesn't support pokeScreen()");
        }
    }

    async getAudioUri(audioType, fileType) {
        if (typeof this.audioUriMap[audioType] === "undefined") {
            return null;
        }
        if (this.audioUriMap[audioType][fileType]) {
            return this.audioUriMap[audioType][fileType];
        } else {
            try {
                let result = await _InCallManager.getAudioUriJS(audioType, fileType);
                if (typeof result === 'string' && result.length > 0) {
                    this.audioUriMap[audioType][fileType] = result;
                    return result
                } else {
                    return null;
                }
            } catch (err) {
                return null;
            }
        }
    }

    async chooseAudioRoute(route) {
        let result = await _InCallManager.chooseAudioRoute(route);
        return result;
    }

    async requestAudioFocus() {
        if (react_native__WEBPACK_IMPORTED_MODULE_0__["default"].OS === 'android') {
            return await _InCallManager.requestAudioFocusJS();
        } else {
            console.log("ios doesn't support requestAudioFocus()");
        }
    }

    async abandonAudioFocus() {
        if (react_native__WEBPACK_IMPORTED_MODULE_0__["default"].OS === 'android') {
            return await _InCallManager.abandonAudioFocusJS();
        } else {
            console.log("ios doesn't support requestAudioFocus()");
        }
    }
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (new InCallManager());


/***/ }),

/***/ "./src/screens/audio/AudioCallScreen.tsx":
/*!***********************************************!*\
  !*** ./src/screens/audio/AudioCallScreen.tsx ***!
  \***********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "./node_modules/@babel/runtime/helpers/interopRequireDefault.js");Object.defineProperty(exports, "__esModule", ({value:true}));exports["default"]=void 0;var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ "./node_modules/@babel/runtime/helpers/asyncToGenerator.js"));var _slicedToArray2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/slicedToArray */ "./node_modules/@babel/runtime/helpers/slicedToArray.js"));var _react=_interopRequireWildcard(__webpack_require__(/*! react */ "./node_modules/react/index.js"));var _reactNative=__webpack_require__(/*! react-native */ "./node_modules/react-native-web/dist/index.js");var _reactNativeIncallManager=_interopRequireDefault(__webpack_require__(/*! react-native-incall-manager */ "./node_modules/react-native-incall-manager/index.js"));var _native=__webpack_require__(/*! @react-navigation/native */ "./node_modules/@react-navigation/native/lib/module/index.js");var _socket=__webpack_require__(/*! socket.io-client */ "./node_modules/socket.io-client/build/cjs/index.js");var constantsV=_interopRequireWildcard(__webpack_require__(/*! ../../constants/constatantsV */ "./src/constants/constatantsV.tsx"));var _authService=_interopRequireDefault(__webpack_require__(/*! ../../services/auth/authService */ "./src/services/auth/authService.ts"));var _AuthContext=__webpack_require__(/*! ../../context/AuthContext */ "./src/context/AuthContext.tsx");var _reactNativeWebrtc=__webpack_require__(/*! react-native-webrtc */ "./src/shims/webrtcShim.web.ts");var _userService=_interopRequireDefault(__webpack_require__(/*! ../../services/users/userService */ "./src/services/users/userService.ts"));var _jsxRuntime=__webpack_require__(/*! react/jsx-runtime */ "./node_modules/react/jsx-runtime.js");var _this=this,_jsxFileName="/Users/vijaychauhan/Code/ReactNative/VooDooSmartDir/voodooHome/voodoohomeS2/src/screens/audio/AudioCallScreen.tsx";function _interopRequireWildcard(e,t){if("function"==typeof WeakMap)var r=new WeakMap(),n=new WeakMap();return(_interopRequireWildcard=function _interopRequireWildcard(e,t){if(!t&&e&&e.__esModule)return e;var o,i,f={__proto__:null,default:e};if(null===e||"object"!=typeof e&&"function"!=typeof e)return f;if(o=t?n:r){if(o.has(e))return o.get(e);o.set(e,f);}for(var _t in e)"default"!==_t&&{}.hasOwnProperty.call(e,_t)&&((i=(o=Object.defineProperty)&&Object.getOwnPropertyDescriptor(e,_t))&&(i.get||i.set)?o(f,_t,i):f[_t]=e[_t]);return f;})(e,t);}var AudioCallScreen=function AudioCallScreen(_ref){var route=_ref.route;var _ref2=route.params||{},targetUserId=_ref2.targetUserId,targetUserName=_ref2.targetUserName,incoming=_ref2.incoming;var _useState=(0,_react.useState)(incoming?'ringing':'idle'),_useState2=(0,_slicedToArray2.default)(_useState,2),callState=_useState2[0],setCallState=_useState2[1];var _useState3=(0,_react.useState)(true),_useState4=(0,_slicedToArray2.default)(_useState3,2),speakerOn=_useState4[0],setSpeakerOn=_useState4[1];var _useState5=(0,_react.useState)(targetUserName),_useState6=(0,_slicedToArray2.default)(_useState5,2),partnerName=_useState6[0],setPartnerName=_useState6[1];var _useState7=(0,_react.useState)(null),_useState8=(0,_slicedToArray2.default)(_useState7,2),callStartAt=_useState8[0],setCallStartAt=_useState8[1];var _useState9=(0,_react.useState)(0),_useState0=(0,_slicedToArray2.default)(_useState9,2),elapsedSec=_useState0[0],setElapsedSec=_useState0[1];var _useState1=(0,_react.useState)('new'),_useState10=(0,_slicedToArray2.default)(_useState1,2),iceState=_useState10[0],setIceState=_useState10[1];var _useState11=(0,_react.useState)('new'),_useState12=(0,_slicedToArray2.default)(_useState11,2),pcConnState=_useState12[0],setPcConnState=_useState12[1];var _useState13=(0,_react.useState)(0),_useState14=(0,_slicedToArray2.default)(_useState13,2),remoteAudioTracks=_useState14[0],setRemoteAudioTracks=_useState14[1];var _useState15=(0,_react.useState)(0),_useState16=(0,_slicedToArray2.default)(_useState15,2),localAudioTracks=_useState16[0],setLocalAudioTracks=_useState16[1];var socketRef=(0,_react.useRef)(null);var pcRef=(0,_react.useRef)(null);var localStreamRef=(0,_react.useRef)(null);var remoteStreamRef=(0,_react.useRef)(null);var roomRef=(0,_react.useRef)('');var pendingOfferRef=(0,_react.useRef)(null);var callStateRef=(0,_react.useRef)(callState);var _useAuth=(0,_AuthContext.useAuth)(),user=_useAuth.user;var navigation=(0,_native.useNavigation)();(0,_react.useEffect)(function(){callStateRef.current=callState;},[callState]);(0,_react.useEffect)(function(){var a=String((user==null?void 0:user.id)||'self');var b=String(targetUserId||'other');roomRef.current=`call_${[a,b].sort().join('_')}`;},[targetUserId,user==null?void 0:user.id]);(0,_react.useEffect)(function(){(0,_asyncToGenerator2.default)(function*(){try{if(!partnerName&&targetUserId){var users=yield _userService.default.listUsers();var match=users==null?void 0:users.find(function(u){return String(u==null?void 0:u.id)===String(targetUserId);});if(match!=null&&match.name)setPartnerName(match.name);}}catch(_){}})();},[targetUserId,partnerName]);(0,_react.useEffect)(function(){var base=partnerName||targetUserName||targetUserId||'Audio Call';var title=callState==='in_call'&&callStartAt?`Call: ${base} • ${formatDuration(elapsedSec)}`:`Call: ${base}`;navigation.setOptions({title:title});},[navigation,partnerName,targetUserName,targetUserId,callState,elapsedSec,callStartAt]);(0,_react.useEffect)(function(){(0,_asyncToGenerator2.default)(function*(){var token=(yield _authService.default.getToken())||'';socketRef.current=(0,_socket.io)(constantsV.CHAT_BASE_URL,{transports:['websocket','polling'],path:'/voodoo/socket.io',auth:{token:token},extraHeaders:{Authorization:`Bearer ${token}`}});socketRef.current.on('connect',function(){if(roomRef.current){var _socketRef$current;(_socketRef$current=socketRef.current)==null||_socketRef$current.emit('webrtc:join',roomRef.current);}});socketRef.current.on('webrtc:offer',function(){var _ref6=(0,_asyncToGenerator2.default)(function*(_ref5){var sdp=_ref5.sdp;try{var _socketRef$current3;if(callStateRef.current==='ringing'){pendingOfferRef.current=sdp;return;}if(!pcRef.current){pcRef.current=new _reactNativeWebrtc.RTCPeerConnection({iceServers:constantsV.ICE_SERVERS});pcRef.current.onicecandidate=function(event){var candidate=event==null?void 0:event.candidate;if(candidate){var _socketRef$current2;(_socketRef$current2=socketRef.current)==null||_socketRef$current2.emit('webrtc:ice',{room:roomRef.current,candidate:candidate});}};pcRef.current.oniceconnectionstatechange=function(){try{var _pcRef$current;var s=(_pcRef$current=pcRef.current)==null?void 0:_pcRef$current.iceConnectionState;console.log('ICE state (callee flow):',s);}catch(_){}};pcRef.current.onconnectionstatechange=function(){var _pcRef$current2;var s=(_pcRef$current2=pcRef.current)==null?void 0:_pcRef$current2.connectionState;setPcConnState(String(s||'unknown'));if(s==='connected'){setCallState('in_call');if(!callStartAt)setCallStartAt(Date.now());}if(s==='failed'){console.warn('ICE connection failed');}};pcRef.current.oniceconnectionstatechange=function(){try{var _pcRef$current3;var s=(_pcRef$current3=pcRef.current)==null?void 0:_pcRef$current3.iceConnectionState;setIceState(String(s||'unknown'));console.log('ICE state (callee flow):',s);}catch(_){}};pcRef.current.ontrack=function(event){try{var _event$streams;var stream=event==null||(_event$streams=event.streams)==null?void 0:_event$streams[0];if(stream){remoteStreamRef.current=stream;var tracks=stream.getAudioTracks();tracks.forEach(function(t){return t.enabled=true;});setRemoteAudioTracks((tracks==null?void 0:tracks.length)||0);if(callStateRef.current!=='in_call'){setCallState('in_call');}if(!callStartAt)setCallStartAt(Date.now());}}catch(_){}};pcRef.current.onaddstream=function(event){try{var stream=event==null?void 0:event.stream;if(stream){remoteStreamRef.current=stream;var tracks=stream.getAudioTracks();tracks.forEach(function(t){return t.enabled=true;});setRemoteAudioTracks((tracks==null?void 0:tracks.length)||0);}}catch(_){}};}yield pcRef.current.setRemoteDescription(new _reactNativeWebrtc.RTCSessionDescription(sdp));if(!localStreamRef.current){if(_reactNative.Platform.OS==='android'){try{var granted=yield _reactNative.PermissionsAndroid.request(_reactNative.PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);if(granted!==_reactNative.PermissionsAndroid.RESULTS.GRANTED){console.warn('Microphone permission denied');return;}}catch(e){console.warn('Mic permission request error',e);}}var stream=yield _reactNativeWebrtc.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});localStreamRef.current=stream;stream.getTracks().forEach(function(t){var _pcRef$current4;return(_pcRef$current4=pcRef.current)==null?void 0:_pcRef$current4.addTrack(t,stream);});try{pcRef.current.addStream==null||pcRef.current.addStream(stream);}catch(_){}try{var _stream$getAudioTrack;setLocalAudioTracks(((_stream$getAudioTrack=stream.getAudioTracks())==null?void 0:_stream$getAudioTrack.length)||0);}catch(_){}}var answer=yield pcRef.current.createAnswer();yield pcRef.current.setLocalDescription(answer);(_socketRef$current3=socketRef.current)==null||_socketRef$current3.emit('webrtc:answer',{room:roomRef.current,sdp:answer});}catch(e){}});return function(_x){return _ref6.apply(this,arguments);};}());socketRef.current.on('webrtc:declined',function(){setCallState('ended');try{var _localStreamRef$curre;(_localStreamRef$curre=localStreamRef.current)==null||(_localStreamRef$curre=_localStreamRef$curre.getTracks())==null||_localStreamRef$curre.forEach(function(t){return t.stop();});}catch(_){}try{var _pcRef$current5;(_pcRef$current5=pcRef.current)==null||_pcRef$current5.close();}catch(_){}pcRef.current=null;});socketRef.current.on('webrtc:canceled',function(){endCall();});socketRef.current.on('webrtc:answer',function(){var _ref8=(0,_asyncToGenerator2.default)(function*(_ref7){var sdp=_ref7.sdp;if(!pcRef.current)return;yield pcRef.current.setRemoteDescription(new _reactNativeWebrtc.RTCSessionDescription(sdp));setCallState('in_call');});return function(_x2){return _ref8.apply(this,arguments);};}());socketRef.current.on('webrtc:ready',(0,_asyncToGenerator2.default)(function*(){try{var _socketRef$current4;if(!pcRef.current)return;var offer=yield pcRef.current.createOffer({offerToReceiveAudio:true});yield pcRef.current.setLocalDescription(offer);(_socketRef$current4=socketRef.current)==null||_socketRef$current4.emit('webrtc:offer',{room:roomRef.current,sdp:offer});}catch(_){}}));socketRef.current.on('webrtc:ice',function(){var _ref1=(0,_asyncToGenerator2.default)(function*(_ref0){var candidate=_ref0.candidate;try{if(pcRef.current&&candidate){yield pcRef.current.addIceCandidate(new _reactNativeWebrtc.RTCIceCandidate(candidate));}}catch(e){}});return function(_x3){return _ref1.apply(this,arguments);};}());})();return function(){var _socketRef$current5;(_socketRef$current5=socketRef.current)==null||_socketRef$current5.disconnect();};},[]);(0,_react.useEffect)(function(){if(socketRef.current&&roomRef.current){socketRef.current.emit('webrtc:join',roomRef.current);}},[socketRef.current,roomRef.current]);var startCall=function(){var _ref10=(0,_asyncToGenerator2.default)(function*(){var _socketRef$current8;setCallState('connecting');try{_reactNativeIncallManager.default.start({media:'audio'});_reactNativeIncallManager.default.setForceSpeakerphoneOn(true);_reactNativeIncallManager.default.setSpeakerphoneOn(true);setSpeakerOn(true);}catch(_){}if(targetUserId){var _socketRef$current6;(_socketRef$current6=socketRef.current)==null||_socketRef$current6.emit('webrtc:invite',{to:targetUserId,room:roomRef.current});}pcRef.current=new _reactNativeWebrtc.RTCPeerConnection({iceServers:constantsV.ICE_SERVERS});try{pcRef.current.addTransceiver==null||pcRef.current.addTransceiver('audio',{direction:'sendrecv'});}catch(_){}pcRef.current.onicecandidate=function(event){try{var candidate=event==null?void 0:event.candidate;if(candidate){var _socketRef$current7;(_socketRef$current7=socketRef.current)==null||_socketRef$current7.emit('webrtc:ice',{room:roomRef.current,candidate:candidate});}}catch(_){}};pcRef.current.oniceconnectionstatechange=function(){try{var _pcRef$current6;var s=(_pcRef$current6=pcRef.current)==null?void 0:_pcRef$current6.iceConnectionState;console.log('ICE state (caller flow):',s);}catch(_){}};pcRef.current.onconnectionstatechange=function(){try{var _pcRef$current7;var s=(_pcRef$current7=pcRef.current)==null?void 0:_pcRef$current7.connectionState;setPcConnState(String(s||'unknown'));if(s==='connected'){setCallState('in_call');if(!callStartAt)setCallStartAt(Date.now());}if(s==='failed'){console.warn('ICE connection failed');}}catch(_){}};pcRef.current.oniceconnectionstatechange=function(){try{var _pcRef$current8;var s=(_pcRef$current8=pcRef.current)==null?void 0:_pcRef$current8.iceConnectionState;setIceState(String(s||'unknown'));console.log('ICE state (caller flow):',s);}catch(_){}};pcRef.current.ontrack=function(event){try{var _event$streams2;var _stream=(event==null||(_event$streams2=event.streams)==null?void 0:_event$streams2[0])||(event!=null&&event.track?new _reactNativeWebrtc.MediaStream([event.track]):null);if(_stream){remoteStreamRef.current=_stream;var tracks=_stream.getAudioTracks();tracks.forEach(function(t){return t.enabled=true;});setRemoteAudioTracks((tracks==null?void 0:tracks.length)||0);try{_reactNativeIncallManager.default.setForceSpeakerphoneOn(true);_reactNativeIncallManager.default.setSpeakerphoneOn(true);}catch(_){}if(callStateRef.current!=='in_call'){setCallState('in_call');}if(!callStartAt)setCallStartAt(Date.now());}}catch(_){}};pcRef.current.onaddstream=function(event){try{var _stream2=event==null?void 0:event.stream;if(_stream2){remoteStreamRef.current=_stream2;var tracks=_stream2.getAudioTracks();tracks.forEach(function(t){return t.enabled=true;});setRemoteAudioTracks((tracks==null?void 0:tracks.length)||0);try{_reactNativeIncallManager.default.setForceSpeakerphoneOn(true);_reactNativeIncallManager.default.setSpeakerphoneOn(true);}catch(_){}if(callStateRef.current!=='in_call'){setCallState('in_call');}if(!callStartAt)setCallStartAt(Date.now());}}catch(_){}};if(_reactNative.Platform.OS==='android'){try{var granted=yield _reactNative.PermissionsAndroid.request(_reactNative.PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);if(granted!==_reactNative.PermissionsAndroid.RESULTS.GRANTED){console.warn('Microphone permission denied');return;}}catch(e){console.warn('Mic permission request error',e);}}var stream=yield _reactNativeWebrtc.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});localStreamRef.current=stream;stream.getTracks().forEach(function(t){var _pcRef$current9;return(_pcRef$current9=pcRef.current)==null?void 0:_pcRef$current9.addTrack(t,stream);});try{pcRef.current.addStream==null||pcRef.current.addStream(stream);}catch(_){}try{var _stream$getAudioTrack2;setLocalAudioTracks(((_stream$getAudioTrack2=stream.getAudioTracks())==null?void 0:_stream$getAudioTrack2.length)||0);}catch(_){}var offer=yield pcRef.current.createOffer({offerToReceiveAudio:true});yield pcRef.current.setLocalDescription(offer);(_socketRef$current8=socketRef.current)==null||_socketRef$current8.emit('webrtc:offer',{room:roomRef.current,sdp:offer});});return function startCall(){return _ref10.apply(this,arguments);};}();var acceptCall=function(){var _ref11=(0,_asyncToGenerator2.default)(function*(){setCallState('connecting');try{_reactNativeIncallManager.default.start({media:'audio'});_reactNativeIncallManager.default.setForceSpeakerphoneOn(true);_reactNativeIncallManager.default.setSpeakerphoneOn(true);setSpeakerOn(true);}catch(_){}if(!pcRef.current){pcRef.current=new _reactNativeWebrtc.RTCPeerConnection({iceServers:constantsV.ICE_SERVERS});try{pcRef.current.addTransceiver==null||pcRef.current.addTransceiver('audio',{direction:'sendrecv'});}catch(_){}pcRef.current.onicecandidate=function(event){var candidate=event==null?void 0:event.candidate;if(candidate){var _socketRef$current9;(_socketRef$current9=socketRef.current)==null||_socketRef$current9.emit('webrtc:ice',{room:roomRef.current,candidate:candidate});}};pcRef.current.oniceconnectionstatechange=function(){try{var _pcRef$current0;var s=(_pcRef$current0=pcRef.current)==null?void 0:_pcRef$current0.iceConnectionState;console.log('ICE state (callee accepted):',s);}catch(_){}};pcRef.current.onconnectionstatechange=function(){var _pcRef$current1;var s=(_pcRef$current1=pcRef.current)==null?void 0:_pcRef$current1.connectionState;setPcConnState(String(s||'unknown'));if(s==='connected'){setCallState('in_call');if(!callStartAt)setCallStartAt(Date.now());}if(s==='failed'){console.warn('ICE connection failed');}};pcRef.current.oniceconnectionstatechange=function(){try{var _pcRef$current10;var s=(_pcRef$current10=pcRef.current)==null?void 0:_pcRef$current10.iceConnectionState;setIceState(String(s||'unknown'));console.log('ICE state (callee accepted):',s);}catch(_){}};pcRef.current.ontrack=function(event){var _event$streams3;var stream=(event==null||(_event$streams3=event.streams)==null?void 0:_event$streams3[0])||(event!=null&&event.track?new _reactNativeWebrtc.MediaStream([event.track]):null);if(stream){remoteStreamRef.current=stream;var tracks=stream.getAudioTracks();tracks.forEach(function(t){return t.enabled=true;});setRemoteAudioTracks((tracks==null?void 0:tracks.length)||0);try{_reactNativeIncallManager.default.setForceSpeakerphoneOn(true);_reactNativeIncallManager.default.setSpeakerphoneOn(true);}catch(_){}if(callStateRef.current!=='in_call'){setCallState('in_call');}if(!callStartAt)setCallStartAt(Date.now());}};pcRef.current.onaddstream=function(event){var stream=event==null?void 0:event.stream;if(stream){remoteStreamRef.current=stream;var tracks=stream.getAudioTracks();tracks.forEach(function(t){return t.enabled=true;});setRemoteAudioTracks((tracks==null?void 0:tracks.length)||0);try{_reactNativeIncallManager.default.setForceSpeakerphoneOn(true);_reactNativeIncallManager.default.setSpeakerphoneOn(true);}catch(_){}if(callStateRef.current!=='in_call'){setCallState('in_call');}if(!callStartAt)setCallStartAt(Date.now());}};}if(!localStreamRef.current){if(_reactNative.Platform.OS==='android'){try{var granted=yield _reactNative.PermissionsAndroid.request(_reactNative.PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);if(granted!==_reactNative.PermissionsAndroid.RESULTS.GRANTED){console.warn('Microphone permission denied');return;}}catch(e){console.warn('Mic permission request error',e);}}var stream=yield _reactNativeWebrtc.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});localStreamRef.current=stream;stream.getTracks().forEach(function(t){var _pcRef$current11;return(_pcRef$current11=pcRef.current)==null?void 0:_pcRef$current11.addTrack(t,stream);});try{pcRef.current.addStream==null||pcRef.current.addStream(stream);}catch(_){}try{var _stream$getAudioTrack3;setLocalAudioTracks(((_stream$getAudioTrack3=stream.getAudioTracks())==null?void 0:_stream$getAudioTrack3.length)||0);}catch(_){}}if(pendingOfferRef.current){var _socketRef$current0;yield pcRef.current.setRemoteDescription(new _reactNativeWebrtc.RTCSessionDescription(pendingOfferRef.current));var answer=yield pcRef.current.createAnswer();yield pcRef.current.setLocalDescription(answer);(_socketRef$current0=socketRef.current)==null||_socketRef$current0.emit('webrtc:answer',{room:roomRef.current,sdp:answer});pendingOfferRef.current=null;}else{var _socketRef$current1;(_socketRef$current1=socketRef.current)==null||_socketRef$current1.emit('webrtc:ready',{room:roomRef.current});}});return function acceptCall(){return _ref11.apply(this,arguments);};}();var toggleSpeaker=function toggleSpeaker(next){var desired=typeof next==='boolean'?next:!speakerOn;setSpeakerOn(desired);try{_reactNativeIncallManager.default.setForceSpeakerphoneOn(desired);_reactNativeIncallManager.default.setSpeakerphoneOn(desired);}catch(e){console.warn('toggleSpeaker error',e);}};var declineCall=function declineCall(){var _socketRef$current10;(_socketRef$current10=socketRef.current)==null||_socketRef$current10.emit('webrtc:decline',{room:roomRef.current});endCall();};var cancelCall=function cancelCall(){var _socketRef$current11;if(incoming){declineCall();return;}(_socketRef$current11=socketRef.current)==null||_socketRef$current11.emit('webrtc:cancel',{room:roomRef.current});endCall();};var endCall=function endCall(){try{var _localStreamRef$curre2;(_localStreamRef$curre2=localStreamRef.current)==null||(_localStreamRef$curre2=_localStreamRef$curre2.getTracks())==null||_localStreamRef$curre2.forEach(function(t){return t.stop();});}catch(e){}try{var _pcRef$current12;(_pcRef$current12=pcRef.current)==null||_pcRef$current12.close();}catch(e){}pcRef.current=null;setCallState('ended');try{_reactNativeIncallManager.default.stopRingtone();_reactNativeIncallManager.default.stop();}catch(_){}};(0,_react.useEffect)(function(){if(callState==='ringing'){try{_reactNativeIncallManager.default.start({media:'audio'});_reactNativeIncallManager.default.startRingtone('default',[0,500,500],'AVAudioSessionCategorySoloAmbient',30);}catch(_){if(_reactNative.Platform.OS!=='web'){_reactNative.Vibration.vibrate([0,500,500],true);}}}else if(callState==='in_call'||callState==='connecting'){try{_reactNativeIncallManager.default.stopRingtone();_reactNativeIncallManager.default.start({media:'audio'});_reactNativeIncallManager.default.setForceSpeakerphoneOn(true);_reactNativeIncallManager.default.setMicrophoneMute(false);}catch(_){}_reactNative.Vibration.cancel();}else if(callState==='ended'||callState==='idle'){try{_reactNativeIncallManager.default.stopRingtone();_reactNativeIncallManager.default.stop();}catch(_){}_reactNative.Vibration.cancel();}},[callState]);(0,_react.useEffect)(function(){if(callStartAt&&callState==='in_call'){var id=setInterval(function(){setElapsedSec(Math.floor((Date.now()-callStartAt)/1000));},1000);return function(){return clearInterval(id);};}},[callStartAt,callState]);(0,_react.useEffect)(function(){if(callState==='ended'||callState==='idle'){setCallStartAt(null);setElapsedSec(0);}},[callState]);var formatDuration=function formatDuration(s){var mm=Math.floor(s/60).toString().padStart(2,'0');var ss=(s%60).toString().padStart(2,'0');return`${mm}:${ss}`;};return(0,_jsxRuntime.jsxs)(_reactNative.View,{style:styles.container,children:[(0,_jsxRuntime.jsx)(_reactNative.Text,{style:styles.title,children:"Audio Streaming"}),(0,_jsxRuntime.jsx)(_reactNative.Text,{style:styles.subtitle,children:callState==='ringing'&&incoming&&(partnerName||targetUserName||targetUserId)?`Incoming call from ${partnerName||targetUserName||targetUserId}`:callState==='in_call'&&(partnerName||targetUserName||targetUserId)?`In call with ${partnerName||targetUserName||targetUserId} • ${formatDuration(elapsedSec)}`:partnerName||targetUserName?`Calling ${partnerName||targetUserName}`:'Select a user to start a call'}),(0,_jsxRuntime.jsxs)(_reactNative.Text,{style:styles.debug,children:["ICE: ",iceState," \u2022 PC: ",pcConnState," \u2022 Local audio: ",localAudioTracks," \u2022 Remote audio: ",remoteAudioTracks]}),(0,_jsxRuntime.jsxs)(_reactNative.View,{style:styles.controls,children:[callState==='ringing'&&(0,_jsxRuntime.jsxs)(_jsxRuntime.Fragment,{children:[(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{style:styles.primaryBtn,onPress:acceptCall,children:(0,_jsxRuntime.jsx)(_reactNative.Text,{style:styles.btnText,children:"Accept"})}),(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{style:styles.dangerBtn,onPress:declineCall,children:(0,_jsxRuntime.jsx)(_reactNative.Text,{style:styles.btnText,children:"Decline"})})]}),callState==='idle'&&(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{style:styles.primaryBtn,onPress:startCall,children:(0,_jsxRuntime.jsx)(_reactNative.Text,{style:styles.btnText,children:"Start Call"})}),callState==='connecting'&&(0,_jsxRuntime.jsxs)(_jsxRuntime.Fragment,{children:[(0,_jsxRuntime.jsx)(_reactNative.Text,{style:styles.status,children:"Connecting\u2026"}),(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{style:styles.dangerBtn,onPress:cancelCall,children:(0,_jsxRuntime.jsx)(_reactNative.Text,{style:styles.btnText,children:"Cancel"})})]}),callState==='in_call'&&(0,_jsxRuntime.jsxs)(_jsxRuntime.Fragment,{children:[(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{style:speakerOn?styles.primaryBtn:styles.neutralBtn,onPress:function onPress(){return toggleSpeaker();},children:(0,_jsxRuntime.jsx)(_reactNative.Text,{style:styles.btnText,children:speakerOn?'Big Speaker: On':'Big Speaker: Off'})}),(0,_jsxRuntime.jsx)(_reactNative.TouchableOpacity,{style:styles.dangerBtn,onPress:endCall,children:(0,_jsxRuntime.jsx)(_reactNative.Text,{style:styles.btnText,children:"End Call"})})]}),callState==='ended'&&(0,_jsxRuntime.jsx)(_reactNative.Text,{style:styles.status,children:"Call Ended"})]})]});};var styles=_reactNative.StyleSheet.create({container:{flex:1,padding:16,alignItems:'center',justifyContent:'center'},title:{fontSize:22,fontWeight:'600',marginBottom:8},subtitle:{fontSize:14,color:'#666',marginBottom:8},debug:{fontSize:12,color:'#888',marginBottom:16},controls:{alignItems:'center',gap:12},primaryBtn:{backgroundColor:'#3b82f6',paddingVertical:10,paddingHorizontal:16,borderRadius:8},dangerBtn:{backgroundColor:'#ef4444',paddingVertical:10,paddingHorizontal:16,borderRadius:8},neutralBtn:{backgroundColor:'#6b7280',paddingVertical:10,paddingHorizontal:16,borderRadius:8},btnText:{color:'#fff',fontWeight:'600'},status:{fontSize:16,color:'#333'}});var _default=exports["default"]=AudioCallScreen;

/***/ }),

/***/ "./src/services/users/userService.ts":
/*!*******************************************!*\
  !*** ./src/services/users/userService.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "./node_modules/@babel/runtime/helpers/interopRequireDefault.js");Object.defineProperty(exports, "__esModule", ({value:true}));exports["default"]=void 0;var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ "./node_modules/@babel/runtime/helpers/asyncToGenerator.js"));var _classCallCheck2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ "./node_modules/@babel/runtime/helpers/classCallCheck.js"));var _createClass2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/createClass */ "./node_modules/@babel/runtime/helpers/createClass.js"));var _axios=_interopRequireDefault(__webpack_require__(/*! axios */ "./node_modules/axios/dist/browser/axios.cjs"));var _asyncStorage=_interopRequireDefault(__webpack_require__(/*! @react-native-async-storage/async-storage */ "./src/shims/asyncStorageShim.web.ts"));var _constatantsV=__webpack_require__(/*! ../../constants/constatantsV */ "./src/constants/constatantsV.tsx");var _mockData=__webpack_require__(/*! ../mock/mockData */ "./src/services/mock/mockData.ts");var UserService=function(){function UserService(){(0,_classCallCheck2.default)(this,UserService);this.baseUrl=`${_constatantsV.BASE_URL}/users`;}return(0,_createClass2.default)(UserService,[{key:"getAuthHeader",value:function(){var _getAuthHeader=(0,_asyncToGenerator2.default)(function*(){var token=yield _asyncStorage.default.getItem('auth_token');return{Authorization:`Bearer ${token}`};});function getAuthHeader(){return _getAuthHeader.apply(this,arguments);}return getAuthHeader;}()},{key:"listUsers",value:function(){var _listUsers=(0,_asyncToGenerator2.default)(function*(search){if(_constatantsV.OFFLINE_MODE){var q=String(search||'').toLowerCase();var arr=_mockData.mockUsers.filter(function(u){return!q||u.name.toLowerCase().includes(q)||(u.email||'').toLowerCase().includes(q);});return arr.map(function(u){return Object.assign({},u);});}var headers=yield this.getAuthHeader();var params=search?{search:search}:{};var _yield$axios$get=yield _axios.default.get(this.baseUrl,{headers:headers,params:params}),data=_yield$axios$get.data;return data.data;});function listUsers(_x){return _listUsers.apply(this,arguments);}return listUsers;}()}]);}();var _default=exports["default"]=new UserService();

/***/ }),

/***/ "./src/shims/webrtcShim.web.ts":
/*!*************************************!*\
  !*** ./src/shims/webrtcShim.web.ts ***!
  \*************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "./node_modules/@babel/runtime/helpers/interopRequireDefault.js");Object.defineProperty(exports, "__esModule", ({value:true}));exports.mediaDevices=exports.RTCSessionDescription=exports.RTCPeerConnection=exports.RTCIceCandidate=exports.MediaStream=void 0;var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ "./node_modules/@babel/runtime/helpers/asyncToGenerator.js"));var _classCallCheck2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/classCallCheck */ "./node_modules/@babel/runtime/helpers/classCallCheck.js"));var _createClass2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/createClass */ "./node_modules/@babel/runtime/helpers/createClass.js"));var RTCPeerConnection=exports.RTCPeerConnection=function(){function RTCPeerConnection(){(0,_classCallCheck2.default)(this,RTCPeerConnection);this.connectionState='new';this.iceConnectionState='new';this.onicecandidate=null;this.onconnectionstatechange=null;this.oniceconnectionstatechange=null;this.ontrack=null;this.onaddstream=null;}return(0,_createClass2.default)(RTCPeerConnection,[{key:"addTransceiver",value:function addTransceiver(){}},{key:"addTrack",value:function addTrack(){}},{key:"addStream",value:function addStream(){}},{key:"setRemoteDescription",value:function(){var _setRemoteDescription=(0,_asyncToGenerator2.default)(function*(_desc){});function setRemoteDescription(_x){return _setRemoteDescription.apply(this,arguments);}return setRemoteDescription;}()},{key:"setLocalDescription",value:function(){var _setLocalDescription=(0,_asyncToGenerator2.default)(function*(_desc){});function setLocalDescription(_x2){return _setLocalDescription.apply(this,arguments);}return setLocalDescription;}()},{key:"createOffer",value:function(){var _createOffer=(0,_asyncToGenerator2.default)(function*(_opts){return{sdp:'',type:'offer'};});function createOffer(_x3){return _createOffer.apply(this,arguments);}return createOffer;}()},{key:"createAnswer",value:function(){var _createAnswer=(0,_asyncToGenerator2.default)(function*(){return{sdp:'',type:'answer'};});function createAnswer(){return _createAnswer.apply(this,arguments);}return createAnswer;}()},{key:"addIceCandidate",value:function(){var _addIceCandidate=(0,_asyncToGenerator2.default)(function*(_candidate){});function addIceCandidate(_x4){return _addIceCandidate.apply(this,arguments);}return addIceCandidate;}()},{key:"close",value:function close(){}}]);}();var RTCIceCandidate=exports.RTCIceCandidate=(0,_createClass2.default)(function RTCIceCandidate(_init){(0,_classCallCheck2.default)(this,RTCIceCandidate);});var RTCSessionDescription=exports.RTCSessionDescription=(0,_createClass2.default)(function RTCSessionDescription(_init){(0,_classCallCheck2.default)(this,RTCSessionDescription);});var MediaStream=exports.MediaStream=function(){function MediaStream(tracks){(0,_classCallCheck2.default)(this,MediaStream);this.audioTracks=[];this.audioTracks=tracks||[];}return(0,_createClass2.default)(MediaStream,[{key:"getAudioTracks",value:function getAudioTracks(){return this.audioTracks;}}]);}();var mediaDevices=exports.mediaDevices={getUserMedia:function(){var _getUserMedia=(0,_asyncToGenerator2.default)(function*(_constraints){return new MediaStream([]);});function getUserMedia(_x5){return _getUserMedia.apply(this,arguments);}return getUserMedia;}()};

/***/ })

}]);
//# sourceMappingURL=src_screens_audio_AudioCallScreen_tsx.bundle.js.map