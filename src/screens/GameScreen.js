import animate;
import device;
import math.geom.Rect as Rect;
import math.geom.intersect as intersect;
import math.geom.Line as Line;

import ui.ImageView;
import ui.resource.Image as Image;
import ui.View;

import src.components.BubbleGrid as BubbleGrid;
import src.components.Shooter as Shooter;

import src.enums as Enums;

/*
 * The game screen is a singleton view that consists of
 * a scoreboard, bubble grid, player's cannon, and bubble queue.
 */

// const
 const VIEW_WIDTH = 320;
 const VIEW_HEIGHT = 480;
 const MATCH_BENCH = 3; // match 3 cluster

var skin = Enums.SKINS.TOON;
var path = 'resources/images/' + skin;
var bgLvl1 = new Image({ url: path + '/bgLvl1.png' });

/* The GameScreen view is a child of the main application.
 * By adding the scoreboard and the grid as it's children,
 * everything is visible in the scene graph.
 */
exports = Class(ui.View, function (supr) {
	this.init = function (options) {
		options = merge(options, {
			x: 0,
			y: 0,
			width: VIEW_WIDTH,
			height: VIEW_HEIGHT
		});

		supr(this, 'init', [options]);

		this.build();
	};

	/*
	 * Layout the scoreboard and grid level design
	 */
	this.build = function () {
		this.on('app:start', this.startGame.bind(this));

		this._isLaunching = false;

		var layout = [[1, 0, 1], [0, 1, 0], [1, 0, 1]]; // TODO: adapt this for bubble layout

		var shooterHeight = BubbleGrid.Static.HEX_WIDTH;
		var bubbleGridOffsetX = BubbleGrid.Static.HEX_WIDTH * 0.2;
		var bubbleGridOffsetY = 68 * 2;

		this.style.width = VIEW_WIDTH;
		this.style.height = VIEW_HEIGHT;

		// bg
		this.background = new ui.ImageView({
			superview: this,
			image: bgLvl1,
			x: 0,
			y: 0,
			width: VIEW_WIDTH,
			height: VIEW_HEIGHT
		});

		// grid
		this.bubbleGrid = new BubbleGrid({
			debugMode: false, // draw visible hex grid
			superview: this,
			width: VIEW_WIDTH - (bubbleGridOffsetX * 2),
			height: VIEW_HEIGHT - shooterHeight - bubbleGridOffsetY,
			x: bubbleGridOffsetX,
			y: bubbleGridOffsetY, // based on bg art
			zIndex: 1
		});

		// shooter
		this.shooter = new Shooter({
			superview: this,
			x: 0,
			y: VIEW_HEIGHT - shooterHeight,
			width: VIEW_WIDTH,
			height: shooterHeight,
			bubbleGrid: this.bubbleGrid, // register
			zIndex: 0 // if arrow or cannon should be under or over next bubble
		});

		// animations
		this._animator = animate(this.shooter.activeBubble);

		this.setupEvents();
	};

	this.setupEvents = function () {
		var self = this;

		// DEBUG: add/remove bubbles to hexagon on tap
		// note: keep around for CREATE YOUR OWN LEVEL feature?
		/*var grid = this.bubbleGrid;
		this.onInputSelect = function (e, point) {
			(grid.getBubbleAt(point) ? grid.removeBubble : grid.addBubble).call(grid, { point: point });
		};*/

		// capture touches for aim and launch
		this.onInputStart = function (evt, point) {
			this.shooter.aimAt(point);
		};
		this.onInputMove = function (evt, point) {
			this.shooter.aimAt(point);
		};
		this.onInputSelect = function (evt, point) {
			this.shooter.aimAt(point);
			if (!this._isLaunching) {
				this.shooter.shouldLaunch = true;
				this._isLaunching = true;
			}
		};

		this.shooter.on('collided', function (point) {
			// attach active bubble to nearest hex
			function doReset() {
				self._isLaunching = false;
				return self.shooter.reset();
			}

			var bubbleGrid = self.bubbleGrid;

			var addedBubble = bubbleGrid.addBubbles([ point ], this.activeBubble.bubType)[0];

			if (!addedBubble) {
				// TODO: failed to add, trigger loseGame
				return doReset();
			}

			var i, bub;

			// detect match / clusters
			var cluster = bubbleGrid.getClusterAt(addedBubble, true, true);

			if (cluster.length >= MATCH_BENCH) {
				// remove all bubs in the cluster
				bubbleGrid.removeBubbles(cluster);

				// remove floaters after matches removed
				bubbleGrid.once('removedBubbles', function () {
					var floaters = bubbleGrid.getFloaters();
					if (floaters.length) {
						bubbleGrid.removeBubbles(floaters);

						// wait til everything done before allowing player to shoot again
						bubbleGrid.once('removedBubbles', function () {
							return doReset();
						});
					} else {
						return doReset();
					}
				});
			}

			doReset();
		});
	};

	this.startGame = function () {
		// init bubbles
		// DEBUG: example level building
		// TODO: use 2d array of layouts
		this.bubbleGrid.fillRows(1,4);
	};
});
