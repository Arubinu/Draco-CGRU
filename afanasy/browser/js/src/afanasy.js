document.addEventListener( 'DOMContentLoaded', ( event ) => {
	var afanasy = new Event( 'DOMContentLoadedAfanasy' );

	afanasy.global = {
		source: ( ( document.location.pathname == '/' ) ? './afanasy/browser/' : document.location.pathname.split( '/' ).slice( 0, -1 ).join( '/' ) + '/' ),
		logs: {},
		logs_ids: {},
		nodes_data: {},
		ping_refresh: {},
		grid_size: { x: 1, y: 2 },
		grid_template: { x: [], y: [] },
		grid_filling: [
			{ type: 'jobs', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
			{ type: 'renders', position: { x: 1, y: 2 }, size: { width: 1, height: 1 } },
		],
		cell_active: false,
		cell_increment: 0,
		cell_width: 600,
		cell_height: 180,
	};
	afanasy.config = {
		get: ( name, override ) => {
			override = ( override || name );
			if ( [ 'string', 'number' ].indexOf( typeof( name ) ) < 0 )
				return ( null );

			var obj = afanasy.config;
			Array.prototype.forEach.call(
				name.split( '.' ),
				( part ) => {
					if ( typeof( obj ) === 'object' )
						obj = obj[ part ];
				}
			);

			return ( ( typeof( obj ) !== 'undefined' ) ? obj : override );
		}
	};
	afanasy.langs = {
		get: ( name, override ) => {
			override = ( override || name );
			if ( [ 'string', 'number' ].indexOf( typeof( name ) ) < 0 )
				return ( override );

			var text = afanasy.langs[ afanasy.langs.selected ];
			name = ( name.indexOf( '=trans:' ) ? name : name.substr( 7 ) );
			text = text[ name ];

			return ( ( typeof( text ) !== 'undefined' ) ? text : override );
		},
		selected: ( localStorage.lang || navigator.language || navigator.userLanguage )
	};
	afanasy.templates = {
		all: {},
		get: ( name, obj, element ) => {
			var template = afanasy.templates.all[ name ];
			template = ( ( typeof( template ) !== 'function' ) ? '' : template( obj || afanasy.config.get( name, {} ) ) );

			if ( element )
			{
				var get = document.createElement( 'get' );
				get.innerHTML = template;
				if ( get.children.length )
				{
					afanasy.tools.handlebars( get );
					template = get.children[ 0 ];
					get.removeChild( get.children[ 0 ] );
				}
				else
					template = false;
			}

			return ( template );
		}
	};
	afanasy.tools = {
		isset: function() {
			var isset = true;
			Array.prototype.forEach.call(
				arguments,
				( item ) => { isset = ( isset && typeof( item ) !== 'undefined' ); }
			);
		},
		handlebars: ( elem ) => {
			Array.prototype.forEach.call(
				elem.querySelectorAll( '[handlebars][handlebars-autoload]' ),
				( elem ) => {
					var data = elem.getAttribute( 'handlebars-data' );
					try
					{
						data = JSON.parse( data );
						if ( !data )
							throw '';
					}
					catch ( e )
					{
						data = {};
					}

					var name = elem.getAttribute( 'handlebars' );
					data = Object.assign( data, afanasy.config.get( name, {} ) );

					if ( elem.parentNode && elem.hasAttribute( 'handlebars-replace' ) )
					{
						var replace = afanasy.templates.get( name, data, true );
						replace.setAttribute( 'class', ( replace.getAttribute( 'class' ) || '' ) + ( elem.getAttribute( 'class' ) || '' ) );
						replace.setAttribute( 'style', ( replace.getAttribute( 'style' ) || '' ) + ( elem.getAttribute( 'style' ) || '' ) );

						elem.replaceWith( replace );
						elem = replace;
					}
					else
						elem.innerHTML = afanasy.templates.get( name, data );

					if ( elem.querySelectorAll( '[handlebars][handlebars-autoload]' ).length )
						afanasy.tools.handlebars( elem );
				}
			);
		},
		ajax: ( url, options, onload, onerror ) => {
			onerror = ( ( typeof( onerror ) === 'function' ) ? onerror : ( err ) => { console.error( err ); } );
			options = Object.assign( { method: 'GET', body: null, input: false }, options );
			var xhr = new XMLHttpRequest();

			xhr.onerror = onerror;
			xhr.ontimeout = () => {};
			xhr.onreadystatechange = function( event ) {
				if ( this.readyState != 4 )
					return ;

				var error = false;
				var response = this.responseText;
				if ( this.status == 200 )
				{
					if ( options.input === 'json' )
					{
						try
						{
							response = JSON.parse( response );
						}
						catch ( e )
						{
							error = e.message;
						}
					}
					else if ( options.input === 'html' )
					{
						var html = document.createElement( 'ajax' );
						//html.innerHTML = Handlebars.compile( response )();

						var re = /\{\{[\s]?config\s'(.*?)'[\s]?\}\}/g;
						response = response.replace( re, ( match, contents, offset, input_string ) => {
							return ( afanasy.config.get( contents ) );
						} );
						html.innerHTML = response;

						if ( html.childNodes.length == 1 && html.childNodes[ 0 ] instanceof Text )
							error = 'SyntaxError: missing html';
						else
							response = html;
					}
				}
				else
					error = this.statusText;

				if ( error && onerror )
					onerror.apply( this, [ event, this.status, this.statusText ] );
				else if ( error )
					console.error( this.status, this.statusText );
				else
					onload.apply( this, [ event, response ] );
			};

			xhr.timeout = 2000;
			xhr.open( options.method, url, true );
			xhr.send( options.body );
			return ( xhr );
		},
		import: ( file, attrs, inner ) => {
			var script = document.createElement( 'script' );
			script.setAttribute( 'type', 'text/javascript' );

			if ( typeof( attrs ) === 'object' )
			{
				Array.prototype.forEach.call(
					Object.keys( attrs ),
					( attr ) => { script.setAttribute( attr, attrs[ attr ] ); }
				);
			}

			script.loaded = false;
			if ( inner )
			{
				afanasy.tools.ajax( file, false, ( event, body ) => {
					script.innerHTML = body;
					script.loaded = true;
				}, ( event ) => {
					script.error = true;
					console.error( 'import:', file, event.statusText );
				} );
			}
			else
			{
				script.onload = function() { this.loaded = true; };
				script.onerror = function() { this.error = true; };
				script.setAttribute( 'src', file );
			}

			document.head.appendChild( script );
		},
		merge: ( obj1, obj2 ) => {
			var t1 = Array.isArray( obj1 );
			var t2 = Array.isArray( obj2 );
			if ( t1 !== t2 )
				return ( obj2 );

			Array.prototype.forEach.call(
				( t1 ? obj2 : Object.keys( obj2 ) ),
				( key ) => {
					var value = obj2[ key ];
					if ( key in obj1 )
					{
						var type = typeof( value );
						if ( type === 'object' )
							obj1[ key ] = afanasy.tools.merge( obj1[ key ], value );
						else if ( type === 'number' || type === 'string' )
							obj1[ key ] += value;
					}
					else
						obj1[ key ] = value;
				}
			);

			return ( obj1 );
		},
		time: {
			get: ( sec, hsep, msep ) => {
				sec = ( ( !sec || sec < 0 ) ? 0 : sec );
				sec /= ( ( sec >= 10000000000 ) ? 1000 : 1 );

				var h = Math.floor( sec / 3600 );
				var i = Math.floor( sec / 60 % 60 );
				var s = Math.floor( sec % 60 );
				return ( ( '0' + h ).slice( -2 ) + ( hsep || ':' ) + ( '0' + i ).slice( -2 ) + ( msep || ':' ) + ( '0' + s ).slice( -2 ) );
			},
			unit: ( sec ) => {
				sec = ( ( !sec || sec < 0 ) ? 0 : sec );
				sec /= ( ( sec >= 10000000000 ) ? 1000 : 1 );

				var h = Math.floor( sec / 3600 );
				var i = Math.floor( sec / 60 % 60 );
				var s = Math.floor( sec % 60 );

				var time = '';
				if ( h )
					time += h + ( i ? ( '.' + ( '0' + i ).slice( -2 ) ) : '' ) + 'h';
				else if ( i )
					time += i + ( s ? ( '.' + ( '0' + s ).slice( -2 ) ) : '' ) + 'm';
				else
					time += s + 's';

				return ( time );
			},
			diff: {
				get: ( sec, sec2, hsep, msep ) => {
					sec = afanasy.tools.time.diff.logic( sec, sec2 );
					return ( afanasy.tools.time.get( sec, hsep, msep ) );
				},
				unit: ( sec, sec2 ) => {
					return ( afanasy.tools.time.unit( afanasy.tools.time.diff.logic( sec, sec2 ) ) );
				},
				logic: ( sec, sec2 ) => {
					if ( sec2 === true )
						sec2 = ( Date.now() / 1000 );
					else if ( typeof( sec2 ) !== 'number' )
						sec2 = false;

					sec = ( sec || ( sec2 || 0 ) );
					if ( sec2 )
					{
						sec /= ( ( sec >= 10000000000 ) ? 1000 : 1 );
						sec2 /= ( ( sec2 >= 10000000000 ) ? 1000 : 1 );
						sec = ( sec2 - sec );
					}

					return ( sec );
				}
			}
		},
		ping_refresh: ( win ) => {
			var cell = win;
			if ( win && !win.classList.contains( 'cell' ) )
				cell = $.parent( win, '.cell' );

			if ( cell instanceof HTMLElement || cell instanceof Node )
			{
				var uid = cell.uid;
				if ( afanasy.global.ping_refresh[ uid ] )
					clearTimeout( afanasy.global.ping_refresh[ uid ] );

				cell.querySelector( '.title .refresh' ).style.opacity = 1;
				afanasy.global.ping_refresh[ uid ] = setTimeout( () => {
					afanasy.global.ping_refresh[ uid ] = false;
					cell.querySelector( '.title .refresh' ).style.opacity = 0;
				}, 100 );
			}
		},
		infos_pile: ( data, more, infos ) => {
			infos.total = ( infos.total || 0 );
			var primary = ( typeof( data.host_name ) !== 'undefined' && !data.host_name );
			if ( !primary )
			{
				++infos.total;
				var state = ( ( data.blocks && data.blocks[ 0 ].state ) || data.state || '' ).trim().split( ' ' ).slice( -1 )[ 0 ];
				if ( state )
				{
					if ( typeof( infos[ state ] ) !== 'number' )
						infos[ state ] = 0;
					++infos[ state ];
				}
			}
		},
		infos_print: function( win, infos, force ) {
			var text = '';
			if ( arguments.length > 1 )
			{
				var states = afanasy.config.get( 'states' );
				infos.total = ( infos.total || 0 );
				text += infos.total + ' total';
				Array.prototype.forEach.call(
					Object.keys( infos ),
					( key ) => {
						var value = infos[ key ];
						if ( [ 'length', 'total', 'null' ].indexOf( key ) >= 0 || !value || typeof( value ) !== 'number' )
							return ;

						if ( key in states || force )
							text += ', ' + value + ' ' + afanasy.langs.get( states[ key ] || key ).toLowerCase();
					}
				);
				win.setAttribute( 'cell-infos', text );
			}
			else
				text += ( win.getAttribute( 'cell-infos' ) || '' );

			var selected = win.querySelectorAll( '.selected' ).length;
			if ( selected )
				text += ', ' + selected + ' ' + afanasy.langs.get( 'selected' ).toLowerCase();

			win.parentNode.querySelector( '.subtitle .infos' ).textContent = text;
		},
		table: function( windows ) {
			var functions = Array.prototype.slice.call( arguments, 1 );
			if ( !functions )
				return ;

			Array.prototype.forEach.call(
				windows,
				( win ) => {
					var tables = [];
					Array.prototype.forEach.call(
						win.querySelectorAll( '.frame > table, .frame.frame-tabs > [tab-id] > table' ),
						( table ) => {
							var thead = table.querySelector( ':scope > thead' );
							var tbody = table.querySelector( ':scope > tbody' );
							var template = ( tbody && tbody.querySelector( ':scope > tr[row-template]' ) );
							if ( template )
							{
								template = template.cloneNode( true );
								template.removeAttribute( 'row-template' );
							}

							tables.push( {
								elem: table,
								thead: thead,
								tbody: tbody,
								template: template
							} );
						}
					);

					Array.prototype.forEach.call(
						functions,
						( callback ) => { try { callback( win, tables ); } catch( e ) {} }
					);
				}
			);
		},
		menu_rarrow: ( elem ) => {
			Array.prototype.forEach.call(
				elem.querySelectorAll( 'ul' ),
				( ul ) => {
					var parent = ul.parentNode;
					if ( parent.tagName.toUpperCase() !== 'LI' || parent.querySelector( ':scope > .rarrow' ) || !parent.querySelector( ':scope > .icon' ) )
						return ;

					var rarrow = document.createElement( 'div' );
					rarrow.classList.add( 'rarrow' );
					parent.prepend( rarrow );
				}
			);
		},
		columns: ( win, tables ) => {
			Array.prototype.forEach.call(
				tables,
				( table ) => {
					var hides = ( table.elem.getAttribute( 'col-hides' ) || '' ).split( '|' );
					Array.prototype.forEach.call(
						table.thead.querySelectorAll( '[col-name]' ),
						( elem ) => {
							var name = elem.getAttribute( 'col-name' );
							var hide = ( hides.indexOf( name ) >= 0 );

							elem.style.display = ( hide ? 'none' : null );
							Array.prototype.forEach.call(
								table.tbody.querySelectorAll( '.col-' + name ),
								( elem ) => { elem.style.display = ( hide ? 'none' : null ); }
							);
						}
					);
				}
			);

			// Refresh the search
			var search = $.parent( win, '.cell' ).querySelector( '.search input' );
			if ( search )
				search.dispatchEvent( new KeyboardEvent( 'keyup', { bubbles: true } ) );

			// Reset the filter
			var reset_filter = () => {
				Array.prototype.forEach.call(
					tables,
					( table ) => {
						Array.prototype.forEach.call(
							table.elem.querySelectorAll( ':scope > tbody > tr:not([row-template]).filter-hide' ),
							( row ) => { row.classList.remove( 'filter-hide' ); }
						);
					}
				);
			};

			// Refresh the filter
			var type = win.getAttribute( 'cell-type' );
			var filter = decodeURIComponent( win.getAttribute( 'selected-filter' ) );
			if ( type && filter )
			{
				var filters = afanasy.functions.get_filters( type );
				if ( typeof( filters[ filter ] ) === 'object' && Array.isArray( filters[ filter ] ) )
				{
					var cols = filters[ filter ];
					Array.prototype.forEach.call(
						tables,
						( table ) => {
							Array.prototype.forEach.call(
								table.elem.querySelectorAll( ':scope > tbody > tr:not([row-template])' ),
								( row ) => {
									var hide = false;
									for ( var i = 0; !hide && i < cols.length; ++i )
									{
										var value = cols[ i ].value;
										var content = row.querySelector( ':scope > .col-' + cols[ i ].column );
										if ( content )
										{
											content = content.textContent.trim();
											if ( content == '-' )
												content = '';
										}
										else
											continue ;

										switch ( cols[ i ].param )
										{
											case 'contains':
												hide = ( ( content.indexOf( value ) >= 0 ) ? next : true );
												break ;
											case 'not-contains':
												hide = ( ( content.indexOf( value ) < 0 ) ? next : true );
												break ;
											case 'starts-with':
												hide = ( !content.indexOf( value ) ? next : true );
												break ;
											case 'ended-by':
												hide = ( !content.substr( -value.length ).indexOf( value ) ? next : true );
												break ;
											case 'equals':
												hide = ( ( content == value ) ? next : true );
												break ;
											case 'not-equals':
												hide = ( ( content != value ) ? next : true );
												break ;
											case 'after':
											case 'greater-than':
												hide = ( ( content > value ) ? next : true );
												break ;
											case 'before':
											case 'less-than':
												hide = ( ( content < value ) ? next : true );
												break ;
										}
									}

									row.classList.toggle( 'filter-hide', hide );
								}
							);
						}
					);
				}
				else
					reset_filter();
			}
			else
				reset_filter();
		},
		selected: {
			window: ( uid ) =>  {
				if ( uid )
				{
					var win = document.querySelector( '.cell[data-uid="' + uid + '"] > .win' );
					if ( win )
					{
						win.dispatchEvent( new MouseEvent( 'mousedown', { bubbles: true } ) );
						win.dispatchEvent( new MouseEvent( 'mouseup', { bubbles: true } ) );
						return ( win );
					}
				}

				uid = afanasy.global.cell_active;
				return ( uid && document.querySelector( '.cell[data-uid="' + uid + '"] .win' ) );
			},
			lines: ( separator ) =>  {
				separator = ( ( separator && typeof( separator ) === 'string' ) ? separator : false );

				var ids = [ [] ];
				var win = afanasy.tools.selected.window();
				if ( win )
				{
					Array.prototype.forEach.call(
						win.querySelectorAll( '[node-id].selected' ),
						( elem ) => {
							id = elem.getAttribute( 'node-id' );
							if ( separator )
							{
								id = id.split( separator );
								Array.prototype.forEach.call(
									id,
									( item, index ) => {
										if ( !ids[ index ] )
											ids[ index ] = [];

										ids[ index ].push( Number.parseInt( item ) );
									}
								);
							}
							else
								ids[ 0 ].push( Number.parseInt( id ) );
						}
					);
				}

				return ( separator ? ids : ids[ 0 ] );
			},
		},
		progress2bar: ( progress, order ) => {
			var bar = '', pos = 0, tmp;
			order = ( order || progress.order );
			order = ( ( typeof( order ) === 'function' ) ? order : ( index, progress ) => {
				var ret = false;
				switch ( index )
				{
					case 1: ret = progress.done; break ;
					case 2: ret = progress.error; break ;
					case 3: ret = ( progress.waitdep + progress.waitreconnect ); break ;
					case 4: ret = progress.null; break ;
					case 5: ret = progress.warning; break ;
				}

				return ( ret );
			} );

			if ( progress.total )
			{
				for ( var i = 1; i <= 100; ++i )
				{
					if ( ( tmp = order( i, progress ) ) !== false )
					{
						pos += tmp;
						bar += '--segment' + i + ': calc( ' + pos + ' / ' + progress.total + ' * 100 );';
					}
				}
			}

			return ( bar );
		}
	};
	afanasy.functions = {
		app_refresh: () => { document.location.reload( true ); },
		app_about: () => {
			var win = afanasy.templates.get( 'cell-about' );
			afanasy.system.windows.confirm( { html: win }, afanasy.langs.get( 'toolbar.help.about' ), false, true );
		},
		login_user: ( event, cell, obj ) => {
			if ( cell )
			{
				var elem_username = cell.querySelector( '[name=login-username]' );
				var elem_hostname = cell.querySelector( '[name=login-hostname]' );
				var elem_uilevel = cell.querySelector( '[name=login-uilevel]' );

				var username = elem_username.value.trim();
				var hostname = elem_hostname.value.trim();
				var uilevel = elem_uilevel.options[ elem_uilevel.selectedIndex ].textContent.trim();

				if ( event === true || !username || !hostname || !uilevel )
				{
					var message = afanasy.langs.get( 'empty-fields' );
					var error = cell.querySelector( '.win > .error' );
					error.classList.remove( 'notice' );
					error.classList.remove( 'hide' );
					error.textContent = message;

					var onchange = ( event, force ) => {
						error.classList.add( 'hide' );

						var message = '';
						var uilevel = elem_uilevel.options[ elem_uilevel.selectedIndex ].textContent.trim();
						switch ( cm_UILevels.indexOf( uilevel ) )
						{
							case 0: message = 'Patience you must have, my young padawan.'; break ; // Padawan
							case 1: message = 'May the Force be with you.'; break ; // Jedi
							case 2: message = 'Powerful you have become, the dark side I sense in you.'; break ; // Sith
						}

						if ( message )
						{
							error.textContent = message;
							error.classList.add( 'notice' );
							error.classList.remove( 'hide' );
						}
					};
					elem_username.onkeydown = onchange;
					elem_hostname.onkeydown = onchange;
					elem_uilevel.onchange = onchange;

					if ( event === true )
						onchange( false, true );
					return ( message );
				}

				localStorage.user_name = username;
				localStorage.host_name = hostname;
				afanasy.system.ui_level.apply( uilevel );
				//afanasy.system.digest.construct( username, '' );
				document.location.reload( true );
			}

			var cell = afanasy.system.windows.confirm( {
				html: afanasy.templates.get( 'cell-login', {
						username: ( localStorage.user_name || '' ),
						hostname: ( localStorage.host_name || '' ),
						uilevel: ( localStorage.ui_level || '' ),
						uilevels: cm_UILevels
					}, true ).outerHTML,
				button: 'confirm',
				callback: 'login_user'
			}, afanasy.langs.get( 'toolbar.file.login-user' ) );
			afanasy.functions.login_user( true, cell );
		},
		logout_user: ( event ) => {
			afanasy.system.register.logout();
		},
		language_load: ( event, lang ) => {
			localStorage.lang = lang;
			document.location.reload( true );
		},
		get_filters: ( name ) => {
			name = 'filters_' + name;

			var filters = false;
			if ( localStorage[ name ] )
			{
				try
				{
					filters = JSON.parse( localStorage[ name ] );
				}
				catch ( e ) {}
			}
			if ( typeof( filters ) !== 'object' )
				filters = {};

			return ( filters );
		},
		set_filters: ( name, value ) => {
			name = 'filters_' + name;

			try
			{
				localStorage[ name ] = JSON.stringify( value );
			}
			catch ( e ) {}
		},
		win_main_toolbar: ( event ) => {
			document.body.classList.toggle( 'main-toolbar' );
		},
		win_lock: ( event ) => {
			document.body.classList.toggle( 'locked' );
			var locked = document.body.classList.contains( 'locked' );

			var eicon = document.querySelector( '[name="lock-panels"] > img' );
			eicon.setAttribute( 'src', ( eicon.getAttribute( 'src' ).split( '/' ).slice( 0, -1 ).join( '/' ) ) + '/' + ( locked ? '' : 'un' ) + 'lock.png' );

			afanasy.system.lock_refresh();
			return ( locked );
		},
		win_add: ( event, type, refresh, width, height, options, obj ) => {
			var win = afanasy.templates.get( 'cell-' + type, ( obj || false ), true );
			var cell = window.cell_create( win, false, options );

			win.setAttribute( 'cell-type', type );
			if ( !localStorage[ type + '_size' ] )
			{
				cell.style.width = ( width || ( afanasy.global.cell_width + 'px' ) );
				cell.style.height = ( height || ( afanasy.global.cell_height + 'px' ) );
			}

			if ( refresh )
				window.cell_refresh( type );

			return ( cell );
		},
		cell_active: ( event, action, value ) => {
			afanasy.tools.selected.window( action );
		},
		win_copy: ( event, action, value ) => {
			var win = afanasy.tools.selected.window();
			if ( win )
			{
				var tmp_tr = [];
				var tmp_sizes = [];
				var tmp_align = [];
				Array.prototype.forEach.call(
					win.querySelectorAll( '[node-id].selected' ),
					( tr, index ) => {
						if ( !tr.offsetWidth && !tr.offsetHeight )
							return ;

						var sindex = -1;
						var tmp_td = [];
						Array.prototype.forEach.call(
							tr.children,
							( td ) => {
								if ( !td.offsetWidth && !td.offsetHeight )
									return ;

								var text = '';
								if ( td.classList.contains( 'col-icon' ) )
								{
									var icon = td.querySelector( 'img' );
									if ( icon )
										text = icon.getAttribute( 'src' ).split( '/' ).slice( -1 )[ 0 ].split( '.' )[ 0 ];
									text = ( ( text === 'void' ) ? '' : text );
								}
								else
								{
									if ( td.classList.contains( 'col-progress' ) )
										td = td.querySelector( '.col-progress-text' );
									text = td.textContent.trim().replace( /\n/g, ' ' ).replace( /\r/g, '' );
								}

								++sindex;
								tmp_sizes[ sindex ] = ( ( !tmp_sizes[ sindex ] || text.length > tmp_sizes[ sindex ] ) ? text.length : tmp_sizes[ sindex ] );
								tmp_td[ sindex ] = text;
								//tmp_td += ( tmp_td ? ' ‖ ' : '' ) + td.textContent.replace( /\n/g, ' ' );

								if ( !index )
								{
									var styles = window.getComputedStyle( td );
									tmp_align[ sindex ] = [ 'left', 'center', 'right' ].indexOf( styles.getPropertyValue( 'text-align' ) );
								}
							}
						);

						if ( tmp_td.length )
							tmp_tr.push( tmp_td );
					}
				);

				var clipboard = '';
				Array.prototype.forEach.call(
					tmp_tr,
					( tr, index ) => {
						var line = '';
						Array.prototype.forEach.call(
							tr,
							( td, sindex ) => {
								var text;
								var size = tmp_sizes[ sindex ];
								var align = tmp_align[ sindex ];

								if ( align == 1 )
								{
									var len = td.length;
									size -= len;

									var lsize = Math.floor( size / 2 );
									var rsize = size - lsize;
									text = ( ' '.repeat( lsize ) + td + ' '.repeat( rsize ) );
								}
								else
								{
									var spaces = ' '.repeat( size - td.length );
									if ( align == 2 )
										text = ( spaces + td );
									else
										text = ( td + spaces );
								}

								line += ( line ? ' ‖ ' : '' ) + text;
							}
						);
						clipboard += '\n‖ ' + line + ' ‖';
					}
				);

				clipboard.trim().toClipboard();
			}
		},
		win_select_all: ( event, action, value ) => {
			var win = afanasy.tools.selected.window();
			if ( win )
			{
				Array.prototype.forEach.call(
					win.querySelectorAll( '[node-id]:not(.search-hide):not(.filter-hide)' ),
					( elem ) => { elem.classList.add( 'selected' ); }
				);
			}
		},
		win_select_next: ( event, prev ) => {
			var win = afanasy.tools.selected.window();
			if ( win )
			{
				var selected = afanasy.tools.selected.lines();
				if ( selected.length )
				{
					selected = win.querySelector( '[node-id="' + selected[ 0 ] + '"]' );
					do
					{
						selected = selected && selected[ prev ? 'previousElementSibling' : 'nextElementSibling' ];
						if ( !selected || !selected.classList.contains( 'hide' ) )
							break ;
					}
					while ( selected && selected.getAttribute( 'node-id' ) );
				}
				else
					selected = win.querySelector( '[node-id]:not(.search-hide):not(.filter-hide)' );

				if ( selected && selected.getAttribute( 'node-id' ) && !selected.classList.contains( 'hide' ) )
				{
					Array.prototype.forEach.call(
						win.querySelectorAll( '[node-id]' ),
						( elem ) => { elem.classList.remove( 'selected' ); }
					);

					selected.classList.add( 'selected' );
				}
			}
		},
		win_confirm: function() { afanasy.system.windows.confirm( ...Array.prototype.slice.call( arguments, 1 ) ); },
		win_right: ( event, action, value ) => {
			var [ ids, block_ids ] = afanasy.tools.selected.lines( ':' );
			ids = ( ids && ids.filter( ( item, pos, arr ) => ( arr.indexOf( item ) == pos ) ) );
			block_ids = ( block_ids && block_ids.filter( ( item, pos, arr ) => ( arr.indexOf( item ) == pos ) ) );

			var win = afanasy.tools.selected.window();
			if ( win && ids.length )
			{
				var type = win.getAttribute( 'cell-type' );
				afanasy.functions.win_actions[ type ]( event, type, action, value, ids, block_ids );
			}
		},
		win_filters: ( event, action, value ) => {
			var win = afanasy.tools.selected.window();
			if ( !win )
				return ;

			var type = win.getAttribute( 'cell-type' );
			var filters = win.getAttribute( 'cell-filters' );
			if ( !type || !filters )
				return ;
			else
				filters = JSON.parse( filters );

			var all = false;
			var user = false;
			var data = ( user ? user : ( all ? all : {} ) );
			var obj = { type: type, columns: filters, data: data };

			var cell = afanasy.functions.win_add( event, 'filters', false, '605px', '240px', {
				autosize:	false,
				noattach:	false,
				noresize:	false,
				subtitle:	afanasy.langs.get( type )
			}, obj );

			var confirm = cell.querySelector( '[name="confirm"]' );
			var filter_type = cell.querySelector( 'select[name="filter-type"]' );
			var filter_table = cell.querySelector( '.filter-table' );
			var filter_template = filter_table.querySelector( '[row-template]' );
			var filter_add = cell.querySelector( '[name=filter-add]' );

			filter_template.parentNode.removeChild( filter_template );
			filter_template.removeAttribute( 'row-template' );

			var clean_filters = () => {
				Array.prototype.forEach.call(
					filter_table.querySelectorAll( 'table > tbody > tr' ),
					( elem ) => { elem.parentNode.removeChild( elem ); }
				);
			};

			filter_type.onchange = ( event ) => {
				Array.prototype.forEach.call(
					filter_type.options,
					( option, index ) => {
						var display = ( ( index == filter_type.options.selectedIndex ) ? 'initial' : 'none' );
						var felem = cell.querySelector( '[name="filter-' + option.value + '"]' );

						felem.style.display = display;
						felem.onkeyup = ( event ) => { confirm.onclick( true ); };
						felem.onchange = ( event ) => {
							confirm.onclick( true );
							if ( option.value == 'saved' )
							{
								clean_filters();
								var tmp = afanasy.functions.get_filters( type );
								tmp = ( ( typeof( tmp[ felem.value ] ) === 'object' ) ? tmp[ felem.value ] : {} );

								Array.prototype.forEach.call(
									Object.keys( tmp ),
									( key ) => {
										var data = tmp[ key ];
										filter_add.onclick( false, data.column, data.param, data.value );
									}
								);
							}
						};
					}
				);

				clean_filters();
				if ( filter_type.value == 'saved' )
				{
					var saved = cell.querySelector( 'select[name="filter-' + filter_type.value + '"]' );
					Array.prototype.forEach.call(
						saved.querySelectorAll( 'option' ),
						( option ) => {
							if ( option.value )
								option.parentNode.removeChild( option );
						}
					);

					Array.prototype.forEach.call(
						Object.keys( afanasy.functions.get_filters( type ) ),
						( key ) => {
							var option = document.createElement( 'option' );

							option.value = key;
							option.textContent = key;

							saved.appendChild( option );
						}
					);
				}
				else
					cell.querySelector( '[name="filter-' + filter_type.value + '"]' ).value = '';

				confirm.onclick( true );
			};

			filter_add.onclick = ( event, column, param, value ) => {
				var filter_row = filter_template.cloneNode( true );
				filter_table.querySelector( 'table > tbody' ).appendChild( filter_row );

				var filter_column = filter_row.querySelector( 'select[name="filter-column"]' );
				filter_column.onchange = ( event, param, value ) => {
					var parent = filter_column.parentNode.parentNode;
					index = filter_column.selectedOptions[ 0 ].getAttribute( 'param' );

					var template = filter_table.querySelector( '[params-template="' + index + '"]' ).cloneNode( true );
					template.setAttribute( 'name', 'filter-param' );
					var col = parent.querySelector( '[col-name="param"]' );
					col.innerHTML = '';
					col.appendChild( template );

					if ( param )
					{
						Array.prototype.forEach.call(
							template.querySelectorAll( 'option' ),
							( option ) => {
								if ( option.value == param )
									option.setAttribute( 'selected', 'selected' );
							}
						);
					}

					var template = filter_table.querySelector( '[values-template="' + index + '"]' ).cloneNode( true );
					template.setAttribute( 'name', 'filter-value' );
					var col = parent.querySelector( '[col-name="value"]' )
					col.innerHTML = '';
					col.appendChild( template );

					if ( value )
					{
						var tag = template.tagName.toUpperCase();
						if ( tag === 'SELECT' )
						{
							Array.prototype.forEach.call(
								template.querySelectorAll( 'option' ),
								( option ) => {
									if ( option.value == value )
										option.setAttribute( 'selected', 'selected' );
								}
							);
						}
						else if ( tag === 'INPUT' )
							template.value = value;
					}
				};

				if ( column )
				{
					Array.prototype.forEach.call(
						filter_column.querySelectorAll( 'option' ),
						( option ) => {
							if ( option.value == column )
								option.setAttribute( 'selected', 'selected' );
						}
					);
				}
				filter_column.onchange( false, param, value );

				var filter_remove = filter_row.querySelector( '[name="filter-remove"]' );
				filter_remove.onclick = ( event ) => {
					filter_row.parentNode.removeChild( filter_row );
				};
			};

			confirm.onclick = ( event ) => {
				var ftype = filter_type.value;
				var felem = cell.querySelector( '[name="filter-' + ftype + '"]' );
				var check = ( ( ftype == 'new' && felem.value.length ) || ( ftype == 'saved' && felem.options.selectedIndex ) );
				if ( event === true )
				{
					if ( check )
						confirm.removeAttribute( 'disabled' );
					else
						confirm.setAttribute( 'disabled', 'disabled' );

					return ( check );
				}
				else if ( !check )
					return ;

				var error = false;
				var data = { type: ftype, name: felem.value, filters: [] };
				Array.prototype.forEach.call(
					filter_table.querySelectorAll( 'table > tbody > tr' ),
					( elem ) => {
						if ( error )
							return ;

						var evalue = elem.querySelector( '[name=filter-value]' );
						var tag = evalue.tagName.toUpperCase();
						var type = ( evalue.getAttribute( 'type' ) || tag ).toUpperCase();
						var value = evalue.value;
						if ( type == 'NUMBER' )
							value = Math.floor( Number.parseInt( value ) / 1000 );
						else if ( type == 'TIME' )
							value = Math.floor( Date.parse( '1970-01-01T' + value ) / 1000 );
						else if ( !type.indexOf( 'DATETIME' ) )
							value = Math.floor( Date.parse( value ) / 1000 );
						else if ( tag != 'SELECT' && !value )
							value = NaN;

						if ( Number.isNaN( value ) )
							error = true;

						data.filters.push( {
							column:	elem.querySelector( '[name=filter-column]' ).value,
							param:	elem.querySelector( '[name=filter-param]' ).value,
							value:	value
						} );
					}
				);

				if ( error )
				{
					return ( afanasy.system.windows.confirm( {
						text: afanasy.langs.get( 'empty-fields' )
					}, afanasy.langs.get( 'error' ), false, true ) );
				}

				var tmp = afanasy.functions.get_filters( type );
				tmp[ data.name ] = data.filters;

				afanasy.functions.set_filters( type, tmp );
				window.cell_close( cell.uid );
			};

			filter_type.onchange();
		},
		win_actions: {
			fn: {
				base: function( event, type, action, value, ids, block_ids ) {
					var fn = Object.assign( {}, afanasy.functions.win_actions.fn );
					fn[ ( action in fn ) ? action : 'action' ]( ...arguments );
				},
				log: ( event, type, action, value, ids, block_ids ) => {
					value = ( value || 'log' );
					afanasy.system.xhr.send( { get: { type: type, ids: [ ids[ 0 ] ], mode: value } }, ( obj ) => {
						var name, type, text = '';
						if ( typeof( obj.object ) !== 'undefined' )
						{
							name = obj.object.name;
							type = value + ( ( value.indexOf( 'log' ) < 0 ) ? '_log' : '' );
							text = '<pre>' + JSON.stringify( obj.object, undefined, 2 ) + '</pre>'
							obj = { message: { name: value, type: action, list: [ text ] } };
						}
						else
							[ name, type, text ] = [ obj.message.name, obj.message.type, obj.message.list ];

						afanasy.system.windows.text( text, afanasy.langs.get( type ), name );
					} );
				},
				action: ( event, type, action, value, ids, block_ids ) => {
					var operation, parameter = null;
					if ( typeof( value ) !== 'undefined' )
					{
						parameter = {};
						parameter[ action ] = value;
					}
					else
						operation = { type: action };

					afanasy.system.action.send( type, ids, operation, parameter, block_ids );
				},
				action_task: ( event, type, action, value, ids, block_ids, job_id ) => {
					ids = ids.filter( ( item, pos, arr ) => ( arr.indexOf( item ) == pos ) );
					block_ids = block_ids.filter( ( item, pos, arr ) => ( arr.indexOf( item ) == pos ) );

					if ( typeof( job_id ) === 'undefined' )
					{
						var tmp = ids;
						ids = block_ids;
						block_ids = tmp;

						var win = afanasy.tools.selected.window();
						var cell = ( win && win.getAttribute( 'cell-type' ) == 'tasks' && $.parent( win, '.cell' ) );
						if ( !cell || !cell.uid || !( cell.uid in afanasy.global.nodes_data[ 'tasks' ] ) )
							return ;

						job_id = afanasy.global.nodes_data[ 'tasks' ][ cell.uid ].id;
					}

					var operation, parameter = null;
					operation = { type: value, task_ids: ids };

					afanasy.system.action.send( 'jobs', [ job_id ], operation, parameter, block_ids ); // last is block_ids
				},
				move: ( event, type, action, value, ids, block_ids ) => {
					var operation = { type: value, jids: ids };
					afanasy.system.action.send( 'users', [ g_uid ], operation );
					afanasy.system.info( 'Moving Jobs' );
				},
				data: ( event, type, action, value, ids, block_ids ) => {
					var list = [];
					var more = false;
					Array.prototype.forEach.call(
						ids,
						( id ) => {
							var node = afanasy.global.nodes_data[ type ][ id ];
							var all = ( block_ids ? block_ids : [ -1 ] );
							more = ( all.length > 1 );
							Array.prototype.forEach.call(
								all,
								( block_id ) => {
									var tmp = ( ( block_id === -1 && !Array.isArray( node ) ) ? node : node[ block_id ] );
									if ( !tmp )
										return ;

									var title = ( more ? '<strong><u>' + tmp.name + ':</u></strong><br />' : '' );
									var text = '<pre>' + JSON.stringify( tmp.data, undefined, 2 ) + '</pre>';
									list.push( title + text );
								}
							);
						}
					);

					var name = undefined;
					if ( !more )
					{
						var node = afanasy.global.nodes_data[ type ][ ids[ 0 ] ];
						if ( Array.isArray( node ) )
						{
							var block_id = ( block_ids ? block_ids[ 0 ] : -1 );
							if ( typeof( node[ block_id ] ) !== 'undefined' )
								name = node[ block_id ].name;
						}
						else if ( typeof( node ) === 'object' )
							name = node.name;
					}

					afanasy.system.windows.text( list, afanasy.langs.get( 'properties' ), name );
				}
			},
			jobs: function() { afanasy.functions.win_actions.fn.base( ...arguments ); },
			tasks: function() { afanasy.functions.win_actions.fn.base( ...arguments ); },
			monitors: function() { afanasy.functions.win_actions.fn.base( ...arguments ); },
			renders: function() { afanasy.functions.win_actions.fn.base( ...arguments ); },
			users: function() { afanasy.functions.win_actions.fn.base( ...arguments ); }
		},
		launch_cmd: ( event, cell, obj, win, ids, block_ids ) => {
			var name = obj.id + '_' + obj.input.elements[ 0 ].name;
			var input = cell.querySelector( 'input[name="' + obj.id + '_' + obj.input.elements[ 0 ].name + '"]' );
			var value = input.value.trim();

			var exit = ( obj.type == 'lcex' );
			afanasy.system.info( 'launchCmd' + ( exit ? 'Exit' : '' ) + ' = ' + obj.type + ': ' + value );
			afanasy.system.action.send( 'renders', ids, {
				type:	'launch_cmd',
				cmd:	value,
				exit:	exit
			}, null );
		},
		service: ( event, cell, obj, win, ids, block_ids ) => {
			var name = obj.id + '_' + obj.input.elements[ 0 ].name;
			var input = cell.querySelector( 'input[name="' + obj.id + '_' + obj.input.elements[ 0 ].name + '"]' );
			var value = input.value.trim();

			afanasy.system.info( 'menuHandleService = ' + value + ': ' + name );
			afanasy.system.action.send( 'renders', ids, {
				name:	value,
				type:	'service',
				enable:	( obj.type == 'enable' )
			}, null );
		},
		custom_data: ( event, cell, obj, win, ids, block_ids ) => {
			var name = obj.id + '_' + obj.input.elements[ 0 ].name;
			var input = cell.querySelector( 'input[name="' + obj.id + '_' + obj.input.elements[ 0 ].name + '"]' );
			var value = input.value.trim();

			try
			{
				value = JSON.parse( value );
			}
			catch ( e )
			{
				var error = cell.querySelector( '.win > .error' );
				error.classList.remove( 'hide' );
				error.textContent = e.message;

				input.onkeydown = () => { error.classList.add( 'hide' ); };
				return ( e.message );
			}

			var params = {};
			params[ 'custom_data' ] = value;
			afanasy.system.action.send( 'users', ids, null, params );
		},
		table_sort: ( table, only_childs, id ) => {
			var sort = false;
			var tbody = table.querySelector( ':scope > tbody' );
			var column = table.querySelector( ':scope > thead > tr > th[col-sort]' );
			if ( column )
			{
				sort = column.getAttribute( 'col-sort' );
				column_name = column.getAttribute( 'col-name' );
			}

			var win = $.parent( table, '.win' );
			var type = ( win && win.getAttribute( 'cell-type' ) );
			var f = ( win && type && window[ ( type[ 0 ].toUpperCase() + type.substr( 1 ) ) + 'Sort' ] );
			if ( typeof( f ) !== 'function' )
				f = false;

			var filter = ( only_childs ? '[node-id^="' + id + ':"]' : '[node-id]:not([node-id*=":"])' );
			var rows = Array.prototype.slice.call( tbody.querySelectorAll( ':scope > tr' + filter ) );
			rows.sort( function( a, b ) {
				if ( sort )
				{
					var acontent = a.querySelector( ':scope > .col-' + column_name ).textContent;
					var bcontent = b.querySelector( ':scope > .col-' + column_name ).textContent;
					if ( ( sort == 'up' && acontent < bcontent ) || ( sort == 'down' && acontent > bcontent ) )
						return ( 1 );
					else if ( ( sort == 'up' && acontent > bcontent ) || ( sort == 'down' && acontent < bcontent ) )
						return ( -1 );
				}
				else
				{
					if ( f )
						return ( f( a, b ) );

					a.querySelector( ':scope > .col-id' );
					b.querySelector( ':scope > .col-id' );
					if ( a && b )
					{
						if ( a.textContent > b.textContent )
							return ( 1 );
						else if ( a.textContent < b.textContent )
							return ( -1 );
					}
				}

				return ( 0 );
			} );

			var prev = false;
			Array.prototype.forEach.call(
				rows,
				( row, index ) => {
					if ( index )
						prev.after( row );
					else if ( only_childs )
						tbody.querySelector( ':scope > tr[node-id="' + id + '"]' ).after( row );
					else if ( row.previousElementSibling )
						tbody.prepend( row );

					var next = row;
					if ( !only_childs )
					{
						var tmp = afanasy.functions.table_sort( table, true, row.getAttribute( 'node-id' ) );
						if ( tmp )
							next = tmp;
					}

					prev = next;
				}
			);

			return ( prev );
		}
	};
	afanasy.system = {
		log: ( i_msg, i_log ) => {
			i_log = ( i_log ? i_log : 'log' );
			if ( typeof( i_msg ) !== 'string' )
				i_msg = '<pre>' + JSON.stringify( i_msg, undefined, 2 ) + '</pre>';

			if ( !Array.isArray( afanasy.global.logs[ i_log ] ) )
			{
				afanasy.global.logs[ i_log ] = [];
				afanasy.global.logs_ids[ i_log ] = 0;
			}

			var index = -1;
			var cycle = -1;
			var n_cycle = g_cycle;
			var n_date = Date.now();
			var lines = afanasy.global.logs[ i_log ];
			for ( var i = 0; i < lines.length; ++i )
			{
				if ( cycle < 0 )
					cycle = lines[ i ].cycle;
				else if ( cycle != lines[ i ].cycle )
					break ;

				if ( i_msg == lines[ i ].msg )
				{
					var check = false;
					for ( var j = 0; j < lines.length; ++j )
					{
						if ( cycle == lines[ j ].cycle )
							lines[ j ].cycle = n_cycle;
					}

					lines[ i ].activity = n_date;
					lines[ i ].count += 1;
					index = i;
					break ;
				}
			}

			if ( index < 0 )
			{
				lines.unshift( {
					id:			++afanasy.global.logs_ids[ i_log ],
					msg:		i_msg,
					register:	n_date,
					activity:	0,
					count:		1,
					cycle:		n_cycle,
				} );

				for ( var i = lines.length; i >= afanasy.config.logs_max; --i )
					lines.pop();
			}
		},
		info: ( i_msg, i_log ) => {
			//$( '#info' ).textContent = i_msg;
			if ( i_log == null || i_log == true )
				afanasy.system.log( i_msg );

			$( '#statusbar .status' ).textContent = i_msg;
		},
		error: ( i_err, i_log ) => {
			afanasy.system.info( 'Error: ' + i_err, i_log );
		},
		action: {
			send: ( i_type, i_ids, i_operation, i_params, i_block_ids ) => {
				if ( i_ids.length == 0 )
					return ( afanasy.system.error( i_type + ' Action: IDs are empty.' ) );

				var obj = afanasy.system.action.object( i_type, i_ids );
				if ( i_params )
					obj.action.params = i_params;
				if ( i_operation )
					obj.action.operation = i_operation;
				if ( i_block_ids )
					obj.action.block_ids = i_block_ids;

				afanasy.system.xhr.send( obj );
			},
			object: ( i_type, i_ids ) => {
				var obj = { action: {
					ids:		i_ids,
					type:		i_type,
					user_name:	localStorage.user_name,
					host_name:	localStorage.host_name
				} };

				return ( obj );
			}
		},
		connection: {
			lost: () => {
				if ( g_id == 0 )
					return ;

				afanasy.system.info( 'Connection Lost.' );
				afanasy.system.register.unset();
			}
		},
		lock_refresh: () => {
			Array.prototype.forEach.call(
				document.querySelectorAll( '#grid > div.empty-cell' ),
				( cell ) => { cell.parentNode.removeChild( cell ); }
			);

			var locked = document.body.classList.contains( 'locked' );
			Array.prototype.forEach.call(
				document.querySelectorAll( '.grid-edit' ),
				( elem ) => { elem.classList.toggle( 'disabled', locked ); }
			);

			if ( !locked )
			{
				for ( var y = 1; y <= afanasy.global.grid_size.y; ++y )
				{
					for ( var x = 1; x <= afanasy.global.grid_size.x; ++x )
					{
						var cell = document.createElement( 'div' );
						cell.classList.add( 'empty-cell' );
						cell.setAttribute( 'grid-x', x );
						cell.setAttribute( 'grid-y', y );
						cell.style.gridArea = y + ' / ' + x + ' / span 1 / span 1';

						Array.prototype.forEach.call(
							[
								{ type: 'row', position: 'y', check: ( x == 1 && y < afanasy.global.grid_size.y ) },
								{ type: 'column', position: 'x', check: ( y == 1 && x < afanasy.global.grid_size.x ) }
							],
							( item, index ) => {
								if ( item.check )
								{
									var resize = document.createElement( 'div' );
									resize.classList.add( 'rule' );
									resize.setAttribute( 'grid-index', ( ( item.position == 'x' ) ? x : y ) );
									resize.setAttribute( 'grid-type', item.type );
									resize.setAttribute( 'grid-position', item.position );

									cell.appendChild( resize );
								}
							}
						);

						grid.appendChild( cell );
					}
				}
			}
		},
		register: {
			set: () => {
				if ( g_id != 0 )
					return ;

				afanasy.system.info( 'Sending register request.' );

				var obj = {};
				obj.monitor = {};
				obj.monitor.user_name = localStorage.user_name;
				obj.monitor.host_name = localStorage.host_name;
				obj.monitor.engine = cgru_Browser;
				afanasy.system.xhr.send( obj );

				setTimeout( afanasy.system.register.set, 5000 );
			},
			receive: ( i_obj ) => {
				g_id = i_obj.id;
				if ( i_obj.uid && ( i_obj.uid > 0 ) )
				{
					g_uid_orig = i_obj.uid;
					if ( g_uid == -1 )
						g_uid = g_uid_orig;
				}

				localStorage.time_register = ( Date.now() / 1000 );
				var user = document.querySelector( '#statusbar .user' );
				var level = ( ( typeof( localStorage.ui_level ) === 'string' ) ? localStorage.ui_level.toLowerCase() : '' );

				user.setAttribute( 'class', 'user ' + level );
				user.setAttribute( 'title', 'ID: ' + g_id + ' UID: ' + g_uid );
				user.querySelector( '.name' ).textContent = localStorage.user_name;

				document.title = 'AF';
				afanasy.system.info( 'Registered: ID = ' + g_id + ' User = "' + localStorage.user_name + '"[' + g_uid + "]" );
				//$( '#registered' ).textContent = 'Registered';
				//$( '#id' ).textContent = g_id;
				//$( '#uid' ).textContent = g_uid;

				afanasy.system.g_MButtonClicked( g_main_monitor_type );
				afanasy.system.register.super();
			},
			super: () => {
				//afanasy.system.info( 'g_SuperUserProcessGUI()' );
				var title = '';
				var indicator = $( '.toolbar-menu .infos-type' );
				var god = afanasy.system.g_GOD();
				var visor = afanasy.system.g_VISOR();
				if ( god || visor )
				{
					g_uid = 0;
					var name = ( god ? 'god' : 'visor' );
					indicator.classList.add( 'su_' + name );
					indicator.setAttribute( 'title', 'mode: ' + name.toUpperCase() );
					title = name.toUpperCase()[ 0 ];
				}
				else
				{
					g_uid = g_uid_orig;
					indicator.classList.remove( 'su_god' );
					indicator.classList.remove( 'su_visor' );
					indicator.setAttribute( 'title', '' );
				}
				( indicator.children ? indicator.children[ 0 ] : indicator ).textContent = title;

				if ( g_uid == 0 )
				{
					var obj = afanasy.system.action.object( 'monitors', [ g_id ] );
					obj.action.operation = {
						uid:	0,
						type:	'watch',
						class:	'perm'
					};

					afanasy.system.xhr.send( obj );
				}
			},
			logout: () => {
				afanasy.system.digest.remove();
				window.location.reload();
			},
			unset: () => {
				if ( g_id == 0 )
					return ;

				g_id = 0;
				g_uid = -1;
				g_uid_orig = -1;

				var user = document.querySelector( '#statusbar .user' );
				var level = ( ( typeof( localStorage.ui_level ) === 'string' ) ? localStorage.ui_level.toLowerCase() : '' );

				user.setAttribute( 'class', 'user ' + level );
				user.setAttribute( 'title', 'ID: ' + g_id + ' UID: ' + g_uid );
				user.querySelector( '.name' ).textContent = localStorage.user_name;

				window.document.title = 'AF (deregistered)';
				afanasy.system.info( 'Deregistered.' );
				//$( '#registered' ).textContent = 'Deregistered';
				//$( '#id' ).textContent = g_id;
				//$( '#uid' ).textContent = g_uid;

				afanasy.system.g_CloseAllWindows();
				afanasy.system.g_CloseAllMonitors();
				afanasy.system.register.set();
			}
		},
		xhr: {
			send: ( obj, func ) => {
				obj = { send: obj };
				if ( func )
					obj.func = func;

				afanasy.system.xhr.request( obj );
				return ( false );
			},
			request: ( args ) => {
				if ( g_closing )
					return ;

				var obj = args.send;
				if ( g_digest )
				{
					++g_auth.nc;
					g_auth.response = hex_md5( g_digest + ':' + g_auth.nonce + ':' + g_auth.nc );
					obj.auth = g_auth;
				}

				var xhr = new XMLHttpRequest();
				var obj_str = JSON.stringify( obj );
/*
				var convert = false;
				try
				{
					convert = '<pre>' + JSON.stringify( JSON.parse( obj_str ), undefined, 2 ) + '</pre>';
				}
				catch ( err ) {}
				xhr.m_log = '<b><i>send:</i></b> ' + ( convert || obj_str );
*/
				xhr.m_log = '<b><i>send:</i></b> ' + obj_str;
				xhr.m_args = args;

				xhr.timeout = 2000;
				xhr.onerror = afanasy.system.xhr.error;
				xhr.ontimeout = () => {};
				xhr.onreadystatechange = afanasy.system.xhr.change;

				xhr.open( 'POST', '/', true );
				xhr.overrideMimeType( 'application/json' );
				xhr.setRequestHeader( 'AFANASY', obj_str.length );
				xhr.send( obj_str );
			},
			change: function( event ) {
				var done = ( this.readyState == 4 );
				if ( done && this.status != 200 )
				{
					++nw_error_count;
					++nw_error_total;
					if ( ( nw_error_count > nw_error_count_max ) && nw_connected )
					{
						nw_connected = false;
						afanasy.system.error( 'Connection lost.' );
						afanasy.system.connection.lost();
					}

					return ;
				}
				else if ( !done )
					return ;

				var recv_obj = null;
				var recv_err = null;
				if ( this.responseText && this.responseText.length )
				{
					var convert = false;
					try
					{
						recv_obj = JSON.parse( this.responseText );
						convert = '<pre>' + JSON.stringify( recv_obj, undefined, 2 ) + '</pre>';
					}
					catch ( err )
					{
						recv_err = err;
					}

					//this.m_log += '<br /><b><i>recv:</i></b> ' + ( convert || this.responseText );
					this.m_log += '<br /><b><i>recv:</i></b> ' + this.responseText;
				}
				afanasy.system.log( this.m_log, 'netlog' );

				nw_error_count = 0;
				nw_connected = true;
				localStorage.time_activity = ( Date.now() / 1000 );

				if ( this.responseText && this.responseText.length )
				{
					if ( recv_err )
					{
						afanasy.system.error( 'JSON.parse:' );
						afanasy.system.log( recv_err.message + '<br />' + this.responseText );
						recv_obj = null;
					}

					if ( recv_obj )
					{
						if ( this.m_args.func )
							this.m_args.func( recv_obj, this.m_args, event );
						else
							afanasy.system.g_ProcessMsg( recv_obj );
					}
				}
			},
			error: function( event ) {
				if ( this.m_args.func )
					this.m_args.func( null, this.m_args, event );
			}
		},
		windows: {
			text: ( text, title, subtitle ) => {
				var div = document.createElement( 'div' );
				div.classList.add( 'selectable' );
				div.classList.add( 'text' );

				text = ( Array.isArray( text ) ? text : [ text ] );
				Array.prototype.forEach.call(
					text,
					( line ) => {
						var elem = document.createElement( 'p' );
						elem.innerHTML = line;
						div.appendChild( elem );
					}
				);

				afanasy.system.windows.confirm( {
					html: div.outerHTML,
				}, title, subtitle, true );
			},
			confirm: ( obj, title, subtitle, resize, callback ) => {
				if ( typeof( obj ) === 'string' )
					obj = afanasy.config.get( 'confirm.' + obj );

				obj.id = window.hmicrotime();
				obj.title = afanasy.langs.get( title ? title : ( obj.title || undefined ) );
				obj.subtitle = ( subtitle ? subtitle : ( obj.subtitle || undefined ) );
				obj.resize = ( resize ? resize : ( obj.resize || undefined ) );
				obj.callback = ( callback ? callback : ( obj.callback || undefined ) );
				if ( Array.isArray( obj.callback ) )
					[ obj.button, obj.callback ] = obj.callback;

				var win = afanasy.tools.selected.window();
				var [ ids, block_ids ] = afanasy.tools.selected.lines( ':' );
				ids = ( ids && ids.filter( ( item, pos, arr ) => ( arr.indexOf( item ) == pos ) ) );
				block_ids = ( block_ids && block_ids.filter( ( item, pos, arr ) => ( arr.indexOf( item ) == pos ) ) );

				var cell = window.cell_create( afanasy.templates.get( 'cell-confirm', obj, true ), obj.title, {
					autosize:	false,
					noattach:	true,
					noresize:	!obj.resize,
					subtitle:	obj.subtitle
				} );

				var input = cell.querySelector( '.win input[type=text], .win textarea' );
				if ( input )
					setTimeout( () => { input.focus(); }, 100 );

				var button = cell.querySelector( 'input[type="button"][name="confirm"]' );
				if ( button )
				{
					button.onmousedown = ( e ) => {
						var ret = false;
						var close = true;
						if ( obj.callback && typeof( afanasy.functions[ obj.callback ] ) === 'function' )
						{
							ret = afanasy.functions[ obj.callback ]( e, cell, obj, win, ids, block_ids );
							close = !ret;
						}

						if ( close )
							window.cell_close( cell.uid );
						else if ( typeof( ret ) !== 'undefined' )
							console.log( 'callback:', ret );
					};

					if ( input )
					{
						Array.prototype.forEach.call(
							cell.querySelectorAll( '.win input[type=text]' ),
							( input ) => {
								input.onkeydown = ( e ) => {
									if ( e.keyCode == 13 )
										button.dispatchEvent( new MouseEvent( 'mousedown',  { bubbles: true } ) );
								};
							}
						);
					}
				}

				return ( cell );
			}
		},

		digest: {
			init: ( i_obj ) => {
				g_digest = null;
				g_auth.nc = 0;

				if ( i_obj )
				{
					g_auth.nonce = i_obj.nonce;
					if ( localStorage.digest == null || localStorage.realm == null || localStorage.realm != i_obj.realm || localStorage.user_name == null || localStorage.user_name.length < 1 )
					{
						afanasy.system.digest.remove();
						localStorage.realm = i_obj.realm;
						// demander l'identifiant et le mot de passe et appeler afanasy.system.digest.construct
						afanasy.functions.login_user();
						return ;
					}
				}

				g_digest = localStorage.digest;
				g_auth.user_name = localStorage.user_name;
				$( '#auth_user' ).textContent = localStorage.user_name;
				afanasy.system.config.get();
			},
			construct: ( user_name, password ) => {
				localStorage.user_name = user_name;
				localStorage.digest = hex_md5( localStorage.user_name + ':' + localStorage.realm + ':' + password );
				afanasy.system.digest.init();
			},
			remove: () => {
				localStorage.removeItem( 'digest' );
				localStorage.removeItem( 'realm' );
			}
		},


		check_block_flag: ( i_flags, i_name ) => { // cm_CheckBlockFlag
			if ( cm_blockFlags[ i_name ] )
				return ( cm_blockFlags[ i_name ] & i_flags );

			g_Error( 'Block flag "' + i_name + '" does not exist.' );
			g_Log( 'Valid flags are: ' + JSON.stringify( cm_blockFlags ) );

			return ( false );
		},
		g_ProcessMsg: ( i_obj ) => {
			// afanasy.system.info( g_cycle + ' Progressing ' + g_receivers.length + ' receives' );
			g_last_msg_cycle = g_cycle;

			// Realm is sent if message not authorized
			if ( i_obj.realm )
			{
				afanasy.system.error( 'Authentication problems...' );
				return ;
			}

			// Preload images (service icons):
			if ( i_obj.files && i_obj.path )
			{
				for ( var i = 0; i < i_obj.files.length; ++i )
				{
					var img = new Image();
					img.src = '/' + i_obj.path + '/' + i_obj.files[ i ];
//					g_Images.push( img );
				}
				return ;
			}

			if ( i_obj.monitor )
			{
				if ( g_id == 0 && i_obj.monitor.id > 0 )
				{
					// Monitor is not registered and received an ID:
					afanasy.system.register.receive( i_obj.monitor );
				}
				else if ( i_obj.monitor.id != g_id )
				{
					// Received ID does not match:
					afanasy.system.info( 'This ID = ' + g_id + ' != ' + i_obj.monitor.id + ' received.' );
					afanasy.system.register.unset();
				}
				return ;
			}

			if ( i_obj.message || i_obj.info || i_obj.object )
			{
				afanasy.system.g_ShowObject( i_obj );
				return ;
			}

			if ( i_obj.events && i_obj.events.tasks_outputs && i_obj.events.tasks_outputs.length )
			{
				for ( var i = 0; i < i_obj.events.tasks_outputs.length; ++i )
					afanasy.system.WndTaskShow( { task: i_obj.events.tasks_outputs[ i ] } );
			}
			if ( i_obj.events && i_obj.events.tasks_listens && i_obj.events.tasks_listens.length )
			{
				for ( var i = 0; i < i_obj.events.tasks_listens.length; ++i )
					afanasy.system.WndTaskShow( { task: i_obj.events.tasks_listens[ i ] } );
			}

			if ( g_id == 0 )
				return ;

			for ( var i = 0; i < g_receivers.length; ++i )
				g_receivers[ i ].processMsg( i_obj );
		},
		wt_same: ( i_a, i_b ) => {
			return ( !( i_a.pos.job != i_b.pos.job || i_a.pos.block != i_b.pos.block || i_a.pos.task != i_b.pos.task ) );
		},
		WndTaskShow: ( i_obj ) => {
			var task = i_obj.task;
			if ( task == null )
				afanasy.system.error( 'WndTaskShow: Task is NULL.' );

			for ( var i = 0; i < wt_windows.length; ++i )
			{
				if ( afanasy.system.wt_same( wt_windows[ i ], task ) )
					wt_windows[ i ].show( task );
			}
		},
		g_ShowObject: ( i_data, i_args ) => {
			if ( i_data.info )
			{
				if ( i_data.info.kind == 'log' )
					afanasy.system.log( i_data.info.text );
				else if ( i_data.info.kind == 'error' )
					afanasy.system.error( i_data.info.text );
				else
					afanasy.system.info( i_data.info.text );
				return ;
			}

			var object = i_data;
			var type = 'object';
			if (i_data.object)
				object = i_data.object;
			else if (i_data.message)
			{
				object = i_data.message;
				type = 'message';
				afanasy.system.info( 'Message received.' );
			}

			if ( i_args == null )
				i_args = {};

			var title = 'Object';
			if (object.name)
				title = object.name;
			if (i_args.name)
				title = i_args.name;
			if (object.type)
				title += ' ' + object.type;
			i_args.title = title;

			var wnd = g_OpenWindow( i_args );
			if ( type == 'message' )
			{
				for ( var i = 0; i < object.list.length; ++i )
				{
					var el = document.createElement( 'p' );
					el.innerHTML = object.list[ i ].replace( /\n/g, '<br/>' );
					wnd.elContent.appendChild( el );
				}
			}
			else
			{
				var el = document.createElement( 'p' );
				el.innerHTML = JSON.stringify( object, null, '&nbsp&nbsp&nbsp&nbsp' ).replace( /\n/g, '<br/>' );
				wnd.elContent.appendChild( el );
			}
		},
		g_VISOR: () => {
			return ( localStorage.visor || g_uid < 1 );
		},
		g_GOD: () => {
			return ( localStorage.god || g_uid < 1 );
		},
		g_CloseAllWindows: () => {
			for (var i = 0; i < g_windows.length; i++)
				g_windows[i].close();
		},
		g_CloseAllMonitors: () => {
			cgru_ClosePopus();

			//for( var i = 0; i < g_monitor_buttons.length; ++i )
			//	g_monitor_buttons[ i ].classList.remove( 'pushed' );

			while ( g_monitors.length > 0 )
				g_monitors[ 0 ].destroy();
		},
		g_MButtonClicked: ( i_type, i_evt ) => {
			for ( var i = 0; i < g_monitor_buttons.length; ++i )
			{
				if ( g_monitor_buttons[ i ].textContent == i_type )
				{
					if ( !g_monitor_buttons[ i ].classList.contains( 'pushed' ) )
						g_monitor_buttons[ i ].classList.add( 'pushed' );
					else
						return ;
				}
			}

			afanasy.system.g_OpenMonitor( { type: i_type, evt: i_evt } );
		},
		//g_OpenMonitor: ( i_type, i_evt, i_id, i_name ) => {
		g_OpenMonitor: ( i_args ) => {
			if ( i_args.name == null )
				i_args.name = i_args.type;
			if ( i_args.wnd == null )
				i_args.wnd = window;

			var new_wnd = ( i_args.evt && ( i_args.evt.shiftKey || i_args.evt.ctrlKey || i_args.evt.altKey ) );
			for ( var i = 0; i < g_monitors.length; ++i )
			{
				if ( g_monitors[i].name == i_args.name )
				{
					afanasy.system.info( 'Monitor "' + i_args.name + '" already opened.', false );
					g_monitors[ i ].window.focus();
					return ;
				}
			}

			i_args.elParent = $( '#grid' );
			if ( ( i_args.type == 'tasks' ) && !new_wnd )
			{
				if ( g_TopWindow )
					g_TopWindow.destroy();

				g_TopWindow = new cgru_Window( {
					name:		'tasks',
					title:		i_args.name,
					wnd:		i_args.wnd,
					closeOnEsc:	false,
					addClasses:	[ 'cgru_absolute', 'tasks' ]
				} );
				g_TopWindow.closeOnEsc = false;
				g_TopWindow.onDestroy = () => {
					g_TopWindow.monitor.destroy();
					g_TopWindow = null;
				};

				i_args.elParent = g_TopWindow.elContent;
			}
			else if ( new_wnd )
			{
				i_args.wnd = afanasy.system.g_OpenWindowWrite( i_args.name );
				if ( i_args.wnd == null )
					return ;

				i_args.elParent = i_args.wnd.document.body;
			}
			else if ( g_main_monitor )
				g_main_monitor.destroy();

			var monitor = false;
//			var monitor = new Monitor( i_args );
			if ( new_wnd )
			{
				i_args.wnd.monitor = monitor;
				i_args.wnd.onbeforeunload = ( e ) => { e.currentTarget.monitor.destroy() };
			}
			else if ( i_args.type == 'tasks' )
			{
				g_TopWindow.monitor = monitor;
			}
			else
			{
				g_main_monitor = monitor;
				g_main_monitor_type = i_args.type;
				localStorage.main_monitor = i_args.type;
			}

			return ( monitor );
		},
		g_OpenWindowWrite: ( i_name, i_title, i_notFinishWrite ) => {
			if ( i_title == null )
				i_title = i_name;

			for ( var i = 0; i < g_windows.length; ++i )
				if ( g_windows[ i ].name == i_name )
					g_windows[ i ].close();

			var wnd = window.open( null, i_name, 'location=no,scrollbars=yes,resizable=yes,menubar=no' );
			if ( wnd == null )
			{
				afanasy.system.error( 'Can`t open new browser window.' );
				return ;
			}

			g_windows.push( wnd );
			wnd.name = i_name;

			wnd.document.writeln( '<!DOCTYPE html>' );
			wnd.document.writeln( '<html><head><title>' + i_title + '</title>' );
			wnd.document.writeln( '<link type="text/css" rel="stylesheet" href="lib/styles.css">' );
			wnd.document.writeln( '<link type="text/css" rel="stylesheet" href="afanasy/browser/style.css">' );
			if ( i_notFinishWrite == null || i_notFinishWrite == false )
			{
				wnd.document.writeln( '</head><body></body></html>' );
				wnd.document.body.onkeydown = g_OnKeyDown;
			}
			if ( wnd.document.body )
			{
				if ( localStorage.background )
					wnd.document.body.style.background = localStorage.background;
				if ( localStorage.text_color )
					wnd.document.body.style.color = localStorage.text_color;
			}
			wnd.focus();
			wnd.document.close();

			return ( wnd );
		},
		g_Init: () => {
			if ( typeof( cgru_Init ) !== 'function' )
				return ( alert( 'Error loading basic functions !' ) );

			afanasy.system.info( 'HTML body load.' );
			cgru_Init();
			afanasy.system.cm_Init();

			window.onbeforeunload = afanasy.system.g_OnClose;
			document.body.onkeydown = afanasy.system.g_OnKeyDown;

			//$( '#platform' ).textContent = cgru_Platform;
			//$( '#browser' ).textContent = cgru_Browser;

			if ( localStorage.main_monitor )
				g_main_monitor_type = localStorage.main_monitor;

			g_monitor_buttons = [];
			//var header = $( '#header' );
			//g_monitor_buttons = header.getElementsByClassName( 'mbutton' );
			for ( var i = 0; i < g_monitor_buttons.length; ++i )
			{
				g_monitor_buttons[ i ].onclick = ( e ) => {
					return ( afanasy.system.g_MButtonClicked( e.currentTarget.textContent, e ) );
				};
			}
			afanasy.system.config.get();
		},
		g_OnKeyDown: ( e ) => {
			if ( !e )
				return ;

			var win = afanasy.tools.selected.window();
			if ( e.keyCode == 27 ) // ESC
				return ( win && win.parentNode.parentNode === document.body && window.cell_close( win.parentNode.uid ) );

			if ( cgru_DialogsAll.length || cgru_MenusAll.length )
				return ;

			if ( e.keyCode == 65 && e.ctrlKey ) // CTRL+A
			{
				if ( win )
					afanasy.functions.win_select_all();
				return ( false );
			}
			else if ( e.keyCode == 38 && win )
				afanasy.functions.win_select_next( e, true ); // UP
			else if ( e.keyCode == 40 && win )
				afanasy.functions.win_select_next( e, false ); // DOWN

			g_keysdown += String.fromCharCode( e.keyCode );
			if ( g_keysdown.length > 5 )
				g_keysdown = g_keysdown.slice( g_keysdown.length - 5, g_keysdown.length );
			// afanasy.system.info( g_keysdown );
			afanasy.system.check_sequence();
		},
		check_sequence: () => {
			var god = ( g_keysdown == 'IDDQD' );
			var visor = false;
			if ( god )
				visor = true;
			else
				visor = ( g_keysdown == 'IDKFA' );

			if ( visor == false && god == false )
				return ;

			if ( localStorage.visor )
			{
				localStorage.removeItem( 'visor' );
				localStorage.removeItem( 'god' );
				afanasy.system.info( 'USER MODE' );
				g_uid = g_uid_orig;
			}
			else
			{
				if ( god )
				{
					localStorage.god = true;
					afanasy.system.info( 'GOD MODE' );
				}
				else if ( visor )
				{
					localStorage.visor = true;
					afanasy.system.info( 'VISOR MODE' );
				}
			}
			afanasy.system.register.super();
		},
		config: {
			get: () => {
				var obj = { get: { type: 'config' } };
				afanasy.system.xhr.send( obj, afanasy.system.config.received );
			},
			received: ( i_obj ) => {
				//console.log( 'i_obj:', i_obj );
				if ( i_obj.realm )
				{
					if ( g_digest )
					{
						afanasy.system.error( 'Access denied.' );
						afanasy.system.digest.remove();
						return ;
					}

					afanasy.system.digest.init( i_obj );
					return ;
				}

				if ( i_obj.cgru_config )
				{
					if ( !cgru_ConfigLoad( i_obj.cgru_config ) )
					{
						afanasy.system.error( 'Invalid config received.' );
						return ;
					}

					if ( cgru_Config.docs_url )
						$( '#docs_link' ).href = cgru_Config.docs_url + '/afanasy/gui#web';
					if ( cgru_Config.forum_url )
						$( '#forum_link' ).href = cgru_Config.forum_url + '/viewforum.php?f=17';

					//var title = 'CGRU version: ' + cgru_Environment.version;
					//title += '\nBuild at: ' + cgru_Environment.builddate;
					//$( '#version' ).textContent = cgru_Environment.version;
					//$( '#version' ).title = title;

					var server = cgru_Environment.username + '@' + cgru_Environment.hostname + ':' +
						cgru_Environment.location;
					var log = 'CGRU version: ' + cgru_Environment.version;
					log += '<br>Build at: ' + cgru_Environment.builddate;
					log += '<br>Build revision: ' + cgru_Environment.buildrevision;
					log += '<br>Server: ' + server;
					if ( cgru_Environment.servedir && cgru_Environment.servedir.length )
						log += '<br>HTTP root override: ' + cgru_Environment.servedir;
					afanasy.system.log( log );

					var cgru = document.querySelector( '.infos-cgru' );
					cgru.textContent = ':' + cgru_Environment.version;
					cgru.setAttribute( 'title', server );
					document.querySelector( '.infos-server' ).textContent = server;
				}

				if ( g_digest == null )
				{
					cgru_params.push( [ 'user_name', 'User Name', 'coord', 'Enter user name<br/>Need restart (F5)' ] );
					//$( '#auth_parameters' ).style.display = 'none';
				}
				cgru_params.push( [ 'host_name', 'Host Name', 'pc', 'Enter host name<br/>Needed for logs only' ] );
				cgru_params.push( [
					'run_symbol', 'Run Symbol', '★',
					'Enter any <a href="http://en.wikipedia.org/wiki/Miscellaneous_Symbols" target="_blank">' +
						'unicode</a><br/>You can copy&paste some:<br>★☀☢☠☣☮☯☼♚♛♜☹♿⚔☻⚓⚒⚛⚡⚑☭'
				] );

				cgru_ConstructSettingsGUI();
				cgru_InitParameters();
				cgru_Info = afanasy.system.info;
				cgru_Error = afanasy.system.error;
				afanasy.system.cm_ApplyStyles();

				afanasy.system.nw_GetSoftwareIcons();
				afanasy.system.register.set();
				afanasy.system.g_Refresh();
			}
		},
		g_Refresh: () => {
			if ( g_last_msg_cycle != null && g_last_msg_cycle < ( g_cycle - 10 ) )
				afanasy.system.connection.lost();

			++g_cycle;
			setTimeout( afanasy.system.g_Refresh, 1000 );
			if ( g_id == 0 )
				return ;

			afanasy.system.nw_GetEvents( 'monitors', 'events' );
			for ( var i = 0; i < g_refreshers.length; ++i )
				g_refreshers[ i ].refresh();
		},
		nw_GetEvents: () => {
			if ( g_id == 0 )
				return ;

			// info('c' + g_cycle + ' getting events...');
			var obj = { get: {
				ids:	[ g_id ],
				mode:	'events',
				type:	'monitors'
			} };

			afanasy.system.xhr.send( obj );
		},
		nw_GetSoftwareIcons: () => {
			var obj = { get: {
				type:	'files',
				path:	'icons/software'
			} };

			afanasy.system.xhr.send( obj );
		},
		cm_Init: () => {
			if ( localStorage.ui_level == null )
				localStorage.ui_level = cm_UILevels[ 0 ];

			if ( localStorage.ui_level == cm_UILevels[ 2 ] )
				afanasy.system.info( 'Welcome to the Dark Side.' );
		},
		g_OnClose: () => {
			localStorage.main_monitor = g_main_monitor_type;

			var operation = {};
			operation.type = 'deregister';
			if ( g_id )
				afanasy.system.action.send( 'monitors', [ g_id ], operation );

			g_closing = true;
			afanasy.system.g_CloseAllWindows();
			afanasy.system.g_CloseAllMonitors();
		},
		cm_ApplyStyles: () => {
			document.body.style.background = localStorage.background;
			document.body.style.color = localStorage.text_color;
			// $( '#header' ).style.background = localStorage.background;
			// $( '#footer' ).style.background = localStorage.background;
			// $( '#navig' ).style.background = localStorage.background;
			// $( '#sidepanel' ).style.background = localStorage.background;
		},
		ui_level: {
			padawan: () => {
				return ( cm_UILevels.indexOf( localStorage.ui_level ) == 0 );
			},
			jedi: () => {
				return ( cm_UILevels.indexOf( localStorage.ui_level ) == 1 );
			},
			sith: () => {
				return ( cm_UILevels.indexOf( localStorage.ui_level ) == 2 );
			},
			apply: ( i_level ) => {
				var uiLevelHandle = $( '#ui_level' );
				if ( cm_UILevels.indexOf( i_level ) == -1 )
					return ( afanasy.system.error( 'Invalid UI Level: ' + i_level ) );

				afanasy.system.info( 'UI level set: ' + i_level );
				if ( localStorage.ui_level == i_level )
					return ;

				localStorage.ui_level = i_level;
			}
		}
	};

	window.g_Log = afanasy.system.log;

	Handlebars.registerHelper( 'config', function( name ) {
		return ( afanasy.config.get( name ) );
	} );

	Handlebars.registerHelper( 'trans', function( name ) {
		return new Handlebars.SafeString( afanasy.langs.get( name ) );
	} );

	var config_error = ( err ) => { alert( 'Error loading configuration !' ); console.error( err ); };
	afanasy.tools.ajax( afanasy.global.source + 'config.txt', { input: 'json' }, ( event, body ) => {
		afanasy.config = Object.assign( body, afanasy.config );
		afanasy.config.source = afanasy.global.source;
		if ( typeof( afanasy.config.langs ) === 'object' )
		{
			var langs = [];
			Array.prototype.forEach.call(
				Object.keys( afanasy.config.langs ),
				( lang ) => {
					var obj = afanasy.config.langs[ lang ];
					if ( !obj.name )
						return ;

					afanasy.langs[ lang ] = obj;
					langs.push( [ lang, obj.name ] );
				}
			);

			afanasy.langs.default = afanasy.config.langs.default;
			delete afanasy.config.langs;

			if ( !( afanasy.langs.selected in afanasy.langs ) )
				afanasy.langs.selected = afanasy.langs.default;
		}

		afanasy.tools.ajax( afanasy.global.source + 'templates.txt', { input: 'html' }, ( event, body ) => {
			Array.prototype.forEach.call(
				body.querySelectorAll( 'ajax > [handlebars]' ),
				( elem ) => {
					var name = elem.getAttribute( 'handlebars' );
					var html = elem.innerHTML.replace( /({{&gt;)/g, '{{>' ).replace( /({{#&gt;)/g, '{{#>' );
/*
					var re = /\{\{config\s'(.*?)'\}\}/g;
					console.log( html.replace( re, ( match, contents, offset, input_string ) => {
						return ( afanasy.config.get( contents ) );
						//return ( '<a href="wiki/' + contents.replace( / /g, '_' ) + '">' + contents + '</a>' );
					} ) );
*/
					var key = 'partial-';
					if ( !name.indexOf( key ) )
						Handlebars.registerPartial( name.substr( key.length ), html );
					else
						afanasy.templates.all[ name ] = Handlebars.compile( html );
				}
			);
			afanasy.tools.handlebars( document.body );

			var update = document.querySelector( '#statusbar .update > .time' );
			setInterval( () => {
				var type = 's';
				var diff = ( Date.now() / 1000 ) - ( localStorage.time_activity || 0 );
				if ( diff >= 60 )
				{
					if ( diff > ( 24 * 3600 ) && ( type = 'j' ) )
						diff /= ( 24 * 3600 );
					else if ( diff > 3600 && ( type = 'h' ) )
						diff /= 3600;
					else if ( ( type = 'm' ) )
						diff /= 60;
				}

				update.textContent = Math.max( 0, Math.floor( diff ) ) + type;
			}, 500 );

			document.body.classList.remove( 'loading' );
			document.dispatchEvent( afanasy );

			Array.prototype.forEach.call(
				afanasy.global.grid_filling,
				( item ) => {
					var win = afanasy.templates.get( 'cell-' + item.type, false, true );
					window.cell_create( win, false, item );
				}
			);

			if ( typeof( window.table_resize ) === 'function' )
				window.table_resize();

			afanasy.system.g_Init();
			setInterval( window.cell_refresh, 250 );

			// Temporary
			Array.prototype.forEach.call(
				document.querySelectorAll( '.menu.main-toolbar > li[onclick-function]' ),
				( li ) => {
					var link = li.getAttribute( 'onclick-function' );
					try
					{
						link = JSON.parse( link );
						if ( typeof( afanasy.functions[ link[ 0 ] ] ) !== 'function' )
							throw '';
					}
					catch ( e ) { link = false; }

					if ( typeof( afanasy.functions[ link[ 0 ] ] ) === 'function' )
						li.onmousedown = ( e ) => { afanasy.functions[ link[ 0 ] ].apply( li, [ e, ...link.slice( 1 ) ] ) };
				}
			);
		}, config_error );
	}, config_error );
} );

var set_values = {};
var date_null = [ null, '', '0000-00-00', '0000-00-00 00:00:00' ];
Array.prototype.forEach.call( [
	[ 'log',			function() { console.log( ...Array.prototype.slice.call( arguments, 0, -1 ) ); } ],
	[ 'concat',			function() { return ( Array.prototype.slice.call( arguments, 0, -1 ).join( '' ) ); } ],
	[ 'upper',			function() { return ( arguments[ 0 ].toUpperCase() ); } ],
	[ 'lower',			function() { return ( arguments[ 0 ].toLowerCase() ); } ],
	[ 'capitalize',		function() { return ( arguments[ 0 ].capitalize() ); } ],
	[ 'eq',				function() { return ( arguments[ 0 ] === arguments[ 1 ] ); } ],
	[ 'not-eq',			function() { return ( arguments[ 0 ] !== arguments[ 1 ] ); } ],
	[ 'not',			function() { return ( !arguments[ 0 ] ); } ],
	[ 'and',			function() { return ( arguments[ 0 ] && arguments[ 1 ] ); } ],
	[ 'or',				function() { return ( arguments[ 0 ] || arguments[ 1 ] ); } ],
	[ 'xor',			function() { return ( ( arguments[ 0 ] && !arguments[ 1 ] || !arguments[ 0 ] && arguments[ 1 ] ) ); } ],
	[ 'gt',				function() { return ( arguments[ 0 ] > arguments[ 1 ] ); } ],
	[ 'gte',			function() { return ( arguments[ 0 ] >= arguments[ 1 ] ); } ],
	[ 'lt',				function() { return ( arguments[ 0 ] < arguments[ 1 ] ); } ],
	[ 'lte',			function() { return ( arguments[ 0 ] <= arguments[ 1 ] ); } ],
	[ 'in',				function() { return ( ( ( typeof( arguments[ 1 ] ) === 'string' ) ? JSON.parse( arguments[ 1 ] ) : arguments[ 1 ] ).indexOf( arguments[ 0 ] ) >= 0 ); } ],
	[ 'not-in',			function() { return ( arguments[ 1 ].indexOf( arguments[ 0 ] ) < 0 ); } ],
	[ 'type',			function() { return ( typeof( arguments[ 0 ] ) ); } ],
	[ 'count',			function() { return ( ( typeof( arguments[ 0 ] ) === 'object' ) ? ( Array.isArray( arguments[ 0 ] ) ? arguments[ 0 ].length : Object.keys( arguments[ 0 ] ).length ) : 0 ); } ],
	[ 'is-array',		function() { return ( Array.isArray( arguments[ 0 ] ) ); } ],
	[ 'date-null',		function() { return ( date_null.indexOf( arguments[ 0 ] ) >= 0 ); } ],
	[ 'join',			function() { return ( arguments[ 0 ].join( arguments[ 1 ] ) ); } ],
	[ 'split',			function() { return ( arguments[ 0 ].split( arguments[ 1 ] ) ); } ],
	[ 'slice',			function() { return ( arguments[ 0 ].slice( arguments[ 1 ], ( ( arguments.length > 3 ) ? arguments[ 2 ] : undefined ) ) ); } ],
	[ 'array',			function() { return ( Array.prototype.slice.call( arguments, 0, -1 ) ); } ],
	[ 'array-get',		function() { return ( arguments[ 1 ][ arguments[ 0 ] ] ); } ],
	[ 'array-add',		function() { return ( arguments[ 0 ].concat( Array.prototype.slice.call( arguments, 1, -1 ) ) ); } ],
	[ 'array-concat',	function() { return ( arguments[ 0 ].concat( arguments[ 1 ] ) ); } ],
	[ 'atob',			function() { return ( atob( arguments[ 0 ] ) ); } ],
	[ 'btoa',			function() { return ( btoa( arguments[ 0 ] ) ); } ],
	[ 'encode',			function() { return ( unescape( encodeURIComponent( arguments[ 0 ] ) ) ); } ],
	[ 'decode',			function() {
		var val = arguments[ 0 ];
		try { val = decodeURIComponent( escape( val ) ); } catch ( e ) {}
		return ( val );
	} ],
	[ 'json-parse',		function() { return ( JSON.parse( arguments[ 0 ] ) ); } ],
	[ 'json-string',	function() { return ( JSON.stringify( arguments[ 0 ] ) ); } ],
	[ 'keys',			function() { return ( Object.keys( arguments[ 0 ] ) ); } ],
	[ 'get',			function() {
		var obj = set_values;
		var keys = Array.prototype.slice.call( arguments, 0, -1 );
		if ( typeof( arguments[ 0 ] ) === 'object' )
		{
			keys.shift();
			obj = arguments[ 0 ];
		}

		Array.prototype.forEach.call(
			keys,
			( key ) => { obj = obj[ key ]; }
		);

		return ( obj );
	} ],
	[ 'set',			function() {
		if ( typeof( arguments[ 1 ] ) === 'object' && arguments[ 1 ].hash )
			arguments[ 1 ] = arguments[ 1 ].hash;
		else if ( arguments[ 2 ] === 'json' )
			arguments[ 1 ] = JSON.parse( arguments[ 1 ] );

		set_values[ arguments[ 0 ] ] = arguments[ 1 ];
	} ],
	[ 'merge',			function() {
		var obj = {};
		arguments[ 0 ] = ( arguments[ 0 ] || {} );
		if ( typeof( arguments[ 0 ] ) === 'string' )
			arguments[ 0 ] = JSON.parse( arguments[ 0 ] );
		arguments[ 1 ] = ( arguments[ 1 ] || {} );
		if ( typeof( arguments[ 1 ] ) === 'string' )
			arguments[ 1 ] = JSON.parse( arguments[ 1 ] );

		Array.prototype.forEach.call(
			Object.keys( arguments[ 0 ] ),
			( key ) => { obj[ key ] = arguments[ 0 ][ key ]; }
		);
		Array.prototype.forEach.call(
			Object.keys( arguments[ 1 ] ),
			( key ) => { obj[ key ] = arguments[ 1 ][ key ]; }
		);

		return ( obj );
	} ],
], ( item ) => {
	var index, item = item;
	Handlebars.registerHelper( item[ 0 ], function() {
		try
		{
			return ( item[ 1 ]( ...arguments ) );
		}
		catch ( e )
		{
			console.error( item[ 0 ], arguments, e );
		}

		return ( '' );
	} );
} );

Handlebars.registerHelper( 'tag', function( name ) {
	var output = '';
	Array.prototype.forEach.call(
		Array.prototype.slice.call( arguments, 1, -1 ),
		( attrs ) => {
			if ( !attrs || typeof( attrs ) !== 'object' )
				return ;
			else if ( attrs.hash )
				attrs = attrs.hash;

			Array.prototype.forEach.call(
				Object.keys( attrs ),
				( attr ) => {
					output += ' ' + attr + '=';
					if ( attrs[ attr ].indexOf( '"' ) >= 0 )
						output += '\'' + attrs[ attr ] + '\'';
					else
						output += '"' + attrs[ attr ] + '"';
				}
			);
		}
	);

	return new Handlebars.SafeString( '<' + name + output + '>' );
} );
