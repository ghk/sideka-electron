import * as Webdriver from 'selenium-webdriver';

const PRODESKEL_URL = 'http://prodeskel.binapemdes.kemendagri.go.id';
const AFTER_LOGIN_URL = PRODESKEL_URL + '/mdesa/';
const GRID_URL = PRODESKEL_URL + '/grid_ddk01/';
const GRID_DDK02_URL = PRODESKEL_URL + '/grid_ddk02/';
const DDK01_FORM_INSERT = PRODESKEL_URL + '/form_ddk01/index.php';
const DDK01_FORM_UPDATE = PRODESKEL_URL + '/form_ddk01/';
const DDK02_FORM_INSERT = PRODESKEL_URL + '/form_ddk02/index.php';
const DDK02_FORM_UPDATE = PRODESKEL_URL + '/form_ddk02/';
const SUMBER_DATA = 'SIDEKA';
const TIMEOUT = 5 * 1000;

export default class ProdeskelSynchronizer {
    helper: SynchronizerHelper;
    
    constructor() {
        this.helper = new SynchronizerHelper();
    }

    login(regCode: string, password: string): void {
        this.helper.goTo(PRODESKEL_URL + '/app_Login/');
        this.helper.input(null,  'name', 'login', regCode);
        this.helper.input(null, 'name', 'pswd', password);
        this.helper.click(null, 'id', 'sub_form_b');
    }

    async sync(kepalaKeluarga: any, anggota: any[], user: any): Promise<void> {
        await this.helper.wait(null, this.helper.untilUrlIs(AFTER_LOGIN_URL), TIMEOUT);
        await this.searchKK(kepalaKeluarga.no_kk);
        await this.helper.wait(null, this.helper.untilElementIsVisible('id', 'id_div_process_block'), TIMEOUT);
        await this.helper.wait(null, this.helper.untilElementIsNotVisible('id', 'id_div_process_block'), TIMEOUT);
        
        console.log('Waiting for result grid....');

        let dataGrids = await this.helper.findElements(null, 'id', 'apl_grid_ddk01#?#1');
        
        if(dataGrids.length > 0) {
            console.log('Great! data grid has been found, now is updating existing data');
            await this.updateData(kepalaKeluarga, anggota, user);
        }
        else {
            console.log('Data grid is not found, setup new data');
            this.setupData(kepalaKeluarga, anggota, user);
        }
    }

    async export(): Promise<void> {

    }

    private async setupData(kepalaKeluarga, anggota, user): Promise<void> {
        console.log('Checking KK Baru Button');

       
        await this.helper.wait(null, this.helper.untilElementLocated('id', 'sc_SC_btn_0_top'), TIMEOUT);

        console.log('KK Baru button has been found');
        console.log('Clicking KK Baru button');

        this.helper.click(null, 'id', 'sc_SC_btn_0_top');

        await this.helper.wait(null, this.helper.untilUrlIs(DDK01_FORM_INSERT), TIMEOUT);
        await this.insertKK(kepalaKeluarga, user);

        console.log('KK has been successfully saved!');
        console.log('Now is inserting AK');

        for(let i=0; i<anggota.length; i++) {
            let data = anggota[i];
            let editButton = await this.getEditButton(data);

            await this.insertAK(data, (i + 1));
        }

        await this.searchKK(kepalaKeluarga.no_kk);
    }
    
    private async updateData(kepalaKeluarga, anggota, user): Promise<void> {
        await this.selectKK();
        await this.updateKK(kepalaKeluarga, user);

        console.log('KK has been successfully saved!');
        console.log('Now is checking AK');
        
        for(let i=0; i<anggota.length; i++) {
            let data = anggota[i];
            let editButton = await this.getEditButton(data);

            if(!editButton){
                await this.insertAK(data, (i + 1));
                continue;
            }
            
            await editButton.click();
            await this.updateAK(data, (i + 1));
        }
        
        await this.searchKK(kepalaKeluarga.no_kk);
    }

    private async getEditButton(anggota): Promise<any> {
        await this.searchKK(anggota.no_kk);
        
        await this.helper.wait(null, this.helper.untilElementIsVisible('id', 'id_div_process_block'), TIMEOUT);
        await this.helper.wait(null, this.helper.untilElementIsNotVisible('id', 'id_div_process_block'), TIMEOUT);

        let ddk01 = await this.helper.findElement(null, 'id', 'apl_grid_ddk01#?#1');
        let ddk01Row = await this.helper.findElement(ddk01, 'className', 'scGridFieldOdd');
        let ddk01Columns = await this.helper.findElements(ddk01Row, 'tagName', 'td');
        let ddk01EditAK = await this.helper.findElement(ddk01Columns[1], 'className', 'scGridFieldOddLink');
        let result = null;

        await ddk01EditAK.click();

        console.log('Opening AK grid');

        let ddk02 = await this.helper.findElements(null, 'id', 'apl_grid_ddk02#?#1');

        if(ddk02.length === 0) 
            return result;

        let ddk02Rows = await this.helper.findElements(ddk02[0], 'css', '.scGridFieldOdd,.scGridFieldEven');

        for(let i=0; i<ddk02Rows.length; i++) {
            let ddk02Columns =  await this.helper.findElements(ddk02Rows[i], 'css', ".scGridFieldEvenFont,.scGridFieldOddFont");
            let nik = await ddk02Columns[4].getText();

            if(nik.trim() === anggota.nik.trim()) {
                let editButtons =  await this.helper.findElements(ddk02Columns[0], 'tagName', 'td');
                return editButtons[1];
            }
        }

        return result;
    }

    private async selectKK(): Promise<void> {
        let dataGrid = await this.helper.findElement(null, 'id', 'apl_grid_ddk01#?#1');
        let selectedRow = await this.helper.findElement(dataGrid, 'className', 'scGridFieldOdd');
        let columns = await this.helper.findElements(selectedRow, 'className', 'scGridFieldOddFont');
        let edit = await this.helper.findElement(columns[2], 'className', 'scGridFieldOddLink');
        
        await edit.click();
    }

    private async searchKK(noKK): Promise<void> {
        console.log("Target URL is %s", GRID_URL);

        this.helper.goTo(GRID_URL);

        await this.helper.wait(null, this.helper.untilUrlIs(GRID_URL), TIMEOUT);

        console.log('Waiting for search kk input element is located');

        await this.helper.wait(null, this.helper.untilElementLocated('name', 'sc_clone_nmgp_arg_fast_search'), TIMEOUT);

        console.log('Input search kk element is now located!');

        await this.helper.click(null, 'name', 'sc_clone_nmgp_arg_fast_search');
        await this.helper.input(null, 'name', 'nmgp_arg_fast_search', noKK);
        await this.helper.click(null, 'id', 'SC_fast_search_submit_top');

        console.log('Searching KK.....');
        console.log('Searching KK has been done!');
    }

    private async insertKK(data, user): Promise<void> {
        console.log('There is no KK, insert new');
        console.log('Fill KK form');

        await this.helper.input(null,'name', 'kode_keluarga', data.no_kk);
        await this.helper.input(null,'name', 'namakk', data.nama_penduduk);
        await this.helper.input(null,'name', 'alamat',  data.alamat_jalan ? data.alamat_jalan : '');
        await this.helper.input(null,'name', 'rt', data.rt ? data.rt : '');
        await this.helper.input(null,'name', 'rw', data.rw ? data.rw : '');
        await this.helper.input(null,'name','nama_dusun', data.nama_dusun ? data.nama_dusun : '');
        await this.helper.input(null,'name', 'd014', user.pengisi);
        await this.helper.input(null,'name', 'd015', user.pekerjaan);
        await this.helper.input(null,'name', 'd016', user.jabatan);
        await this.helper.input(null,'name', 'd017', SUMBER_DATA);

        this.helper.click(null, 'id', 'sc_b_ins_b');

        console.log('Saving new KK');

        await this.helper.wait(null, this.helper.untilElementTextIs('name', 'kode_keluarga', ''), TIMEOUT);
    }

    private async updateKK(data, user): Promise<void> {
        console.log('KK %s is found', data.no_kk);
        console.log('Reset KK form');

        await this.helper.input(null, 'name', 'kode_keluarga', '');
        await this.helper.input(null,'name', 'namakk', '');
        await this.helper.input(null,'name', 'alamat', '');
        await this.helper.input(null,'name', 'rt', '');
        await this.helper.input(null,'name', 'rw', '');
        await this.helper.input(null,'name','nama_dusun', '');
        await this.helper.input(null,'name', 'd014', '');
        await this.helper.input(null,'name', 'd015', '');
        await this.helper.input(null,'name', 'd016', '');
        await this.helper.input(null,'name', 'd017', '');

        console.log('Update KK form');

        await this.helper.input(null, 'name', 'kode_keluarga', data.no_kk);
        await this.helper.input(null,'name', 'namakk', data.nama_penduduk);
        await this.helper.input(null,'name', 'alamat',  data.alamat_jalan ? data.alamat_jalan : '');
        await this.helper.input(null,'name', 'rt', data.rt ? data.rt : '');
        await this.helper.input(null,'name', 'rw', data.rw ? data.rw : '');
        await this.helper.input(null,'name','nama_dusun', data.nama_dusun ? data.nama_dusun : '');
        await this.helper.input(null,'name', 'd014', user.pengisi);
        await this.helper.input(null,'name', 'd015', user.pekerjaan);
        await this.helper.input(null,'name', 'd016', user.jabatan);
        await this.helper.input(null,'name', 'd017', SUMBER_DATA);

        this.helper.click(null, 'id', 'sc_b_upd_b');

        console.log('Updating KK');

        await this.helper.wait(null, this.helper.untilElementIsVisible('id', 'id_message_display_text'), TIMEOUT);
    }

    private async insertAK(data, index): Promise<void> {
        await this.helper.wait(null, this.helper.untilElementLocated('id', 'sc_SC_btn_0_top'), TIMEOUT);
        await this.helper.click(null, 'id', 'sc_SC_btn_0_top');

        await this.helper.wait(null, this.helper.untilUrlIs(DDK02_FORM_INSERT), TIMEOUT);
       
        await this.helper.input(null, 'name', 'no_urut', index);
        await this.helper.input(null,'name', 'nik', data.nik);
        await this.helper.input(null,'name', 'd025', data.nama_penduduk);
        await this.helper.input(null,'name', 'd028', data.tempat_lahir);
        await this.helper.input(null,'name', 'd029', data.tanggal_lahir);
        await this.helper.input(null,'name', 'd038', data.nama_ayah ? data.nama_ayah : data.nama_ibu ? data.nama_ibu : '');
        await this.helper.input(null,'name', 'd025a', data.no_akta ? data.no_akta : '');

        await this.helper.selectRadio(null, 'id', 'idAjaxRadio_d026', data.jenis_kelamin);
        await this.helper.selectRadio(null, 'id','idAjaxRadio_d027', data.hubungan_keluarga);
        await this.helper.selectRadio(null, 'id','idAjaxRadio_d031', data.status_kawin);
        await this.helper.selectRadio(null, 'id','idAjaxRadio_d032', data.agama);
        await this.helper.selectRadio(null, 'id','idAjaxRadio_d036', data.pendidikan);
        await this.helper.selectRadio(null, 'id','idAjaxRadio_d037', data.pekerjaan);
        await this.helper.selectRadio(null, 'id','idAjaxRadio_d040', data.akseptor_kb);

        await this.helper.selectCheckboxes(null, 'id','idAjaxCheckbox_d041', data.cacat_fisik);
        await this.helper.selectCheckboxes(null, 'id','idAjaxCheckbox_d042', data.cacat_mental);
        await this.helper.selectCheckboxes(null, 'id','idAjaxCheckbox_d045', data.wajib_pajak);
        await this.helper.selectCheckboxes(null, 'id','idAjaxCheckbox_d047', data.lembaga_pemerintahan);
        await this.helper.selectCheckboxes(null, 'id','idAjaxCheckbox_d048', data.lembaga_kemasyarakatan);
        await this.helper.selectCheckboxes(null, 'id','idAjaxCheckbox_d049', data.lembaga_ekonomi);

        this.helper.click(null, 'id', 'sc_b_ins_b');

        console.log('Saving new AK');

        await this.helper.wait(null, this.helper.untilElementTextIs('name', 'no_urut', ''), TIMEOUT);
    }

    private async updateAK(data, index): Promise<void> {
        await this.helper.wait(null, this.helper.untilUrlIs(DDK02_FORM_UPDATE), TIMEOUT);

        await this.helper.input(null, 'name', 'no_urut', '');
        await this.helper.input(null,'name', 'nik', '');
        await this.helper.input(null,'name', 'd025', '');
        await this.helper.input(null,'name', 'd028', '');
        await this.helper.input(null,'name', 'd029', '');
        await this.helper.input(null,'name', 'd038', '');
        await this.helper.input(null,'name', 'd025a', '');
        
        await this.helper.input(null, 'name', 'no_urut', index);
        await this.helper.input(null,'name', 'nik', data.nik);
        await this.helper.input(null,'name', 'd025', data.nama_penduduk);
        await this.helper.input(null,'name', 'd028', data.tempat_lahir);
        await this.helper.input(null,'name', 'd029', data.tanggal_lahir);
        await this.helper.input(null,'name', 'd038', data.nama_ayah ? data.nama_ayah : data.nama_ibu ? data.nama_ibu : '');
        await this.helper.input(null,'name', 'd025a', data.no_akta ? data.no_akta : '');

        await this.helper.selectRadio(null, 'id', 'idAjaxRadio_d026', data.jenis_kelamin);
        await this.helper.selectRadio(null, 'id','idAjaxRadio_d027', data.hubungan_keluarga);
        await this.helper.selectRadio(null, 'id','idAjaxRadio_d031', data.status_kawin);
        await this.helper.selectRadio(null, 'id','idAjaxRadio_d032', data.agama);
        await this.helper.selectRadio(null, 'id','idAjaxRadio_d036', data.pendidikan);
        await this.helper.selectRadio(null, 'id','idAjaxRadio_d037', data.pekerjaan);
        await this.helper.selectRadio(null, 'id','idAjaxRadio_d040', data.akseptor_kb);

        await this.helper.selectCheckboxes(null, 'id','idAjaxCheckbox_d041', data.cacat_fisik);
        await this.helper.selectCheckboxes(null, 'id','idAjaxCheckbox_d042', data.cacat_mental);
        await this.helper.selectCheckboxes(null, 'id','idAjaxCheckbox_d045', data.wajib_pajak);
        await this.helper.selectCheckboxes(null, 'id','idAjaxCheckbox_d047', data.lembaga_pemerintahan);
        await this.helper.selectCheckboxes(null, 'id','idAjaxCheckbox_d048', data.lembaga_kemasyarakatan);
        await this.helper.selectCheckboxes(null, 'id','idAjaxCheckbox_d049', data.lembaga_ekonomi);

        this.helper.click(null, 'id', 'sc_b_upd_b');

        console.log('Update current AK %s', data.nama_penduduk);
        
        await this.helper.wait(null, this.helper.untilElementIsVisible('id', 'id_message_display_text'), TIMEOUT);
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

    untilElementTextIs(by, key, refText): void {
        return Webdriver.until.elementTextIs(this.findElement(null, by, key), refText)
    }

    wait(parent, until, timeout): void {
        if(!parent)
            parent = this.browser;

        return parent.wait(until, timeout);
    }

    waitFindElements(by, key, timeout): any {
        return this.browser.wait(this.findElements(null, by, key), timeout);
    }

    async selectRadio(parent, by, key, value): Promise<void> {
        if(!parent)
           parent = this.browser;

        if(!value)
          return;
        
        let containerElement = await this.findElement(parent, by, key);
        let radioKey = key.split('_')[1];
        let items = await this.findElements(containerElement, 'className', 'scFormDataFontOdd');

        let item = await items.filter(async e => await e.getText() === value)[0];

        
        for(let index in items) {
            let item = items[index];
            let text = await item.getText();

            if(text === value) {
               this.click(item, 'name', radioKey);
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
              this.click(item, 'name', checkKey);
        }
    }
}