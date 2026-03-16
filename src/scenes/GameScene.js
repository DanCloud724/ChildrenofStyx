import Phaser from 'phaser';
import { Character } from '../entities/Character.js';

const INTERACT_DISTANCE = 40;

const NPC_TYPES = ['zeus', 'poseidon', 'athena'];

const CORNER_MARGIN = 40;
const CORNER_SIZE = 140;
const MAX_CHARACTERS_PER_FACTION = 3;
const ARENA_PLAYER_OFFSET = 120;
const ARENA_OPPONENT_OFFSET = 120;
const TOTAL_ROUNDS = 10;
const GOD_NAMES = { zeus: 'Zeus', poseidon: 'Poseidon', athena: 'Athena' };
const FACTION_STAT_BONUS = { zeus: {}, poseidon: { bia: 60 }, athena: {} };
const INTERACTION_DELTA = 5;

const TILE_SIZE = 32;
const TERRAIN_COLS = 17;
const BUILDING_COLS = 51;

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.characters = [];
        this.pendingPlayerInteraction = null;
        this.choiceUI = null;
        this.opponentResultUI = null;
        this.opponentChoiceUI = null;
        this.gameOver = false;
    }

    preload() {
        // Tileset spritesheets (32px)
        this.load.spritesheet('terrain',
            'assets/greeks_tileset/ancient_greeks_tileset/tileset_32px/terrain_32px.png',
            { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
        this.load.spritesheet('buildings',
            'assets/greeks_tileset/ancient_greeks_tileset/tileset_32px/buildings_32px.png',
            { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });

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

        // Background music
        this.load.audio('bgm', 'assets/ancient-drum-loop.mp3');
    }

    create(data) {
        this.characters = [];
        this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

        this.createCity();

        // Background music (looping)
        if (!this.sound.get('bgm')) {
            const bgm = this.sound.add('bgm', { loop: true, volume: 0.35 });
            if (this.sound.locked) {
                this.sound.once('unlocked', () => bgm.play());
            } else {
                bgm.play();
            }
        }

        // God/goddess animations (one idle anim per type)
        for (const type of NPC_TYPES) {
            if (!this.anims.exists(`${type}_idle`)) {
                this.anims.create({
                    key: `${type}_idle`,
                    frames: this.anims.generateFrameNumbers(type, { start: 0, end: 2 }),
                    frameRate: 4, repeat: -1
                });
            }
        }

        // Player type from menu selection (default to zeus)
        const playerType = data?.playerType || 'zeus';
        this.playerFaction = playerType;

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        this.characters.push(new Character(this, cx - ARENA_PLAYER_OFFSET, cy, {
            isPlayer: true,
            npcType: playerType,
            ...FACTION_STAT_BONUS[playerType]
        }));
        const otherFactions = NPC_TYPES.filter(t => t !== playerType);
        for (const npcType of otherFactions) {
            const { x, y } = this.getRandomSpawnPosition();
            this.characters.push(new Character(this, x, y, {
                isPlayer: false,
                npcType,
                ...FACTION_STAT_BONUS[npcType]
            }));
        }

        this.player = this.characters[0];
        this.pendingPlayerInteraction = null;
        this.choiceUI = null;
        this.opponentResultUI = null;
        this.opponentChoiceUI = null;
        this.gameOver = false;

        this.createFactionLeaderboard();
        this.roundCounter = 0;
        this.buildingsPlacedCount = { zeus: 0, poseidon: 0, athena: 0 };
        this.createOpponentChoiceUI();
    }

    getFactionFame() {
        const totals = { zeus: 0, poseidon: 0, athena: 0 };
        for (const c of this.characters) {
            if (totals[c.npcType] !== undefined) {
                totals[c.npcType] += c.stats.nike;
            }
        }
        return totals;
    }

    createFactionLeaderboard() {
        const panelWidth = 200;
        const panelHeight = 110;
        const x = this.scale.width - 16;
        const y = 100;
        const lineHeight = 22;

        const bg = this.add.rectangle(x, y, panelWidth, panelHeight, 0x1a1a2e, 0.9)
            .setOrigin(1, 0)
            .setStrokeStyle(2, 0xffd700)
            .setDepth(250);
        this.factionLeaderboardBg = bg;

        const title = this.add.text(x - panelWidth / 2, y + 8, 'Faction Fame', {
            fontSize: '14px',
            color: '#ffd700',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0).setDepth(251);
        this.factionLeaderboardTitle = title;

        this.factionLeaderboardLines = [];
        for (let i = 0; i < NPC_TYPES.length; i++) {
            const line = this.add.text(x - panelWidth / 2, y + 36 + i * lineHeight, '', {
                fontSize: '14px',
                color: '#ffffff'
            }).setOrigin(0.5, 0).setDepth(251);
            this.factionLeaderboardLines.push(line);
        }
    }

    updateFactionLeaderboard() {
        const totals = this.getFactionFame();
        const sorted = NPC_TYPES
            .map(type => ({ type, fame: totals[type] }))
            .sort((a, b) => b.fame - a.fame);
        for (let i = 0; i < sorted.length; i++) {
            const { type, fame } = sorted[i];
            const name = GOD_NAMES[type];
            this.factionLeaderboardLines[i].setText(`${name}: ${Math.round(fame)}`);
        }
    }

    // Helper: get terrain frame index from col, row in terrain sheet
    tFrame(col, row) {
        return row * TERRAIN_COLS + col;
    }

    // Helper: get building frame index from col, row in buildings sheet
    bFrame(col, row) {
        return row * BUILDING_COLS + col;
    }

    // Place a rectangular region of tiles from a spritesheet, skipping empty frames
    placeRegion(worldX, worldY, key, cols, startCol, startRow, w, h, depth = 0) {
        // Build a set of empty frames on first call
        if (!this._emptyFrames) {
            this._emptyFrames = new Set();
            const tex = this.textures.get(key);
            const src = tex.getSourceImage();
            const canvas = document.createElement('canvas');
            canvas.width = src.width;
            canvas.height = src.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(src, 0, 0);
            const totalCols = Math.floor(src.width / TILE_SIZE);
            const totalRows = Math.floor(src.height / TILE_SIZE);
            for (let fr = 0; fr < totalRows; fr++) {
                for (let fc = 0; fc < totalCols; fc++) {
                    const imgData = ctx.getImageData(
                        fc * TILE_SIZE, fr * TILE_SIZE, TILE_SIZE, TILE_SIZE
                    );
                    const d = imgData.data;
                    // Count non-black, non-transparent pixels
                    let colorPixels = 0;
                    const totalPixels = TILE_SIZE * TILE_SIZE;
                    for (let i = 0; i < d.length; i += 4) {
                        if (d[i + 3] > 10 && d[i] + d[i + 1] + d[i + 2] > 30) {
                            colorPixels++;
                        }
                    }
                    const empty = (colorPixels / totalPixels) < 0.15;
                    if (empty) {
                        this._emptyFrames.add(fr * totalCols + fc);
                    }
                }
            }
        }

        for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
                const frame = (startRow + r) * cols + (startCol + c);
                if (this._emptyFrames.has(frame)) continue;
                this.add.image(worldX + c * TILE_SIZE, worldY + r * TILE_SIZE, key, frame)
                    .setOrigin(0, 0)
                    .setDepth(depth);
            }
        }
    }

    createCity() {
        const W = Math.ceil(this.scale.width / TILE_SIZE);  // 40
        const H = Math.ceil(this.scale.height / TILE_SIZE);  // 23

        // Create ground tilemap
        const map = this.make.tilemap({
            tileWidth: TILE_SIZE,
            tileHeight: TILE_SIZE,
            width: W,
            height: H
        });
        const terrainSet = map.addTilesetImage('terrain_tiles', 'terrain', TILE_SIZE, TILE_SIZE);
        const ground = map.createBlankLayer('ground', terrainSet);
        ground.setDepth(-4);

        // Green background for grass
        this.cameras.main.setBackgroundColor('#4a7a45');

        // Fill with grass tile for texture variety
        ground.fill(65);
        ground.setAlpha(0.6);

        // Walkway paths on a separate layer above rivers but below characters
        const paths = map.createBlankLayer('paths', terrainSet);
        paths.setDepth(-1);

        const pathTile = this.tFrame(3, 0);
        const pathTile2 = this.tFrame(4, 0);

        // Central horizontal road
        for (let x = 2; x < W - 2; x++) {
            paths.putTileAt(pathTile, x, 11);
            paths.putTileAt(pathTile2, x, 12);
        }

        // Vertical road from top to center
        for (let y = 2; y < 13; y++) {
            paths.putTileAt(pathTile, 19, y);
            paths.putTileAt(pathTile2, 20, y);
        }

        // Vertical road from center to bottom
        for (let y = 11; y < H - 1; y++) {
            paths.putTileAt(pathTile, 10, y);
            paths.putTileAt(pathTile2, 11, y);
        }

        // Central plaza area
        for (let x = 16; x < 24; x++) {
            for (let y = 9; y < 14; y++) {
                paths.putTileAt(pathTile, x, y);
            }
        }

        this.riverContainer = this.add.container(0, 0).setDepth(-2);
        this.factionDecorationContainer = this.add.container(0, 0).setDepth(50);
    }

    getLeadingFaction() {
        const totals = this.getFactionFame();
        const sorted = NPC_TYPES
            .map(type => ({ type, fame: totals[type] }))
            .sort((a, b) => b.fame - a.fame);
        return sorted[0]?.type ?? 'zeus';
    }

    getDecorationPositionForIndex(index) {
        const w = this.scale.width;
        const h = this.scale.height;
        const mid = CORNER_MARGIN + CORNER_SIZE / 2;
        const positions = [
            { x: mid, y: mid },
            { x: w - mid, y: mid },
            { x: mid, y: h - mid },
            { x: w - mid, y: h - mid },
            { x: w / 2, y: h - mid },
            { x: w / 2, y: mid },
            { x: mid, y: h / 2 },
            { x: w - mid, y: h / 2 },
            { x: w * 0.25, y: mid },
            { x: w * 0.75, y: h - mid }
        ];
        return positions[index % positions.length];
    }

    placeTilesInContainer(worldX, worldY, key, cols, startCol, startRow, w, h, tint = null) {
        for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
                const frame = (startRow + r) * cols + (startCol + c);
                const img = this.add.image(
                    worldX + c * TILE_SIZE,
                    worldY + r * TILE_SIZE,
                    key,
                    frame
                ).setOrigin(0, 0);
                if (tint != null) img.setTint(tint);
                this.factionDecorationContainer.add(img);
            }
        }
    }

    placeWindingRiver(roundIndex) {
        const W = Math.ceil(this.scale.width / TILE_SIZE);   // ~40
        const H = Math.ceil(this.scale.height / TILE_SIZE);  // ~23
        const WATER_FRAME = 8 * TERRAIN_COLS + 0; // solid blue water tile

        // Each river is defined by waypoints [tileX, tileY] and a width (1-3).
        // The river path connects consecutive waypoints with horizontal/vertical segments.
        // First/last waypoints sit on a stage edge so the river flows off-screen.
        const riverPaths = [
            { w: 1, pts: [[-1,16],[25,16],[25,-1]] },                    // left edge → top
            { w: 2, pts: [[W,5],[15,5],[15,H]] },                        // right edge → bottom
            { w: 1, pts: [[30,-1],[30,10],[-1,10]] },                    // top → left edge
            { w: 1, pts: [[8,H],[8,14],[W,14]] },                        // bottom → right edge
            { w: 2, pts: [[W,3],[20,3],[20,12],[-1,12]] },               // right → left with bend
            { w: 1, pts: [[12,-1],[12,8],[35,8],[35,H]] },               // top → bottom with bends
            { w: 1, pts: [[-1,18],[18,18],[18,-1]] },                    // left → top
            { w: 2, pts: [[W,20],[28,20],[28,6],[14,6],[14,H]] },        // right → bottom, S-curve
            { w: 1, pts: [[-1,2],[10,2],[10,15],[W,15]] },               // left → right with bend
            { w: 1, pts: [[22,-1],[22,11],[36,11],[36,H]] },             // top → bottom zigzag
        ];

        const path = riverPaths[roundIndex % riverPaths.length];
        const halfW = Math.floor(path.w / 2);

        // Collect all tile positions into a Set to avoid duplicates at corners
        const tileSet = new Set();
        const addTile = (tx, ty) => tileSet.add(`${tx},${ty}`);

        for (let i = 0; i < path.pts.length - 1; i++) {
            const [x0, y0] = path.pts[i];
            const [x1, y1] = path.pts[i + 1];

            if (y0 === y1) {
                // Horizontal segment – width expands vertically
                const minX = Math.min(x0, x1);
                const maxX = Math.max(x0, x1);
                for (let tx = minX; tx <= maxX; tx++) {
                    for (let dy = -halfW; dy < -halfW + path.w; dy++) {
                        addTile(tx, y0 + dy);
                    }
                }
            } else {
                // Vertical segment – width expands horizontally
                const minY = Math.min(y0, y1);
                const maxY = Math.max(y0, y1);
                for (let ty = minY; ty <= maxY; ty++) {
                    for (let dx = -halfW; dx < -halfW + path.w; dx++) {
                        addTile(x0 + dx, ty);
                    }
                }
            }
        }

        // Draw sandy shore borders (1 tile around each water tile)
        const shoreSet = new Set();
        for (const key of tileSet) {
            const [tx, ty] = key.split(',').map(Number);
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const sk = `${tx + dx},${ty + dy}`;
                    if (!tileSet.has(sk)) shoreSet.add(sk);
                }
            }
        }
        for (const key of shoreSet) {
            const [tx, ty] = key.split(',').map(Number);
            if (tx < -1 || tx > W + 1 || ty < -1 || ty > H + 1) continue;
            const shore = this.add.rectangle(
                tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2,
                TILE_SIZE, TILE_SIZE, 0xc2a060, 1
            ).setDepth(-1);
            this.riverContainer.add(shore);
        }

        // Place water tiles
        for (const key of tileSet) {
            const [tx, ty] = key.split(',').map(Number);
            if (tx < -1 || tx > W + 1 || ty < -1 || ty > H + 1) continue;
            const img = this.add.image(
                tx * TILE_SIZE, ty * TILE_SIZE,
                'terrain', WATER_FRAME
            ).setOrigin(0, 0);
            this.riverContainer.add(img);
        }
    }

    addOneFactionDecoration(roundIndex) {
        const leading = this.getLeadingFaction();
        const { x: cornerX, y: cornerY } = this.getDecorationPositionForIndex(roundIndex);

        if (leading === 'poseidon') {
            this.placeWindingRiver(roundIndex);
        } else if (leading === 'athena') {
            const shopTilesW = 5;
            const shopTilesH = 4;
            const shopPixelW = shopTilesW * TILE_SIZE;
            const shopPixelH = shopTilesH * TILE_SIZE;
            const worldX = cornerX - shopPixelW / 2;
            const worldY = cornerY - shopPixelH / 2;
            this.placeTilesInContainer(worldX, worldY, 'buildings', BUILDING_COLS, 1, 0, shopTilesW, shopTilesH);
        } else {
            const templeTilesW = 6;
            const templeTilesH = 6;
            const templePixelW = templeTilesW * TILE_SIZE;
            const templePixelH = templeTilesH * TILE_SIZE;
            const worldX = cornerX - templePixelW / 2;
            const worldY = cornerY - templePixelH / 2;
            this.placeTilesInContainer(worldX, worldY, 'buildings', BUILDING_COLS, 32, 2, templeTilesW, templeTilesH);
        }
        this.buildingsPlacedCount[leading]++;
    }

    getFactionCharacterCounts() {
        const counts = { zeus: 0, poseidon: 0, athena: 0 };
        for (const c of this.characters) {
            if (counts[c.npcType] !== undefined) {
                counts[c.npcType]++;
            }
        }
        return counts;
    }

    getRandomCornerPosition() {
        const w = this.scale.width;
        const h = this.scale.height;
        const regions = [
            { xMin: CORNER_MARGIN, xMax: CORNER_MARGIN + CORNER_SIZE, yMin: CORNER_MARGIN, yMax: CORNER_MARGIN + CORNER_SIZE },
            { xMin: w - CORNER_MARGIN - CORNER_SIZE, xMax: w - CORNER_MARGIN, yMin: CORNER_MARGIN, yMax: CORNER_MARGIN + CORNER_SIZE },
            { xMin: CORNER_MARGIN, xMax: CORNER_MARGIN + CORNER_SIZE, yMin: h - CORNER_MARGIN - CORNER_SIZE, yMax: h - CORNER_MARGIN },
            { xMin: w - CORNER_MARGIN - CORNER_SIZE, xMax: w - CORNER_MARGIN, yMin: h - CORNER_MARGIN - CORNER_SIZE, yMax: h - CORNER_MARGIN }
        ];
        const region = regions[Phaser.Math.Between(0, 3)];
        const x = Phaser.Math.Between(region.xMin, region.xMax);
        const y = Phaser.Math.Between(region.yMin, region.yMax);
        return { x, y };
    }

    getRandomSpawnPosition() {
        const w = this.scale.width;
        const h = this.scale.height;
        const cx = Math.floor(w / 2);
        const cy = Math.floor(h / 2);
        const regions = [
            { xMin: CORNER_MARGIN, xMax: CORNER_MARGIN + CORNER_SIZE, yMin: CORNER_MARGIN, yMax: CORNER_MARGIN + CORNER_SIZE },
            { xMin: w - CORNER_MARGIN - CORNER_SIZE, xMax: w - CORNER_MARGIN, yMin: CORNER_MARGIN, yMax: CORNER_MARGIN + CORNER_SIZE },
            { xMin: CORNER_MARGIN, xMax: CORNER_MARGIN + CORNER_SIZE, yMin: h - CORNER_MARGIN - CORNER_SIZE, yMax: h - CORNER_MARGIN },
            { xMin: w - CORNER_MARGIN - CORNER_SIZE, xMax: w - CORNER_MARGIN, yMin: h - CORNER_MARGIN - CORNER_SIZE, yMax: h - CORNER_MARGIN },
            { xMin: cx - CORNER_SIZE, xMax: cx + CORNER_SIZE, yMin: CORNER_MARGIN, yMax: CORNER_MARGIN + CORNER_SIZE },
            { xMin: cx - CORNER_SIZE, xMax: cx + CORNER_SIZE, yMin: h - CORNER_MARGIN - CORNER_SIZE, yMax: h - CORNER_MARGIN },
            { xMin: CORNER_MARGIN, xMax: CORNER_MARGIN + CORNER_SIZE, yMin: cy - CORNER_SIZE, yMax: cy + CORNER_SIZE },
            { xMin: w - CORNER_MARGIN - CORNER_SIZE, xMax: w - CORNER_MARGIN, yMin: cy - CORNER_SIZE, yMax: cy + CORNER_SIZE }
        ];
        const region = regions[Phaser.Math.Between(0, regions.length - 1)];
        const x = Phaser.Math.Between(region.xMin, region.xMax);
        const y = Phaser.Math.Between(region.yMin, region.yMax);
        return { x, y };
    }

    spawnOnePerFaction() {
        const counts = this.getFactionCharacterCounts();
        for (const npcType of NPC_TYPES) {
            if (counts[npcType] >= MAX_CHARACTERS_PER_FACTION) continue;
            const { x, y } = this.getRandomSpawnPosition();
            const npc = new Character(this, x, y, { isPlayer: false, npcType });
            this.characters.push(npc);
        }
    }

    ensureFactionBalance() {
        const counts = this.getFactionCharacterCounts();
        const target = Math.min(MAX_CHARACTERS_PER_FACTION, Math.max(...Object.values(counts)));
        for (const type of NPC_TYPES) {
            let need = target - counts[type];
            while (need-- > 0) {
                const { x, y } = this.getRandomSpawnPosition();
                this.characters.push(new Character(this, x, y, { isPlayer: false, npcType: type, ...FACTION_STAT_BONUS[type] }));
            }
        }
    }

    getNPCOfFaction(faction) {
        const candidates = this.characters.filter(c => !c.isPlayer && c.npcType === faction);
        if (candidates.length === 0) return null;
        return candidates[Phaser.Math.Between(0, candidates.length - 1)];
    }

    createOpponentChoiceUI() {
        this.hideOpponentChoiceUI();
        const cx = this.scale.width / 2;
        const y = this.scale.height - 100;
        const panelWidth = 420;
        const panelHeight = 100;
        const container = this.add.container(cx, y);

        const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a2e, 0.95)
            .setStrokeStyle(3, 0xffd700);
        container.add(bg);

        const title = this.add.text(0, -28, 'Choose who you interact with', {
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(title);

        const buttonWidth = 100;
        const spacing = 24;
        const totalWidth = NPC_TYPES.length * buttonWidth + (NPC_TYPES.length - 1) * spacing;
        const startX = -totalWidth / 2 + buttonWidth / 2;
        NPC_TYPES.forEach((faction, i) => {
            const bx = startX + i * (buttonWidth + spacing);
            const btn = this.add.rectangle(bx, 12, buttonWidth, 44, 0x2a2a4a)
                .setStrokeStyle(2, 0x888888)
                .setInteractive({ useHandCursor: true });
            const label = this.add.text(bx, 12, GOD_NAMES[faction], {
                fontSize: '16px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(btn);
            container.add(label);
            btn.on('pointerover', () => btn.setStrokeStyle(2, 0xffd700));
            btn.on('pointerout', () => btn.setStrokeStyle(2, 0x888888));
            btn.on('pointerdown', () => this.pickFactionOpponent(faction));
        });

        container.setDepth(280);
        this.opponentChoiceUI = container;
    }

    showOpponentChoiceUI() {
        if (this.opponentChoiceUI) this.opponentChoiceUI.setVisible(true);
        else this.createOpponentChoiceUI();
    }

    hideOpponentChoiceUI() {
        if (this.opponentChoiceUI) this.opponentChoiceUI.setVisible(false);
    }

    pickFactionOpponent(faction) {
        let npc = this.getNPCOfFaction(faction);
        if (!npc) {
            const { x, y } = this.getRandomSpawnPosition();
            npc = new Character(this, x, y, { isPlayer: false, npcType: faction, ...FACTION_STAT_BONUS[faction] });
            this.characters.push(npc);
        }
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        npc.gameObject.setPosition(cx + ARENA_OPPONENT_OFFSET, cy);
        this.pendingPlayerInteraction = { player: this.player, npc };
        this.player.startInteraction(false);
        npc.startInteraction(false);
        this.hideOpponentChoiceUI();
        this.showChoiceUI(this.player, npc);
    }

    moveOpponentBackToCrowd(npc) {
        const { x, y } = this.getRandomSpawnPosition();
        npc.gameObject.setPosition(x, y);
    }

    onPlayerInteractionComplete() {
        this.roundCounter++;
        if (this.roundCounter <= TOTAL_ROUNDS) {
            this.addOneFactionDecoration(this.roundCounter - 1);
        }
        this.spawnOnePerFaction();
        this.ensureFactionBalance();
        if (this.roundCounter >= TOTAL_ROUNDS) {
            this.triggerWinnerAnnouncement();
        } else {
            this.showOpponentChoiceUI();
        }
    }

    checkInteractions() {
        if (this.gameOver || this.pendingPlayerInteraction) return;

        for (let i = 0; i < this.characters.length; i++) {
            for (let j = i + 1; j < this.characters.length; j++) {
                const a = this.characters[i];
                const b = this.characters[j];
                if (a.isPlayer || b.isPlayer) continue;

                if (!a.canInteractWith(b)) continue;

                const dist = Phaser.Math.Distance.Between(
                    a.gameObject.x, a.gameObject.y,
                    b.gameObject.x, b.gameObject.y
                );

                if (dist > INTERACT_DISTANCE) continue;

                this.resolveInteraction(a, b);
            }
        }
    }

    resolveInteraction(a, b, options = {}) {
        const forceViolent = options.forceViolent;
        const violent = forceViolent !== undefined
            ? forceViolent
            : (Math.random() * 100 < (a.stats.zelus + b.stats.zelus) / 2);

        a.startInteraction(violent);
        b.startInteraction(violent);

        if (violent) {
            const totalKratos = a.stats.kratos + b.stats.kratos;
            const aWinChance = totalKratos > 0 ? a.stats.kratos / totalKratos : 0.5;
            let aWins;
            if (a.isPlayer && a.stats.kratos === b.stats.kratos) aWins = true;
            else if (b.isPlayer && b.stats.kratos === a.stats.kratos) aWins = false;
            else aWins = Math.random() < aWinChance;

            const winner = aWins ? a : b;
            const loser = aWins ? b : a;

            const d = INTERACTION_DELTA;
            winner.stats.nike += d;
            winner.stats.kratos += d;
            winner.stats.zelus -= d;
            winner.stats.bia += d;

            loser.stats.nike -= d;
            loser.stats.zelus += d;
            loser.stats.bia -= d;

            a.lastViolentTime = this.time.now;
            b.lastViolentTime = this.time.now;
        } else {
            const d = INTERACTION_DELTA;
            a.stats.nike += d;
            b.stats.nike += d;
            a.stats.zelus -= d;
            b.stats.zelus -= d;
            a.stats.bia -= d;
            b.stats.bia -= d;
        }

        a.clampStats();
        b.clampStats();

        if ((a.isPlayer && a.stats.nike <= 0) || (b.isPlayer && b.stats.nike <= 0)) {
            this.time.delayedCall(1000, () => this.triggerGameOver());
        }

        const isPlayerInteraction = a.isPlayer || b.isPlayer;
        this.time.delayedCall(1000, () => {
            a.endInteraction(b);
            b.endInteraction(a);
            if (isPlayerInteraction) {
                const npc = a.isPlayer ? b : a;
                this.moveOpponentBackToCrowd(npc);
                this.onPlayerInteractionComplete();
            }
        });
    }

    triggerWinnerAnnouncement() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.hideChoiceUI();
        this.hideOpponentResultUI();
        this.hideOpponentChoiceUI();
        this.pendingPlayerInteraction = null;

        const counts = this.buildingsPlacedCount;
        const winnerFaction = NPC_TYPES.reduce((best, type) =>
            (counts[type] > (counts[best] ?? 0) ? type : best),
        NPC_TYPES[0]);
        const winnerName = GOD_NAMES[winnerFaction];
        const playerWon = winnerFaction === this.playerFaction;

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.7)
            .setDepth(400);

        const title = this.add.text(cx, cy - 50, playerWon ? `Winner: ${winnerName}!` : 'You Lose', {
            fontSize: '48px',
            color: playerWon ? '#ffd700' : '#ff4444',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(401);

        const message = this.add.text(cx, cy, playerWon
            ? `${winnerName} has the most buildings.`
            : `${winnerName} has the most buildings. Your faction didn't win.`,
        {
            fontSize: '22px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(401);

        const playAgainBtn = this.add.rectangle(cx, cy + 80, 200, 48, 0x2a4a2a)
            .setStrokeStyle(2, 0x44ff44)
            .setInteractive({ useHandCursor: true })
            .setDepth(401);
        this.add.text(cx, cy + 80, 'Play Again', {
            fontSize: '22px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(401);

        playAgainBtn.on('pointerover', () => playAgainBtn.setStrokeStyle(2, 0x88ff88));
        playAgainBtn.on('pointerout', () => playAgainBtn.setStrokeStyle(2, 0x44ff44));
        playAgainBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    }

    triggerGameOver() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.hideChoiceUI();
        this.hideOpponentChoiceUI();
        this.pendingPlayerInteraction = null;

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.7)
            .setDepth(400);

        const title = this.add.text(cx, cy - 50, 'Game Over', {
            fontSize: '48px',
            color: '#ff4444',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(401);

        const message = this.add.text(cx, cy, 'Your fame has fallen to zero.', {
            fontSize: '22px',
            color: '#ffffff'
        }).setOrigin(0.5).setDepth(401);

        const playAgainBtn = this.add.rectangle(cx, cy + 80, 200, 48, 0x2a4a2a)
            .setStrokeStyle(2, 0x44ff44)
            .setInteractive({ useHandCursor: true })
            .setDepth(401);
        const playAgainText = this.add.text(cx, cy + 80, 'Play Again', {
            fontSize: '22px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(401);

        playAgainBtn.on('pointerover', () => playAgainBtn.setStrokeStyle(2, 0x88ff88));
        playAgainBtn.on('pointerout', () => playAgainBtn.setStrokeStyle(2, 0x44ff44));
        playAgainBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    }

    showChoiceUI(player, npc) {
        this.hideChoiceUI();
        const godName = GOD_NAMES[npc.npcType] || npc.npcType;
        const panelWidth = 420;
        const panelHeight = 140;
        const cx = this.scale.width / 2;
        const panelY = this.scale.height - panelHeight / 2 - 40;

        const container = this.add.container(cx, panelY);

        const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a2e, 0.95)
            .setStrokeStyle(3, 0xffd700);
        container.add(bg);

        const prompt = this.add.text(0, -40, `You meet ${godName}. Choose your response.`, {
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(prompt);

        const buttonWidth = 160;
        const buttonHeight = 44;
        const spacing = 24;

        const violenceBtn = this.add.rectangle(-buttonWidth / 2 - spacing / 2, 20, buttonWidth, buttonHeight, 0x8b0000)
            .setStrokeStyle(2, 0xff4444)
            .setInteractive({ useHandCursor: true });
        const violenceText = this.add.text(-buttonWidth / 2 - spacing / 2, 20, 'Violence', {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(violenceBtn);
        container.add(violenceText);

        const praiseBtn = this.add.rectangle(buttonWidth / 2 + spacing / 2, 20, buttonWidth, buttonHeight, 0x2a4a2a)
            .setStrokeStyle(2, 0x44ff44)
            .setInteractive({ useHandCursor: true });
        const praiseText = this.add.text(buttonWidth / 2 + spacing / 2, 20, `Praise ${godName}`, {
            fontSize: '16px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(praiseBtn);
        container.add(praiseText);

        violenceBtn.on('pointerover', () => violenceBtn.setStrokeStyle(2, 0xff8888));
        violenceBtn.on('pointerout', () => violenceBtn.setStrokeStyle(2, 0xff4444));
        violenceBtn.on('pointerdown', () => this.showOpponentChoiceAndContinue(true));

        praiseBtn.on('pointerover', () => praiseBtn.setStrokeStyle(2, 0x88ff88));
        praiseBtn.on('pointerout', () => praiseBtn.setStrokeStyle(2, 0x44ff44));
        praiseBtn.on('pointerdown', () => this.showOpponentChoiceAndContinue(false));

        container.setDepth(300);
        this.choiceUI = container;
    }

    showOpponentChoiceAndContinue(playerChoseViolent) {
        const { npc } = this.pendingPlayerInteraction;
        // Violence chance from Rivalry (Zelus) and aggression (Bia); otherwise Praise
        const violenceChance = (npc.stats.zelus + npc.stats.bia) / 2;
        const opponentChoseViolent = Math.random() * 100 < violenceChance;
        this.pendingPlayerChoice = playerChoseViolent;
        this.hideChoiceUI();
        this.showOpponentResultUI(npc, opponentChoseViolent);
    }

    showOpponentResultUI(npc, opponentChoseViolent) {
        this.hideOpponentResultUI();
        const godName = GOD_NAMES[npc.npcType] || npc.npcType;
        const choiceText = opponentChoseViolent ? 'Violence' : 'Praise';
        const panelWidth = 420;
        const panelHeight = 100;
        const cx = this.scale.width / 2;
        const panelY = this.scale.height - panelHeight / 2 - 40;

        const container = this.add.container(cx, panelY);
        const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a2e, 0.95)
            .setStrokeStyle(3, 0xffd700);
        container.add(bg);
        const msg = this.add.text(0, -15, `${godName} chose: ${choiceText}`, {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(msg);
        const continueBtn = this.add.rectangle(0, 25, 180, 44, 0x2a4a2a)
            .setStrokeStyle(2, 0x44ff44)
            .setInteractive({ useHandCursor: true });
        const continueText = this.add.text(0, 25, 'Continue', {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(continueBtn);
        container.add(continueText);
        continueBtn.on('pointerover', () => continueBtn.setStrokeStyle(2, 0x88ff88));
        continueBtn.on('pointerout', () => continueBtn.setStrokeStyle(2, 0x44ff44));
        continueBtn.on('pointerdown', () => {
            this.hideOpponentResultUI();
            this.resolvePlayerChoice(this.pendingPlayerChoice);
        });
        container.setDepth(300);
        this.opponentResultUI = container;
    }

    hideOpponentResultUI() {
        if (this.opponentResultUI) {
            this.opponentResultUI.destroy();
            this.opponentResultUI = null;
        }
    }

    hideChoiceUI() {
        if (this.choiceUI) {
            this.choiceUI.destroy();
            this.choiceUI = null;
        }
    }

    resolvePlayerChoice(violent) {
        const { player, npc } = this.pendingPlayerInteraction;
        this.hideChoiceUI();
        this.hideOpponentResultUI();
        this.pendingPlayerInteraction = null;

        if (violent) {
            this.resolveInteraction(player, npc, { forceViolent: true });
            return;
        }

        const d = INTERACTION_DELTA;
        this.resolveInteraction(player, npc, { forceViolent: false });
        npc.stats.nike += d;
        if (npc.npcType === this.playerFaction) npc.stats.kratos += d;
        npc.clampStats();
    }

    update(time, delta) {
        if (this.gameOver) return;
        this.player.waitingForChoice = !!this.pendingPlayerInteraction;
        for (const character of this.characters) {
            character.update(time, delta);
        }
        this.updateFactionLeaderboard();
        this.checkInteractions();
    }
}
