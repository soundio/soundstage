
import get from 'fn/get.js';
import { log } from './log.js';

export default function requestData(url) {
    if (window.DEBUG) { log('Loading', 'data', url); }

    return url.slice(-3) === '.js' ?
        // Import JS module
        import(url).then(get('default')) :
        // Import JSON
        fetch(url, {
            mode: 'cors',
            credentials: 'omit'
        })
        .then((response) => response.json()) ;
}
