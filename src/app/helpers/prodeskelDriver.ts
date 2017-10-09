import * as webdriver from 'selenium-webdriver';

const PRODESKEL_URL = 'http://prodeskel.binapemdes.kemendagri.go.id';
const BELUM_TERUPLOAD = 'Belum Terupload';
const TERUPLOAD = 'Terupload';
const EDIT = 'Edit';

export default class ProdeskelDriver {
    browser: any;

    constructor() {
        this.browser = new webdriver.Builder().forBrowser('firefox').build();
    }

    openSite(): void {
        this.browser.get(PRODESKEL_URL + '/app_Login/');
    }

    login(reqNo, password): void {
        this.browser.findElement(webdriver.By.name('login')).sendKeys(reqNo);
        this.browser.findElement(webdriver.By.name('pswd')).sendKeys(password);
        this.browser.findElement(webdriver.By.id('sub_form_b')).click();
    }

    async syncData(penduduk: any, anggota: any[], status: string): Promise<void> {
        if(status === BELUM_TERUPLOAD) 
          return await this.addNewKK(penduduk, anggota);
        else
          return await this.searchAndEdit(penduduk, anggota);
    }

    async searchAndEdit(penduduk: any, anggota: any[]): Promise<void> {
        this.browser.get(PRODESKEL_URL + "/grid_ddk01/");

        await this.browser.wait(webdriver.until.elementLocated(webdriver.By.name('sc_clone_nmgp_arg_fast_search')), 5 * 2000);
        this.browser.findElement(webdriver.By.name('sc_clone_nmgp_arg_fast_search')).click();
        this.browser.findElement(webdriver.By.name('nmgp_arg_fast_search')).sendKeys(penduduk.no_kk);
        this.browser.findElement(webdriver.By.id('SC_fast_search_submit_top')).click();
    }

    async addNewKK(penduduk: any, anggota: any[]): Promise<void> {
       console.log('add', penduduk, anggota);
    }
}
