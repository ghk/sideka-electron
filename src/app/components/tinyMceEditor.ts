import {
    Component,
    OnDestroy,
    AfterViewInit,
    EventEmitter,
    Input,
    Output,
    NgZone,
    forwardRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const noop = () => {
};

declare var tinymce;
  
@Component({
  selector: 'tinymce-editor',
  template: `<textarea id="{{elementId}}"></textarea>`,
  providers: [
    {
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => TinyMceEditorComponent),
        multi: true
    }
]
})
export default class TinyMceEditorComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {

    public elementId: string = 'tiny-'+Math.random().toString(36).substring(2);

    private onTouchedCallback: () => void = noop;
    private onChangeCallback: (_: any) => void = noop;
    private innerValue: string;

    private editor;

    constructor(private zone: NgZone) {
    }

    ngAfterViewInit() {
        console.log("elementId", this.elementId);

        tinymce.init( {
            selector: '#' + this.elementId,
            skin_url: 'assets/skins/lightgray',
            content_css: 'assets/skins/wordpress/wp-content.css',
            //language: user.get() ? user.get().localeSlug : 'en',
            //language: 'id',
            //language_url: DUMMY_LANG_URL,
            directionality: 'ltr',
            formats: {
                alignleft: [
                    {
                        selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li',
                        styles: { textAlign: 'left' }
                    },
                    {
                        selector: 'img,table,dl.wp-caption',
                        classes: 'alignleft'
                    }
                ],
                aligncenter: [
                    {
                        selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li',
                        styles: { textAlign: 'center' }
                    },
                    {
                        selector: 'img,table,dl.wp-caption',
                        classes: 'aligncenter'
                    }
                ],
                alignright: [
                    {
                        selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li',
                        styles: { textAlign: 'right' }
                    },
                    {
                        selector: 'img,table,dl.wp-caption',
                        classes: 'alignright'
                    }
                ],
                strikethrough: { inline: 'del' }
            },
            relative_urls: false,
            remove_script_host: false,
            convert_urls: false,
            branding: false,
            browser_spellcheck: true,
            fix_list_elements: true,
            entities: '38,amp,60,lt,62,gt',
            entity_encoding: 'raw',
            keep_styles: false,
            wpeditimage_html5_captions: true,
            height: "100%",
            //redux_store: this.context.store,
            //textarea: this.refs.text,

            // Limit the preview styles in the menu/toolbar
            preview_styles: 'font-family font-size font-weight font-style text-decoration text-transform',
            end_container_on_empty_block: true,
            //plugins: PLUGINS.join(),
            plugins: "charmap,colorpicker,hr,lists,media,paste,tabfocus,textcolor,fullscreen,wordpress,wpautoresize,wpeditimage,wpemoji,wpgallery,wplink,wpdialogs,wptextpattern,wpview",
            statusbar: false,
            resize: false,
            menubar: false,
            indent: false,

            // Try to find a suitable minimum size based on the viewport height
            // minus the surrounding editor chrome to avoid scrollbars. In the
            // future, we should calculate from the rendered editor bounds.
            autoresize_min_height: Math.max( document.documentElement.clientHeight - 300, 300 ),
            //autoresize_bottom_margin: viewport.isMobile() ? 10 : 50,
            autoresize_bottom_margin: 50,

            toolbar1: "formatselect,bold,italic,bullist,numlist,blockquote,alignleft,aligncenter,alignright,link,unlink,wp_more,spellchecker,dfw,wp_adv",
            toolbar2: "strikethrough,hr,forecolor,pastetext,removeformat,charmap,outdent,indent,undo,redo,wp_help",
            toolbar3: "",
            toolbar4: "",

            tabfocus_elements: 'content-html,save-post',
            //tabindex: this.props.tabIndex,
            body_class: "content post-type-post post-status-draft post-format-standard page-template-default locale-id-id",
            add_unload_trigger: false,

            setup: editor => {
                this.editor = editor;
                editor.on('change keyup', () => {
                    this.value = editor.getContent();
                });
            },

        } );
    }

    get value(): any {
        return this.innerValue;
    };

    // set accessor including call the onchange callback
    set value(v: any) {
        if (v !== this.innerValue) {
            this.innerValue = v;
            this.zone.run(() => {
                this.onChangeCallback(v);
            });
        }
    }

    ngOnDestroy() {
        tinymce.remove(this.editor);
    }
    writeValue(value: any): void {
        if (value !== this.innerValue) {
            this.innerValue = value;
            if(!value) {
                value = '';
            }
            this.editor && this.editor.initialized && this.editor.setContent(value);
        }
    }

    setDisabledState?(isDisabled: boolean): void {
    }

    registerOnChange(fn: any) {
        this.onChangeCallback = fn;
    }

    registerOnTouched(fn: any) {
        this.onTouchedCallback = fn;
    }
}
