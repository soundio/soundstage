const $privates = Symbol('privates');

export function Privates(object) {
    return object[$privates] || (object[$privates] = {});
}
