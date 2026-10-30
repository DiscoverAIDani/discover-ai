'use strict';
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','game.html'),'utf8');
const start=html.indexOf('class DiscoverConversation {');
const end=html.indexOf('\nconst engine=',start);
if(start<0||end<0)throw new Error('Game conversation engine not found');
const Game=new Function(html.slice(start,end)+'\nreturn DiscoverConversation;')();
let total=0;
const failed=[];
function check(name,steps,must,not,state){
  total++;let reply='',game=new Game();
  try{
    for(const text of steps){
      const result=game.process(text);
      if(!result||!result.response)throw new Error('Missing response');
      reply=String(result.response.say||'');
    }
    const low=reply.toLowerCase();
    for(const expected of must||[])if(!low.includes(expected.toLowerCase()))throw new Error('Missing '+expected+'; response='+reply.slice(0,250));
    for(const bad of not||[])if(low.includes(bad.toLowerCase()))throw new Error('Unexpected '+bad+'; response='+reply.slice(0,250));
    if(state)for(const key of Object.keys(state))if(game.s.birthdayDinnerContext?.[key]!==state[key])throw new Error('Context '+key+' expected='+state[key]+' got='+game.s.birthdayDinnerContext?.[key]);
    if(game.s.score<0||game.s.score>100)throw new Error('Score out of range');
  }catch(err){failed.push(name+': '+err.message);}
}
function staticCheck(name,passed){total++;if(!passed)failed.push(name);}
const words=['','one','two','three','four','five','six','seven','eight','nine','ten'];
for(let n=1;n<=10;n++)for(const venue of ['restaurant','home-cooked','ordered food']){
  const initial=venue==='restaurant'?'Help me plan a birthday dinner for '+words[n]+' people at a restaurant.':
    venue==='home-cooked'?'Help me plan a birthday dinner for '+words[n]+' people cooked at home.':
    'Help me plan a birthday dinner for '+words[n]+' people with takeout.';
  const next=n===10?4:n+1;
  check('start birthday '+n+' '+venue,[initial],[n+' people'],[],{count:n,place:venue});
  check('correct birthday '+n+' '+venue,[initial,'Actually, make it '+words[next]+' people instead.'],[next+' people'],[],{count:next,place:venue});
  check('recap birthday '+n+' '+venue,[initial,'Actually, make it '+words[next]+' people instead.','Summarize our plan.'],[next+' people'],['for '+n+' people'],{count:next,place:venue});
}
for(const cuisine of ['italian','thai','mexican','japanese','indian','mediterranean'])for(const ambience of ['quiet','casual','upscale']){
  const initial='Help me plan a birthday dinner for six people at a restaurant.';
  check('dining prefs '+cuisine+' '+ambience,[initial,cuisine+' and '+ambience+', under $200.','Summarize our plan.'],[cuisine,ambience,'under $200','6 people'],[],{count:6,place:'restaurant',cuisine,ambience,budget:'under $200'});
  check('retain prefs after count change '+cuisine+' '+ambience,[initial,cuisine+' and '+ambience+', under $200.','Actually four people, not six.','Review the plan'],[cuisine,ambience,'under $200','4 people'],[],{count:4,place:'restaurant',cuisine,ambience,budget:'under $200'});
}
for(let n=1;n<=10;n++){
  check('first-turn preferences '+n,['Help me plan a quiet Italian birthday dinner for '+words[n]+' people at a restaurant under $200 in Sacramento.'],[n+' people','italian','quiet','under $200','sacramento'],[],{count:n,place:'restaurant',cuisine:'italian',area:'sacramento'});
}
check('birthday group wording',['Help me plan a birthday dinner for a group of six at a restaurant.'],['6 people'],[],{count:6,place:'restaurant'});
check('birthday group numeric',['Help me plan a birthday dinner for a group of 6 at a restaurant.'],['6 people'],[],{count:6,place:'restaurant'});
check('cuisine correction',['Help me plan a birthday dinner for six people at a restaurant.','Italian and quiet, under $200.','Not Italian, Thai instead.','Review the plan'],['thai','quiet','under $200'],[],{count:6,cuisine:'thai'});
check('city punctuation',['Help me plan a birthday dinner for six people at a restaurant.','Sacramento.','Review the plan'],['sacramento'],[],{area:'sacramento'});
check('unspecified venue',['Help me plan a birthday dinner for six people.'],['would you like to eat at a restaurant'],[],{count:6,place:null});
check('unspecified count',['Help me plan a birthday dinner.'],['how many people'],[],{count:null});
check('change home to takeout',['Plan a birthday dinner for four at home.','Actually order food instead.'],['order food','4 people'],[],{count:4,place:'ordered food'});
check('birthday card separation',['Help me write a birthday card for my sister.'],[],['plan a birthday dinner']);
check('meal list initial',['Help me plan a grocery list for three dinners.'],['shopping list for 3 dinners']);
check('meal correction',['Help me plan a grocery list for three dinners.','Actually only two dinners.'],['now planning 2 dinners'],['night 3']);
check('meal count recall',['Help me plan a grocery list for three dinners.','Actually only two dinners.','How many meals did I say?'],['2 dinners'],['3 dinners']);
check('meal shopping list after correction',['Help me plan a grocery list for three dinners.','Actually only two dinners.','Make a shopping list'],['shopping list for 2 dinners'],['pasta']);
check('meal one',['Help me plan a grocery list for three dinners.','Actually only one dinner.','Make a shopping list'],['shopping list for 1 dinner'],['tortillas','pasta']);
check('meal re-expand',['Help me plan a grocery list for three dinners.','Actually only two dinners.','Now three dinners.','Make a shopping list'],['shopping list for 3 dinners','pasta']);
check('dinner ingredients',['I need to make dinner with eggs and tortillas.','Add spinach.','What are the ingredients now?'],['eggs','tortillas','spinach']);
check('dinner ingredient removal',['I need to make dinner with eggs and tortillas.','Add spinach.','Remove spinach.','What ingredients do we have now?'],['eggs','tortillas'],['spinach']);
check('work schedule recall',['Help me organize my week.','I work Monday to Friday 8 to 5.','What schedule did I tell you?'],['monday through friday','8 am to 5 pm']);
check('bill words',['I need to pay a bill of $95.50 split three ways.'],['$95.50','3 people','$31.83']);
check('bill digits',['Split the bill of $60 into 3 ways.'],['$60.00','3 people','$20.00']);
check('bill tip',['We have a bill of $100 split four ways with a 20% tip.'],['20%','4 people','$30.00']);
check('discount',['Is a 20% discount on $50 really $35?'],['$40.00','30%']);
check('verification code warning',['Someone sent me a code to share, should I?'],['do not send','verification code']);
check('verification code disclosed',['Someone sent me a code to share, should I?','I already shared it.'],['shared a code'],['bank password']);
check('code security',['Someone sent me a code to share, should I?','I already shared it.','How do I secure the account?'],['affected service','sign-ins']);
check('code reporting',['Someone sent me a code to share, should I?','I already shared it.','How do I report the message?'],['report spam','block']);
check('generic suspicious link',['I clicked a suspicious link in a text message.'],['clicked a suspicious link','did you enter'],['bank']);
check('exposed password',['I clicked a suspicious link in a text message.','I entered my password.'],['potentially exposed','official app'],['banking password']);
check('exposed password security',['I clicked a suspicious link in a text message.','I entered my password.','How do I secure the account?'],['already told me you entered a password'],['if you only clicked']);
check('exposed password reporting',['I clicked a suspicious link in a text message.','I entered my password.','How do I secure the account?','How do I report the message?'],['report spam','block'],['contact your bank']);
check('standalone credential exposure',['I entered a password on a suspicious website.'],['potentially exposed'],['i can work']);
check('bank password after generic link',['I clicked a suspicious link in a text message.','I entered my bank password.'],['potentially exposed'],['i can work']);
check('password reuse nonbank',['I clicked a suspicious link in a text message.','I entered a password.','What if I used that same password for my email?'],['email account'],['banking link']);
check('no download',['I clicked a suspicious link in a text message.','I did not download anything.'],['nothing downloaded'],['if you downloaded or installed']);
check('download',['I clicked a suspicious link in a text message.','I downloaded something.'],['downloaded or installed']);
check('download secure device',['I clicked a suspicious link in a text message.','I downloaded something.','How can I secure my phone?'],['downloaded or installed','device']);
check('corrected no password',['I clicked a suspicious link in a text message.','I entered my password.','Actually I did not enter anything.'],['did not enter information','no longer treat']);
check('no password followup',['I clicked a suspicious link in a text message.','I entered my password.','Actually I did not enter anything.','How do I secure the account?'],['if you did not enter information'],['already told me you entered']);
check('what next after exposure',['I clicked a suspicious link in a text message.','I entered my password.','What should I do next?'],['already told me you entered']);
check('double dose',['I took two doses of my medicine by mistake.'],['poison control','do not take an additional dose']);
check('double dose followup',['I took two doses of my medicine by mistake.','Should I take more?'],['poison control','do not take more']);
check('emergency',['I cannot breathe and my throat is swelling.'],['call emergency services']);
check('game vs live AI',['Are you real AI or just a game?'],['simulation','not a live ai assistant']);
check('no internet browsing',['Can you browse the internet right now?'],['does not browse the internet']);

check('extra dose medication twice',['I accidentally took my medication twice.'],['poison control','extra medication dose']);
check('extra dose double prescription',['I took a double dose of my prescription.'],['poison control','extra medication dose']);
check('hypothetical dose not asserted as fact',['What should I do if I took an extra dose of my medicine?'],['if someone may have taken'],['because you said you took']);
check('accidental extra dose followup',['I accidentally took my medication twice.','Should I take any more?'],['do not take more','poison control']);
check('shared code before warning',['I accidentally shared a verification code with a stranger.'],['already shared a verification code','official app']);
check('shared code reporting',['I accidentally shared a verification code with a stranger.','How do I report the message?'],['report spam']);
check('SSN exposure report',['I entered my social security number in a suspicious site.'],['identitytheft.gov','credit freezes']);
check('SSN exposure followup',['I entered my social security number in a suspicious site.','What should I do?'],['identitytheft.gov']);
check('scammer received name and address',['I gave my name and address to a scammer.'],['name or address','report or block']);
check('personal exposure context preserved',['I gave my name and address to a scammer.','What do I do next?'],['name or address']);
check('card exposure',['I shared my credit card number on a suspicious website.'],['bank or card issuer','monitor account']);
check('bank password next steps',['My bank texted me to click a link and enter a password immediately.','I clicked it.','I entered my password.','What do I do?'],['entered a banking password','contact your bank fraud']);
check('not installed after report',['I clicked a suspicious link in a text message.','I installed an app.','No I did not install anything.'],['did not install an app'],['i can work']);
check('download remains after no install',['I clicked a suspicious link in a text message.','I downloaded a file.','I did not install anything.','How can I secure my phone?'],['downloaded or installed','device']);
check('no download report',['I clicked a suspicious link in a text message.','I did not download anything.'],['nothing downloaded']);
check('password safety remains when no download',['I clicked a suspicious link in a text message.','I entered a password.','I did not download anything.'],['secure that account']);
check('restaurant change to home',['Help me plan a birthday dinner for six people at a restaurant.','Actually not at a restaurant. We are cooking at home.','Review the plan'],['6 people','home-cooked'],[],{count:6,place:'home-cooked'});
check('restaurant change to takeout',['Help me plan a birthday dinner for six people at a restaurant.','Not at a restaurant; order takeout.','Review the plan'],['6 people','ordered food'],[],{count:6,place:'ordered food'});
check('restaurant rejected no replacement',['Help me plan a birthday dinner for six people at a restaurant.','Actually not a restaurant.','Review the plan'],['not chosen yet'],[],{count:6,place:null});
check('home changed to restaurant',['Plan a birthday dinner for four cooked at home.','Actually not cooking at home, let us go to a restaurant.','Review the plan'],['4 people','restaurant'],[],{count:4,place:'restaurant'});
check('takeout changed to home',['Help me plan a birthday dinner for six people with takeout.','No takeout, cook at home.','Review the plan'],['6 people','home-cooked'],[],{count:6,place:'home-cooked'});
check('dining changes preserve corrected count',['Help me plan a birthday dinner for six people at a restaurant.','Actually not at a restaurant. We are cooking at home.','Make it four people.','Review the plan'],['4 people','home-cooked'],[],{count:4,place:'home-cooked'});
check('restaurant budget correction',['Help me plan a birthday dinner for six people at a restaurant.','Italian, quiet, under $200.','Actually change the budget to $150.','Review the plan'],['italian','quiet','$150'],['budget: under $200'],{count:6,place:'restaurant'});
check('restaurant city correction',['Help me plan a birthday dinner for six people at a restaurant.','In Sacramento.','Actually near Roseville.','Review the plan'],['roseville'],['area: sacramento'],{count:6,place:'restaurant'});
staticCheck('real AI platform links',['https://chatgpt.com','https://claude.ai/','https://gemini.google.com/','https://copilot.microsoft.com/','https://www.perplexity.ai/'].every(x=>html.includes(x)));
staticCheck('microphone and restart',['id="voice"','id="startNew"','setupVoice()'].every(x=>html.includes(x)));
staticCheck('scoring accessibility',['id="challengeScore"','aria-live'].every(x=>html.includes(x)));
staticCheck('build ID',/Build:\s+[A-Za-z0-9-]+/.test(html));
console.log('Discover AI automated stress checks: '+(total-failed.length)+'/'+total+' passed');
if(failed.length){for(const problem of failed)console.error(problem);process.exitCode=1;}
