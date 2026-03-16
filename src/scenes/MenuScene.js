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
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Title
        this.add.text(640, 80, 'Children of Styx', {
            fontSize: '48px',
            color: '#ffd700',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(640, 140, 'You have just overthrown your father, the God Chronos,\nand have taken over the mortal world.', {
            fontSize: '16px',
            color: '#cccccc',
            align: 'center',
            lineSpacing: 6
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
        const y = 340;

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

        this.add.text(640, 540, 'Under the guidance of the four children of the Goddess Styx,\nyou must guide the mortals to build your ideal society.', {
            fontSize: '16px',
            color: '#cccccc',
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5);

        this.add.text(640, 590, 'Who will you follow? How will you rule?', {
            fontSize: '18px',
            color: '#ffd700',
            fontStyle: 'italic'
        }).setOrigin(0.5);

        // Start button (initially dimmed)
        this.startButton = this.add.text(640, 640, 'Start Game', {
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

        // How to Play button (below Start Game)
        const tutBtn = this.add.text(640, 690, 'How to Play', {
            fontSize: '16px',
            color: '#ffd700',
            backgroundColor: '#2a2a4a',
            padding: { x: 12, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        tutBtn.on('pointerover', () => tutBtn.setColor('#ffffff'));
        tutBtn.on('pointerout', () => tutBtn.setColor('#ffd700'));
        tutBtn.on('pointerdown', () => this.showTutorial());

        // Credits button (bottom left)
        const creditsBtn = this.add.text(20, 700, 'Credits', {
            fontSize: '14px',
            color: '#ffd700',
            backgroundColor: '#2a2a4a',
            padding: { x: 10, y: 4 }
        }).setOrigin(0, 1).setInteractive({ useHandCursor: true });

        creditsBtn.on('pointerover', () => creditsBtn.setColor('#ffffff'));
        creditsBtn.on('pointerout', () => creditsBtn.setColor('#ffd700'));
        creditsBtn.on('pointerdown', () => this.showCredits());
    }

    showCredits() {
        if (this.creditsContainer) return;

        const cx = 640, cy = 360;
        const w = 500, h = 380;

        this.creditsContainer = this.add.container(0, 0).setDepth(100);

        const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.6)
            .setInteractive();
        this.creditsContainer.add(overlay);

        const bg = this.add.rectangle(cx, cy, w, h, 0x1a1a2e)
            .setStrokeStyle(3, 0xffd700);
        this.creditsContainer.add(bg);

        const title = this.add.text(cx, cy - h / 2 + 30, 'Credits', {
            fontSize: '28px',
            color: '#ffd700',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.creditsContainer.add(title);

        const creditsText =
            'Designed by Lipson Creative Media LLC\n\n' +
            'Built with Phaser 3 + Vite\n\n' +
            'Tileset: Land of Pixels – Ancient Greeks by Marceles\n' +
            'Sprites: Greek Temple & Statue Assets by CaptainSkolot\n\n' +
            'Built for the SF Gen AI Game Jam\n' +
            'Hosted by Arcade AI\n' +
            'Sponsored by Bytedance and Tripo AI';

        const body = this.add.text(cx, cy + 20, creditsText, {
            fontSize: '14px',
            color: '#cccccc',
            align: 'center',
            lineSpacing: 4
        }).setOrigin(0.5);
        this.creditsContainer.add(body);

        const closeBtn = this.add.text(cx + w / 2 - 20, cy - h / 2 + 10, 'X', {
            fontSize: '24px',
            color: '#ff3333',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerover', () => closeBtn.setColor('#ff6666'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#ff3333'));
        closeBtn.on('pointerdown', () => {
            this.creditsContainer.destroy();
            this.creditsContainer = null;
        });
        this.creditsContainer.add(closeBtn);
    }

    showTutorial() {
        if (this.tutorialContainer) return;

        const cx = 640, cy = 360;
        const w = 700, h = 500;

        this.tutorialContainer = this.add.container(0, 0).setDepth(100);

        // Dim overlay
        const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.6)
            .setInteractive();
        this.tutorialContainer.add(overlay);

        // Box background
        const bg = this.add.rectangle(cx, cy, w, h, 0x1a1a2e)
            .setStrokeStyle(3, 0xffd700);
        this.tutorialContainer.add(bg);

        // Title
        const title = this.add.text(cx, cy - h / 2 + 30, 'How to Play', {
            fontSize: '28px',
            color: '#ffd700',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.tutorialContainer.add(title);

        // Gameplay text
        const gameplay =
            'Choose your faction — Zeus, Poseidon, or Athena\n\n' +
            'Interact each round — pick a rival faction and choose Violence or Praise\n\n' +
            'Stats drive outcomes — each character has four stats:\n' +
            '  Nike (Fame) — Reputation and life force; game over if it hits 0.\n' +
            '    Rises with wins and praise, falls with losses.\n' +
            '  Zelus (Rivalry) — How tense/confrontational they are.\n' +
            '    Raises the chance of violence. Falls when someone wins.\n' +
            '  Kratos (Power) — Combat strength; decides who wins fights.\n' +
            '    Only changes from winning fights or same-faction praise.\n' +
            '  Bia (Violence) — Aggression; high Bia = less likely to accept\n' +
            '    praise, more likely to choose Violence.\n\n' +
            'Shape the city — the leading faction leaves its mark each round:\n' +
            '  Zeus places temples | Poseidon carves rivers | Athena builds shops\n\n' +
            'Win condition — after 10 rounds, the faction with the most buildings wins';

        const body = this.add.text(cx, cy + 10, gameplay, {
            fontSize: '14px',
            color: '#cccccc',
            align: 'left',
            lineSpacing: 2,
            wordWrap: { width: w - 60 }
        }).setOrigin(0.5);
        this.tutorialContainer.add(body);

        // Red X close button
        const closeBtn = this.add.text(cx + w / 2 - 20, cy - h / 2 + 10, 'X', {
            fontSize: '24px',
            color: '#ff3333',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerover', () => closeBtn.setColor('#ff6666'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#ff3333'));
        closeBtn.on('pointerdown', () => {
            this.tutorialContainer.destroy();
            this.tutorialContainer = null;
        });
        this.tutorialContainer.add(closeBtn);
    }
}
