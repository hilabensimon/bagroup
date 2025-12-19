/* =========================================
   SCORM Handeling
   ========================================= */
let isScormConnected = false;

document.addEventListener('DOMContentLoaded', () => {
    if (!window.pipwerks || !pipwerks.SCORM) {
        console.warn('[SCORM] Wrapper not found.');
        return;
    }
    
    isScormConnected=pipwerks.SCORM.init();
    if(!isScormConnected){
        console.error('[SCORM] init() failed.');
        return;
    }
    
    fetchLearnerData();    
    
});

function fetchLearnerData() {
    if(isScormConnected){
        const learnerName=pipwerks.SCORM.get('cmi.core.student_name')||'';
        const learnerId = pipwerks.SCORM.get('cmi.core.student_id') || '';
        const status = pipwerks.SCORM.get('cmi.core.lesson_status') || '';
        const score = pipwerks.SCORM.get('cmi.core.score.raw') || '';


        console.log('--- SCORM Learner Data ---');
        console.log('Name = ' + learnerName);
        console.log('ID = ' + learnerId);
        console.log('Status = ' + status);
        console.log('Score = ' + score);
        console.log('---------------------------');
        
        const nameEle=document.getElementById('learner-name');
        if(nameEle && learnerName){
            nameEle.textContent=learnerName;
        }        
        
    }
}


window.addEventListener('beforeunload', saveAndCloseConnection);
function saveAndCloseConnection() {
    if(isScormConnected){
        pipwerks.SCORM.save();
        pipwerks.SCORM.quit();
    }
}

function sentInatractionsBatchToLMS(interactions){
    if(isScormConnected){
        if (!Array.isArray(interactions) || interactions.length === 0){
            return;
        }
        
        const scorm=pipwerks.SCORM;
        let i=parseInt(scorm.get('cmi.interactions._count')||'0',10);
        if(!Number.isFinite(i)) i=0;
        
        interactions.forEach((it)=>{
            const base=`cmi.interactions.${i}`;
            scorm.set(`${base}.id`, it.id);
            scorm.set(`${base}.type`, it.type);
            scorm.set(`${base}.student_response`, it.student_response);
            scorm.set(`${base}.result`, it.result);
            scorm.set(`${base}.correct_responses.0.pattern`, it.correct_responses);
            i+=1;
        });
        
        scorm.save();       
        
    }
}

function finalizeAndCloseLMSConnection() {
    if(isScormConnected){
        setFinalizeDisabled(true);

        if (!Array.isArray(interactionsBatch) || interactionsBatch.length === 0) {
            console.warn('[Finalize] No interactions batch found. Run the check step first.');
            return;
        } 
        
        showModal('modal-submit');
        
        const interactions=interactionsBatch;
        const score=calculateFinalScore(interactions);
        
        pipwerks.SCORM.set('cmi.core.score.raw', String(score));
        pipwerks.SCORM.set('cmi.core.score.min', '0');
        pipwerks.SCORM.set('cmi.core.score.max', '100');
        
        const passingScore=60;
        let status='completed';
        if(score>=passingScore){
            status='passed';
        } else{
            status='failed';
        }
        pipwerks.SCORM.set('cmi.core.lesson_status',status);
        pipwerks.SCORM.save();

        pipwerks.SCORM.set('cmi.core.exit', 'logout');
        pipwerks.SCORM.save();

        setTimeout(() => {
            pipwerks.SCORM.quit();

            // Flip modal content to success (no second modal involved)
            document.getElementById('modal-submit').querySelector('#state-loading').classList.add('d-none');
            document.getElementById('modal-submit').querySelector('#state-success').classList.remove('d-none');


        }, 150);
        
        
        
    }
    
}













/* =========================================
 Quiz validation, grading, feedback
  ========================================= */
let form;
//Batch saves all the interactions for sanding and grading
let interactionsBatch = [];

document.addEventListener('DOMContentLoaded', () => {
    form = document.getElementById('quiz-form');
    if (!form) return;

    form.addEventListener('submit', handleQuizSubmit);
    form.addEventListener('reset', handleQuizReset);
    // Enable  the check button after changes
    form.addEventListener('input', () => setCheckDisabled(false));
    form.addEventListener('change', () => setCheckDisabled(false));


    // Attach the finalize button
    const btnFinalize = document.getElementById('btn-finalize');
    if (btnFinalize) {
        btnFinalize.addEventListener('click', (e) => {
            finalizeAndCloseLMSConnection();
        });
    }
});

function handleQuizSubmit(e) {
    e.preventDefault();
    // First: make sure everything required is answered
    if (!allRequiredAnswered()) return;
    // Disable the check button after successful check
    setCheckDisabled(true);
    // Then chackQuiz, show feedback & collect interactions
    const interactions = chackQuiz();
    console.log(interactions);
    //  send to LMS
    sentInatractionsBatchToLMS(interactions);
    
    // Scroll always to the first question with small offset 
    const firstQuestion = form.querySelector('article');
    if (firstQuestion) {
        const y = firstQuestion.getBoundingClientRect().top + window.pageYOffset - 120;
        window.scrollTo({top: y, behavior: 'smooth'});
    }
    // Enable the final submission button
    setFinalizeDisabled(false);
}


// chackQuiz per question
function chackQuiz() {
    // Answer key
    const ANSWERS = {
        q1: 'c',                            // חד-ברירה
        q2: 1,                        // מספר מומלץ
        // q3 — דעה אישית, אין נכון/שגוי
        // q4 - מענה פתוח ללא ציון ממוחשב
    };

    clearAllFeedback();

    //Batch saves all the interactions for sanding (restart)
    interactionsBatch = [];

    // Q1: radios name="q1"
    (function () {
        const article = document.getElementById('q1-title')?.closest('article');
        if (!article) return;

        const val = form.querySelector('input[name="q1"]:checked')?.value || '';
        const ok = val === ANSWERS.q1;
        const msgOk = 'נכון מאוד! הגדרת תפקיד יוצרת הקשר ברור ומשפרת את איכות התגובה.';
        const msgErr = 'כדאי לזכור שהגדרת תפקיד עוזרת למודל להבין מה הסגנון והטון הרצוי בתשובה.';
        setFeedback(article, ok, ok ? msgOk : msgErr);

        const selectedText = getChosenRadioText(article, 'q1');
        interactionsBatch.push({
            id: 'Q1_define_role',
            type: 'choice',
            student_response: selectedText,
            result: ok ? 'correct' : 'wrong',
            correct_responses: ['c']
        });
    })();


    // Q2: numeric
    (function () {
        const article = document.getElementById('q2-title')?.closest('article');
        if (!article) return;

        const raw = form.q2?.value || '';
        const num = parseInt(raw, 10);
        const ok = Number.isFinite(num) && num === ANSWERS.q2;
        const msgOk = 'נכון! מומלץ לבקש מהמודל לשאול שאלה אחת בכל פעם – כך נוכל לענות עליה, והמענה שלנו ישפיע על השאלה הבאה.';
        const msgErr = 'כדאי לזכור – כשמבקשים מהמודל לשאול כמה שאלות בבת אחת, אנחנו עשויים לקבל שאלות לא רלוונטיות או לפספס דיוקים חשובים.';
        setFeedback(article, ok, ok ? msgOk : msgErr);

        interactionsBatch.push({
            id: 'Q5_numeric_dialog',
            type: 'numeric',
            student_response: String(raw),
            result: ok ? 'correct' : 'wrong',
            correct_responses: ['1']
        });
    })();

    // Q3: opinion — always accepted (neutral result)
    (function () {
        const article = document.getElementById('q3-title')?.closest('article');
        if (!article) return;

        const chosen = form.querySelector('input[name="q3"]:checked');
        const ok = !!chosen;
        const msgOk = 'מצוין! כל טכניקה יכולה לשפר את איכות השיח עם ה־AI – תלוי בצרכים שלך ובאופי המשימה.';
        setFeedback(article, ok, msgOk, null, true);

        const selectedText = getChosenRadioText(article, 'q3');
        interactionsBatch.push({
            id: 'Q6_preferred_technique',
            type: 'choice',
            student_response: selectedText,
            result: 'neutral',
            correct_responses: ['אין תשובה נכונה לשאלה זו']
        });
    })();

    // Q4: open text — neutral (no grading)
    (function () {
        const article = document.getElementById('q4-title')?.closest('article');
        if (!article) return;

        const raw = (form.q4?.value || '').trim();
        const len = raw.length;
        const MIN = 30, MAX = 2000;

        const ok = len >= MIN && len <= MAX;
        let msgOk = 'תודה! קיבלנו את התשובה.';
        setFeedback(article, ok, msgOk, null, true);

        const safeResponse = raw.slice(0, MAX);
        interactionsBatch.push({
            id: 'Q4_open_text',
            type: 'fill-in',
            student_response: safeResponse,
            result: 'neutral',
            correct_responses: ['אין תשובה נכונה לשאלה זו']
        });
    })();


    return interactionsBatch;
}


function handleQuizReset(e) {
    const f = e.currentTarget;
    // Allow native reset to clear fields first, then remove feedback
    setTimeout(() => clearAllFeedback(f), 0);
    // disable the final submission button
    setFinalizeDisabled(false);
}


/* =========================================
   Helpers
   ========================================= */

// Create/clear feedback block inside a question <article>
function setFeedback(article, isCorrect, message, details, noPrefix = false) {
    // wipe previous state
    article.classList.remove('is-correct', 'is-incorrect');
    const prev = article.querySelector('.q-feedback');
    if (prev) prev.remove();

    // add feedback container
    const wrap = document.createElement('div');
    wrap.className = 'q-feedback';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');

    const alert = document.createElement('div');
    alert.className = 'alert ' + (isCorrect ? 'alert-success' : 'alert-danger') + ' mb-0';
    const TEXT_OK = 'מעולה — תשובה נכונה.';
    const TEXT_ERR = 'לא מדויק — ראו הסבר:';

    // choose message format
    const prefix = noPrefix ? '' : `<strong>${isCorrect ? TEXT_OK : TEXT_ERR}</strong> `;
    alert.innerHTML = `${prefix}${message || ''}${details ? `<div class="mt-1 small text-muted">${details}</div>` : ''}`;

    wrap.appendChild(alert);
    article.appendChild(wrap);

    // color the card border
    article.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
}


// Clear all feedback (used on reset or before re-check)
function clearAllFeedback() {
    form.querySelectorAll('article').forEach(a => {
        a.classList.remove('is-correct', 'is-incorrect');
        const fb = a.querySelector('.q-feedback');
        if (fb) fb.remove();
    });
}

// Validate required fields; if invalid, let browser show built-in bubbles
function allRequiredAnswered() {
    if (form.checkValidity()) return true;
    // Focus first invalid
    const firstInvalid = form.querySelector(':invalid');
    if (firstInvalid) firstInvalid.focus({preventScroll: false});
    form.reportValidity();
    return false;
}

// Returns the visible label text for a chosen radio in a given <article>
function getChosenRadioText(articleEl, name) {
    const input = articleEl.querySelector(`input[name="${name}"]:checked`);
    if (!input) return '';
    const label = articleEl.querySelector(`label[for="${input.id}"]`);
    return label ? label.textContent.trim() : '';
}


// Enable/disable the final submission button
function setFinalizeDisabled(isDisabled) {
    const btn = document.getElementById('btn-finalize');
    if (!btn) return;
    if (isDisabled) {
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
    } else {
        btn.disabled = false;
        btn.removeAttribute('aria-disabled');
    }
}


// Function to calculate the final grade while ignoring ungraded questions
function calculateFinalScore(interactions) {
    // Compute score 0..100 from the latest graded batch (ignore neutral items like Q6)    
    if (!Array.isArray(interactions) || !interactions.length) return 0;
    // Count only items that were graded as correct/wrong (exclude neutral)
    const graded = interactions.filter(it => it && (it.result === 'correct' || it.result === 'wrong'));
    const total = graded.length;
    const correct = graded.reduce((acc, it) => acc + (it.result === 'correct' ? 1 : 0), 0);
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    return score;
}


function setCheckDisabled(isDisabled) {
    const btn = document.getElementById('btn-check');
    if (!btn) return;
    btn.disabled = !!isDisabled;
    if (isDisabled) btn.setAttribute('aria-disabled', 'true');
    else btn.removeAttribute('aria-disabled');
}


// Modal helpers 
function showModal(id) {
    if (!window.bootstrap) return;
    const el = document.getElementById(id);
    if (!el) return;
    const inst = bootstrap.Modal.getOrCreateInstance(el);
    inst.show();
}

