
const { By, Builder } = require('selenium-webdriver');
const { suite }       = require('selenium-webdriver/testing');
const assert          = require("assert");

async function run(browser, url) {
    console.log('Launching ' + browser);

    const driver = await new Builder().forBrowser(browser).build();

    await driver.get(url);

    let title = await driver.getTitle();
    assert.equal("Tests", title);

    await driver.manage().setTimeouts({ implicit: 500 });

    try {
        const cdpConnection = await driver.createCDPConnection('page');

        await driver.onLogEvent(cdpConnection, function (event) {
          console.log(event.args[0].value);
        });

        await driver.onLogException(cdpConnection, function (event) {
          console.log(event.exceptionDetails);
        });

        await driver.executeScript('console.log("YOYOYO here")');
    }
    catch (e) {
        console.log('tests.js - Cannot monitor console.log', e);
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
