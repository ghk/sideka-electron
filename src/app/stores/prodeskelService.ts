import { remote } from 'electron';
import { Injectable } from '@angular/core';
import { escape } from 'querystring';
import { RequestOptions } from '@angular/http/src/base_request_options'
import { ProgressHttp } from 'angular-progress-http';
import { Observable, ReplaySubject } from 'rxjs';

import request from 'request-promise';
import SettingsService from './settingsService';
import $ from 'jquery';


const URL = 'http://prodeskel.binapemdes.kemendagri.go.id';

@Injectable()
export default class ProdeskelService {
    private _settingService: SettingsService;
    private _http: ProgressHttp;

    constructor(private http: ProgressHttp, private settingService: SettingsService) {
        this._settingService = settingService;
        this._http = http;
    }

    getInitialCookie() {
        let options = { resolveWithFullResponse: true };

        return request.get(URL, options);
    }

    getCookies() {
        return new Promise((resolve, reject) => {
            remote.getCurrentWebContents().session.cookies.get({ name: 'PHPSESSID' }, (err, cookies) => {
                if(err) {
                    reject(err);
                    return;
                }

                resolve(cookies);
            });
        });
    }

    async login(login, password) {
        let cookies = await this.getCookies();

        let body = 'nm_form_submit=1&nmgp_idioma_novo=&nmgp_schema_f=&nmgp_url_saida=&bok=OK&nmgp_opcao=alterar' + 
        '&nmgp_ancora=&nmgp_num_form=&nmgp_parms=&script_case_init=433&script_case_session=' + cookies[0].value + 
        '&links=&login=' + login + '&pswd=' + password;
    
        let options = {
            url: URL + '/app_Login/',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Method': 'POST /app_Login/ HTTP/1.1',
                'Cookie': 'PHPSESSID=' + cookies[0].value,
                'Upgrade-Insecure-Requests': 1
            },
            body: body,
            resolveWithFullResponse: true
        };

        return request.post(options);
    }

    async getKodeDesa() {
        let cookies = await this.getCookies();

        let options = {
            url: URL + '/grid_ddk01/',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Method': 'POST /app_Login/ HTTP/1.1',
                'Cookie': 'PHPSESSID=' + cookies[0].value,
                'Upgrade-Insecure-Requests': 1
            },
            resolveWithFullResponse: true
        };

        let response = await request.get(options);
        let view = $(response.body);
        let link = view[66].getElementsByTagName('tr')[5].getElementsByTagName('table')[0].getElementsByTagName('tr')[0].getElementsByTagName('td')[1].getElementsByTagName('a')[0].href
        let kodeDesaRaw = link.split('javascript: nm_gp_submit5')[1].split(',')[2].split('*')[1];
        let kodeDesa = kodeDesaRaw.substr(4, kodeDesaRaw.length - 1);

        return kodeDesa;
    }

    async getSearchKK(noKK: string) {
        let cookies = await this.getCookies();
        let headers = this.getHttpHeaders();
        
        headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        headers['Cookie'] = 'PHPSESSID=' + cookies[0].value;
        headers['Host'] = 'prodeskel.binapemdes.kemendagri.go.id';
        headers['Origin'] = 'http://prodeskel.binapemdes.kemendagri.go.id';
        headers['Referer'] = 'http://prodeskel.binapemdes.kemendagri.go.id/grid_ddk01/';
        headers['User-Agent'] = navigator.userAgent;

        let body = 'nmgp_opcao=ajax_navigate&script_case_init=176&script_case_session=' + cookies[0].value + '&opc=fast_search&parm=SC_all_Cmp_SCQS_qp_SCQS_' + noKK;
        let options = {
            url: URL + '/grid_ddk01/index.php',
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cookie': 'PHPSESSID=' + cookies[0].value,
                'Host': 'prodeskel.binapemdes.kemendagri.go.id',
                'Origin': 'http://prodeskel.binapemdes.kemendagri.go.id',
                'Referer': 'http://prodeskel.binapemdes.kemendagri.go.id/grid_ddk01/',
                'User-Agent': navigator.userAgent,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: body,
            resolveWithFullResponse: true
        }

        return request.post(options);
    }

    async getAKList(params) {
        let cookies = await this.getCookies();
        let body = 'nmgp_chave=&nmgp_opcao=grid&nmgp_ordem=&nmgp_chave_det=&nmgp_quant_linhas=' 
            + '&nmgp_url_saida=grid_ddk01&nmgp_parms=' + params
            + '&nmgp_tipo_pdf=&nmgp_outra_jan=&nmgp_orig_pesq=&script_case_init=753&script_case_session=' + cookies[0].value;
    
        let options = {
            url: URL + '/grid_ddk02/',
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': 'PHPSESSID=' + cookies[0].value,
                'Host': 'prodeskel.binapemdes.kemendagri.go.id',
                'Origin': 'http://prodeskel.binapemdes.kemendagri.go.id',
                'Referer': 'http://prodeskel.binapemdes.kemendagri.go.id/grid_ddk02/',
                'User-Agent': navigator.userAgent,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: body,
            resolveWithFullResponse: true
        }

        return request.post(options);
    }

    async insertNewKK(kepalaKeluarga, kodeDesa) {
        let cookies = await this.getCookies();
        let currentMonth = new Date().getMonth() + 1 >= 10 ? new Date().getMonth() + 1 : '0' + (new Date().getMonth() + 1).toString();

        let body = 'nm_form_submit=1&nmgp_idioma_novo=&nmgp_schema_f=&nmgp_url_saida=&nmgp_opcao=incluir&nmgp_ancora=&nmgp_num_form=&nmgp_parms=&script_case_init=55&script_case_session=' + cookies[0].value 
            + '&kode_desa=' + kodeDesa 
            + '&kode_keluarga=' + kepalaKeluarga.no_kk 
            + '&namakk=' + kepalaKeluarga.nama_penduduk 
            + '&alamat=' + kepalaKeluarga.alamat_jalan 
            + '&rt=' + kepalaKeluarga.rt 
            + '&rw=' + kepalaKeluarga.rw 
            + '&nama_dusun=' + kepalaKeluarga.nama_dusun 
            + '&bulan=' + currentMonth.toString()
            + '&tahun=' + new Date().getFullYear().toString() 
            + '&d014=' + this._settingService.get('prodeskel.pengisi')
            + '&d015=' + this._settingService.get('prodeskel.pekerjaan') 
            + '&d016=' + this._settingService.get('prodeskel.jabatan') 
            + '&d017=' + 'SIDEKA'
            + '&kodekk_temp=';

        let options = {
            url: URL + '/form_ddk01/',
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': 'PHPSESSID=' + cookies[0].value,
                'Host': 'prodeskel.binapemdes.kemendagri.go.id',
                'Origin': 'http://prodeskel.binapemdes.kemendagri.go.id',
                'Referer': 'http://prodeskel.binapemdes.kemendagri.go.id/form_ddk01/',
                'User-Agent': navigator.userAgent,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: body,
            resolveWithFullResponse: true
        }

        return request.post(options);
    }

    async updateKK(id, kodeDesa, kepalaKeluarga) {
        let cookies = await this.getCookies();
        let currentMonth = new Date().getMonth() + 1 >= 10 ? new Date().getMonth() + 1 : '0' + new Date().getMonth() + 1;

        let body = 'rs=ajax_form_ddk01_submit_form&rst=&rsrnd=1516782751346&rsargs[]=' + id 
            + '&rsargs[]=' + kodeDesa
            + '&rsargs[]=' + kepalaKeluarga.no_kk 
            + '&rsargs[]=' + kepalaKeluarga.nama_penduduk 
            + '&rsargs[]=' + kepalaKeluarga.alamat_jalan 
            + '&rsargs[]=' + kepalaKeluarga.rt 
            + '&rsargs[]=' + kepalaKeluarga.rw 
            + '&rsargs[]=' + kepalaKeluarga.nama_dusun 
            + '&rsargs[]=' + currentMonth 
            + '&rsargs[]=' + new Date().getFullYear().toString() 
            + '&rsargs[]=' + 'SIDEKA'//this.settingService.get('prodeksel.prodeskelPengisi') 
            + '&rsargs[]=' + 'SIDEKA'//this.settingService.get('prodeskel.prodeskelPekerjaan')
            + '&rsargs[]=' + 'SIDEKA'//this.settingService.get('prodeskel.prodeskelJabatan')
            + '&rsargs[]=' + 'SIDEKA'
            + '&rsargs[]=' + kepalaKeluarga.no_kk
            + '&rsargs[]=1&rsargs[]=&rsargs[]=alterar&rsargs[]=&rsargs[]=&rsargs[]=&rsargs[]=1';

        let options = {
            url: URL + '/form_ddk01/',
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.9',
                'Method': 'POST /form_ddk01/ HTTP/1.1',
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': 'PHPSESSID=' + cookies[0].value,
                'Host': 'prodeskel.binapemdes.kemendagri.go.id',
                'Origin': 'http://prodeskel.binapemdes.kemendagri.go.id',
                'Referer': 'http://prodeskel.binapemdes.kemendagri.go.id/form_ddk01/',
                'User-Agent': navigator.userAgent,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: body,
            resolveWithFullResponse: true
        }
        
        return request.post(options);
    }

    async insertNewAK(kodeDesa, anggotaKeluarga, index) {
        let cookies = await this.getCookies();
        let bods = anggotaKeluarga.tanggal_lahir.split('/');

        let body = 'nm_form_submit=1&nmgp_idioma_novo=&nmgp_schema_f=&nmgp_url_saida=&nmgp_opcao=incluir&nmgp_ancora=&nmgp_num_form=&nmgp_parms=&script_case_init=1&script_case_session=' + cookies[0].value 
            + '&kode_desa=' + kodeDesa 
            + '&kode_keluarga=' + anggotaKeluarga.no_kk 
            + '&tanggal=' + this.encodeDate(new Date())
            + '&no_urut=' + index 
            + '&nik=' + anggotaKeluarga.nik 
            + '&d025=' + anggotaKeluarga.nama_penduduk
            + '&d025a=' + anggotaKeluarga.no_akta 
            + '&d026=1' 
            + '&d027=11' 
            + '&d028=' + anggotaKeluarga.tempat_lahir 
            + '&d029=' + this.encodeDate(new Date(bods[2], bods[1], bods[0]))
            + '&d030=' + this.encodeDate(new Date())
            + '&d031=0' 
            + '&d032=1' 
            + '&d033=4' 
            + '&d034=1' 
            + '&d035=' 
            + '&d035_autocomp=' 
            + '&d036=1' 
            + '&d037=37' 
            + '&d038=' 
            + '&d040=9';
        
        let options = {
            url: URL + '/form_ddk02/',
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': 'PHPSESSID=' + cookies[0].value,
                'Host': 'prodeskel.binapemdes.kemendagri.go.id',
                'Origin': 'http://prodeskel.binapemdes.kemendagri.go.id',
                'Referer': 'http://prodeskel.binapemdes.kemendagri.go.id/form_ddk02/',
                'User-Agent': navigator.userAgent,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: body,
            resolveWithFullResponse: true
        }

        return request.post(options);
    }
    
    async openFormDDK02O(param) {
        let cookies = await this.getCookies();
        let body ='nmgp_chave=&nmgp_opcao=igual&nmgp_ordem=&nmgp_chave_det=&nmgp_quant_linhas=&nmgp_url_saida=%2Fgrid_ddk02%2F&nmgp_parms=' + param + '&nmgp_tipo_pdf=&nmgp_outra_jan=&nmgp_orig_pesq=&script_case_init=328&script_case_session=' + cookies[0].value;
        console.log(body);

        let options = {
            url: URL + '/form_ddk02/',
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': 'PHPSESSID=' + cookies[0].value,
                'Host': 'prodeskel.binapemdes.kemendagri.go.id',
                
                'User-Agent': navigator.userAgent,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: body,
            resolveWithFullResponse: true
        }

        return request.post(options);
    }

    async updateAK(kodeDesa, anggotaKeluarga, index, scriptCaseInit) {
        let cookies = await this.getCookies();
        let now = new Date();
        let date = now.getDate() > 9 ? now.getDate().toString() : '0' +  now.getDate();
        let month = now.getMonth() + 1 > 9 ? now.getMonth() + 1 : '0' + (now.getMonth() + 1).toString();
        let names = anggotaKeluarga.nama_penduduk.split(' ');
        let name = names.join('%20');
        let birthDate = new Date(anggotaKeluarga.tanggal_lahir);
        let dateBirth = birthDate.getDate() > 9 ? birthDate.getDate().toString() : '0' +  birthDate.getDate();
        let monthBirth = birthDate.getMonth() + 1 > 9 ? birthDate.getMonth() + 1 : '0' + (birthDate.getMonth() + 1).toString();

        let body = 'rs=ajax_form_ddk02_submit_form&rst=&rsrnd=' + new Date().getTime() 
            + '&rsargs[]=' + escape(kodeDesa)
            + '&rsargs[]=' + escape(anggotaKeluarga.no_kk)
            + '&rsargs[]=' + escape(date + '/' + month + '/' + now.getFullYear())
            + '&rsargs[]=' + escape(index)
            + '&rsargs[]=' + escape(anggotaKeluarga.nik)
            + '&rsargs[]=' + escape(name)
            + '&rsargs[]=' + escape(anggotaKeluarga.no_akta ? anggotaKeluarga.no_akta : '') 
            + '&rsargs[]=' + escape(anggotaKeluarga.jenis_kelamin) 
            + '&rsargs[]=' + escape(anggotaKeluarga.hubungan_keluarga) 
            + '&rsargs[]=' + escape(anggotaKeluarga.tempat_lahir.toUpperCase())
            + '&rsargs[]=' + escape(dateBirth + '/' + monthBirth + '/' + birthDate.getFullYear())
            + '&rsargs[]=' + escape(date + '/' + month + '/' + now.getFullYear())
            + '&rsargs[]=' + escape(anggotaKeluarga.status_kawin) 
            + '&rsargs[]=' + escape(anggotaKeluarga.agama) 
            + '&rsargs[]=' + escape(anggotaKeluarga.golongan_darah) 
            + '&rsargs[]=' + escape(anggotaKeluarga.kewarganegaraan) 
            + '&rsargs[]=' + escape("") 
            + '&rsargs[]=' + escape(anggotaKeluarga.pendidikan) 
            + '&rsargs[]=' + escape(anggotaKeluarga.pekerjaan) 
            + '&rsargs[]=' + escape("") 
            + '&rsargs[]=' + escape("9") 
            + '&rsargs[]=' + escape("") 
            + '&rsargs[]=' + escape("") 
            + '&rsargs[]=' + escape("") 
            + '&rsargs[]=' + escape("") 
            + '&rsargs[]=' + escape("") 
            + '&rsargs[]=' + escape("") 
            + '&rsargs[]=' + escape("1") 
            + '&rsargs[]=' + escape("") 
            + '&rsargs[]=' + escape("alterar") 
            + '&rsargs[]=' + escape("") 
            + '&rsargs[]=' + escape("") 
            + '&rsargs[]=' + escape("") 
            + '&rsargs[]=' + escape(scriptCaseInit)
        
        let options = {
            url: URL + '/form_ddk02/',
            headers: {
                'Accept-Encoding': 'gzip, deflate',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': 'PHPSESSID=' + cookies[0].value,
                'Method': 'POST /form_ddk02/ HTTP/1.1',
                'Host': 'prodeskel.binapemdes.kemendagri.go.id',
                'Origin': 'http://prodeskel.binapemdes.kemendagri.go.id',
                'Referer': 'http://prodeskel.binapemdes.kemendagri.go.id/form_ddk02/',
                'User-Agent': navigator.userAgent,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: body,
            resolveWithFullResponse: true
        }

        return request.post(options);
    }

    private encodeDate(date: Date): string {
        let day = date.getDate() > 9 ? date.getDate() : '0' + date.getDate().toString();
        let month = date.getMonth() + 1 > 9 ? date.getMonth() + 1 : '0' + (date.getMonth() + 1).toString();
        return day + '%2F' + month + '%2F' + date.getFullYear();
    }

    private getHttpHeaders(): any {
        return {'Content-Type': 'application/x-www-form-urlencoded'};
    }
}