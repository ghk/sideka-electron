import * as webdriver from 'selenium-webdriver';

const PRODESKEL_URL = 'http://prodeskel.binapemdes.kemendagri.go.id';
const BELUM_TERUPLOAD = 'Belum Terupload';
const TERUPLOAD = 'Terupload';
const EDIT = 'Edit';

const GENDER = {
   'Laki-Laki': 1,
   'Perempuan': 0
}

const HUBUNGAN_KELUARGA = {
   'Adik': 11,
   'Anak Angkat': 5,
   'Anak Kandung': 4,
   'Anak Tiri': 23,

}

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

    async syncData(penduduk: any, anggota: any[]): Promise<void> {
       await this.searchKK(penduduk.no_kk);
       await this.browser.wait(webdriver.until.elementIsVisible(this.browser.findElement(webdriver.By.id('id_div_process_block')), 5 * 1000));
       await this.browser.wait(webdriver.until.elementIsNotVisible(this.browser.findElement(webdriver.By.id('id_div_process_block')), 5 * 1000));
       
       let elements =  await this.browser.wait(this.browser.findElements(webdriver.By.id('apl_grid_ddk01#?#1')), 5 * 1000);

       if(elements.length === 0) {
          return await this.addNewKK(penduduk, anggota);
       }
       else {
          return await this.editKK(penduduk, anggota);
       }
    }

    async editKK(penduduk: any, anggota: any[]): Promise<void> {
        this.browser.findElement(webdriver.By.className('scGridFieldOddLink')).click();  
        await this.browser.wait(webdriver.until.urlIs("http://prodeskel.binapemdes.kemendagri.go.id/grid_ddk02/"));
       
        this.browser.findElement(webdriver.By.id('sc_SC_btn_0_top')).click();
        
        await this.selectRadioButton('idAjaxRadio_d026', penduduk.jenis_kelamin);
        await this.selectRadioButton('idAjaxRadio_d027', penduduk.hubungan_keluarga);
        await 
    }

    async selectRadioButton(containerId: string, value): Promise<void> {
        let container = await this.browser.findElement(webdriver.By.id(containerId));
        let rows = await container.findElements(webdriver.By.className("scFormDataFontOdd"));

        for(let i=0; i<rows.length; i++) {
           let row = rows[i];
           let text = await row.getText();

           if(text === value) {
               row.findElement(webdriver.By.name("d026")).click();
               break;
           }
        }
    }
    
    async inputText(name, value) {
        this.browser.findElement(webdriver.By.name(name)).sendKeys(value);
    }

    async addNewKK(penduduk: any, anggota: any[]): Promise<void> {
        let el = await this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('sc_SC_btn_0_top')), 5 * 1000);

        el.click();
        console.log("clicking el");

        this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('id_sc_field_d017')), 5 * 1000);
        this.browser.findElement(webdriver.By.name('kode_keluarga')).sendKeys(penduduk.no_kk);
        this.browser.findElement(webdriver.By.name('namakk')).sendKeys(penduduk.nama_penduduk);
        this.browser.findElement(webdriver.By.name('alamat')).sendKeys(penduduk.alamat_jalan);
        this.browser.findElement(webdriver.By.name('rt')).sendKeys(penduduk.rt);
        this.browser.findElement(webdriver.By.name('rw')).sendKeys(penduduk.rw);
        this.browser.findElement(webdriver.By.name('nama_dusun')).sendKeys(penduduk.nama_dusun);

        this.browser.findElement(webdriver.By.name('d014')).sendKeys("GOZALI KUMARA");
        this.browser.findElement(webdriver.By.name('d015')).sendKeys("PERANGKAT DESA");
        this.browser.findElement(webdriver.By.name('d016')).sendKeys("KASI PEMERINTAHAN");
        this.browser.findElement(webdriver.By.name('d017')).sendKeys("SIDEKA");

        this.browser.findElement(webdriver.By.id('sc_b_ins_b')).click();

        await this.browser.wait(webdriver.until.elementTextIs(this.browser.findElement(webdriver.By.name('kode_keluarga')), ''), 5 * 1000);
        
        this.addAK(penduduk, anggota, 0);
    }

    async searchKK(noKk): Promise<void> {
       this.browser.get(PRODESKEL_URL + "/grid_ddk01/");

       await this.browser.wait(webdriver.until.elementLocated(webdriver.By.name('sc_clone_nmgp_arg_fast_search')), 5 * 2000);

       this.browser.findElement(webdriver.By.name('sc_clone_nmgp_arg_fast_search')).click();
       this.browser.findElement(webdriver.By.name('nmgp_arg_fast_search')).sendKeys(noKk);
       this.browser.findElement(webdriver.By.id('SC_fast_search_submit_top')).click();
    }

    async addAK(penduduk, anggota, index): Promise<void> {
        let anggotaItem = anggota[index];

        this.searchKK(penduduk.no_kk);

        await this.browser.wait(webdriver.until.elementIsVisible(this.browser.findElement(webdriver.By.id('id_div_process_block')), 5 * 1000));
        await this.browser.wait(webdriver.until.elementIsNotVisible(this.browser.findElement(webdriver.By.id('id_div_process_block')), 5 * 1000));
       
        this.browser.findElement(webdriver.By.className('scGridFieldOddLink')).click();
       
        await this.browser.wait(webdriver.until.urlIs("http://prodeskel.binapemdes.kemendagri.go.id/grid_ddk02/"));

        this.browser.findElement(webdriver.By.id('sc_SC_btn_0_top')).click();

        this.browser.findElement(webdriver.By.name('no_urut')).sendKeys(index + 1);
        this.browser.findElement(webdriver.By.name('nik')).sendKeys(anggotaItem.nik);
        this.browser.findElement(webdriver.By.name('d025')).sendKeys(anggotaItem.nama_penduduk);
        
        let radioGender = await this.browser.findElement(webdriver.By.id('idAjaxRadio_d026'));
        
        let rows = await radioGender.findElements(webdriver.By.tagName('tr'));
        console.log(rows.length);
        /*
        this.browser.findElement(webdriver.By.css("input[name='d026'][value='"+GENDER[penduduk.jenis_kelamin]+"']")).click();
        this.browser.findElement(webdriver.By.css("input[name='d027'][value='"+penduduk.hubungan_keluarga+"']")).click();
        this.browser.findElement(webdriver.By.name('d028')).sendKeys(anggotaItem.tempat_lahir);
        this.browser.findElement(webdriver.By.name('d029')).sendKeys(anggotaItem.tanggal_lahir);
        this.browser.findElement(webdriver.By.css("input[name='d031'][value='"+penduduk.status_kawin+"']")).click();
        this.browser.findElement(webdriver.By.css("input[name='d031'][value='"+penduduk.agama+"']")).click();
        this.browser.findElement(webdriver.By.css("input[name='d033'][value='"+penduduk.golongan_darah+"']")).click();
        this.browser.findElement(webdriver.By.css("input[name='d036'][value='"+4+"']")).click();
        this.browser.findElement(webdriver.By.css("input[name='d037'][value='"+38+"']")).click();
        this.browser.findElement(webdriver.By.id('sc_b_ins_b')).click();

        await this.browser.wait(webdriver.until.elementTextIs(this.browser.findElement(webdriver.By.name('no_urut')), ''), 5 * 1000);

        if(index < anggota.length - 1)
          this.addAK(penduduk, anggota, index+1);*/
    }
}
