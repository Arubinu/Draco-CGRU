document.addEventListener( 'DOMContentLoadedAfanasy', ( afanasy ) => {
	var node_sleep = 0;
	var node_sleep_interval = 2000;
	var node_active_interval = 500;
	var [ tools, config, global ] = [ afanasy.tools, afanasy.config, afanasy.global ];
	window.LogsNode = ( windows, force, active ) => new Promise( ( resolve, reject ) => {
		if ( !windows || !windows.length )
			return ( reject( false ) );

		var pre_update = ( win, tables ) => {};
		var post_update = function( win, tables ) {
			tools.columns( ...arguments );
		};

		var update = ( parent, elem, data, more ) => {
			var progress = { infos: { total: 0 } };

			if ( elem )
			{
				//elem.setAttribute( 'node-id', data.id ); // soucis de duplication
				elem.querySelector( '.col-id' ).textContent = ( data.id || config.cell_empty );
				elem.querySelector( '.col-cycle' ).textContent = data.cycle;
				elem.querySelector( '.col-count' ).textContent = data.count;

				elem.querySelector( '.col-register' ).textContent = ( data.register || 0 ).toDate( config.cell_empty );
				elem.querySelector( '.col-activity' ).textContent = ( data.activity || 0 ).toDate( config.cell_empty );

				if ( !elem.parentNode )
					elem.querySelector( '.col-msg' ).innerHTML = data.msg; // json stringify
			}

			++progress.infos.total;
			progress.infos[ more ] = 1;

			return ( progress );
		};

		var purge = ( parent ) => {
			if ( !parent )
				return ;

			Array.prototype.forEach.call(
				Array.prototype.slice.call( parent.querySelectorAll( ':scope > tr[node-id]:not([row-template])' ) ).reverse().slice( config.logs_max ),
				( tr ) => { tr.remove(); }
			);
		};

		var result = ( obj ) => {
			tools.table( windows, ( win, tables ) => {
				var progress = {};
				pre_update( win, tables );
				Array.prototype.forEach.call(
					Object.keys( obj ),
					( head ) => {
						var data = [];
						Array.prototype.forEach.call(
							( obj[ head ] || [] ),
							( item ) => { data.unshift( item ); }
						);

						var table = false;
						Array.prototype.forEach.call(
							tables,
							( elem ) => {
								if ( !table && elem.elem.getAttribute( 'node-head' ) == head )
									table = elem;
							}
						);

						Array.prototype.forEach.call(
							data,
							( log ) => {
								if ( log.id < data[ 0 ].id )
									return ;

								var id = ( log.id || '0' );
								var tr = ( table && table.tbody.querySelector( '[node-id^="' + id + '-"]' ) );
								if ( table && !tr )
								{
									tr = table.template.cloneNode( true );
									tr.setAttribute( 'node-id', id + '-' + ( log.cycle || '0' ) );
								}

								tools.merge( progress, update( ( table && table.tbody ), tr, log, head ) );
								if ( table && tr && !tr.parentNode )
								{
									var last = ( table && table.tbody.querySelector( '[node-id]:last-child' ) );
									tr.classList.add( 'tr-' + ( ( last && last.classList.contains( 'tr-odd' ) ) ? 'even' : 'odd' ) );
									table.tbody.appendChild( tr );
								}
							}
						);
						purge( table.tbody );
					}
				);

				tools.infos_print( win, progress.infos, true );
				post_update( win, tables );
			} );
			resolve( { refresh: true } );
		};

		var now = Date.now();
		var refresh = ( force || !node_sleep );
		refresh = ( refresh || ( active && ( now - node_active_interval ) > node_sleep ) );
		refresh = ( refresh || ( !active && ( now - node_sleep_interval ) > node_sleep ) );
		if ( refresh )
		{
			node_sleep = now;
			result( afanasy.global.logs );
		}
		else
		{
			tools.table( windows, pre_update, post_update );
			resolve( { refresh: false } );
		}
	} );

	window.dmousedown[ 'cell-logs' ] = ( e ) => {
		var container = $.parent( e.target, '.cell' );
		if ( container )
		{
			var table = container.querySelector( '.win .frame-tabs > [tab-id].active > table, .win .frame-first > table' );
			if ( e.target.classList.contains( 'clean' ) || e.target.parentNode.classList.contains( 'clean' ) )
			{
				afanasy.global.logs[ table.getAttribute( 'node-head' ) ] = [];
				Array.prototype.forEach.call(
					table.querySelectorAll( ':scope > tbody > tr:not([row-template])' ),
					( tr ) => { tr.remove(); }
				);
			}
		}
	};
} );
