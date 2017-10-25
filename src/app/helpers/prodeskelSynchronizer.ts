import * as Webdriver from 'selenium-webdriver';

const PRODESKEL_URL = 'http://prodeskel.binapemdes.kemendagri.go.id';
const SUMBER_DATA = 'SIDEKA';

export default class ProdeskelSynchronizer {
    synchronizer: SynchronizerHelper;

    constructor() {
        this.synchronizer = new SynchronizerHelper();
    }

    login(regCode: string, password: string): void {
        this.synchronizer.goTo(PRODESKEL_URL + '/app_Login/');
        this.synchronizer.input(null,  'name', 'login', regCode);
        this.synchronizer.input(null, 'name', 'pswd', password);
        this.synchronizer.click(null, 'id', 'sub_form_b');
    }

    async sync(kepala: any, anggota: any[], user: any): Promise<void> {
        await this.synchronizer.wait(null, this.synchronizer.untilUrlIs(PRODESKEL_URL + '/mdesa/'), 5 * 1000);
        await this.searchKK(kepala.no_kk);
       
        console.log('Now is checking data grid');

        await this.synchronizer.wait(null, this.synchronizer.untilElementIsVisible('id', 'apl_grid_ddk01#?#1'), 5 * 1000);
        
        let dataGrids = await this.synchronizer.findElements(null, 'id', 'apl_grid_ddk01#?#1');

        console.log('Data grid has been found', dataGrids);
       
        if(dataGrids.length === 0) 
            await this.setupNewKK(kepala, anggota, user);
        else
            await this.editExistingKK(kepala, anggota, user);
    }

    async searchKK(noKk): Promise<void> {
        console.log('Now is searching KK');
        console.log('Now is going to URL %s', PRODESKEL_URL + "/grid_ddk01/");

        this.synchronizer.goTo(PRODESKEL_URL + "/grid_ddk01/");

        await this.synchronizer.wait(null, this.synchronizer.untilUrlIs(PRODESKEL_URL + '/grid_ddk01/'), 5 * 1000);

        console.log('URL now is %s', PRODESKEL_URL + '/grid_ddk01/');

        await this.synchronizer.wait(null, this.synchronizer.untilElementIsVisible('name', 'sc_clone_nmgp_arg_fast_search'), 
                                    5 * 1000);

        await this.synchronizer.wait(null, this.synchronizer.untilElementLocated('name', 'sc_clone_nmgp_arg_fast_search'), 
                                    5 * 1000);

        console.log('sc_clone_nmgp_arg_fast_search is now located');
        
        await this.synchronizer.click(null, 'name', 'sc_clone_nmgp_arg_fast_search');
        
        console.log('Now is inputting kk on nmgp_arg_fast_search');

          await this.synchronizer.wait(null, this.synchronizer.untilElementIsVisible('name', 'nmgp_arg_fast_search'), 
                                    5 * 1000);


        await this.synchronizer.input(null, 'name', 'nmgp_arg_fast_search', noKk);
        await this.synchronizer.click(null, 'id', 'SC_fast_search_submit_top');
        await this.synchronizer.wait(null, this.synchronizer.untilElementIsNotVisible('id', 'id_div_process_block'), 5 * 1000);
        
        console.log('Search Kk complete');
    }

    async setupNewKK(kepala, anggota, user): Promise<void> {
        console.log('Now is adding a new KK');
    }

    async editExistingKK(kepala, anggota, user): Promise<void> {
        console.log('Now is updating a new KK');
        console.log('Search for data grid');

        let dataGrid = await this.synchronizer.findElement(null, 'id', 'apl_grid_ddk01#?#1');

        console.log('Data grid has been found');

        let selectedRow = await this.synchronizer.findElement(dataGrid, 'className', 'scGridFieldOdd');
        let columns = await this.synchronizer.findElements(selectedRow, 'tagName', 'td');

        await this.synchronizer.click(columns[2], 'className', 'scGridFieldOddLink');

        console.log('Now is clicking edit kk');

        await this.synchronizer.wait(null, this.synchronizer.untilUrlIs(PRODESKEL_URL + '/form_ddk01/'), 5 * 1000);

        console.log('Current URL is %s', PRODESKEL_URL + '/form_ddk01/');

        await this.inputKKForm(kepala, user, 'update');

        console.log('Now is updating AK');

        await this.editAK(anggota, 0);
    }

    async editAK(anggota, index): Promise<void> {
        let data = anggota[index];

        await this.searchKK(data.no_kk);

        let dataGridKK = await this.synchronizer.findElement(null, 'id', 'apl_grid_ddk01#?#1');

        console.log('Data grid AK has been found');
    }

    async inputKKForm(data, user, mode): Promise<void> {
        console.log('Now is inputting KK form');

        await this.synchronizer.wait(null, this.synchronizer.untilElementLocated('id', 'id_sc_field_d017'), 5 * 1000);

        await this.synchronizer.input(null, 'name', 'kode_keluarga', data.no_kk);
        await this.synchronizer.input(null,'name', 'namakk', data.nama_penduduk);
        await this.synchronizer.input(null,'name', 'alamat',  data.alamat_jalan ? data.alamat_jalan : '');
        await this.synchronizer.input(null,'name', 'rt', data.rt ? data.rt : '');
        await this.synchronizer.input(null,'name', 'rw', data.rw ? data.rw : '');
        await this.synchronizer.input(null,'name','nama_dusun', data.nama_dusun ? data.nama_dusun : '');
        await this.synchronizer.input(null,'name', 'd014', user.pengisi);
        await this.synchronizer.input(null,'name', 'd015', user.pekerjaan);
        await this.synchronizer.input(null,'name', 'd016', user.jabatan);
        await this.synchronizer.input(null,'name', 'd017', SUMBER_DATA);

        if(mode === 'insert')
            await this.synchronizer.click(null, 'id', 'sc_b_ins_b');
        else if(mode === 'update')
            await this.synchronizer.click(null, 'id', 'sc_b_upd_b');

        console.log('Saving KK');
    }
}

class SynchronizerHelper {
    browser: any;

    constructor() {
         this.browser = new  Webdriver.Builder().forBrowser('firefox').build();
    }

    goTo(url): void {
        this.browser.get(url);
    }

    findElement(parent, by, key): any {
        if(!parent)
           parent = this.browser;

        return parent.findElement(Webdriver.By[by](key));
    }

    findElements(parent, by, key): any {
        if(!parent)
           parent = this.browser;

        return parent.findElements(Webdriver.By[by](key));
    }
    
    input(parent, by, key, value): void {
        if(!parent)
           parent = this.browser;

        this.findElement(parent, by, key).sendKeys(value);
    }

    click(parent, by, key): void {
        if(!parent)
           parent = this.browser;

        this.findElement(parent, by, key).click();
    }

    untilUrlIs(url): void {
        return Webdriver.until.urlIs(url);
    }

    untilElementIsVisible(by, key): void {
        return Webdriver.until.elementIsVisible(this.findElement(null, by, key));
    }

    untilElementIsNotVisible(by, key): void {
        return Webdriver.until.elementIsNotVisible(this.findElement(null, by, key));
    }

    untilElementLocated(by, key): void {
        return Webdriver.until.elementLocated(Webdriver.By[by](key))
    }

    wait(parent, until, timeout): void {
        if(!parent)
            parent = this.browser;

        return parent.wait(until, timeout);
    }

    waitFindElements(by, key, timeout): any {
        return this.browser.wait(this.findElements(null, by, key), timeout);
    }
}