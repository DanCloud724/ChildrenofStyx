import Phaser from 'phaser';

const NPC_TYPES = ['zeus', 'poseidon', 'athena'];
const GOD_NAMES = { zeus: 'Zeus', poseidon: 'Poseidon', athena: 'Athena' };

export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {
        // God/goddess sprites (64x64 per frame, 3 frames each)
        this.load.spritesheet('zeus', 'assets/gods/Sprites/GodZeus-Sheet.png', {
            frameWidth: 64, frameHeight: 64
        });
        this.load.spritesheet('poseidon', 'assets/gods/Sprites/GodPoseidon-Sheet.png', {
            frameWidth: 64, frameHeight: 64
        });
        this.load.spritesheet('athena', 'assets/gods/Sprites/GoddessAthena-Sheet.png', {
            frameWidth: 64, frameHeight: 64
        });

        // Preload background music so it's ready for GameScene
        this.load.audio('bgm', 'assets/ancient-drum-loop.mp3');
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Title
        this.add.text(640, 80, 'Children of Styx', {
            fontSize: '48px',
            color: '#ffd700',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(640, 140, 'Choose Your Champion', {
            fontSize: '24px',
            color: '#cccccc'
        }).setOrigin(0.5);

        // Create idle animations
        for (const type of NPC_TYPES) {
            if (!this.anims.exists(`${type}_idle`)) {
                this.anims.create({
                    key: `${type}_idle`,
                    frames: this.anims.generateFrameNumbers(type, { start: 0, end: 2 }),
                    frameRate: 4, repeat: -1
                });
            }
        }

        // Character selection cards
        const spacing = 300;
        const startX = 640 - spacing;
        const y = 380;

        this.selected = null;
        this.cards = [];

        for (let i = 0; i < NPC_TYPES.length; i++) {
            const type = NPC_TYPES[i];
            const x = startX + i * spacing;

            // Card background
            const card = this.add.rectangle(x, y, 200, 280, 0x2a2a4a)
                .setStrokeStyle(3, 0x555588)
                .setInteractive({ useHandCursor: true });

            // Sprite preview
            const sprite = this.add.sprite(x, y - 40, type)
                .setScale(2.5);
            sprite.play(`${type}_idle`);

            // Name label
            this.add.text(x, y + 80, GOD_NAMES[type], {
                fontSize: '22px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            // Hover and click
            card.on('pointerover', () => {
                if (this.selected !== type) {
                    card.setStrokeStyle(3, 0xffd700);
                }
            });
            card.on('pointerout', () => {
                if (this.selected !== type) {
                    card.setStrokeStyle(3, 0x555588);
                }
            });
            card.on('pointerdown', () => {
                this.selected = type;
                // Reset all cards
                this.cards.forEach(c => c.card.setStrokeStyle(3, 0x555588));
                // Highlight selected
                card.setStrokeStyle(4, 0xffd700);
                card.setFillStyle(0x3a3a5a);
                this.startButton.setAlpha(1);
            });

            this.cards.push({ card, type });
        }

        // Start button (initially dimmed)
        this.startButton = this.add.text(640, 580, 'Start Game', {
            fontSize: '28px',
            color: '#ffd700',
            fontStyle: 'bold',
            backgroundColor: '#2a2a4a',
            padding: { x: 30, y: 12 }
        }).setOrigin(0.5).setAlpha(0.3).setInteractive({ useHandCursor: true });

        this.startButton.on('pointerover', () => {
            if (this.selected) this.startButton.setColor('#ffffff');
        });
        this.startButton.on('pointerout', () => {
            if (this.selected) this.startButton.setColor('#ffd700');
        });
        this.startButton.on('pointerdown', () => {
            if (this.selected) {
                this.scene.start('GameScene', { playerType: this.selected });
            }
        });
    }
}
