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

    async syncData(penduduk: any, anggota: any[]): Promise<void> {
       this.searchKK(penduduk.no_kk);

       //TODO == Check current penduduk in prodeskel first
       //if penduduk exists, edit otherwise add
       return await this.addNewKK(penduduk, anggota);
    }

    async searchAndEdit(penduduk: any, anggota: any[]): Promise<void> {
        
    }

    async addNewKK(penduduk: any, anggota: any[]): Promise<void> {
        await this.browser.wait(webdriver.until.elementIsVisible(this.browser.findElement(webdriver.By.id('id_div_process_block')), 5 * 1000));
        await this.browser.wait(webdriver.until.elementIsNotVisible(this.browser.findElement(webdriver.By.id('id_div_process_block')), 5 * 1000));
        
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
    }

    async searchKK(noKk): Promise<void> {
       this.browser.get(PRODESKEL_URL + "/grid_ddk01/");

       await this.browser.wait(webdriver.until.elementLocated(webdriver.By.name('sc_clone_nmgp_arg_fast_search')), 5 * 2000);

       this.browser.findElement(webdriver.By.name('sc_clone_nmgp_arg_fast_search')).click();
       this.browser.findElement(webdriver.By.name('nmgp_arg_fast_search')).sendKeys(noKk);
       this.browser.findElement(webdriver.By.id('SC_fast_search_submit_top')).click();
    }

    addAK(penduduk, anggotas, index){
        this.searchKK(penduduk.no_kk);
        let anggota = anggotas[index];
        this.browser.wait(webdriver.until.elementIsVisible(this.browser.findElement(webdriver.By.id('id_div_process_block')), 5 * 1000)).then(d => {
            this.browser.wait(webdriver.until.elementIsNotVisible(this.browser.findElement(webdriver.By.id('id_div_process_block')), 5 * 1000)).then(d => {
                this.browser.findElement(webdriver.By.className('scGridFieldOddLink')).click();
                this.browser.wait(webdriver.until.urlIs("http://prodeskel.binapemdes.kemendagri.go.id/grid_ddk02/")).then( a => {
                    this.browser.findElement(webdriver.By.id('sc_SC_btn_0_top')).click();
                    this.browser.wait(webdriver.until.urlIs("http://prodeskel.binapemdes.kemendagri.go.id/form_ddk02/index.php")).then( a => {
                        this.browser.findElement(webdriver.By.name('no_urut')).sendKeys(index + 1);
                        this.browser.findElement(webdriver.By.name('nik')).sendKeys(anggota.nik);
                        this.browser.findElement(webdriver.By.name('d025')).sendKeys(anggota.nama_penduduk);

                        this.browser.findElement(webdriver.By.css("input[name='d026'][value='"+penduduk.jenis_kelamin+"']")).click();
                        this.browser.findElement(webdriver.By.css("input[name='d027'][value='"+penduduk.hubungan_keluarga+"']")).click();
                        this.browser.findElement(webdriver.By.name('d028')).sendKeys(anggota.tempat_lahir);
                        this.browser.findElement(webdriver.By.name('d029')).sendKeys(anggota.tanggal_lahir);
                        this.browser.findElement(webdriver.By.css("input[name='d031'][value='"+penduduk.status_kawin+"']")).click();
                        this.browser.findElement(webdriver.By.css("input[name='d031'][value='"+penduduk.agama+"']")).click();
                        this.browser.findElement(webdriver.By.css("input[name='d033'][value='"+penduduk.golongan_darah+"']")).click();
                        this.browser.findElement(webdriver.By.css("input[name='d036'][value='"+4+"']")).click();
                        this.browser.findElement(webdriver.By.css("input[name='d037'][value='"+38+"']")).click();
                        this.browser.findElement(webdriver.By.id('sc_b_ins_b')).click();
                        this.browser.wait(webdriver.until.elementTextIs(this.browser.findElement(webdriver.By.name('no_urut')), ''), 5 * 1000).then(el => {
                            if(index < anggotas.length - 1)
                                this.addAK(penduduk, anggotas, index+1);
                        });
                    });
                });
            });
        });
    }
}
