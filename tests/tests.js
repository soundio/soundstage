
// Console

const consolePre = document.getElementById('console');
const log = window.console.log;

window.console.log = function() {
    log.apply(this, arguments);
    consolePre.append.apply(consolePre, arguments);
};

// Result

const resultPre = document.getElementById('result');

window.onerror = function(error) {
    resultPre.classList.add('fail-result-pre');
    resultPre.innerHTML = 'FAIL\n\n' + error;
    resultPre.hidden = false;
};
