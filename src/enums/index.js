var Enums = Class(function () {
	// theme for images & sounds
	this.Skins = {
		TOON: 0,
		COSMIC: 1
	};

	this.GameStates = {
		PLAY: 0,
		WIN: 1,
		LOSE: 2,
		GAME_OVER_WIN: 3,
		GAME_OVER_LOSE: 4
	};
});

exports = new Enums();