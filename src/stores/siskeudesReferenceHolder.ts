import SiskeudesService from '../stores/siskeudesService';

export default class SiskeudesReferenceHolder {
    [type: string]: any;
    constructor(private siskeudesService: SiskeudesService){
    }

    private async getFromSiskeudes(type: string): Promise<any> {
        switch(type) {
            case 'kegiatan':
                return await this.siskeudesService.getRefKegiatan();
            case 'bidang':
                return await this.siskeudesService.getRefBidang();
            case 'sumberDana':
                return await this.siskeudesService.getRefSumberDana();
            case 'Pemda':
                return await this.siskeudesService.getTaPemda();
        }
    }

    async get(type: string): Promise<any>{
        if(this[type] && this[type].length)
            return this[type];

        var data = await this.getFromSiskeudes(type);
        this[type] = data;
        console.log("get", type, data);
        return data;
    }
};