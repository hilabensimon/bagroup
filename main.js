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
        const score=100;
        
        //pipwerks.SCORM.set('cmi.core.score.raw', '100');
        //pipwerks.SCORM.set('cmi.core.score.min', '100');
        //pipwerks.SCORM.set('cmi.core.score.max', '100');
        
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
 Quiz validation
  ========================================= */
let form;
//Batch saves all the interactions for sanding and grading
let interactionsBatch = [];
let formSent = false;

document.addEventListener('DOMContentLoaded', () => {
    form = document.getElementById('quiz-form');
    if (!form) return;

    form.addEventListener('reset', handleQuizReset);
    // Enable  the check button after changes
    form.addEventListener('input', () => formCheckValidity());
    form.addEventListener('change', () => formCheckValidity());


    // Attach the finalize button
    const btnFinalize = document.getElementById('btn-finalize');
    if (btnFinalize) {
        btnFinalize.addEventListener('click', (e) => {
            // Clear Feedback
            clearAllFeedback()
            // Then checkQuiz, show feedback & collect interactions
            const interactions = checkQuiz();
            console.log(interactions);
            if (interactions.length > 0){
                if (isScormConnected){
                    //  send to LMS
                    sentInatractionsBatchToLMS(interactions);
                    finalizeAndCloseLMSConnection();
                }
                else{
                    showModal('modal-submit-git');
                }
                setFinalizeDisabled(true);
                formSent = true;
            }
        });
    }
});

// checkQuiz per question
function checkQuiz() {
    
    //Batch saves all the interactions for sanding (restart)
    interactionsBatch = [];

    // Q1: radios name="q1"
    (function () {
        const article = document.getElementById('q1-title')?.closest('article');
        if (!article) return;

        const selectedText = getChosenRadioText(article, 'q1');
        interactionsBatch.push({
            id: 'Q1',
            type: 'choice',
            student_response: selectedText
        });
    })();


    // Q2: numeric
    (function () {
        const article = document.getElementById('q2-title')?.closest('article');
        if (!article) return;
        
        const selectedText = getChosenRadioText(article, 'q2');
        
        interactionsBatch.push({
            id: 'Q2',
            type: 'choice',
            student_response: selectedText
        });
    })();
    
    // Q3: open text — neutral (no grading)
    (function () {
        const article = document.getElementById('q3-title')?.closest('article');
        if (!article) return;

        const raw = (form.q3?.value || '').trim();
        let msgErr = ""
        switch (true){
            case raw.length < 10:
                msgErr = "נא להזין יותר מ 10 תווים"
                break;
            case !(/^[\u0590-\u05FF\s0-9]+$/.test(raw)): // בודק טקסט בעברית בלבד
                msgErr = "נא להזין טקסט בעברית בלבד"
                break;
                
        }
        if(msgErr.length > 0){
            setFeedback(article, false, msgErr);
            interactionsBatch = [];
        }
        else{
            interactionsBatch.push({
                id: 'Q3',
                type: 'fill-in',
                student_response: raw
            });
        }
    })();


    return interactionsBatch;
}


function handleQuizReset() {
    // disable the final submission button
    setFinalizeDisabled(true);
}


/* =========================================
   Helpers
   ========================================= */

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
    const TEXT_ERR = 'הסבר:';

    // choose message format
    const prefix = noPrefix ? '' : `<strong>${isCorrect ? TEXT_OK : TEXT_ERR}</strong> `;
    alert.innerHTML = `${prefix}${message || ''}${details ? `<div class="mt-1 small text-muted">${details}</div>` : ''}`;

    wrap.appendChild(alert);
    article.appendChild(wrap);

    // color the card border
    article.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
}
// Returns the visible label text for a chosen radio in a given <article>
function getChosenRadioText(articleEl, name) {
    const input = articleEl.querySelector(`input[name="${name}"]:checked`);
    if (!input) return '';
    const label = articleEl.querySelector(`label[for="${input.id}"]`);
    return label ? label.textContent.trim() : '';
}

// Clear all feedback (used on reset or before re-check)
function clearAllFeedback() {
    form.querySelectorAll('article').forEach(a => {
        a.classList.remove('is-correct', 'is-incorrect');
        const fb = a.querySelector('.q-feedback');
        if (fb) fb.remove();
    });
}

// Enable/disable the final submission button
function setFinalizeDisabled(isDisabled) {
    const btn = document.getElementById('btn-finalize');
    if (!btn) return;
    if (isDisabled || formSent){
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
    } else {
        btn.disabled = false;
        btn.removeAttribute('aria-disabled');
    }
}

function formCheckValidity() {
    const btn = document.getElementById('btn-finalize');
    if (!btn) return;
    if (form.checkValidity() && !formSent){
        btn.disabled = false;
        btn.removeAttribute('aria-disabled');
    }
    else{
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
    }
}


// Modal helpers 
function showModal(id) {
    if (!window.bootstrap) return;
    const el = document.getElementById(id);
    if (!el) return;
    const inst = bootstrap.Modal.getOrCreateInstance(el);
    inst.show();
}

