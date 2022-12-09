
// Console

const consolePre = document.getElementById('console');
const log = window.console.log;

let n = 0;

function stripCSS(output, string) {
    // If this is a CSS string, ignore
    if (n) {
        --n;
        return output;
    }

    // Count CSS strings that will appear as next arguments
    const text = string
        .replace(/%c/g, () => (++n, ''))
        .replace(/%s/, '');

    output.push(text);
    return output;
}

window.console.log = function() {
    log.apply(this, arguments);
    const strings = Array.from(arguments).reduce(stripCSS, []);
    consolePre.append(strings.join(' ') + '\n');
};

// Result

const resultPre = document.getElementById('result');

export function fail(message) {
    resultPre.classList.add('fail-result-pre');
    resultPre.innerHTML = 'FAIL\n\n' + message;
    resultPre.hidden = false;
}

export function pass() {
    resultPre.classList.add('pass-result-pre');
    resultPre.innerHTML = 'PASS';
    resultPre.hidden = false;
}
