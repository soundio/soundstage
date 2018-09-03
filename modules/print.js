const noop = function() {};

export const print = window.console ?
    console.log.bind(console, '%cSoundstage %c%s', 'color: #e02053; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;') :
    noop ;

export const printGroup = window.console ?
    console.groupCollapsed.bind(console, '%cSoundstage %c%s', 'color: #e02053; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;') :
    noop ;

export const printGroupEnd = window.console ?
    console.groupEnd.bind(console) :
    noop ;
