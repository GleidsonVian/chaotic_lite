// engine-audio.js — Sistema de SFX via Web Audio API (sem arquivos externos)
Object.assign(GameEngine.prototype, {

    // ── Inicialização ────────────────────────────────────────────────────────

    _initAudio() {
        if (this._audioCtx) return;
        try {
            this._audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
            this._audioMuted = false;
            // Botão de mute no DOM (se existir)
            this._syncMuteBtn();
        } catch(e) {
            this._audioCtx = null;
        }
    },

    _getAudioCtx() {
        if (!this._audioCtx) this._initAudio();
        if (!this._audioCtx) return null;
        // Retoma contexto suspenso (política de autoplay dos browsers)
        if (this._audioCtx.state === 'suspended') this._audioCtx.resume();
        return this._audioCtx;
    },

    toggleMute() {
        this._audioMuted = !this._audioMuted;
        this._syncMuteBtn();
    },

    _syncMuteBtn() {
        const btn = document.getElementById('sfx-mute-btn');
        if (btn) btn.textContent = this._audioMuted ? '🔇' : '🔊';
    },

    // ── Utilitário base de síntese ───────────────────────────────────────────

    /**
     * Toca um som sintético.
     * @param {Array<{freq, dur, type?, vol?, detune?}>} notes  — lista de notas
     * @param {Object} opts — { attack, decay, masterVol, filter }
     */
    _playTone(notes, opts = {}) {
        if (this._audioMuted) return;
        const ctx = this._getAudioCtx();
        if (!ctx) return;

        const masterVol = opts.masterVol ?? 0.18;
        const now       = ctx.currentTime;

        notes.forEach(({ freq, dur, type = 'sine', vol = 1, detune = 0, delay = 0 }) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type      = type;
            osc.frequency.setValueAtTime(freq, now + delay);
            if (detune) osc.detune.setValueAtTime(detune, now + delay);

            const attack  = opts.attack ?? 0.005;
            const decay   = opts.decay  ?? dur * 0.6;
            gain.gain.setValueAtTime(0, now + delay);
            gain.gain.linearRampToValueAtTime(masterVol * vol, now + delay + attack);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

            // Filtro passa-baixa opcional (suaviza sons agressivos)
            if (opts.filter) {
                const filt = ctx.createBiquadFilter();
                filt.type            = 'lowpass';
                filt.frequency.value = opts.filter;
                osc.connect(filt);
                filt.connect(gain);
            } else {
                osc.connect(gain);
            }
            gain.connect(ctx.destination);

            osc.start(now + delay);
            osc.stop(now + delay + dur + 0.05);
        });
    },

    // ── Sons do jogo ─────────────────────────────────────────────────────────

    /** Clicar / selecionar uma carta */
    sfxCardClick() {
        this._playTone([
            { freq: 520, dur: 0.07, type: 'sine',   vol: 1   },
            { freq: 780, dur: 0.05, type: 'sine',   vol: 0.5, delay: 0.04 },
        ], { masterVol: 0.12, attack: 0.003 });
    },

    /** Confirmar / carta selecionada com sucesso */
    sfxCardConfirm() {
        this._playTone([
            { freq: 440, dur: 0.08, type: 'triangle', vol: 0.8 },
            { freq: 660, dur: 0.08, type: 'triangle', vol: 0.8, delay: 0.07 },
            { freq: 880, dur: 0.12, type: 'triangle', vol: 1.0, delay: 0.14 },
        ], { masterVol: 0.13, attack: 0.004 });
    },

    /** Ataque declarado — impacto */
    sfxAttack() {
        this._playTone([
            { freq: 180, dur: 0.18, type: 'sawtooth', vol: 1.0 },
            { freq: 120, dur: 0.25, type: 'sawtooth', vol: 0.7, delay: 0.05 },
            { freq:  80, dur: 0.30, type: 'sine',     vol: 0.5, delay: 0.10 },
        ], { masterVol: 0.20, attack: 0.002, filter: 900 });
    },

    /** Dano recebido — pancada */
    sfxHit() {
        this._playTone([
            { freq: 220, dur: 0.12, type: 'square',   vol: 1.0 },
            { freq: 160, dur: 0.18, type: 'sawtooth', vol: 0.6, delay: 0.03 },
        ], { masterVol: 0.16, attack: 0.001, filter: 800 });
    },

    /** Dano crítico / grande */
    sfxHitCritical() {
        this._playTone([
            { freq: 280, dur: 0.10, type: 'sawtooth', vol: 1.0 },
            { freq: 200, dur: 0.20, type: 'square',   vol: 0.8, delay: 0.04 },
            { freq: 140, dur: 0.30, type: 'sine',     vol: 0.5, delay: 0.10 },
            { freq:  90, dur: 0.40, type: 'sine',     vol: 0.3, delay: 0.18 },
        ], { masterVol: 0.22, attack: 0.001, filter: 1000 });
    },

    /** Cura */
    sfxHeal() {
        this._playTone([
            { freq: 523, dur: 0.10, type: 'sine', vol: 0.7 },
            { freq: 659, dur: 0.10, type: 'sine', vol: 0.8, delay: 0.09 },
            { freq: 784, dur: 0.15, type: 'sine', vol: 1.0, delay: 0.18 },
            { freq: 1047,dur: 0.20, type: 'sine', vol: 0.8, delay: 0.27 },
        ], { masterVol: 0.14, attack: 0.006 });
    },

    /** Morte de criatura — som grave descendente */
    sfxDeath() {
        const ctx = this._getAudioCtx();
        if (!ctx || this._audioMuted) return;
        const now  = ctx.currentTime;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass'; filt.frequency.value = 600;
        osc.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
        osc.start(now); osc.stop(now + 0.7);
    },

    /** Mugic conjurada — som mágico */
    sfxMugic() {
        this._playTone([
            { freq: 392, dur: 0.12, type: 'sine',     vol: 0.6 },
            { freq: 523, dur: 0.12, type: 'sine',     vol: 0.7, delay: 0.10 },
            { freq: 659, dur: 0.12, type: 'sine',     vol: 0.8, delay: 0.20 },
            { freq: 784, dur: 0.20, type: 'triangle', vol: 1.0, delay: 0.30 },
            { freq: 1046,dur: 0.25, type: 'sine',     vol: 0.6, delay: 0.42, detune: 5 },
        ], { masterVol: 0.13, attack: 0.008 });
    },

    /** Mugic negada */
    sfxMugicNegate() {
        this._playTone([
            { freq: 440, dur: 0.08, type: 'square', vol: 1.0 },
            { freq: 330, dur: 0.12, type: 'square', vol: 0.8, delay: 0.07 },
            { freq: 220, dur: 0.18, type: 'square', vol: 0.6, delay: 0.16 },
        ], { masterVol: 0.15, attack: 0.002, filter: 700 });
    },

    /** Burst aberto */
    sfxBurstOpen() {
        this._playTone([
            { freq: 200, dur: 0.08, type: 'triangle', vol: 0.5 },
            { freq: 300, dur: 0.10, type: 'triangle', vol: 0.7, delay: 0.06 },
            { freq: 450, dur: 0.14, type: 'sine',     vol: 1.0, delay: 0.14 },
        ], { masterVol: 0.14, attack: 0.003 });
    },

    /** Passar turno / burst */
    sfxPass() {
        this._playTone([
            { freq: 350, dur: 0.06, type: 'sine', vol: 0.6 },
            { freq: 280, dur: 0.10, type: 'sine', vol: 0.4, delay: 0.05 },
        ], { masterVol: 0.10, attack: 0.004 });
    },

    /** Battlegear sacrificado */
    sfxSacrifice() {
        this._playTone([
            { freq: 400, dur: 0.06, type: 'sawtooth', vol: 1.0 },
            { freq: 250, dur: 0.12, type: 'sawtooth', vol: 0.7, delay: 0.05 },
            { freq: 150, dur: 0.20, type: 'sine',     vol: 0.4, delay: 0.13 },
        ], { masterVol: 0.18, attack: 0.002, filter: 800 });
    },

    /** Vitória — fanfarra */
    sfxVictory() {
        this._playTone([
            { freq: 523, dur: 0.12, type: 'triangle', vol: 0.8 },
            { freq: 659, dur: 0.12, type: 'triangle', vol: 0.8, delay: 0.12 },
            { freq: 784, dur: 0.12, type: 'triangle', vol: 0.9, delay: 0.24 },
            { freq: 659, dur: 0.10, type: 'triangle', vol: 0.7, delay: 0.36 },
            { freq: 784, dur: 0.10, type: 'triangle', vol: 0.8, delay: 0.46 },
            { freq: 1046,dur: 0.30, type: 'triangle', vol: 1.0, delay: 0.56 },
        ], { masterVol: 0.16, attack: 0.008 });
    },

    /** Derrota — tom descendente triste */
    sfxDefeat() {
        this._playTone([
            { freq: 392, dur: 0.20, type: 'sine', vol: 0.8 },
            { freq: 330, dur: 0.20, type: 'sine', vol: 0.7, delay: 0.18 },
            { freq: 262, dur: 0.30, type: 'sine', vol: 0.6, delay: 0.36 },
            { freq: 196, dur: 0.40, type: 'sine', vol: 0.5, delay: 0.56 },
        ], { masterVol: 0.15, attack: 0.010 });
    },

    /** Mover criatura no board */
    sfxMove() {
        this._playTone([
            { freq: 440, dur: 0.06, type: 'sine', vol: 0.5 },
            { freq: 550, dur: 0.06, type: 'sine', vol: 0.4, delay: 0.05 },
        ], { masterVol: 0.09, attack: 0.003 });
    },

    /** Novo local revelado */
    sfxLocation() {
        this._playTone([
            { freq: 330, dur: 0.10, type: 'triangle', vol: 0.5 },
            { freq: 415, dur: 0.10, type: 'triangle', vol: 0.6, delay: 0.09 },
            { freq: 523, dur: 0.10, type: 'triangle', vol: 0.7, delay: 0.18 },
            { freq: 659, dur: 0.18, type: 'sine',     vol: 0.9, delay: 0.27 },
        ], { masterVol: 0.13, attack: 0.005 });
    },

    /** Draft: carta adicionada ao deck */
    sfxDraftAdd() {
        this._playTone([
            { freq: 600, dur: 0.06, type: 'sine', vol: 0.7 },
            { freq: 800, dur: 0.08, type: 'sine', vol: 0.5, delay: 0.05 },
        ], { masterVol: 0.10, attack: 0.002 });
    },

    /** Draft: carta removida */
    sfxDraftRemove() {
        this._playTone([
            { freq: 400, dur: 0.06, type: 'sine', vol: 0.5 },
            { freq: 300, dur: 0.08, type: 'sine', vol: 0.4, delay: 0.05 },
        ], { masterVol: 0.09, attack: 0.003 });
    },
});
