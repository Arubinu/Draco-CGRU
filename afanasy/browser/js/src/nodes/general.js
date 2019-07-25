document.addEventListener( 'DOMContentLoadedAfanasy', ( afanasy ) => {
	window.ArrowContext = ( menu, win, lines, other ) => {
		var cell = win.parentNode;
		var type = win.getAttribute( 'cell-type' );

		var pinned_filters = menu.querySelector( '[name="selected-filter"]' );
		var clear_filter = menu.querySelector( '[name="clear-filter"]' );

		// Generate the list of filters
		var attr_filter = 'selected-filter';
		var tmp = afanasy.functions.get_filters( type );
		var selected = decodeURIComponent( win.getAttribute( attr_filter ) || '' );
		if ( !( selected in tmp ) )
		{
			selected = '';
			win.removeAttribute( attr_filter );
		}

		var i = 0;
		var filters = {
			'no-filter': {
				name:	'cell-menu-arrow-other.selected-filter.no-filter',
				icon:	'cross',
				class:	( selected ? '' : 'active' )
			}
		};
		if ( Object.keys( tmp ).length )
		{
			filters.s1 = 'separator';
			Array.prototype.forEach.call(
				Object.keys( tmp ),
				( key ) => {
					filters[ 'selected-filter_' + ++i ] = {
						name:	key,
						icon:	'flag',
						class:	( ( key === selected ) ? 'active' : '' ),
						attrs: {
							'filter-name': encodeURIComponent( key )
						}
					};
				}
			);
		}

		var html = Handlebars.compile( '{{> menu-each this}}' )( { children: filters } );
		pinned_filters.querySelector( 'ul' ).innerHTML = html;

		// Change filter
		Array.prototype.forEach.call(
			pinned_filters.querySelectorAll( 'ul > li[name]' ),
			( elem ) => {
				elem.onclick = ( event ) => {
					var name = elem.getAttribute( 'filter-name' );
					if ( !name || name == 'no-filter' )
						win.removeAttribute( attr_filter );
					else
						win.setAttribute( attr_filter, name );
				};
			}
		);

		// Clear filter
		if ( selected )
		{
			clear_filter.onclick = ( event ) => {
				delete tmp[ selected ];
				afanasy.functions.set_filters( type, tmp );
			};
		}
		else
			clear_filter.classList.add( 'disabled' );
	};
} );
