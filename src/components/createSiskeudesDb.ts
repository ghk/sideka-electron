import { Component, NgZone } from '@angular/core';

import SharedService from '../stores/sharedService';

@Component({
    selector: 'create-siskeudes-db',
    templateUrl: 'templates/createSiskeudesDb.html',
})

export default class CreateSiskeudesDbComponent {
    constructor(
        private zone: NgZone,
        private sharedService: SharedService
    ) {

    }

    ngOnInit() {

    }

    createNewDB(model) {
        let res = false;
        let requiredFields = ['Kd_Desa', 'Nama_Desa', 'Tahun', 'fileName']; //'Kd_Prov', 'Nama_Provinsi','Kd_Kab','Nama_Pemda', 'Kd_Kec', 'Nama_Kecamatan',
        let aliases = { fileName: 'Lokasi Penyimpanan' };
        let fileNameSource = 'DataAPBDES.mde';
        let source = path.join(__dirname, fileNameSource);
        let isValidForm = true;

        requiredFields.forEach(c => {
            if (!this.model[c] || this.model[c] == '') {
                if (aliases[c])
                    c = aliases[c];
                this.toastr.error(`Kolom ${c} harus di isi`);
                isValidForm = false;
            }
        });

        if (!isValidForm)
            return;

        //copy file mde
        let wr = fs.createWriteStream(model.fileName);
        wr.on("error", err => {
            return this.toastr.error('Gagal membuat database', '');
        });
        let create = fs.createReadStream(source).pipe(wr);

        $("#modal-createDB")['modal']("hide");

        //NORMALIZE model
        model.Kd_Desa = `${model.Kd_Kec}.${model.Kd_Desa}.`;
        /*
        model.Nama_Provinsi = `PROVINSI ${model.Nama_Provinsi.toUpperCase()}`;
        model.Nama_Pemda = `PEMERINTAH KABUPATEN ${model.Nama_Pemda.toUpperCase()}`;
        */
        model.Nama_Kecamatan = `KECAMATAN ${model.Nama_Kecamatan.toUpperCase()}`;
        model.Nama_Desa = `KECAMATAN ${model.Nama_Desa.toUpperCase()}`;

        //after copy create database
        create.on('finish', () => {
            this.siskeudesService.createNewDB(model, response => {
                //if response = [] response success
                if (Array.isArray(response) && response.length == 0) {
                    this.toastr.success(`Buat Database baru berhasil`, '');
                    this.kodeDesa = model.Kd_Desa;
                    this.siskeudesPath = model.fileName;

                    this.saveSettings();
                }
                else {
                    this.toastr.error(`Buat Database baru gagal`, '');
                    fs.unlinkSync(model.fileName);
                }
            })
        })
    }
}