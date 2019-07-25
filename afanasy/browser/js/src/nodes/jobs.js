document.addEventListener( 'DOMContentLoadedAfanasy', ( afanasy ) => {
	var node_sleep = 0;
	var node_sleep_interval = 20000;
	var node_active_interval = 1000;
	var [ tools, config, global, system ] = [ afanasy.tools, afanasy.config, afanasy.global, afanasy.system ];
	window.JobsNode = ( windows, force, active ) => new Promise( ( resolve, reject ) => {
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

		var update = ( parent, elem, data, cid ) => {
			var blocks = data.blocks;
			var count = blocks.length;
			var more = ( typeof( cid ) !== 'undefined' );
			if ( !count )
				return ( {} );

			var trans;
			var block = blocks[ 0 ];
			var primary = !data.host_name;
			var id = data.id;
			var name = data.name;
			var state = ( data.state || config.cell_empty ).trim().split( ' ' ).slice( -1 )[ 0 ];
			var progress = { infos: { total: 0 }, length: 0, total: 0, done: 0, skipped: 0, warning: 0, ready: 0, waitdep: 0, running: 0, error_ready: 0, error: 0, waitreconnect: 0, null: 0 };

			var title = '';
			var logo = block.service;
			var done = ( block.p_tasks_done || 0 );
			var total = ( block.tasks_num || 0 );
			var percent = ( block.p_percentage || 0 );
			var capacity = ( block.capacity || 0 );
			var details = '';

			var onlyonce = ( more || count <= 1 );
			if ( !more && data.user_list_order )
				elem.setAttribute( 'node-order', data.user_list_order );

			var special = ( data.name == 'afanasy' && data.user_name == 'afadmin' );
			if ( more || count >= 2 )
			{
				if ( special )
					elem.setAttribute( 'node-order', ( more ? block.block_num : -1 ) );

				if ( more )
				{
					name = '<strong>' + block.name + '</strong>';
					state = ( block.state || '' ).trim();
					if ( !elem.parentNode )
					{
						id = data.id + ':' + block.block_num;
						name = data.name + '[' + block.name + ']';
						elem.removeAttribute( 'node-child' );
						elem.setAttribute( 'node-id', id );
					}

					tools.infos_pile( data, cid, progress.infos );
				}
				else
				{
					logo = false;
					name += ' <strong>(' + ( primary ? afanasy.langs.get( 'cell-jobs.batch' ) : ( count + ' ' + afanasy.langs.get( 'cell-jobs.jobs' ) ) ) + ')</strong>';
					percent = block.p_percentage;

					done = 0;
					total = 0;
					capacity = 0;
					Array.prototype.forEach.call(
						blocks,
						( block, index ) => {
							var child = parent.querySelector( '[node-id="' + data.id + ':' + block.block_num + '"]' );
							if ( !child )
								child = elem.cloneNode( true );

							var tmp = Object.assign( {}, data );
							tmp.blocks = [ block ];

							tools.merge( progress, update( parent, child, tmp, index ) );
							if ( !child.parentNode )
							{
								var end = parent.querySelectorAll( '[node-id^="' + data.id + ':"]' );
								end = ( end.length ? Array.prototype.slice.call( end, -1 )[ 0 ] : false );
								if ( !end || !end.parentNode )
									end = elem;

								end.after( child );
							}

							done += ( block.p_tasks_done || 0 );
							total += ( block.tasks_num || 0 );
							capacity += ( block.capacity || 0 );
						}
					);
				}
			}
			else
			{
				name += ' &gt; <strong>' + block.name + '</strong>';
				tools.infos_pile( data, cid, progress.infos );
			}

			if ( !special && !elem.ondblclick )
				elem.ondblclick = () => { window.TasksWin( data, cid ); };

			if ( count <= 1 )
				elem.removeAttribute( 'node-child' );
			else if ( elem.getAttribute( 'node-child' ) != count )
				elem.setAttribute( 'node-child', count );

			// Tasks tooltip:
			trans = {
				frames_range: 'Frame Range:\nFirst: %1\nLast: %2',
				frames_inc: '\nIncrement: %1',
				frames_per_task: '\nPer Task: %1',
				sequential: '\nSequential: %1',
			};

			var tasks_title = '';
			if ( system.check_block_flag( block.flags, 'numeric' ) )
			{
				tasks_title = trans.frames_range.replaceArr( [ block.frame_first, block.frame_last ] );
				if ( block.frames_inc > 1 )
					tasks_title += trans.frames_inc.replaceArr( [ block.frames_inc ] );
				if ( block.frames_per_task > 1 )
					tasks_title += trans.frames_per_task.replaceArr( [ block.frames_per_task ] );
				if ( ( block.sequential != null ) && ( block.sequential != 1 ) )
					tasks_title += trans.sequential.replaceArr( [ block.sequential ] );
			}
			if ( tasks_title )
				title = ( title ? title + '\n' : '' ) + tasks_title;

			// Depends title:
			var deps_title = '';
			if ( block.depend_mask )
			{
				if ( deps_title.length )
					deps_title += '\n';
				deps_title += 'Depend mask = \"' + block.depend_mask + '\".';
			}
			if ( block.tasks_depend_mask )
			{
				if ( deps_title.length )
					deps_title += '\n';
				deps_title += 'Tasks depend mask = \"' + block.tasks_depend_mask + '\".';
			}
			if ( block.depend_sub_task )
			{
				if ( deps_title.length )
					deps_title += '\n';
				deps_title += 'Subtasks depend.';
			}
			if ( deps_title )
				title = ( title ? title + '\n' : '' ) + deps_title;

			elem.setAttribute( 'title', tasks_title );

			var icon = elem.querySelector( '.col-icon img' );
			if ( logo && ( icon.style.display == 'none' || icon.src.indexOf( logo ) < 0 ) )
			{
				icon.src = config.logos_prefix + logo + '.png';
				icon.style.display = 'inline-block';
			}
			else if ( !logo && ( icon.style.display != 'none' ) )
			{
				icon.src = config.logos_default;
				icon.style.display = 'none';
			}

			var column = elem.querySelector( '.col-name' );
			if ( column.innerHTML != name )
				column.innerHTML = name;

			elem.querySelector( '.col-user' ).textContent = data.user_name;

			var column = elem.querySelector( '.col-running' );
			var current = ( more ? block : data );
			var selected_time = 'time_' + ( ( !more && primary ) ? 'creation' : 'started' );
			var current_time = false;
			var running = config.cell_empty;
			if ( current[ selected_time ] )
			{
				running = tools.time.diff.get( current[ selected_time ], ( current.time_done || true ), false, '.' );
				if ( !current.time_done )
					current_time = current[ selected_time ];
			}
			if ( current_time )
				column.setAttribute( 'current-time', current_time );
			else
				column.removeAttribute( 'current-time' );
			column.textContent = running;
			elem.querySelector( '.col-creation' ).textContent = ( current.time_creation || 0 ).toDate( config.cell_empty );
			elem.querySelector( '.col-started' ).textContent = ( current.time_started || 0 ).toDate( config.cell_empty );
			elem.querySelector( '.col-done' ).textContent = ( current.time_done || 0 ).toDate( config.cell_empty );

			elem.querySelector( '.col-branch' ).textContent = ( data.branch || config.cell_empty );
			elem.querySelector( '.col-capacity' ).textContent = ( capacity || config.cell_empty );
			elem.querySelector( '.col-priority' ).textContent = ( current.priority || config.cell_empty );

			var render = ' - ';
			if ( onlyonce && block.p_tasks_run_time && block.p_tasks_done )
			{
				var sum = tools.time.diff.unit( current[ selected_time ], ( current.time_done || true ) );
				var average = tools.time.unit( block.p_tasks_run_time / block.p_tasks_done );
				render = 'sum: ' + sum + ' | average: ' + average;
			}
			elem.querySelector( '.col-render' ).textContent = render;

			// Tasks brief text:
			if ( system.ui_level.padawan() )
			{
				trans = {
					tasks_num: 'Tasks[<b>%1</b>]',
					frames_num: 'Frames[<b>%1</b>]( <b>%2</b> - <b>%3</b>%4 )',
					frames_inc: ' / Increment<b>%1</b>',
					frames_per_task: ' : PerTask<b>%1</b>',
					sequential: ' % Sequential<b>%1</b>',
				};
			}
			else if ( system.ui_level.jedi() )
			{
				trans = {
					tasks_num: 'Tasks[<b>%1</b>]',
					frames_num: 'Frames[<b>%1</b>]( <b>%2</b> - <b>%3</b>%4 )',
					frames_inc: ' / Inc<b>%1</b>',
					frames_per_task: ' : FPT<b>%1</b>',
					sequential: ' % Seq<b>%1</b>',
				};
			}
			else
			{
				trans = {
					tasks_num: 't<b>%1</b>',
					frames_num: 'f<b>%1</b>(<b>%2</b>-<b>%3</b>%4)',
					frames_inc: '/<b>%1</b>',
					frames_per_task: ':<b>%1</b>',
					sequential: '%<b>%1</b>',
				};
			}

			if ( system.check_block_flag( block.flags, 'numeric' ) )
			{
				var tmp = '';
				if ( block.frames_inc > 1 )
					tmp += trans.frames_inc.replaceArr( block.frames_inc );
				if ( block.frames_per_task > 1 )
					tmp += trans.frames_per_task.replaceArr( block.frames_per_task );
				if ( block.sequential != null && block.sequential != 1 )
					tmp += trans.sequential.replaceArr( block.sequential );
				details = ( details ? details + ' | ' : '' ) + trans.frames_num.replaceArr( [ block.tasks_num, block.frame_first, block.frame_last, tmp ] );
			}
			else
				details = ( details ? details + ' | ' : '' ) + trans.tasks_num.replaceArr( [ block.tasks_num ] );

			// Depends brief info:
			if ( system.ui_level.padawan() )
			{
				trans = {
					depend_mask: ' Depends(<b>%1</b>)',
					tasks_depend_mask: ' TasksDepends[<b>%1</b>]',
					depend_sub_task: ' [<b>Sub-Task Dependence</b>]',
				};
			}
			else if ( system.ui_level.jedi() )
			{
				trans = {
					depend_mask: ' Dep(<b>' + block.depend_mask + '</b>)',
					tasks_depend_mask: ' TDep[<b>' + block.tasks_depend_mask + '</b>]',
					depend_sub_task: ' [<b>Sub-Task</b>]',
				};
			}
			else
			{
				trans = {
					depend_mask: ' d(<b>' + block.depend_mask + '</b>)',
					tasks_depend_mask: ' t[<b>' + block.tasks_depend_mask + '</b>]',
					depend_sub_task: ' [<b>sub</b>]',
				};
			}

			var deps = '';
			if ( block.depend_mask )
				deps += trans.depend_mask.replaceArr( [ block.depend_mask ] );
			if ( block.tasks_depend_mask )
				deps += trans.tasks_depend_mask.replaceArr( [ block.tasks_depend_mask ] );
			if ( block.depend_sub_task )
				deps += trans.depend_sub_task.replaceArr( [] );
			if ( deps )
				details = ( details ? details + ' | ' : '' ) + deps;

			if ( system.ui_level.padawan() )
			{
				trans = {
					task_max_run_time: 'TaskMaxRunTime: <b>%1</b>',
					task_min_run_time: 'TaskMinRunTime: <b>%1</b>',
					errors_forgive_time: 'ErrorsForgiveTime: <b>%1</b>',
					errors_solving: 'ErrorsSolving: ( Avoid: <b>%1</b>, Task: <b>%2</b>, Retries: <b>%3</b> )',
					need_memory: 'Memory&gt;<b>%1</b>',
					need_hdd: 'HDDSpace&gt;<b>%1</b>',
					need_power: 'Power&gt;<b>%1</b>',
					need_properties: 'Properties(<b>%1</b>)',
					runtime: 'Render Timings: Sum:<b>%1</b> / Average:<b>%2</b>',
				};
			}
			else if ( system.ui_level.jedi() )
			{
				trans = {
					task_max_run_time: 'MaxRun: <b>%1</b>',
					task_min_run_time: 'MinRun: <b>%1</b>',
					errors_forgive_time: 'ErrForgive: <b>%1</b>',
					errors_solving: 'ErrSlv: ( Block: <b>%1</b>, Task: <b>%2</b>, Retries: <b>%3</b> )',
					need_memory: 'Mem&gt;<b>%1</b>',
					need_hdd: 'HDD&gt;<b>%1</b>',
					need_power: 'Pow&gt;<b>%1</b>',
					need_properties: 'Props(<b>%1</b>)',
					runtime: 'Timings: Sum:<b>%1</b> / Avg:<b>%2</b>',
				};
			}
			else
			{
				trans = {
					task_max_run_time: 'Mrt: <b>%1</b>',
					task_min_run_time: 'mrt: <b>%1</b>',
					errors_forgive_time: 'f: <b>%1</b>',
					errors_solving: 'e: ( <b>%1b, <b>%2t</b>, <b>%3r</b> )',
					need_memory: 'm&gt;<b>%1</b>',
					need_hdd: 'h&gt;<b>%1</b>',
					need_power: 'p&gt;<b>%1</b>',
					need_properties: '<b>%1</b>',
					runtime: 'rt:s<b>%1</b>/a<b>%2</b>',
				};
			}

			var eah = -1, eth = -1, ert = -1;
			if ( block.errors_avoid_host )
				eah = block.errors_avoid_host;
			if ( block.errors_task_same_host )
				eth = block.errors_task_same_host;
			if ( block.errors_retries )
				ert = block.errors_retries;

			if ( block.task_max_run_time != null )
				details = ( details ? details + ' | ' : '' ) + trans.task_max_run_time.replaceArr( [ tools.time.unit( block.task_max_run_time ) ] );
			if ( block.task_min_run_time != null )
				details = ( details ? details + ' | ' : '' ) + trans.task_min_run_time.replaceArr( [ tools.time.unit( block.task_min_run_time ) ] );
			if ( block.errors_forgive_time != null && block.errors_forgive_time >= 0 )
				details = ( details ? details + ' | ' : '' ) + trans.errors_forgive_time.replaceArr( [ tools.time.unit( block.errors_forgive_time ) ] );
			if ( eah != -1 || eth != -1 || ert != -1 )
				details = ( details ? details + ' | ' : '' ) + trans.errors_solving.replaceArr( [ eah, eth, ert ] );

			if ( block.need_memory )
				details = ( details ? details + ' | ' : '' ) + trans.need_memory.replaceArr( [ block.need_memory ] );
			if ( block.need_hdd )
				details = ( details ? details + ' | ' : '' ) + trans.need_hdd.replaceArr( [ block.need_hdd ] );
			if ( block.need_power )
				details = ( details ? details + ' | ' : '' ) + trans.need_power.replaceArr( [ block.need_power ] );
			if ( block.need_properties )
				details = ( details ? details + ' | ' : '' ) + trans.need_properties.replaceArr( [ block.need_properties ] );

			var column = elem.querySelector( '.col-details' );
			if ( column.innerHTML != details )
				column.innerHTML = details;

			var states = afanasy.config[ 'states' ];
			var tmp = elem.getAttribute( 'node-status' );
			if ( tmp != state || !( !tmp && !state ) )
				elem.setAttribute( 'node-status', state );
			elem.querySelector( '.col-status' ).textContent = ( ( typeof( states[ state ] ) !== 'undefined' ) ? afanasy.langs.get( states[ state ] ) : config.cell_empty );

			percent = Math.floor( done / total * 100 );
			var column = elem.querySelector( '.col-progress' );
			Array.prototype.forEach.call(
				column.querySelectorAll( '.col-progress-text' ),
				( elem ) => { elem.textContent = percent + ' % (' + done + '/' + total + ')' }
			);

			if ( onlyonce )
			{
				Array.prototype.forEach.call(
					blocks,
					( block, index ) => {
						if ( typeof( block.p_progressbar ) !== 'string' )
							return ;

						var bar = block.p_progressbar;
						for ( var i = 0; i < bar.length; ++i )
						{
							switch ( bar[ i ] )
							{
								case 'D': ++progress.done; break ;
								case 'S': ++progress.skipped; break ;
								case 'G': ++progress.warning; break ;
								case 'r': ++progress.ready; break ;
								case 'W': ++progress.waitdep; break ;
								case 'R': ++progress.running; break ;
								case 'N': ++progress.warning; break ;
								case 'Y': ++progress.error_ready; break ;
								case 'E': ++progress.error; break ;
								case 'C': ++progress.waitreconnect; break ;
								default: ++progress.null;
							}
						}

						progress[ index ] = bar;
						progress.total += bar.length;
						++progress.length;
					}
				);
			}

			var errors = 0;
			if ( progress.total )
				errors = Math.floor( ( progress.error + progress.error_ready ) / progress.total * 100 );
			elem.querySelector( '.col-errors' ).textContent = errors.toString() + ' %';

			column.querySelector( '.progress' ).setAttribute( 'style', tools.progress2bar( progress ) );
			if ( !more )
				global.nodes_data[ 'jobs' ][ id ] = { name: data.name, data: data };

			return ( progress );
		};

		var purge = ( parent, data, id ) => {
			var children = [];
			if ( !data )
			{
				Array.prototype.forEach.call(
					parent.querySelectorAll( ':scope > [node-id="' + id + '"], :scope > [node-id^="' + id + ':"]' ),
					( elem ) => { elem.remove(); }
				);
				return ;
			}

			Array.prototype.forEach.call(
				data.blocks,
				( block ) => { children.push( block.block_num.toString() ); }
			);

			Array.prototype.forEach.call(
				parent.querySelectorAll( ':scope > [node-id^="' + data.id + ':"]' ),
				( child ) => {
					var id = child.getAttribute( 'node-id' );
					id = id.substr( id.indexOf( ':' ) + 1 ).toString();

					if ( children.indexOf( id ) < 0 )
						child.remove();
				}
			);
		};

		var result = ( obj, args, event ) => {
			if ( obj === null )
				return ( reject( event.target.status ) );

			var data = {};
			var keys = [];
			Array.prototype.forEach.call(
				Object.keys( obj.jobs ),
				( key ) => {
					var tmp = obj.jobs[ key ];
					data[ tmp.id.toString() ] = tmp;
					keys.push( tmp.id.toString() );
				}
			);

			var progress = {};
			tools.table( windows, ( win, tables ) => {
				var sort = false;
				var checked = [];
				pre_update( win, tables );
				Array.prototype.forEach.call(
					tables[ 0 ].tbody.querySelectorAll( ':scope > tr[node-id]:not([row-template])' ),
					( tr ) => {
						var id = tr.getAttribute( 'node-id' ).toString();
						var pos = id.indexOf( ':' );
						if ( pos >= 0 )
						{
							id = id.substr( 0, pos ).toString();
							tr = tables[ 0 ].tbody.querySelector( ':scope > tr[node-id="' + id + '"]' )
						}
						purge( tables[ 0 ].tbody, data[ id ], id );

						if ( checked.indexOf( id ) < 0 )
							checked.push( id );
						else
							return ;

						if ( keys.indexOf( id ) < 0 )
						{
							var datas = global.nodes_data[ 'jobs' ];
							if ( id.indexOf( ':' ) < 0 )
							{
								Array.prototype.forEach.call(
									Object.keys( datas ),
									( tid ) => {
										if ( !tid.indexOf( id + ':' ) )
											delete datas[ tid ];
									}
								);
							}

							delete datas[ id ];
							return ( tr.remove() );
						}

						tools.merge( progress, update( tables[ 0 ].tbody, tr, data[ id ] ) );
					}
				);

				var base = tables[ 0 ].tbody.querySelector( ':scope > tr:not([node-order])' );
				Array.prototype.forEach.call(
					Object.keys( data ),
					( id ) => {
						purge( tables[ 0 ].tbody, data[ id ], id );
						if ( checked.indexOf( id ) >= 0 )
							return ;

						var tr = tables[ 0 ].template.cloneNode( true );
						tr.setAttribute( 'node-id', data[ id ].id );
						if ( base )
							base.before( tr );
						else
						{
							sort = true;
							tables[ 0 ].tbody.prepend( tr );
						}

						tools.merge( progress, update( tables[ 0 ].tbody, tr, data[ id ] ) );

						tr.querySelector( '.col-icon' ).onmousedown = onroll;
						base = ( data[ id ].user_list_order ? base : tr );
					}
				);

				if ( sort )
					window.table_sort( tables[ 0 ].elem );

				tools.infos_print( win, progress.infos );
				win.querySelector( '.frame-circ .pie' ).setAttribute( 'style', tools.progress2bar( progress ) );
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
			var get = { type: 'jobs' }; //, ids: [ this.cur_item.params.id ], mode: i_param.name };
			system.xhr.send( { get: get }, result );
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

	window.JobsContext = ( menu, win, lines, other ) => {
		if ( other && !lines.length )
			menu.querySelector( '[name="job-menu"]' ).classList.add( 'disabled' );
	};

	window.JobsSort = ( a, b ) => {
		var aorder = a.getAttribute( 'node-order' ) || 0;
		var border = b.getAttribute( 'node-order' ) || 0;
		return ( border - aorder );
	};

	window.TasksWin = ( job, cid ) => {
		var container = afanasy.functions.win_add( false, 'tasks', false, false, false, { subtitle: job.name } );
		global.nodes_data[ 'tasks' ][ container.uid ] = { id: job.id, name: job.name, child: cid };
		window.cell_refresh( 'tasks' );
	};
} );
