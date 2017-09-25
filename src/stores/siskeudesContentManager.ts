import SiskeudesService from './siskeudesService';
import schemas from '../schemas';
import {FIELD_ALIASES, toSiskeudes } from './siskeudesFieldTransformer';
import SumCounterRAB from "../helpers/sumCounterRAB";
import { KeuanganUtils } from '../helpers/keuanganUtils';

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

export const RENSTRA_FIELDS = {
    fields: [['ID_Visi', 'Visi', 'Uraian_Visi'], ['ID_Misi', 'Misi', 'Uraian_Misi'], ['ID_Tujuan', 'Tujuan', 'Uraian_Tujuan'], ['ID_Sasaran', 'Sasaran', 'Uraian_Sasaran']],
    currents: [{ fieldName: 'ID_Visi', value: '', lengthId: 0 }, { fieldName: 'ID_Misi', value: '', lengthId: 2 }, { fieldName: 'ID_Tujuan', value: '', lengthId: 4 }, { fieldName: 'ID_Sasaran', value: '', lengthId: 6 }]
}

const WHERECLAUSE_FIELD = {
    Ta_RAB: ['Kd_Desa', 'Kd_Keg', 'Kd_Rincian'],
    Ta_RABSub: ['Kd_Desa', 'Kd_Keg', 'Kd_Rincian', 'Kd_SubRinci'],
    Ta_RABRinci: ['Kd_Desa', 'Kd_Keg', 'Kd_Rincian', 'Kd_SubRinci', 'No_Urut'],
    Ta_Kegiatan: ['Kd_Bid', 'Kd_Keg'],
    Ta_RPJM_Visi: ['ID_Visi'],
    Ta_RPJM_Misi: ['ID_Misi'],
    Ta_RPJM_Tujuan: ['ID_Tujuan'],
    Ta_RPJM_Sasaran: ['ID_Sasaran'],
    Ta_RPJM_Kegiatan: ['Kd_Keg'],
    Ta_RPJM_Pagu_Tahunan: ['Kd_Keg', 'Kd_Tahun']
}

enum TypesRenstra { Visi = 0, Misi = 2, Tujuan = 4, Sasaran = 6 };
enum TablesRenstra { Ta_RPJM_Visi = 0, Ta_RPJM_Misi = 2, Ta_RPJM_Tujuan = 4, Ta_RPJM_Sasaran = 6 };

export interface ContentManager {
    getContents(): Promise<any>;
    saveDiffs(diffs, callback);
}

export class PenganggaranContentManager implements ContentManager {

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
            let sourceData = [], diff;

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
                    let data = toSiskeudes(obj, 'kegiatan');

                    // perbedaan id kegiatan dengan kode kegiatan, pada id kegiatan tidak berisi kode desa di depannya
                    data['ID_Keg'] = data.Kd_Bid.replace(this.desa.Kd_Desa,'');
                    data = this.valueNormalizer(data);
    
                    Object.assign(data, extCols);
                    bundle.insert.push({ [table]: data });
                })
    
                diff.modified.forEach(row => {
                    let result = { whereClause: {}, data: {} };
                    let obj = schemas.arrayToObj(row, schemas.kegiatan);
                    let data = toSiskeudes(obj, 'kegiatan');

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
                    let data = toSiskeudes(obj, 'kegiatan');

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
        else if(row[0] == "" || !row[0])
            arr.push(row[1]);
        else if(row[0] == "5.")
            arr.push(row[0]);
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
            let data = toSiskeudes(obj, 'kegiatan');
            let findResult = bidangsBefore.find(c => c.Kd_Bid == data.Kd_Bid);

            if(!findResult){
                let res = Object.assign(extCols, { Kd_Bid: data.Kd_Bid, Nama_Bidang: data.Nama_Bidang });
                result.push({ [table]: res })
            }
        });
        
        return result;
    }

    

    parsingCode(obj, action): any[] {
        let content = toSiskeudes(obj, 'rab');        
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

export class SppContentManager implements ContentManager {
    constructor(private siskeudesService: SiskeudesService,
        private desa: any, private dataReferences: any){
    }

    async getContents(): Promise<any> {
        let results = {};
        
        var data = await this.siskeudesService.getSPP(this.desa.Kd_Desa);
        results["spp"] = data.map(d => schemas.objToArray(d, schemas.spp));

        var data = await this.siskeudesService.getSPPRinci(this.desa.Kd_Desa);
        results["spp_rinci"] = data.map(d => schemas.objToArray(d, schemas.spp_rinci));

        var data = await this.siskeudesService.getSPPBukti(this.desa.Kd_Desa);
        results["spp_bukti"] = data.map(d => schemas.objToArray(d, schemas.spp_bukti));

        return results;
    }

    saveDiffs(diffs: any, callback: any) {
        throw new Error("Method not implemented.");
    }

}

export class PenerimaanContentManager implements ContentManager {
    constructor(private siskeudesService: SiskeudesService,
        private desa: any, private dataReferences: any){
    }

    async getContents(): Promise<any> {
        let results = {};
        
        var data = await this.siskeudesService.getTBP(this.desa.Kd_Desa);
        results["tbp"] = data.map(d => schemas.objToArray(d, schemas.tbp));

        var data = await this.siskeudesService.getTBPRinci(this.desa.Kd_Desa);
        results["tbp_rinci"] = data.map(d => schemas.objToArray(d, schemas.tbp_rinci));

        return results;
    }

    saveDiffs(diffs: any, callback: any) {
        throw new Error("Method not implemented.");
    }

}

export class PerencanaanContentManager implements ContentManager {
    constructor(private siskeudesService: SiskeudesService,
        private desa: any, private dataReferences: any){
    }

    async getContents(): Promise<any> {
        let results = {};
        
        RENSTRA_FIELDS.currents.map(c => c.value = '');
        var data = await this.siskeudesService.getRenstraRPJM(this.desa.ID_Visi, this.desa.Kd_Desa, this.desa.Tahun);
        results['renstra'] = this.transformData(data);

        var data = await this.siskeudesService.getRPJM(this.desa.Kd_Desa);
        results['rpjm'] = data.map(o => {
            let data = schemas.objToArray(o, schemas.rpjm)
            data[0] = `${o.kode_bidang}_${o.kode_kegiatan}`
            return data;
        });
        
        for(let i = 1; i <= 6 ; i++){
            var data = await this.siskeudesService.getRKPByYear(this.desa.Kd_Desa, i);
            if (data.length == 0) {
                results[`rkp${i}`] = [];
            }
            else {
                results[`rkp${i}`] = data.map(o => {
                    let data = schemas.objToArray(o, schemas.rkp)
                    data[0] = `${o.kode_bidang}_${o.kode_kegiatan}`
                    return data;
                });
            }
        }

        return results;
    };
    
    saveDiffs(diffs: any, callback: any) {
        let isRKPSheet = false;
        let me = this;

        let requiredCol = { Kd_Desa: this.desa.Kd_Desa, Tahun: this.desa.Tahun }
        let bundle = {
            insert: [],
            update: [],
            delete: []
        };

        Object.keys(diffs).forEach(sheet => {
            let sourceData = [], diff;
            
            diff = diffs[sheet];

            if(diff.total === 0)
                return;
            if (sheet == 'renstra') {
                diff.added.forEach(content => {
                    let result = this.bundleArrToObj(content);

                    Object.assign(result.data, requiredCol);
                    bundle.insert.push({ [result.table]: result.data });
                });

                diff.modified.forEach(content => {
                    let res = { whereClause: {}, data: {} }
                    let results = this.bundleArrToObj(content);

                    Object.assign(results.data, requiredCol);

                    WHERECLAUSE_FIELD[results.table].forEach(c => {
                        res.whereClause[c] = results.data[c];
                    });

                    res.data = KeuanganUtils.sliceObject(results.data, WHERECLAUSE_FIELD[results.table]);
                    bundle.update.push({ [results.table]: res })
                });

                diff.deleted.forEach(content => {
                    let results = this.bundleArrToObj(content);
                    let res = { whereClause: {}, data: {} };

                    WHERECLAUSE_FIELD[results.table].forEach(c => {
                        res.whereClause[c] = results.data[c];
                    });

                    res.data = KeuanganUtils.sliceObject(results.data, WHERECLAUSE_FIELD[results.table]);
                    bundle.delete.push({ [results.table]: res });
                });
            }
            else {
                let table = (sheet == 'rpjm') ? 'Ta_RPJM_Kegiatan' : 'Ta_RPJM_Pagu_Tahunan';
                let entityName = (sheet == 'rpjm') ? 'rpjm' : 'rkp';
                
                if(sheet == 'rpjm'){
                    bundle = this.addOrRemoveBidang(diff, requiredCol);
                }

                if (sheet.startsWith('rkp')) {
                    let indexRKP = sheet.match(/\d+/g);
                    requiredCol['Kd_Tahun'] = `THN${indexRKP}`;
                    isRKPSheet = true;
                }

                diff.added.forEach(content => {
                    let source = schemas.arrayToObj(content, schemas[entityName]);
                    let data = toSiskeudes(source, entityName);
                    
                    let ID_Keg = data.Kd_Keg.substring(this.desa.Kd_Desa.length);
                    data = this.valueNormalizer(data);

                    Object.assign(data, requiredCol, { ID_Keg: ID_Keg });
                    bundle.insert.push({ [table]: data });
                });

                diff.modified.forEach(content => {
                    let source = schemas.arrayToObj(content, schemas[entityName]);
                    let data = toSiskeudes(source, entityName);
                    let res = { whereClause: {}, data: {} }
                    let ID_Keg = data.Kd_Keg.substring(this.desa.Kd_Desa.length);
                    data = this.valueNormalizer(data);

                    if (sheet == 'rpjm' && !data['Keluaran'])
                        data['Keluaran'] = "";

                    Object.assign(data, requiredCol, { ID_Keg: ID_Keg })

                    WHERECLAUSE_FIELD[table].forEach(c => {
                        res.whereClause[c] = data[c];
                    });

                    res.data = KeuanganUtils.sliceObject(data, WHERECLAUSE_FIELD[table]);
                    bundle.update.push({ [table]: res });
                });

                diff.deleted.forEach(content => {
                    let source = schemas.arrayToObj(content, schemas[entityName]);
                    let data = toSiskeudes(source, entityName);
                    let res = { whereClause: {}, data: {} };

                    WHERECLAUSE_FIELD[table].forEach(c => {
                        res.whereClause[c] = data[c];
                    });

                    res.data = KeuanganUtils.sliceObject(data, WHERECLAUSE_FIELD[table]);
                    bundle.delete.push({ [table]: res });
                });
            }
        });
        this.siskeudesService.saveToSiskeudesDB(bundle, null, callback);
    }

    transformData(source): any[] {
        let results = [];
        RENSTRA_FIELDS.currents.map(c => c.value = "");
        source.forEach(content => {
            RENSTRA_FIELDS.fields.forEach((field, idx) => {
                let res = [];
                let current = RENSTRA_FIELDS.currents[idx];
                let valueNulled = false;

                for (let i = 0; i < field.length; i++) {
                    let value = content[field[i]]

                    if (!value && value !== "") {
                        if (value === null) { valueNulled = true; break; }
                    }
                    let data = (content[field[i]] || content[field[i]] == "") ? content[field[i]] : field[i];
                    res.push(data)
                }

                if (valueNulled) return;
                if (current.value !== content[current.fieldName]) results.push(res);

                current.value = content[current.fieldName];
            })

        })

        return results;
    }

    bundleArrToObj(content): any {
        let result = {};
        let code = content[0].substring(this.desa.ID_Visi.length);
        let table = TablesRenstra[code.length];
        let field = RENSTRA_FIELDS.fields.find(c => c[1] == content[1])
        let data = this.arrayToObj(content.slice(0, field.length), field);
        let codes = this.parsingCode(content[0]);

        Object.assign(data, codes);
        return { table: table, data: data }
    }

    parsingCode(codeSource): any {
        let fields = ['ID_Visi', 'ID_Misi', 'ID_Tujuan', 'ID_Sasaran'];
        let code = codeSource.substring(this.desa.ID_Visi.length);
        let type = TypesRenstra[code.length];

        let posField = fields.indexOf('ID_' + type)
        let results = {};

        fields.slice(posField - 1, posField).forEach(field => {
            let endSlice = TypesRenstra[field.split('_')[1]]
            results[field] = this.desa.ID_Visi + code.slice(0, parseInt(endSlice))
        });

        results['No_' + type] = (type == 'Visi') ? this.desa.ID_Visi.substring(this.desa.Kd_Desa.length).slice(0, -1) : code.slice(-2);
        return results;
    }

    addOrRemoveBidang(diff, requiredCol): any{
        let bidangAvailable = this.dataReferences['rpjmBidangAdded'];
        let bundle = {
            insert: [],
            update: [],
            delete: []
        };

        diff.added.forEach(content => {
            let source = schemas.arrayToObj(content, schemas.rpjm);
            let data = toSiskeudes(source, 'rpjm');
            let resultFind = bidangAvailable.find(c => c.Kd_Bid == data.Kd_Bid);   

            if(!resultFind){
                Object.assign(data, requiredCol);
                bundle.insert.push({ 'Ta_RPJM_Bidang': data });
            }
            
        });

        return bundle;
    }
    
    valueNormalizer(model): any {
        Object.keys(model).forEach(val => {
            if (model[val] == null || model[val] === undefined)
                model[val] = '';
        })
        return model;
    }

    arrayToObj(arr, schema): any {
        let result = {};
        for (let i = 0; i < schema.length; i++) {
            let newValue;
            if (arr[i] == 'true' || arr[i] == 'false')
                newValue = arr[i] == 'true' ? true : false;
            else
                newValue = arr[i];

            result[schema[i]] = newValue;
        }

        return result;
    }

}