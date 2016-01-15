var Enums = Class(function () {
	// theme for images & sounds
	this.Skins = {
		TOON: 0,
		COSMIC: 1
	};

	this.GameStates = {
		WIN: 0,
		LOSE: 1,
		GAME_OVER_WIN: 2,
		GAME_OVER_LOSE: 3
	};
});

exports = new Enums();