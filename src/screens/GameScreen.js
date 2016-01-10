import device;
import ui.View;

import src.components.HexagonTools as HT;
import src.components.HexagonTools.Grid;

import src.components.Bubble as Bubble;
/*
 * The game screen is a singleton view that consists of
 * a scoreboard and a collection of molehills.
 */

/* Some game constants.
 */
 const VIEW_WIDTH = 320;
 const VIEW_HEIGHT = 480;

/* The GameScreen view is a child of the main application.
 * By adding the scoreboard and the molehills as it's children,
 * everything is visible in the scene graph.
 */
exports = Class(ui.View, function (supr) {
	this.init = function (options) {
		options = merge(options, {
			x: 0,
			y: 0,
			width: 320,
			height: 480,
		});

		supr(this, 'init', [options]);

		this.build();
	};

	/*
	 * Layout the scoreboard and molehills.
	 */
	this.build = function () {
		this.on('app:start', this.startGame.bind(this));

		var x_offset = 5;
		var y_offset = 160;
		var y_pad = 25;
		var layout = [[1, 0, 1], [0, 1, 0], [1, 0, 1]];

		this.style.width = VIEW_WIDTH;
		this.style.height = VIEW_HEIGHT;
	};

	this.startGame = function () {
		var self = this;

		// setup hexagons
		var hexWidth = 32;
		var hexHeight = 32;

		var y = hexHeight/2.0;

		var a = -3.0; // quadratic
		var b = (-2.0 * hexWidth);
		var c = (Math.pow(hexWidth, 2)) + (Math.pow(hexHeight, 2));

		var z = (-b - Math.sqrt(Math.pow(b,2)-(4.0*a*c)))/(2.0*a);

		var x = (hexWidth - z)/2.0;

		HT.Hexagon.Static.WIDTH = hexWidth;
		HT.Hexagon.Static.HEIGHT = hexHeight;
		HT.Hexagon.Static.SIDE = z;

		// draw hex grid
		var Canvas = device.get('Canvas');

		const GRID_WIDTH = VIEW_WIDTH;
		const GRID_HEIGHT = VIEW_HEIGHT / 2;

		this._canvasGrid = new Canvas({width: GRID_WIDTH, height: GRID_HEIGHT});
		this._contextGrid = this._canvasGrid.getContext('2d');

		this._canvasBubbles = new Canvas({width: GRID_WIDTH, height: GRID_HEIGHT});
		this._contextBubbles = this._canvasBubbles.getContext('2d');

		var grid = new HT.Grid(GRID_WIDTH, GRID_HEIGHT);

		console.log('hex grid', grid);

		this._contextGrid.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);

		grid.bubbles = [];
		for(var h in grid.Hexes) {
			var curHex = grid.Hexes[h];
			curHex.draw(this._contextGrid);

			var bubble = new Bubble({
				radius: hexWidth,
				x: curHex.x/2,
				y: curHex.y/2,
				width: hexWidth,
				height: hexHeight
			});

			grid.bubbles.push(bubble);

			this.addSubview(bubble);
		}

		// log this hexagon on tap
		this._canvasGrid.addEventListener('touchend', e => {
			console.log('tapped', e);
		});
	};

	this.render = function (context) {
		context.drawImage(this._canvasGrid, 0, 0);
	};
});
