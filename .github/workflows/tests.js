
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

const Driver = ((fns) =>
    (browser) =>
        (fns[browser] || fns.default)()
)({
    chrome: async () => new Builder()
        .setChromeOptions(new chrome.Options())
        .forBrowser('chrome')
        .build(),

    firefox: async () => new Builder()
        .setFirefoxOptions(new firefox.Options())
        .forBrowser('firefox')
        .build(),

    safari: async () => new Builder()
        .setSafariOptions(new safari.Options())
        .forBrowser('safari')
        .build()
});

async function run(browser, url) {
    console.log('Launching ' + browser);

    const driver = await Driver(browser);

    await driver.get(url);

    let title = await driver.getTitle();
    assert.equal("Tests", title);

    await driver.manage().setTimeouts({ implicit: 500 });

    try {
        const cdpConnection = await driver.createCDPConnection('page');

        /*await driver.onLogEvent(cdpConnection, function (event) {
          console.log(event.args[0].value);
        });

        await driver.onLogException(cdpConnection, function (event) {
          console.log(event.exceptionDetails);
        });

        await driver.executeScript('console.log("YOYOYO here")');*/
    }
    catch (e) {
        console.log('tests.js - ' + browser + ' - Cannot monitor console.log\n', e);
    }


/*
    let textBox      = await driver.findElement(By.name('my-text'));
    let submitButton = await driver.findElement(By.css('button'));

    await textBox.sendKeys('Selenium');
    await submitButton.click();

    let message      = await driver.findElement(By.id('message'));
    let value        = await message.getText();
    assert.equal("Received!", value);
*/
    await driver.quit();
}

run('chrome', 'http://127.0.0.1:8000/soundstage/test.html');
run('firefox', 'http://127.0.0.1:8000/soundstage/test.html');
//run('safari', 'http://127.0.0.1:8000/soundstage/test.html');
