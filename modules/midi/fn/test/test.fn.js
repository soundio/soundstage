
console.log('%cFn()', 'color: #bada55; font-weight: 700; font-size: 1rem;');

var Fn = window.Fn;
var Stream = window.Stream;

test('Fn(fn)', function() {
	var fr = Fn(function() { return 6; });

	equals(6, fr.shift());
	equals(6, fr.shift());
	equals(6, fr.shift());
	equals(undefined, fr.status);
});

test('Fn(array)', function() {
	var fr = Fn([6]);
	equals(6, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());

	var fr = Fn([0, 'lamb', true, false]);
	equals(0, fr.shift());
	equals('lamb', fr.shift());
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());

	var fr = Fn([undefined, true, false]);
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());

	var fr = Fn([true, undefined, false]);
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());

	var fr = Fn([true, null, false]);
	equals(true, fr.shift());
	equals(null, fr.shift());
	equals(false, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());
});

test('Fn.of()', function() {
	var fr = Fn.of(6);
	equals(6, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());

	var fr = Fn.of(0,'lamb',true,false);
	equals(0, fr.shift());
	equals('lamb', fr.shift());
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());

	var fr = Fn.of(undefined,true,false);
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());

	var fr = Fn.of(true,undefined,false);
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());

	var fr = Fn.of(true, null, false);
	equals(true, fr.shift());
	equals(null, fr.shift());
	equals(false, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());
});

test('.chain()', function() {
	var n = 0;

	function toJust01() {
		return Fn.of(0,1);
	}

	function toJust01Nothing() {
		return n++ ? Fn.of(0,1) : Fn.of() ;
	}

	var fr = Fn(function() { return 1; }).chain(toJust01);

	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());

	var fr = Fn.of(1,0).chain(toJust01);
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());

	var fr = Fn.of(1,0).chain(toJust01Nothing);
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());
	equals(undefined, fr.shift());
	equals(undefined, fr.shift());
});

test('.chunk()', function() {
	var f = Fn.of(0,1,2,3,4,5,6,7,8).chunk(2);
	equals('0,1', f.shift().toArray().join());
	equals('2,3', f.shift().toArray().join());
	equals('4,5', f.shift().toArray().join());
	equals('6,7', f.shift().toArray().join());
	equals(undefined, f.shift());
});

test('.clone()', function() {
	var s1 = Fn([0,1,2,3]);
	var s2 = s1.clone();

	equals('0,1,2,3', s1.toArray().join());
	equals('done',    s1.status);
	equals('0,1,2,3', s2.toArray().join());
	equals('done',    s2.status);

	s1 = Fn([0,1,2,3]);
	s2 = s1.clone();
	s3 = s1.clone();

	equals('0,1,2,3', s2.toArray().join());
	equals('done',    s2.status);
	equals('0,1,2,3', s3.toArray().join());
	equals('done',    s3.status);

	s1 = Fn([0,1,2,3]);
	s2 = s1.clone();
	s3 = s2.clone();
	var a2 = s2.toArray();
	var a3 = s3.toArray();

	equals('done',    s2.status);
	equals('done',    s3.status);
	equals('0,1,2,3', a2.join());
	equals('0,1,2,3', a3.join());
});

test('.concat()', function() {
	var n = Fn.of(1,0,1,0).concat([8,9]);
	equals('1,0,1,0,8,9', n.toArray().join());

	var n = Fn.of(1,0,1,0).concat(Fn.of(8,9));
	equals('1,0,1,0,8,9', n.toArray().join());

	var n = Fn.of(1,0,1,0).concat(Fn.of(8,9), Fn.of(10,11));
	equals('1,0,1,0,8,9,10,11', n.toArray().join());
});

test('.dedup()', function() {
	var n = Fn.of(1,0,1,0).dedup();
	equals('1,0,1,0', n.toArray().join());
	equals('done', n.status);

	var n = Fn.of(1,1,1,0).dedup();
	equals(1, n.shift());
	equals(0, n.shift());
	equals('done', n.status);
	equals(undefined, n.shift());

	var n = Fn.of(1,2,2,2,6,0).dedup();
	equals('1,2,6,0', n.toArray().join());
	equals('done', n.status);
});

test('.each()', function() {
	var buffer = [];
	var fr = Fn.of(1,0,1,0).each(function(value) {
		buffer.push(value);
	});

	equals('1,0,1,0', buffer.join());

	var buffer = [];
	var fr = Fn.of(1,0,undefined,1,0).each(function(value) {
		buffer.push(value);
	});

	equals('1,0,1,0', buffer.join());
});

test('.fold()', function() {
	var fn = Fn.of(1,0,1,0).fold(Fn.add, 2);
	equals(2, fn.shift());
	equals(3, fn.shift());
	equals(3, fn.shift());
	equals(4, fn.shift());
	equals(undefined, fn.status);
	equals(4, fn.shift());
	equals('done', fn.status);
	equals(undefined, fn.shift());
});

test('.join()', function() {
	var fr = Fn(function() { return [0,1]; }).join();
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());

	var fr = Fn.of([0,1,0],[1],[0]).join();
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());

	var fr = Fn.of([0,1,0],undefined,[1],[0]).join();
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());

	var fr = Fn.of([0,1,0],[undefined],[1],[0]).join();
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals(1, fr.shift());
	equals(0, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());
});

test('.last()', function() {
	var f = Fn.of(0,1,'one',true,2,false,true,'two',3,'three').latest();
	equals('three', f.shift());
	equals(undefined, f.shift());

	var f = Stream.of(0,1,'one',true,2,false,true,'two',3,'three').latest();
	equals('three', f.shift());
	equals(undefined, f.shift());
});

test('.map()', function() {
	var fr = Fn(function() { return 6; }).map(Fn.add(2));
	equals(8, fr.shift());
	equals(8, fr.shift());
	equals(8, fr.shift());

	var fr = Fn.of(6).map(Fn.add(2));
	equals(8, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());

	var fr = Fn.of(0,'lamb',true,false,null).map(Fn.isDefined);
	equals(true, fr.shift());
	equals(true, fr.shift());
	equals(true, fr.shift());
	equals(true, fr.shift());
	equals(false, fr.shift());
	equals('done', fr.status);
	equals(undefined, fr.shift());
});

test('.partition()', function() {
	var f = Fn.of(0,1,'one',true,2,false,true,'two',3,'three').partition(Fn.toType);
	equals('0,1,2,3', f.shift().toArray().join());
	equals('one,two,three', f.shift().toArray().join());
	equals('true,false,true', f.shift().toArray().join());
	equals(undefined, f.shift());

	var f = Fn.of({a:0},{a:0},{a:'0'},{a:'0'},{b:5}).partition(Fn.get('a'));
	equals('[{"a":0},{"a":0}]', JSON.stringify(f.shift()));
	equals('[{"a":"0"},{"a":"0"}]', JSON.stringify(f.shift()));
	equals('[{"b":5}]', JSON.stringify(f.shift()));
	equals(undefined, f.shift());
});

test('.pipe()', function() {
	var s1 = Fn([0,1,2,3]);
	var s2 = s1.pipe(Stream.of());

	equals('0,1,2,3', s2.toArray().join());
	equals('done', s1.status);

	var s1 = Fn.of(1,2);
	var s2 = Fn.of(3);
	var s3 = Stream.of(0);

	s3.name = 's3';

	var results = [];

	s1.pipe(s3);
	s2.pipe(s3);

	s3.each(function(value) {
		results.push(value);
	});

	equals('0,1,2,3', results.join());

	var s1 = Stream.of(1,2);
	var s2 = Stream.of(3);
	var s3 = Stream.of(0);

	s3.name = 's3';

	var results = [];

	s1.pipe(s3);
	s2.pipe(s3);

	s3.each(function(value) {
		results.push(value);
	});

	equals('0,1,2,3', results.join());

	results = [];

	s1.push(0);
	s1.push(1);
	s1.stop();
	s1.push(2);
	s1.push(3);

	equals('0,1', results.join());
});

test('.reduce()', function() {
	var fn  = Fn.of(1,0,1,0);
	var val = fn.reduce(Fn.add, 2);
	equals(4, val);
	equals(undefined, fn.shift());
});

test('.unique()', function() {
	equals('0,1,2,3,4', Fn.of(0,0,1,1,1,2,3,3,3,3,3,4,4).unique().toArray().join());
});
