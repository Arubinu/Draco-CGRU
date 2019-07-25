document.addEventListener( 'DOMContentLoadedAfanasy', ( afanasy ) => {
	var [ tools, templates ] = [ afanasy.tools, afanasy.templates ];

	/* Table Search */
	window.dkeyup[ 'table_search' ] = ( e ) => {
		if ( !e.target.matches( '.search input' ) )
			return ;

		var val = e.target.value.trim();
		var cell = $.parent( e.target, '.cell' );

		Array.prototype.forEach.call(
			cell.querySelectorAll( 'table > tbody > tr:not([row-template])' ),
			( tr ) => {
				var show = ( !val || tr.innerText.indexOf( val ) >= 0 );
				tr.classList.toggle( 'search-hide', !show );
			}
		);
	};

	/* Table Resize */
	var table_resize_th;
	var table_resize_start_offset;
	window.table_resize = () => {
		Array.prototype.forEach.call(
			document.querySelectorAll( 'table th' ),
			( th ) => {
				if ( th.querySelectorAll( '.table-resize' ).length )
					return ;

				//th.style.position = 'relative';
				//th.style.zIndex = '10';

				var grip = document.createElement( 'div' );
				grip.classList.add( 'table-resize' );
				grip.innerHTML = '&nbsp;';
				grip.style.position = 'absolute';
				grip.style.top = 0;
				grip.style.right = 0;
				grip.style.bottom = 0;
				grip.style.width = '5px';
				grip.style.background = 'initial';
				grip.style.cursor = 'col-resize';
				grip.addEventListener( 'mousedown', ( e ) => {
					table_resize_th = th;
					table_resize_start_offset = ( th.offsetWidth - e.pageX );
				} );

				th.appendChild( grip );
			}
		);
	};
	window.dmutation[ 'table_resize' ] = window.table_resize;

	window.dmousemove[ 'table_resize' ] = ( e ) => {
		if ( table_resize_th )
			table_resize_th.style.width = ( table_resize_start_offset + e.pageX ) + 'px';
	};

	window.dmouseup[ 'table_resize' ] = () => {
		table_resize_th = false;
	};

	/* Table Selection */
	var table_selection = () => {
		var ref = 'selected';
		var table = down = start = selected = parent = false;

		var is_tr = ( table, elem ) => {
			var check = ( typeof( elem ) === 'object' && elem instanceof Element && 'tagName' in elem && typeof( elem.tagName ) === 'string' && elem.tagName.toUpperCase() == 'TR' );
			if ( check )
				check = ( get_tr_pos( table, elem ) >= 0 );

			return ( check );
		};

		var get_between = ( table, elem ) => {
			var pos = -1;
			var opos = -1;
			if ( !is_tr( table, elem ) || ( pos = get_tr_pos( table, elem ) ) < 0 || ( opos = get_tr_pos( table, start ) ) < 0 )
				return ( [] );

			if ( opos < pos )
			{
				var tmp = opos;
				opos = pos;
				pos = tmp;
			}

			return ( Array.prototype.slice.call( get_trs( table ) ).slice( pos, ++opos ) );
		};

		var get_trs = ( table, selected, hide ) => table.querySelectorAll( ':scope > tbody > tr' + ( selected ? '.selected' : '' ) + ( hide ? '' : ':not(.search-hide):not(.filter-hide)' ) );
		var get_tr = ( table, event ) => {
			var paths = event;
			if ( typeof( event ) === 'object' && event instanceof MouseEvent && typeof( event.composedPath ) === 'function' )
				paths = event.composedPath();

			var elem = false;
			if ( typeof( paths ) !== 'object' || !Array.isArray( paths ) )
				return ( elem );

			Array.prototype.forEach.call(
				paths,
				( path ) => {
					if ( !elem && is_tr( table, path ) )
						elem = path;
				}
			);

			return ( elem );
		};
		var get_tr_pos = ( table, elem, elems ) => {
			var pos = -1;
			if ( typeof( elems ) !== 'object' || !Array.isArray( elems ) )
				elems = get_trs( table );

			Array.prototype.forEach.call(
				elems,
				( item, index ) => {
					if ( item === elem )
						pos = index;
				}
			);

			return ( pos );
		};

		var get_has = ( parent, elem ) => ( Array.prototype.slice.call( parent.children ).indexOf( elem ) >= 0 );
		var get_index = ( elem ) => ( Array.prototype.slice.call( elem.parentNode.children ).indexOf( elem ) );
		var get_next_until = ( first, last, hide ) => {
			var siblings = [];
			var elem = first.nextElementSibling;

			while ( elem )
			{
				if ( elem === last )
					break ;

				if ( hide || elem.matches( ':scope:not(.search-hide):not(.filter-hide)' ) )
					siblings.push( elem );
				elem = elem.nextElementSibling;
			}

			return ( siblings );
		};

		var last = false;
		var pre_selection = false;
		window.dmousedown[ 'table_selection' ] = ( e ) => {
			table = ( ( e.target.tagName.toUpperCase() === 'TABLE' ) ? e.target : $.parent( e.target, 'table' ) );
			if ( !table || !table.parentElement || !table.parentElement.classList.contains( 'frame' ) )
				return ;

			var tr = get_tr( table, e );
			var trs = get_trs( table, true );
			if ( e.button == 2 && ( !tr || ( tr && tr.classList.contains( 'selected' ) ) ) )
				return ( down = false );

			down = false;
			start = false;
			selected = false;
			parent = table.parentElement;
			win = $.parent( table, '.win' );

			pre_selection = tr.classList.contains( ref );
			selected = ( ( e.button !== 2 && tr && trs.length === 1 ) ? pre_selection : false );
			if ( tr && e.shiftKey )
			{
				if ( last && get_index( last ) != get_index( tr ) && get_has( tr.parentNode, last ) )
				{
					var elems;
					if ( get_index( last ) > get_index( tr ) )
						elems = get_next_until( tr, last );
					else
						elems = get_next_until( last, tr );

					elems.push( tr );
					elems.push( last );
					Array.prototype.forEach.call( elems, ( elem ) => { elem.classList.toggle( ref, true ); } );
				}
				else
					tr.classList.toggle( ref );

				tr = last;
				last = tr.classList.contains( ref ) ? tr : false;
				window.getSelection().removeAllRanges();
			}
			else if ( !e.ctrlKey )
				Array.prototype.forEach.call( get_trs( table, true, true ), ( elem ) => elem.classList.remove( ref ) );

			if ( !tr )
				return ( table.onmousedown && table.onmousedown( e, true ) );

			//selected = tr.classList.contains( ref );
			if ( !selected )
				tr.classList.add( ref );

			start = tr;
			if ( e.button === 0 )
				down = true;
			if ( win ) tools.infos_print( win );
		};

		var mousemove = ( e, up ) => {
			var tr = get_tr( table, e );
			var trs = get_trs( table );
			var between = [ start ];
			if ( tr !== start )
			{
				selected = false;
				between = get_between( table, tr );
			}

			if ( ( ( !e.shiftKey && !e.ctrlKey ) || ( !up && tr !== start ) ) && !selected )
			{
				Array.prototype.forEach.call( between, ( elem ) => elem.classList.add( ref ) );
				Array.prototype.forEach.call(
					trs,
					( elem ) => {
						if ( get_tr_pos( table, elem, between ) < 0 )
							elem.classList.remove( ref );
					}
				);
				Array.prototype.forEach.call( between, ( elem ) => elem.classList.add( ref ) );
			}

			if ( up )
				down = false;
			if ( win ) tools.infos_print( win );
		};

		window.dmousemove[ 'table_selection' ] = ( e ) => {
			if ( !down || e.target !== table && !$.parent( e.target, table, parent ) )
				return ;
			mousemove( e );
		};

		window.dmouseup[ 'table_selection' ] = ( e ) => {
			if ( !down || e.target !== table && !$.parent( e.target, table, parent ) )
				return ;
			mousemove( e, true );

			var tr = get_tr( table, e );
			if ( !e.shiftKey && tr === start && pre_selection )
				start.classList.remove( ref );
			else
				last = tr;
		};
	};

	/* Table Sort */
	window.table_sort = ( e ) => {
		var target = ( ( e instanceof Event ) ? e.target : e );
		var button = ( ( e instanceof Event ) ? e.button : 0 );
		if ( button || !target.matches( '.win table > thead > tr > th:not([col-name=icon]), .win table > thead > tr > th:not([col-name=icon]) *:not(.table-resize)' ) )
			return ;

		var elem = ( ( target.tagName.toUpperCase() == 'TH' ) ? target : $.parent( target, 'th' ) );
		var table = $.parent( elem, 'table' );

		var sort = elem.getAttribute( 'col-sort' );
		var sort = ( ( [ 'up', 'down' ].indexOf( sort || '' ) >= 0 ) ? sort : false );
		if ( !sort )
			sort = 'down';
		else if ( sort == 'down' )
			sort = 'up';
		else
			sort = false;

		Array.prototype.forEach.call(
			table.querySelectorAll( 'th[col-name]' ),
			( th ) => { th.removeAttribute( 'col-sort' ); }
		);

		if ( sort )
			elem.setAttribute( 'col-sort', sort );

		afanasy.functions.table_sort( table );
	};
	window.dmousedown[ 'table_sort' ] = window.table_sort;

	/* Table Columns */
	window.dmousedown[ 'table_columns' ] = ( e ) => {
		var table = $.parent( e.target, 'table' );
		if ( e.button !== 2 || e.target.tagName.toUpperCase() !== 'TH' || !table || !table.hasAttribute( 'context-columns' ) )
			return ;

		var columns = {};
		var hides = ( table.getAttribute( 'col-hides' ) || '' ).split( '|' );
		Array.prototype.forEach.call(
			table.querySelectorAll( 'th[col-name]' ),
			( elem, index ) => {
				var name = elem.getAttribute( 'col-name' );
				if ( elem.textContent.replace( /(&nbsp;)/g, '' ).trim() )
				{
					columns[ name ] = {
						elem: elem,
						text: elem.textContent,
						active: ( hides.indexOf( name ) < 0 )
					};
				}
			}
		);

		var menu = window.menu_display( templates.get( 'cell-menu-columns', columns, true ), e.clientX, e.clientY, { class: 'menu menu-stay context-columns' } );
		menu.onclick = ( e ) => {
			var li = ( ( e.target.tagName.toUpperCase() == 'LI' ) ? e.target : $.parent( e.target, 'li', menu ) );
			if ( !li || li.tagName.toUpperCase() != 'LI' )
				return ;

			li.classList.toggle( 'active' );
			var active = li.classList.contains( 'active' );
			var name = li.getAttribute( 'col-name' );
			var pos = hides.indexOf( name );
			if ( active && pos >= 0 )
				delete hides[ pos ];
			else if ( !active && pos < 0 )
				hides.push( name );

			hides = Array.prototype.filter.call( hides, String );
			table.setAttribute( 'col-hides', hides.join( '|' ) );

			var name = table.getAttribute( 'col-storage' );
			if ( name )
				localStorage[ name + '_cols' ] = table.getAttribute( 'col-hides' );
		};
	};

	table_resize();
	table_selection();
} );
