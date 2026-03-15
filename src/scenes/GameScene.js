import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
    }

    create() {
        this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'Arcade GenAI Jam',
            { fontSize: '48px', color: '#ffffff' }
        ).setOrigin(0.5);
    }

    update(time, delta) {
    }
}
