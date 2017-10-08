import { remote } from 'electron';
import { Component, NgZone, ViewContainerRef, Input, Output, EventEmitter } from '@angular/core';
import { ToastsManager } from 'ng2-toastr';

import schemas from '../schemas';
import Chart from 'chart.js';

import * as moment from 'moment';
import * as path from 'path';
import * as fs from 'fs';

@Component({
    selector: 'sipbm-statistic',
    templateUrl: '../templates/sipbmStatistic.html',
})

export default class SipbmStatisticComponent {
    private _hot;
    private _penduduks;

    @Input()
    set hot(value) {
        this._hot = value;
    }
    get hot() {
        return this._hot;
    }

    @Input()
    set penduduk(value) {
        this._penduduks = value;
    }
    get penduduk() {
        return this._penduduks;
    }

    total: any = {};
    charts: any = {};
    constructor() { }

    ngOnInit() { 
        this.total =  {
            'kematian_anak': 0,
            'kelahiran_anak': 0
        }

        this.kepemilikanjamban();
        this.tingkatPendidikan();

    }

    kepemilikanjamban(){
        let chart, data = [];
        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.sipbm));
        let labels = ['Jamban / Wc Sendiri', 'Jamban / Wc Umum', 'Bukan Jamban / WC'];
        let canvasJamban =  document.getElementById("kepemilikan-jamban");

        chart = this.charts['kepemilikan-jamban'] = new Chart(canvasJamban, this.config('bar', ''));         
        chart.data.labels = labels;        

        labels.forEach(label => {
            let value = sourceData.filter(c => c.kepemilikan_jamban == label).length;
            data.push(value)
        })

        chart.data.datasets.push({
                label: "",
                backgroundColor: ["#3e95cd", "#8e5ea2","#3cba9f"],
                data: data
        })
        chart.update();
    }

    jaraksekolah(){
        let chart, data = [];
        let sourceData = this.hot.getSourceData().map(c => schemas.arrayToObj(c, schemas.sipbm));
        let labels = ['PAUD', 'SD / MI', ' / MTs', 'SMA / SMK / MA '];
        let canvasJaraksekolah =  document.getElementById("jarak-sekolah");

        chart = this.charts['jarak-sekolah'] = new Chart(canvasJaraksekolah, this.config('bar', ''));         
        chart.data.labels = labels;        

        sourceData.forEach
        chart.data.datasets.push({
            label: "",
            backgroundColor: ["#3e95cd", "#8e5ea2","#3cba9f","#57779f"],
            data: data
        })
        chart.update();
    }

    toObject(array){
        let results = {};
        array.forEach((row, i) => {
            let key = row.split('/')[0];
            results[key] = 0; 
        });
        return results;
    }

    tingkatPendidikan(){
        let chart, data = [];
        let sourceData = this.penduduk.map(c => schemas.arrayToObj(c, schemas.penduduk));
        let labels = ['3 - 6 Tahun', '7 - 12 Tahun', '13 - 15 Tahun', '16 - 18 Tahun'];
        let canvasPendidikan =  document.getElementById("tingkat-pendidikan");
        let category = { sedangBersekolah: 0, tidakBersekolah: 0 }
        let results = {'3_6': Object.assign({},category), '7_12': Object.assign({},category), '13_15': Object.assign({},category), '16_18': Object.assign({},category) };
        

        chart = this.charts['tingkat-pendidikan'] = new Chart(canvasPendidikan, this.config('bar', ''));         
        chart.data.labels = labels; 

        sourceData.forEach(row => {
            let date = moment(row.tanggal_lahir, 'DD-MM-YYYY');
            let year = moment().diff(date, 'year');
            
            if(!year)
                return;

            if(year > 2 && year < 7){
                if(!row.pendidikan)
                    return false;
                let pendidikan = row.pendidikan.toLowerCase();
                if(pendidikan.startsWith('sedang')){
                    results['3_6']['sedangBersekolah'] = results['3_6']['sedangBersekolah'] + 1;
                }
                else if(pendidikan.startsWith('tidak pernah') || pendidikan.startsWith('tidak tamat')){
                    results['3_6']['tidakBersekolah'] = results['3_6']['tidakBersekolah'] + 1;
                }
            }
            else if (year > 6 && year < 13){
                if(!row.pendidikan)
                    return false;
                let pendidikan = row.pendidikan.toLowerCase();
                if(pendidikan.startsWith('sedang')){
                    results['7_12']['sedangBersekolah'] = results['7_12']['sedangBersekolah'] + 1;
                }
                else if(pendidikan.startsWith('tidak pernah') || pendidikan.startsWith('tidak tamat')){
                    results['7_12']['tidakBersekolah'] = results['7_12']['tidakBersekolah'] + 1;
                }    
            }
            else if( year > 12 && year < 16)
            {
                if(!row.pendidikan)
                    return false;
                let pendidikan = row.pendidikan.toLowerCase();
                if(pendidikan.startsWith('sedang')){
                    results['13_15']['sedangBersekolah'] = results['13_15']['sedangBersekolah'] + 1;
                }
                else if(pendidikan.startsWith('tidak pernah') || pendidikan.startsWith('tidak tamat')){
                    results['13_15']['tidakBersekolah'] = results['13_15']['tidakBersekolah'] + 1;
                }  
            }
            else if( year > 15 && year < 17){
                if(!row.pendidikan)
                    return false;
                let pendidikan = row.pendidikan.toLowerCase();
                if(pendidikan.startsWith('sedang')){
                    results['16_18']['sedangBersekolah'] = results['16_18']['sedangBersekolah'] + 1;
                }
                else if(pendidikan.startsWith('tidak pernah') || pendidikan.startsWith('tidak tamat')){
                    results['16_18']['tidakBersekolah'] = results['16_18']['tidakBersekolah'] + 1;
                }
            }
        });
        let dataBersekolah = [];
        let dataTidakBersekolah = [];

        Object.keys(results).forEach(key => {
            dataBersekolah.push(results[key]['sedangBersekolah']);
            dataTidakBersekolah.push(results[key]['tidakBersekolah'])
        })

        chart.data.datasets = [{
            label: "Sedang Bersekolah",
            backgroundColor: "blue",
            data: dataBersekolah
        },{
            label: "Tidak Bersekolah",
            backgroundColor: "green",
            data: dataTidakBersekolah
        }]
        
        chart.update();

    }

    getContext (canvas){
        if (canvas.getContext){
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = 'black';
            ctx.font = '26px Arial';
            ctx.fillText('0', 0, 26);
            return ctx;
        }
    }
    config(type, text){
        return {
            type: type,
            data: {
              labels: [],
              datasets: [
              ]
            },
            options: {
              legend: { display: false },
              title: {
                display: true,
                text: text
              }
            }
        };
    }
    
}