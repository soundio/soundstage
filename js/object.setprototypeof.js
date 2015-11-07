if (!Object.setPrototypeOf) {
	// Only works in Chrome and FireFox, does not work in IE:
	Object.setPrototypeOf = function setPrototypeOf(obj, prototype) {
	  obj.__proto__ = prototype;
	  return obj; 
	}
}