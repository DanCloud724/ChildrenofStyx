import Phaser from 'phaser';

const WANDER_INTERVAL = 2000;
const WANDER_SPEED = 80;
const PLAYER_SPEED = 150;
const INTERACTION_DURATION = 1000;
const INTERACTION_COOLDOWN = 3000;
const BIA_FADE_PER_SECOND = 0.5;
const FAME_DECAY_PER_SECOND = 0.02;

export class Character {
    constructor(scene, x, y, config = {}) {
        this.scene = scene;

        this.stats = {
            nike: config.nike ?? 50,
            zelus: config.zelus ?? 50,
            kratos: config.kratos ?? 50,
            bia: config.bia ?? 50
        };

        this.isPlayer = config.isPlayer ?? false;
        this.interacting = false;
        this.interactionTimer = 0;
        this.waitingForChoice = false;
        this.cooldowns = new Map();
        this.lastViolentTime = 0;

        this.npcType = config.npcType || 'zeus';
        this.gameObject = scene.add.sprite(x, y, this.npcType);
        this.gameObject.setScale(1.2);
        this.walkAnim = `${this.npcType}_idle`;
        this.idleAnim = `${this.npcType}_idle`;

        scene.physics.add.existing(this.gameObject);
        this.gameObject.body.setCollideWorldBounds(true);
        this.gameObject.body.setBounce(1);

        this.gameObject.play(this.idleAnim);

        // Floating stat display above head (2 rows of 2)
        this.statLabels = {};
        const statKeys = ['nike', 'zelus', 'kratos', 'bia'];
        const statColors = { nike: '#ffd700', zelus: '#ff4444', kratos: '#44aaff', bia: '#aa44ff' };
        const statNames = { nike: 'Fame', zelus: 'Rivalry', kratos: 'Power', bia: 'Violence' };
        // Row 0: Fame, Rivalry | Row 1: Power, Violence
        const statLayout = [
            { key: 'nike', row: 0, col: 0 },
            { key: 'zelus', row: 0, col: 1 },
            { key: 'kratos', row: 1, col: 0 },
            { key: 'bia', row: 1, col: 1 }
        ];
        const labelStyle = {
            fontSize: '13px',
            fontStyle: 'bold',
            backgroundColor: 'rgba(255,255,255,0.65)',
            padding: { left: 5, right: 5, top: 3, bottom: 3 }
        };
        for (const { key, row, col } of statLayout) {
            this.statLabels[key] = scene.add.text(
                x - 40 + col * 80,
                y - 68 + row * 15,
                '',
                { ...labelStyle, color: statColors[key] }
            ).setOrigin(0.5).setDepth(200);
        }
        this.statNames = statNames;
        this.statLayout = statLayout;

        if (this.isPlayer) {
            this.label = scene.add.text(x, y - 45, 'P', {
                fontSize: '14px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5).setDepth(200);
            this.cursors = scene.input.keyboard.createCursorKeys();
            this.wasd = scene.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D
            });
        }

        this.wanderTimer = 0;
    }

    updatePlayerMovement() {
        let vx = 0;
        let vy = 0;
        if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
        else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
        if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
        else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;
        if (vx !== 0 || vy !== 0) {
            const len = Math.sqrt(vx * vx + vy * vy);
            this.gameObject.body.setVelocity(
                (vx / len) * PLAYER_SPEED,
                (vy / len) * PLAYER_SPEED
            );
            this.gameObject.setFlipX(vx < 0);
            if (!this.gameObject.anims.isPlaying || this.gameObject.anims.currentAnim.key !== this.walkAnim) {
                this.gameObject.play(this.walkAnim);
            }
        } else {
            this.gameObject.body.setVelocity(0, 0);
            if (this.idleAnim && (!this.gameObject.anims.isPlaying || this.gameObject.anims.currentAnim.key !== this.idleAnim)) {
                this.gameObject.play(this.idleAnim);
            }
        }
    }

    pickNewDirection() {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const vx = Math.cos(angle) * WANDER_SPEED;
        const vy = Math.sin(angle) * WANDER_SPEED;
        this.gameObject.body.setVelocity(vx, vy);
        this.gameObject.setFlipX(vx < 0);
    }

    canInteractWith(other) {
        if (this.interacting || other.interacting) return false;
        const cooldown = this.cooldowns.get(other);
        return !cooldown || cooldown <= 0;
    }

    startInteraction(violent) {
        this.interacting = true;
        this.interactionTimer = INTERACTION_DURATION;
        this.gameObject.body.setVelocity(0, 0);
    }

    endInteraction(other) {
        this.interacting = false;
        this.gameObject.play(this.idleAnim);
        this.cooldowns.set(other, INTERACTION_COOLDOWN);
        this.pickNewDirection();
    }

    clampStats() {
        for (const key of Object.keys(this.stats)) {
            this.stats[key] = Phaser.Math.Clamp(this.stats[key], 0, 100);
        }
    }

    update(time, delta) {
        const dt = delta / 1000;
        this.stats.bia -= BIA_FADE_PER_SECOND * dt;
        this.stats.nike -= FAME_DECAY_PER_SECOND * dt;
        this.clampStats();

        if (this.interacting) {
            if (!this.waitingForChoice) {
                this.interactionTimer -= delta;
                if (this.interactionTimer <= 0) {
                    this.interacting = false;
                }
            }
        } else if (this.isPlayer) {
            this.gameObject.body.setVelocity(0, 0);
        } else {
            this.wanderTimer += delta;
            if (this.wanderTimer >= WANDER_INTERVAL) {
                this.wanderTimer = 0;
                this.pickNewDirection();
            }
        }

        for (const [other, cd] of this.cooldowns) {
            const remaining = cd - delta;
            if (remaining <= 0) {
                this.cooldowns.delete(other);
            } else {
                this.cooldowns.set(other, remaining);
            }
        }

        if (this.label) {
            this.label.setPosition(this.gameObject.x, this.gameObject.y - 45);
        }

        // Update floating stat positions and values
        if (this.statLabels && this.statLayout) {
            for (const { key, row, col } of this.statLayout) {
                const lbl = this.statLabels[key];
                lbl.setPosition(
                    this.gameObject.x - 40 + col * 80,
                    this.gameObject.y - 68 + row * 15
                );
                lbl.setText(`${this.statNames[key]} ${Math.round(this.stats[key])}`);
            }
        }
    }
}
