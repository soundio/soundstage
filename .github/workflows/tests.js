
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

    let title = await driver.getTitle();
    assert.equal("Tests", title);

    await driver.manage().setTimeouts({ implicit: 500 });

    const console = await driver.findElement(By.id('console'));
    const pass    = await driver.findElement(By.id('pass'));
    const fail    = await driver.findElement(By.id('fail'));

/*
    let textBox      = await driver.findElement(By.name('my-text'));
    let submitButton = await driver.findElement(By.css('button'));

    await textBox.sendKeys('Selenium');
    await submitButton.click();

    let message      = await driver.findElement(By.id('message'));
    let value        = await message.getText();
    assert.equal("Received!", value);
*/

    // Not brilliant – we should be using a CDP connection, but it's not
    // reliable – poll the DOM for pass or fail
    const interval = setInterval(() => {
        if (await pass.isDisplayed()) {
            clearInterval(interval);
            console.log(console.getText());
            console.log('tests.js - ' + browser + ' PASS');
            await driver.quit();
        }
        else if (await fail.isDisplayed()) {
            clearInterval(interval);
            console.log(console.getText());
            console.log('tests.js - ' + browser + ' FAIL');
            await driver.quit();
        }
    }, 600);
}

run('chrome', 'http://127.0.0.1:8000/soundstage/test.html');
run('firefox', 'http://127.0.0.1:8000/soundstage/test.html');
//run('safari', 'http://127.0.0.1:8000/soundstage/test.html');
