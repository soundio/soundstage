# collection
An observable array-like object constructor.


#### Collection(array, options)

Returns an array-like object with a number of methods for managing a collection.

    var collection = Collection();

##### collection.add(object)
##### collection.update(object)
##### collection.remove()

<code>.remove()</code> Removes all objects from the collection.

<code>.remove(id)</code> Removes object found via <code>collection.find(id)</code> from the collection.

<code>.remove(object)</code> Removes object found via <code>collection.find(object)</code> from the collection.

##### collection.find()

<code>.find(id)</code> returns the object in the collection with that id, or <code>undefined</code>.

<code>.find(object)</code> returns <code>object</code> if it is already in the collection. Otherwise if <code>object</code> has an <code>id</code>, that is used to <code>.find(id)</code> an object.

##### collection.query(queryObject)

Filters the collection by the properties of <code>queryObject</code>

##### collection.sort()

<code>.sort()</code> sorts the collection by <code>object.id</code> by default. Override the default by defining <code>options.sort</code> as a function.

<code>.sort(fn)</code> sorts the collection by the return value of <code>fn</code>, like <code>array.sort(fn)</code>.

##### collection.sub(queryObject)

Creates a new collection that is bound to the current one, but filtered by <code>queryObject</code>.

##### collection.get(name)

If they all have the same value, returns value of property <code>name</code> of the objects in the collection. Otherwise returns <code>undefined</code>.

##### collection.set(name, value)

Sets property <code>name</code> of all objects in the collection to <code>value</code>.

##### collection.on()
##### collection.off()
##### collection.trigger()
##### collection.push()
##### collection.pop()
##### collection.splice()

Also, a Collection inherits the Array methods:

- <code>.map()</code>
- <code>.reduce()</code>
- <code>.concat()</code>
- <code>.slice()</code>
- <code>.some()</code>
- <code>.indexOf()</code>
- <code>.forEach()</code>
