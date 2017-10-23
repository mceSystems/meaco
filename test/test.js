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
});