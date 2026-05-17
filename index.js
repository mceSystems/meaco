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
		} else if (
			promise.constructor.name === "JarvisEmitter"
			|| (promise instanceof JarvisEmitter)
			|| (typeof promise.done === "function" && typeof promise.callDone === "function")
		) {
			// Duck-type check covers JarvisEmitter subclasses (e.g. NPPHandler) and
			// cross-version duplicates where `instanceof` fails because two copies of
			// jarvis-emitter coexist in the resolved tree (different class identities).
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
