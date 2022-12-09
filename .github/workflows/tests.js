
const { By, Builder } = require('selenium-webdriver');
const chrome          = require('selenium-webdriver/chrome');
const firefox         = require('selenium-webdriver/firefox');
const safari          = require('selenium-webdriver/safari');
const assert          = require("assert");

/** Driver

```js
const driver = Driver('chrome')
```
**/

const Driver = (fns => browser => {
    console.log('Launching ' + browser);
    return (fns[browser] || fns.default)();
})({
    chrome: async () => new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options())
        .build(),

    firefox: async () => {
        const options = new firefox.Options();
        //options.addArguments('--remote-debugging-port');
        options.setPreference('fission.bfcacheInParent', false);
        options.setPreference('fission.webContentIsolationStrategy', 0);

        return new Builder()
        .forBrowser('firefox')
        .setFirefoxOptions(options)
        .build();
    },

    safari: async () => new Builder()
        .forBrowser('safari')
        .setSafariOptions(new safari.Options())
        .build()
});

async function run(browser, url) {
    const driver = await Driver(browser);
    await driver.get(url);

    //const passpre    = await driver.findElement(By.id('pass'));
    //const failpre    = await driver.findElement(By.id('fail'));

    // Not brilliant – we should be using a CDP connection, but it's not
    // reliable – poll the DOM for pass or fail
    let n = 0;
    const interval = setInterval(async () => {
        console.log('check', ++n);

        if (await driver.findElement(By.id('pass')).isDisplayed()) {
            clearInterval(interval);
            console.log('--- ' + browser + ' ---');
            console.log(await driver.findElement(By.id('console')).getText());
            console.log('--- ' + browser + ' PASS ---');
            await driver.quit();
        }
        else if (await driver.findElement(By.id('fail')).isDisplayed()) {
            clearInterval(interval);
            console.log('--- ' + browser + ' ---');
            console.log(await driver.findElement(By.id('console')).getText());
            console.log('--- ' + browser + ' FAIL ---');
            await driver.quit();
        }
    }, 600);
}

run('chrome', 'http://127.0.0.1:8000/soundstage/test.html');
run('firefox', 'http://127.0.0.1:8000/soundstage/test.html');
//run('safari', 'http://127.0.0.1:8000/soundstage/test.html');
