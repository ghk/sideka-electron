const PRODESKEL_URL = 'http://prodeskel.binapemdes.kemendagri.go.id/app_Login/';
var webdriver = require('../lib/selenium-webdriver');

var sexes = {
    "laki - laki": 1,
    "perempuan": 1,
}

var hubunganKeluarga = {
    "adik": 11,
    "anak angkat": 5,
    "anak kandung": 4,
    "anak tiri": 23,
    "ayah": 6,
    "cucu": 18,
    "famili lain": 19,
    "family lain": 19,
    "ibu": 7,
    "istri": 3,
    "isteri": 3,
    "kakak": 10,
    "kakek": 12,
    "kepala keluarga": 1,
    "keponakan": 15,
    "lainnya": 22,
    "menantu": 21,
    "mertua": 17,
    "nenek": 13,
    "paman": 8,
    "sepupu": 14,
    "suami": 2,
    "tante": 9,
    "teman": 16
}

var statusKawin = {
    "tidak diketahui": 0,
    "belum kawin": 0,
    "kawin": 1,
    "cerai hidup": 2,
    "cerai mati": 2,
}

var agamas = {
    "budha": 5,
    "hindu": 4,
    "islam": 1,
    "katholik": 3,
    "konghucu": 6,
    "kristen": 2,
}

var golonganDarah = {
    "o": 0,
    "a": 1,
    "b": 2,
    "ab": 3,
    "tidak tahu": 4,
}

var selectChoice = function(choices, value, defaultResult){
    if(!value)
        return defaultResult;
    var result = choices[value.toLowerCase()];
    if(result !== undefined)
        return result;
    return defaultResult;
}

export default class ProdeskelWebDriver{
    browser: any;

    constructor(){
        this.browser = new webdriver.Builder().forBrowser('firefox').build();
    }

    openSite(): void{
        this.browser.get(PRODESKEL_URL);
    }

    login(reqNo, password): void {
        this.browser.findElement(webdriver.By.name('login')).sendKeys(reqNo);
        this.browser.findElement(webdriver.By.name('pswd')).sendKeys(password);
        this.browser.findElement(webdriver.By.id('sub_form_b')).click();
    }

    openDDK(): void {
        console.log("waiting ddk button");
        this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('btn_1')), 5 * 1000).then(el => {
            console.log("found ddk button");
            el.click();
        });
    }

    searchKK(noKk){
        this.browser.get("http://prodeskel.binapemdes.kemendagri.go.id/grid_ddk01/");
        this.browser.wait(webdriver.until.elementLocated(webdriver.By.name('sc_clone_nmgp_arg_fast_search')), 5 * 1000).then(el => {
            this.browser.findElement(webdriver.By.name('sc_clone_nmgp_arg_fast_search')).click();
            this.browser.findElement(webdriver.By.name('nmgp_arg_fast_search')).sendKeys(noKk);
            this.browser.findElement(webdriver.By.id('SC_fast_search_submit_top')).click();
        });
    }

    switchToFrameDesa(): void {
        this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('iframe_mdesa')), 5 * 1000).then(el => {
            this.browser.switchTo().frame(el);
        });
    }

    checkDataTable(syncData): void {
        this.browser.wait(webdriver.until.elementLocated(webdriver.By.id('quant_linhas_f0_bot')), 5 * 1000).then(el => {
            el.sendKeys('all');

            let formProcess = this.browser.findElement(webdriver.By.id('id_div_process_block'));

             this.browser.wait(webdriver.until.elementIsNotVisible(formProcess), 10 * 1000).then(() => {
           
                this.browser.findElement(webdriver.By.id('apl_grid_ddk01#?#1')).then(res => {
                    res.findElements(webdriver.By.tagName('tr')).then(rows => {
                         let exists: boolean = false;

                        rows.forEach(row => {
                            row.getText().then(val => {
                               let values = val.split(' ');

                               if(syncData.penduduk.nik === val)
                                 exists = true;  
                            });
                        });

                        if(exists)
                            syncData.action = 'Edit';

                         $('#prodeskel-modal').modal('show');
                    });    
                });
            });
        });
    }

    async addNewKK(penduduk, anggotas): Promise<void> {
        this.searchKK(penduduk.no_kk);
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
        this.addAK(penduduk, anggotas, 0);
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

                        let sex = selectChoice(sexes, anggota.jenis_kelamin, 1);
                        this.browser.findElement(webdriver.By.css("input[name='d026'][value='"+sex+"']")).click();

                        let hub = selectChoice(hubunganKeluarga, anggota.hubungan_keluarga, 22);
                        this.browser.findElement(webdriver.By.css("input[name='d027'][value='"+hub+"']")).click();

                        this.browser.findElement(webdriver.By.name('d028')).sendKeys(anggota.tempat_lahir);
                        this.browser.findElement(webdriver.By.name('d029')).sendKeys(anggota.tanggal_lahir);

                        let status = selectChoice(statusKawin, anggota.status_kawin, 0);
                        this.browser.findElement(webdriver.By.css("input[name='d031'][value='"+status+"']")).click();

                        let agama = selectChoice(agamas, anggota.agama, 0);
                        this.browser.findElement(webdriver.By.css("input[name='d031'][value='"+agama+"']")).click();

                        let gd = selectChoice(golonganDarah, anggota.golongan_darah, 0);
                        this.browser.findElement(webdriver.By.css("input[name='d033'][value='"+gd+"']")).click();

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