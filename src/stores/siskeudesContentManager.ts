import SiskeudesService from './siskeudesService';
import schemas from '../schemas';

export const CATEGORIES = [
    {
        name: 'pendapatan',
        code: '4.',
        fields: [
            ['Akun', '', 'Nama_Akun'], ['Kelompok', '', 'Nama_Kelompok'], ['Jenis', '', 'Nama_Jenis'], ['Obyek', '', 'Nama_Obyek'],
            ['Obyek_Rincian', '', 'Uraian', 'SumberDana', 'JmlSatuan', 'Satuan', 'HrgSatuan', 'Anggaran', 'JmlSatuanPAK', 'Satuan', 'HrgSatuan', 'AnggaranStlhPAK', 'Perubahan']
        ],
        currents: [{ fieldName: 'Akun', value: '' }, { fieldName: 'Kelompok', value: '' }, { fieldName: 'Jenis', value: '' }, { fieldName: 'Obyek', value: '' }]
    }, {
        name: 'belanja',
        code: '5.',
        fields: [
            ['Akun', '', 'Nama_Akun'], ['', 'Kd_Bid', 'Nama_Bidang'], ['', 'Kd_Keg', 'Nama_Kegiatan'], ['Jenis', '', 'Nama_Jenis'], ['Obyek', '', 'Nama_Obyek'],
            ['Kode_Rincian', '', 'Uraian', 'SumberDana', 'JmlSatuan', 'Satuan', 'HrgSatuan', 'Anggaran', 'JmlSatuanPAK', 'Satuan', 'HrgSatuan', 'AnggaranStlhPAK', 'Perubahan']
        ],
        currents: [{ fieldName: 'Akun', value: '' }, { fieldName: 'Kd_Bid', value: '' }, { fieldName: 'Kd_Keg', value: '' }, { fieldName: 'Jenis', value: '' }, { fieldName: 'Obyek', value: '' }]
    }, {
        name: 'pembiayaan',
        code: '6.',
        fields: [
            ['Akun', '', 'Nama_Akun'], ['Kelompok', '', 'Nama_Kelompok'], ['Jenis', '', 'Nama_Jenis'], ['Obyek', '', 'Nama_Obyek'],
            ['Obyek_Rincian', '', 'Uraian', 'SumberDana', 'JmlSatuan', 'Satuan', 'HrgSatuan', 'Anggaran', 'JmlSatuanPAK', 'Satuan', 'HrgSatuan', 'AnggaranStlhPAK', 'Perubahan']
        ],
        currents: [{ fieldName: 'Akun', value: '' }, { fieldName: 'Kelompok', value: '' }, { fieldName: 'Jenis', value: '' }, { fieldName: 'Obyek', value: '' }]
    }];

export class SiskeudesContentManager {

    constructor(private siskeudesService: SiskeudesService){
    }

    async getPenganggaranContents(year, kodeDesa): Promise<any> {
        let results = {};
        
        var data = await this.siskeudesService.getRAB(year, kodeDesa);
        results["rab"] = this.transformRabData(data);

        var data = await this.siskeudesService.getTaKegiatan(year, kodeDesa);
        results["kegiatan"] = this.transformKegiatanData(data);

        return results;
    }

    transformKegiatanData(data): any[] {
        return data.map(row => {
            row['id'] = `${row.kode_bidang}_${row.kode_kegiatan}`;
            return schemas.objToArray(row, schemas.kegiatan);
        });
    }

    transformRabData(data): any[] {
        let results = [];
        let oldKdKegiatan = '';
        let currentSubRinci = '';
        
        //clear currents
        CATEGORIES.map(c => {
            c.currents.map(c => c.value = "")
        })

        data.forEach(content => {
            let category = CATEGORIES.find(c => c.code == content.Akun);
            let fields = category.fields.slice();
            let currents = category.currents.slice();

            if (content.Jenis == '5.1.3.') {
                fields.splice(5, 0, ['Kode_SubRinci', '', 'Nama_SubRinci'])
                currents.splice(5, 0, { fieldName: 'Kode_SubRinci', value: '' })
            }

            fields.forEach((field, idx) => {
                let res = [];
                let current = currents[idx];


                for (let i = 0; i < field.length; i++) {
                    let data = (content[field[i]]) ? content[field[i]] : '';

                    if (field[i] == 'Anggaran' || field[i] == 'AnggaranStlhPAK')
                        data = null;

                    res.push(data)
                }

                if (!current) {
                    if (res[4] != ''){
                        let row = this.generateRabId(res, content.Kd_Keg);
                        results.push(row);
                    }
                    return;
                }

                if (current.value !== content[current.fieldName]) {
                    let lengthCode = content[current.fieldName].slice(-1) == '.' ? content[current.fieldName].split('.').length - 1 : content[current.fieldName].split('.').length;

                    if (content[current.fieldName].startsWith('5.1.3') && lengthCode == 5) {
                        if (currentSubRinci !== content.Kode_SubRinci){
                            let row = this.generateRabId(res, content.Kd_Keg);
                            results.push(row);
                        }
                        currentSubRinci = content[current.fieldName];
                    }
                    else{
                        let row = this.generateRabId(res, content.Kd_Keg);

                        //jika tidak ada uraian skip
                        if(row[2].startsWith('5.1.3') && row[0].split('_').length == 2 && row[4] == "")
                            return;
                        results.push(row);
                    }
                }

                current.value = content[current.fieldName];

                if (current.fieldName == "Kd_Keg") {
                    if (oldKdKegiatan != '' && oldKdKegiatan !== current.value) {
                        currents.filter(c => c.fieldName == 'Jenis' || c.fieldName == 'Obyek').map(c => { c.value = '' });
                        currentSubRinci = '';
                    }

                    oldKdKegiatan = current.value;
                }
            })

        });

        return results;
    }

    generateRabId(row, kode_kegiatan){
        let arr = [];

        if(row[0] !== "" && !row[0].startsWith('5.'))
            arr.push(row[0]);
        else if(row[1] !== "")
            arr.push(row[1]);
        else if (row[0] == '5.')
            arr.push(row[0])
        else
            arr.push(kode_kegiatan,row[0]);

        row.splice(0, 0, arr.join('_'));
        return row;
    }

}