const fs = require('fs');

function fixEngineDraft() {
    let content = fs.readFileSync('src/js/engine-draft.js', 'utf8');

    // 1. Mugic Limits (change _getDraftLimit to _getMugicLimit for Mugic logic)
    content = content.replace(/const mgLim = this\._getDraftLimit\(\);/g, 'const mgLim = this._getMugicLimit();');
    content = content.replace(/while \(picked\.length < this\._getDraftLimit\(\) && pool\.length > 0\)/g, 'while (picked.length < this._getMugicLimit() && pool.length > 0)');
    content = content.replace(/const lim = this\._getDraftLimit\(\);\s*for \(const \{ mg \} of recs\) \{/g, 'const lim = this._getMugicLimit();\n        for (const { mg } of recs) {');
    content = content.replace(/Componha seu Arsenal Mugic \(\$\{this\._getDraftLimit\(\)\} Cartas\)/g, 'Componha seu Arsenal Mugic (${this._getMugicLimit()} Cartas)');
    content = content.replace(/for \(let i = 0; i < this\._getDraftLimit\(\); i\+\+\) \{\s*if \(i < this\.draftedMugics\.length\)/g, 'for (let i = 0; i < this._getMugicLimit(); i++) {\n            if (i < this.draftedMugics.length)');
    content = content.replace(/const mgLimit = this\._getDraftLimit\(\);\s*counter\.innerText = `\$\{this\.draftedMugics\.length\} \/ \$\{mgLimit\} Escolhidas`;/g, 'const mgLimit = this._getMugicLimit();\n        counter.innerText = `${this.draftedMugics.length} / ${mgLimit} Escolhidas`;');
    content = content.replace(/if \(this\.draftedMugics && this\.draftedMugics\.length === this\._getDraftLimit\(\)\)/g, 'if (this.draftedMugics && this.draftedMugics.length === this._getMugicLimit())');
    content = content.replace(/if \(this\.mugics && this\.mugics\.length > 0\) \{\s*for \(let i = 0; i < this\._getDraftLimit\(\); i\+\+\) \{/g, 'if (this.mugics && this.mugics.length > 0) {\n                for (let i = 0; i < this._getMugicLimit(); i++) {');
    content = content.replace(/const aiMgLimit = this\._getDraftLimit\(\);/g, 'const aiMgLimit = this._getMugicLimit();');
    content = content.replace(/const diff = this\.aiDifficulty \|\| 'easy';\s*let aiCards/g, "const diff = this.aiDifficulty || 'easy';\n        const aiMgLimit = this._getMugicLimit();\n        let aiCards");
    content = content.replace(/if \(this\.mugics && this\.mugics\.length > 0\) \{\s*if \(diff === 'easy'\) \{\s*for \(let i = 0; i < aiLimit; i\+\+\)/g, "if (this.mugics && this.mugics.length > 0) {\n            if (diff === 'easy') {\n                for (let i = 0; i < aiMgLimit; i++) {");
    content = content.replace(/const sorted    = \[\.\.\.usePool\]\.sort\(\(a, b\) =>\s*\(priority\[b\.effectType\] \|\| 0\) - \(priority\[a\.effectType\] \|\| 0\)\s*\);\s*for \(let i = 0; i < aiLimit; i\+\+\)/g, "const sorted    = [...usePool].sort((a, b) =>\n                    (priority[b.effectType] || 0) - (priority[a.effectType] || 0)\n                );\n                for (let i = 0; i < aiMgLimit; i++) {");


    // 2. Location Draft Logic
    const locationMethods = `
    openLocationDraftScreen() {
        this.draftState = 'LOCATIONS';
        this.draftedLocations = [];
        
        const mgScreen  = document.getElementById('mugic-draft-screen');
        const locScreen = document.getElementById('location-draft-screen');
        if (mgScreen)  mgScreen.style.display  = 'none';
        if (locScreen) locScreen.style.display = 'block';
        
        const titleEl = document.getElementById('loc-draft-title');
        if (titleEl) titleEl.textContent = \`Escolha as Cartas de Localização (\${this._getLocationDeckSize()})\`;
        
        this.renderLocationDraft();
    },

    backToMugicDraftFromLocation() {
        const locScreen = document.getElementById('location-draft-screen');
        const mgScreen  = document.getElementById('mugic-draft-screen');
        if (locScreen) locScreen.style.display = 'none';
        if (mgScreen)  mgScreen.style.display  = 'block';
    },

    renderLocationDraft() {
        const locListContainer = document.getElementById('location-list');
        const draftedContainer = document.getElementById('drafted-locations-grid');
        const counter = document.getElementById('loc-draft-counter');
        const finishBtn = document.getElementById('btn-finish-loc-draft');
        
        if (!locListContainer || !draftedContainer) return;

        let availableHtml = '';
        this.locations.forEach((loc, index) => {
            const alreadyDrafted = this.draftedLocations.some(l => l.name === loc.name);
            availableHtml += \`
                <div onclick="game.draftLocation(\${index})"
                     style="background: #1e293b; border: 2px solid \${alreadyDrafted ? '#6366f1' : '#334155'};
                            border-radius: 8px; padding: 10px; cursor: pointer; text-align: center;
                            transition: transform 0.2s;"
                     onmouseover="this.style.transform='scale(1.05)'"
                     onmouseout="this.style.transform='scale(1)'">
                    <h4 style="color:#e2e8f0;font-size:12px;margin-bottom:5px">\${loc.name}</h4>
                    <div style="height:80px;background:#0f172a;margin-bottom:5px;border-radius:4px;overflow:hidden;">
                        \${loc.image ? \\\`<img src="\${loc.image}" style="width:100%;height:100%;object-fit:cover;">\\\` : \\\`<span style="color:#64748b;font-size:24px;line-height:80px;">🌍</span>\\\`}
                    </div>
                </div>
            \`;
        });
        locListContainer.innerHTML = availableHtml;

        let draftedHtml = '';
        const limit = this._getLocationDeckSize();
        for (let i = 0; i < limit; i++) {
            if (i < this.draftedLocations.length) {
                const loc = this.draftedLocations[i];
                draftedHtml += \`
                    <div onclick="game.removeDraftedLocation(\${i})"
                         title="Clique para remover"
                         style="background: rgba(46,204,113,0.15); border: 2px solid #2ecc71; border-radius: 8px;
                                padding: 10px; cursor: pointer; text-align: center; display:flex; flex-direction:column; justify-content:center; align-items:center;"
                         onmouseover="this.style.background='rgba(231,76,60,0.2)';this.style.borderColor='#e74c3c'"
                         onmouseout="this.style.background='rgba(46,204,113,0.15)';this.style.borderColor='#2ecc71'">
                        <span style="color:#2ecc71;font-size:11px;font-weight:bold">\${loc.name}</span>
                    </div>
                \`;
            } else {
                draftedHtml += \`
                    <div style="background: rgba(255,255,255,0.05); border: 2px dashed #475569; border-radius: 8px;
                                display:flex; align-items:center; justify-content:center; height:60px;">
                        <span style="color:#475569;font-size:10px;">Vazio</span>
                    </div>
                \`;
            }
        }
        draftedContainer.innerHTML = draftedHtml;

        if (counter) counter.innerText = \`\${this.draftedLocations.length} / \${limit} Escolhidas\`;

        if (this.draftedLocations.length === limit) {
            if (finishBtn) {
                finishBtn.classList.remove('hidden');
                finishBtn.style.display = 'block';
            }
        } else {
            if (finishBtn) {
                finishBtn.classList.add('hidden');
                finishBtn.style.display = 'none';
            }
        }
    },

    draftLocation(index) {
        const limit = this._getLocationDeckSize();
        if (this.draftedLocations.length >= limit) {
            this.showAlert('✋ Deck Completo', \`Você já escolheu \${limit} Localizações!\`);
            return;
        }
        this.draftedLocations.push(this.locations[index]);
        this.renderLocationDraft();
    },

    removeDraftedLocation(index) {
        this.draftedLocations.splice(index, 1);
        this.renderLocationDraft();
    },

    openAttackDraftScreen() {`;

    content = content.replace(/openAttackDraftScreen\(\) \{/, locationMethods);

    // 3. Update openAttackDraftScreen to hide location-draft-screen
    content = content.replace(
        /const mgScreen  = document\.getElementById\('mugic-draft-screen'\);\s*const atkScreen = document\.getElementById\('attack-draft-screen'\);\s*if \(mgScreen\)  mgScreen\.style\.display  = 'none';/,
        `const locScreen  = document.getElementById('location-draft-screen');\n        const atkScreen = document.getElementById('attack-draft-screen');\n        if (locScreen)  locScreen.style.display  = 'none';`
    );

    fs.writeFileSync('src/js/engine-draft.js', content, 'utf8');
    console.log("Successfully patched engine-draft.js");
}

fixEngineDraft();
