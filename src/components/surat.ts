import { Component, Input } from "@angular/core";

var hot: any;

@Component({
    selector: 'surat',
    inputs : ['hot', 'printSurat'], 
    templateUrl: 'templates/surat.html'
})
export default class SuratComponent{
    hot: any;
    letters: any[];

    constructor(){   
        this.hot = hot;
        this.loadLetters();
    }
    
    loadLetters(): void {
        this.letters = [];

        this.letters.push({"name": 'kartu keluarga', "thumbnail": 'surat_thumbnails/kk.png', 
        "path": 'surat_templates/kk.docx' });

        this.letters.push({"name": 'keterangan domisili', "thumbnail": 'surat_thumbnails/kk.png', 
        "path": 'surat_templates/keterangan-domisili.docx' });

        this.letters.push({"name": 'keterangan kelahiran', "thumbnail": 'surat_thumbnails/kk.png', 
        "path": 'surat_templates/keterangan-kelahiran.docx' });

        this.letters.push({"name": 'keterangan umum', "thumbnail": 'surat_thumbnails/kk.png', 
        "path": 'surat_templates/keterangan-umum.docx' });

        this.letters.push({"name": 'pindah datang wni', "thumbnail": 'surat_thumbnails/kk.png', 
        "path": 'surat_templates/pindah-datang-wni.docx' });

        this.letters.push({"name": 'pelaporan kematian', "thumbnail": 'surat_thumbnails/kk.png', 
        "path": 'surat_templates/pelaporan-kematian.docx' });

        this.letters.push({"name": 'pindah kelamin', "thumbnail": 'surat_thumbnails/kk.png', 
        "path": 'surat_templates/pelaporan-kematian.docx' });

        this.letters.push({"name": 'pindah agama', "thumbnail": 'surat_thumbnails/kk.png', 
        "path": 'surat_templates/pelaporan-kematian.docx' });

        this.letters.push({"name": 'pindah keluarga', "thumbnail": 'surat_thumbnails/kk.png', 
        "path": 'surat_templates/pelaporan-kematian.docx' });

        this.letters.push({"name": 'pindah pasangan', "thumbnail": 'surat_thumbnails/kk.png', 
        "path": 'surat_templates/pelaporan-kematian.docx' });
    }

    search(keyword: string): void {

    }
}
