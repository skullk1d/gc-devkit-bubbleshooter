import animate;
import device;

import math.geom.Rect as Rect;
import math.geom.intersect as intersect;
import math.geom.Line as Line;

import ui.ImageView;
import ui.resource.Image as Image;
import ui.TextView;
import ui.View;

import src.components.BubbleGrid as BubbleGrid;
import src.components.Shooter as Shooter;
import src.components.soundcontroller as soundcontroller;

import src.enums as Enums;

/*
 * The game screen is a singleton view that consists of
 * a scoreboard, bubble grid, player's cannon, and bubble queue.
 */

// const
 const VIEW_WIDTH = 320;
 const VIEW_HEIGHT = 480;
 const MATCH_BENCH = 3; // match 3 cluster
 const BUBBLE_POINTS = 50;
 const FONT_FAMILY = 'Riffic';
 const MESSAGE_POS_Y = 60;
 const TURN_BENCH = 6;

var skin = Enums.Skins.TOON;
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
		this._levelLayouts = [
			[1,4],
			[1,6],
			[1,8],
			[1,8],
			[1,8]
		]; // TODO: staggar fill rows and link at least one bubble between
		this.currentLevel = 0;
		this._isLaunching = false;
		this.score = 0;
		this.highScore = 0;
		this._turnCount = 0;
		this._turnBench = TURN_BENCH;

		this.style.width = VIEW_WIDTH;
		this.style.height = VIEW_HEIGHT;

		this._sound = soundcontroller.getSound();

		var shooterHeight = BubbleGrid.Static.HEX_WIDTH;
		var bubbleGridOffsetX = BubbleGrid.Static.HEX_WIDTH * 0.2;
		var bubbleGridOffsetY = 60 * 2;

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
			height: VIEW_HEIGHT - bubbleGridOffsetY,
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

		// score
		var textViewParams = {
			superview: this,
			x: 0,
			y: 28,
			width: 300,
			height: 28,
			autoSize: false,
			size: 24,
			verticalAlign: 'middle',
			horizontalAlign: 'right',
			wrap: false,
			strokeWidth: '3',
			strokeColor: '#403E3E',
			color: '#fff',
			text: '0',
			fontFamily: FONT_FAMILY
		};
		this.scoreboard = new ui.TextView(textViewParams);

		textViewParams.y = textViewParams.y - textViewParams.height;
		textViewParams.text = 'Score';
		var scoreLabel = new ui.TextView(textViewParams);

		// message
		this.message = new ui.TextView({
			superview: this,
			x: VIEW_WIDTH, // offscreen
			y: MESSAGE_POS_Y,
			width: 200,
			height: 36,
			autoFontSize: true,
			verticalAlign: 'middle',
			horizontalAlign: 'center',
			wrap: false,
			strokeWidth: '3',
			strokeColor: '#fff',
			color: '#F9912E',
			fontFamily: FONT_FAMILY,
			shadowColor: '#3A96CF'
		});

		// overlay when lose
		this._gridOverlay = new ui.View({
			superview: this,
			image: bgLvl1,
			x: 0,
			y: bubbleGridOffsetY,
			width: VIEW_WIDTH,
			height: VIEW_HEIGHT - bubbleGridOffsetY,
			visible: false,
			opacity: 0,
			backgroundColor: 'rgba(0,0,0,0.5)',
			zIndex: 2
		});

		// high score (shown after game ends)
		textViewParams = {
			superview: this._gridOverlay,
			x: 0,
			y: this._gridOverlay.style.height / 2,
			width: VIEW_WIDTH,
			height: 28,
			autoSize: false,
			size: 24,
			verticalAlign: 'middle',
			horizontalAlign: 'center',
			wrap: false,
			strokeWidth: '3',
			strokeColor: '#403E3E',
			color: '#fff',
			text: '0',
			fontFamily: FONT_FAMILY
		};
		this.highScoreBoard = new ui.TextView(textViewParams);

		textViewParams.y = textViewParams.y - textViewParams.height;
		textViewParams.text = 'High Score';
		var highScoreLabel = new ui.TextView(textViewParams);

		// animations
		this._animator = animate(this.shooter.activeBubble);

		this.setupEvents();

		this.on('app:start', this.startGame.bind(this));
	};

	this.setupEvents = function () {
		// DEBUG: add/remove bubbles to hexagon on tap
		// note: keep around for CREATE YOUR OWN LEVEL feature?
		/*var grid = this.bubbleGrid;
		this.onInputSelect = function (e, point) {
			(grid.getBubbleAt(point) ? grid.removeBubbles : grid.addBubbles).call(grid, [ { point: point } ]);
		};*/

		var bubbleGrid = this.bubbleGrid;
		var shooter = this.shooter;

		// capture touches for aim and launch
		this.onInputStart = (evt, point) => {
			this.shooter.aimAt(point);
		};
		this.onInputMove = (evt, point) => {
			this.shooter.aimAt(point);
		};
		this.onInputSelect = (evt, point) => {
			shooter.aimAt(point);
			if (!shooter.isLaunching && this.gameState === Enums.GameStates.PLAY) {
				shooter.launch();
				this._sound.play('shoot');
			}
		};

		// collisions
		this.shooter.on('collided', this.processCollision.bind(this));

		// game states
		function checkLose(existingBubble) {
			// if we collided with the cannon's bubble, then lose
			var hexBubRect = existingBubble.getBoundingShape();
			var activeBubRect = this.shooter.activeBubble.getBoundingShape();
			if (Shooter.Static.circAndCirc(hexBubRect, activeBubRect)) {
				this.endGame(Enums.GameStates.LOSE);
			} else if (existingBubble) {
				// TODO: find real reason for rogue failures in the middle of the grid
				// find next available hex in cluster from bottom 3 hexes in cluster
				var adjacentIds = bubbleGrid.getAdjacentsAt(existingBubble.id).slice(3,5);

				// based on orientation from cannon, check CW or CCW
				if (activeBubRect.x < hexBubRect) {
					adjacentIds.reverse();
				}

				var newBub;
				for (var i = 0; i < adjacentIds.length; i += 1) {
					var adjId = adjacentIds[i];
					var adjBub = bubbleGrid.bubbles[adjId];
					if (!adjBub) {
						// use the lower-most available free hex
						newBub = bubbleGrid.addBubbles([ adjId ]);
						break;
					}
				}
			}
		}

		bubbleGrid.on('addBubbleFailed', existingBubble => {
			// wait til done with collision
			if (shooter.isLaunching) {
				return this.once('processCollision', () => {
					checkLose.call(this, existingBubble);
				});
			}
			checkLose.call(this, existingBubble);
		});
		bubbleGrid.on('removeBubbleSpecial', () => {
			// don't count objective bubbles if resetting the game
			if (this.gameState === Enums.GameStates.LOSE) {
				return;
			}
			this._sound.play('cheer');
			if (!Object.keys(bubbleGrid.specialBubbles).length) {
				this.endGame(Enums.GameStates.WIN);
			}
		});
	};

	this.startGame = function () {
		var bubbleGrid = this.bubbleGrid;

		// infinite mode, when run out repeat final layout but increase level + multiplier
		var layout = this._levelLayouts[Math.min(this.currentLevel, this._levelLayouts.length - 1)];
		if (!layout) {
			/*this.endGame(Enums.GameStates.GAME_OVER_WIN);*/ // comment out for infinite
			// no more layouts, increase difficulty via turn benchmark for adding rows

			this._turnBench = Math.Max(1, this._turnBench - 1);
		}

		/*this.message.setText('Go!');*/

		// if no game state, first run, Tap to play!
		if (!this.gameState) {
			this.message.setText('Tap to PLAY!');
			this._animateMessage('stageTop');

			return setTimeout(() => {
				this.once('InputSelect', () => {
					this._sound.play('level');
					animate(this.message).now({
						x: -1.5 * this.message.style.width
					}, 400, animate.easeIn).then(() => {
						this._gridOverlay.style.update({
							opacity: 0,
							visible: false
						});
					}).then(this.buildLevel.bind(this, layout));
				});
			}, 400);
		}

		// pass in 2d array of layouts to init bubbles
		this.buildLevel(layout);
	};

	this.endGame = function (state) {
		if (this.gameState === state) {
			return;
		}
		this.emit('endGame', state);

		this.gameState = state;
		this._turnCount = 0;

		switch (state) {
			case Enums.GameStates.WIN: // win level
				// TODO: win level, dispaly feedback, tap to continue
				this.currentLevel += 1;
				this.startGame();

				break;

			case Enums.GameStates.LOSE: // lose level
				this._sound.stop('level');

				// update high score?
				this.highScore = Math.max(this.score, this.highScore);
				this.highScoreBoard.setText(this.highScore);

				// animate messages, allow touch to restart when finished
				this.message.setText('Tap to Retry!');
				this._animateMessage('stageTop');

				this._gridOverlay.style.visible = true;
				animate(this._gridOverlay).clear().now({
					opacity: 1
				}, 500, animate.linear).then(() => {
					setTimeout(() => {
						this.once('InputSelect', () => {
							animate(this.message).now({
								x: -1.5 * this.message.style.width
							}, 400, animate.easeIn).then(() => {
								this._gridOverlay.style.update({
									opacity: 0,
									visible: false
								});

								this.reset();
								this.startGame();

								this._sound.play('level');
							});
						});
					}, 600);
				});

				break;
		}
	};

	this.buildLevel = function (layout) {
		// wait for last launch to complete before moving on
		if (this.shooter.isLaunching) {
			return this.once('processCollision', () => {
				this.buildLevel(layout);
			});
		}

		var bubbleGrid = this.bubbleGrid;

		function doBuild() {
			// bubbles to capture to win level
			bubbleGrid.once('addedBubbles', () => {
				this.createObjectiveBubbles(this.currentLevel + 1);
			});
			bubbleGrid.fillRows(layout[0], layout[1]); // rows from, to

			// message
			this.message.setText(`Level ${this.currentLevel + 1}`);
			this._animateMessage('stageLeft');

			this.gameState = Enums.GameStates.PLAY;

			// DEBUG
			/*setInterval(bubbleGrid.pushNewRow.bind(bubbleGrid), 4000);*/
		}

		// clear grid (with no animation if first level)
		bubbleGrid.once('removedBubbles', doBuild.bind(this));
		bubbleGrid.sweep(this.currentLevel > 0);
	};

	this.addScore = function (numBubbles) {
		// rack up the score board
		numBubbles = numBubbles || 0;
		var points = numBubbles * BUBBLE_POINTS * (this.currentLevel + 1); // lvl multiplier
		this.score += points;
		setTimeout(() => {
			var displayedScore = parseInt(this.scoreboard.getText());
			if (displayedScore >= this.score) {
				return;
			}
			this.scoreboard.setText(displayedScore + 10);
			this.addScore();
		}, 6);
	};

	this.createObjectiveBubbles = function (numBubbles) {
		// choose random special "win" bubbles within the first several rows (A-H)
		var bubbleGrid = this.bubbleGrid;

		// create obejctive bubbles to get
		for (var i = 0; i < numBubbles; i += 1) {
			var randBub;
			while (!randBub || randBub.isSpecial) {
				var letterIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
				var randBubId = letterIds[Math.floor(Math.random() * (letterIds.length))] +
					Math.floor(Math.random() * (bubbleGrid.hexesPerLetterRow) + 1);
				randBub = bubbleGrid.bubbles[randBubId];
			}

			bubbleGrid.makeBubbleSpecial(randBub);
		}
	};

	this.processCollision = function (point) {
		var self = this;

		// handle additions, matches, removals
		this._sound.play('bubble');

		var bubbleGrid = this.bubbleGrid;

		var cluster = [];
		var floaters = [];

		// attach active bubble to nearest hex
		function resetShooter() {
			if (!self.shooter.isLaunching) {
				return;
			}

			// launch over, next turn, reset turn cycle & push new bubbles
			self._turnCount += 1;
			self._turnCount = self._turnCount % self._turnBench ? self._turnCount : 0;
			if (!self._turnCount) {
				bubbleGrid.pushNewRow(); // survival element
			}

			self.shooter.reset();

			return self.emit('processCollision');
		}

		// if we couldn't add bubble after collision, then there's a problem
		var addedBubble = bubbleGrid.addBubbles([ point ], this.shooter.activeBubble.bubType)[0];
		if (!addedBubble) {
			return resetShooter(); // failed to add handled in setupEvents
		}

		var i, bub;

		// detect match / clusters
		cluster = bubbleGrid.getClusterAt(addedBubble, true, true);
		if (cluster.length >= MATCH_BENCH) {
			// sound and score
			this._sound.play('success');
			this.addScore(cluster.length);

			// remove floaters after matches removed
			bubbleGrid.once('removedBubbles', () => {
				floaters = bubbleGrid.getFloaters();
				if (floaters.length) {
					this.addScore(floaters.length);

					// wait til everything done before allowing player to shoot again
					bubbleGrid.once('removedBubbles', () => {
						return resetShooter();
					});
					bubbleGrid.removeBubbles(floaters);
				} else {
					return resetShooter();
				}
			});

			// remove all bubs in the cluster
			bubbleGrid.removeBubbles(cluster);
		}

		resetShooter();
	};

	this.reset = function () {
		// reset stats
		this.currentLevel = 0;
		this._isLaunching = false;
		this.score = 0;
		this._turnCount = 0;
		this._turnBench = TURN_BENCH;

		this.scoreboard.setText('0');
	};

	this._animateMessage = function (ani) {
		var self = this;

		var messageWidth = this.message.style.width;
		var messageHeight = this.message.style.height;

		// TODO?: abstract to use with other views
		var animations = {
			stageLeft: function () {
				// sweep in, then sweep out
				self.message.style.update({
					x: VIEW_WIDTH,
					y: MESSAGE_POS_Y
				});

				animate(self.message).clear().now({
					x: (VIEW_WIDTH - messageWidth) * 0.66
				}, 400, animate.easeOut).then({
					x: (VIEW_WIDTH - messageWidth) * 0.5
				}, 1500, animate.linear).then({
					x: -1.5 * messageWidth
				}, 400, animate.easeIn); // DEBUG .wait(500).then(self._animateMessage.bind(self, 'stageLeft'));
			},
			stageTop: function () {
				// sweep from top
				self.message.style.update({
					x: (VIEW_WIDTH - messageWidth) / 2,
					y: -2 * messageHeight
				});

				animate(self.message).clear().now({
					y: MESSAGE_POS_Y
				}, 500, animate.easeIn);
			},
			stop: function () {
				animate(self.message).clear();
			}
		};

		animations[ani]();
	};
});
