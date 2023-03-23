/*var registry = {};

function register(path, module) {
    if (registry[path]) {
        throw new Error('soundstage: Calling Soundstage.register(name, fn) but name already registered: ' + name);
    }

    registry[name] = module;
}
*/
var modules = {};

export default function importPlugin(path) {
    path = /\.js$/.test(path) ? path : path + '.js' ;

    // Don't request the module again if it's already been registered
    return modules[path] || (
        modules[path] = import(path).then(function(module) {
            /*register(path, module);*/
            return module.default;
        })
    );
};
