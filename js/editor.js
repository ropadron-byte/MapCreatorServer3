// AÑADIR ESTO A TU FUNCIÓN setupEventListeners() (Alrededor de la línea 100):
document.getElementById('centerCharBtn')?.addEventListener('click', centerMapOnCharacter);
document.getElementById('deleteAllCharsBtn')?.addEventListener('click', deleteAllCharacters);


// REEMPLAZAR ESTAS FUNCIONES EN LA SECCIÓN DE PERSONAJES (Alrededor de la línea 200):

function createCharacter() {
    const nameInput = document.getElementById('newCharName');
    const name = nameInput?.value.trim() || `Personaje ${characters.length+1}`;
    
    const maxPM = parseInt(document.getElementById('newCharMove')?.value || 5);
    const range = parseInt(document.getElementById('newCharRange')?.value || 1);

    // Validación básica
    if (maxPM <= 0 || range <= 0) {
        addLogEntry('⚠️ Error: Los PM y el Rango deben ser mayores a 0.');
        return;
    }

    const avatarSel = document.getElementById('avatarSelect')?.value;
    const avatar = uploadedCharImage || (avatarSel === 'default' ? '🎭' : avatarSel);

    const char = {
        id: `c${Date.now()}`, name, maxPM, pm: maxPM, range,
        avatar, row: -1, col: -1, color: _randomColor()
    };
    
    characters.push(char);
    uploadedCharImage = null;
    if (document.getElementById('imgPreview')) document.getElementById('imgPreview').textContent = '(ninguna imagen)';
    if (nameInput) nameInput.value = '';

    addLogEntry(`✨ Creado: ${name} (PM:${maxPM} Rango:${range})`);
    renderCharacterList();
    selectCharacter(char.id);
    saveToLocalStorage();
}

function renderCharacterList() {
    const container = document.getElementById('charListContainer');
    if (!container) return;
    
    if (!characters.length) {
        container.innerHTML = '<div style="color:var(--text-muted); font-size:12px; padding:8px; text-align:center;">Sin personajes creados.</div>';
        return;
    }
    
    container.innerHTML = '';
    for (const ch of characters) {
        const card = document.createElement('div');
        card.className = 'char-card' + (ch.id === selectedCharId ? ' selected' : '');
        card.onclick = () => selectCharacter(ch.id);
        
        const pmPct = Math.round((ch.pm / ch.maxPM) * 100);
        const pmColor = pmPct > 60 ? 'var(--green)' : pmPct > 30 ? 'var(--gold)' : 'var(--red)';
        const posText = ch.row >= 0 ? `[${ch.row}, ${ch.col}]` : 'Sin colocar';

        card.innerHTML = `
            <div class="char-avatar" style="border-color:${ch.color}; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:4px; background:rgba(0,0,0,0.3); font-size: 20px;">
                ${typeof ch.avatar === 'string' && ch.avatar.startsWith('data:') 
                    ? `<img src="${ch.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:2px;">` 
                    : (ch.avatar || '🎭')}
            </div>
            <div class="char-info">
                <div class="char-name">${ch.name}</div>
                <div class="char-pos">📍 ${posText} &nbsp;|&nbsp; 🎯 Rango: ${ch.range}</div>
                <div class="pm-text">PM: ${ch.pm}/${ch.maxPM}</div>
                <div class="pm-bar-wrap">
                    <div class="pm-bar" style="width:${pmPct}%; background-color:${pmColor};"></div>
                </div>
            </div>
        `;
        container.appendChild(card);
    }
}

function selectCharacter(id) {
    selectedCharId = id;
    const char = characters.find(c => c.id === id);
    const tag = document.getElementById('selectedCharTag');
    const tagName = document.getElementById('selectedCharTagName');
    const centerBtn = document.getElementById('centerCharBtn');
    
    if (char) {
        if (tagName) tagName.textContent = `${char.name} (PM: ${char.pm})`;
        if (tag) tag.style.display = 'flex';
        if (centerBtn) centerBtn.style.display = char.row >= 0 ? 'inline-block' : 'none';
    } else {
        if (tag) tag.style.display = 'none';
        if (centerBtn) centerBtn.style.display = 'none';
    }
    
    renderCharacterList();
    updateIndividualMovePanel();
    
    if (char && char.row >= 0) {
        highlightMovableCells();
        centerMapOnCharacter(); // Auto-centrar al seleccionar si ya está colocado
    } else {
        renderGrid();
    }
}

function deleteAllCharacters() {
    if(confirm("⚠️ ¿Estás seguro de que deseas eliminar TODOS los personajes?")) {
        characters = [];
        selectCharacter(null);
        addLogEntry("🗑️ Todos los personajes han sido eliminados.", "destroy");
        renderGrid();
        saveToLocalStorage();
    }
}

function centerMapOnCharacter() {
    const char = characters.find(c => c.id === selectedCharId);
    if (!char || char.row < 0 || !grid) return;
    
    const wrapper = document.getElementById('mapWrapper');
    const cell = document.querySelector(`[data-r="${char.row}"][data-c="${char.col}"]`);
    
    if (wrapper && cell) {
        const wrapperRect = wrapper.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();
        
        wrapper.scrollBy({
            left: cellRect.left - wrapperRect.left - (wrapperRect.width / 2) + (cellRect.width / 2),
            top: cellRect.top - wrapperRect.top - (wrapperRect.height / 2) + (cellRect.height / 2),
            behavior: 'smooth'
        });
        
        // Efecto visual de pulso para resaltar dónde está el personaje
        cell.style.transition = 'transform 0.3s, box-shadow 0.3s';
        cell.style.transform = 'scale(1.3)';
        cell.style.boxShadow = '0 0 20px var(--gold)';
        cell.style.zIndex = '10';
        setTimeout(() => {
            cell.style.transform = '';
            cell.style.boxShadow = '';
            cell.style.zIndex = '';
        }, 700);
    }
}


// REEMPLAZAR EVENTO DE CLICK PARA AÑADIR CONFIRMACIÓN (Alrededor de la línea 450):

function handleGridMouseDown(e) {
    if (!grid) return;
    isMouseDown = true;
    const { row, col } = getCellFromEvent(e);
    if (row < 0) return;

    const tool = getActiveTool();
    if (tool === 'crop') { cropStart = { row, col }; return; }
    if (tool === 'characters') {
        if (placementMode) {
            handleCharacterPlacement(row, col);
            document.getElementById('centerCharBtn').style.display = 'inline-block';
        } else if (selectedCharId) {
            const char = characters.find(c => c.id === selectedCharId);
            if (char && char.row >= 0) {
                const d = dist(char.row, char.col, row, col);
                // Si hace clic dentro del rango de movimiento y tiene PM
                if (d > 0 && d <= char.pm) {
                    if (confirm(`¿Mover a ${char.name} a [${row},${col}] por 1 PM?`)) {
                        moveCharacterTo(row, col);
                    }
                    isMouseDown = false; 
                    return;
                }
            }
        }
        return;
    }
    saveToHistory();
    clearBrushPreview();
    applyTool(row, col, tool);
}


// REEMPLAZAR moveCharacterTo PARA GASTAR SOLO 1 PM (Alrededor de la línea 420):

function moveCharacterTo(row, col) {
    const char = characters.find(c => c.id === selectedCharId);
    if (!char || char.row < 0) return;
    
    const d = dist(char.row, char.col, row, col);
    if (d <= 0 || d > char.pm) return;

    // Actualizar posición
    char.row = row;
    char.col = col;
    
    // 🔥 EL CAMBIO CRÍTICO: 1 PM por acción de movimiento (no por distancia)
    char.pm -= 1;

    addLogEntry(`🚶 ${char.name} se movió a [${row},${col}] (PM restantes: ${char.pm}/${char.maxPM})`);
    
    updateIndividualMovePanel();
    renderGrid();
    renderCharacterList(); 
    highlightMovableCells();
    saveToLocalStorage();
}


// REEMPLAZAR highlightMovableCells PARA AÑADIR TOOLTIPS (Alrededor de la línea 380):

function highlightMovableCells() {
    const char = characters.find(c => c.id === selectedCharId);
    const cells = document.querySelectorAll('.cell');
    
    // Limpiar clases y tooltips previos
    cells.forEach(el => {
        el.classList.remove('reachable', 'in-range');
        if (el.dataset.originalTitle) {
            el.title = el.dataset.originalTitle;
        }
    });
    
    if (!char || char.row < 0 || !showAllChars) return;

    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            const d = dist(char.row, char.col, r, c);
            if (d === 0) continue;
            
            const el = document.querySelector(`[data-r="${r}"][data-c="${c}"]`);
            if (!el) continue;

            // Guardamos el título original (ej: "Edificio de aptos") si no lo hemos guardado
            if (!el.dataset.originalTitle && el.title) {
                el.dataset.originalTitle = el.title;
            } else if (!el.dataset.originalTitle) {
                el.dataset.originalTitle = "";
            }

            if (d <= char.pm) {
                el.classList.add('reachable');
                // Tooltip que muestra la distancia y el coste (1 PM)
                el.title = `🎯 Mover aquí (Costo: 1 PM | Distancia: ${d})\n${el.dataset.originalTitle}`;
            }
            if (d <= char.range && d > 0) {
                el.classList.add('in-range');
            }
        }
    }
}