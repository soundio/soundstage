const noop = function() {};

export const print = window.console ?
    console.log.bind(console, '%cNode %c%s', 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;') :
    noop ;

export const printGroup = window.console ?
    console.groupCollapsed.bind(console, '%cNode %c%s', 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;') :
    noop ;

export const printGroupEnd = window.console ?
    console.groupEnd.bind(console) :
    noop ;
