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

/*
 * The game screen is a singleton view that consists of
 * a scoreboard, bubble grid, player's cannon, and bubble queue.
 */

// const
 const VIEW_WIDTH = 320;
 const VIEW_HEIGHT = 480;
 const MATCH_BENCH = 3; // match 3 cluster

 var bgLvl1 = new Image({ url: 'resources/images/bgLvl1.png' });

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
			debugMode: true, // DEBUG
			superview: this,
			width: VIEW_WIDTH - (bubbleGridOffsetX * 2),
			height: VIEW_HEIGHT - shooterHeight - bubbleGridOffsetY,
			x: bubbleGridOffsetX,
			y: bubbleGridOffsetY // based on bg art
		});

		// shooter
		this.shooter = new Shooter({
			superview: this,
			x: 0,
			y: VIEW_HEIGHT - shooterHeight,
			width: VIEW_WIDTH,
			height: shooterHeight,
			bubbleGrid: this.bubbleGrid // register
		});

		// boundaries
		/*var wallLeft = new Rect({
			x: -2,
			y: 0,
			width: 2,
			height: VIEW_HEIGHT
		});
		var wallRight = new Rect({
			x: VIEW_WIDTH,
			y: 0,
			width: 2,
			height: VIEW_HEIGHT
		});
		var ceiling = new Rect({
			x: 0,
			y: bubbleGridOffsetY,
			width: VIEW_WIDTH,
			height: 2
		});*/

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
			this.shooter.shouldLaunch = true;
		};

		this.shooter.on('collided', function (point) {
			// attach active bubble to nearest hex
			var addedBubble = self.bubbleGrid.addBubble({
				point: point,
				bubType: this.activeBubble.bubType
			});

			if (!addedBubble) {
				// TODO: failed to add, trigger loseGame
				return this.reset();
			}

			var i;

			// detect match / clusters
			var cluster = self.bubbleGrid.getClusterAt(addedBubble);
			console.log('Cluster', cluster);
			if (cluster.length >= MATCH_BENCH) {
				// TODO: remove all bubs in the cluster
				for (i = 0; i < cluster.length; i += 1) {
					var bub = cluster[i];
					self.bubbleGrid.removeBubble({ id: bub.id });
				}

				// TODO: remove floaters
				/*var floaters = self.bubbleGrid.getFloaters();
				if (floaters.length) {
					for (i = 0; i < floaters.length; i += 1) {
						floaters[i]
					}
				}
				*/
			}

			this.reset();
		});
	};

	this.startGame = function () {
		// init bubbles
		// DEBUG: example level building
		this.bubbleGrid.fillRows(2);
		this.bubbleGrid.fillRows(7, 8);
		this.bubbleGrid.fillRows(11,12); // TODO: use 2d array of layouts
	};
});
