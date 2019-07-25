document.addEventListener( 'DOMContentLoadedAfanasy', ( afanasy ) => {
	var [ global, templates ] = [ afanasy.global, afanasy.templates ];
	var grid = document.querySelector( '#grid' );

	/* Grid Rules */
	var grid_rule = ( position, cursor, diff, set ) => {
		var style = window.getComputedStyle( grid, null );
		var template = { x: [], y: [] };

		if ( position === true || ( position == 'x' && Array.isArray( cursor ) ) )
		{
			set = true;
			if ( position === true )
			{
				var size = ( 100 / global.grid_size.x );
				for ( var x = 1; x <= global.grid_size.x; ++x ) template.x.push( size );
			}
			else
				template.x = cursor;
		}
		else if ( position == 'x' && cursor && diff )
		{
			var full = parseInt( style.getPropertyValue( 'width' ) );
			Array.prototype.forEach.call(
				global.grid_template.x,
				( size, index ) => {
					if ( ( index + 1 ) == cursor )
						size += ( diff / full * 100 );
					else if ( index == cursor )
						size -= ( diff / full * 100 );

					template.x[ index ] = size;
				}
			);
		}
		else
			template.x = global.grid_template.x;
		grid.style.gridTemplateColumns = template.x.join( '% ' ) + '%';

		if ( position === true || ( position == 'y' && Array.isArray( cursor ) ) )
		{
			set = true;
			if ( position === true )
			{
				var size = ( 100 / global.grid_size.y );
				for ( var y = 1; y <= global.grid_size.y; ++y ) template.y.push( size );
			}
			else
				template.y = cursor;
		}
		else if ( position == 'y' && cursor && diff )
		{
			var full = parseInt( style.getPropertyValue( 'height' ) );
			Array.prototype.forEach.call(
				global.grid_template.y,
				( size, index ) => {
					if ( ( index + 1 ) == cursor )
						size += ( diff / full * 100 );
					else if ( index == cursor )
						size -= ( diff / full * 100 );

					template.y[ index ] = size;
				}
			);
		}
		else
			template.y = global.grid_template.y;
		grid.style.gridTemplateRows = template.y.join( '% ' ) + '%';

		if ( set )
		{
			global.grid_template = template;
			global.grid_size.x = global.grid_template.x.length;
			global.grid_size.y = global.grid_template.y.length;
		}

		return ( template );
	};
	grid_rule( true );

	/* Grid Resize */
	var grid_resize = false;
	window.dmousedown[ 'grid_resize' ] = ( e ) => {
		if ( !e.target.classList.contains( 'rule' ) )
			return ;

		var rule = e.target;
		var cell = rule.parentNode;

		var type = rule.getAttribute( 'grid-type' );
		var position = rule.getAttribute( 'grid-position' );

		var style = window.getComputedStyle( cell, null );
		var value = parseInt( style.getPropertyValue( 'width' ) );

		grid_resize = { rule: rule, cell: cell, position: e[ 'client' + position.toUpperCase() ], size: value, template: false };
		window.getSelection().removeAllRanges();
	};

	window.dmousemove[ 'grid_resize' ] = ( e ) => {
		if ( !grid_resize )
			return ;

		var rule = grid_resize.rule;
		var cell = grid_resize.cell;

		var index = rule.getAttribute( 'grid-index' );
		var type = rule.getAttribute( 'grid-type' );
		var position = rule.getAttribute( 'grid-position' );

		var next = cell.parentNode.querySelector( '.rule[grid-type="' + type + '"][grid-index="' + ( index + 1 ) + '"]' );

		var size = ( type == 'column' ) ? 'width' : 'height';
		var value = ( e[ 'client' + position.toUpperCase() ] - grid_resize.position );

		grid_resize.template = grid_rule( position, index, value );
		window.getSelection().removeAllRanges();
	};

	window.dmouseup[ 'grid_resize' ] = ( e ) => {
		if ( grid_resize && grid_resize.template )
			global.grid_template = grid_resize.template;
		grid_resize = false;
	};

	/* Grid Add & Remove */
	window.dmousedown[ 'grid_edit' ] = ( e ) => {
		var elem = e.target;
		if ( !e.target.classList.contains( 'grid-edit' ) )
		{
			elem = $.parent( e.target, '.grid-edit' );
			if ( !elem )
				return ;
		}

		if ( elem.classList.contains( 'disabled' ) )
			return ;

		var template = global.grid_template;
		var type = elem.getAttribute( 'grid-edit' );
		var position = elem.getAttribute( 'grid-position' );

		if ( type == 'add' )
		{
			var len = ( template[ position ].length + 1 );
			var value = ( 1 / len * 100 );
			Array.prototype.forEach.call( template[ position ], ( size, index ) => { template[ position ][ index ] -= value / ( len - 1 ); } );

			template[ position ].push( value );
		}

		if ( type == 'remove' && template[ position ].length > 1 )
		{
			var len = ( template[ position ].length - 1 );
			var value = template[ position ].pop();
			Array.prototype.forEach.call( template[ position ], ( size, index ) => { template[ position ][ index ] += value / len; } );

			Array.prototype.forEach.call(
				document.querySelectorAll( '#grid > .cell' ),
				( cell ) => {
					var position = { x: cell.getAttribute( 'grid-x' ), y: cell.getAttribute( 'grid-y' ) };
					if ( position.x > template.x.length || position.y > template.y.length )
						cell.parentNode.removeChild( cell );
				}
			);
		}

		grid_rule( position, template[ position ] );
		afanasy.system.lock_refresh();
	};

	/* Cell Active */
	window.dmousedown[ 'cell_active' ] = ( e ) => {
		var container = $.parent( e.target, '.cell[data-uid]' );
		if ( container && !e.target.classList.contains( 'lines' ) && !$.parent( e.target, '.lines' ) )
		{
			var uid = container.uid;
			if ( global.cell_active != uid )
			{
				var grid = $.parent( container, '#grid' );
				Array.prototype.forEach.call(
					document.querySelectorAll( '.cell' ),
					( elem ) => {
						elem.classList.remove( 'active' );

						if ( !grid )
						{
							var index = Number.parseInt( elem.style.zIndex );
							if ( elem.parentNode === document.body && !Number.isNaN( index ) )
								elem.style.zIndex = ( --index ? index : '' );
						}
					}
				);

				global.cell_active = uid;
				container.classList.add( 'active' );
				container.style.zIndex = ( grid ? '' : 100 );
			}
		}
	};

	/* Cell Refresh */
	var nodes = { Jobs: false, Logs: false, Monitors: false, Renders: false, Tasks: false, Users: false };
	window.cell_refresh = ( force ) => {
		force = ( ( [ 'boolean', 'string' ].indexOf( typeof( force ) ) >= 0 ) ? force : false );
		if ( !force && document.hidden )
			return ;

		uid = global.cell_active;
		force = ( ( typeof( force ) === 'string' ) ? force.toLowerCase() : force );
		Array.prototype.forEach.call(
			Object.keys( nodes ),
			( key ) => {
				if ( nodes[ key ] )
					return ;

				nodes[ key ] = true;
				var name = key + 'Node';
				var lkey = key.toLowerCase();
				var find = '.win[cell-type=' + lkey + ']';
				var windows = document.querySelectorAll( find );
				var active = document.querySelector( '.cell.active[data-uid="' + uid + '"] ' + find );
				if ( typeof( window[ name ] ) !== 'function' )
					return ;
				else if ( !windows.length || !( lkey in afanasy.global.nodes_data ) )
					afanasy.global.nodes_data[ lkey ] = {};

				try
				{
					window[ name ]( windows, ( force === true || force === lkey ), !!active )
						.then( ( obj ) => {
							Array.prototype.forEach.call(
								windows,
								( win ) => { win.parentNode.querySelector( '.title .refresh' ).style.opacity = ( obj.refresh ? 1 : 0 ); }
							);
						} )
						.catch( ( err ) => { if ( err ) console.error( 'catch:', err ); } )
						.finally( () => { nodes[ key ] = false; } );
				} catch ( e ) {}
			}
		);
	};

	/* Cell Create */
	window.cell_create = ( content, title, options ) => {
		options = Object.assign( { subtitle: false, autosize: true, noattach: false, noresize: false, nl2br: false, style: '', position: false, size: false }, ( options || {} ) );
		var cell = templates.get( 'cell-container', false, true );
		cell.uid = window.hmicrotime();

		var win = document.createElement( 'div' );
		win.classList.add( 'win' );

		var ctitle = false;
		if ( content instanceof HTMLElement )
		{
			if ( content.classList.contains( 'win' ) )
			{
				win = content;
				win.removeAttribute( 'data-template' );

				if ( !title )
				{
					ctitle = win.querySelector( ':scope > .title' );
					var dtitle = win.getAttribute( 'cell-title' );
					if ( !ctitle && dtitle )
						title = ( ( typeof( dtitle ) === 'string' && dtitle ) ? dtitle : title );
				}

				var buttons = win.querySelector( ':scope > [data-buttons]' );
				if ( buttons )
				{
					var cbuttons = cell.querySelector( '.buttons' );
					if ( buttons.getAttribute( 'data-buttons' ) !== 'add' )
					{
						Array.prototype.forEach.call(
							cbuttons,
							( button ) => { button.remove(); }
						);
					}

					buttons.parentNode.removeChild( buttons );
					Array.prototype.forEach.call(
						Object.keys( buttons.childNodes ).reverse(),
						( index ) => { cbuttons.prepend( buttons.childNodes[ index ] ); }
					);
				}

				var subtitle = win.querySelector( ':scope > .subtitle' ) || document.createElement( 'div' );
				if ( subtitle.parentNode )
				{
					win.classList.add( 'decal' );
					subtitle.parentNode.removeChild( subtitle );
				}
				else
					subtitle.classList.add( 'subtitle' );
				cell.querySelector( ':scope > .title' ).after( subtitle );

				var style = ( ( typeof( options.style ) === 'string' ) ? options.style : '' );
				style += ( ( style.trim() && style.trim().slice( -1 ) !== ';' ) ? ';' : '' );
				style += ( ( typeof( win.getAttribute( 'style' ) ) === 'string' ) ? win.getAttribute( 'style' ) : '' );
				win.removeAttribute( 'style' );
				cell.setAttribute( 'style', style );
			}
			else
				win.appendChild( content );
		}
		else if ( typeof( content ) === 'string' )
		{
			if ( options.nl2br )
				content = content.replace( /\n/g, '<br />' );

			var span = document.createElement( 'span' );
			span.classList.add( 'text' );
			span.innerHTML = content;

			win.classList.add( 'text-center' );
			win.appendChild( span );
		}
		else
			return ( false );

		if ( win.getAttribute( 'data-generate' ) !== '1' )
			win.setAttribute( 'data-generate', '1' );
		else
			return ( false );

		if ( !ctitle )
		{
			ctitle = cell.querySelector( '.title' );
			if ( title )
				ctitle.querySelector( '.text' ).innerText = title;
		}
		else
			cell.querySelector( '.title' ).replaceWith( ctitle );

		if ( typeof( options.subtitle ) === 'string' && options.subtitle.trim() )
			cell.querySelector( '.title .subtext' ).textContent = ' - ' + options.subtitle;

		var modal = ( !options.position || win.getAttribute( 'data-template' ) );
		if ( !modal )
		{
			win.replaceWith( cell );
			options.size = ( options.size ? options.size : { width: 1, height: 1 } );

			cell.setAttribute( 'grid-x', options.position.x );
			cell.setAttribute( 'grid-y', options.position.y );
			cell.setAttribute( 'grid-width', options.size.width );
			cell.setAttribute( 'grid-height', options.size.height );

			cell.style.gridColumn = options.position.x + ' / span ' + options.size.width;
			cell.style.gridRow = options.position.y + ' / span ' + options.size.height;
		}
		else
		{
			cell.setAttribute( 'grid-x', ( options.position.x || 1 ) );
			cell.setAttribute( 'grid-y', ( options.position.y || 1 ) );
			cell.setAttribute( 'grid-width', ( options.size.width || 1 ) );
			cell.setAttribute( 'grid-height', ( options.size.height || 1 ) );

			if ( options.autosize )
			{
				cell.style.width = global.cell_width + 'px';
				cell.style.height = global.cell_height + 'px';
			}
		}

		cell.querySelector( '.win' ).replaceWith( win );
		if ( modal )
			window.dmousedown[ 'cell_detach' ]( cell, true );
		else
			grid.appendChild( cell );

		// Tabs
		var tabs = cell.querySelectorAll( '[tab-target]' );
		Array.prototype.forEach.call(
			tabs,
			( elem ) => {
				var target = elem.getAttribute( 'tab-target' );
				elem.onmousedown = () => {
					Array.prototype.forEach.call(
						tabs,
						( selem ) => {
							var starget = selem.getAttribute( 'tab-target' );
							var active = ( starget == target );

							var tab = cell.querySelector( '[tab-id="' + starget + '"]' );
							tab.classList[ active ? 'add' : 'remove' ]( 'active' );
							selem.classList[ active ? 'add' : 'remove' ]( 'active' );
						}
					);
				};
			}
		);

		// Graph
		Array.prototype.forEach.call(
			cell.querySelectorAll( '.subtitle .graph' ),
			( elem ) => {
				var frame = win.querySelector( ':scope > .frame.frame-first' );
				var graph = win.querySelector( ':scope > .frame.frame-circ' );
				if ( !frame || !graph )
					return ;

				var ref = 'active';
				elem.onmousedown = ( e ) => {
					var show = !elem.classList.contains( ref );
					elem.classList.toggle( ref );

					frame.style.display = ( show ? 'none' : 'block' );
					graph.style.display = ( show ? 'block' : 'none' );
				};
			}
		);

		// Lateral
		Array.prototype.forEach.call(
			cell.querySelectorAll( '.subtitle [show-lateral]' ),
			( elem ) => {
				var lateral = win.querySelector( ':scope > .frame.frame-lateral' );
				var child = lateral.querySelector( ':scope > [lateral="' + elem.getAttribute( 'show-lateral' ) + '"]' );
				if ( !lateral || !child )
					return ;

				var ref = 'active';
				elem.onmousedown = ( e ) => {
					win.classList.toggle( 'show-lateral' );
					var show = win.classList.contains( 'show-lateral' );
					if ( elem.classList.contains( 'icon' ) )
						elem.classList.toggle( 'active', show );

					Array.prototype.forEach.call(
						lateral.children,
						( elem ) => { elem.classList.remove( 'active' ); }
					);
					child.classList.add( 'active' );
				};
			}
		);

		// Columns Hides
		Array.prototype.forEach.call(
			cell.querySelectorAll( '[col-storage]' ),
			( table ) => {
				var name = table.getAttribute( 'col-storage' );
				var hides = localStorage[ name + '_cols' ];
				if ( hides )
					table.setAttribute( 'col-hides', hides );
			}
		);

		// Close
		Array.prototype.forEach.call(
			cell.querySelectorAll( '.close' ),
			( elem ) => { elem.onmousedown = ( e ) => { cell.remove(); }; }
		);

		cell.setAttribute( 'data-uid', cell.uid );
		var active = new MouseEvent( 'mousedown', { bubbles: true } );
		win.dispatchEvent( active );

		if ( !options.autosize )
		{
			setTimeout( () => {
				var style = window.getComputedStyle( cell, null );
				var width = Math.min( parseInt( style.getPropertyValue( 'width' ) ), document.body.offsetWidth - 50 );
				var height = Math.min( parseInt( style.getPropertyValue( 'height' ) ), document.body.offsetHeight - 100 );

				cell.style.width = width + 'px';
				cell.style.height = height + 'px';
			}, 100 );
		}

		return ( cell );
	};

	/* Cell Detach */
	window.dmousedown[ 'cell_detach' ] = ( e, force ) => {
		var cell = e;
		if ( e && e.target )
			cell = ( ( e.target.classList.contains( 'detach' ) || $.parent( e.target, '.detach' ) ) ? $.parent( e.target, '.cell' ) : cell );

		if ( !( cell instanceof HTMLElement ) && !( cell instanceof Node ) )
			return ;

		var style = window.getComputedStyle( cell, null );
		var width = Math.min( parseInt( style.getPropertyValue( 'width' ) ), document.body.offsetWidth - 50 );
		var height = Math.min( parseInt( style.getPropertyValue( 'height' ) ), document.body.offsetHeight - 100 );

		if ( cell.parentNode )
			cell.parentNode.removeChild( cell );

		var type = cell.querySelector( '.win' ).getAttribute( 'cell-type' );
		if ( type && localStorage[ type + '_size' ] )
		{
			var sizes = localStorage[ type + '_size' ].split( ':' );
			cell.style.width = sizes[ 0 ] + 'px';
			cell.style.height = sizes[ 1 ] + 'px';
		}
		else
		{
			cell.style.width = width + 'px';
			cell.style.height = height + 'px';
		}

		document.body.appendChild( cell );

		var i = global.cell_increment++;
		var top = ( cell.offsetTop + ( i * 25 ) );
		var left = ( cell.offsetLeft + ( i * 25 ) );
		if ( document.body.offsetHeight < ( top + global.cell_height ) || document.body.offsetwidth < ( left + global.cell_width ) )
			i = global.cell_increment = 0;

		cell.style.top = ( cell.offsetTop + ( i * 25 ) ) + 'px';
		cell.style.left = ( cell.offsetLeft + ( i * 25 ) ) + 'px';
	};

	/* Cell Move */
	var cell_move = false;
	window.dmousedown[ 'cell_move' ] = ( e ) => {
		var cell = $.parent( e.target, '.cell' );
		if ( ( document.body.classList.contains( 'locked' ) && cell.parentNode !== document.body ) || !e.target.matches( '.cell > .title, .cell > .title > *:not(.icon)' ) )
			return ;

		var parent = cell.parentNode;
		cell.style.opacity = .8;

		var grid_rect = grid.getBoundingClientRect();
		var cell_rect = cell.getBoundingClientRect();

		var diff, base;
		if ( parent === document.body )
		{
			base = cell_rect;
			diff = {
				x: ( e.clientX - cell_rect.x ),
				y: ( e.clientY - cell_rect.y )
			};
		}
		else
		{
			base = grid_rect;
			diff = {
				x: ( ( e.clientX - ( cell_rect.x - grid_rect.x ) ) / cell_rect.width ),
				y: ( ( e.clientY - ( cell_rect.y - grid_rect.y ) ) / cell_rect.height )
			};
		}

		cell_move = { parent: parent, cell: cell, base: base, diff: diff };
		window.getSelection().removeAllRanges();
	};

	window.dmousemove[ 'cell_move' ] = ( e ) => {
		if ( !cell_move )
			return ;

		var cell = cell_move.cell;
		var parent = cell_move.parent;
		var base = cell_move.base;
		var diff = cell_move.diff;

		var width = parseInt( cell.getAttribute( 'grid-width' ) );
		var height = parseInt( cell.getAttribute( 'grid-height' ) );

		var position = { x: 1, y: 1 };
		var cursor = { x: ( e.clientX - base.x ), y: ( e.clientY - base.y ) };

		if ( parent === document.body )
		{
			cell.style.top = ( cursor.y - diff.y + base.y ) + 'px';
			cell.style.left = ( cursor.x - diff.x + base.x ) + 'px';

			Array.prototype.forEach.call(
				grid.querySelectorAll( '.empty-cell' ),
				( elem ) => {
					var rect = elem.getBoundingClientRect();
					var checkX = ( rect.x < e.clientX && ( rect.width + rect.x ) > e.clientX );
					var checkY = ( rect.y < e.clientY && ( rect.height + rect.y ) > e.clientY );
					elem.classList.toggle( 'active', ( e.ctrlKey && checkX && checkY ) );
				}
			);
		}
		else
		{
			var plurality = 0;
			for ( var x = 1; x <= global.grid_size.x; ++x )
			{
				var tmp2 = 0;
				for ( var i = x; i < ( x + width ) && i <= global.grid_size.x; ++i )
					tmp2 += ( global.grid_template.x[ i - 1 ] / 100 * base.width );

				var tmp = ( global.grid_template.x[ x - 1 ] / 100 * base.width );
				if ( ( cursor.x - ( ( tmp2 / 3 ) ) ) < plurality )
					break ;

				position.x = x;
				plurality += tmp;
			}

			var plurality = 0;
			for ( var y = 1; y <= global.grid_size.y; ++y )
			{
				var tmp = ( global.grid_template.y[ y - 1 ] / 100 * base.height );
				if ( cursor.y < plurality )
					break ;

				position.y = y;
				plurality += tmp;
			}

			cell.style.gridArea = position.y + ' / ' + position.x + ' / span ' + height + ' / span ' + width;
			cell.setAttribute( 'grid-x', position.x );
			cell.setAttribute( 'grid-y', position.y );
		}

		window.getSelection().removeAllRanges();
	};

	window.dmouseup[ 'cell_move' ] = ( e ) => {
		if ( !cell_move )
			return ;

		var cell = cell_move.cell;
		cell.style.opacity = null;

		if ( e.ctrlKey )
		{
			var target = grid.querySelector( '.empty-cell.active' );
			if ( target )
			{
				var x = parseInt( target.getAttribute( 'grid-x' ) );
				var y = parseInt( target.getAttribute( 'grid-y' ) );

				var width = parseInt( cell.getAttribute( 'grid-width' ) );
				var height = parseInt( cell.getAttribute( 'grid-height' ) );

				cell.parentNode.removeChild( cell );

				cell.style.top = null;
				cell.style.left = null;
				cell.style.width = null;
				cell.style.height = null;
				cell.style.gridArea = y + ' / ' + x + ' / span ' + height + ' / span ' + width;

				grid.prepend( cell );
			}
		}

		Array.prototype.forEach.call(
			grid.querySelectorAll( '.empty-cell' ),
			( elem ) => { elem.classList.remove( 'active' ); }
		);

		cell_move = false;
	};

	/* Cell Resize */
	var cell_resize = false;
	window.dmousedown[ 'cell_resize' ] = ( e ) => {
		if ( ( document.body.classList.contains( 'locked' ) && e.target.parentNode.parentNode !== document.body ) || !e.target.classList.contains( 'resize' ) )
			return ;

		var cell = e.target.parentNode;
		var parent = cell.parentNode;
		cell.style.opacity = .8;

		var resize_rect = e.target.getBoundingClientRect();
		var cell_rect = cell.getBoundingClientRect();
		var grid_rect = grid.getBoundingClientRect();

		var diff, base;
		if ( parent === document.body )
		{
			var style = window.getComputedStyle( grid, null );
			var bottom = parseInt( style.getPropertyValue( 'bottom' ) );
			var right = parseInt( style.getPropertyValue( 'right' ) );

			base = cell_rect;
			diff = {
				x:	( ( typeof( right ) === 'number' ) ? -( right - resize_rect.width / 2 ) : 0 ),
				y:	( ( typeof( bottom ) === 'number' ) ? -( bottom + resize_rect.height ) : 0 )
			};
		}
		else
		{
			base = grid_rect;
			diff = {
				x: ( ( e.clientX - ( cell_rect.x - grid_rect.x ) ) / cell_rect.width ),
				y: ( ( e.clientY - ( cell_rect.y - grid_rect.y ) ) / cell_rect.height )
			};
		}

		cell_resize = { parent: parent, cell: cell, base: base, diff: diff };
		window.getSelection().removeAllRanges();
	};

	window.dmousemove[ 'cell_resize' ] = ( e ) => {
		if ( !cell_resize )
			return ;

		var cell = cell_resize.cell;
		var parent = cell_resize.parent;
		var base = cell_resize.base;
		var diff = cell_resize.diff;

		var position = { x: parseInt( cell.getAttribute( 'grid-x' ) ), y: parseInt( cell.getAttribute( 'grid-y' ) ) };

		var size = { width: 1, height: 1 };
		var cursor = { x: ( e.clientX - base.x ), y: ( e.clientY - base.y ) };

		if ( parent === document.body )
		{
			cell.style.width = ( cursor.x + diff.x ) + 'px';
			cell.style.height = ( cursor.y + diff.y ) + 'px';
		}
		else
		{
			var plurality = 0;
			for ( var x = 1; x <= global.grid_size.x; ++x )
			{
				var tmp = ( global.grid_template.x[ x - 1 ] / 100 * base.width );
				if ( cursor.x < plurality )
					break ;

				size.width = ( x + 1 ) - position.x;
				plurality += tmp;
			}

			var plurality = 0;
			for ( var y = 1; y <= global.grid_size.y; ++y )
			{
				var tmp = ( global.grid_template.y[ y - 1 ] / 100 * base.height );
				if ( cursor.y < plurality )
					break ;

				size.height = ( y + 1 ) - position.y;
				plurality += tmp;
			}

			size.width = Math.max( 1, size.width );
			size.height = Math.max( 1, size.height );

			cell.style.gridArea = position.y + ' / ' + position.x + ' / span ' + size.height + ' / span ' + size.width;
			cell.setAttribute( 'grid-width', size.width );
			cell.setAttribute( 'grid-height', size.height );
		}

		window.getSelection().removeAllRanges();
	};

	window.dmouseup[ 'cell_resize' ] = ( e ) => {
		if ( !cell_resize )
			return ;

		var cell = cell_resize.cell;
		cell.style.opacity = 1;

		var type = cell.querySelector( '.win' ).getAttribute( 'cell-type' );
		if ( cell.parentNode === document.body && type && type != 'confirm' )
			localStorage[ type + '_size' ] = cell.offsetWidth + ':' + cell.offsetHeight;

		cell_resize = false;
	};

	/* Cell Search */
	window.cell_search = ( uid ) => {
		var cell = false;
		Array.prototype.forEach.call(
			document.querySelectorAll( '.cell' ),
			( elem ) => {
				if ( elem.getAttribute( 'data-uid' ) === uid )
					cell = elem;
			}
		);

		return ( cell );
	};

	/* Cell Close */
	window.cell_close = ( uid ) => {
		var cell = window.cell_search( uid );
		if ( !cell )
			return ;

		var close = cell.querySelector( '.close' );
		if ( close && typeof( close.onmousedown ) === 'function' )
			close.onmousedown();
		else
			cell.remove();
	};

	grid_rule();
} );
