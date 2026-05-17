const meaco = require("../");
const JarvisEmitter = require("jarvis-emitter");
const { expect } = require("chai");

describe("meaco", () => {
	it("Testing JarvisEmitter, should sum 2 and 3 and resolve with 5", (done) => {
		const deferNumber = (d) => {
			const emitter = new JarvisEmitter();
			setTimeout(() => {
				emitter.callDone(d);
			}, 200);
			return emitter;
		}
		meaco(function* () {
			const a = yield deferNumber(2);
			const b = yield deferNumber(3);
			return a + b;
		})
			.done((sum) => {
				try {
					expect(sum).to.equal(5);
				} catch(e) {
					return done(e);
				}
				done();
			});
	});
	it("Testing mixed JarvisEmitter and Promise, should sum 2 and 3 and resolve with 5", (done) => {
		const deferNumber = (d) => {
			const emitter = new JarvisEmitter();
			setTimeout(() => {
				emitter.callDone(d);
			}, 200);
			return emitter;
		}
		const deferNumberWithPromise = (d) => {
			return new Promise((resolve, reject) => {
				setTimeout(() => {
					resolve(d);
				}, 200);
			});
		}
		meaco(function* () {
			const a = yield deferNumber(2);
			const b = yield deferNumberWithPromise(3);
			return a + b;
		})
			.done((sum) => {
				try {
					expect(sum).to.equal(5);
				} catch(e) {
					return done(e);
				}
				done();
			});
	});
	it("Testing JarvisEmitter, should reject with error", (done) => {
		const doError = () => {
			const emitter = new JarvisEmitter();
			setTimeout(() => {
				emitter.callError();
			}, 200);
			return emitter;
		}
		meaco(function* () {
			yield doError();
		})
			.error(() => {
				done();
			})
			.done((sum) => {
				done(new Error("Reached done though error should have been called"));
			});
	});
	it("Testing Promise, should reject with error", (done) => {
		const doRejection = () => {
			return new Promise((resolve, reject) => {
				setTimeout(reject, 200);
			});
		}
		meaco(function* () {
			yield doRejection();
		})
			.error(() => {
				done();
			})
			.done((sum) => {
				done(new Error("Reached done though promise should have rejected"));
			});
	});
	it("Testing exception catching, should call catch interface", (done) => {
		meaco(function* () {
			throw new Error();
		})
			.catch(() => {
				done();
			})
			.done((sum) => {
				done(new Error("Reached done though an exception should have been caught"));
			});
	});

	it("Testing duck-type detection, emitter-like object that fails instanceof JarvisEmitter", (done) => {
		// Simulates the PROD-58888 production scenario where two copies of jarvis-emitter
		// coexist in the resolved module tree (top-level v3 + nested v2 under meaco):
		// a yielded JarvisEmitter subclass extends one class identity, but the
		// JarvisEmitter binding inside meaco/index.js refers to the other. Both
		// `instanceof JarvisEmitter` and `constructor.name === "JarvisEmitter"` fail,
		// leaving only the duck-type fallback to detect it.
		const makeEmitterLike = (d) => {
			let doneCb = null;
			const obj = {
				done(cb) { doneCb = cb; return obj; },
				callDone(val) { if (doneCb) { doneCb(val); } return obj; },
				error() { return obj; },
				catch() { return obj; },
			};
			setTimeout(() => obj.callDone(d), 50);
			return obj;
		};
		meaco(function* () {
			const a = yield makeEmitterLike(7);
			const b = yield makeEmitterLike(11);
			return a + b;
		})
			.done((sum) => {
				try {
					expect(sum).to.equal(18);
				} catch (e) {
					return done(e);
				}
				done();
			});
	});

	it("Testing duck-type detection, error path on emitter-like object", (done) => {
		// Verifies the error handler is wired up on duck-typed objects so a
		// rejection propagates back through the coroutine.
		const makeEmitterLike = () => {
			let errorCb = null;
			const obj = {
				done() { return obj; },
				callDone() { return obj; },
				error(cb) { errorCb = cb; return obj; },
				callError() { if (errorCb) { errorCb(); } return obj; },
				catch() { return obj; },
			};
			setTimeout(() => obj.callError(), 50);
			return obj;
		};
		meaco(function* () {
			yield makeEmitterLike();
		})
			.error(() => done())
			.done(() => done(new Error("Reached done though error should have been called")));
	});

	it("Testing null-prototype yield, should not crash detection", (done) => {
		// Object.create(null) has no `.constructor`, so a naive
		// `promise.constructor.name` check would throw before reaching the
		// duck-type fallback. The guarded detection lets such a value fall
		// through to callDone as a plain resolved value.
		const nullProtoValue = Object.create(null);
		nullProtoValue.label = "no-prototype";
		meaco(function* () {
			yield nullProtoValue;
			return "unreachable";
		})
			.catch((err) => done(err))
			.done((val) => {
				try {
					expect(val).to.equal(nullProtoValue);
				} catch (e) {
					return done(e);
				}
				done();
			});
	});

	it("Testing arguments passing, should call done interface with sum of passed numbers", (done) => {
		const numbers = [1,2,3,4,5];
		const expectedSum = numbers.reduce((a,b) => {return a + b}, 0);
		meaco(function* (...numbers) {
			return numbers.reduce((a,b) => {return a + b}, 0);
		}, ...numbers)
			.catch((err) => {
				done(err);
			})
			.error((err) => {
				done(err);
			})
			.done((sum) => {
				if(expectedSum === sum){
					return done();
				}
				done(new Error(`Expected sumc ${expectedSum} but got sum=${sum}`));
			});
	});
});