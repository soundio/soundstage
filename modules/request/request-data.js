import { log } from '../print.js';
import get from '../../../fn/modules/get.js';

export function requestData(url) {
    if (window.DEBUG) { log('Loading', 'data', url); }

    return url.slice(-3) === '.js' ?
        // Import JS module
        import(url).then(get('default')) :
        // Import JSON
        fetch(url).then((response) => response.json()) ;
}
