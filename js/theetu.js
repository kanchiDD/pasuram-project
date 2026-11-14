// Theetu (Asaucam) lookup — rules and page logic. Used by theetu.html.
// Theetu lookup rules.
// [observers, event, newborn, group, label_ta, label_en, result, note_ta, note_en]
//  observers: any of M married man · F married woman · W widow · S sanyasi   ("FW" = both)
//  event: D death · B birth        newborn: '' any · b boy · g girl
//  result: 10 | 3 | P pakshini | PS pakshini or bath | 1 | 0 | S bath only | SN not even a bath
//          NONE10 no separate theetu | H as the husband | M3040 30 / 40 days | NS not stated
window.THEETU_RULES = [
// ── DEATH · married man ─────────────────────────────────────────
["M","D","","own","அப்பா (தந்தை)","Father","10","",""],
["M","D","","own","அம்மா (தாய்)","Mother","10","",""],
["M","D","","own","மனைவி","Wife","10","",""],
["M","D","","own","அண்ணன் / தம்பி","Brother","10","",""],
["M","D","","own","சிற்றன்னை (அப்பாவின் மற்றொரு மனைவி)","Step-mother (father's other wife)","10","செய்தி ஒரு வருடம் கழித்து வந்தால் 3 நாள்.","If the news comes after a year: 3 days."],
["M","D","","own","பிள்ளை — 7 வயதுக்கு மேல் அல்லது உபநயனமானவன்","Son — 7 years or older, or upanayanam done","10","",""],
["M","D","","own","பிள்ளை — பிறந்து 10 நாளுக்குப் பின் 7 வயதுக்குள்","Son — after the first 10 days, under 7 years","10","பெற்றோருக்கும் உடன்பிறந்த சகோதரர்களுக்கும் 10 நாள். மற்ற தாயாதிகளுக்கு (பங்காளிகளுக்கு) குழந்தையின் வயதைப் பொறுத்து (தாயாதி (பங்காளி) பிள்ளை வரிசைகளைப் பார்க்கவும்).","10 days for the parents and brothers. For other dayadhis (pangalis) it depends on the child's age (see the dayadhi's (pangali) son rows)."],
["M","D","","own","குழந்தை — பிறந்து 10 நாளுக்குள் இறந்தால்","Child — died within 10 days of birth","NONE10","பிறப்புத் தீட்டுடனே இதுவும் முடியும். பத்தாம் நாள் இரவின் கடைசியில் இறந்தால் பெற்றோருக்கு 3 நாள் அதிகம்.","It ends with the birth theetu. If the child died late on the 10th night, the parents keep 3 more days."],
["M","D","","own","பெண் — கல்யாணமாகாதவள்","Daughter — unmarried","10","அப்பா, அம்மா, அவள் சகோதரர்கள் மட்டும் 10 நாள்.","Only her father, mother and brothers keep 10 days."],
["M","D","","own","அக்கா / தங்கை — கல்யாணமாகாதவள்","Sister — unmarried","10","அவள் சகோதரர்கள் 10 நாள்.","Her brothers keep 10 days."],
["M","D","","own","பெண் — கல்யாணமானவள்","Daughter — married","3","",""],
["M","D","","own","அக்கா / தங்கை — கல்யாணமானவள்","Sister — married","3","",""],
["M","D","","own","தாத்தா / பாட்டி (அப்பாவின் பெற்றோர்)","Grandfather / grandmother (father's parents)","10","",""],
["M","D","","own","பெரியப்பா / சித்தப்பா, அவர் மனைவி, பிள்ளை","Father's brother, his wife or son","10","",""],
["M","D","","own","மற்ற தாயாதிகள் (பங்காளிகள்) — ஏழு தலைமுறைக்குள்","Any other dayadhi (pangali) within 7 generations","10","ஆண்கள், அல்லது 7 வயதுக்கு மேல் / உபநயனமான பிள்ளைகள்.","Men, or boys aged 7 or more, or with upanayanam."],
["M","D","","own","தாயாதி (பங்காளி) பிள்ளை — 25 மாதம் முதல் 6 வயது வரை, பூணூல் போடாதவன்","Dayadhi's (pangali) son — 25 months to 6 years, no upanayanam","3","",""],
["M","D","","own","தாயாதி (பங்காளி) பிள்ளை — 6 மாதம் முதல் 2 வயதுக்குள், சௌளம் ஆகாதவன்","Dayadhi's (pangali) son — 6 months to 2 years, chaulam not done","1","",""],
["M","D","","own","தாயாதி (பங்காளி) பெண் — 7 வயது முதல் கல்யாணம் வரை","Dayadhi's (pangali) daughter — 7 years until marriage","3","",""],
["M","D","","own","தாயாதி (பங்காளி) பெண் — 2 முதல் 6 வயது, கல்யாணமாகாதவள்","Dayadhi's (pangali) daughter — 2 to 6 years, unmarried","1","",""],
["M","D","","own","ஏழு தலைமுறை தாண்டிய தாயாதி (பங்காளி)","Dayadhi (pangali) beyond 7 generations","3","",""],
["M","D","","own","பெரியப்பா / சித்தப்பா பெண் (கல்யாணமானவள்)","Father's brother's daughter (married)","P","",""],
["M","D","","own","அண்ணன் / தம்பி பெண் (கல்யாணமானவள்)","Brother's daughter (married)","P","",""],
["M","D","","mother","அம்மாவின் அப்பா (தாத்தா)","Mother's father","3","",""],
["M","D","","mother","அம்மாவின் அம்மா (பாட்டி)","Mother's mother","3","",""],
["M","D","","mother","மாமா (அம்மாவின் சகோதரன்)","Maternal uncle (mama)","3","",""],
["M","D","","mother","மாமி (மாமாவின் மனைவி)","Mama's wife (mami)","3","",""],
["M","D","","mother","சித்தி / பெரியம்மா","Mother's sister (chithi / periyamma)","3","",""],
["M","D","","mother","மாமா பிள்ளை / பெண்","Mama's son or daughter","P","",""],
["M","D","","mother","சித்தி / பெரியம்மா பிள்ளை / பெண்","Chithi's or periyamma's son or daughter","P","",""],
["M","D","","father","அத்தை (அப்பாவின் சகோதரி)","Father's sister (athai)","3","",""],
["M","D","","father","அத்தை பிள்ளை / பெண்","Athai's son or daughter","P","",""],
["M","D","","wife","மாமனார் (மனைவியின் அப்பா)","Father-in-law","3","மனைவி குழந்தையின்றி முன்பே இறந்திருந்தால் 1 நாள்.","1 day if your wife died earlier without children."],
["M","D","","wife","மாமியார் (மனைவியின் அம்மா)","Mother-in-law","3","மனைவி குழந்தையின்றி முன்பே இறந்திருந்தால் 1 நாள்.","1 day if your wife died earlier without children."],
["M","D","","wife","மைத்துனர் (மனைவியின் சகோதரன்)","Wife's brother","1","",""],
["M","D","","wife","மனைவியின் அக்கா / தங்கை (கல்யாணமானவள்)","Wife's sister (married)","S","",""],
["M","D","","wife","மனைவியின் பெரியப்பா / சித்தப்பா","Wife's paternal uncle","0","இறுதிச் சடங்கில் கலந்துகொண்டால் மட்டும் தீட்டு.","Theetu only if you attended the funeral."],
["M","D","","wife","மனைவியின் மாமா","Wife's maternal uncle","0","",""],
["M","D","","wife","மனைவியின் அத்தை / சித்தி","Wife's athai or chithi","0","",""],
["M","D","","wife","மனைவியின் தாத்தா / பாட்டி","Wife's grandparents","0","",""],
["M","D","","wife","மனைவியின் சகோதரன் / சகோதரியின் பிள்ளை (உபநயனமானவன்)","Wife's brother's or sister's son (upanayanam done)","0","",""],
["M","D","","kids","சகோதரியின் பிள்ளை (மருமான்) — உபநயனமானவன்","Sister's son — upanayanam done","3","",""],
["M","D","","kids","சகோதரியின் பிள்ளை (மருமான்) — உபநயனமாகாதவன்","Sister's son — no upanayanam","P","",""],
["M","D","","kids","சகோதரியின் பெண்","Sister's daughter","P","",""],
["M","D","","kids","பேரன் (பெண்ணின் பிள்ளை) — உபநயனமானவன்","Daughter's son — upanayanam done","3","",""],
["M","D","","kids","பேரன் (பெண்ணின் பிள்ளை) — உபநயனமாகாதவன்","Daughter's son — no upanayanam","P","",""],
["M","D","","kids","பேத்தி (பெண்ணின் பெண்)","Daughter's daughter","P","",""],
["M","D","","kids","பேத்தி (பிள்ளையின் பெண்)","Son's daughter","P","",""],
["M","D","","step","சிற்றன்னையின் சகோதரன், சகோதரி, பெண்","Step-mother's brother, sister or daughter","1","",""],
["M","D","","step","அந்த மூவரின் பிள்ளை / பெண்","Children of those three","1","",""],
["M","D","","step","சிற்றன்னையின் அப்பா / அம்மா","Step-mother's father or mother","1","",""],
["M","D","","step","அம்மாவின் சக்களத்தியின் பெண்; அப்பாவின் ஒன்றுவிட்ட சகோதரர்களின் பெண்","Daughter of your mother's co-wife; daughter of your father's half-brothers","1","",""],
["M","D","","adopt","பெற்ற அம்மா (நீங்கள் வேறு கோத்ரத்திற்கு ஸ்வீகாரம் சென்றிருந்தால்)","Birth mother (you were adopted into another gotram)","3","",""],
["M","D","","adopt","பெற்ற அப்பா (நீங்கள் வேறு கோத்ரத்திற்கு ஸ்வீகாரம் சென்றிருந்தால்)","Birth father (you were adopted into another gotram)","3","",""],
["M","D","","adopt","வேறு கோத்ரத்திற்கு ஸ்வீகாரம் கொடுத்த உங்கள் பிள்ளை","Your son given in adoption to another gotram","3","",""],
["M","D","","adopt","பிறந்த குடும்பத்துச் சகோதரர்கள் (நீங்கள் ஸ்வீகாரம் சென்றிருந்தால்)","Brothers in your birth family (you were adopted)","1","",""],
// ── DEATH · married woman ───────────────────────────────────────
["F","D","","own","கணவர்","Husband","10","",""],
["F","D","","own","கணவர் குடும்பத்தினர், அல்லது உங்கள் குழந்தைகள்","Anyone in your husband's family, or your own children","H","மேலே ‘விவாஹமான புருஷன்’ என்பதைத் தேர்ந்தெடுத்து, கணவருக்கு அவர் என்ன உறவு என்று பார்க்கவும்.","Choose “Man (married)” above and the relation to your husband."],
// ── DEATH · widow, late husband's family ────────────────────────
["W","D","","hus","மாமனார் / மாமியார்","Father-in-law / mother-in-law","10","",""],
["W","D","","hus","கணவரின் சகோதரன் (மைத்துனர் / கொழுந்தனார்)","Husband's brother","10","",""],
["W","D","","hus","ஓரகத்தி (கணவரின் சகோதரன் மனைவி)","Husband's brother's wife","10","",""],
["W","D","","hus","கணவரின் சகோதரன் பிள்ளை (உபநயனமானவன்)","Husband's brother's son (upanayanam done)","10","",""],
["W","D","","hus","கணவரின் பெரியப்பா / சித்தப்பா","Husband's paternal uncle","10","",""],
["W","D","","hus","கணவரின் மற்ற தாயாதிகள் (பங்காளிகள்) — ஏழு தலைமுறைக்குள்","Other dayadhis (pangalis) of your husband within 7 generations","10","",""],
["W","D","","hus","ஏழு தலைமுறை தாண்டிய தாயாதி (பங்காளி)","Dayadhi (pangali) beyond 7 generations","3","",""],
["W","D","","hus","நாத்தனார் (கணவரின் கல்யாணமான சகோதரி)","Husband's married sister","3","",""],
["W","D","","hus","நாத்தனாரின் கணவர்","Husband's sister's husband","PS","குடும்ப வழக்கப்படி சிலர் ஸ்நானம் மட்டும்.","By family custom, some keep only a bath."],
["W","D","","hus","கணவரின் மாமா","Husband's maternal uncle","P","",""],
["W","D","","children","பிள்ளை (7 வயதுக்கு மேல் அல்லது உபநயனமானவன்)","Son (7 years or older, or upanayanam done)","10","",""],
["W","D","","children","பெண் — கல்யாணமாகாதவள்","Daughter — unmarried","10","",""],
["W","D","","children","பெண் — கல்யாணமானவள்","Daughter — married","3","",""],
["W","D","","children","மாப்பிள்ளை (பெண்ணின் கணவர்)","Son-in-law","3","",""],
// ── DEATH · married woman and widow, birth family ───────────────
["FW","D","","birth","அப்பா (தந்தை)","Your father","3","",""],
["FW","D","","birth","அம்மா (தாய்)","Your mother","3","",""],
["FW","D","","birth","சகோதரன் — உபநயனமானவன்","Your brother — upanayanam done","3","",""],
["FW","D","","birth","சகோதரன் — உபநயனமாகாதவன்","Your brother — no upanayanam","NS","",""],
["FW","D","","birth","சகோதரனின் பிள்ளை (உபநயனமானவன்)","Your brother's son (upanayanam done)","3","",""],
["FW","D","","birth","சகோதரியின் பிள்ளை (உபநயனமானவன்)","Your sister's son (upanayanam done)","3","",""],
["FW","D","","birth","சிற்றன்னை (அம்மாவின் சக்களத்தி)","Your step-mother (your mother's co-wife)","3","",""],
["FW","D","","birth","அக்கா / தங்கை","Your sister","P","",""],
["FW","D","","birth","சகோதரியின் பெண்","Your sister's daughter","P","",""],
["FW","D","","birth","சகோதரனின் பெண் (மருமாள்)","Your brother's daughter","P","",""],
["FW","D","","birth","பெரியப்பா / சித்தப்பா","Your father's brother","P","",""],
["FW","D","","birth","சித்தி / பெரியம்மா","Your mother's sister","P","",""],
["FW","D","","birth","மாமா","Your maternal uncle","P","",""],
["FW","D","","birth","அத்தை","Your father's sister","P","",""],
["FW","D","","birth","அந்த நால்வரின் பிள்ளை / பெண்","Children of those four","P","",""],
["FW","D","","birth","தாத்தா / பாட்டி (அப்பாவின் பெற்றோர்)","Your father's parents","P","",""],
["FW","D","","birth","தாத்தா / பாட்டி (அம்மாவின் பெற்றோர்)","Your mother's parents","P","",""],
["FW","D","","birth","சிற்றன்னையின் பெண், சகோதரி, சகோதரன்","Step-mother's daughter, sister or brother","1","இறந்தவர் கல்யாணமான பெண் அல்லது உபநயனமான பிள்ளை என்றால் மட்டும்.","Only if the person who died was a married woman or a boy with upanayanam."],
["FW","D","","birth","சிற்றன்னை வழி: அவள் பிள்ளை, பெண், சகோதரி — இவர்களின் குழந்தைகள்","Children of the step-mother's son, daughter or sister","1","இறந்தவர் கல்யாணமான பெண் அல்லது உபநயனமான பிள்ளை என்றால் மட்டும்.","Only if the person who died was a married woman or a boy with upanayanam."],
// ── DEATH · sanyasi ─────────────────────────────────────────────
["S","D","","own","பூர்வாச்ரம அப்பா / அம்மா","Your parents (before sannyasam)","S","செய்தி கேட்டவுடன் ஸ்நானம்.","A bath as soon as the news is heard."],
["S","D","","own","மற்ற எவரும்","Anyone else","SN","",""],
// ── BIRTH · married man ─────────────────────────────────────────
["M","B","b","own","உங்கள் பிள்ளை","Your son","10","ஆண் குழந்தை பிறந்தால் ஏழு தலைமுறைக்குள் எல்லாத் தாயாதிகளுக்கும் (பங்காளிகளுக்கும்) 10 நாள்.","For a boy, every dayadhi (pangali) within 7 generations keeps 10 days."],
["M","B","b","own","தம்பி (அப்பாவுக்குப் பிறந்த ஆண் குழந்தை)","Your brother (a boy born to your father)","10","",""],
["M","B","b","own","பேரன் (பிள்ளையின் பிள்ளை)","Your grandson through your son","10","",""],
["M","B","b","own","அண்ணன் / தம்பியின் பிள்ளை","Your brother's son","10","",""],
["M","B","b","own","அண்ணன் / தம்பியின் பேரன் (அவர் பிள்ளையின் பிள்ளை)","Your brother's grandson through his son","10","",""],
["M","B","b","own","பெரியப்பா / சித்தப்பாவின் பிள்ளை அல்லது பேரன் (பிள்ளை வழி)","Your father's brother's son, or his grandson through a son","10","",""],
["M","B","b","own","மற்ற தாயாதியின் (பங்காளி) ஆண் குழந்தை — ஏழு தலைமுறைக்குள்","Any other dayadhi's (pangali) son within 7 generations","10","",""],
["M","B","g","own","உங்கள் பெண்","Your daughter","10","",""],
["M","B","g","own","தங்கை (அப்பாவுக்குப் பிறந்த பெண் குழந்தை)","Your sister (a girl born to your father)","10","",""],
["M","B","g","own","பேத்தி (பிள்ளையின் பெண்)","Your granddaughter through your son","10","",""],
["M","B","g","own","அண்ணன் / தம்பியின் பெண்","Your brother's daughter","10","ஒன்றுவிட்ட (பின்னோதர) சகோதரனுக்கும் இதே.","The same for a half-brother."],
["M","B","g","own","அண்ணன் / தம்பியின் பேத்தி (அவர் பிள்ளையின் பெண்)","Your brother's granddaughter through his son","10","",""],
["M","B","g","own","சித்தப்பாவின் பெண்","Your father's younger brother's daughter","10","",""],
["M","B","g","own","மற்ற தாயாதியின் (பங்காளி) பெண் குழந்தை","Any other dayadhi's (pangali) daughter","0","பெண் குழந்தைக்கு மேலே சொன்னவர்களுக்கு மட்டுமே தீட்டு.","For a girl, only the relations above keep theetu."],
["M","B","","kids","பேரன் / பேத்தி (பெண்ணின் குழந்தை)","Your grandchild through your daughter","3","",""],
["M","B","","house","உங்கள் வீட்டில் அல்லது உங்கள் செலவில் நடந்த பிரஸவம் (சகோதரன், சித்தப்பா, மாமா முதலியோர்)","A delivery in your house or at your expense (as brother, uncle, mama…)","1","",""],
// ── BIRTH · married woman / widow ───────────────────────────────
["F","B","","children","உங்கள் குழந்தை (பெற்ற தாய்)","Your own child (you are the mother)","M3040","அந்நாட்கள் கழிந்ததும் புதிய மாங்கல்யக் கயிறு தரித்து, பஞ்சகவ்யம் உண்டபின் பாத்திரங்களைத் தொடலாம்.","After these days she wears a new mangalya thread and takes panchagavyam; then she may handle vessels again."],
["W","B","","children","உங்கள் குழந்தை (கணவர் மறைந்த பின் பிறந்தது)","Your own child (born after your husband's death)","M3040","பெற்ற தாய்க்குரிய நாட்களே. அதன் பின் பஞ்சகவ்யம் உண்டு பாத்திரங்களைத் தொடலாம்.","The same days as for any mother. After them she takes panchagavyam and may handle vessels again."],
["FW","B","","children","பேரன் / பேத்தி (பிள்ளையின் குழந்தை)","Your grandchild through your son","10","",""],
["FW","B","","children","பேரன் / பேத்தி (பெண்ணின் குழந்தை)","Your grandchild through your daughter","3","",""],
["F","B","","hus","கணவர் குடும்பத்தில் மற்ற பிறப்பு","Any other birth in your husband's family","H","மேலே ‘விவாஹமான புருஷன்’ என்பதைத் தேர்ந்தெடுத்து, கணவருக்கு அந்தக் குழந்தை என்ன உறவு என்று பார்க்கவும்.","Choose “Man (married)” above and the baby's relation to your husband."],
["W","B","","hus","கணவர் குடும்பத்தில் மற்ற பிறப்பு","Any other birth in your late husband's family","H","கணவர் இருந்திருந்தால் காக்கும் தீட்டே. மேலே ‘விவாஹமான புருஷன்’ என்பதில் பார்க்கவும்.","The theetu your husband would have kept. See “Man (married)” above."],
];

// Observers whose answer does not depend on the relation: [result, note_ta, note_en]
window.THEETU_FIXED = {
  B: { D: ["K"], B: ["0"] },
  U: { D: ["K"], B: ["0"] },
  G: { D: ["NS"], B: ["0"] },
  S: { B: ["NS"] },
};

const T = {
 ta: { title:"தீட்டு (ஆசௌசம்)", sub:"குடும்பத்தில் பிறப்பு அல்லது மரணம் நேர்ந்தால் காக்க வேண்டிய தீட்டு",
   disc:"இங்குள்ள விவரங்கள் பொதுவானவை. குடும்ப வழக்கம், ஸம்ப்ரதாயத்திற்கேற்ப மாறுபடலாம். எப்போதும் உங்கள் குடும்ப வாத்தியாரிடம் கேட்டு உறுதி செய்துகொள்ளவும்.",
   ev:"1. நிகழ்வு", D:"மரணம்", B:"பிறப்பு", obs:"2. தீட்டு காப்பவர் (நீங்கள்)", nb:"3. பிறந்த குழந்தை", b:"ஆண் குழந்தை", g:"பெண் குழந்தை",
   relD:"இறந்தவர் உங்களுக்கு", relB:"குழந்தை உங்களுக்கு", choose:"— தேர்ந்தெடுக்கவும் —",
   tbl:"முழு அட்டவணை", doc:"முழு விளக்கம் (படிக்க)",
   O:{M:"விவாஹமான புருஷன்",F:"விவாஹமான ஸ்த்ரீ",W:"கைம்பெண் (விதவை)",B:"ப்ரஹ்மசாரி (உபநயனமானவன்)",U:"உபநயனமாகாத பையன்",G:"கல்யாணமாகாத பெண் (கன்யா)",S:"ஸன்யாஸி"},
   G:{own:"தன் குடும்பம் / தாயாதிகள் (பங்காளிகள்)",children:"உங்கள் குழந்தைகள்",hus:"கணவரின் குடும்பம்",mother:"அம்மா வழி",father:"அத்தை வழி",wife:"மனைவி வழி",kids:"சகோதரி / பெண் / பிள்ளை வழிக் குழந்தைகள்",step:"சிற்றன்னை வழி",adopt:"ஸ்வீகாரம்",birth:"பிறந்த வீடு",house:"வீட்டில் பிரஸவம்"},
   R:{"10":"10 நாள்","3":"3 நாள்","P":"பக்ஷிணீ (1½ நாள்)","PS":"பக்ஷிணீ (1½ நாள்)","1":"1 நாள்","0":"தீட்டு இல்லை","S":"ஸ்நானம் மட்டும்","SN":"தீட்டு இல்லை (ஸ்நானமும் இல்லை)","NONE10":"தனித் தீட்டு இல்லை","H":"கணவர் காப்பது போலவே","K":"தீட்டு இல்லை","NS":"இதற்கு வாத்தியாரிடம் கேட்கவும்","30":"30 நாள்","40":"40 நாள்","3040":"30 / 40 நாள்"},
   K:"தானே ஈமக்கடன் (கர்மா) செய்தால் மட்டும், அந்தக் காலத்தில் நேரும் தீட்டு உண்டு.",
   NS:"இந்த நிலைக்குப் பொதுவான விதி இங்கு இல்லை. உங்கள் குடும்ப வாத்தியாரிடம் கேட்கவும்.",
   P:"பக்ஷிணீ = இரண்டு இரவு ஒரு பகல், அல்லது இரண்டு பகல் ஒரு இரவு. பகலில் உண்ணாவிட்டால் அன்றிரவே முடியும்; உண்டால் மறுநாள் காலை.",
   late:"செய்தி தாமதமாக வந்தால்: 3 மாதத்திற்குள் — 3 நாள்; 6 மாதத்திற்குள் — பக்ஷிணீ; 1 வருடத்திற்குள் — 1 நாள்; அதன் பின் ஸ்நானம் மட்டும். தாய் தந்தை மரணத்திற்கு மூத்த பிள்ளைக்கும், கணவர் மரணத்திற்கு மனைவிக்கும் எப்போது கேட்டாலும் 10 நாள்.",
   rdisc:"இது பொதுவான வழிகாட்டல் மட்டும். உங்கள் குடும்ப வாத்தியாரிடம் உறுதி செய்துகொள்ளவும்.",
   th:["உறவு","தீட்டு"], rest:"ப்ரஹ்மசாரி, உபநயனமாகாத பையன், கன்யா, ஸன்யாஸி (பிறப்பு)",
   restRows:[["மரணம் — ப்ரஹ்மசாரி / உபநயனமாகாத பையன்","தீட்டு இல்லை","தானே ஈமக்கடன் செய்தால் மட்டும் அந்தக் காலத் தீட்டு."],["மரணம் — கன்யா","வாத்தியாரிடம் கேட்கவும்",""],["பிறப்பு — ப்ரஹ்மசாரி / உபநயனமாகாத பையன் / கன்யா","தீட்டு இல்லை",""],["பிறப்பு — ஸன்யாஸி","வாத்தியாரிடம் கேட்கவும்",""]] },
 en: { title:"Theetu (Āśaucam)", sub:"The theetu to keep after a birth or a death in the family",
   disc:"These details are general. Family custom and sampradayam can differ. Always check with your family vadhyar.",
   ev:"1. Event", D:"Death", B:"Birth", obs:"2. Who is keeping theetu (you)", nb:"3. The newborn", b:"Boy", g:"Girl",
   relD:"The person who died is your", relB:"The baby is your", choose:"— choose —",
   tbl:"Full table", doc:"Full explanation (to read)",
   O:{M:"Man (married)",F:"Woman (married)",W:"Widow",B:"Brahmachari (upanayanam done)",U:"Boy before upanayanam",G:"Unmarried girl",S:"Sanyasi"},
   G:{own:"Own family and dayadhis (pangalis)",children:"Your children",hus:"Your late husband's family",mother:"Mother's side",father:"Father's sister's side",wife:"Wife's side",kids:"Sister's, daughter's and son's children",step:"Step-mother's side",adopt:"Adoption",birth:"Your birth family",house:"Delivery in your house"},
   R:{"10":"10 days","3":"3 days","P":"Pakshini (1½ days)","PS":"Pakshini (1½ days)","1":"1 day","0":"No theetu","S":"A bath only","SN":"No theetu (not even a bath)","NONE10":"No separate theetu","H":"Same as your husband","K":"No theetu","NS":"Ask your vadhyar","30":"30 days","40":"40 days","3040":"30 / 40 days"},
   K:"Only if he himself performs the funeral rites does he keep theetu, for that period.",
   NS:"There is no general rule here for this case. Please ask your family vadhyar.",
   P:"Pakshini = two nights and a day, or two days and a night. If you do not eat during the day it ends that night; if you eat, the next morning.",
   late:"If the news comes late: within 3 months — 3 days; within 6 months — pakshini; within a year — 1 day; after that, a bath only. For the death of a parent (eldest son) and of a husband (wife), always 10 days whenever heard.",
   rdisc:"This is general guidance only. Please confirm with your family vadhyar.",
   th:["Relation","Theetu"], rest:"Brahmachari, boy before upanayanam, unmarried girl, sanyasi (birth)",
   restRows:[["Death — brahmachari / boy before upanayanam","No theetu","Only if he performs the funeral rites, theetu for that period."],["Death — unmarried girl","Ask your vadhyar",""],["Birth — brahmachari / boy before upanayanam / unmarried girl","No theetu",""],["Birth — sanyasi","Ask your vadhyar",""]] },
};

const R = window.THEETU_RULES.map((r, i) => ({i, obs:r[0], ev:r[1], nb:r[2], grp:r[3], ta:r[4], en:r[5], res:r[6], nta:r[7], nen:r[8]}));
const FIXED = window.THEETU_FIXED;
const GORDER = ["own","children","hus","birth","mother","father","wife","kids","step","adopt","house"];
const OBS = ["M","F","W","B","U","G","S"];
let L = "ta", st = {ev:"", obs:"", nb:"", rel:""};
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const lbl = r => L === "ta" ? r.ta : r.en, note = r => L === "ta" ? r.nta : r.nen;

function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

function setLang(l) {
  L = l; store("theetuLang", l);
  document.body.classList.toggle("en", l === "en"); document.documentElement.lang = l;
  [...$("langs").children].forEach(b => b.classList.toggle("on", b.dataset.l === l));
  const t = T[L];
  $("t_title").textContent = t.title; $("t_sub").textContent = t.sub; $("t_disc").textContent = t.disc;
  $("t_ev").textContent = t.ev; $("b_D").textContent = t.D; $("b_B").textContent = t.B;
  $("t_obs").textContent = t.obs; $("t_nb").textContent = t.nb; $("b_boy").textContent = t.b; $("b_girl").textContent = t.g;
  $("t_tbl").textContent = t.tbl; $("t_doc").textContent = t.doc;
  obsPick.set(OBS.map(o => ({v:o, label:t.O[o]})), st.obs);
  $("doc").innerHTML = $("doc_" + L).innerHTML;
  table(); refresh();
}

function segClick(id, key) {
  $(id).addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    st[key] = b.dataset.v; if (key === "ev") st.rel = "";
    mark(id, st[key]); refresh();
  });
}
function mark(id, v) { [...$(id).children].forEach(x => x.classList.toggle("on", x.dataset.v === v)); }
segClick("ev", "ev"); segClick("sex", "nb");
$("langs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setLang(b.dataset.l); });

// picker: a button that opens a list drawn by the page (items: {g:"group"} or {v, label})
function closePickers() {
  document.querySelectorAll(".pick-list").forEach(l => { l.hidden = true; });
  document.querySelectorAll(".pick-btn").forEach(b => b.setAttribute("aria-expanded", "false"));
}
document.addEventListener("click", e => { if (!e.target.closest(".pick")) closePickers(); });
function makePicker(id, onPick) {
  const root = $(id), btn = root.querySelector(".pick-btn"), list = root.querySelector(".pick-list");
  let items = [], value = "";
  function draw() {
    const it = items.find(x => x.v === value);
    btn.querySelector("span").textContent = it ? it.label : T[L].choose;
    btn.classList.toggle("empty", !it);
    list.innerHTML = items.map(x => x.g ? `<div class="pick-grp">${esc(x.g)}</div>`
      : `<button type="button" class="pick-opt${x.v === value ? " on" : ""}" data-v="${esc(x.v)}">${esc(x.label)}</button>`).join("");
  }
  btn.addEventListener("click", () => {
    const open = list.hidden; closePickers();
    list.hidden = !open; btn.setAttribute("aria-expanded", String(open));
    if (open) { const cur = list.querySelector(".on"); if (cur) cur.scrollIntoView({block:"nearest"}); }
  });
  list.addEventListener("click", e => {
    const o = e.target.closest(".pick-opt"); if (!o) return;
    value = o.dataset.v; closePickers(); draw(); onPick(value);
    btn.scrollIntoView({block:"nearest"});
  });
  return { set(its, v) { items = its; value = its.some(x => x.v === v) ? v : ""; draw(); return value; } };
}
const obsPick = makePicker("obsPick", v => { st.obs = v; st.rel = ""; refresh(); });
const relPick = makePicker("relPick", v => { st.rel = v; show(); });

const rowsFor = () => R.filter(r => r.obs.includes(st.obs) && r.ev === st.ev && (r.nb === "" || r.nb === st.nb));
const isFixed = () => FIXED[st.obs] && FIXED[st.obs][st.ev];

function refresh() {
  const t = T[L], birth = st.ev === "B";
  const needSex = birth && !isFixed();
  $("sexStep").hidden = !needSex;
  if (!needSex && st.nb && !birth) { st.nb = ""; mark("sex", ""); }
  const ready = st.ev && st.obs && (!needSex || st.nb);
  $("relStep").hidden = !ready || !!isFixed();
  $("t_rel").textContent = (needSex ? "4. " : "3. ") + (birth ? t.relB : t.relD);
  if (ready && !isFixed()) {
    const rows = rowsFor(), items = [];
    for (const g of GORDER) {
      const gr = rows.filter(r => r.grp === g); if (!gr.length) continue;
      items.push({g:t.G[g]}); gr.forEach(r => items.push({v:String(r.i), label:lbl(r)}));
    }
    st.rel = relPick.set(items, st.rel);
  }
  show();
}

function card(code, rel, noteText) {
  const t = T[L];
  let h = `<div class="days">${esc(t.R[code] || code)}</div>`;
  if (rel) h += `<div class="r-rel">${esc(rel)}</div>`;
  if (noteText) h += `<div class="r-note">${esc(noteText)}</div>`;
  if (code === "P" || code === "PS") h += `<div class="r-late">${esc(t.P)}</div>`;
  if (st.ev === "D" && code === "10") h += `<div class="r-late">${esc(t.late)}</div>`;
  h += `<div class="r-disc">${esc(t.rdisc)}</div>`;
  $("res").className = "result" + (code === "NS" ? " ns" : "");
  $("res").innerHTML = h; $("res").hidden = false;
}

function show() {
  const t = T[L], birth = st.ev === "B";
  if (!st.ev || !st.obs) { $("res").hidden = true; return; }
  const f = isFixed();
  if (f) return card(f[0], t.O[st.obs], f[0] === "K" ? t.K : f[0] === "NS" ? t.NS : "");
  if ((birth && !st.nb) || st.rel === "") { $("res").hidden = true; return; }
  const r = R[+st.rel];
  let code = r.res;
  if (code === "M3040") code = st.nb === "b" ? "30" : "40";
  card(code, lbl(r), code === "NS" ? t.NS : note(r));
}

function table() {
  const t = T[L];
  const EV = {D:t.D, B:t.B}, NB = {b:" · " + t.b, g:" · " + t.g, "":""};
  let h = `<tr><th>${t.th[0]}</th><th>${t.th[1]}</th></tr>`, last = "";
  const order = [["D","M"],["D","F"],["D","W"],["D","S"],["B","M"],["B","F"],["B","W"]];
  for (const [ev, ob] of order) {
    for (const nb of ["", "b", "g"]) {
      const rows = R.filter(r => r.ev === ev && r.obs.includes(ob) && r.nb === nb);
      if (!rows.length) continue;
      h += `<tr class="grp"><td colspan="2">${esc(EV[ev] + " — " + t.O[ob] + NB[nb])}</td></tr>`;
      for (const r of rows) {
        const d = r.res === "M3040" ? t.R["3040"] : t.R[r.res];
        const n = r.res === "NS" ? "" : note(r);
        h += `<tr><td>${esc(lbl(r))}${n ? "<br><i>" + esc(n) + "</i>" : ""}</td><td class="d">${esc(d)}</td></tr>`;
      }
    }
  }
  h += `<tr class="grp"><td colspan="2">${esc(t.rest)}</td></tr>`;
  for (const [a, b, c] of t.restRows) h += `<tr><td>${esc(a)}${c ? "<br><i>" + esc(c) + "</i>" : ""}</td><td class="d">${esc(b)}</td></tr>`;
  $("tbl").innerHTML = h;
}

setLang(load("theetuLang") === "en" ? "en" : "ta");