const $privates = Symbol('privates');

export function getPrivates(object) {
    return object[$privates] || (object[$privates] = {});
}
