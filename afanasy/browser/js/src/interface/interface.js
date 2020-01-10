/* Document Events */
var add_event = ( e, v ) => {
	Array.prototype.forEach.call(
		Object.keys( v ),
		( k ) => {
			try
			{
				var ok = false;
				try
				{
					if ( typeof( v[ k ] ) === 'object' )
					{
						add_event( e, v[ k ] );
						ok = true;
					}
				}
				catch ( e ) {}

				if ( !ok )
					v[ k ]( e );
			}
			catch ( e ) {}
		}
	);
};

window.dresize = {};
window.addEventListener( 'resize', ( e ) => { add_event( e, window.dresize ); } );

window.dmousedown = {};
window.addEventListener( 'mousedown', ( e ) => { add_event( e, window.dmousedown ); } );

window.dmousemove = {};
window.addEventListener( 'mousemove', ( e ) => { add_event( e, window.dmousemove ); } );

window.dmouseup = {};
window.addEventListener( 'mouseup', ( e ) => { add_event( e, window.dmouseup ); } );

window.dkeydown = {};
window.addEventListener( 'keydown', ( e ) => { add_event( e, window.dkeydown ); } );

window.dkeyup = {};
window.addEventListener( 'keyup', ( e ) => { add_event( e, window.dkeyup ); } );

window.dmutation = {};
window.addEventListener( 'DOMContentLoaded', ( afanasy ) => {
	var observer = new MutationObserver( function( mutations ) {
		add_event( mutations, window.dmutation );
	} );
	observer.observe( document.body, { childList: true } );
} );
/* !Document Events */

window.addEventListener( 'contextmenu', ( e ) => {
	e.preventDefault();
	return ( false );
} );

document.addEventListener( 'DOMContentLoadedAfanasy', ( afanasy ) => {
	var [ functions, templates, tools ] = [ afanasy.functions, afanasy.templates, afanasy.tools ];

	/* Menu Init */
	var menu_all = false;
	var menu_ref = 'active';
	var menu_down = ( elem, e ) => {
		var li = ( ( e.target.tagName.toUpperCase() === 'LI' ) ? e.target : $.parent( e.target, 'li' ) );
		//console.log( 'menu_down:', e.target.tagName, li !== elem, !li.classList.contains( 'menu-check' ), !!li.querySelector( ':scope > ul' ) );
		if ( li && li !== elem && !li.classList.contains( 'menu-check' ) && li.querySelector( ':scope > ul' ) )
			return ;

		var show = !elem.classList.contains( menu_ref );
		if ( show )
			tools.menu_rarrow( elem );

		Array.prototype.forEach.call(
			menu_all,
			( item ) => {
				var on = ( show && item === elem && !item.classList.contains( 'disabled' ) );
				item.classList.toggle( menu_ref, on );

				var tmenu = item.querySelector( ':scope > ul' );
				if ( tmenu )
				{
					tmenu.style.display = ( on ? 'block' : 'none' );
					if ( on )
						tmenu = menu_reference( tmenu, false, 'Top' );
				}
			}
		);

		var check = false;
		var submenu = e.target;
		if ( submenu instanceof Element )
		{
			var i = 0;
			while ( i++ < 3 )
			{
				if ( 'tagName' in submenu && typeof( submenu.tagName ) === 'string' && submenu.tagName.toUpperCase() === 'LI' )
				{
					if ( submenu.classList.contains( 'menu-check' ) || !submenu.classList.contains( 'menu' ) )
						check = true;

					break ;
				}

				submenu = submenu.parentElement;
			}
		}

		if ( check && !submenu.classList.contains( 'disabled' ) )
		{
			var type = false;
			if ( submenu.classList.contains( 'menu-check' ) )
			{
				type = 'check';
				submenu.classList.toggle( menu_ref );
			}
			else
				type = 'click';

			e.subtype = type;
			if ( typeof( li.onclick ) !== 'function' )
			{
				var link = li.getAttribute( 'onclick-function' );
				try
				{
					link = JSON.parse( link );
					if ( typeof( functions[ link[ 0 ] ] ) !== 'function' )
						throw '';
				}
				catch ( e )
				{
					link = false;
				}

				if ( typeof( functions[ link[ 0 ] ] ) === 'function' )
					functions[ link[ 0 ] ].apply( li, [ e, ...link.slice( 1 ) ] );
				else if ( typeof( li.onmousedown ) === 'function' )
					li.onmousedown.apply( li, [ e, li, elem ] );
				else if ( typeof( elem.onmenudown ) === 'function' )
					elem.onmenudown.apply( elem, [ e, li, elem ] );
			}
			else
				li.onclick.apply( li, [ e, li, elem ] );
		}
	};

	var menu_init = () => {
		menu_all = document.querySelectorAll( '.menu' );

		window.dresize[ 'menu_init' ] = ( e ) => {
			Array.prototype.forEach.call(
				document.querySelectorAll( '.toolbar-menu > li > ul' ),
				( menu ) => {
					return ; // has problems with nested menus
					var parent = menu.parentNode;
					var pos = parent.getBoundingClientRect();
					var doc = document.body.getBoundingClientRect();
					menu.style.overflowY = 'auto';
					menu.style.maxHeight = Math.floor( doc.height - ( pos.top + ( pos.height * 2 ) ) ) + 'px';
					//menu.style.overflowX = 'auto';
					//menu.style.maxWidth = Math.floor( doc.width - ( pos.left + pos.width ) ) + 'px';
				}
			);
		};
		window.dresize[ 'menu_init' ]();

		window.dmousedown[ 'menu_init' ] = ( e ) => {
			if ( !$.parent( e.target, '.menu' ) )
			{
				Array.prototype.forEach.call(
					document.body.querySelectorAll( '.menu' ),
					( elem ) => {
						elem.classList.remove( menu_ref );
						Array.prototype.forEach.call(
							elem.querySelectorAll( ':scope > ul' ),
							( selem ) => {
								selem.style.display = null;
							}
						);
					}
				);
			}
		};

		Array.prototype.forEach.call(
			menu_all,
			( elem ) => {
				var menu = elem.querySelector( ':scope > ul' );
				if ( !menu )
					return ;

				elem.onmousemove = ( e ) => {
					if ( elem.classList.contains( menu_ref ) || !elem.parentElement.classList.contains( 'toolbar-menu' ) )
						return ;

					var check = false;
					Array.prototype.forEach.call(
						menu_all,
						( item ) => {
							if ( item.classList.contains( menu_ref ) )
								check = true;
						}
					);

					if ( check )
						elem.onmousedown( e );
				};

				elem.onmousedown = ( e ) => {
					menu_down( elem, e );
				};
			}
		);
	};

	var menu_reference = ( menu, out ) => {
		var name = ( menu.getAttribute( 'context-reference' ) || 'default' ).capitalize() + 'Context';
		if ( typeof( window[ name ] ) === 'function' )
		{
			var tmp = window[ name ]( menu, afanasy.tools.selected.window(), afanasy.tools.selected.lines(), out );
			if ( typeof( tmp ) === 'object' )
				menu = tmp;
		}

		return ( menu );
	};

	window.menu_overflow = ( menu ) => {
		var parent = menu.parentNode;
		var pos = parent.getBoundingClientRect();
		var doc = document.body.getBoundingClientRect();
		if ( ( pos.top + pos.height ) > doc.height )
			parent.style.height = Math.floor( doc.height - pos.top ) + 'px';
	};

	window.menu_display = ( menu, x, y, options ) => {
		menu = menu.cloneNode( true );
		var parent = document.createElement( 'div' );
		parent.style.top = y + 'px';
		parent.style.left = x + 'px';

		options = Object.assign( { class: '' }, options );
		Array.prototype.forEach.call(
			options.class.split( ' ' ),
			( item ) => { parent.classList.add( item ); }
		);

		parent.appendChild( menu );
		window.menu_show = parent;
		document.body.appendChild( parent );

		window.menu_overflow( menu );
		return ( menu );
	};

	/* Menu Table */
	var menu_context = () => {
		var curr = false;
		var timeout = false;
		window.menu_show = false;
		window.dmousedown[ 'menu_context_close' ] = ( e ) => {
			if ( $.parent( e.target, '.menu-stay' ) )
				return ;
			else if ( timeout )
				clearTimeout( timeout );

			var pass = false;
			timeout = setTimeout( () => {
				Array.prototype.forEach.call(
					document.body.querySelectorAll( ':scope > .context-right, :scope > .context-columns' ),
					( elem ) => {
						if ( !$.parent( elem, '.context-right, .context-columns' ) && elem !== window.menu_show )
						{
							pass = true;
							elem.remove();
						}
					}
				);

				window.menu_show = false;
				if ( pass )
				{
					Array.prototype.forEach.call(
						document.querySelectorAll( '.menu.' + menu_ref + ', .menu-icon.' + menu_ref ),
						( selem ) => {
							if ( !selem.hasAttribute( 'context-right' ) )
								return ;

							var child = selem.querySelector( ':scope > ul' );
							if ( !child || !child.style.display || child.style.display === 'none' )
								selem.classList.remove( menu_ref );
						}
					);
				}
			}, 10 );
		};

		window.dmousedown[ 'menu_context_right' ] = ( e ) => {
			var out = ( e.target.hasAttribute( 'context-right' ) || e.target.parentNode.hasAttribute( 'context-right' ) );
			var elem = ( out ? ( e.target.hasAttribute( 'context-right' ) ? e.target : e.target.parentNode ) : $.parent( e.target, '[context-right]' ) );
			if ( !elem )
				return ;

			var menu_icon = elem.classList.contains( 'menu-icon' );
			if ( menu_icon && elem.classList.contains( menu_ref ) )
				return ( elem.classList.remove( menu_ref ) );
			else if ( e.button !== 2 && !menu_icon )
				return ;

			// stops the process to leave room for the one to show/hide columns
			if ( e.target.tagName.toUpperCase() === 'TH' )
				return ;

			var tr = ( ( e.target.tagName.toUpperCase() === 'TR' ) ? e.target : $.parent( e.target, 'tr', elem ) );
			if ( ( !out && !tr ) || document.body.querySelector( ':scope > .context-menu' ) === curr )
				return ;

			e.preventDefault();
			var div = document.createElement( 'div' );
			div.classList.add( 'context-right' );
			div.classList.add( 'menu' );

			var x = e.clientX;
			var y = e.clientY;
			if ( menu_icon )
			{
				var pos = elem.getBoundingClientRect();
				x = pos.x; // + pos.width;
				y = pos.y + pos.height;
			}

			div.style.top = y + 'px';
			div.style.left = x + 'px';

			setTimeout( () => {
				var menu = templates.get( elem.getAttribute( 'context-right' ) + ( out ? '-other' : '' ), false, true );
				if ( !menu )
					return ;

				menu = menu_reference( menu.cloneNode( true ), out );
				if ( menu_icon )
					elem.classList.add( menu_ref );

				window.menu_show = curr = div;
				div.appendChild( menu );
				document.body.appendChild( div );

				var pos = menu.getBoundingClientRect();
				var tmp = ( ( y + pos.height ) - window.innerHeight );
				if ( tmp > 0 )
					div.style.top = ( y - tmp - 5 ) + 'px';

				tools.menu_rarrow( div );
				window.menu_overflow( menu );
				menu.onmousedown = ( e ) => {
					menu_down( div, e );
				};

				window.menu_show = false;
			}, 50 );
		};
	};

	menu_init();
	menu_context();

	Array.prototype.forEach.call(
		document.querySelectorAll( '[context-menu]' ),
		( elem ) => {
			var id = elem.getAttribute( 'context-menu' );
			if ( !id )
				return ;

			var table = document.getElementById( id );
			if ( !table )
				return ;

			table = table.cloneNode( true );
			elem.appendChild( table );
		}
	);

	var pinned_refresh = ( menu ) => {
		var pinned = {};
		Array.prototype.forEach.call(
			document.querySelectorAll( '#grid .cell' ),
			( container ) => {
				var text = container.querySelector( ':scope > .title .text' ).innerText;
				var subtext = container.querySelector( ':scope > .title .subtext' ).innerText;
				pinned[ container.uid ] = {
					name: text + subtext,
					icon: 'flag',
					class: ( container.classList.contains( 'active' ) ? 'active' : '' ),
					attrs: {
						'data-uid': container.uid,
						'onclick-function': '["cell_active","' + container.uid + '"]'
					}
				};
			}
		);
		var html = Handlebars.compile( '{{> menu-each this}}' )( { children: pinned } );
		menu.innerHTML = html;
	};
	window.dmousedown[ 'main_toolbar' ] = ( e ) => {
		if ( !$.parent( e.target, '.main-toolbar' ) )
			return ;

		var elem = ( ( e.target.tagName.toUpperCase() === 'LI' ) ? e.target : $.parent( e.target, 'li' ) );
		var name = ( elem && elem.getAttribute( 'name' ) );
		var menu = ( name && elem.querySelector( ':scope > ul' ) );
		switch ( name )
		{
			case 'pinned-layouts': pinned_refresh( menu ); break ;
			case 'lock-panels': afanasy.functions.win_lock(); break ;
		}
	};

	window.TopHelpContext = ( menu ) => {
		menu = menu.querySelector( ':scope > [name="theme"] > ul' );

		var html = Handlebars.compile( '{{> menu-each this}}' )( { children: {
			dcgru: {
				name: 'Draco CGRU',
				class: 'active'
			},
			original: {
				name: 'Original',
				attrs: {
					onclick: 'document.location.pathname = "/afanasy/browser.bak/index.html"'
				}
			}
		} } );
		menu.innerHTML = html;
	};

	window.TopViewContext = ( menu ) => {
		var locked = document.body.classList.contains( 'locked' );
		menu.querySelector( '[name="lock-panels"]' ).style.display = ( locked ? 'none' : 'block' );
		menu.querySelector( '[name="unlock-panels"]' ).style.display = ( locked ? 'block' : 'none' );

		var main = document.body.classList.contains( 'main-toolbar' );
		menu.querySelector( '[name="main-toolbar"]' ).classList.toggle( 'active', main );

		pinned_refresh( menu.querySelector( '[name="pinned-layouts"] > ul' ) );
	};
} );
