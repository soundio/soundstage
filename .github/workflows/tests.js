
console.log('TESTING TESTING 1 2 3');

const { By, Builder } = require('selenium-webdriver');
const { suite }       = require('selenium-webdriver/testing');
const assert          = require("assert");

async function run(browser, url) {
    const driver = await new Builder().forBrowser(browser).build();

    await driver.get(url);

    let title = await driver.getTitle();
    assert.equal("Tests", title);

    await driver.manage().setTimeouts({ implicit: 500 });
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
