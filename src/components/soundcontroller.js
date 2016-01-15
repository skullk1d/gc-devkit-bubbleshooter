import AudioManager;

exports.sound = null;

/* Initialize the audio files if they haven't been already.
 */
exports.getSound = function () {
	if (!exports.sound) {
		exports.sound = new AudioManager({
			path: 'resources/sounds',
			files: {
				level: {
					path: 'music',
					volume: 0.5,
					background: true,
					loop: true
				},
				shoot: {
					path: 'effect',
					background: false
				},
				bubble: {
					path: 'effect',
					background: false
				},
				success: {
					path: 'effect',
					background: false
				}
			}
		});
	}
	return exports.sound;
};
