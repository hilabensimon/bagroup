let filterArray=[];
let subjectsArray=[
    {
        id:1,
        name: "תפיסת הפעלה",
        src: "./assets/05.png",
        desc:"תיק יסוד הכולל יעדים, שותפים ותפישת תפקיד של הגורמים",
        aria:"תמונה של עט"
    },
    {
        id:2,
        name: "מאגר מורים",
        src: "./assets/04.png",
        desc:"מאגר מורים מלמדים בשנת תשפ”ו שלוקחים חלק בפרויקט",
        aria:"תמונה של מורה ומאחוריה לוח מחיק"
    },
    {
        id:3,
        name: "עזרים למורה",
        src: "./assets/03.png",
        desc:"עזרים למורה ליצירת שיעור במסגרת פלטפורמת הווטסאפ",
        aria:"תמונה של אסופת ספרים"
    },
    {
        id:4,
        name: "מאפיינים",
        src:"./assets/02.png",
        desc:"מיקרו למידה חינמית ואנונימית המייצרת הכנה למבחן הבגרות",
        aria:"תמונה של טלפון עם צאט פתוח"
    },
    {
        id:5,
        name: "ליווי פדגוגי",
        src: "./assets/08.png",
        desc:"לווי מקצועי והדרכתי של המורים בתחומים השונים",
        aria:"תמונה של מחשבון"
    },
    {
        id:6,
        name: "דגשים ונהלים",
        src: "./assets/07.png",
        desc:"נהלי ההדרכה והפעלת הפרויקט לכל הדרגים",
        aria:"תמונה של מנהל"
    },
    {
        id:7,
        name: "בנק תרגילים",
        src: "./assets/06.png",
        desc:"אסופת תרגילים מבגרויות לשימוש המורים המלמדים",
        aria:"תמונה של מחברת תרגילים"
    }
];

ShowSubjects(subjectsArray);

function ShowSubjects(currentArray){
    document.getElementById("card").innerText="";
    for(let i=0; i<currentArray.length; i++){
        document.getElementById("card").innerHTML +=`
        <div class="col-xl-3 col-md-5 col-sm-6 mt-3">
        <div class="card p-3 ps-5 pe-5">
        <img class="img-size mx-auto" src="${currentArray[i].src}" aria-label="${currentArray[i].aria}"/>
        <h4 class="text-center">${currentArray[i].name}</h4>
        <p class="mt-2 text-center" >${currentArray[i].desc}</p>
        <button class="btn btn-read-more w-100 mx-auto">לקריאה נוספת</button>
        </div>
        </div>     
        `
    }
}


// live searching

document.getElementById("searchSubject").addEventListener("keyup", function(e){
    let text = e.target.value;
    filterArray = subjectsArray.filter(subject=> subject.name.includes(text) || subject.desc.includes(text));
    if(text.length > 0){
        if(filterArray.length > 0){
            ShowSubjects(filterArray);
            document.getElementById("not_found").style.display = "none";

        }
        else{
            //not_found
            document.getElementById("not_found").style.display = "block";
            document.getElementById("card").innerHTML = "";
        }
    }
    else{
        ShowSubjects(subjectsArray);
        document.getElementById("not_found").style.display = "none";        
    }
})
