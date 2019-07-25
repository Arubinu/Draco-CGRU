document.addEventListener( 'DOMContentLoadedAfanasy', ( afanasy ) => {
	var node_sleep = 0;
	var node_sleep_interval = 20000;
	var node_active_interval = 1000;
	var [ tools, config, global, system ] = [ afanasy.tools, afanasy.config, afanasy.global, afanasy.system ];
	window.UsersNode = ( windows, force, active ) => new Promise( ( resolve, reject ) => {
		if ( !windows || !windows.length )
			return ( reject( false ) );

		var onroll = function() {
			this.parentNode.classList.toggle( 'children-roll' );
		};

		var pre_update = ( win, tables ) => {};
		var post_update = function( win, tables ) {
			tools.columns( ...arguments );
		};

		var update = ( parent, elem, data, more ) => {
			var progress = { infos: { total: 0 } };
			var solving = ( ( data.solve_method == 'solve_priority' ) ? 'Priority' : 'Order' );
			solving += ', ' + ( ( data.solve_need == 'solve_capacity' ) ? 'Capacity' : 'RunTasks' );

			elem.querySelector( '.col-id' ).textContent = data.id;
			elem.querySelector( '.col-user' ).textContent = data.name;
			elem.querySelector( '.col-jobs' ).textContent = ( data.jobs_num || 0 );

			elem.querySelector( '.col-register' ).textContent = ( data.time_register || 0 ).toDate( config.cell_empty );
			elem.querySelector( '.col-activity' ).textContent = ( data.time_activity || 0 ).toDate( config.cell_empty );

			elem.querySelector( '.col-host' ).textContent = ( data.host_name || config.cell_empty );
			elem.querySelector( '.col-solving' ).textContent = solving;
			elem.querySelector( '.col-priority' ).textContent = ( data.priority || config.cell_empty );

			var details = '';
			var errors_isset = tools.isset( data.task_max_run_time, data.errors_forgive_time, data.errors_avoid_host, data.errors_task_same_host, data.errors_retries );
			if ( more && ( primary || errors_isset ) )
			{
				details += 'ErrorsForgiveTime: ' + tools.time.unit( data.errors_forgive_time );
				details += ' | ErrorsSolving( Avoid: ' + data.errors_avoid_host + ' Task: ' + data.errors_task_same_host + ' Retries: ' + data.errors_retries + ' )';
			}
			elem.querySelector( '.col-details' ).textContent = details;

			++progress.infos.total;
			global.nodes_data[ 'users' ][ data.id ] = { name: data.name, data: data };
			return ( progress );
		};

		var purge = ( parent, data ) => {};
		var result = ( obj, args, event ) => {
			if ( obj === null )
				return ( reject( event.target.status ) );

			var data = {};
			var keys = [];
			Array.prototype.forEach.call(
				obj.users,
				( user ) => {
					data[ user.id.toString() ] = user;
					keys.push( user.id.toString() );
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
							delete global.nodes_data[ 'users' ][ id ];
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

				tools.infos_print( win, progress.infos );
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
			var get = { type: 'users' };
			system.xhr.send( { get: get }, result );
		}
		else
		{
			tools.table( windows, pre_update, post_update );
			resolve( { refresh: false } );
		}
	} );

	window.UsersContext = ( menu, win, lines, other ) => {
		if ( other && !lines.length )
			menu.querySelector( '[name="user-menu"]' ).classList.add( 'disabled' );
	};
} );
