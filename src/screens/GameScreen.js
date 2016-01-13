import device;
import ui.ImageView;
import ui.resource.Image as Image;
import ui.View;

import src.components.BubbleGrid as BubbleGrid;
import src.components.Shooter as Shooter;

/*
 * The game screen is a singleton view that consists of
 * a scoreboard, bubble grid, player's cannon, and bubble queue.
 */

/* Some game constants.
 */
 const VIEW_WIDTH = 320;
 const VIEW_HEIGHT = 480;

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

		var x_offset = 5;
		var y_offset = 160;
		var y_pad = 25;
		var layout = [[1, 0, 1], [0, 1, 0], [1, 0, 1]]; // TODO: adapt this bubble layout

		var shooterHeight = BubbleGrid.Static.HEX_WIDTH;
		var bubbleGridOffsetY = 135;

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
			superview: this,
			width: VIEW_WIDTH,
			height: VIEW_HEIGHT - shooterHeight - bubbleGridOffsetY,
			x: BubbleGrid.Static.HEX_WIDTH * 0.2,
			y: bubbleGridOffsetY // based on bg art
		});

		// shooter
		this.shooter = new Shooter({
			superview: this,
			x: 0,
			y: VIEW_HEIGHT - shooterHeight,
			width: VIEW_WIDTH,
			height: shooterHeight
		});

		this.setupEvents();
	};

	this.setupEvents = function () {
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
			this.shooter.launchAt(point);
		};
	};

	this.startGame = function () {
		// init bubbles
		// DEBUG: example level building
		this.bubbleGrid.fillRows(2);
		this.bubbleGrid.fillRows(7, 8);
		this.bubbleGrid.fillRows(11,12);
	};

	this.render = function (context) {
		this.bubbleGrid.draw(context);
	};
});
