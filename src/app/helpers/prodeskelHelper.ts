import * as webdriver from 'selenium-webdriver';

const PRODESKEL_URL = 'http://prodeskel.binapemdes.kemendagri.go.id';
const PENGISI = 'GOZALI KUMARA';
const PEKERJAAN = 'PERANGKAT DESA';
const JABATAN = 'KASI PEMERINTAHAN';
const SUMBER_DATA = 'SIDEKA';

export default class ProdeskelHelper {
    browser: any;

    constructor() {
        this.browser = new webdriver.Builder().forBrowser('firefox').build();
    }

    goToSite(): void {
        this.browser.get(PRODESKEL_URL + '/app_Login/');
    }

    login(reqNo: string, password: string): void {
        this.inputText('name', 'login', reqNo);
        this.inputText('name', 'pswd', password);
        this.click('id', 'sub_form_b');
    }

    async run(kepala, anggota): Promise<void> {
       await this.searchKK(kepala.no_kk);
       await this.browser.wait(webdriver.until.elementIsVisible(this.find('id', 'id_div_process_block'), 5 * 1000));
       await this.browser.wait(webdriver.until.elementIsNotVisible(this.find('id', 'id_div_process_block'), 5 * 1000));
       
       let data = await this.browser.wait(this.findAll('id', 'apl_grid_ddk01#?#1'), 5 * 1000);
       
       if(data.length === 0) 
          return await this.addKK(kepala, anggota);
       else {
          return await this.editKK(kepala, anggota);
       }
    }

    async searchKK(noKk): Promise<void> {
       this.browser.get(PRODESKEL_URL + "/grid_ddk01/");

       await this.browser.wait(webdriver.until.elementLocated(webdriver.By.name('sc_clone_nmgp_arg_fast_search')), 5 * 2000);

       this.click('name', 'sc_clone_nmgp_arg_fast_search');
       this.inputText('name', 'nmgp_arg_fast_search', noKk);
       this.click('id', 'SC_fast_search_submit_top');      
    }

    async addKK(kepala, anggota): Promise<void> {
        let el = await this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('sc_SC_btn_0_top')), 5 * 1000);

        el.click();
        console.log("clicking el");

        this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('id_sc_field_d017')), 5 * 1000);

        this.inputText('name', 'kode_keluarga', kepala.no_kk);
        this.inputText('name', 'namakk', kepala.nama_penduduk);
        this.inputText('name', 'alamat',  kepala.alamat_jalan);
        this.inputText('name', 'rt', kepala.rt);
        this.inputText('name', 'rw', kepala.rw);
        this.inputText('name','nama_dusun', kepala.nama_dusun);
        this.inputText('name', 'd014', PENGISI);
        this.inputText('name', 'd015', PEKERJAAN);
        this.inputText('name', 'd016', JABATAN);
        this.inputText('name', 'd017', SUMBER_DATA);

        this.click('id', 'sc_b_ins_b');
        
        await this.browser.wait(webdriver.until.elementTextIs(this.find('name', 'kode_keluarga'), ''), 5 * 1000);
        await this.addAK(anggota, 0);
    }

    async editKK(kepala, anggota): Promise<void> {
       let data = await this.browser.wait(this.findAll('id', 'apl_grid_ddk02#?#1'), 5 * 1000);

       //NO AK FOUND, INSERT ALL AK
       if(data.length === 0) {
           await this.addAK(anggota, 0);
       }
       else {
           //TODO == CHECK CURRENT DATA GRID TO EDIT AK
       }
    }

    async addAK(anggota, noUrut): Promise<void> {
        let data = anggota[noUrut];

        this.searchKK(data.no_kk);
        await this.browser.wait(webdriver.until.elementIsVisible(this.find('id', 'id_div_process_block'), 5 * 1000));
        await this.browser.wait(webdriver.until.elementIsNotVisible(this.find('id', 'id_div_process_block'), 5 * 1000));

        this.click('className', 'scGridFieldOddLink');
        await this.browser.wait(webdriver.until.urlIs("http://prodeskel.binapemdes.kemendagri.go.id/grid_ddk02/"));

        this.click('id', 'sc_SC_btn_0_top');
        await this.browser.wait(webdriver.until.urlIs("http://prodeskel.binapemdes.kemendagri.go.id/form_ddk02/index.php"));

        this.inputText('name', 'no_urut', noUrut);
        this.inputText('name', 'nik', data.nik);
        this.inputText('name', 'd025', data.nama_penduduk);
        this.inputText('name', 'd028', data.tempat_lahir);
        this.inputText('name', 'd029', data.tanggal_lahir);
        this.inputText('name', 'd038', data.nama_ayah);

        await this.selectRadio('idAjaxRadio_d026', data.jenis_kelamin);
        await this.selectRadio('idAjaxRadio_d027', data.hubungan_keluarga);
        await this.selectRadio('idAjaxRadio_d031', data.status_kawin);
        await this.selectRadio('idAjaxRadio_d032', data.agama);
        await this.selectRadio('idAjaxRadio_d036', data.pendidikan);
        await this.selectRadio('idAjaxRadio_d037', data.pekerjaan);
        await this.selectRadio('idAjaxRadio_d040', data.akseptor_kb);

        await this.selectCheckbox('idAjaxCheckbox_d041', data.cacat_fisik);
        await this.selectCheckbox('idAjaxCheckbox_d042', data.cacat_mental);
        await this.selectCheckbox('idAjaxCheckbox_d045', data.wajib_pajak);
        await this.selectCheckbox('idAjaxCheckbox_d047', data.lembaga_pemerintahan);
        await this.selectCheckbox('idAjaxCheckbox_d048', data.lembaga_kemasyarakatan);
        await this.selectCheckbox('idAjaxCheckbox_d049', data.lembaga_ekonomi);

        this.browser.findElement(webdriver.By.id('sc_b_ins_b')).click();

        if(noUrut < anggota.length - 1) 
            this.addAK(anggota, noUrut + 1);
    }

    find(by, key): any {
        return this.browser.findElement(webdriver.By[by](key));
    }

    findAll(by, key): any[] {
        return this.browser.findElements(webdriver.By[by](key));
    }

    click(by, key): void {
        this.browser.findElement(webdriver.By[by](key)).click();
    }

    inputText(by, key, value): void {
        this.browser.findElement(webdriver.By[by](key)).sendKeys(value);
    }

    async selectRadio(containerId, value): Promise<void> {
        if(!value)
          return;

        let container = await this.find('id', containerId);
        let radioId = containerId.split('_')[1];

        let rows = await container.findElements(webdriver.By.className("scFormDataFontOdd"));

        for(let i=0; i<rows.length; i++) {
           let row = rows[i];
           let text = await row.getText();

           if(text === value) {
               row.findElement(webdriver.By.name(radioId)).click();
               break;
           }
        }
    }

    async selectCheckbox(containerId, valueString): Promise<void> {
        if(!valueString)
          return;

        let values = valueString.split(',');
        let container = await this.find('id', containerId);
        let checkboxId = containerId.split('_')[1] + '[]';

        let rows = await container.findElements(webdriver.By.className("scFormDataFontOdd"));

        for(let i=0; i<rows.length; i++) {
           let row = rows[i];
           let text = await row.getText();
           let existingText = values.filter(e => e === text)[0];

           if(existingText) 
              row.findElement(webdriver.By.name(checkboxId)).click();
        }
    }
}
