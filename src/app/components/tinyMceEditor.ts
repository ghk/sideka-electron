import {
    Component,
    OnDestroy,
    AfterViewInit,
    EventEmitter,
    Input,
    Output
  } from '@angular/core';

declare var tinymce;
  
  @Component({
    selector: 'tinymce-editor',
    template: `<textarea id="{{elementId}}"></textarea>`
  })
  export default class TinyMceEditorComponent implements AfterViewInit, OnDestroy {
    @Input() elementId: String;
    @Output() onEditorKeyup = new EventEmitter<any>();
  
    editor;
  
    ngAfterViewInit() {
      console.log("elementId", this.elementId);

      tinymce.init( {
        selector: '#' + this.elementId,
        skin_url: 'assets/skins/lightgray',
        //content_css: CONTENT_CSS,
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
        //redux_store: this.context.store,
        //textarea: this.refs.text,
  
        // Limit the preview styles in the menu/toolbar
        preview_styles: 'font-family font-size font-weight font-style text-decoration text-transform',
        end_container_on_empty_block: true,
        //plugins: PLUGINS.join(),
        plugins: ['link', 'paste', 'colorpicker', 'hr', 'lists', 'media', 'tabfocus', 'textcolor'],
        statusbar: false,
        resize: false,
        menubar: false,
        indent: false,
  
        // AfterTheDeadline Configuration
        atd_rpc_id: 'https://wordpress.com',
        atd_ignore_enable: true,
  
        // Try to find a suitable minimum size based on the viewport height
        // minus the surrounding editor chrome to avoid scrollbars. In the
        // future, we should calculate from the rendered editor bounds.
        autoresize_min_height: Math.max( document.documentElement.clientHeight - 300, 300 ),
        //autoresize_bottom_margin: viewport.isMobile() ? 10 : 50,
        autoresize_bottom_margin: 50,
  
        toolbar1: `wpcom_insert_menu,formatselect,bold,italic,bullist,numlist,link,blockquote,alignleft,aligncenter,alignright,spellchecker,wp_more`,
        toolbar2: 'strikethrough,underline,hr,alignjustify,forecolor,pastetext,removeformat,wp_charmap,outdent,indent,undo,redo,wp_help',
        toolbar3: '',
        toolbar4: '',
  
        tabfocus_elements: 'content-html,save-post',
        //tabindex: this.props.tabIndex,
        body_class: 'content post-type-post post-status-draft post-format-standard locale-en-us',
        add_unload_trigger: false,
  
        setup: editor => {
          this.editor = editor;
          editor.on('keyup', () => {
            const content = editor.getContent();
            this.onEditorKeyup.emit(content);
          });
        },
  
      } );
    }
  
    ngOnDestroy() {
      tinymce.remove(this.editor);
    }
  }
  