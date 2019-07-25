var g_cycle = 0;
var g_last_msg_cycle = g_cycle;
var g_id = 0;
var g_uid = -1;
var g_uid_orig = -1;
var g_keysdown = '';
var g_closing = false;

var g_auth = {};
var g_digest = null;

var g_windows = [];
var g_receivers = [];
var g_refreshers = [];
var g_monitors = [];
var g_cur_monitor = null;
var g_main_monitor = null;
var g_main_monitor_type = 'jobs';
var g_monitor_buttons = [];

var g_TopWindow = null;

var g_HeaderOpened = false;
var g_FooterOpened = false;

var g_Images = [];
var cm_UILevels = [ 'Padawan', 'Jedi', 'Sith' ];
var cm_blockFlags = {
	numeric /*************/: 1 << 0,
	varCapacity /*********/: 1 << 1,
	multiHost /***********/: 1 << 2,
	masterOnSlave /*******/: 1 << 3,
	dependSubTask /*******/: 1 << 4,
	skipThumbnails /******/: 1 << 5,
	skipExistingFiles /***/: 1 << 6,
	checkRenderedFiles /**/: 1 << 7
};

var nw_connected = false;
var nw_error_count = 0;
var nw_error_count_max = 5;
var nw_error_total = 0;

$ = {};
$prototypes = {
	path: function( elements ) {
		if ( !( this instanceof $ ) ) return ( $._args( 'path', arguments ) );
		var path = [];
		var element = elements[ 0 ];
		while ( element && element.parentNode && element.parentNode !== document.querySelector( 'html' ) )
		{
			element = element.parentNode;
			path.push( element );
		}

		return ( path );
	},
	parent: function( elements, find, stop ) {
		if ( !( this instanceof $ ) ) return ( $._args( 'parent', arguments ) );
		if ( arguments.length <= 1 || !elements.length )
			return ( elements.length && elements[ 0 ].parentNode );

		var check = false;
		var parent = elements[ 0 ];
		var element = ( find instanceof Node || find instanceof HTMLElement );

		var ret = false;
		Array.prototype.forEach.call(
			$.path( parent ),
			( elem ) => {
				if ( !check && !ret )
				{
					if ( ( element && elem === find ) || ( !element && elem.matches( find ) ) )
						ret = elem;
					else if ( stop && elem === stop )
						check = true;
				}
			}
		);

		return ( ret );
	}
};
$ = Object.assign( function() {
	if ( this.constructor != $ )
		return new $( ...arguments );

	var elements = arguments[ 0 ];
	if ( typeof( elements ) === 'string' )
		elements = document.querySelectorAll( elements );
	else if ( !Array.isArray( elements ) && !( elements instanceof NodeList ) )
		elements = [ elements ];

	var i = 0;
	var obj = ( elements.length ? elements[ 0 ] : {} );
	Array.prototype.forEach.call(
		elements,
		( elem ) => { obj[ i++ ] = elem; }
	);
	obj.length = i;

	var self = this;
	Array.prototype.forEach.call(
		Object.keys( $prototypes ),
		( key ) => {
			obj[ key ] = function() {
				return ( $prototypes[ key ].apply( self, [ elements ].concat( Array.prototype.slice.call( arguments ) ) ) );
			};
		}
	);

	return ( obj );
}, $prototypes, { _args: function( name, args ) {
	return ( $( args[ 0 ] )[ name ]( ...Array.prototype.slice.call( args, 1 ) ) );
} } );

Object.defineProperty( String.prototype, 'capitalize', {
	value: function() {
		var value = this.valueOf();
		return ( value.charAt( 0 ).toUpperCase() + value.slice( 1 ) );
	}
} );

Object.defineProperty( String.prototype, 'replaceArr', {
	value: function( arr ) {
		var value = this.valueOf();
		for ( var i = 0; i < arr.length; ++i )
			value = value.replace( ( '%' + ( i + 1 ) ), arr[ i ] );

		return ( value );
	}
} );

Object.defineProperty( String.prototype, 'toClipboard', {
	value: function( success, error ) {
		var value = this.valueOf();

		var elem = document.createElement( 'textarea' );
		elem.setAttribute( 'style', 'position: fixed; top: -50px; left: -50px; width: 42px; height: 42px;' );
		elem.value = value;

		document.body.appendChild( elem );

		elem.select();
		document.execCommand( 'copy' );

		document.body.removeChild( elem );
	}
} );

Object.defineProperty( Number.prototype, 'toDate', {
	value: function( replace ) {
		var value = this.valueOf();
		if ( !value && typeof( replace ) !== 'undefined' )
			return ( replace );
		else if ( value < 10000000000 )
			value *= 1000;

		var d = new Date( value );
		var a = d.getFullYear() + '/' + ( '0' + ( d.getMonth() + 1 ) ).slice( -2 ) + '/' + ( '0' + d.getDate() ).slice( -2 );
		var b = ( '0' + d.getHours() ).slice( -2 ) + ':' + ( '0' + d.getMinutes() ).slice( -2 ) + ':' + ( '0' + d.getSeconds() ).slice( -2 );
		return ( a + ' ' + b );
	}
} );
