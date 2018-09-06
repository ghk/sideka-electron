import * as Handsontable from '../../lib/handsontablep/dist/handsontable.full';

export class BaseHotComponent {
    
    public instance: any;
    data: any[];

    constructor() {}

    createHot(element, options): void {
        this.instance = new Handsontable(element, options);
    }

    addHook(name, hook): void {
        this.instance.addHook(name, hook);
    }

    removeHook(name, hook): void {
        this.instance.removeHook(name, hook);
    }

    load(data): void {
        this.data = data;
        this.instance.loadData(this.data);
        this.render();  
    }

    setData(row, data): void {
        this.instance.alter('insert_row', 0, []);
        
        for (let i=0; i<data.length; i++) {
            this.instance.setDataAtCell(row, i, data[i]);
        }
    }

    render(): void {
        let instance = this.instance;

        setTimeout(() => {
            instance.render();
        }, 200);
    }
}