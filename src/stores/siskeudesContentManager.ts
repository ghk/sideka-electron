import SiskeudesService from './siskeudesService';
import schemas from '../schemas';
import {FIELD_ALIASES } from './siskeudesFieldTransformer';
import SumCounterRAB from "../helpers/sumCounterRAB";
import {KeuanganUtils} from '../helpers/keuanganUtils';

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
            ['Akun', '', 'Nama_Akun'], ['', 'Kd_Bid', 'Nama_Bidang'], ['', 'Kd_Keg', 'Nama_Kegiatan'], ['Jenis', 'Kd_Keg', 'Nama_Jenis'], ['Obyek', 'Kd_Keg', 'Nama_Obyek'],
            ['Kode_Rincian', 'Kd_Keg', 'Uraian', 'SumberDana', 'JmlSatuan', 'Satuan', 'HrgSatuan', 'Anggaran', 'JmlSatuanPAK', 'Satuan', 'HrgSatuan', 'AnggaranStlhPAK', 'Perubahan']
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

const WHERECLAUSE_FIELD = {
    Ta_RAB: ['Kd_Desa', 'Kd_Keg', 'Kd_Rincian'],
    Ta_RABSub: ['Kd_Desa', 'Kd_Keg', 'Kd_Rincian', 'Kd_SubRinci'],
    Ta_RABRinci: ['Kd_Desa', 'Kd_Keg', 'Kd_Rincian', 'Kd_SubRinci', 'No_Urut'],
    Ta_Kegiatan: ['Kd_Bid', 'Kd_Keg']
}

export class PenganggaranContentManager {

    constructor(private siskeudesService: SiskeudesService, 
        private desa: any, private dataReferences: any, private rabSumCounter: SumCounterRAB){
    }

    async getContents(): Promise<any> {
        let results = {};
        
        var data = await this.siskeudesService.getRAB(this.desa.Tahun, this.desa.Kd_Desa);
        results["rab"] = this.transformRabData(data);

        var data = await this.siskeudesService.getTaKegiatan(this.desa.Tahun, this.desa.Kd_Desa);
        results["kegiatan"] = this.transformKegiatanData(data);

        return results;
    }

    saveDiffs(diffs, callback){
        let bundle = {
            insert: [],
            update: [],
            delete: []
        };

        Object.keys(diffs).forEach(sheet => {
            let sourceData = [], initialData = [], diff;

            diff = diffs[sheet];

            if(diff.total === 0)
                return;
            
            if(sheet == 'kegiatan'){
                let extCols = { Kd_Desa: this.desa.Kd_Desa, Tahun: this.desa.Tahun };
                let table = 'Ta_Kegiatan';
    
                //check Ta_Bidang, jika ada Bidang Baru Yang ditambahkan Insert terlebih dahulu sebelum kegiatan
                let bidangResult = this.getNewBidang(diffs);
                bundle.insert = bidangResult;
    
                diff.added.forEach(row => {             
                    let obj = schemas.arrayToObj(row, schemas.kegiatan);
                    let data = this.convertToSiskeudesField(obj, 'kegiatan');

                    // perbedaan id kegiatan dengan kode kegiatan, pada id kegiatan tidak berisi kode desa di depannya
                    data['ID_Keg'] = data.Kd_Bid.replace(this.desa.Kd_Desa,'');
                    data = this.valueNormalizer(data);
    
                    Object.assign(data, extCols);
                    bundle.insert.push({ [table]: data });
                })
    
                diff.modified.forEach(row => {
                    let result = { whereClause: {}, data: {} };
                    let obj = schemas.arrayToObj(row, schemas.kegiatan);
                    let data = this.convertToSiskeudesField(obj, 'kegiatan');

                    data['ID_Keg'] = data.Kd_Bid.replace(this.desa.Kd_Desa,'');
                    data = this.valueNormalizer(data);
                    
                    WHERECLAUSE_FIELD[table].forEach(c => {
                        result.whereClause[c] = data[c];
                    });
    
                    result.data = KeuanganUtils.sliceObject(data, WHERECLAUSE_FIELD[table]);
                    bundle.update.push({ [table]: result });
                })
                diff.deleted.forEach(row => {
                    let result = { whereClause: {}, data: {} };
                    let obj = schemas.arrayToObj(row, schemas.kegiatan);
                    let data = this.convertToSiskeudesField(obj, 'kegiatan');

                    data['ID_Keg'] = data.Kd_Bid.replace(this.desa.Kd_Desa,'');
                    data = this.valueNormalizer(data);
                    
                    WHERECLAUSE_FIELD[table].forEach(c => {
                        result.whereClause[c] = data[c];
                    });
    
                    result.data = KeuanganUtils.sliceObject(data, WHERECLAUSE_FIELD[table]);
                    bundle.delete.push({ [table]: result });
                })
            }
            else {
                diff.added.forEach( row => {
                    let data = [];
                    let obj = schemas.arrayToObj(row, schemas.rab); 
    
                    if(!this.validateIsRincian(obj)) 
                        return;
    
                    data = this.parsingCode(obj, 'add');
                    data.forEach(item => {
                        bundle.insert.push({ [item.table]: item.data })
                    });
                });
    
                diff.modified.forEach(row => {
                    let data = [];
                    let obj = schemas.arrayToObj(row, schemas.rab); 
    
                    if(!this.validateIsRincian(obj)) 
                        return;
    
                    data = this.parsingCode(obj, 'modified');
                    data.forEach(item => {
                        let res = { whereClause: {}, data: {} }
    
                        WHERECLAUSE_FIELD[item.table].forEach(c => {
                            res.whereClause[c] = item.data[c];
                        });
                        res.data = KeuanganUtils.sliceObject(item.data, WHERECLAUSE_FIELD[item.table])
    
                        bundle.update.push({ [item.table]: res })
    
                    });
    
                });
    
                diff.deleted.forEach(row => {
                    let data = [];
                    let obj = schemas.arrayToObj(row, schemas.rab); 
    
                    if(!this.validateIsRincian(obj)) 
                        return;
    
                    data = this.parsingCode(obj, 'delete');
                    data.forEach(item => {
                        let res = { whereClause: {}, data: {} }
    
                        WHERECLAUSE_FIELD[item.table].forEach(c => {
                            res.whereClause[c] = item.data[c];
                        });
                        res.data = KeuanganUtils.sliceObject(item.data, WHERECLAUSE_FIELD[item.table])
                        bundle.delete.push({ [item.table]: res });
                    });
    
                });
            }            
        })

        this.siskeudesService.saveToSiskeudesDB(bundle, null, callback);
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
                fields.splice(5, 0, ['Kode_SubRinci', 'Kd_Keg', 'Nama_SubRinci'])
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

    getNewBidang(diffs): any{
        let bidangsBefore = this.dataReferences['bidangAvailable'];
        let result = [];  
        let table = 'Ta_Bidang'; 
        let extCols = { Kd_Desa: this.desa.Kd_Desa, Tahun: this.desa.Tahun}

        let diffKegiatan = diffs["kegiatan"];
        if(diffKegiatan && diffKegiatan.total === 0)
            return result;
        
        diffKegiatan.added.forEach(row => {
            let obj = schemas.arrayToObj(row, schemas.kegiatan);
            let data = this.convertToSiskeudesField(obj, 'kegiatan');
            let findResult = bidangsBefore.find(c => c.Kd_Bid == data.Kd_Bid);

            if(!findResult){
                let res = Object.assign(extCols, { Kd_Bid: data.Kd_Bid, Nama_Bidang: data.Nama_Bidang });
                result.push({ [table]: res })
            }
        });
        
        return result;
    }

    convertToSiskeudesField(row, type): any {
        let result = {};
        let keys = Object.keys(row);
        keys.forEach(key => {
            result[FIELD_ALIASES[type][key]] = row[key];
        })
        return result;
    }

    parsingCode(obj, action): any[] {
        let content = this.convertToSiskeudesField(obj, 'rab');        
        let fields = ['Anggaran', 'AnggaranStlhPAK', 'AnggaranPAK'];
        let Kode_Rekening = (content.Kode_Rekening.slice(-1) == '.') ? content.Kode_Rekening.slice(0, -1) : content.Kode_Rekening;        
        let isBelanja = !(content.Kode_Rekening.startsWith('4') || content.Kode_Rekening.startsWith('6'));
        let dotCount = Kode_Rekening.split('.').length;

        if (dotCount == 4) {
            let table = 'Ta_RAB';
            let result = Object.assign( {}, this.desa)            
            result['Kd_Rincian'] = content.Kode_Rekening;

            if (!isBelanja)
                result['Kd_Keg'] = this.desa.Kd_Desa + '00.00.'
            else
                result['Kd_Keg'] = content.Kd_Keg;

            for (let i = 0; i < fields.length; i++) {
                result[fields[i]] = content[fields[i]]
            }
            return [{ table: table, data: result }];
        }

        if (dotCount == 5 && !content.Kode_Rekening.startsWith('5.1.3')) {
            let results = [];
            let result = Object.assign({}, this.desa, content);
            let table = 'Ta_RABRinci';

            result['Kd_Rincian'] = Kode_Rekening.split('.').slice(0, 4).join('.') + '.';
            result['No_Urut'] = Kode_Rekening.split('.')[4];
            result['Kd_SubRinci'] = '01';

            if (!isBelanja)
                result['Kd_Keg'] = this.desa.Kd_Desa + '00.00.'
            else
                result['Kd_Keg'] = content.Kd_Keg;

            if (result['No_Urut'] == '01' && action == 'add' && isBelanja || action == 'modified' && isBelanja) {
                let table = 'Ta_RABSub';
                let newSubRinci = Object.assign({}, { Kd_SubRinci: '01', Kd_Rincian: result['Kd_Rincian'], Kd_Keg: content.Kd_Keg, Kd_Desa: this.desa.Kd_Desa, Tahun: this.desa.Tahun });
                let anggaran = this.rabSumCounter.sums;
                let fields = { awal: 'Anggaran', PAK: 'AnggaranStlhPAK', perubahan: 'AnggaranPAK' };                
                let property = (!content.Kd_Keg || content.Kd_Keg == '') ? result['Kd_Rincian'] : content.Kd_Keg + '_' + result['Kd_Rincian'];
                let category = CATEGORIES.find(c => result['Kd_Rincian'].startsWith(c.code) == true).name;

                newSubRinci['Nama_SubRinci'] = this.dataReferences[category]['Obyek'].find(c => c[1] == result['Kd_Rincian'])[3];

                Object.keys(fields).forEach(item => {
                    newSubRinci[fields[item]] = anggaran[item][property];
                });

                results.push({ table: table, data: newSubRinci });
            }

            results.push({ table: table, data: result });
            return results;
        }

        if (content.Kode_Rekening.startsWith('5.1.3')) {
            let table = dotCount == 5 ? 'Ta_RABSub' : 'Ta_RABRinci';
            let result = Object.assign({}, this.desa, content)

            result['Kd_Rincian'] = Kode_Rekening.split('.').slice(0, 4).join('.') + '.';
            result['Kd_SubRinci'] = Kode_Rekening.split('.')[4];

            if (dotCount == 5)
                result['Nama_SubRinci'] = content.Uraian;
            else
                result['No_Urut'] = Kode_Rekening.split('.')[5];

            return [{ table: table, data: result }]
        }
        return [];
    }

    valueNormalizer(data): any{
        Object.keys(data).forEach(key => {
            if(data[key] == ''|| data[key] === undefined){
                data[key] = null
            }
        })
        return data;
    }

    validateIsRincian(content): boolean {
        //periksa apakah kegiatan atau bukan, jika kode rekening kosong maka row tsb kode keg atau kode bid
        if (!content.kode_rekening || content.kode_rekening == '')
            return false;

        //hapus jika ada titik di belakang kode rekening
        let dotCount = content.kode_rekening.slice(-1) == '.' ? content.kode_rekening.split('.').length - 1 : content.kode_rekening.split('.').length;
        if (dotCount < 4)
            return false;

        return true;
    }


}

export class SppContentManager {

    constructor(private siskeudesService: SiskeudesService, 
        private desa: any, private dataReferences: any){
    }

    async getContents(): Promise<any> {
        let results = {};
        
        var data = await this.siskeudesService.getSPP(this.desa.Kd_Desa);
        results["spp"] = data.map(d => schemas.objToArray(d, schemas.spp));

        var data = await this.siskeudesService.getSPPRinci(this.desa.Kd_Desa);
        results["sppRinci"] = data.map(d => schemas.objToArray(d, schemas.sppRinci));

        var data = await this.siskeudesService.getSPPBukti(this.desa.Kd_Desa);
        results["sppBukti"] = data.map(d => schemas.objToArray(d, schemas.sppBukti));

        return results;
    }

}