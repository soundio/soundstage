
const browser         = process.argv[2];
const url             = process.argv[3];
const { By, Builder } = require('selenium-webdriver');
const chrome          = require('selenium-webdriver/chrome');
const firefox         = require('selenium-webdriver/firefox');
const safari          = require('selenium-webdriver/safari');

/** Driver

```js
const driver = Driver('chrome')
```
**/

const Driver = (fns => browser => {
    //console.log('Launching ' + browser);
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

    // Poll the DOM to see if id="result" is visible. This is not brilliant –
    // we should be using a CDP connection to monitor the console, but it will
    // not connect to Firefox. Don't know why.
    const interval = setInterval(async () => {
        const result = await driver.findElement(By.id('result')).isDisplayed();

        if (result) {
            clearInterval(interval);

            // If a result is displayed grab the contents of #console and
            // #result and log them to the console
            const logs = await driver.findElement(By.id('console')).getText();
            logs.split(/\n/).forEach((log) => console.log('| ' + log.replace(/\n/, '')));

            const text = await driver.findElement(By.id('result')).getText();
            if (text.slice(0, 4) === 'FAIL') {
                throw new Error(text);
            }

            await driver.quit();
        }
    }, 600);
}

run(browser, url);
