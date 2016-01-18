// main, entry point

import device;
import ui.TextView as TextView;
import ui.StackView as StackView;

import src.screens.GameScreen as GameScreen;

exports = Class(GC.Application, function () {
	this.initUI = function () {
		var gamescreen = new GameScreen();

		this.view.style.backgroundColor = '#000'; // '#3DC1F2';

		// Create a stackview of size 320x480, then scale it to fit horizontally
		// Add a new StackView to the root of the scene graph
		var rootView = new StackView({
			superview: this,
			x: 0,
			y: 0,
			width: 320,
			height: 480,
			clip: true,
			scale: device.width / 320
		});

		rootView.push(gamescreen);
		gamescreen.emit('app:start');
	};

	this.launchUI = function () {};
});

