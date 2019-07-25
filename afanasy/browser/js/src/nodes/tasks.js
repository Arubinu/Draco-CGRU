document.addEventListener( 'DOMContentLoadedAfanasy', ( afanasy ) => {
	var node_sleep = 0;
	var node_sleep_interval = 20000;
	var node_active_interval = 1000;
	var [ tools, config, global, system ] = [ afanasy.tools, afanasy.config, afanasy.global, afanasy.system ];
	window.TasksNode = ( windows, force, active ) => new Promise( ( resolve, reject ) => {
		if ( !windows || !windows.length )
			return ( reject( false ) );

		var onroll = function() {
			this.parentNode.classList.toggle( 'children-roll' );
		};

		var pre_update = ( win, tables ) => {};
		var post_update = function( win, tables ) {
			tools.columns( ...arguments );

			Array.prototype.forEach.call(
				tables[ 0 ].tbody.querySelectorAll( ':scope > tr[node-id]:not([node-id*=":"])' ),
				( elem ) => {
					var id = elem.getAttribute( 'node-id' );
					var roll = elem.classList.contains( 'children-roll' );
					Array.prototype.forEach.call(
						tables[ 0 ].tbody.querySelectorAll( ':scope > tr[node-id^="' + id + ':"]' ),
						( child ) => {
							var display = !child.classList.contains( 'hide' );
							if ( ( !display && roll ) || ( display && !roll ) )
								child.classList.toggle( 'hide', !roll );
						}
					);
				}
			);
		};

		var genFrames = function( node, block, tasks ) {
			var offset = block.task_num * block.frames_per_task * block.frames_inc;
			if ( block.frames_inc > 1 )
				offset -= offset % block.frames_inc;
			block.frame_start = block.frame_first + offset;

			offset = block.frames_per_task * block.frames_inc - 1;
			if ( ( block.frame_start + offset ) > block.frame_last )
				offset = block.frame_last - block.frame_start;
			if ( block.frames_inc > 1 )
				offset -= offset % block.frames_inc;
			block.frame_end = block.frame_start + offset;

			if ( block.frames_inc > 1 )
				block.frames_num = ( block.frame_end - block.frame_start ) / block.frames_inc + 1;
			else
				block.frames_num = block.frame_end - block.frame_start + 1;

			return ( block );
		};

		var genName = function( node, block, tasks ) {
			var t = block.task_num;
			var name = 'task ' + t; // default task name

			var tasks_name = block.tasks_name;

			// If block is not numeric:
			if ( block.tasks )
			{
				var task_name = block.tasks[ t ].name;
				if ( task_name )
				{
					if ( tasks_name )
						name = tasks_name.replace( '@#@', task_name );
					else
						name = task_name;
				}
				else if ( tasks_name )
					name = tasks_name.replace( '@#@', '' + t );

				return ( name );
			}

			// The block is numeric:
			genFrames( node, block, tasks );

			if ( tasks_name )
			{
				name = tasks_name;
				name.replace( '@#@', '' + block.frame_start );
			}
			else
				name = 'frame ' + block.frame_start + ( ( block.frames_num > 1 ) ? '-' + block.frame_end : '' );

			return ( name );
		};

		var update = ( parent, elem, data, cid ) => {
			var progress = { infos: { total: 0 }, length: 0, total: 0, done: 0, running: 0, error: 0, null: 0 };

			var node = data.node;
			var block = data.block;
			if ( !block )
				return ;

			var id = elem.getAttribute( 'node-id' );
			var task_starts = 0;
			var task_errors = 0;
			var time_started = 0; //( block.time_started || 0 );
			var time_done = 0; //( block.time_done || 0 );

			var job = tools.merge( {}, node.data );
			job.blocks = false;
			delete job.blocks;
			if ( !Array.isArray( global.nodes_data[ 'tasks' ][ id ] ) )
				global.nodes_data[ 'tasks' ][ id ] = [];

			Array.prototype.forEach.call(
				data.tasks,
				( task, index ) => {
					var child = parent.querySelector( '[node-id="' + id + ':' + index + '"]' );
					//console.log( '[node-id="' + id + ':' + index + '"]', task );
					if ( !child )
					{
						child = elem.cloneNode( true );
						child.setAttribute( 'node-id', id + ':' + index );
					}

					var starts = ( task.str || 0 );
					var errors = ( task.err || 0 );
					var state = ( task.state || config.cell_empty ).trim().split( ' ' ).slice( -1 )[ 0 ];

					task.id = index;
					block.task_num = task.id;
					task.gen_name = genName( node.data, block, data.tasks );
					child.querySelector( '.col-name' ).textContent = task.gen_name;

					child.querySelector( '.col-starts' ).textContent = starts;
					child.querySelector( '.col-errors' ).textContent = errors;

					var states = afanasy.config[ 'states' ];
					var tmp = child.getAttribute( 'node-status' );
					if ( tmp != state || !( !tmp && !state ) )
						child.setAttribute( 'node-status', state );
					child.querySelector( '.col-status' ).textContent = ( ( typeof( states[ state ] ) !== 'undefined' ) ? afanasy.langs.get( states[ state ] ) : config.cell_empty );

					var column = child.querySelector( '.col-running' );
					var current_time = ( task.tdn ? false : task.tst );
					var running = tools.time.diff.get( task.tst, ( task.tdn || true ), false, '.' );
					if ( current_time )
						column.setAttribute( 'current-time', current_time );
					else
						column.removeAttribute( 'current-time' );
					column.textContent = running;
					child.querySelector( '.col-started' ).textContent = ( task.tst || 0 ).toDate( config.cell_empty );
					child.querySelector( '.col-done' ).textContent = ( task.tdn || 0 ).toDate( config.cell_empty );

					child.querySelector( '.col-host' ).textContent = ( task.hst || config.cell_empty );

					if ( !child.ondblclick )
						child.ondblclick = () => { window.TaskDetailsWin( data.job, cid, node, block, task ); };

					if ( !child.parentNode )
					{
						var end = parent.querySelectorAll( '[node-id^="' + id + ':"]' );
						end = ( end.length ? Array.prototype.slice.call( end, -1 )[ 0 ] : false );
						if ( !end || !end.parentNode )
							end = elem;

						end.after( child );
					}

					switch ( state )
					{
						case 'RUN': ++progress.running; break ;
						case 'DON': ++progress.done; break ;
						case 'ERR': ++progress.error; break ;
						default: ++progress.null;
					}

					task_starts += starts;
					task_errors += errors;
					time_started = ( ( !time_started || ( task.tst && task.tst < time_started ) ) ? task.tst: time_started );
					time_done = ( ( !time_done || ( task.tdn && task.tdn > time_done ) ) ? task.tdn: time_done );
					tools.infos_pile( task, cid, progress.infos );

					var tdata = { job: job, block: block, task: task };
					global.nodes_data[ 'tasks' ][ id ][ index ] = { name: task.gen_name, data: tdata };
				}
			);

			var name = '<strong>' + block.name + ' (' + ( block.tasks ? 'array' : 'numeric' ) + ')</strong>';
			var state = ( block.state || config.cell_empty ).trim().split( ' ' ).slice( -1 )[ 0 ];

			elem.setAttribute( 'node-child', data.tasks.length );

			var column = elem.querySelector( '.col-name' );
			if ( column.innerHTML != name )
				column.innerHTML = name;

			elem.querySelector( '.col-starts' ).textContent = task_starts;
			elem.querySelector( '.col-errors' ).textContent = task_errors;

			var states = afanasy.config[ 'states' ];
			var tmp = elem.getAttribute( 'node-status' );
			if ( tmp != state || !( !tmp && !state ) )
				elem.setAttribute( 'node-status', state );
			elem.querySelector( '.col-status' ).textContent = ( ( typeof( states[ state ] ) !== 'undefined' ) ? afanasy.langs.get( states[ state ] ) : config.cell_empty );

			var column = elem.querySelector( '.col-running' );
			var current_time = ( time_done ? false : time_started );
			var running = tools.time.diff.get( time_started, ( time_done || true ), false, '.' );
			if ( current_time )
				column.setAttribute( 'current-time', current_time );
			else
				column.removeAttribute( 'current-time' );
			column.textContent = running;

			elem.querySelector( '.col-started' ).textContent = ( time_started || 0 ).toDate( config.cell_empty );
			elem.querySelector( '.col-done' ).textContent = ( time_done || 0 ).toDate( config.cell_empty );

			elem.querySelector( '.col-host' ).textContent = config.cell_empty;

			progress.total += block.tasks_num;

			var tdata = { job: job, block: block, tasks: data.tasks };
			global.nodes_data[ 'tasks' ][ id ][ -1 ] = { name: block.name, data: tdata };

			return ( progress );
		};

		var purge = ( parent, data ) => {};
		var result = ( win, tables, data, obj, args, event ) => {
			var sort = false;
			var progress = {};
			pre_update( win, tables );
			Array.prototype.forEach.call(
				obj.job_progress.progress,
				( tasks, id ) => {
					var udata = { tasks: tasks, job: data.job, node: data.node, block: data.node.data.blocks[ id ] };
					udata.block.id = id;

					var tr = tables[ 0 ].tbody.querySelector( ':scope > tr[node-id="' + ( id || '0' ) + '"]:not([row-template])' );
					var exists = !!tr;
					if ( !exists )
					{
						tr = tables[ 0 ].template.cloneNode( true );
						tr.setAttribute( 'node-id', id );
						tables[ 0 ].tbody.appendChild( tr );
						sort = true;
					}
					purge( tables[ 0 ].tbody, udata, id );

					tools.merge( progress, update( tables[ 0 ].tbody, tr, udata, id ) );

					var icon = tr.querySelector( '.col-icon' )
					icon.onmousedown = onroll;
					if ( !exists && obj.job_progress.progress.length == 1 )
						icon.onmousedown.apply( icon );
				}
			);

			if ( sort )
				window.table_sort( tables[ 0 ].elem );

			var progress_order = ( index, progress ) => {
				var ret = false;
				switch ( index )
				{
					case 1: ret = progress.done; break ;
					case 2: ret = progress.running; break ;
					case 3: ret = progress.error; break ;
					case 4: ret = progress.null; break ;
				}

				return ( ret );
			};

			tools.infos_print( win, progress.infos );
			win.querySelector( '.frame-circ .pie' ).setAttribute( 'style', tools.progress2bar( progress, progress_order ) );
			post_update( win, tables );
		};

		var bridge = () => {
			var error = false;
			var checked = [];
			tools.table( windows, ( win, tables ) => {
				var container = win.parentNode;
				if ( !container.uid || !( container.uid in global.nodes_data[ 'tasks' ] ) )
					return ;

				checked.push( container.uid );
				var job = global.nodes_data[ 'tasks' ][ container.uid ];
				var data = { job: job, node: global.nodes_data[ 'jobs' ][ job.id ] };
				var get = { type: 'jobs', ids: [ job.id ], mode: 'progress' };
				system.xhr.send( { get: get }, function( obj, args, event ) {
					if ( obj === null )
						return ( error = event.target.status );

					result( win, tables, data, ...arguments );
				} );
			} );

			Array.prototype.forEach.call(
				global.nodes_data[ 'tasks' ],
				( data, uid ) => {
					if ( uid in checked )
						return ;

					if ( data.remove )
						delete global.nodes_data[ 'tasks' ][ uid ];
					else
						data.remove = true;
				}
			);

			resolve( { refresh: !error } );
		};

		var now = Date.now();
		var refresh = ( force || !node_sleep );
		refresh = ( refresh || ( active && ( now - node_active_interval ) > node_sleep ) );
		refresh = ( refresh || ( !active && ( now - node_sleep_interval ) > node_sleep ) );
		if ( refresh )
		{
			node_sleep = now;
			bridge();
		}
		else
		{
			tools.table( windows, pre_update, ( win, tables ) => {
				Array.prototype.forEach.call(
					tables[ 0 ].tbody.querySelectorAll( '[current-time]' ),
					( elem ) => {
						var current_time = elem.getAttribute( 'current-time' );
						elem.textContent = tools.time.diff.get( current_time, true, false, '.' );
					}
				);
			}, post_update );
			resolve( { refresh: false } );
		}
	} );

	window.TasksContext = ( menu, win, lines, other ) => {
		if ( other && !lines.length )
			menu.querySelector( '[name="task-menu"]' ).classList.add( 'disabled' );
	};

	window.TaskDetailsWin = ( job, cid, node, block, task ) => {
		var obj;
		var output_number = 0;
		var container = false;
		var refresh = () => {
			var get = { type: 'jobs', ids: [ job.id ], mode: 'info', block_ids: [ block.id ], task_ids: [ task.id ], mon_id: g_id };
			system.xhr.send( { get: get }, ( sobj ) => {
				if ( typeof( sobj.task ) === 'object' && sobj.task.job_name )
				{
					obj = sobj;
					output_number = sobj.task.pos.number;
				}

				afanasy.tools.ping_refresh( container );
				if ( !container )
				{
					container = afanasy.functions.win_add( false, 'task-details', false, false, false, { subtitle: subtitle, style: 'min-width: 650px; min-height: 250px;' } );

					container.querySelector( '.subtitle .task-skip' ).onmousedown = ( event ) => {
						afanasy.functions.win_actions.fn.base( event, null, 'action_task', 'skip', [ obj.task.pos.task ], [ obj.task.pos.block ], obj.task.pos.job );
						afanasy.tools.ping_refresh( container );
					};
					container.querySelector( '.subtitle .task-restart' ).onmousedown = ( event ) => {
						afanasy.functions.win_actions.fn.base( event, null, 'action_task', 'restart', [ obj.task.pos.task ], [ obj.task.pos.block ], obj.task.pos.job );
						afanasy.tools.ping_refresh( container );
					};

					var output_num = container.querySelector( '.subtitle > .rinfos select[name="output_num"]' );
					output_num.selectedIndex = output_number;
					output_num.onchange = ( e ) => {
						var tmp = parseInt( output_num.value );
						var tab = container.querySelector( '[tab-target="output"]' );
						refresh_type( 'output', { number: tmp }, ( sobj, check ) => {
							if ( !check )
								return ;

							output_number = tmp;
							output_num.selectedIndex = output_number;
						} );

						tab.dispatchEvent( new MouseEvent( 'mousedown',  { bubbles: true } ) );
					};
				}

				var subtitle = 'Task[%1][%2][%3]'.replaceArr( [ obj.task.job_name, obj.task.block_name, obj.task.task_name ] );
				container.querySelector( '.title .subtext' ).textContent = subtitle;

				var infos = container.querySelector( '.subtitle > .infos' );
				var running = tools.time.diff.get( obj.task.progress.tst, ( obj.task.progress.tdn || true ), false, '.' );
				var start = ( obj.task.progress.str || 0 );
				var host = ( obj.task.progress.hst || afanasy.langs.get( 'cell-task-details.infos.host.default' ) );
				infos.textContent = afanasy.langs.get( 'cell-task-details.infos' ).replaceArr( [ obj.task.progress.state, start, host, running ] );

				var output_num = container.querySelector( 'select[name="output_num"]' );
				Array.prototype.forEach.call(
					[ ...Array( parseInt( start ) + 1 ).keys() ],
					( num ) => {
						if ( output_num.options.length > num )
							return ;

						var option = document.createElement( 'option' );
						option.text = num;
						option.value = num;
						output_num.appendChild( option );
					}
				);

				if ( typeof( obj.task.exec ) === 'object' )
				{
					var tab = container.querySelector( '[tab-id="exec"]' );
					tab.querySelector( 'input[name="name"]' ).value = obj.task.exec.name;
					tab.querySelector( 'input[name="capacity"]' ).value = obj.task.exec.capacity;
					tab.querySelector( 'input[name="service"]' ).value = obj.task.exec.service;
					tab.querySelector( 'input[name="parser"]' ).value = obj.task.exec.parser;
					tab.querySelector( 'input[name="directory"]' ).value = obj.task.exec.working_directory;
					tab.querySelector( '.istextarea[name="raw"]' ).textContent = JSON.stringify( obj.task.exec, undefined, 2 );
				}

				var refresh_type = ( type, more, callback ) => {
					var tab = container.querySelector( '[tab-id="' + type + '"]' );
					if ( !tab )
						return ;

					var get = { type: 'jobs', ids: [ job.id ], mode: type, block_ids: [ block.id ], task_ids: [ task.id ], mon_id: g_id };
					if ( more )
						get = afanasy.tools.merge( get, more );

					system.xhr.send( { get: get }, ( sobj ) => {
						afanasy.tools.ping_refresh( container );
						var check = ( typeof( sobj.task ) === 'object' && sobj.task.job_name );
						if ( check )
							obj = sobj;

						if ( typeof( callback ) === 'function' )
							callback( sobj, check );

						var text = ( sobj.task && sobj.task.data ) || ( sobj.info && sobj.info.text );
						tab.textContent = ( text || afanasy.langs.get( 'cell-task-details.empty.' + type ) );
					} );
				};

				container.querySelector( '[tab-target="exec"]' ).onclick = () => {
					refresh();
				};

				container.querySelector( '[tab-target="output"]' ).onclick = () => {
					refresh_type( 'output', { number: output_number } );
				};

				container.querySelector( '[tab-target="log"]' ).onclick = () => {
					refresh_type( 'log' );
				};

				container.querySelector( '[tab-target="error_hosts"]' ).onclick = () => {
					refresh_type( 'error_hosts' );
				};

				container.querySelector( '[tab-target="listen"]' ).onclick = () => {
					refresh_type( 'listen' );
				};
			} );
		};

		refresh();
	};
} );
