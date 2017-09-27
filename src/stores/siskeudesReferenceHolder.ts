import SiskeudesService from '../stores/siskeudesService';

export default class SiskeudesReferenceHolder {
    [type: string]: any;
    constructor(private siskeudesService: SiskeudesService){
    }

    private async getFromSiskeudes(type: string): Promise<any> {
        switch(type) {
            case 'refKegiatan':
                return await this.siskeudesService.getRefKegiatan();
            case 'refBidang':
                return await this.siskeudesService.getRefBidang();
            case 'refSumberDana':
                return await this.siskeudesService.getRefSumberDana();
            case 'pemda':
                return await this.siskeudesService.getTaPemda();
            case 'rpjmBidangAdded':
                return this.siskeudesService.getRpjmBidangAdded();
            case 'refRekening4':
                return this.siskeudesService.getRefRekening4();
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