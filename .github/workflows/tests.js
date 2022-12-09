
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

    // Poll the DOM to see if id="result" has been filled with text. This is not
    // brilliant – we should be using a CDP connection to monitor the console,
    // but that's not reliable.
    let n = 0;
    const interval = setInterval(async () => {
        const result = await driver.findElement(By.id('result')).isDisplayed();

        if (result) {
            const logs = await driver.findElement(By.id('console')).getText();
            const text = await driver.findElement(By.id('result')).getText();

            clearInterval(interval);

            console.log('> ' + browser + ' --------');
            console.log('> ' + logs.replace(/\n/, '\n> '));
            console.log(text);

            assert.equal('PASS', text.slice(0, 4));
            await driver.quit();
        }
    }, 600);
}

run('chrome', 'http://127.0.0.1:8000/soundstage/test.html');
run('firefox', 'http://127.0.0.1:8000/soundstage/test.html');
//run('safari', 'http://127.0.0.1:8000/soundstage/test.html');
