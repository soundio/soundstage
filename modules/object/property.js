
/**
isReadOnlyProperty(name, object)
Inspects an object and its prototype chain to see if a named property is readonly.
Return `true` or `false`.
**/

export function isReadOnlyProperty(name, object) {
    let prototype = object;
    while (!prototype.hasOwnProperty(name)) prototype = Object.getPrototypeOf(prototype);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    return !descriptor.set && !('value' in descriptor);
}
