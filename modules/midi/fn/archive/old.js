	//function curryUntil(fn, test) {
	//	// Returns partially applied functions until some condition `test`
	//	// is met, when `fn` is called
	//	return function curried() {
	//		return test.apply(null, arguments) ?
	//			fn.apply(null, arguments) :
	//			bind(arguments, curried) ;
	//	};
	//}


	//function intersectScales(arr1, arr2) {
	//	// A fast intersect that assumes arrays are sorted (ascending) numbers.
	//	var l1 = arr1.length, l2 = arr2.length;
	//	var i1 = 0, i2 = 0;
	//	var arr3 = [];
	//
	//	while (i1 < l1 && i2 < l2) {
	//		if (arr1[i1] === arr2[i2]) {
	//			arr3.push(arr1[i1]);
	//			++i1;
	//			++i2;
	//		}
	//		else if (arr2[i2] > arr1[i1]) { ++i1; }
	//		else { ++i2; }
	//	}
	//
	//	return arr3;
	//}

	//function diffScales(arr1, arr2) {
	//	// A fast diff that assumes arrays are sorted (ascending) numbers.
	//	var l1 = arr1.length, l2 = arr2.length,
	//	    i1 = 0, i2 = 0,
	//	    arr3 = [], n;
	//
	//	while (i1 < l1) {
	//		while (i2 < l2 && arr1[i1] > arr2[i2]) {
	//			arr3.push(arr2[i2]);
	//			++i2;
	//		}
	//
	//		if (arr1[i1] !== arr2[i2]) {
	//			arr3.push(arr1[i1]);
	//		}
	//
	//		n = arr1[i1];
	//		while (n === arr1[i1] && ++i1 < l1);
	//		while (n === arr2[i2] && ++i2 < l2);
	//	}
	//
	//	while (i2 < l2) {
	//		arr3.push(arr2[i2]);
	//		++i2;
	//	}
	//
	//	return arr3;
	//}