import WebdriverHelper from './webdriverHelper';

const PRODESKEL_URL = 'http://prodeskel.binapemdes.kemendagri.go.id';
const PENGISI = 'GOZALI KUMARA';
const PEKERJAAN = 'PERANGKAT DESA';
const JABATAN = 'KASI PEMERINTAHAN';
const SUMBER_DATA = 'SIDEKA';

export default class ProdeskelProtocol {
    helper: WebdriverHelper;

    constructor() {
        this.helper = new WebdriverHelper;
    }

    login(reqNo: string, password: string): void {
        this.helper.goTo(PRODESKEL_URL + '/app_Login/');
        this.helper.fillText(null, 'name', 'login', reqNo);
        this.helper.fillText(null, 'name', 'pswd', password);
        this.helper.click (null, 'id', 'sub_form_b');
    }

    async run(kepalaKeluarga, anggota): Promise<void> {
        await this.helper.waitUntilUrlIs(PRODESKEL_URL + '/mdesa/', 5 * 1000);
        await this.searchKK(kepalaKeluarga.no_kk);
        await this.helper.waitUntilElementIsVisible('id', 'id_div_process_block', 5 * 1000);
        await this.helper.waitUntilElementIsNotVisible('id', 'id_div_process_block', 5 * 1000);

        console.log('Now is checking result');
        
        let dataGrids = await this.helper.waitFindElements('id', 'apl_grid_ddk01#?#1', 5 * 1000);
    
        if(dataGrids.length === 0) 
            await this.setupNewKK(kepalaKeluarga, anggota);
        else
            await this.editExistingKk(kepalaKeluarga, anggota);
    }

    async searchKK(noKK): Promise<void> {
        console.log('Now is searching KK');

        this.helper.goTo(PRODESKEL_URL + "/grid_ddk01/");
        
        await this.helper.waitUntilElementIsVisible('name', 'sc_clone_nmgp_arg_fast_search', 5 * 1000);

        this.helper.click(null, 'name', 'sc_clone_nmgp_arg_fast_search');
        this.helper.fillText(null, 'name', 'nmgp_arg_fast_search', noKK);
        this.helper.click(null, 'id', 'SC_fast_search_submit_top');
    }

    async editExistingKk(kepalaKeluarga, anggota): Promise<void> {
       let dataGrid = await this.helper.findElement(null, 'id', 'apl_grid_ddk01#?#1');
       let selectedRow = await this.helper.findElement(dataGrid, 'className', 'scGridFieldOdd');
       let columns = await this.helper.findElements(selectedRow, 'tagName', 'td');
       let editKK = await this.helper.findElement(columns[2], 'className', 'scGridFieldOddLink');

       console.log('Edit KK');

       editKK.click();

       await this.fillKKForm(kepalaKeluarga);
       await this.helper.waitUntilElementTextIs('name', 'kode_keluarga', '', 5 * 1000);

       this.helper.click(null, 'id', 'sc_b_upd_b');
    
       console.log('Now editing AK');

       await this.editExistingAK(anggota, 0);
    }

    async editExistingAK(anggota, index): Promise<void> {
        let data = anggota[index];

        await this.searchKK(data.no_kk);
        await this.helper.waitUntilElementIsVisible('id', 'id_div_process_block', 5 * 1000);
        await this.helper.waitUntilElementIsNotVisible('id', 'id_div_process_block', 5 * 1000);

        let dataGridKK = await this.helper.findElement(null, 'id', 'apl_grid_ddk01#?#1');
        let selectedRowKK = await this.helper.findElement(dataGridKK, 'className', 'scGridFieldOdd');
        let columnsKK = await this.helper.findElements(selectedRowKK, 'tagName', 'td');
        let editAK = await this.helper.findElement(columnsKK[1], 'className', 'scGridFieldOddLink');

        console.log('Opening AK grid');

        editAK.click();
        
        let dataGridAK = await this.helper.findElement(null, 'id', 'apl_grid_ddk02#?#1');
        let rowClassName = 'scGridFieldOdd';

        if((index + 1) % 2 === 0)
           rowClassName = 'scGridFieldEven';
        
        let rows = await this.helper.findElements(dataGridAK, 'tagName', 'tr');
        let selectedRowAK = await this.helper.findElement(rows[index + 1], 'className', rowClassName);
        let columnsAK = await this.helper.findElements(selectedRowAK, 'tagName', 'td');
        let editAkRow = await this.helper.findElement(columnsAK[0], 'tagName', 'tr');
        let editAKAtRow = await this.helper.findElements(editAkRow, 'tagName', 'td');
        let columnEditAk = await this.helper.findElement(editAKAtRow[1], 'className', 'bedit');

        console.log('Selected AK at row: ' + (index + 1));
        columnEditAk.click();

        await this.helper.waitUntilUrlIs('http://prodeskel.binapemdes.kemendagri.go.id/form_ddk02/index.php', 5 * 1000);
     
        console.log('Current location is in ddk02 form');

        await this.fillAKForm(data, index + 1);

        //SAVE
        this.helper.click(null, 'id', 'sc_b_upd_b');

        await this.helper.waitUntilElementTextIs('name', 'no_urut', '', 5 * 1000);

        console.log('Edit has been done');

        if(index < anggota.length - 1)
          this.editExistingAK(anggota, index + 1);
        else
          await this.searchKK(data.no_kk);
    }

    async setupNewKK(kepalaKeluarga, anggota): Promise<void> {
        let addButton = await this.helper.waitUntilElementLocated('id', 'sc_SC_btn_0_top', 5 * 1000);
        
        addButton.click();

        console.log('Clicking add new KK button');

        await this.fillKKForm(kepalaKeluarga);

        this.helper.click(null, 'id', 'sc_b_ins_b');

        await this.helper.waitUntilElementTextIs('name', 'kode_keluarga', '', 5 * 1000);

        console.log('Now is adding AK');

        await this.addAK(anggota, 0);
    }

    async addAK(anggota, index): Promise<void> {
        let data = anggota[index];

        await this.searchKK(data.no_kk);

        console.log('Adding AK no ' + (index + 1));

        await this.helper.waitUntilElementIsVisible('id', 'id_div_process_block', 5 * 1000);
        await this.helper.waitUntilElementIsNotVisible('id', 'id_div_process_block', 5 * 1000);

        this.helper.click(null, 'className', 'scGridFieldOddLink');
      
        console.log('Clicking add new AK');

        let untilGridDdkUrl = await this.helper.untilUrlIs('http://prodeskel.binapemdes.kemendagri.go.id/grid_ddk02/');
        await this.helper.wait(null, untilGridDdkUrl, 5 * 1000);

        this.helper.click(null, 'id', 'sc_SC_btn_0_top');

        await this.helper.waitUntilUrlIs('http://prodeskel.binapemdes.kemendagri.go.id/form_ddk02/index.php', 5 * 1000);
     
        console.log('Current location is in ddk02 form');

        await this.fillAKForm(data, index + 1);
        
        this.helper.click(null, 'id', 'sc_b_ins_b');

        await this.helper.waitUntilElementTextIs('name', 'no_urut', '', 5 * 1000);
       
        console.log('New form');

        if(index < anggota.length - 1)
          this.addAK(anggota, index + 1);
        else
          await this.searchKK(data.no_kk);
    }
    
    async fillKKForm(data): Promise<void> {
        await this.helper.waitUntilElementLocated('id', 'id_sc_field_d017', 5 * 1000);

        await this.helper.fillText(null, 'name', 'kode_keluarga', data.no_kk);
        await this.helper.fillText(null,'name', 'namakk', data.nama_penduduk);
        await this.helper.fillText(null,'name', 'alamat',  data.alamat_jalan);
        await this.helper.fillText(null,'name', 'rt', data.rt);
        await this.helper.fillText(null,'name', 'rw', data.rw);
        await this.helper.fillText(null,'name','nama_dusun', data.nama_dusun ? data.nama_dusun : '');
        await this.helper.fillText(null,'name', 'd014', PENGISI);
        await this.helper.fillText(null,'name', 'd015', PEKERJAAN);
        await this.helper.fillText(null,'name', 'd016', JABATAN);
        await this.helper.fillText(null,'name', 'd017', SUMBER_DATA);

        console.log('Saving new KK');
    }

    async fillAKForm(data, noUrut): Promise<void> {
        await this.helper.fillText(null, 'name', 'no_urut', noUrut);
        await this.helper.fillText(null,'name', 'nik', data.nik);
        await this.helper.fillText(null,'name', 'd025', data.nama_penduduk);
        await this.helper.fillText(null,'name', 'd028', data.tempat_lahir);
        await this.helper.fillText(null,'name', 'd029', data.tanggal_lahir);
        await this.helper.fillText(null,'name', 'd038', data.nama_ayah ? data.nama_ayah : data.nama_ibu ? data.nama_ibu : '');

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

        console.log('Filling AK form has been done!');
    }
}
