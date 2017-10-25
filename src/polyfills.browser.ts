// Polyfills

import 'core-js/es7/reflect';
import 'zone.js/dist/zone';

import * as $ from 'jquery';
window['jQuery'] = $;

require('tinymce/tinymce');

// A theme is also required
require('tinymce/themes/modern/theme');

// Any plugins you want to use has to be imported
require( 'tinymce/plugins/colorpicker/plugin.js' );
require( 'tinymce/plugins/hr/plugin.js' );
require( 'tinymce/plugins/lists/plugin.js' );
require( 'tinymce/plugins/media/plugin.js' );
require( 'tinymce/plugins/link/plugin.js' );
require( 'tinymce/plugins/paste/plugin.js' );
require( 'tinymce/plugins/tabfocus/plugin.js' );
require( 'tinymce/plugins/textcolor/plugin.js' );
require( './app/lib/tinymce-plugins/wptextpattern/plugin.js' );
require( './app/lib/tinymce-plugins/wpeditimage/plugin.js' );


declare const ENV: string;

if ('production' === ENV) {
  // Production
} else {
  // Development
  Error.stackTraceLimit = Infinity;
  /* tslint:disable no-var-requires */
  require('zone.js/dist/long-stack-trace-zone');
}
