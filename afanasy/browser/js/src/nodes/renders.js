document.addEventListener( 'DOMContentLoadedAfanasy', ( afanasy ) => {
	var node_sleep = 0;
	var node_sleep_interval = 5000;
	var node_active_interval = 1000;
	var [ tools, config, global, system ] = [ afanasy.tools, afanasy.config, afanasy.global, afanasy.system ];
	window.RendersNode = ( windows, force, active ) => new Promise( ( resolve, reject ) => {
		if ( !windows || !windows.length )
			return ( reject( false ) );

		var onroll = function() {
			this.parentNode.classList.toggle( 'children-roll' );
		};

		var pre_update = ( win, tables ) => {};
		var post_update = function( win, tables ) {
			tools.columns( ...arguments );
		};

		var update = ( parent, elem, data, cid ) => {
			var netifs = data.netifs;
			var count = netifs.length;
			if ( !count )
				return ( {} );

			var netif = netifs[ 0 ];
			var state = ( data.state || config.cell_empty ).trim().split( ' ' ).slice( -1 )[ 0 ];
			var progress = { infos: { total: 0 }, length: 0, total: 0, online: 0, running: 0, offline: 0, null: 0 };

			var online = ( state === 'ONL' );
			var running = ( state === 'RUN' );
			var offline = ( state === 'OFF' );
			var percent = ( netif.p_percentage || 0 );
			var tasks = 0;
			if ( typeof( data.task_start_finish_time ) === 'number' && typeof( data.host.max_tasks ) === 'number' )
			tasks = data.task_start_finish_time + ' / ' + data.host.max_tasks;
			var capacity = 0;
			if ( typeof( data.capacity_used ) === 'number' && typeof( data.host.capacity ) === 'number' )
				capacity = data.capacity_used + ' / ' + data.host.capacity;

			elem.querySelector( '.col-id' ).textContent = data.id;
			elem.querySelector( '.col-name' ).textContent = data.name;
			elem.querySelector( '.col-user' ).textContent = data.user_name;
			elem.querySelector( '.col-status' ).textContent = state;
			elem.querySelector( '.col-os' ).textContent = ( data.host.os || config.cell_empty );
			elem.querySelector( '.col-tasks' ).textContent = tasks;

			elem.querySelector( '.col-register' ).textContent = ( data.time_register || 0 ).toDate( config.cell_empty );
			elem.querySelector( '.col-launch' ).textContent = ( data.time_launch || 0 ).toDate( config.cell_empty );
			elem.querySelector( '.col-update' ).textContent = ( data.time_update || 0 ).toDate( config.cell_empty );
			elem.querySelector( '.col-idle' ).textContent = ( data.idle_time || 0 ).toDate( config.cell_empty );
			elem.querySelector( '.col-busy' ).textContent = ( data.busy_time || 0 ).toDate( config.cell_empty );
			elem.querySelector( '.col-wol-op' ).textContent = ( data.wol_operation_time || 0 ).toDate( config.cell_empty );

			elem.querySelector( '.col-idle-cpu' ).textContent = ( ( typeof( data.host.nimby_idle_cpu ) === 'number' ) ? data.host.nimby_idle_cpu : config.cell_empty );
			elem.querySelector( '.col-busy-cpu' ).textContent = ( ( typeof( data.host.nimby_busy_cpu ) === 'number' ) ? data.host.nimby_busy_cpu : config.cell_empty );
			elem.querySelector( '.col-idle-mem' ).textContent = ( ( typeof( data.host.nimby_idle_mem ) === 'number' ) ? data.host.nimby_idle_mem : config.cell_empty );
			elem.querySelector( '.col-busy-mem' ).textContent = ( ( typeof( data.host.nimby_busy_mem ) === 'number' ) ? data.host.nimby_busy_mem : config.cell_empty );
			elem.querySelector( '.col-idle-swp' ).textContent = ( ( typeof( data.host.nimby_idle_swp ) === 'number' ) ? data.host.nimby_idle_swp : config.cell_empty );
			elem.querySelector( '.col-busy-swp' ).textContent = ( ( typeof( data.host.nimby_busy_swp ) === 'number' ) ? data.host.nimby_busy_swp : config.cell_empty );
			elem.querySelector( '.col-idle-hddgb' ).textContent = ( ( typeof( data.host.nimby_idle_hddgb ) === 'number' ) ? data.host.nimby_idle_hddgb : config.cell_empty );
			elem.querySelector( '.col-busy-hddgb' ).textContent = ( ( typeof( data.host.nimby_busy_hddgb ) === 'number' ) ? data.host.nimby_busy_hddgb : config.cell_empty );
			elem.querySelector( '.col-idle-hddio' ).textContent = ( ( typeof( data.host.nimby_idle_hddio ) === 'number' ) ? data.host.nimby_idle_hddio : config.cell_empty );
			elem.querySelector( '.col-busy-hddio' ).textContent = ( ( typeof( data.host.nimby_busy_hddio ) === 'number' ) ? data.host.nimby_busy_hddio : config.cell_empty );

			elem.querySelector( '.col-capacity' ).textContent = ( capacity || config.cell_empty );
			elem.querySelector( '.col-priority' ).textContent = ( data.priority || config.cell_empty );

			var details = '';
			elem.querySelector( '.col-details' ).textContent = details;

			var states = afanasy.config[ 'states' ];
			var tmp = elem.getAttribute( 'node-status' );
			if ( tmp != state || !( !tmp && !state ) )
				elem.setAttribute( 'node-status', state );
			elem.querySelector( '.col-status' ).textContent = ( ( typeof( states[ state ] ) !== 'undefined' ) ? afanasy.langs.get( states[ state ] ) : config.cell_empty );

			var address = false;
			var address_first = false;
			var family = data.address.family;
			Array.prototype.forEach.call(
				netif.addresses,
				( item ) => {
					if ( item.family == family )
					{
						if ( !address_first && check )
						{
							var check = ( item.ip.slice( -35 ) !== ':0000:0000:0000:0000:0000:0000:0000' );
							check = ( check && item.ip.slice( -2 ) !== '.0' );
							check = ( check && item.ip.slice( -4 ) !== '.255' );
							if ( check )
								address_first = item;
						}
						if ( !address && item.ip == data.address.ip )
							address = item;
					}
				}
			);
			if ( !address )
				address = ( address_first ? address_first : data.address );
			if ( address.family == 6 )
				address.ip = '[' + address.ip + ']';
			elem.querySelector( '.col-interface' ).textContent = netif.name;
			elem.querySelector( '.col-mac' ).textContent = ( netif.mac || config.cell_empty );
			elem.querySelector( '.col-ip' ).textContent = ( address.ip + ( address.port ? ':' + address.port : '' ) );

			++progress.total;
			progress.online += ( online ? 1 : 0 );
			progress.running += ( running ? 1 : 0 );
			progress.offline += ( offline ? 1 : 0 );
			progress.null += ( ( online || running || offline ) ? 0 : 1 );

			tools.infos_pile( data, cid, progress.infos );
			global.nodes_data[ 'renders' ][ data.id ] = { name: data.name, data: data };
			return ( progress );
		};

		var purge = ( parent, data ) => {};
		var result = ( obj, args, event ) => {
			if ( obj === null )
				return ( reject( event.target.status ) );

			var data = {};
			var keys = [];
			Array.prototype.forEach.call(
				obj.renders,
				( render ) => {
					data[ render.id.toString() ] = render;
					keys.push( render.id.toString() );
				}
			);

			var progress = {};
			tools.table( windows, ( win, tables ) => {
				var sort = false;
				var checked = [];
				pre_update( win, tables );
				Array.prototype.forEach.call(
					tables[ 0 ].tbody.querySelectorAll( ':scope > tr[node-id]:not([node-id*=":"]):not([row-template])' ),
					( tr ) => {
						var id = tr.getAttribute( 'node-id' ).toString();
						if ( keys.indexOf( id ) < 0 )
						{
							delete global.nodes_data[ 'renders' ][ id ];
							return ( tr.remove() );
						}

						checked.push( id );
						tools.merge( progress, update( tables[ 0 ].tbody, tr, data[ id ] ) );
						purge( tables[ 0 ].tbody, data[ id ] );
					}
				);

				Array.prototype.forEach.call(
					Object.keys( data ),
					( id ) => {
						if ( checked.indexOf( id ) >= 0 )
							return ;

						var tr = tables[ 0 ].template.cloneNode( true );
						tr.setAttribute( 'node-id', id );
						tables[ 0 ].tbody.appendChild( tr );
						sort = true;

						tools.merge( progress, update( tables[ 0 ].tbody, tr, data[ id ] ) );
						purge( tables[ 0 ].tbody, data[ id ] );
					}
				);

				if ( sort )
					window.table_sort( tables[ 0 ].elem );

				var progress_order = ( index, progress ) => {
					var ret = false;
					switch ( index )
					{
						case 1: ret = progress.online; break ;
						case 2: ret = progress.running; break ;
						case 3: ret = progress.offline; break ;
						case 4: ret = progress.null; break ;
					}

					return ( ret );
				};

				tools.infos_print( win, progress.infos );
				win.querySelector( '.frame-circ .pie' ).setAttribute( 'style', tools.progress2bar( progress, progress_order ) );
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
			var get = { type: 'renders' };
			system.xhr.send( { get: get }, result );
		}
		else
		{
			tools.table( windows, pre_update, post_update );
			resolve( { refresh: false } );
		}
	} );

	window.RendersContext = ( menu, win, lines, other ) => {
		if ( other && !lines.length )
			menu.querySelector( '[name="render-menu"]' ).classList.add( 'disabled' );
	};
} );
