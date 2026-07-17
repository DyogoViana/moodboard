(function() {
    const hasEyeDropper = 'EyeDropper' in window;
    const btnEyeDropper = document.getElementById('btn-eye-dropper');
    const colorWheelInput = document.getElementById('color-wheel-input');
    const colorPreview = document.getElementById('color-preview');
    const paletteList = document.getElementById('palette-list');
    let currentHex = '#B0402E';

    function updatePreview(hex) {
        currentHex = hex;
        if(colorPreview) {
            colorPreview.style.backgroundColor = hex;
            colorPreview.textContent = hex;
        }
    }

    async function handleEyeDropper() {
        if (!hasEyeDropper) {
            alert('Seu navegador não suporta a API EyeDropper (use Chrome/Edge).');
            return;
        }
        try {
            const result = await new window.EyeDropper().open();
            updatePreview(result.sRGBHex);
            saveToPalette(result.sRGBHex);
        } catch (e) { /* Usuário cancelou */ }
    }

    function handleWheelInput(e) {
        updatePreview(e.target.value);
        saveToPalette(e.target.value);
    }

    async function saveToPalette(hex) {
        const colorData = { id: 'color_' + Date.now(), hex: hex, createdAt: Date.now() };
        if (typeof DB !== 'undefined' && DB.put) {
            await DB.put('palette', colorData);
            renderPalette();
        }
    }

    async function renderPalette() {
        if(!paletteList) return;
        paletteList.innerHTML = '';
        if (typeof DB !== 'undefined' && DB.getAll) {
            const colors = await DB.getAll('palette');
            colors.sort((a, b) => b.createdAt - a.createdAt).forEach(color => {
                const chip = document.createElement('div');
                chip.className = 'color-chip';
                chip.style.backgroundColor = color.hex;
                chip.title = 'Clique para copiar: ' + color.hex;
                chip.onclick = () => {
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(color.hex);
                        chip.style.transform = 'scale(1.1)';
                        setTimeout(() => chip.style.transform = 'scale(1)', 200);
                    }
                };
                const removeBtn = document.createElement('span');
                removeBtn.className = 'color-chip-remove';
                removeBtn.textContent = '×';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (typeof DB !== 'undefined' && DB.del) {
                        DB.del('palette', color.id).then(renderPalette);
                    }
                };
                chip.appendChild(removeBtn);
                paletteList.appendChild(chip);
            });
        }
    }

    if (btnEyeDropper) {
        btnEyeDropper.addEventListener('click', handleEyeDropper);
        if (!hasEyeDropper) {
            btnEyeDropper.disabled = true;
            btnEyeDropper.title = "Não suportado neste navegador";
            btnEyeDropper.style.opacity = "0.5";
            btnEyeDropper.style.cursor = "not-allowed";
        }
    }
    if (colorWheelInput) colorWheelInput.addEventListener('input', handleWheelInput);
    if (typeof DB !== 'undefined') renderPalette();
})();