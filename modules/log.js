
import noop     from 'fn/noop.js';
import truncate from 'fn/truncate.js';


// Log

export const log = window.DEBUG && window.console ?
    function(name, message, text = '', ...args) {
        if (typeof text === 'string') {
            text = truncate(60, text);
        }
        console.log('%c' + name + ' %c' + (message || ''), 'color: oklch(50.15% 0.2268 19.59); font-weight: 600;', 'color: #8e9e9d; font-weight: 300;', text, ...args);
    } :
    noop ;

export const group = window.console ?
    function(name, message, text = '', ...args) {
        if (typeof text === 'string') {
            text = truncate(60, text);
        }
        console.groupCollapsed('%c' + name + ' %c' + (message || ''), 'color: #b5002f; font-weight: 600;', 'color: #8e9e9d; font-weight: 300;', text, ...args);
    } :
    noop ;

export const groupEnd = window.console ?
    console.groupEnd.bind(console) :
    noop ;
