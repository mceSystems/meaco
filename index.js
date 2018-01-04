const JarvisEmitter = require("jarvis-emitter");

function meaco(genFunction, ...args) {
	const promiseRet = new JarvisEmitter();
	let rejected = false;
	const caller = genFunction(...args);
	function nextCall(lastWasError, ...args) {
		if (lastWasError) {
			promiseRet.callError(...args);
			return;
		}
		let nextYield;
		try {
			nextYield = caller.next(...args);
		} catch (e) {
			promiseRet.callCatch(e);
			return;
		}
		// was it rejected?
		if (rejected) {
			return;
		}

		const done = nextYield.done;
		let promise = nextYield.value;
		let fn = "then";
		let catchFn = "";
		const errorFn = "error";

		if (!promise || done) {
			promiseRet.callDone(promise);
			return;
		}

		if (typeof promise === "object" && promise.promise && promise.fn) {
			({ promise, fn } = promise);
		} else if (promise.constructor.name === "JarvisEmitter" || (promise instanceof JarvisEmitter)) {
			// this will not work in case promise is and instance of JarvisEmitter and code is minified
			fn = "done";
			catchFn = "catch";
		}

		if (promise[fn]) {
			promise[fn](nextCall.bind(this, false), nextCall.bind(this, true));
			if (promise[errorFn]) {
				promise[errorFn](nextCall.bind(this, true));
			}
			if (catchFn && promise[catchFn]) {
				promise[catchFn](promiseRet.callCatch.bind(this));
			}
			return;
		}
		promiseRet.callDone(promise);
	}
	nextCall(false);
	return promiseRet;
}

module.exports = meaco;
