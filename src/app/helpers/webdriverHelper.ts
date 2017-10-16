import * as webdriver from 'selenium-webdriver';

export default class WebdriverHelper {
    browser: any;

    constructor() {
        this.browser = new webdriver.Builder().forBrowser('firefox').build();
    }
    
    goTo(url): void {
        this.browser.get(url);
    }

    findElement(parent, by, key): any {
        if(!parent)
           parent = this.browser;

        return parent.findElement(webdriver.By[by](key));
    }

    findElements(parent, by, key): any {
        if(!parent)
           parent = this.browser;

        return parent.findElements(webdriver.By[by](key));
    }

    waitUntilElementLocated(by, key, timeout): any {
        return this.browser.wait(webdriver.until.elementLocated(webdriver.By[by](key)), timeout);
    }
    waitUntilElementIsVisible(by, key, timeout): any {
        return this.browser.wait(webdriver.until.elementIsVisible(this.findElement(null, by, key)), 5 * 1000);
    }

    waitUntilElementIsNotVisible(by, key, timeout): any {
        return this.browser.wait(webdriver.until.elementIsNotVisible(this.findElement(null, by, key)), 5 * 1000);
    }
    
    waitFindElement(by, key, timeout): any { 
        return this.browser.wait(this.findElement(null, by, key), timeout);
    }

    waitFindElements(by, key, timeout): any {
        return this.browser.wait(this.findElements(null, by, key), timeout);
    }

    waitUntilUrlIs(url, timeout): any {
        return this.browser.wait(this.untilUrlIs(url), timeout);
    }

    waitUntilElementTextIs(by, key, refText, timeout): any {
        return this.browser.wait(webdriver.until.elementTextIs(this.findElement(null, by, key), refText), 5 * 1000);
    }

    untilUrlIs(url): any {
        return webdriver.until.urlIs(url);
    }

    wait(parent, until, timeout): any {
        if(!parent)
           parent = this.browser;

        return parent.wait(until, timeout);
    }

    click(parent, by, key): void {
       if(!parent)
           parent = this.browser;

        this.findElement(parent, by, key).click();
    }

    fillText(parent, by, key, value): void {
        if(!parent)
           parent = this.browser;

        this.findElement(parent, by, key).sendKeys(value);
    }
    
    async selectRadio(parent, by, key, value): Promise<void> {
        if(!parent)
           parent = this.browser;

        if(!value)
          return;
        
        let containerElement = await this.findElement(parent, by, key);
        let radioKey = key.split('_')[1];
        let items = await this.findElements(containerElement, 'className', 'scFormDataFontOdd');

        for(let index in items) {
            let item = items[index];
            let text = await item.getText();

            if(text === value) {
               await this.click(item, 'name', radioKey);
               break;
            }
        }
    }

    async selectCheckboxes(parent, by, key, values): Promise<void> {
        if(!parent)
           parent = this.browser;

        if(!values)
          return;
        
        let segmentedValues = values.split(',');
        let containerElement = await this.findElement(parent, by, key);
        let checkKey = key.split('_')[1] + '[]';
        let items = await this.findElements(containerElement, 'className', 'scFormDataFontOdd');

        for(let index in items) {
            let item = items[index];
            let text = await item.getText();
            let isInValue = values.filter(e => e === text)[0];

            if(isInValue) 
               await this.click(item, 'name', checkKey);
        }
    }
}
