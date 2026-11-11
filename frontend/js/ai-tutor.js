/* ================================================================
   AI ONLINE TUTOR — Multimodal edition
   Text · Voice · Camera · File upload · Handwriting · Formulas
   Falls back to built-in KB when the backend AI is unavailable.
   ================================================================ */
(function () {
    'use strict';

    const LS_SESSIONS = 'zbs_ai_tutor_sessions_v1';

    /* ---------- DOM ---------- */
    const modal       = document.getElementById('aiTutorModal');
    if (!modal) return;

    const chat        = document.getElementById('aiTutorChat');
    const input       = document.getElementById('aiTutorInput');
    const sendBtn     = document.getElementById('aiTutorSendBtn');
    const levelSel    = document.getElementById('aiTutorLevel');
    const subjectSel  = document.getElementById('aiTutorSubject');
    const suggestions = document.getElementById('aiTutorSuggestions');
    const charcount   = document.getElementById('aiTutorCharcount');
    const attachWrap  = document.getElementById('aiTutorAttachments');
    const timerEl     = document.getElementById('aiTutorSessionTimer');
    const historyPanel = document.getElementById('aiTutorHistoryPanel');
    const historyList  = document.getElementById('aiTutorHistoryList');
    const fileInput    = document.getElementById('aiTutorFileInput');

    /* ---------- State ---------- */
    let messages = [];
    let currentSessionId = null;
    let sessionStart = Date.now();
    let sessionTimer = null;
    let isBusy = false;
    let attachments = [];     // { id, kind: 'image'|'file', name, mime, size, dataUrl, text? }

    /* ================================================================
       TONE / HINTS
       ================================================================ */
    const LEVEL_TONE = {
        primary:    'very simple words, short sentences, friendly and encouraging',
        junior:     'clear and simple, with examples a 13-year-old understands',
        senior:     'exam-focused, structured, with definitions and worked examples',
        college:    'academic but accessible, with references to concepts and applications',
        university: 'rigorous, with precise terminology and critical analysis',
        adult:      'practical, concise, professional'
    };
    const SUBJECT_HINTS = {
        mathematics: 'Show every step. Use plain-text math (e.g. "3x + 7 = 22", "x = 5").',
        physics:     'State the formula, substitute values, and include units in the answer.',
        chemistry:   'Balance equations and mention reaction conditions.',
        biology:     'Use correct biological terms and give a real-world example.',
        english:     'Give structure (intro, body, conclusion) and model sentences.',
        'computer-science': 'Include short code snippets in fenced blocks where useful.',
        economics:   'Define the concept, then apply it to a real example.',
        business:    'Use business frameworks and practical examples.',
        geography:   'Reference locations, processes, and cause-effect.',
        history:     'Give dates, causes, and consequences.',
        civics:      'Explain rights, duties, and real civic scenarios.',
        agriculture: 'Give practical, season-aware advice for Zambian/African farms.',
        languages:   'Include pronunciation, translation, and example sentences.',
        other:       'Be thorough and clear.'
    };

    /* ================================================================
       KNOWLEDGE BASE (offline fallback)
       ================================================================ */
    const KB = [
        { keys: ['photosynthesis'], answer: `**Photosynthesis** is how green plants make their own food.

**Word equation:** carbon dioxide + water → glucose + oxygen (with light and chlorophyll).

**Balanced:** 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂

**Where:** chloroplasts of leaf cells, mostly palisade mesophyll.

**Two stages:**
1. **Light reactions** (thylakoids): water splits, O₂ released, ATP + NADPH made.
2. **Calvin cycle** (stroma): CO₂ fixed into glucose using ATP + NADPH.

It produces the oxygen we breathe and is the base of almost every food chain.` },

        { keys: ["newton's laws", 'laws of motion'], answer: `**Newton's three laws of motion**

1. **Law of inertia** — An object stays at rest or in uniform motion unless a net external force acts on it. *Example:* a book stays on a table until pushed.
2. **F = ma** — Force equals mass × acceleration. The bigger the force, the bigger the acceleration; the bigger the mass, the smaller the acceleration. *Example:* pushing an empty trolley is easier than a full one.
3. **Action–reaction** — Every action has an equal and opposite reaction. *Example:* a rocket pushes gas downward, and the gas pushes the rocket upward.` },

        { keys: ['mitosis', 'meiosis', 'difference between mitosis and meiosis'], answer: `**Mitosis vs Meiosis**

| Feature | Mitosis | Meiosis |
|---|---|---|
| Purpose | Growth & repair | Gamete formation |
| Divisions | 1 | 2 |
| Daughter cells | 2 (diploid) | 4 (haploid) |
| Variation | None | Yes |

**Mitosis makes copies; meiosis makes variety.**

- **Mitosis:** skin cells, growth, replacing worn-out cells.
- **Meiosis:** sperm / egg production, halves the chromosome number.` },

        { keys: ['world war i', 'ww1', 'causes of ww1'], answer: `**Causes of World War I — M.A.I.N.**

- **Militarism** — arms race, especially Germany vs Britain.
- **Alliances** — Triple Alliance (Germany, Austria-Hungary, Italy) vs Triple Entente (Britain, France, Russia).
- **Imperialism** — colonial rivalry in Africa/Asia.
- **Nationalism** — Balkan tensions; Serbia wanted to unite South Slavs.

**Spark:** assassination of Archduke Franz Ferdinand in Sarajevo, 28 June 1914.

**Consequences:** Austria-Hungary declared war on Serbia; alliances pulled in the rest of Europe within weeks.` },

        { keys: ['supply and demand', 'supply & demand'], answer: `**Supply & demand** sets prices in a market.

- **Law of demand:** price ↑ → quantity demanded ↓.
- **Law of supply:** price ↑ → quantity supplied ↑.
- **Equilibrium:** the price where the two curves cross — the market-clearing price.

**Shifts:**
- Demand ↑ with higher income, fashion, population, or higher price of substitutes.
- Supply ↑ with cheaper inputs, better technology, or more sellers.

**Example:** a drought reduces maize supply → supply curve shifts left → price of maize rises.` },

        { keys: ['3x + 7 = 22', 'solve 3x', 'linear equation'], answer: `**Solve 3x + 7 = 22**

**Step 1 — Isolate the x term.** Subtract 7 from both sides:
3x + 7 − 7 = 22 − 7
3x = 15

**Step 2 — Divide by 3.**
x = 15 ÷ 3
x = 5

**Check:** 3(5) + 7 = 15 + 7 = 22 ✓

**Answer: x = 5**` },

        { keys: ['quadratic formula', 'solve quadratic'], answer: `**The quadratic formula**

For any equation in the form **ax² + bx + c = 0**:

x = (−b ± √(b² − 4ac)) / (2a)

**Steps:**
1. Write in standard form ax² + bx + c = 0.
2. Identify a, b, c.
3. Discriminant D = b² − 4ac:
   • D > 0 → two real roots
   • D = 0 → one repeated root
   • D < 0 → no real roots
4. Substitute and simplify.

**Example:** x² − 5x + 6 = 0 → a=1, b=−5, c=6 → D = 25 − 24 = 1 → x = (5 ± 1)/2 → x = 3 or x = 2.` },

        { keys: ['balance a chemical equation', 'balancing equations', 'balance chemical'], answer: `**Balancing chemical equations — step by step**

Example: **H₂ + O₂ → H₂O**

**Step 1 — Count atoms.**
Left: H=2, O=2 · Right: H=2, O=1

**Step 2 — Balance one element at a time.** Put 2 in front of H₂O:
H₂ + O₂ → 2H₂O
Now right has H=4, O=2. Left has H=2, O=2.

**Step 3 — Fix hydrogen.** Put 2 in front of H₂:
2H₂ + O₂ → 2H₂O
Left: H=4, O=2 · Right: H=4, O=2 ✓

**Rules:**
- Change coefficients only, never subscripts.
- Balance metals first, then non-metals, then H, then O.
- Check every element at the end.` },

        { keys: ['essay outline', 'climate change essay', 'write an essay on climate change'], answer: `**Essay outline — "Climate change: causes, effects, and solutions"**

**Introduction**
- Hook: a striking fact (e.g. "The last decade was the hottest on record.")
- Define climate change briefly.
- Thesis: *Climate change is driven mainly by human activity, and urgent action is needed.*

**Body 1 — Causes**
- Burning fossil fuels (coal, oil, gas)
- Deforestation
- Agriculture & livestock (methane)
- Industrial processes

**Body 2 — Effects**
- Rising temperatures & heatwaves
- Melting ice → sea-level rise
- Extreme weather (droughts, floods)
- Impact on farming, water, health

**Body 3 — Solutions**
- Renewable energy (solar, wind, hydro)
- Reforestation & conservation
- Sustainable farming
- Government policy & international agreements (Paris Agreement)

**Conclusion**
- Restate thesis in new words.
- Summarise main points.
- Call to action.

**Tip:** use PEEL for each body paragraph — Point, Evidence, Explanation, Link.` },

        { keys: ['what is a variable', 'define variable programming'], answer: `**What is a variable? (programming)**

A **variable** is a named storage location in memory that holds a value which can change while the program runs.

**In Python:**
\`\`\`python
age = 15          # integer
name = "Chanda"   # string
price = 19.99     # float
is_student = True # boolean
\`\`\`

**Key ideas:**
- **Name** — the identifier (e.g. \`age\`).
- **Value** — the data stored (e.g. \`15\`).
- **Type** — the kind of data (int, str, float, bool).
- **Scope** — where in the program the variable is visible.

**Rule of thumb:** choose descriptive names (\`total_price\`, not \`x\`).` },

        { keys: ['how to say hello in french', 'french basics', 'bonjour'], answer: `**Basic French greetings**

- **Bonjour** — Hello / Good morning (bon-ZHOOR)
- **Bonsoir** — Good evening (bon-SWAHR)
- **Salut** — Hi (informal) (sa-LOO)
- **Comment ça va ?** — How are you? (ko-mahn sa va)
- **Ça va bien, merci.** — I'm fine, thanks.
- **Au revoir** — Goodbye (oh ruh-VWAHR)
- **Merci** — Thank you (mair-SEE)
- **S'il vous plaît** — Please (seel voo pleh)

**Tip:** use *Bonjour* until around 6 pm; after that use *Bonsoir*.` },

        { keys: ['grow maize', 'maize farming', 'plant maize'], answer: `**Growing maize in Zambia — practical guide**

**1. Land preparation (Oct–Nov)**
- Clear and plough; aim for a fine tilth.
- Add compost or manure. Ideal pH 5.5–7.0.

**2. Seed selection**
- Choose certified hybrid seed suited to your rainfall zone (medium-maturity for Region II).
- Treat seed against soil pests.

**3. Planting (mid-Nov to mid-Dec)**
- Spacing: **75 cm between rows × 25 cm between plants** (≈ 53,000 plants/ha).
- Plant **2–3 seeds per hole**, 4–5 cm deep; thin to 2 plants.
- Apply basal fertiliser (Compound D) at planting — do **not** let seed touch fertiliser.

**4. Weed & fertilise**
- First weeding at 2–3 weeks; top-dress with urea at 4–6 weeks.
- Scout weekly for fall armyworm.

**5. Harvest (Apr–May)**
- Harvest when cobs dry and husks turn brown.
- Dry to **≤ 13% moisture** before storage to prevent aflatoxin.

**Tip:** rotate with legumes (soya, groundnuts) to restore nitrogen.` }
    ];

    /* ================================================================
       RESPONSE ENGINE
       ================================================================ */
    async function generateAnswer(question, level, subject, atts) {
        // 1) Backend AI
        if (window.API?.aiTutor?.ask) {
            try {
                const payload = {
                    question, level, subject,
                    attachments: atts.map(a => ({
                        kind: a.kind,
                        name: a.name,
                        mime: a.mime,
                        dataUrl: a.kind === 'image' ? a.dataUrl : undefined,
                        text: a.text
                    }))
                };
                const res = await window.API.aiTutor.ask(payload);
                if (res && (res.answer || res.text)) return res.answer || res.text;
            } catch (err) {
                console.warn('[AITutor] backend failed, using local KB:', err.message);
            }
        }

        // 2) Local KB match
        const q = (question || '').toLowerCase();
        for (const entry of KB) {
            if (entry.keys.some(k => q.includes(k))) return entry.answer;
        }

        // 3) Attachment-aware fallbacks
        const imageAtt = atts.find(a => a.kind === 'image');
        const fileAtt  = atts.find(a => a.kind === 'file');

        if (imageAtt && !question) {
            return `I've received your image. 📷

Tell me what you'd like help with — for example:
• "Solve the equation in the image"
• "Translate the text"
• "Explain the diagram"
• "What's wrong with this working?"`;
        }

        if (fileAtt && !question) {
            return `I've received **${escapeHtml(fileAtt.name)}**. 📎

What would you like me to do with it?
• "Summarise this document"
• "Find the key points"
• "Explain chapter 3"
• "Solve the questions on page 5"`;
        }

        if (imageAtt && question) {
            return `Here's how I'd approach your question about the image:

**"${escapeHtml(question)}"**

1. **Look carefully** at what's in the image — note any labels, numbers, or keywords.
2. **Identify the topic** (is it a maths problem, a diagram, a passage?).
3. **Apply the relevant method** — write it out step by step.
4. **Check your answer** against the image.

*I'm explaining at ${LEVEL_TONE[level] || LEVEL_TONE.senior} level. Want me to walk through a specific part of the image?*`;
        }

        // 4) General helpful response
        const tone = LEVEL_TONE[level] || LEVEL_TONE.senior;
        const hint = SUBJECT_HINTS[subject] || SUBJECT_HINTS.other;
        return `Here's how I'd approach **"${escapeHtml(question)}"**:

**Step 1 — Understand the question.** Break it into what you know and what you need to find out.
**Step 2 — Recall the key idea.** Identify the definition, formula, or principle.
**Step 3 — Work it out.** ${hint}
**Step 4 — Check your answer.** Can you explain it to a friend in one sentence?

*I'm explaining at ${tone} level. Want a deeper example, a practice question, or a different level?*`;
    }

    /* ================================================================
       RENDER HELPERS
       ================================================================ */
    function fmtTime(ts = Date.now()) {
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }
    function renderMarkdown(text) {
        let html = escapeHtml(text);
        html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        const lines = html.split('\n');
        const out = [];
        let inUl = false;
        for (const line of lines) {
            const t = line.trim();
            const isUl = /^[-•]\s+/.test(t);
            if (isUl) {
                if (!inUl) { out.push('<ul>'); inUl = true; }
                out.push('<li>' + t.replace(/^[-•]\s+/, '') + '</li>');
            } else {
                if (inUl) { out.push('</ul>'); inUl = false; }
                out.push(t);
            }
        }
        if (inUl) out.push('</ul>');
        return out.join('\n')
            .split(/\n{2,}/)
            .map(b => b.startsWith('<') ? b : `<p>${b.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }
    function renderAttachmentsInBubble(atts) {
        if (!atts || !atts.length) return '';
        const parts = atts.map(a => {
            if (a.kind === 'image') {
                return `<img class="ai-tutor-msg-attachment"
                             src="${a.dataUrl}" alt="${escapeHtml(a.name)}" />`;
            }
            return `<span class="ai-tutor-msg-attachment--file">
                        <i class="fas fa-file"></i> ${escapeHtml(a.name)}
                    </span>`;
        }).join('');
        return `<div class="ai-tutor-msg-attachments">${parts}</div>`;
    }
    function addMessage(role, text, opts = {}) {
        messages.push({
            role, text, time: Date.now(),
            attachments: opts.attachments || []
        });
        const wrap = document.createElement('div');
        wrap.className = `ai-tutor-msg ${role}`;
        const avatar = role === 'bot'
            ? '<div class="ai-tutor-msg-avatar"><i class="fas fa-robot"></i></div>'
            : '<div class="ai-tutor-msg-avatar"><i class="fas fa-user"></i></div>';
        const body = role === 'bot'
            ? renderMarkdown(text)
            : escapeHtml(text).replace(/\n/g, '<br>');
        const attHtml = renderAttachmentsInBubble(opts.attachments);
        wrap.innerHTML = `${avatar}
            <div class="ai-tutor-msg-bubble">
                ${body}
                ${attHtml}
                <span class="ai-tutor-msg-time">${fmtTime(opts.time)}</span>
            </div>`;
        chat.appendChild(wrap);
        chat.scrollTop = chat.scrollHeight;
        hideSuggestions();
    }
    function showTyping() {
        const el = document.createElement('div');
        el.className = 'ai-tutor-msg bot';
        el.id = 'aiTutorTyping';
        el.innerHTML = `<div class="ai-tutor-msg-avatar"><i class="fas fa-robot"></i></div>
            <div class="ai-tutor-msg-bubble">
                <div class="ai-tutor-typing"><span></span><span></span><span></span></div>
            </div>`;
        chat.appendChild(el);
        chat.scrollTop = chat.scrollHeight;
    }
    function removeTyping() {
        document.getElementById('aiTutorTyping')?.remove();
    }
    function hideSuggestions() {
        if (suggestions) suggestions.hidden = true;
    }
    function showSuggestions() {
        if (suggestions) suggestions.hidden = false;
    }

    /* ================================================================
       ATTACHMENTS
       ================================================================ */
    function renderAttachmentsStrip() {
        if (!attachWrap) return;
        if (!attachments.length) {
            attachWrap.hidden = true;
            attachWrap.innerHTML = '';
            return;
        }
        attachWrap.hidden = false;
        attachWrap.innerHTML = attachments.map(a => {
            const thumb = a.kind === 'image'
                ? `<img class="ai-tutor-attach-thumb" src="${a.dataUrl}" alt="" />`
                : `<div class="ai-tutor-attach-thumb"><i class="fas fa-file"></i></div>`;
            const size = a.size ? `${(a.size / 1024).toFixed(1)} KB` : '';
            return `<div class="ai-tutor-attach">
                ${thumb}
                <div class="ai-tutor-attach-info">
                    <span class="ai-tutor-attach-name">${escapeHtml(a.name)}</span>
                    <span class="ai-tutor-attach-size">${size}</span>
                </div>
                <button type="button" class="ai-tutor-attach-remove"
                        data-remove-id="${a.id}" aria-label="Remove attachment">✕</button>
            </div>`;
        }).join('');
        attachWrap.querySelectorAll('[data-remove-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                attachments = attachments.filter(x => x.id !== btn.dataset.removeId);
                renderAttachmentsStrip();
            });
        });
    }
    function addAttachment(att) {
        attachments.push({
            id: 'a_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            ...att
        });
        renderAttachmentsStrip();
    }
    function clearAttachments() {
        attachments = [];
        renderAttachmentsStrip();
    }

    /* ================================================================
       SEND FLOW
       ================================================================ */
    async function send() {
        const text = input.value.trim();
        if ((!text && !attachments.length) || isBusy) return;

        isBusy = true;
        sendBtn.disabled = true;

        const outgoingAtts = attachments.slice();
        addMessage('user', text || '📎 Sent an attachment', { attachments: outgoingAtts });

        input.value = '';
        charcount.textContent = '0 / 1000';
        autoGrow();
        clearAttachments();
        showTyping();

        try {
            const answer = await generateAnswer(
                text, levelSel.value, subjectSel.value, outgoingAtts
            );
            await new Promise(r => setTimeout(r, 350 + Math.random() * 400));
            removeTyping();
            addMessage('bot', answer);
        } catch (err) {
            removeTyping();
            addMessage('bot', '⚠️ Sorry, something went wrong: ' + (err.message || 'unknown error'));
        } finally {
            isBusy = false;
            sendBtn.disabled = false;
            input.focus();
            saveSession();
        }
    }

    /* ================================================================
       VOICE INPUT (Web Speech API)
       ================================================================ */
    const recBar    = document.getElementById('aiTutorRecording');
    const recTimeEl = document.getElementById('aiTutorRecTime');
    const recStopBtn= document.getElementById('aiTutorRecStopBtn');
    const voiceBtn  = document.getElementById('aiTutorVoiceBtn');

    let recognition = null;
    let recInterval = null;
    let recSeconds  = 0;
    let isRecording = false;

    function startVoice() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            addMessage('bot', '⚠️ Voice input isn\'t supported in this browser. Try Chrome or Edge.');
            return;
        }
        if (isRecording) return;

        recognition = new SR();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = false;

        isRecording = true;
        recSeconds = 0;
        if (recBar) recBar.hidden = false;
        voiceBtn?.classList.add('recording');

        recInterval = setInterval(() => {
            recSeconds++;
            const m = String(Math.floor(recSeconds / 60)).padStart(1, '0');
            const s = String(recSeconds % 60).padStart(2, '0');
            if (recTimeEl) recTimeEl.textContent = `${m}:${s}`;
        }, 1000);

        recognition.onresult = (ev) => {
            const transcript = Array.from(ev.results)
                .map(r => r[0].transcript).join(' ');
            input.value = transcript;
            charcount.textContent = `${input.value.length} / 1000`;
            autoGrow();
        };
        recognition.onerror = (ev) => {
            if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
                addMessage('bot', '⚠️ Couldn\'t hear you — please try again.');
            }
            stopVoice();
        };
        recognition.onend = () => {
            if (isRecording) stopVoice();
        };

        try {
            recognition.start();
        } catch (err) {
            addMessage('bot', '⚠️ Microphone permission denied or unavailable.');
            stopVoice();
        }
    }

    function stopVoice(autoSend = true) {
        if (!isRecording) return;
        isRecording = false;
        try { recognition?.stop(); } catch (_) {}
        recognition = null;
        clearInterval(recInterval);
        recInterval = null;
        if (recBar) recBar.hidden = true;
        voiceBtn?.classList.remove('recording');

        const text = input.value.trim();
        if (text && autoSend) {
            send();
        } else if (text) {
            input.focus();
        }
    }

    voiceBtn?.addEventListener('click', () => {
        if (isRecording) stopVoice(true);
        else startVoice();
    });
    recStopBtn?.addEventListener('click', () => stopVoice(true));

    /* ================================================================
       CAMERA
       ================================================================ */
    const cameraModal    = document.getElementById('aiTutorCameraModal');
    const cameraVideo    = document.getElementById('aiTutorCameraVideo');
    const cameraCanvas   = document.getElementById('aiTutorCameraCanvas');
    const cameraPreview  = document.getElementById('aiTutorCameraPreview');
    const cameraGuide    = document.getElementById('aiTutorCameraGuide');
    const cameraCapture  = document.getElementById('aiTutorCameraCaptureBtn');
    const cameraSwitch   = document.getElementById('aiTutorCameraSwitchBtn');
    const cameraRetake   = document.getElementById('aiTutorCameraRetakeBtn');
    const cameraUse      = document.getElementById('aiTutorCameraUseBtn');
    const cameraClose    = document.getElementById('aiTutorCameraCloseBtn');
    const cameraInput    = document.getElementById('aiTutorCameraInput');
    const cameraBtn      = document.getElementById('aiTutorCameraBtn');

    let cameraStream = null;
    let cameraFacing = 'environment';
    let lastCaptureDataUrl = null;

    async function startCamera() {
        if (!cameraModal) return;
        cameraModal.hidden = false;
        requestAnimationFrame(() => cameraModal.classList.add('active'));
        await openCameraStream();
    }

    async function openCameraStream() {
        stopCameraStream();
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: cameraFacing, width: { ideal: 1280 } },
                audio: false
            });
            cameraVideo.srcObject = cameraStream;
        } catch (err) {
            console.warn('[AITutor] camera error:', err);
            // Fallback: file picker with capture
            cameraModal.hidden = true;
            cameraInput.click();
        }
    }

    function stopCameraStream() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(t => t.stop());
            cameraStream = null;
        }
    }

    function closeCamera() {
        stopCameraStream();
        cameraModal?.classList.remove('active');
        setTimeout(() => { if (cameraModal) cameraModal.hidden = true; }, 220);
        resetCameraUI();
    }

    function resetCameraUI() {
        cameraPreview.hidden = true;
        cameraPreview.src = '';
        cameraVideo.hidden = false;
        cameraVideo.style.display = '';
        cameraGuide.hidden = false;
        cameraCapture.hidden = false;
        cameraSwitch.hidden = false;
        cameraRetake.hidden = true;
        cameraUse.hidden = true;
        lastCaptureDataUrl = null;
    }

    function capturePhoto() {
        if (!cameraVideo.videoWidth) return;
        cameraCanvas.width = cameraVideo.videoWidth;
        cameraCanvas.height = cameraVideo.videoHeight;
        const ctx = cameraCanvas.getContext('2d');
        ctx.drawImage(cameraVideo, 0, 0);
        lastCaptureDataUrl = cameraCanvas.toDataURL('image/jpeg', 0.9);
        cameraPreview.src = lastCaptureDataUrl;
        cameraPreview.hidden = false;
        cameraVideo.style.display = 'none';
        cameraGuide.hidden = true;
        cameraCapture.hidden = true;
        cameraSwitch.hidden = true;
        cameraRetake.hidden = false;
        cameraUse.hidden = false;
    }

    function retakePhoto() {
        cameraPreview.hidden = true;
        cameraPreview.src = '';
        cameraVideo.style.display = '';
        cameraGuide.hidden = false;
        cameraCapture.hidden = false;
        cameraSwitch.hidden = false;
        cameraRetake.hidden = true;
        cameraUse.hidden = true;
        lastCaptureDataUrl = null;
    }

    function usePhoto() {
        if (!lastCaptureDataUrl) return;
        addAttachment({
            kind: 'image',
            name: `photo-${Date.now()}.jpg`,
            mime: 'image/jpeg',
            size: Math.round(lastCaptureDataUrl.length * 0.75),
            dataUrl: lastCaptureDataUrl
        });
        closeCamera();
        input.focus();
    }

    cameraBtn?.addEventListener('click', startCamera);
    cameraClose?.addEventListener('click', closeCamera);
    cameraCapture?.addEventListener('click', capturePhoto);
    cameraSwitch?.addEventListener('click', () => {
        cameraFacing = cameraFacing === 'environment' ? 'user' : 'environment';
        openCameraStream();
    });
    cameraRetake?.addEventListener('click', retakePhoto);
    cameraUse?.addEventListener('click', usePhoto);
    cameraInput?.addEventListener('change', async () => {
        const file = cameraInput.files?.[0];
        if (!file) return;
        const dataUrl = await fileToDataUrl(file);
        addAttachment({
            kind: 'image',
            name: file.name || `photo-${Date.now()}.jpg`,
            mime: file.type || 'image/jpeg',
            size: file.size,
            dataUrl
        });
        cameraInput.value = '';
    });

    /* ================================================================
       FILE UPLOAD
       ================================================================ */
    const uploadBtn = document.getElementById('aiTutorUploadBtn');

    uploadBtn?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', async () => {
        const files = Array.from(fileInput.files || []);
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                addMessage('bot', `⚠️ "${file.name}" is larger than 10 MB and was skipped.`);
                continue;
            }
            const isImage = file.type.startsWith('image/');
            const att = {
                kind: isImage ? 'image' : 'file',
                name: file.name,
                mime: file.type || 'application/octet-stream',
                size: file.size
            };
            if (isImage) {
                att.dataUrl = await fileToDataUrl(file);
            } else {
                // Try to read text content for .txt (best-effort context)
                if (file.type === 'text/plain' || /\.txt$/i.test(file.name)) {
                    try { att.text = await file.text(); } catch (_) {}
                }
            }
            addAttachment(att);
        }
        fileInput.value = '';
    });

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = reject;
            fr.readAsDataURL(file);
        });
    }

    /* ================================================================
       DRAW / HANDWRITING
       ================================================================ */
    const drawModal    = document.getElementById('aiTutorDrawModal');
    const drawCanvas   = document.getElementById('aiTutorDrawCanvas');
    const drawColor    = document.getElementById('aiTutorDrawColor');
    const drawSize     = document.getElementById('aiTutorDrawSize');
    const drawEraser   = document.getElementById('aiTutorDrawEraserBtn');
    const drawUndo     = document.getElementById('aiTutorDrawUndoBtn');
    const drawClear    = document.getElementById('aiTutorDrawClearBtn');
    const drawCancel   = document.getElementById('aiTutorDrawCancelBtn');
    const drawSend     = document.getElementById('aiTutorDrawSendBtn');
    const drawClose    = document.getElementById('aiTutorDrawCloseBtn');
    const drawBtn      = document.getElementById('aiTutorDrawBtn');

    let drawCtx = null;
    let drawing = false;
    let isErasing = false;
    let drawStrokes = [];   // array of ImageData snapshots for undo

    function openDraw() {
        if (!drawModal) return;
        drawModal.hidden = false;
        requestAnimationFrame(() => drawModal.classList.add('active'));
        setupDrawCanvas();
    }

    function setupDrawCanvas() {
        const rect = drawCanvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        drawCanvas.width = rect.width * dpr;
        drawCanvas.height = rect.height * dpr;
        drawCtx = drawCanvas.getContext('2d');
        drawCtx.scale(dpr, dpr);
        drawCtx.fillStyle = '#ffffff';
        drawCtx.fillRect(0, 0, rect.width, rect.height);
        drawStrokes = [];
        isErasing = false;
        drawEraser?.classList.remove('active');
    }

    function getDrawPos(e) {
        const rect = drawCanvas.getBoundingClientRect();
        const touch = e.touches?.[0];
        return {
            x: (touch ? touch.clientX : e.clientX) - rect.left,
            y: (touch ? touch.clientY : e.clientY) - rect.top
        };
    }

    function onDrawStart(e) {
        if (!drawCtx) return;
        e.preventDefault();
        drawing = true;
        const { x, y } = getDrawPos(e);

        // Save for undo
        drawStrokes.push(drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));

        drawCtx.beginPath();
        drawCtx.moveTo(x, y);
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.strokeStyle = isErasing ? '#ffffff' : drawColor.value;
        drawCtx.lineWidth = isErasing ? Number(drawSize.value) * 3 : Number(drawSize.value);
    }

    function onDrawMove(e) {
        if (!drawing || !drawCtx) return;
        e.preventDefault();
        const { x, y } = getDrawPos(e);
        drawCtx.lineTo(x, y);
        drawCtx.stroke();
    }

    function onDrawEnd() {
        drawing = false;
        if (drawCtx) drawCtx.closePath?.();
    }

    function setupDrawListeners() {
        drawCanvas?.addEventListener('mousedown', onDrawStart);
        drawCanvas?.addEventListener('mousemove', onDrawMove);
        drawCanvas?.addEventListener('mouseup', onDrawEnd);
        drawCanvas?.addEventListener('mouseleave', onDrawEnd);
        drawCanvas?.addEventListener('touchstart', onDrawStart, { passive: false });
        drawCanvas?.addEventListener('touchmove', onDrawMove, { passive: false });
        drawCanvas?.addEventListener('touchend', onDrawEnd);
        drawCanvas?.addEventListener('touchcancel', onDrawEnd);
    }

    function closeDraw() {
        drawModal?.classList.remove('active');
        setTimeout(() => { if (drawModal) drawModal.hidden = true; }, 220);
    }

    function sendDrawing() {
        if (!drawCanvas) return;
        const dataUrl = drawCanvas.toDataURL('image/png');
        addAttachment({
            kind: 'image',
            name: `handwriting-${Date.now()}.png`,
            mime: 'image/png',
            size: Math.round(dataUrl.length * 0.75),
            dataUrl
        });
        closeDraw();
        input.focus();
    }

    drawBtn?.addEventListener('click', openDraw);
    drawClose?.addEventListener('click', closeDraw);
    drawCancel?.addEventListener('click', closeDraw);
    drawSend?.addEventListener('click', sendDrawing);
    drawEraser?.addEventListener('click', () => {
        isErasing = !isErasing;
        drawEraser.classList.toggle('active', isErasing);
    });
    drawUndo?.addEventListener('click', () => {
        if (!drawStrokes.length || !drawCtx) return;
        const last = drawStrokes.pop();
        drawCtx.putImageData(last, 0, 0);
    });
    drawClear?.addEventListener('click', () => {
        if (!drawCtx) return;
        const rect = drawCanvas.getBoundingClientRect();
        drawCtx.fillStyle = '#ffffff';
        drawCtx.fillRect(0, 0, rect.width, rect.height);
        drawStrokes = [];
    });
    setupDrawListeners();

    /* ================================================================
       FORMULA INSERTION
       ================================================================ */
    const formulaBtn = document.getElementById('aiTutorFormulaBtn');
    formulaBtn?.addEventListener('click', () => {
        const formula = prompt('Insert a formula or symbol (e.g. √, ∫, ∑, x², π):', 'x²');
        if (!formula) return;
        input.value += formula;
        charcount.textContent = `${input.value.length} / 1000`;
        autoGrow();
        input.focus();
    });

    /* ================================================================
       SUGGESTIONS
       ================================================================ */
    suggestions?.querySelectorAll('.ai-tutor-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            input.value = btn.dataset.prompt;
            charcount.textContent = `${input.value.length} / 1000`;
            autoGrow();
            send();
        });
    });

    /* ================================================================
       INPUT EVENTS
       ================================================================ */
    function autoGrow() {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }
    input.addEventListener('input', () => {
        autoGrow();
        charcount.textContent = `${input.value.length} / 1000`;
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    });
    sendBtn.addEventListener('click', send);

    levelSel.addEventListener('change', () => {
        const note = document.createElement('div');
        note.className = 'ai-tutor-msg bot';
        note.innerHTML = `<div class="ai-tutor-msg-avatar"><i class="fas fa-robot"></i></div>
            <div class="ai-tutor-msg-bubble">
                <em>Got it — I'll now explain things at <strong>${levelSel.selectedOptions[0].text}</strong> level.</em>
            </div>`;
        chat.appendChild(note);
        chat.scrollTop = chat.scrollHeight;
    });

    /* ================================================================
       SESSIONS
       ================================================================ */
    function saveSession() {
        if (!messages.length) return;
        const sessions = loadSessions();
        const title = messages.find(m => m.role === 'user')?.text.slice(0, 60) || 'Untitled session';
        const idx = sessions.findIndex(s => s.id === currentSessionId);
        const record = {
            id: currentSessionId || ('s_' + Date.now()),
            title,
            level: levelSel.value,
            subject: subjectSel.value,
            updatedAt: Date.now(),
            messages: messages.slice()
        };
        currentSessionId = record.id;
        if (idx >= 0) sessions[idx] = record;
        else sessions.unshift(record);
        try {
            localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions.slice(0, 20)));
        } catch (_) {}
    }
    function loadSessions() {
        try { return JSON.parse(localStorage.getItem(LS_SESSIONS)) || []; }
        catch { return []; }
    }
    function newSession() {
        messages = [];
        currentSessionId = null;
        chat.innerHTML = '';
        showSuggestions();
        sessionStart = Date.now();
        input.focus();
    }
    function restoreSession(id) {
        const sessions = loadSessions();
        const s = sessions.find(x => x.id === id);
        if (!s) return;
        messages = s.messages.slice();
        currentSessionId = s.id;
        levelSel.value = s.level || 'junior';
        subjectSel.value = s.subject || 'any';
        chat.innerHTML = '';
        messages.forEach(m => {
            const wrap = document.createElement('div');
            wrap.className = `ai-tutor-msg ${m.role}`;
            const avatar = m.role === 'bot'
                ? '<div class="ai-tutor-msg-avatar"><i class="fas fa-robot"></i></div>'
                : '<div class="ai-tutor-msg-avatar"><i class="fas fa-user"></i></div>';
            const body = m.role === 'bot'
                ? renderMarkdown(m.text)
                : escapeHtml(m.text).replace(/\n/g, '<br>');
            const attHtml = renderAttachmentsInBubble(m.attachments || []);
            wrap.innerHTML = `${avatar}
                <div class="ai-tutor-msg-bubble">
                    ${body}
                    ${attHtml}
                    <span class="ai-tutor-msg-time">${fmtTime(m.time)}</span>
                </div>`;
            chat.appendChild(wrap);
        });
        chat.scrollTop = chat.scrollHeight;
        hideSuggestions();
        closeHistory();
    }
    function renderHistory() {
        const sessions = loadSessions();
        if (!sessions.length) {
            historyList.innerHTML = '<p style="text-align:center;color:#7c8a80;font-size:.85rem;padding:24px 0;">No past sessions yet.</p>';
            return;
        }
        historyList.innerHTML = sessions.map(s => `
            <div class="ai-tutor-history-item" data-session-id="${s.id}">
                <strong>${escapeHtml(s.title)}</strong>
                <small>${new Date(s.updatedAt).toLocaleString()} · ${s.messages.length} messages</small>
            </div>
        `).join('');
        historyList.querySelectorAll('[data-session-id]').forEach(el => {
            el.addEventListener('click', () => restoreSession(el.dataset.sessionId));
        });
    }
    function openHistory() {
        renderHistory();
        if (historyPanel) historyPanel.hidden = false;
    }
    function closeHistory() {
        if (historyPanel) historyPanel.hidden = true;
    }

    document.getElementById('aiTutorHistoryBtn')?.addEventListener('click', openHistory);
    document.getElementById('aiTutorHistoryCloseBtn')?.addEventListener('click', closeHistory);
    document.getElementById('aiTutorNewChatBtn')?.addEventListener('click', () => {
        if (messages.length && !confirm('Start a new topic? This clears the current chat (saved in History).')) return;
        newSession();
    });

    /* ================================================================
       SESSION TIMER
       ================================================================ */
    function tickTimer() {
        const secs = Math.floor((Date.now() - sessionStart) / 1000);
        const mm = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss = String(secs % 60).padStart(2, '0');
        if (timerEl) timerEl.textContent = `Session ${mm}:${ss}`;
    }

    /* ================================================================
       OPEN / CLOSE
       ================================================================ */
    function openAITutor(opts = {}) {
        modal.hidden = false;
        requestAnimationFrame(() => modal.classList.add('active'));

        if (opts.subject && [...subjectSel.options].some(o => o.value === opts.subject)) {
            subjectSel.value = opts.subject;
        }
        if (opts.question) {
            input.value = opts.question;
            charcount.textContent = `${input.value.length} / 1000`;
            autoGrow();
        }

        if (!messages.length) {
            addMessage('bot',
`👋 Hi! I'm your **AI Online Tutor**.

I can help with **any topic** — maths, science, history, essays, languages, coding, agriculture, and more.

**You can send me:**
- ✍️ **Typed questions**
- 🎤 **Voice** — tap the microphone
- 📷 **A photo** of a question or diagram — tap the camera
- 📎 **A document** (PDF, Word, TXT) — tap the upload icon
- ✏️ **Handwriting / a sketch** — tap the pen
- √ **Formulas** — tap the square-root icon

Pick your **level** at the top, then ask away. What would you like to learn today?`);
        }

        if (!sessionTimer) {
            sessionStart = Date.now();
            sessionTimer = setInterval(tickTimer, 1000);
            tickTimer();
        }
        setTimeout(() => input.focus(), 250);
    }

    function closeAITutor() {
        modal.classList.remove('active');
        setTimeout(() => { modal.hidden = true; }, 220);
        saveSession();
        closeHistory();
        if (sessionTimer) {
            clearInterval(sessionTimer);
            sessionTimer = null;
        }
    }

    /* ================================================================
       PUBLIC HOOKS + DISPATCHER
       ================================================================ */
    window.AITutor = {
        open: openAITutor,
        close: closeAITutor,
        ask: (q) => { openAITutor({ question: q }); setTimeout(send, 300); }
    };

    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        const action = el.getAttribute('data-action');
        if (action === 'openAITutor') {
            e.preventDefault();
            openAITutor();
        } else if (action === 'closeAITutor') {
            e.preventDefault();
            closeAITutor();
        } else if (action === 'openAITutorForSubject') {
            e.preventDefault();
            openAITutor({ subject: el.dataset.subject });
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            e.stopPropagation();
            closeAITutor();
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAITutor();
    });

    cameraModal?.addEventListener('click', (e) => {
        if (e.target === cameraModal) closeCamera();
    });
    drawModal?.addEventListener('click', (e) => {
        if (e.target === drawModal) closeDraw();
    });

    console.log('✅ AI Online Tutor ready (text · voice · camera · upload · draw)');
})();