(self["webpackChunkVooDooSmart"] = self["webpackChunkVooDooSmart"] || []).push([["src_shims_audioShim_web_ts"],{

/***/ "./src/shims/audioShim.web.ts":
/*!************************************!*\
  !*** ./src/shims/audioShim.web.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var _interopRequireDefault=__webpack_require__(/*! @babel/runtime/helpers/interopRequireDefault */ "./node_modules/@babel/runtime/helpers/interopRequireDefault.js");Object.defineProperty(exports, "__esModule", ({value:true}));exports.playAlternatingBeeps=exports["default"]=void 0;var _asyncToGenerator2=_interopRequireDefault(__webpack_require__(/*! @babel/runtime/helpers/asyncToGenerator */ "./node_modules/@babel/runtime/helpers/asyncToGenerator.js"));var playAlternatingBeeps=exports.playAlternatingBeeps=function(){var _ref=(0,_asyncToGenerator2.default)(function*(){var _opts$count,_opts$durationMs,_opts$gapMs,_opts$freqs;var opts=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{};var count=(_opts$count=opts.count)!=null?_opts$count:6;var durationMs=(_opts$durationMs=opts.durationMs)!=null?_opts$durationMs:180;var gapMs=(_opts$gapMs=opts.gapMs)!=null?_opts$gapMs:120;var freqs=(_opts$freqs=opts.freqs)!=null?_opts$freqs:[880,1320];var AC=window.AudioContext||window.webkitAudioContext;if(!AC){return;}var ctx=new AC();var sleep=function sleep(ms){return new Promise(function(res){return setTimeout(res,ms);});};try{for(var i=0;i<count;i++){var osc=ctx.createOscillator();var gain=ctx.createGain();osc.type='sine';var freq=freqs[i%freqs.length];try{osc.frequency.setValueAtTime(freq,ctx.currentTime);}catch(_unused){osc.frequency.value=freq;}try{gain.gain.setValueAtTime(0.001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.2,ctx.currentTime+0.02);}catch(_unused2){gain.gain.value=0.2;}osc.connect(gain).connect(ctx.destination);try{osc.start();}catch(_unused3){}yield sleep(durationMs);try{osc.stop();}catch(_unused4){}yield sleep(gapMs);}}finally{try{yield ctx.close();}catch(_unused5){}}});return function playAlternatingBeeps(){return _ref.apply(this,arguments);};}();var _default=exports["default"]={playAlternatingBeeps:playAlternatingBeeps};

/***/ })

}]);
//# sourceMappingURL=src_shims_audioShim_web_ts.bundle.js.map