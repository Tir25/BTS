var xs=Object.defineProperty;var $s=(e,t,n)=>t in e?xs(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var _e=(e,t,n)=>$s(e,typeof t!="symbol"?t+"":t,n);import{c as xe,d as K,o as Mt,e as H,f as O,g as v,P as _o,m as ye,S as z,t as q,i as k,h as V,k as T,l as Cs,n as sr,u as $e,p as G,s as Gn,q as jn,r as ft,v as M,x as Ss,y as Mn,z as He,A as ks,B as qt,C as zt,D as Es,E as Ds,F as xn,H as As,I as Br,J as Bt,$ as Ro,K as Ms,L as Ts,M as W,N as Nr,O as Fs,Q as Is,R as lr,T as Ls,U as Os,V as Kn,W as Ps,X as qs,Y as oe,Z as _s,_ as Rs,a0 as zs}from"./index-BK47aaFD.js";import"./vendor-react-CyT1AhbS.js";import"./vendor-ui-D_U17TOn.js";import"./vendor-router-BXLLWNa2.js";import"./vendor-state-B-5mdhwp.js";import"./vendor-websocket-TjCxX7sJ.js";import"./vendor-maps-C78ko_py.js";import"./vendor-animations-jk_Di6sJ.js";var Ks=e=>e!=null,Bs=e=>e.filter(Ks);function Ns(e){return(...t)=>{for(const n of e)n&&n(...t)}}var E=e=>typeof e=="function"&&!e.length?e():e,Wn=e=>Array.isArray(e)?e:e?[e]:[];function Hs(e,...t){return typeof e=="function"?e(...t):e}var Us=G;function Vs(e,t,n,r){const o=e.length,s=t.length;let l=0;if(!s){for(;l<o;l++)n(e[l]);return}if(!o){for(;l<s;l++)r(t[l]);return}for(;l<s&&t[l]===e[l];l++);let a,i;t=t.slice(l),e=e.slice(l);for(a of t)e.includes(a)||r(a);for(i of e)t.includes(i)||n(i)}function Gs(e){const[t,n]=K(),r=e!=null&&e.throw?(u,g)=>{throw n(u instanceof Error?u:new Error(g)),u}:(u,g)=>{n(u instanceof Error?u:new Error(g))},o=e!=null&&e.api?Array.isArray(e.api)?e.api:[e.api]:[globalThis.localStorage].filter(Boolean),s=e!=null&&e.prefix?`${e.prefix}.`:"",l=new Map,a=new Proxy({},{get(u,g){let d=l.get(g);d||(d=K(void 0,{equals:!1}),l.set(g,d)),d[0]();const y=o.reduce((b,m)=>{if(b!==null||!m)return b;try{return m.getItem(`${s}${g}`)}catch(p){return r(p,`Error reading ${s}${g} from ${m.name}`),null}},null);return y!==null&&(e!=null&&e.deserializer)?e.deserializer(y,g,e.options):y}}),i=(u,g,d)=>{const y=e!=null&&e.serializer?e.serializer(g,u,d??e.options):g,b=`${s}${u}`;o.forEach(p=>{try{p.getItem(b)!==y&&p.setItem(b,y)}catch(w){r(w,`Error setting ${s}${u} to ${y} in ${p.name}`)}});const m=l.get(u);m&&m[1]()},c=u=>o.forEach(g=>{try{g.removeItem(`${s}${u}`)}catch(d){r(d,`Error removing ${s}${u} from ${g.name}`)}}),h=()=>o.forEach(u=>{try{u.clear()}catch(g){r(g,`Error clearing ${u.name}`)}}),f=()=>{const u={},g=(d,y)=>{if(!u.hasOwnProperty(d)){const b=y&&(e!=null&&e.deserializer)?e.deserializer(y,d,e.options):y;b&&(u[d]=b)}};return o.forEach(d=>{if(typeof d.getAll=="function"){let y;try{y=d.getAll()}catch(b){r(b,`Error getting all values from in ${d.name}`)}for(const b of y)g(b,y[b])}else{let y=0,b;try{for(;b=d.key(y++);)u.hasOwnProperty(b)||g(b,d.getItem(b))}catch(m){r(m,`Error getting all values from ${d.name}`)}}}),u};return(e==null?void 0:e.sync)!==!1&&Mt(()=>{const u=g=>{var y;let d=!1;o.forEach(b=>{try{b!==g.storageArea&&g.key&&g.newValue!==b.getItem(g.key)&&(g.newValue?b.setItem(g.key,g.newValue):b.removeItem(g.key),d=!0)}catch(m){r(m,`Error synching api ${b.name} from storage event (${g.key}=${g.newValue})`)}}),d&&g.key&&((y=l.get(g.key))==null||y[1]())};"addEventListener"in globalThis?(globalThis.addEventListener("storage",u),G(()=>globalThis.removeEventListener("storage",u))):(o.forEach(g=>{var d;return(d=g.addEventListener)==null?void 0:d.call(g,"storage",u)}),G(()=>o.forEach(g=>{var d;return(d=g.removeEventListener)==null?void 0:d.call(g,"storage",u)})))}),[a,i,{clear:h,error:t,remove:c,toJSON:f}]}var js=Gs,Ws=e=>(typeof e.clear=="function"||(e.clear=()=>{let t;for(;t=e.key(0);)e.removeItem(t)}),e),Hr=e=>{if(!e)return"";let t="";for(const n in e){if(!e.hasOwnProperty(n))continue;const r=e[n];t+=r instanceof Date?`; ${n}=${r.toUTCString()}`:typeof r=="boolean"?`; ${n}`:`; ${n}=${r}`}return t},Re=Ws({_cookies:[globalThis.document,"cookie"],getItem:e=>{var t;return((t=Re._cookies[0][Re._cookies[1]].match("(^|;)\\s*"+e+"\\s*=\\s*([^;]+)"))==null?void 0:t.pop())??null},setItem:(e,t,n)=>{const r=Re.getItem(e);Re._cookies[0][Re._cookies[1]]=`${e}=${t}${Hr(n)}`;const o=Object.assign(new Event("storage"),{key:e,oldValue:r,newValue:t,url:globalThis.document.URL,storageArea:Re});window.dispatchEvent(o)},removeItem:e=>{Re._cookies[0][Re._cookies[1]]=`${e}=deleted${Hr({expires:new Date(0)})}`},key:e=>{let t=null,n=0;return Re._cookies[0][Re._cookies[1]].replace(/(?:^|;)\s*(.+?)\s*=\s*[^;]+/g,(r,o)=>(!t&&o&&n++===e&&(t=o),"")),t},get length(){let e=0;return Re._cookies[0][Re._cookies[1]].replace(/(?:^|;)\s*.+?\s*=\s*[^;]+/g,t=>(e+=t?1:0,"")),e}}),Qs=1024,Ht=796,zo=700,Ys="bottom-right",Qn="bottom",Xs="system",Zs=!1,Ko=500,Js=500,Bo=500,el=Object.keys(Gn)[0],Ur=1,tl=Object.keys(jn)[0],No=xe({client:void 0,onlineManager:void 0,queryFlavor:"",version:"",shadowDOMTarget:void 0});function N(){return $e(No)}var Ho=xe(void 0),nl=e=>{const[t,n]=K(null),r=()=>{const l=t();l!=null&&(l.close(),n(null))},o=(l,a)=>{if(t()!=null)return;const i=window.open("","TSQD-Devtools-Panel",`width=${l},height=${a},popup`);if(!i)throw new Error("Failed to open popup. Please allow popups for this site to view the devtools in picture-in-picture mode.");i.document.head.innerHTML="",i.document.body.innerHTML="",Cs(i.document),i.document.title="TanStack Query Devtools",i.document.body.style.margin="0",i.addEventListener("pagehide",()=>{e.setLocalStore("pip_open","false"),n(null)}),[...(N().shadowDOMTarget||document).styleSheets].forEach(c=>{try{const h=[...c.cssRules].map(d=>d.cssText).join(""),f=document.createElement("style"),u=c.ownerNode;let g="";u&&"id"in u&&(g=u.id),g&&f.setAttribute("id",g),f.textContent=h,i.document.head.appendChild(f)}catch{const f=document.createElement("link");if(c.href==null)return;f.rel="stylesheet",f.type=c.type,f.media=c.media.toString(),f.href=c.href,i.document.head.appendChild(f)}}),sr(["focusin","focusout","pointermove","keydown","pointerdown","pointerup","click","mousedown","input"],i.document),e.setLocalStore("pip_open","true"),n(i)};H(()=>{(e.localStore.pip_open??"false")==="true"&&!e.disabled&&o(Number(window.innerWidth),Number(e.localStore.height||Js))}),H(()=>{const l=(N().shadowDOMTarget||document).querySelector("#_goober"),a=t();if(l&&a){const i=new MutationObserver(()=>{const c=(N().shadowDOMTarget||a.document).querySelector("#_goober");c&&(c.textContent=l.textContent)});i.observe(l,{childList:!0,subtree:!0,characterDataOldValue:!0}),G(()=>{i.disconnect()})}});const s=O(()=>({pipWindow:t(),requestPipWindow:o,closePipWindow:r,disabled:e.disabled??!1}));return v(Ho.Provider,{value:s,get children(){return e.children}})},ar=()=>O(()=>{const t=$e(Ho);if(!t)throw new Error("usePiPWindow must be used within a PiPProvider");return t()}),Uo=xe(()=>"dark");function Ce(){return $e(Uo)}var Vo={À:"A",Á:"A",Â:"A",Ã:"A",Ä:"A",Å:"A",Ấ:"A",Ắ:"A",Ẳ:"A",Ẵ:"A",Ặ:"A",Æ:"AE",Ầ:"A",Ằ:"A",Ȃ:"A",Ç:"C",Ḉ:"C",È:"E",É:"E",Ê:"E",Ë:"E",Ế:"E",Ḗ:"E",Ề:"E",Ḕ:"E",Ḝ:"E",Ȇ:"E",Ì:"I",Í:"I",Î:"I",Ï:"I",Ḯ:"I",Ȋ:"I",Ð:"D",Ñ:"N",Ò:"O",Ó:"O",Ô:"O",Õ:"O",Ö:"O",Ø:"O",Ố:"O",Ṍ:"O",Ṓ:"O",Ȏ:"O",Ù:"U",Ú:"U",Û:"U",Ü:"U",Ý:"Y",à:"a",á:"a",â:"a",ã:"a",ä:"a",å:"a",ấ:"a",ắ:"a",ẳ:"a",ẵ:"a",ặ:"a",æ:"ae",ầ:"a",ằ:"a",ȃ:"a",ç:"c",ḉ:"c",è:"e",é:"e",ê:"e",ë:"e",ế:"e",ḗ:"e",ề:"e",ḕ:"e",ḝ:"e",ȇ:"e",ì:"i",í:"i",î:"i",ï:"i",ḯ:"i",ȋ:"i",ð:"d",ñ:"n",ò:"o",ó:"o",ô:"o",õ:"o",ö:"o",ø:"o",ố:"o",ṍ:"o",ṓ:"o",ȏ:"o",ù:"u",ú:"u",û:"u",ü:"u",ý:"y",ÿ:"y",Ā:"A",ā:"a",Ă:"A",ă:"a",Ą:"A",ą:"a",Ć:"C",ć:"c",Ĉ:"C",ĉ:"c",Ċ:"C",ċ:"c",Č:"C",č:"c",C̆:"C",c̆:"c",Ď:"D",ď:"d",Đ:"D",đ:"d",Ē:"E",ē:"e",Ĕ:"E",ĕ:"e",Ė:"E",ė:"e",Ę:"E",ę:"e",Ě:"E",ě:"e",Ĝ:"G",Ǵ:"G",ĝ:"g",ǵ:"g",Ğ:"G",ğ:"g",Ġ:"G",ġ:"g",Ģ:"G",ģ:"g",Ĥ:"H",ĥ:"h",Ħ:"H",ħ:"h",Ḫ:"H",ḫ:"h",Ĩ:"I",ĩ:"i",Ī:"I",ī:"i",Ĭ:"I",ĭ:"i",Į:"I",į:"i",İ:"I",ı:"i",Ĳ:"IJ",ĳ:"ij",Ĵ:"J",ĵ:"j",Ķ:"K",ķ:"k",Ḱ:"K",ḱ:"k",K̆:"K",k̆:"k",Ĺ:"L",ĺ:"l",Ļ:"L",ļ:"l",Ľ:"L",ľ:"l",Ŀ:"L",ŀ:"l",Ł:"l",ł:"l",Ḿ:"M",ḿ:"m",M̆:"M",m̆:"m",Ń:"N",ń:"n",Ņ:"N",ņ:"n",Ň:"N",ň:"n",ŉ:"n",N̆:"N",n̆:"n",Ō:"O",ō:"o",Ŏ:"O",ŏ:"o",Ő:"O",ő:"o",Œ:"OE",œ:"oe",P̆:"P",p̆:"p",Ŕ:"R",ŕ:"r",Ŗ:"R",ŗ:"r",Ř:"R",ř:"r",R̆:"R",r̆:"r",Ȓ:"R",ȓ:"r",Ś:"S",ś:"s",Ŝ:"S",ŝ:"s",Ş:"S",Ș:"S",ș:"s",ş:"s",Š:"S",š:"s",Ţ:"T",ţ:"t",ț:"t",Ț:"T",Ť:"T",ť:"t",Ŧ:"T",ŧ:"t",T̆:"T",t̆:"t",Ũ:"U",ũ:"u",Ū:"U",ū:"u",Ŭ:"U",ŭ:"u",Ů:"U",ů:"u",Ű:"U",ű:"u",Ų:"U",ų:"u",Ȗ:"U",ȗ:"u",V̆:"V",v̆:"v",Ŵ:"W",ŵ:"w",Ẃ:"W",ẃ:"w",X̆:"X",x̆:"x",Ŷ:"Y",ŷ:"y",Ÿ:"Y",Y̆:"Y",y̆:"y",Ź:"Z",ź:"z",Ż:"Z",ż:"z",Ž:"Z",ž:"z",ſ:"s",ƒ:"f",Ơ:"O",ơ:"o",Ư:"U",ư:"u",Ǎ:"A",ǎ:"a",Ǐ:"I",ǐ:"i",Ǒ:"O",ǒ:"o",Ǔ:"U",ǔ:"u",Ǖ:"U",ǖ:"u",Ǘ:"U",ǘ:"u",Ǚ:"U",ǚ:"u",Ǜ:"U",ǜ:"u",Ứ:"U",ứ:"u",Ṹ:"U",ṹ:"u",Ǻ:"A",ǻ:"a",Ǽ:"AE",ǽ:"ae",Ǿ:"O",ǿ:"o",Þ:"TH",þ:"th",Ṕ:"P",ṕ:"p",Ṥ:"S",ṥ:"s",X́:"X",x́:"x",Ѓ:"Г",ѓ:"г",Ќ:"К",ќ:"к",A̋:"A",a̋:"a",E̋:"E",e̋:"e",I̋:"I",i̋:"i",Ǹ:"N",ǹ:"n",Ồ:"O",ồ:"o",Ṑ:"O",ṑ:"o",Ừ:"U",ừ:"u",Ẁ:"W",ẁ:"w",Ỳ:"Y",ỳ:"y",Ȁ:"A",ȁ:"a",Ȅ:"E",ȅ:"e",Ȉ:"I",ȉ:"i",Ȍ:"O",ȍ:"o",Ȑ:"R",ȑ:"r",Ȕ:"U",ȕ:"u",B̌:"B",b̌:"b",Č̣:"C",č̣:"c",Ê̌:"E",ê̌:"e",F̌:"F",f̌:"f",Ǧ:"G",ǧ:"g",Ȟ:"H",ȟ:"h",J̌:"J",ǰ:"j",Ǩ:"K",ǩ:"k",M̌:"M",m̌:"m",P̌:"P",p̌:"p",Q̌:"Q",q̌:"q",Ř̩:"R",ř̩:"r",Ṧ:"S",ṧ:"s",V̌:"V",v̌:"v",W̌:"W",w̌:"w",X̌:"X",x̌:"x",Y̌:"Y",y̌:"y",A̧:"A",a̧:"a",B̧:"B",b̧:"b",Ḑ:"D",ḑ:"d",Ȩ:"E",ȩ:"e",Ɛ̧:"E",ɛ̧:"e",Ḩ:"H",ḩ:"h",I̧:"I",i̧:"i",Ɨ̧:"I",ɨ̧:"i",M̧:"M",m̧:"m",O̧:"O",o̧:"o",Q̧:"Q",q̧:"q",U̧:"U",u̧:"u",X̧:"X",x̧:"x",Z̧:"Z",z̧:"z"},rl=Object.keys(Vo).join("|"),ol=new RegExp(rl,"g");function il(e){return e.replace(ol,t=>Vo[t])}var Fe={CASE_SENSITIVE_EQUAL:7,EQUAL:6,STARTS_WITH:5,WORD_STARTS_WITH:4,CONTAINS:3,ACRONYM:2,MATCHES:1,NO_MATCH:0};function Vr(e,t,n){var r;if(n=n||{},n.threshold=(r=n.threshold)!=null?r:Fe.MATCHES,!n.accessors){const l=Gr(e,t,n);return{rankedValue:e,rank:l,accessorIndex:-1,accessorThreshold:n.threshold,passed:l>=n.threshold}}const o=ul(e,n.accessors),s={rankedValue:e,rank:Fe.NO_MATCH,accessorIndex:-1,accessorThreshold:n.threshold,passed:!1};for(let l=0;l<o.length;l++){const a=o[l];let i=Gr(a.itemValue,t,n);const{minRanking:c,maxRanking:h,threshold:f=n.threshold}=a.attributes;i<c&&i>=Fe.MATCHES?i=c:i>h&&(i=h),i=Math.min(i,h),i>=f&&i>s.rank&&(s.rank=i,s.passed=!0,s.accessorIndex=l,s.accessorThreshold=f,s.rankedValue=a.itemValue)}return s}function Gr(e,t,n){return e=jr(e,n),t=jr(t,n),t.length>e.length?Fe.NO_MATCH:e===t?Fe.CASE_SENSITIVE_EQUAL:(e=e.toLowerCase(),t=t.toLowerCase(),e===t?Fe.EQUAL:e.startsWith(t)?Fe.STARTS_WITH:e.includes(` ${t}`)?Fe.WORD_STARTS_WITH:e.includes(t)?Fe.CONTAINS:t.length===1?Fe.NO_MATCH:sl(e).includes(t)?Fe.ACRONYM:ll(e,t))}function sl(e){let t="";return e.split(" ").forEach(r=>{r.split("-").forEach(s=>{t+=s.substr(0,1)})}),t}function ll(e,t){let n=0,r=0;function o(i,c,h){for(let f=h,u=c.length;f<u;f++)if(c[f]===i)return n+=1,f+1;return-1}function s(i){const c=1/i,h=n/t.length;return Fe.MATCHES+h*c}const l=o(t[0],e,0);if(l<0)return Fe.NO_MATCH;r=l;for(let i=1,c=t.length;i<c;i++){const h=t[i];if(r=o(h,e,r),!(r>-1))return Fe.NO_MATCH}const a=r-l;return s(a)}function jr(e,t){let{keepDiacritics:n}=t;return e=`${e}`,n||(e=il(e)),e}function al(e,t){let n=t;typeof t=="object"&&(n=t.accessor);const r=n(e);return r==null?[]:Array.isArray(r)?r:[String(r)]}function ul(e,t){const n=[];for(let r=0,o=t.length;r<o;r++){const s=t[r],l=cl(s),a=al(e,s);for(let i=0,c=a.length;i<c;i++)n.push({itemValue:a[i],attributes:l})}return n}var Wr={maxRanking:1/0,minRanking:-1/0};function cl(e){return typeof e=="function"?Wr:{...Wr,...e}}var dl={data:""},fl=e=>typeof window=="object"?((e?e.querySelector("#_goober"):window._goober)||Object.assign((e||document.head).appendChild(document.createElement("style")),{innerHTML:" ",id:"_goober"})).firstChild:e||dl,gl=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,hl=/\/\*[^]*?\*\/|  +/g,Qr=/\n+/g,At=(e,t)=>{let n="",r="",o="";for(let s in e){let l=e[s];s[0]=="@"?s[1]=="i"?n=s+" "+l+";":r+=s[1]=="f"?At(l,s):s+"{"+At(l,s[1]=="k"?"":t)+"}":typeof l=="object"?r+=At(l,t?t.replace(/([^,])+/g,a=>s.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,i=>/&/.test(i)?i.replace(/&/g,a):a?a+" "+i:i)):s):l!=null&&(s=/^--/.test(s)?s:s.replace(/[A-Z]/g,"-$&").toLowerCase(),o+=At.p?At.p(s,l):s+":"+l+";")}return n+(t&&o?t+"{"+o+"}":o)+r},at={},Go=e=>{if(typeof e=="object"){let t="";for(let n in e)t+=n+Go(e[n]);return t}return e},yl=(e,t,n,r,o)=>{let s=Go(e),l=at[s]||(at[s]=(i=>{let c=0,h=11;for(;c<i.length;)h=101*h+i.charCodeAt(c++)>>>0;return"go"+h})(s));if(!at[l]){let i=s!==e?e:(c=>{let h,f,u=[{}];for(;h=gl.exec(c.replace(hl,""));)h[4]?u.shift():h[3]?(f=h[3].replace(Qr," ").trim(),u.unshift(u[0][f]=u[0][f]||{})):u[0][h[1]]=h[2].replace(Qr," ").trim();return u[0]})(e);at[l]=At(o?{["@keyframes "+l]:i}:i,n?"":"."+l)}let a=n&&at.g?at.g:null;return n&&(at.g=at[l]),((i,c,h,f)=>{f?c.data=c.data.replace(f,i):c.data.indexOf(i)===-1&&(c.data=h?i+c.data:c.data+i)})(at[l],t,r,a),l},vl=(e,t,n)=>e.reduce((r,o,s)=>{let l=t[s];if(l&&l.call){let a=l(n),i=a&&a.props&&a.props.className||/^go/.test(a)&&a;l=i?"."+i:a&&typeof a=="object"?a.props?"":At(a,""):a===!1?"":a}return r+o+(l??"")},"");function Y(e){let t=this||{},n=e.call?e(t.p):e;return yl(n.unshift?n.raw?vl(n,[].slice.call(arguments,1),t.p):n.reduce((r,o)=>Object.assign(r,o&&o.call?o(t.p):o),{}):n,fl(t.target),t.g,t.o,t.k)}Y.bind({g:1});Y.bind({k:1});function jo(e){var t,n,r="";if(typeof e=="string"||typeof e=="number")r+=e;else if(typeof e=="object")if(Array.isArray(e)){var o=e.length;for(t=0;t<o;t++)e[t]&&(n=jo(e[t]))&&(r&&(r+=" "),r+=n)}else for(n in e)e[n]&&(r&&(r+=" "),r+=n);return r}function L(){for(var e,t,n=0,r="",o=arguments.length;n<o;n++)(e=arguments[n])&&(t=jo(e))&&(r&&(r+=" "),r+=t);return r}function ml(e,t){const n=Bt(e),{onChange:r}=t;let o=new Set(t.appear?void 0:n);const s=new WeakSet,[l,a]=K([],{equals:!1}),[i]=Ms(),c=f=>{a(u=>(u.push.apply(u,f),u));for(const u of f)s.delete(u)},h=(f,u,g)=>f.splice(g,0,u);return O(f=>{const u=l(),g=e();if(g[Ro],Bt(i))return i(),f;if(u.length){const d=f.filter(y=>!u.includes(y));return u.length=0,r({list:d,added:[],removed:[],unchanged:d,finishRemoved:c}),d}return Bt(()=>{const d=new Set(g),y=g.slice(),b=[],m=[],p=[];for(const x of g)(o.has(x)?p:b).push(x);let w=!b.length;for(let x=0;x<f.length;x++){const $=f[x];d.has($)||(s.has($)||(m.push($),s.add($)),h(y,$,x)),w&&$!==y[x]&&(w=!1)}return!m.length&&w?f:(r({list:y,added:b,removed:m,unchanged:p,finishRemoved:c}),o=d,y)})},t.appear?[]:n.slice())}function Me(...e){return Ns(e)}var Yr=e=>e instanceof Element;function Yn(e,t){if(t(e))return e;if(typeof e=="function"&&!e.length)return Yn(e(),t);if(Array.isArray(e)){const n=[];for(const r of e){const o=Yn(r,t);o&&(Array.isArray(o)?n.push.apply(n,o):n.push(o))}return n.length?n:null}return null}function bl(e,t=Yr,n=Yr){const r=O(e),o=O(()=>Yn(r(),t));return o.toArray=()=>{const s=o();return Array.isArray(s)?s:s?[s]:[]},o}function pl(e){return O(()=>{const t=e.name||"s";return{enterActive:(e.enterActiveClass||t+"-enter-active").split(" "),enter:(e.enterClass||t+"-enter").split(" "),enterTo:(e.enterToClass||t+"-enter-to").split(" "),exitActive:(e.exitActiveClass||t+"-exit-active").split(" "),exit:(e.exitClass||t+"-exit").split(" "),exitTo:(e.exitToClass||t+"-exit-to").split(" "),move:(e.moveClass||t+"-move").split(" ")}})}function Wo(e){requestAnimationFrame(()=>requestAnimationFrame(e))}function wl(e,t,n,r){const{onBeforeEnter:o,onEnter:s,onAfterEnter:l}=t;o==null||o(n),n.classList.add(...e.enter),n.classList.add(...e.enterActive),queueMicrotask(()=>{if(!n.parentNode)return r==null?void 0:r();s==null||s(n,()=>a())}),Wo(()=>{n.classList.remove(...e.enter),n.classList.add(...e.enterTo),(!s||s.length<2)&&(n.addEventListener("transitionend",a),n.addEventListener("animationend",a))});function a(i){(!i||i.target===n)&&(n.removeEventListener("transitionend",a),n.removeEventListener("animationend",a),n.classList.remove(...e.enterActive),n.classList.remove(...e.enterTo),l==null||l(n))}}function xl(e,t,n,r){const{onBeforeExit:o,onExit:s,onAfterExit:l}=t;if(!n.parentNode)return r==null?void 0:r();o==null||o(n),n.classList.add(...e.exit),n.classList.add(...e.exitActive),s==null||s(n,()=>a()),Wo(()=>{n.classList.remove(...e.exit),n.classList.add(...e.exitTo),(!s||s.length<2)&&(n.addEventListener("transitionend",a),n.addEventListener("animationend",a))});function a(i){(!i||i.target===n)&&(r==null||r(),n.removeEventListener("transitionend",a),n.removeEventListener("animationend",a),n.classList.remove(...e.exitActive),n.classList.remove(...e.exitTo),l==null||l(n))}}var Xr=e=>{const t=pl(e);return ml(bl(()=>e.children).toArray,{appear:e.appear,onChange({added:n,removed:r,finishRemoved:o,list:s}){const l=t();for(const i of n)wl(l,e,i);const a=[];for(const i of s)i.isConnected&&(i instanceof HTMLElement||i instanceof SVGElement)&&a.push({el:i,rect:i.getBoundingClientRect()});queueMicrotask(()=>{const i=[];for(const{el:c,rect:h}of a)if(c.isConnected){const f=c.getBoundingClientRect(),u=h.left-f.left,g=h.top-f.top;(u||g)&&(c.style.transform=`translate(${u}px, ${g}px)`,c.style.transitionDuration="0s",i.push(c))}document.body.offsetHeight;for(const c of i){let h=function(f){(f.target===c||/transform$/.test(f.propertyName))&&(c.removeEventListener("transitionend",h),c.classList.remove(...l.move))};c.classList.add(...l.move),c.style.transform=c.style.transitionDuration="",c.addEventListener("transitionend",h)}});for(const i of r)xl(l,e,i,()=>o([i]))}})},Bn=Symbol("fallback");function Zr(e){for(const t of e)t.dispose()}function $l(e,t,n,r={}){const o=new Map;return G(()=>Zr(o.values())),()=>{const l=e()||[];return l[Ro],Bt(()=>{var h,f;if(!l.length)return Zr(o.values()),o.clear(),r.fallback?[Nr(g=>(o.set(Bn,{dispose:g}),r.fallback()))]:[];const a=new Array(l.length),i=o.get(Bn);if(!o.size||i){i==null||i.dispose(),o.delete(Bn);for(let u=0;u<l.length;u++){const g=l[u],d=t(g,u);s(a,g,u,d)}return a}const c=new Set(o.keys());for(let u=0;u<l.length;u++){const g=l[u],d=t(g,u);c.delete(d);const y=o.get(d);y?(a[u]=y.mapped,(h=y.setIndex)==null||h.call(y,u),y.setItem(()=>g)):s(a,g,u,d)}for(const u of c)(f=o.get(u))==null||f.dispose(),o.delete(u);return a})};function s(l,a,i,c){Nr(h=>{const[f,u]=K(a),g={setItem:u,dispose:h};if(n.length>1){const[d,y]=K(i);g.setIndex=y,g.mapped=n(f,d)}else g.mapped=n(f);o.set(c,g),l[i]=g.mapped})}}function $n(e){const{by:t}=e;return O($l(()=>e.each,typeof t=="function"?t:n=>n[t],e.children,"fallback"in e?{fallback:()=>e.fallback}:void 0))}function Cl(e,t,n,r){return e.addEventListener(t,n,r),Us(e.removeEventListener.bind(e,t,n,r))}function Sl(e,t,n,r){const o=()=>{Wn(E(e)).forEach(s=>{s&&Wn(E(t)).forEach(l=>Cl(s,l,n,r))})};typeof e=="function"?H(o):V(o)}function kl(e,t){const n=new ResizeObserver(e);return G(n.disconnect.bind(n)),{observe:r=>n.observe(r,t),unobserve:n.unobserve.bind(n)}}function El(e,t,n){const r=new WeakMap,{observe:o,unobserve:s}=kl(l=>{for(const a of l){const{contentRect:i,target:c}=a,h=Math.round(i.width),f=Math.round(i.height),u=r.get(c);(!u||u.width!==h||u.height!==f)&&(t(i,c,a),r.set(c,{width:h,height:f}))}},n);H(l=>{const a=Bs(Wn(E(e)));return Vs(a,l,o,s),a},[])}var Dl=/((?:--)?(?:\w+-?)+)\s*:\s*([^;]*)/g;function Jr(e){const t={};let n;for(;n=Dl.exec(e);)t[n[1]]=n[2];return t}function Tn(e,t){if(typeof e=="string"){if(typeof t=="string")return`${e};${t}`;e=Jr(e)}else typeof t=="string"&&(t=Jr(t));return{...e,...t}}function Al(e,t,n=-1){return n in e?[...e.slice(0,n),t,...e.slice(n)]:[...e,t]}function Xn(e,t){const n=[...e],r=n.indexOf(t);return r!==-1&&n.splice(r,1),n}function Ml(e){return typeof e=="number"}function _t(e){return Object.prototype.toString.call(e)==="[object String]"}function Tl(e){return typeof e=="function"}function cn(e){return t=>`${e()}-${t}`}function Be(e,t){return e?e===t||e.contains(t):!1}function rn(e,t=!1){const{activeElement:n}=Je(e);if(!(n!=null&&n.nodeName))return null;if(Qo(n)&&n.contentDocument)return rn(n.contentDocument.body,t);if(t){const r=n.getAttribute("aria-activedescendant");if(r){const o=Je(n).getElementById(r);if(o)return o}}return n}function Fl(e){return Je(e).defaultView||window}function Je(e){return e?e.ownerDocument||e:document}function Qo(e){return e.tagName==="IFRAME"}var ur=(e=>(e.Escape="Escape",e.Enter="Enter",e.Tab="Tab",e.Space=" ",e.ArrowDown="ArrowDown",e.ArrowLeft="ArrowLeft",e.ArrowRight="ArrowRight",e.ArrowUp="ArrowUp",e.End="End",e.Home="Home",e.PageDown="PageDown",e.PageUp="PageUp",e))(ur||{});function cr(e){var t;return typeof window<"u"&&window.navigator!=null?e.test(((t=window.navigator.userAgentData)==null?void 0:t.platform)||window.navigator.platform):!1}function Fn(){return cr(/^Mac/i)}function Il(){return cr(/^iPhone/i)}function Ll(){return cr(/^iPad/i)||Fn()&&navigator.maxTouchPoints>1}function Ol(){return Il()||Ll()}function Pl(){return Fn()||Ol()}function de(e,t){return t&&(Tl(t)?t(e):t[0](t[1],e)),e==null?void 0:e.defaultPrevented}function we(e){return t=>{for(const n of e)de(t,n)}}function ql(e){return Fn()?e.metaKey&&!e.ctrlKey:e.ctrlKey&&!e.metaKey}function De(e){if(e)if(_l())e.focus({preventScroll:!0});else{const t=Rl(e);e.focus(),zl(t)}}var bn=null;function _l(){if(bn==null){bn=!1;try{document.createElement("div").focus({get preventScroll(){return bn=!0,!0}})}catch{}}return bn}function Rl(e){let t=e.parentNode;const n=[],r=document.scrollingElement||document.documentElement;for(;t instanceof HTMLElement&&t!==r;)(t.offsetHeight<t.scrollHeight||t.offsetWidth<t.scrollWidth)&&n.push({element:t,scrollTop:t.scrollTop,scrollLeft:t.scrollLeft}),t=t.parentNode;return r instanceof HTMLElement&&n.push({element:r,scrollTop:r.scrollTop,scrollLeft:r.scrollLeft}),n}function zl(e){for(const{element:t,scrollTop:n,scrollLeft:r}of e)t.scrollTop=n,t.scrollLeft=r}var Yo=["input:not([type='hidden']):not([disabled])","select:not([disabled])","textarea:not([disabled])","button:not([disabled])","a[href]","area[href]","[tabindex]","iframe","object","embed","audio[controls]","video[controls]","[contenteditable]:not([contenteditable='false'])"],Kl=[...Yo,'[tabindex]:not([tabindex="-1"]):not([disabled])'],dr=Yo.join(":not([hidden]),")+",[tabindex]:not([disabled]):not([hidden])",Bl=Kl.join(':not([hidden]):not([tabindex="-1"]),');function Xo(e,t){const r=Array.from(e.querySelectorAll(dr)).filter(eo);return t&&eo(e)&&r.unshift(e),r.forEach((o,s)=>{if(Qo(o)&&o.contentDocument){const l=o.contentDocument.body,a=Xo(l,!1);r.splice(s,1,...a)}}),r}function eo(e){return Zo(e)&&!Nl(e)}function Zo(e){return e.matches(dr)&&fr(e)}function Nl(e){return parseInt(e.getAttribute("tabindex")||"0",10)<0}function fr(e,t){return e.nodeName!=="#comment"&&Hl(e)&&Ul(e,t)&&(!e.parentElement||fr(e.parentElement,e))}function Hl(e){if(!(e instanceof HTMLElement)&&!(e instanceof SVGElement))return!1;const{display:t,visibility:n}=e.style;let r=t!=="none"&&n!=="hidden"&&n!=="collapse";if(r){if(!e.ownerDocument.defaultView)return r;const{getComputedStyle:o}=e.ownerDocument.defaultView,{display:s,visibility:l}=o(e);r=s!=="none"&&l!=="hidden"&&l!=="collapse"}return r}function Ul(e,t){return!e.hasAttribute("hidden")&&(e.nodeName==="DETAILS"&&t&&t.nodeName!=="SUMMARY"?e.hasAttribute("open"):!0)}function Vl(e,t,n){const r=t!=null&&t.tabbable?Bl:dr,o=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode(s){var l;return(l=t==null?void 0:t.from)!=null&&l.contains(s)?NodeFilter.FILTER_REJECT:s.matches(r)&&fr(s)&&(!(t!=null&&t.accept)||t.accept(s))?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});return t!=null&&t.from&&(o.currentNode=t.from),o}function to(e){for(;e&&!Gl(e);)e=e.parentElement;return e||document.scrollingElement||document.documentElement}function Gl(e){const t=window.getComputedStyle(e);return/(auto|scroll)/.test(t.overflow+t.overflowX+t.overflowY)}function jl(){}function Wl(e,t){const[n,r]=e;let o=!1;const s=t.length;for(let l=s,a=0,i=l-1;a<l;i=a++){const[c,h]=t[a],[f,u]=t[i],[,g]=t[i===0?l-1:i-1]||[0,0],d=(h-u)*(n-c)-(c-f)*(r-h);if(u<h){if(r>=u&&r<h){if(d===0)return!0;d>0&&(r===u?r>g&&(o=!o):o=!o)}}else if(h<u){if(r>h&&r<=u){if(d===0)return!0;d<0&&(r===u?r<g&&(o=!o):o=!o)}}else if(r==h&&(n>=f&&n<=c||n>=c&&n<=f))return!0}return o}function X(e,t){return W(e,t)}var Jt=new Map,no=new Set;function ro(){if(typeof window>"u")return;const e=n=>{if(!n.target)return;let r=Jt.get(n.target);r||(r=new Set,Jt.set(n.target,r),n.target.addEventListener("transitioncancel",t)),r.add(n.propertyName)},t=n=>{if(!n.target)return;const r=Jt.get(n.target);if(r&&(r.delete(n.propertyName),r.size===0&&(n.target.removeEventListener("transitioncancel",t),Jt.delete(n.target)),Jt.size===0)){for(const o of no)o();no.clear()}};document.body.addEventListener("transitionrun",e),document.body.addEventListener("transitionend",t)}typeof document<"u"&&(document.readyState!=="loading"?ro():document.addEventListener("DOMContentLoaded",ro));function Zn(e,t){const n=oo(e,t,"left"),r=oo(e,t,"top"),o=t.offsetWidth,s=t.offsetHeight;let l=e.scrollLeft,a=e.scrollTop;const i=l+e.offsetWidth,c=a+e.offsetHeight;n<=l?l=n:n+o>i&&(l+=n+o-i),r<=a?a=r:r+s>c&&(a+=r+s-c),e.scrollLeft=l,e.scrollTop=a}function oo(e,t,n){const r=n==="left"?"offsetLeft":"offsetTop";let o=0;for(;t.offsetParent&&(o+=t[r],t.offsetParent!==e);){if(t.offsetParent.contains(e)){o-=e[r];break}t=t.offsetParent}return o}function Ql(e,t){var n,r;if(document.contains(e)){const o=document.scrollingElement||document.documentElement;if(window.getComputedStyle(o).overflow==="hidden"){let l=to(e);for(;e&&l&&e!==o&&l!==o;)Zn(l,e),e=l,l=to(e)}else{const{left:l,top:a}=e.getBoundingClientRect();(n=e==null?void 0:e.scrollIntoView)==null||n.call(e,{block:"nearest"});const{left:i,top:c}=e.getBoundingClientRect();(Math.abs(l-i)>1||Math.abs(a-c)>1)&&((r=e.scrollIntoView)==null||r.call(e,{block:"nearest"}))}}}var Jo={border:"0",clip:"rect(0 0 0 0)","clip-path":"inset(50%)",height:"1px",margin:"0 -1px -1px 0",overflow:"hidden",padding:"0",position:"absolute",width:"1px","white-space":"nowrap"};function Ne(e){return t=>(e(t),()=>e(void 0))}function In(e,t){const[n,r]=K(io(t==null?void 0:t()));return H(()=>{var o;r(((o=e())==null?void 0:o.tagName.toLowerCase())||io(t==null?void 0:t()))}),n}function io(e){return _t(e)?e:void 0}function fe(e){const[t,n]=oe(e,["as"]);if(!t.as)throw new Error("[kobalte]: Polymorphic is missing the required `as` prop.");return v(_s,W(n,{get component(){return t.as}}))}var Yl=["id","name","validationState","required","disabled","readOnly"];function Xl(e){const t=`form-control-${He()}`,n=X({id:t},e),[r,o]=K(),[s,l]=K(),[a,i]=K(),[c,h]=K(),f=(y,b,m)=>{const p=m!=null||r()!=null;return[m,r(),p&&b!=null?y:void 0].filter(Boolean).join(" ")||void 0},u=y=>[a(),c(),y].filter(Boolean).join(" ")||void 0,g=O(()=>({"data-valid":E(n.validationState)==="valid"?"":void 0,"data-invalid":E(n.validationState)==="invalid"?"":void 0,"data-required":E(n.required)?"":void 0,"data-disabled":E(n.disabled)?"":void 0,"data-readonly":E(n.readOnly)?"":void 0}));return{formControlContext:{name:()=>E(n.name)??E(n.id),dataset:g,validationState:()=>E(n.validationState),isRequired:()=>E(n.required),isDisabled:()=>E(n.disabled),isReadOnly:()=>E(n.readOnly),labelId:r,fieldId:s,descriptionId:a,errorMessageId:c,getAriaLabelledBy:f,getAriaDescribedBy:u,generateId:cn(()=>E(n.id)),registerLabel:Ne(o),registerField:Ne(l),registerDescription:Ne(i),registerErrorMessage:Ne(h)}}}var ei=xe();function dn(){const e=$e(ei);if(e===void 0)throw new Error("[kobalte]: `useFormControlContext` must be used within a `FormControlContext.Provider` component");return e}function ti(e){const t=dn(),n=X({id:t.generateId("description")},e);return H(()=>G(t.registerDescription(n.id))),v(fe,W({as:"div"},()=>t.dataset(),n))}function ni(e){const t=dn(),n=X({id:t.generateId("error-message")},e),[r,o]=oe(n,["forceMount"]),s=()=>t.validationState()==="invalid";return H(()=>{s()&&G(t.registerErrorMessage(o.id))}),v(z,{get when(){return r.forceMount||s()},get children(){return v(fe,W({as:"div"},()=>t.dataset(),o))}})}function Zl(e){let t;const n=dn(),r=X({id:n.generateId("label")},e),[o,s]=oe(r,["ref"]),l=In(()=>t,()=>"label");return H(()=>G(n.registerLabel(s.id))),v(fe,W({as:"label",ref(a){const i=Me(c=>t=c,o.ref);typeof i=="function"&&i(a)},get for(){return ye(()=>l()==="label")()?n.fieldId():void 0}},()=>n.dataset(),s))}function Jl(e,t){H(ft(e,n=>{if(n==null)return;const r=ea(n);r!=null&&(r.addEventListener("reset",t,{passive:!0}),G(()=>{r.removeEventListener("reset",t)}))}))}function ea(e){return ta(e)?e.form:e.closest("form")}function ta(e){return e.matches("textarea, input, select, button")}function fn(e){var l;const[t,n]=K((l=e.defaultValue)==null?void 0:l.call(e)),r=O(()=>{var a;return((a=e.value)==null?void 0:a.call(e))!==void 0}),o=O(()=>{var a;return r()?(a=e.value)==null?void 0:a.call(e):t()});return[o,a=>{Bt(()=>{var c;const i=Hs(a,o());return Object.is(i,o())||(r()||n(i),(c=e.onChange)==null||c.call(e,i)),i})}]}function ri(e){const[t,n]=fn(e);return[()=>t()??!1,n]}function na(e){const[t,n]=fn(e);return[()=>t()??[],n]}function ra(e={}){const[t,n]=ri({value:()=>E(e.isSelected),defaultValue:()=>!!E(e.defaultIsSelected),onChange:s=>{var l;return(l=e.onSelectedChange)==null?void 0:l.call(e,s)}});return{isSelected:t,setIsSelected:s=>{!E(e.isReadOnly)&&!E(e.isDisabled)&&n(s)},toggle:()=>{!E(e.isReadOnly)&&!E(e.isDisabled)&&n(!t())}}}var oa=Object.defineProperty,Ln=(e,t)=>{for(var n in t)oa(e,n,{get:t[n],enumerable:!0})},oi=xe();function ii(){return $e(oi)}function ia(){const e=ii();if(e===void 0)throw new Error("[kobalte]: `useDomCollectionContext` must be used within a `DomCollectionProvider` component");return e}function si(e,t){return!!(t.compareDocumentPosition(e)&Node.DOCUMENT_POSITION_PRECEDING)}function sa(e,t){var o;const n=t.ref();if(!n)return-1;let r=e.length;if(!r)return-1;for(;r--;){const s=(o=e[r])==null?void 0:o.ref();if(s&&si(s,n))return r+1}return 0}function la(e){const t=e.map((r,o)=>[o,r]);let n=!1;return t.sort(([r,o],[s,l])=>{const a=o.ref(),i=l.ref();return a===i||!a||!i?0:si(a,i)?(r>s&&(n=!0),-1):(r<s&&(n=!0),1)}),n?t.map(([r,o])=>o):e}function li(e,t){const n=la(e);e!==n&&t(n)}function aa(e){var o,s;const t=e[0],n=(o=e[e.length-1])==null?void 0:o.ref();let r=(s=t==null?void 0:t.ref())==null?void 0:s.parentElement;for(;r;){if(n&&r.contains(n))return r;r=r.parentElement}return Je(r).body}function ua(e,t){H(()=>{const n=setTimeout(()=>{li(e(),t)});G(()=>clearTimeout(n))})}function ca(e,t){if(typeof IntersectionObserver!="function"){ua(e,t);return}let n=[];H(()=>{const r=()=>{const l=!!n.length;n=e(),l&&li(e(),t)},o=aa(e()),s=new IntersectionObserver(r,{root:o});for(const l of e()){const a=l.ref();a&&s.observe(a)}G(()=>s.disconnect())})}function da(e={}){const[t,n]=na({value:()=>E(e.items),onChange:s=>{var l;return(l=e.onItemsChange)==null?void 0:l.call(e,s)}});ca(t,n);const r=s=>(n(l=>{const a=sa(l,s);return Al(l,s,a)}),()=>{n(l=>{const a=l.filter(i=>i.ref()!==s.ref());return l.length===a.length?l:a})});return{DomCollectionProvider:s=>v(oi.Provider,{value:{registerItem:r},get children(){return s.children}})}}function fa(e){const t=ia(),n=X({shouldRegisterItem:!0},e);H(()=>{if(!n.shouldRegisterItem)return;const r=t.registerItem(n.getItem());G(r)})}function ai(e){let t=e.startIndex??0;const n=e.startLevel??0,r=[],o=i=>{if(i==null)return"";const c=e.getKey??"key",h=_t(c)?i[c]:c(i);return h!=null?String(h):""},s=i=>{if(i==null)return"";const c=e.getTextValue??"textValue",h=_t(c)?i[c]:c(i);return h!=null?String(h):""},l=i=>{if(i==null)return!1;const c=e.getDisabled??"disabled";return(_t(c)?i[c]:c(i))??!1},a=i=>{var c;if(i!=null)return _t(e.getSectionChildren)?i[e.getSectionChildren]:(c=e.getSectionChildren)==null?void 0:c.call(e,i)};for(const i of e.dataSource){if(_t(i)||Ml(i)){r.push({type:"item",rawValue:i,key:String(i),textValue:String(i),disabled:l(i),level:n,index:t}),t++;continue}if(a(i)!=null){r.push({type:"section",rawValue:i,key:"",textValue:"",disabled:!1,level:n,index:t}),t++;const c=a(i)??[];if(c.length>0){const h=ai({dataSource:c,getKey:e.getKey,getTextValue:e.getTextValue,getDisabled:e.getDisabled,getSectionChildren:e.getSectionChildren,startIndex:t,startLevel:n+1});r.push(...h),t+=h.length}}else r.push({type:"item",rawValue:i,key:o(i),textValue:s(i),disabled:l(i),level:n,index:t}),t++}return r}function ga(e,t=[]){return O(()=>{const n=ai({dataSource:E(e.dataSource),getKey:E(e.getKey),getTextValue:E(e.getTextValue),getDisabled:E(e.getDisabled),getSectionChildren:E(e.getSectionChildren)});for(let r=0;r<t.length;r++)t[r]();return e.factory(n)})}var ha=new Set(["Avst","Arab","Armi","Syrc","Samr","Mand","Thaa","Mend","Nkoo","Adlm","Rohg","Hebr"]),ya=new Set(["ae","ar","arc","bcc","bqi","ckb","dv","fa","glk","he","ku","mzn","nqo","pnb","ps","sd","ug","ur","yi"]);function va(e){if(Intl.Locale){const n=new Intl.Locale(e).maximize().script??"";return ha.has(n)}const t=e.split("-")[0];return ya.has(t)}function ma(e){return va(e)?"rtl":"ltr"}function ui(){let e=typeof navigator<"u"&&(navigator.language||navigator.userLanguage)||"en-US";return{locale:e,direction:ma(e)}}var Jn=ui(),on=new Set;function so(){Jn=ui();for(const e of on)e(Jn)}function ba(){const[e,t]=K(Jn),n=O(()=>e());return Mt(()=>{on.size===0&&window.addEventListener("languagechange",so),on.add(t),G(()=>{on.delete(t),on.size===0&&window.removeEventListener("languagechange",so)})}),{locale:()=>n().locale,direction:()=>n().direction}}var pa=xe();function St(){const e=ba();return $e(pa)||e}var Nn=new Map;function wa(e){const{locale:t}=St(),n=O(()=>t()+(e?Object.entries(e).sort((r,o)=>r[0]<o[0]?-1:1).join():""));return O(()=>{const r=n();let o;return Nn.has(r)&&(o=Nn.get(r)),o||(o=new Intl.Collator(t(),e),Nn.set(r,o)),o})}var ut=class ci extends Set{constructor(n,r,o){super(n);_e(this,"anchorKey");_e(this,"currentKey");n instanceof ci?(this.anchorKey=r||n.anchorKey,this.currentKey=o||n.currentKey):(this.anchorKey=r,this.currentKey=o)}};function xa(e){const[t,n]=fn(e);return[()=>t()??new ut,n]}function di(e){return Pl()?e.altKey:e.ctrlKey}function Rt(e){return Fn()?e.metaKey:e.ctrlKey}function lo(e){return new ut(e)}function $a(e,t){if(e.size!==t.size)return!1;for(const n of e)if(!t.has(n))return!1;return!0}function Ca(e){const t=X({selectionMode:"none",selectionBehavior:"toggle"},e),[n,r]=K(!1),[o,s]=K(),l=O(()=>{const y=E(t.selectedKeys);return y!=null?lo(y):y}),a=O(()=>{const y=E(t.defaultSelectedKeys);return y!=null?lo(y):new ut}),[i,c]=xa({value:l,defaultValue:a,onChange:y=>{var b;return(b=t.onSelectionChange)==null?void 0:b.call(t,y)}}),[h,f]=K(E(t.selectionBehavior)),u=()=>E(t.selectionMode),g=()=>E(t.disallowEmptySelection)??!1,d=y=>{(E(t.allowDuplicateSelectionEvents)||!$a(y,i()))&&c(y)};return H(()=>{const y=i();E(t.selectionBehavior)==="replace"&&h()==="toggle"&&typeof y=="object"&&y.size===0&&f("replace")}),H(()=>{f(E(t.selectionBehavior)??"toggle")}),{selectionMode:u,disallowEmptySelection:g,selectionBehavior:h,setSelectionBehavior:f,isFocused:n,setFocused:r,focusedKey:o,setFocusedKey:s,selectedKeys:i,setSelectedKeys:d}}function Sa(e){const[t,n]=K(""),[r,o]=K(-1);return{typeSelectHandlers:{onKeyDown:l=>{var u;if(E(e.isDisabled))return;const a=E(e.keyboardDelegate),i=E(e.selectionManager);if(!a.getKeyForSearch)return;const c=ka(l.key);if(!c||l.ctrlKey||l.metaKey)return;c===" "&&t().trim().length>0&&(l.preventDefault(),l.stopPropagation());let h=n(g=>g+c),f=a.getKeyForSearch(h,i.focusedKey())??a.getKeyForSearch(h);f==null&&Ea(h)&&(h=h[0],f=a.getKeyForSearch(h,i.focusedKey())??a.getKeyForSearch(h)),f!=null&&(i.setFocusedKey(f),(u=e.onTypeSelect)==null||u.call(e,f)),clearTimeout(r()),o(window.setTimeout(()=>n(""),500))}}}}function ka(e){return e.length===1||!/^[A-Z]/i.test(e)?e:""}function Ea(e){return e.split("").every(t=>t===e[0])}function Da(e,t,n){const o=W({selectOnFocus:()=>E(e.selectionManager).selectionBehavior()==="replace"},e),s=()=>t(),{direction:l}=St();let a={top:0,left:0};Sl(()=>E(o.isVirtualized)?void 0:s(),"scroll",()=>{const b=s();b&&(a={top:b.scrollTop,left:b.scrollLeft})});const{typeSelectHandlers:i}=Sa({isDisabled:()=>E(o.disallowTypeAhead),keyboardDelegate:()=>E(o.keyboardDelegate),selectionManager:()=>E(o.selectionManager)}),c=()=>E(o.orientation)??"vertical",h=b=>{var _,C,A,B,U,ne,Z,se;de(b,i.onKeyDown),b.altKey&&b.key==="Tab"&&b.preventDefault();const m=t();if(!(m!=null&&m.contains(b.target)))return;const p=E(o.selectionManager),w=E(o.selectOnFocus),x=R=>{R!=null&&(p.setFocusedKey(R),b.shiftKey&&p.selectionMode()==="multiple"?p.extendSelection(R):w&&!di(b)&&p.replaceSelection(R))},$=E(o.keyboardDelegate),P=E(o.shouldFocusWrap),F=p.focusedKey();switch(b.key){case(c()==="vertical"?"ArrowDown":"ArrowRight"):{if($.getKeyBelow){b.preventDefault();let R;F!=null?R=$.getKeyBelow(F):R=(_=$.getFirstKey)==null?void 0:_.call($),R==null&&P&&(R=(C=$.getFirstKey)==null?void 0:C.call($,F)),x(R)}break}case(c()==="vertical"?"ArrowUp":"ArrowLeft"):{if($.getKeyAbove){b.preventDefault();let R;F!=null?R=$.getKeyAbove(F):R=(A=$.getLastKey)==null?void 0:A.call($),R==null&&P&&(R=(B=$.getLastKey)==null?void 0:B.call($,F)),x(R)}break}case(c()==="vertical"?"ArrowLeft":"ArrowUp"):{if($.getKeyLeftOf){b.preventDefault();const R=l()==="rtl";let Q;F!=null?Q=$.getKeyLeftOf(F):Q=R?(U=$.getFirstKey)==null?void 0:U.call($):(ne=$.getLastKey)==null?void 0:ne.call($),x(Q)}break}case(c()==="vertical"?"ArrowRight":"ArrowDown"):{if($.getKeyRightOf){b.preventDefault();const R=l()==="rtl";let Q;F!=null?Q=$.getKeyRightOf(F):Q=R?(Z=$.getLastKey)==null?void 0:Z.call($):(se=$.getFirstKey)==null?void 0:se.call($),x(Q)}break}case"Home":if($.getFirstKey){b.preventDefault();const R=$.getFirstKey(F,Rt(b));R!=null&&(p.setFocusedKey(R),Rt(b)&&b.shiftKey&&p.selectionMode()==="multiple"?p.extendSelection(R):w&&p.replaceSelection(R))}break;case"End":if($.getLastKey){b.preventDefault();const R=$.getLastKey(F,Rt(b));R!=null&&(p.setFocusedKey(R),Rt(b)&&b.shiftKey&&p.selectionMode()==="multiple"?p.extendSelection(R):w&&p.replaceSelection(R))}break;case"PageDown":if($.getKeyPageBelow&&F!=null){b.preventDefault();const R=$.getKeyPageBelow(F);x(R)}break;case"PageUp":if($.getKeyPageAbove&&F!=null){b.preventDefault();const R=$.getKeyPageAbove(F);x(R)}break;case"a":Rt(b)&&p.selectionMode()==="multiple"&&E(o.disallowSelectAll)!==!0&&(b.preventDefault(),p.selectAll());break;case"Escape":b.defaultPrevented||(b.preventDefault(),E(o.disallowEmptySelection)||p.clearSelection());break;case"Tab":if(!E(o.allowsTabNavigation)){if(b.shiftKey)m.focus();else{const R=Vl(m,{tabbable:!0});let Q,J;do J=R.lastChild(),J&&(Q=J);while(J);Q&&!Q.contains(document.activeElement)&&De(Q)}break}}},f=b=>{var x,$;const m=E(o.selectionManager),p=E(o.keyboardDelegate),w=E(o.selectOnFocus);if(m.isFocused()){b.currentTarget.contains(b.target)||m.setFocused(!1);return}if(b.currentTarget.contains(b.target)){if(m.setFocused(!0),m.focusedKey()==null){const P=_=>{_!=null&&(m.setFocusedKey(_),w&&m.replaceSelection(_))},F=b.relatedTarget;F&&b.currentTarget.compareDocumentPosition(F)&Node.DOCUMENT_POSITION_FOLLOWING?P(m.lastSelectedKey()??((x=p.getLastKey)==null?void 0:x.call(p))):P(m.firstSelectedKey()??(($=p.getFirstKey)==null?void 0:$.call(p)))}else if(!E(o.isVirtualized)){const P=s();if(P){P.scrollTop=a.top,P.scrollLeft=a.left;const F=P.querySelector(`[data-key="${m.focusedKey()}"]`);F&&(De(F),Zn(P,F))}}}},u=b=>{const m=E(o.selectionManager);b.currentTarget.contains(b.relatedTarget)||m.setFocused(!1)},g=b=>{s()===b.target&&b.preventDefault()},d=()=>{var P,F;const b=E(o.autoFocus);if(!b)return;const m=E(o.selectionManager),p=E(o.keyboardDelegate);let w;b==="first"&&(w=(P=p.getFirstKey)==null?void 0:P.call(p)),b==="last"&&(w=(F=p.getLastKey)==null?void 0:F.call(p));const x=m.selectedKeys();x.size&&(w=x.values().next().value),m.setFocused(!0),m.setFocusedKey(w);const $=t();$&&w==null&&!E(o.shouldUseVirtualFocus)&&De($)};return Mt(()=>{o.deferAutoFocus?setTimeout(d,0):d()}),H(ft([s,()=>E(o.isVirtualized),()=>E(o.selectionManager).focusedKey()],b=>{var x;const[m,p,w]=b;if(p)w&&((x=o.scrollToKey)==null||x.call(o,w));else if(w&&m){const $=m.querySelector(`[data-key="${w}"]`);$&&Zn(m,$)}})),{tabIndex:O(()=>{if(!E(o.shouldUseVirtualFocus))return E(o.selectionManager).focusedKey()==null?0:-1}),onKeyDown:h,onMouseDown:g,onFocusIn:f,onFocusOut:u}}function fi(e,t){const n=()=>E(e.selectionManager),r=()=>E(e.key),o=()=>E(e.shouldUseVirtualFocus),s=p=>{n().selectionMode()!=="none"&&(n().selectionMode()==="single"?n().isSelected(r())&&!n().disallowEmptySelection()?n().toggleSelection(r()):n().replaceSelection(r()):p!=null&&p.shiftKey?n().extendSelection(r()):n().selectionBehavior()==="toggle"||Rt(p)||"pointerType"in p&&p.pointerType==="touch"?n().toggleSelection(r()):n().replaceSelection(r()))},l=()=>n().isSelected(r()),a=()=>E(e.disabled)||n().isDisabled(r()),i=()=>!a()&&n().canSelectItem(r());let c=null;const h=p=>{i()&&(c=p.pointerType,p.pointerType==="mouse"&&p.button===0&&!E(e.shouldSelectOnPressUp)&&s(p))},f=p=>{i()&&p.pointerType==="mouse"&&p.button===0&&E(e.shouldSelectOnPressUp)&&E(e.allowsDifferentPressOrigin)&&s(p)},u=p=>{i()&&(E(e.shouldSelectOnPressUp)&&!E(e.allowsDifferentPressOrigin)||c!=="mouse")&&s(p)},g=p=>{!i()||!["Enter"," "].includes(p.key)||(di(p)?n().toggleSelection(r()):s(p))},d=p=>{a()&&p.preventDefault()},y=p=>{const w=t();o()||a()||!w||p.target===w&&n().setFocusedKey(r())},b=O(()=>{if(!(o()||a()))return r()===n().focusedKey()?0:-1}),m=O(()=>E(e.virtualized)?void 0:r());return H(ft([t,r,o,()=>n().focusedKey(),()=>n().isFocused()],([p,w,x,$,P])=>{p&&w===$&&P&&!x&&document.activeElement!==p&&(e.focus?e.focus():De(p))})),{isSelected:l,isDisabled:a,allowsSelection:i,tabIndex:b,dataKey:m,onPointerDown:h,onPointerUp:f,onClick:u,onKeyDown:g,onMouseDown:d,onFocus:y}}var Aa=class{constructor(e,t){_e(this,"collection");_e(this,"state");this.collection=e,this.state=t}selectionMode(){return this.state.selectionMode()}disallowEmptySelection(){return this.state.disallowEmptySelection()}selectionBehavior(){return this.state.selectionBehavior()}setSelectionBehavior(e){this.state.setSelectionBehavior(e)}isFocused(){return this.state.isFocused()}setFocused(e){this.state.setFocused(e)}focusedKey(){return this.state.focusedKey()}setFocusedKey(e){(e==null||this.collection().getItem(e))&&this.state.setFocusedKey(e)}selectedKeys(){return this.state.selectedKeys()}isSelected(e){if(this.state.selectionMode()==="none")return!1;const t=this.getKey(e);return t==null?!1:this.state.selectedKeys().has(t)}isEmpty(){return this.state.selectedKeys().size===0}isSelectAll(){if(this.isEmpty())return!1;const e=this.state.selectedKeys();return this.getAllSelectableKeys().every(t=>e.has(t))}firstSelectedKey(){let e;for(const t of this.state.selectedKeys()){const n=this.collection().getItem(t),r=(n==null?void 0:n.index)!=null&&(e==null?void 0:e.index)!=null&&n.index<e.index;(!e||r)&&(e=n)}return e==null?void 0:e.key}lastSelectedKey(){let e;for(const t of this.state.selectedKeys()){const n=this.collection().getItem(t),r=(n==null?void 0:n.index)!=null&&(e==null?void 0:e.index)!=null&&n.index>e.index;(!e||r)&&(e=n)}return e==null?void 0:e.key}extendSelection(e){if(this.selectionMode()==="none")return;if(this.selectionMode()==="single"){this.replaceSelection(e);return}const t=this.getKey(e);if(t==null)return;const n=this.state.selectedKeys(),r=n.anchorKey||t,o=new ut(n,r,t);for(const s of this.getKeyRange(r,n.currentKey||t))o.delete(s);for(const s of this.getKeyRange(t,r))this.canSelectItem(s)&&o.add(s);this.state.setSelectedKeys(o)}getKeyRange(e,t){const n=this.collection().getItem(e),r=this.collection().getItem(t);return n&&r?n.index!=null&&r.index!=null&&n.index<=r.index?this.getKeyRangeInternal(e,t):this.getKeyRangeInternal(t,e):[]}getKeyRangeInternal(e,t){const n=[];let r=e;for(;r!=null;){const o=this.collection().getItem(r);if(o&&o.type==="item"&&n.push(r),r===t)return n;r=this.collection().getKeyAfter(r)}return[]}getKey(e){const t=this.collection().getItem(e);return t?!t||t.type!=="item"?null:t.key:e}toggleSelection(e){if(this.selectionMode()==="none")return;if(this.selectionMode()==="single"&&!this.isSelected(e)){this.replaceSelection(e);return}const t=this.getKey(e);if(t==null)return;const n=new ut(this.state.selectedKeys());n.has(t)?n.delete(t):this.canSelectItem(t)&&(n.add(t),n.anchorKey=t,n.currentKey=t),!(this.disallowEmptySelection()&&n.size===0)&&this.state.setSelectedKeys(n)}replaceSelection(e){if(this.selectionMode()==="none")return;const t=this.getKey(e);if(t==null)return;const n=this.canSelectItem(t)?new ut([t],t,t):new ut;this.state.setSelectedKeys(n)}setSelectedKeys(e){if(this.selectionMode()==="none")return;const t=new ut;for(const n of e){const r=this.getKey(n);if(r!=null&&(t.add(r),this.selectionMode()==="single"))break}this.state.setSelectedKeys(t)}selectAll(){this.selectionMode()==="multiple"&&this.state.setSelectedKeys(new Set(this.getAllSelectableKeys()))}clearSelection(){const e=this.state.selectedKeys();!this.disallowEmptySelection()&&e.size>0&&this.state.setSelectedKeys(new ut)}toggleSelectAll(){this.isSelectAll()?this.clearSelection():this.selectAll()}select(e,t){this.selectionMode()!=="none"&&(this.selectionMode()==="single"?this.isSelected(e)&&!this.disallowEmptySelection()?this.toggleSelection(e):this.replaceSelection(e):this.selectionBehavior()==="toggle"||t&&t.pointerType==="touch"?this.toggleSelection(e):this.replaceSelection(e))}isSelectionEqual(e){if(e===this.state.selectedKeys())return!0;const t=this.selectedKeys();if(e.size!==t.size)return!1;for(const n of e)if(!t.has(n))return!1;for(const n of t)if(!e.has(n))return!1;return!0}canSelectItem(e){if(this.state.selectionMode()==="none")return!1;const t=this.collection().getItem(e);return t!=null&&!t.disabled}isDisabled(e){const t=this.collection().getItem(e);return!t||t.disabled}getAllSelectableKeys(){const e=[];return(n=>{for(;n!=null;){if(this.canSelectItem(n)){const r=this.collection().getItem(n);if(!r)continue;r.type==="item"&&e.push(n)}n=this.collection().getKeyAfter(n)}})(this.collection().getFirstKey()),e}},ao=class{constructor(e){_e(this,"keyMap",new Map);_e(this,"iterable");_e(this,"firstKey");_e(this,"lastKey");this.iterable=e;for(const r of e)this.keyMap.set(r.key,r);if(this.keyMap.size===0)return;let t,n=0;for(const[r,o]of this.keyMap)t?(t.nextKey=r,o.prevKey=t.key):(this.firstKey=r,o.prevKey=void 0),o.type==="item"&&(o.index=n++),t=o,t.nextKey=void 0;this.lastKey=t.key}*[Symbol.iterator](){yield*this.iterable}getSize(){return this.keyMap.size}getKeys(){return this.keyMap.keys()}getKeyBefore(e){var t;return(t=this.keyMap.get(e))==null?void 0:t.prevKey}getKeyAfter(e){var t;return(t=this.keyMap.get(e))==null?void 0:t.nextKey}getFirstKey(){return this.firstKey}getLastKey(){return this.lastKey}getItem(e){return this.keyMap.get(e)}at(e){const t=[...this.getKeys()];return this.getItem(t[e])}};function Ma(e){const t=Ca(e),r=ga({dataSource:()=>E(e.dataSource),getKey:()=>E(e.getKey),getTextValue:()=>E(e.getTextValue),getDisabled:()=>E(e.getDisabled),getSectionChildren:()=>E(e.getSectionChildren),factory:s=>e.filter?new ao(e.filter(s)):new ao(s)},[()=>e.filter]),o=new Aa(r,t);return Rs(()=>{const s=t.focusedKey();s!=null&&!r().getItem(s)&&t.setFocusedKey(void 0)}),{collection:r,selectionManager:()=>o}}var Ee=e=>typeof e=="function"?e():e,Ta=e=>{const t=O(()=>{const l=Ee(e.element);if(l)return getComputedStyle(l)}),n=()=>{var l;return((l=t())==null?void 0:l.animationName)??"none"},[r,o]=K(Ee(e.show)?"present":"hidden");let s="none";return H(l=>{const a=Ee(e.show);return Bt(()=>{var h;if(l===a)return a;const i=s,c=n();a?o("present"):c==="none"||((h=t())==null?void 0:h.display)==="none"?o("hidden"):o(l===!0&&i!==c?"hiding":"hidden")}),a}),H(()=>{const l=Ee(e.element);if(!l)return;const a=c=>{c.target===l&&(s=n())},i=c=>{const f=n().includes(c.animationName);c.target===l&&f&&r()==="hiding"&&o("hidden")};l.addEventListener("animationstart",a),l.addEventListener("animationcancel",i),l.addEventListener("animationend",i),G(()=>{l.removeEventListener("animationstart",a),l.removeEventListener("animationcancel",i),l.removeEventListener("animationend",i)})}),{present:()=>r()==="present"||r()==="hiding",state:r}},Fa=Ta,gi=Fa,Cn="data-kb-top-layer",hi,er=!1,gt=[];function sn(e){return gt.findIndex(t=>t.node===e)}function Ia(e){return gt[sn(e)]}function La(e){return gt[gt.length-1].node===e}function yi(){return gt.filter(e=>e.isPointerBlocking)}function Oa(){return[...yi()].slice(-1)[0]}function gr(){return yi().length>0}function vi(e){var n;const t=sn((n=Oa())==null?void 0:n.node);return sn(e)<t}function Pa(e){gt.push(e)}function qa(e){const t=sn(e);t<0||gt.splice(t,1)}function _a(){for(const{node:e}of gt)e.style.pointerEvents=vi(e)?"none":"auto"}function Ra(e){if(gr()&&!er){const t=Je(e);hi=document.body.style.pointerEvents,t.body.style.pointerEvents="none",er=!0}}function za(e){if(gr())return;const t=Je(e);t.body.style.pointerEvents=hi,t.body.style.length===0&&t.body.removeAttribute("style"),er=!1}var Ie={layers:gt,isTopMostLayer:La,hasPointerBlockingLayer:gr,isBelowPointerBlockingLayer:vi,addLayer:Pa,removeLayer:qa,indexOf:sn,find:Ia,assignPointerEventToLayers:_a,disableBodyPointerEvents:Ra,restoreBodyPointerEvents:za},Ka={};Ln(Ka,{Button:()=>Ha,Root:()=>hr});var Ba=["button","color","file","image","reset","submit"];function Na(e){const t=e.tagName.toLowerCase();return t==="button"?!0:t==="input"&&e.type?Ba.indexOf(e.type)!==-1:!1}function hr(e){let t;const n=X({type:"button"},e),[r,o]=oe(n,["ref","type","disabled"]),s=In(()=>t,()=>"button"),l=O(()=>{const c=s();return c==null?!1:Na({tagName:c,type:r.type})}),a=O(()=>s()==="input"),i=O(()=>s()==="a"&&(t==null?void 0:t.getAttribute("href"))!=null);return v(fe,W({as:"button",ref(c){const h=Me(f=>t=f,r.ref);typeof h=="function"&&h(c)},get type(){return l()||a()?r.type:void 0},get role(){return!l()&&!i()?"button":void 0},get tabIndex(){return!l()&&!i()&&!r.disabled?0:void 0},get disabled(){return l()||a()?r.disabled:void 0},get"aria-disabled"(){return!l()&&!a()&&r.disabled?!0:void 0},get"data-disabled"(){return r.disabled?"":void 0}},o))}var Ha=hr,Ua=["top","right","bottom","left"],Ze=Math.min,Oe=Math.max,Sn=Math.round,pn=Math.floor,xt=e=>({x:e,y:e}),Va={left:"right",right:"left",bottom:"top",top:"bottom"},Ga={start:"end",end:"start"};function tr(e,t,n){return Oe(e,Ze(t,n))}function It(e,t){return typeof e=="function"?e(t):e}function $t(e){return e.split("-")[0]}function Vt(e){return e.split("-")[1]}function mi(e){return e==="x"?"y":"x"}function yr(e){return e==="y"?"height":"width"}function Tt(e){return["top","bottom"].includes($t(e))?"y":"x"}function vr(e){return mi(Tt(e))}function ja(e,t,n){n===void 0&&(n=!1);const r=Vt(e),o=vr(e),s=yr(o);let l=o==="x"?r===(n?"end":"start")?"right":"left":r==="start"?"bottom":"top";return t.reference[s]>t.floating[s]&&(l=kn(l)),[l,kn(l)]}function Wa(e){const t=kn(e);return[nr(e),t,nr(t)]}function nr(e){return e.replace(/start|end/g,t=>Ga[t])}function Qa(e,t,n){const r=["left","right"],o=["right","left"],s=["top","bottom"],l=["bottom","top"];switch(e){case"top":case"bottom":return n?t?o:r:t?r:o;case"left":case"right":return t?s:l;default:return[]}}function Ya(e,t,n,r){const o=Vt(e);let s=Qa($t(e),n==="start",r);return o&&(s=s.map(l=>l+"-"+o),t&&(s=s.concat(s.map(nr)))),s}function kn(e){return e.replace(/left|right|bottom|top/g,t=>Va[t])}function Xa(e){return{top:0,right:0,bottom:0,left:0,...e}}function bi(e){return typeof e!="number"?Xa(e):{top:e,right:e,bottom:e,left:e}}function En(e){const{x:t,y:n,width:r,height:o}=e;return{width:r,height:o,top:n,left:t,right:t+r,bottom:n+o,x:t,y:n}}function uo(e,t,n){let{reference:r,floating:o}=e;const s=Tt(t),l=vr(t),a=yr(l),i=$t(t),c=s==="y",h=r.x+r.width/2-o.width/2,f=r.y+r.height/2-o.height/2,u=r[a]/2-o[a]/2;let g;switch(i){case"top":g={x:h,y:r.y-o.height};break;case"bottom":g={x:h,y:r.y+r.height};break;case"right":g={x:r.x+r.width,y:f};break;case"left":g={x:r.x-o.width,y:f};break;default:g={x:r.x,y:r.y}}switch(Vt(t)){case"start":g[l]-=u*(n&&c?-1:1);break;case"end":g[l]+=u*(n&&c?-1:1);break}return g}var Za=async(e,t,n)=>{const{placement:r="bottom",strategy:o="absolute",middleware:s=[],platform:l}=n,a=s.filter(Boolean),i=await(l.isRTL==null?void 0:l.isRTL(t));let c=await l.getElementRects({reference:e,floating:t,strategy:o}),{x:h,y:f}=uo(c,r,i),u=r,g={},d=0;for(let y=0;y<a.length;y++){const{name:b,fn:m}=a[y],{x:p,y:w,data:x,reset:$}=await m({x:h,y:f,initialPlacement:r,placement:u,strategy:o,middlewareData:g,rects:c,platform:l,elements:{reference:e,floating:t}});h=p??h,f=w??f,g={...g,[b]:{...g[b],...x}},$&&d<=50&&(d++,typeof $=="object"&&($.placement&&(u=$.placement),$.rects&&(c=$.rects===!0?await l.getElementRects({reference:e,floating:t,strategy:o}):$.rects),{x:h,y:f}=uo(c,u,i)),y=-1)}return{x:h,y:f,placement:u,strategy:o,middlewareData:g}};async function ln(e,t){var n;t===void 0&&(t={});const{x:r,y:o,platform:s,rects:l,elements:a,strategy:i}=e,{boundary:c="clippingAncestors",rootBoundary:h="viewport",elementContext:f="floating",altBoundary:u=!1,padding:g=0}=It(t,e),d=bi(g),b=a[u?f==="floating"?"reference":"floating":f],m=En(await s.getClippingRect({element:(n=await(s.isElement==null?void 0:s.isElement(b)))==null||n?b:b.contextElement||await(s.getDocumentElement==null?void 0:s.getDocumentElement(a.floating)),boundary:c,rootBoundary:h,strategy:i})),p=f==="floating"?{x:r,y:o,width:l.floating.width,height:l.floating.height}:l.reference,w=await(s.getOffsetParent==null?void 0:s.getOffsetParent(a.floating)),x=await(s.isElement==null?void 0:s.isElement(w))?await(s.getScale==null?void 0:s.getScale(w))||{x:1,y:1}:{x:1,y:1},$=En(s.convertOffsetParentRelativeRectToViewportRelativeRect?await s.convertOffsetParentRelativeRectToViewportRelativeRect({elements:a,rect:p,offsetParent:w,strategy:i}):p);return{top:(m.top-$.top+d.top)/x.y,bottom:($.bottom-m.bottom+d.bottom)/x.y,left:(m.left-$.left+d.left)/x.x,right:($.right-m.right+d.right)/x.x}}var Ja=e=>({name:"arrow",options:e,async fn(t){const{x:n,y:r,placement:o,rects:s,platform:l,elements:a,middlewareData:i}=t,{element:c,padding:h=0}=It(e,t)||{};if(c==null)return{};const f=bi(h),u={x:n,y:r},g=vr(o),d=yr(g),y=await l.getDimensions(c),b=g==="y",m=b?"top":"left",p=b?"bottom":"right",w=b?"clientHeight":"clientWidth",x=s.reference[d]+s.reference[g]-u[g]-s.floating[d],$=u[g]-s.reference[g],P=await(l.getOffsetParent==null?void 0:l.getOffsetParent(c));let F=P?P[w]:0;(!F||!await(l.isElement==null?void 0:l.isElement(P)))&&(F=a.floating[w]||s.floating[d]);const _=x/2-$/2,C=F/2-y[d]/2-1,A=Ze(f[m],C),B=Ze(f[p],C),U=A,ne=F-y[d]-B,Z=F/2-y[d]/2+_,se=tr(U,Z,ne),R=!i.arrow&&Vt(o)!=null&&Z!==se&&s.reference[d]/2-(Z<U?A:B)-y[d]/2<0,Q=R?Z<U?Z-U:Z-ne:0;return{[g]:u[g]+Q,data:{[g]:se,centerOffset:Z-se-Q,...R&&{alignmentOffset:Q}},reset:R}}}),eu=function(e){return e===void 0&&(e={}),{name:"flip",options:e,async fn(t){var n,r;const{placement:o,middlewareData:s,rects:l,initialPlacement:a,platform:i,elements:c}=t,{mainAxis:h=!0,crossAxis:f=!0,fallbackPlacements:u,fallbackStrategy:g="bestFit",fallbackAxisSideDirection:d="none",flipAlignment:y=!0,...b}=It(e,t);if((n=s.arrow)!=null&&n.alignmentOffset)return{};const m=$t(o),p=Tt(a),w=$t(a)===a,x=await(i.isRTL==null?void 0:i.isRTL(c.floating)),$=u||(w||!y?[kn(a)]:Wa(a)),P=d!=="none";!u&&P&&$.push(...Ya(a,y,d,x));const F=[a,...$],_=await ln(t,b),C=[];let A=((r=s.flip)==null?void 0:r.overflows)||[];if(h&&C.push(_[m]),f){const Z=ja(o,l,x);C.push(_[Z[0]],_[Z[1]])}if(A=[...A,{placement:o,overflows:C}],!C.every(Z=>Z<=0)){var B,U;const Z=(((B=s.flip)==null?void 0:B.index)||0)+1,se=F[Z];if(se)return{data:{index:Z,overflows:A},reset:{placement:se}};let R=(U=A.filter(Q=>Q.overflows[0]<=0).sort((Q,J)=>Q.overflows[1]-J.overflows[1])[0])==null?void 0:U.placement;if(!R)switch(g){case"bestFit":{var ne;const Q=(ne=A.filter(J=>{if(P){const ue=Tt(J.placement);return ue===p||ue==="y"}return!0}).map(J=>[J.placement,J.overflows.filter(ue=>ue>0).reduce((ue,ve)=>ue+ve,0)]).sort((J,ue)=>J[1]-ue[1])[0])==null?void 0:ne[0];Q&&(R=Q);break}case"initialPlacement":R=a;break}if(o!==R)return{reset:{placement:R}}}return{}}}};function co(e,t){return{top:e.top-t.height,right:e.right-t.width,bottom:e.bottom-t.height,left:e.left-t.width}}function fo(e){return Ua.some(t=>e[t]>=0)}var tu=function(e){return e===void 0&&(e={}),{name:"hide",options:e,async fn(t){const{rects:n}=t,{strategy:r="referenceHidden",...o}=It(e,t);switch(r){case"referenceHidden":{const s=await ln(t,{...o,elementContext:"reference"}),l=co(s,n.reference);return{data:{referenceHiddenOffsets:l,referenceHidden:fo(l)}}}case"escaped":{const s=await ln(t,{...o,altBoundary:!0}),l=co(s,n.floating);return{data:{escapedOffsets:l,escaped:fo(l)}}}default:return{}}}}};async function nu(e,t){const{placement:n,platform:r,elements:o}=e,s=await(r.isRTL==null?void 0:r.isRTL(o.floating)),l=$t(n),a=Vt(n),i=Tt(n)==="y",c=["left","top"].includes(l)?-1:1,h=s&&i?-1:1,f=It(t,e);let{mainAxis:u,crossAxis:g,alignmentAxis:d}=typeof f=="number"?{mainAxis:f,crossAxis:0,alignmentAxis:null}:{mainAxis:0,crossAxis:0,alignmentAxis:null,...f};return a&&typeof d=="number"&&(g=a==="end"?d*-1:d),i?{x:g*h,y:u*c}:{x:u*c,y:g*h}}var ru=function(e){return e===void 0&&(e=0),{name:"offset",options:e,async fn(t){var n,r;const{x:o,y:s,placement:l,middlewareData:a}=t,i=await nu(t,e);return l===((n=a.offset)==null?void 0:n.placement)&&(r=a.arrow)!=null&&r.alignmentOffset?{}:{x:o+i.x,y:s+i.y,data:{...i,placement:l}}}}},ou=function(e){return e===void 0&&(e={}),{name:"shift",options:e,async fn(t){const{x:n,y:r,placement:o}=t,{mainAxis:s=!0,crossAxis:l=!1,limiter:a={fn:b=>{let{x:m,y:p}=b;return{x:m,y:p}}},...i}=It(e,t),c={x:n,y:r},h=await ln(t,i),f=Tt($t(o)),u=mi(f);let g=c[u],d=c[f];if(s){const b=u==="y"?"top":"left",m=u==="y"?"bottom":"right",p=g+h[b],w=g-h[m];g=tr(p,g,w)}if(l){const b=f==="y"?"top":"left",m=f==="y"?"bottom":"right",p=d+h[b],w=d-h[m];d=tr(p,d,w)}const y=a.fn({...t,[u]:g,[f]:d});return{...y,data:{x:y.x-n,y:y.y-r}}}}},iu=function(e){return e===void 0&&(e={}),{name:"size",options:e,async fn(t){const{placement:n,rects:r,platform:o,elements:s}=t,{apply:l=()=>{},...a}=It(e,t),i=await ln(t,a),c=$t(n),h=Vt(n),f=Tt(n)==="y",{width:u,height:g}=r.floating;let d,y;c==="top"||c==="bottom"?(d=c,y=h===(await(o.isRTL==null?void 0:o.isRTL(s.floating))?"start":"end")?"left":"right"):(y=c,d=h==="end"?"top":"bottom");const b=g-i.top-i.bottom,m=u-i.left-i.right,p=Ze(g-i[d],b),w=Ze(u-i[y],m),x=!t.middlewareData.shift;let $=p,P=w;if(f?P=h||x?Ze(w,m):m:$=h||x?Ze(p,b):b,x&&!h){const _=Oe(i.left,0),C=Oe(i.right,0),A=Oe(i.top,0),B=Oe(i.bottom,0);f?P=u-2*(_!==0||C!==0?_+C:Oe(i.left,i.right)):$=g-2*(A!==0||B!==0?A+B:Oe(i.top,i.bottom))}await l({...t,availableWidth:P,availableHeight:$});const F=await o.getDimensions(s.floating);return u!==F.width||g!==F.height?{reset:{rects:!0}}:{}}}};function Gt(e){return pi(e)?(e.nodeName||"").toLowerCase():"#document"}function Pe(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function ht(e){var t;return(t=(pi(e)?e.ownerDocument:e.document)||window.document)==null?void 0:t.documentElement}function pi(e){return e instanceof Node||e instanceof Pe(e).Node}function Ge(e){return e instanceof Element||e instanceof Pe(e).Element}function et(e){return e instanceof HTMLElement||e instanceof Pe(e).HTMLElement}function go(e){return typeof ShadowRoot>"u"?!1:e instanceof ShadowRoot||e instanceof Pe(e).ShadowRoot}function gn(e){const{overflow:t,overflowX:n,overflowY:r,display:o}=je(e);return/auto|scroll|overlay|hidden|clip/.test(t+r+n)&&!["inline","contents"].includes(o)}function su(e){return["table","td","th"].includes(Gt(e))}function On(e){return[":popover-open",":modal"].some(t=>{try{return e.matches(t)}catch{return!1}})}function mr(e){const t=br(),n=Ge(e)?je(e):e;return n.transform!=="none"||n.perspective!=="none"||(n.containerType?n.containerType!=="normal":!1)||!t&&(n.backdropFilter?n.backdropFilter!=="none":!1)||!t&&(n.filter?n.filter!=="none":!1)||["transform","perspective","filter"].some(r=>(n.willChange||"").includes(r))||["paint","layout","strict","content"].some(r=>(n.contain||"").includes(r))}function lu(e){let t=Ct(e);for(;et(t)&&!Ut(t);){if(mr(t))return t;if(On(t))return null;t=Ct(t)}return null}function br(){return typeof CSS>"u"||!CSS.supports?!1:CSS.supports("-webkit-backdrop-filter","none")}function Ut(e){return["html","body","#document"].includes(Gt(e))}function je(e){return Pe(e).getComputedStyle(e)}function Pn(e){return Ge(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function Ct(e){if(Gt(e)==="html")return e;const t=e.assignedSlot||e.parentNode||go(e)&&e.host||ht(e);return go(t)?t.host:t}function wi(e){const t=Ct(e);return Ut(t)?e.ownerDocument?e.ownerDocument.body:e.body:et(t)&&gn(t)?t:wi(t)}function an(e,t,n){var r;t===void 0&&(t=[]),n===void 0&&(n=!0);const o=wi(e),s=o===((r=e.ownerDocument)==null?void 0:r.body),l=Pe(o);return s?t.concat(l,l.visualViewport||[],gn(o)?o:[],l.frameElement&&n?an(l.frameElement):[]):t.concat(o,an(o,[],n))}function xi(e){const t=je(e);let n=parseFloat(t.width)||0,r=parseFloat(t.height)||0;const o=et(e),s=o?e.offsetWidth:n,l=o?e.offsetHeight:r,a=Sn(n)!==s||Sn(r)!==l;return a&&(n=s,r=l),{width:n,height:r,$:a}}function pr(e){return Ge(e)?e:e.contextElement}function Nt(e){const t=pr(e);if(!et(t))return xt(1);const n=t.getBoundingClientRect(),{width:r,height:o,$:s}=xi(t);let l=(s?Sn(n.width):n.width)/r,a=(s?Sn(n.height):n.height)/o;return(!l||!Number.isFinite(l))&&(l=1),(!a||!Number.isFinite(a))&&(a=1),{x:l,y:a}}var au=xt(0);function $i(e){const t=Pe(e);return!br()||!t.visualViewport?au:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function uu(e,t,n){return t===void 0&&(t=!1),!n||t&&n!==Pe(e)?!1:t}function Ft(e,t,n,r){t===void 0&&(t=!1),n===void 0&&(n=!1);const o=e.getBoundingClientRect(),s=pr(e);let l=xt(1);t&&(r?Ge(r)&&(l=Nt(r)):l=Nt(e));const a=uu(s,n,r)?$i(s):xt(0);let i=(o.left+a.x)/l.x,c=(o.top+a.y)/l.y,h=o.width/l.x,f=o.height/l.y;if(s){const u=Pe(s),g=r&&Ge(r)?Pe(r):r;let d=u,y=d.frameElement;for(;y&&r&&g!==d;){const b=Nt(y),m=y.getBoundingClientRect(),p=je(y),w=m.left+(y.clientLeft+parseFloat(p.paddingLeft))*b.x,x=m.top+(y.clientTop+parseFloat(p.paddingTop))*b.y;i*=b.x,c*=b.y,h*=b.x,f*=b.y,i+=w,c+=x,d=Pe(y),y=d.frameElement}}return En({width:h,height:f,x:i,y:c})}function cu(e){let{elements:t,rect:n,offsetParent:r,strategy:o}=e;const s=o==="fixed",l=ht(r),a=t?On(t.floating):!1;if(r===l||a&&s)return n;let i={scrollLeft:0,scrollTop:0},c=xt(1);const h=xt(0),f=et(r);if((f||!f&&!s)&&((Gt(r)!=="body"||gn(l))&&(i=Pn(r)),et(r))){const u=Ft(r);c=Nt(r),h.x=u.x+r.clientLeft,h.y=u.y+r.clientTop}return{width:n.width*c.x,height:n.height*c.y,x:n.x*c.x-i.scrollLeft*c.x+h.x,y:n.y*c.y-i.scrollTop*c.y+h.y}}function du(e){return Array.from(e.getClientRects())}function Ci(e){return Ft(ht(e)).left+Pn(e).scrollLeft}function fu(e){const t=ht(e),n=Pn(e),r=e.ownerDocument.body,o=Oe(t.scrollWidth,t.clientWidth,r.scrollWidth,r.clientWidth),s=Oe(t.scrollHeight,t.clientHeight,r.scrollHeight,r.clientHeight);let l=-n.scrollLeft+Ci(e);const a=-n.scrollTop;return je(r).direction==="rtl"&&(l+=Oe(t.clientWidth,r.clientWidth)-o),{width:o,height:s,x:l,y:a}}function gu(e,t){const n=Pe(e),r=ht(e),o=n.visualViewport;let s=r.clientWidth,l=r.clientHeight,a=0,i=0;if(o){s=o.width,l=o.height;const c=br();(!c||c&&t==="fixed")&&(a=o.offsetLeft,i=o.offsetTop)}return{width:s,height:l,x:a,y:i}}function hu(e,t){const n=Ft(e,!0,t==="fixed"),r=n.top+e.clientTop,o=n.left+e.clientLeft,s=et(e)?Nt(e):xt(1),l=e.clientWidth*s.x,a=e.clientHeight*s.y,i=o*s.x,c=r*s.y;return{width:l,height:a,x:i,y:c}}function ho(e,t,n){let r;if(t==="viewport")r=gu(e,n);else if(t==="document")r=fu(ht(e));else if(Ge(t))r=hu(t,n);else{const o=$i(e);r={...t,x:t.x-o.x,y:t.y-o.y}}return En(r)}function Si(e,t){const n=Ct(e);return n===t||!Ge(n)||Ut(n)?!1:je(n).position==="fixed"||Si(n,t)}function yu(e,t){const n=t.get(e);if(n)return n;let r=an(e,[],!1).filter(a=>Ge(a)&&Gt(a)!=="body"),o=null;const s=je(e).position==="fixed";let l=s?Ct(e):e;for(;Ge(l)&&!Ut(l);){const a=je(l),i=mr(l);!i&&a.position==="fixed"&&(o=null),(s?!i&&!o:!i&&a.position==="static"&&!!o&&["absolute","fixed"].includes(o.position)||gn(l)&&!i&&Si(e,l))?r=r.filter(h=>h!==l):o=a,l=Ct(l)}return t.set(e,r),r}function vu(e){let{element:t,boundary:n,rootBoundary:r,strategy:o}=e;const l=[...n==="clippingAncestors"?On(t)?[]:yu(t,this._c):[].concat(n),r],a=l[0],i=l.reduce((c,h)=>{const f=ho(t,h,o);return c.top=Oe(f.top,c.top),c.right=Ze(f.right,c.right),c.bottom=Ze(f.bottom,c.bottom),c.left=Oe(f.left,c.left),c},ho(t,a,o));return{width:i.right-i.left,height:i.bottom-i.top,x:i.left,y:i.top}}function mu(e){const{width:t,height:n}=xi(e);return{width:t,height:n}}function bu(e,t,n){const r=et(t),o=ht(t),s=n==="fixed",l=Ft(e,!0,s,t);let a={scrollLeft:0,scrollTop:0};const i=xt(0);if(r||!r&&!s)if((Gt(t)!=="body"||gn(o))&&(a=Pn(t)),r){const f=Ft(t,!0,s,t);i.x=f.x+t.clientLeft,i.y=f.y+t.clientTop}else o&&(i.x=Ci(o));const c=l.left+a.scrollLeft-i.x,h=l.top+a.scrollTop-i.y;return{x:c,y:h,width:l.width,height:l.height}}function Hn(e){return je(e).position==="static"}function yo(e,t){return!et(e)||je(e).position==="fixed"?null:t?t(e):e.offsetParent}function ki(e,t){const n=Pe(e);if(On(e))return n;if(!et(e)){let o=Ct(e);for(;o&&!Ut(o);){if(Ge(o)&&!Hn(o))return o;o=Ct(o)}return n}let r=yo(e,t);for(;r&&su(r)&&Hn(r);)r=yo(r,t);return r&&Ut(r)&&Hn(r)&&!mr(r)?n:r||lu(e)||n}var pu=async function(e){const t=this.getOffsetParent||ki,n=this.getDimensions,r=await n(e.floating);return{reference:bu(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:r.width,height:r.height}}};function wu(e){return je(e).direction==="rtl"}var Ei={convertOffsetParentRelativeRectToViewportRelativeRect:cu,getDocumentElement:ht,getClippingRect:vu,getOffsetParent:ki,getElementRects:pu,getClientRects:du,getDimensions:mu,getScale:Nt,isElement:Ge,isRTL:wu};function xu(e,t){let n=null,r;const o=ht(e);function s(){var a;clearTimeout(r),(a=n)==null||a.disconnect(),n=null}function l(a,i){a===void 0&&(a=!1),i===void 0&&(i=1),s();const{left:c,top:h,width:f,height:u}=e.getBoundingClientRect();if(a||t(),!f||!u)return;const g=pn(h),d=pn(o.clientWidth-(c+f)),y=pn(o.clientHeight-(h+u)),b=pn(c),p={rootMargin:-g+"px "+-d+"px "+-y+"px "+-b+"px",threshold:Oe(0,Ze(1,i))||1};let w=!0;function x($){const P=$[0].intersectionRatio;if(P!==i){if(!w)return l();P?l(!1,P):r=setTimeout(()=>{l(!1,1e-7)},1e3)}w=!1}try{n=new IntersectionObserver(x,{...p,root:o.ownerDocument})}catch{n=new IntersectionObserver(x,p)}n.observe(e)}return l(!0),s}function $u(e,t,n,r){r===void 0&&(r={});const{ancestorScroll:o=!0,ancestorResize:s=!0,elementResize:l=typeof ResizeObserver=="function",layoutShift:a=typeof IntersectionObserver=="function",animationFrame:i=!1}=r,c=pr(e),h=o||s?[...c?an(c):[],...an(t)]:[];h.forEach(m=>{o&&m.addEventListener("scroll",n,{passive:!0}),s&&m.addEventListener("resize",n)});const f=c&&a?xu(c,n):null;let u=-1,g=null;l&&(g=new ResizeObserver(m=>{let[p]=m;p&&p.target===c&&g&&(g.unobserve(t),cancelAnimationFrame(u),u=requestAnimationFrame(()=>{var w;(w=g)==null||w.observe(t)})),n()}),c&&!i&&g.observe(c),g.observe(t));let d,y=i?Ft(e):null;i&&b();function b(){const m=Ft(e);y&&(m.x!==y.x||m.y!==y.y||m.width!==y.width||m.height!==y.height)&&n(),y=m,d=requestAnimationFrame(b)}return n(),()=>{var m;h.forEach(p=>{o&&p.removeEventListener("scroll",n),s&&p.removeEventListener("resize",n)}),f==null||f(),(m=g)==null||m.disconnect(),g=null,i&&cancelAnimationFrame(d)}}var Cu=ru,Su=ou,ku=eu,Eu=iu,Du=tu,Au=Ja,Mu=(e,t,n)=>{const r=new Map,o={platform:Ei,...n},s={...o.platform,_c:r};return Za(e,t,{...o,platform:s})},wr=xe();function xr(){const e=$e(wr);if(e===void 0)throw new Error("[kobalte]: `usePopperContext` must be used within a `Popper` component");return e}var Tu=q('<svg display="block" viewBox="0 0 30 30" style="transform:scale(1.02)"><g><path fill="none" d="M23,27.8c1.1,1.2,3.4,2.2,5,2.2h2H0h2c1.7,0,3.9-1,5-2.2l6.6-7.2c0.7-0.8,2-0.8,2.7,0L23,27.8L23,27.8z"></path><path stroke="none" d="M23,27.8c1.1,1.2,3.4,2.2,5,2.2h2H0h2c1.7,0,3.9-1,5-2.2l6.6-7.2c0.7-0.8,2-0.8,2.7,0L23,27.8L23,27.8z">'),rr=30,vo=rr/2,Fu={top:180,right:-90,bottom:0,left:90};function $r(e){const t=xr(),n=X({size:rr},e),[r,o]=oe(n,["ref","style","size"]),s=()=>t.currentPlacement().split("-")[0],l=Iu(t.contentRef),a=()=>{var u;return((u=l())==null?void 0:u.getPropertyValue("background-color"))||"none"},i=()=>{var u;return((u=l())==null?void 0:u.getPropertyValue(`border-${s()}-color`))||"none"},c=()=>{var u;return((u=l())==null?void 0:u.getPropertyValue(`border-${s()}-width`))||"0px"},h=()=>Number.parseInt(c())*2*(rr/r.size),f=()=>`rotate(${Fu[s()]} ${vo} ${vo}) translate(0 2)`;return v(fe,W({as:"div",ref(u){const g=Me(t.setArrowRef,r.ref);typeof g=="function"&&g(u)},"aria-hidden":"true",get style(){return Tn({position:"absolute","font-size":`${r.size}px`,width:"1em",height:"1em","pointer-events":"none",fill:a(),stroke:i(),"stroke-width":h()},r.style)}},o,{get children(){const u=Tu(),g=u.firstChild;return V(()=>M(g,"transform",f())),u}}))}function Iu(e){const[t,n]=K();return H(()=>{const r=e();r&&n(Fl(r).getComputedStyle(r))}),t}function Lu(e){const t=xr(),[n,r]=oe(e,["ref","style"]);return v(fe,W({as:"div",ref(o){const s=Me(t.setPositionerRef,n.ref);typeof s=="function"&&s(o)},"data-popper-positioner":"",get style(){return Tn({position:"absolute",top:0,left:0,"min-width":"max-content"},n.style)}},r))}function mo(e){const{x:t=0,y:n=0,width:r=0,height:o=0}=e??{};if(typeof DOMRect=="function")return new DOMRect(t,n,r,o);const s={x:t,y:n,width:r,height:o,top:n,right:t+r,bottom:n+o,left:t};return{...s,toJSON:()=>s}}function Ou(e,t){return{contextElement:e,getBoundingClientRect:()=>{const r=t(e);return r?mo(r):e?e.getBoundingClientRect():mo()}}}function Pu(e){return/^(?:top|bottom|left|right)(?:-(?:start|end))?$/.test(e)}var qu={top:"bottom",right:"left",bottom:"top",left:"right"};function _u(e,t){const[n,r]=e.split("-"),o=qu[n];return r?n==="left"||n==="right"?`${o} ${r==="start"?"top":"bottom"}`:r==="start"?`${o} ${t==="rtl"?"right":"left"}`:`${o} ${t==="rtl"?"left":"right"}`:`${o} center`}function Ru(e){const t=X({getAnchorRect:u=>u==null?void 0:u.getBoundingClientRect(),placement:"bottom",gutter:0,shift:0,flip:!0,slide:!0,overlap:!1,sameWidth:!1,fitViewport:!1,hideWhenDetached:!1,detachedPadding:0,arrowPadding:4,overflowPadding:8},e),[n,r]=K(),[o,s]=K(),[l,a]=K(t.placement),i=()=>{var u;return Ou((u=t.anchorRef)==null?void 0:u.call(t),t.getAnchorRect)},{direction:c}=St();async function h(){var P,F;const u=i(),g=n(),d=o();if(!u||!g)return;const y=((d==null?void 0:d.clientHeight)||0)/2,b=typeof t.gutter=="number"?t.gutter+y:t.gutter??y;g.style.setProperty("--kb-popper-content-overflow-padding",`${t.overflowPadding}px`),u.getBoundingClientRect();const m=[Cu(({placement:_})=>{const C=!!_.split("-")[1];return{mainAxis:b,crossAxis:C?void 0:t.shift,alignmentAxis:t.shift}})];if(t.flip!==!1){const _=typeof t.flip=="string"?t.flip.split(" "):void 0;if(_!==void 0&&!_.every(Pu))throw new Error("`flip` expects a spaced-delimited list of placements");m.push(ku({padding:t.overflowPadding,fallbackPlacements:_}))}(t.slide||t.overlap)&&m.push(Su({mainAxis:t.slide,crossAxis:t.overlap,padding:t.overflowPadding})),m.push(Eu({padding:t.overflowPadding,apply({availableWidth:_,availableHeight:C,rects:A}){const B=Math.round(A.reference.width);_=Math.floor(_),C=Math.floor(C),g.style.setProperty("--kb-popper-anchor-width",`${B}px`),g.style.setProperty("--kb-popper-content-available-width",`${_}px`),g.style.setProperty("--kb-popper-content-available-height",`${C}px`),t.sameWidth&&(g.style.width=`${B}px`),t.fitViewport&&(g.style.maxWidth=`${_}px`,g.style.maxHeight=`${C}px`)}})),t.hideWhenDetached&&m.push(Du({padding:t.detachedPadding})),d&&m.push(Au({element:d,padding:t.arrowPadding}));const p=await Mu(u,g,{placement:t.placement,strategy:"absolute",middleware:m,platform:{...Ei,isRTL:()=>c()==="rtl"}});if(a(p.placement),(P=t.onCurrentPlacementChange)==null||P.call(t,p.placement),!g)return;g.style.setProperty("--kb-popper-content-transform-origin",_u(p.placement,c()));const w=Math.round(p.x),x=Math.round(p.y);let $;if(t.hideWhenDetached&&($=(F=p.middlewareData.hide)!=null&&F.referenceHidden?"hidden":"visible"),Object.assign(g.style,{top:"0",left:"0",transform:`translate3d(${w}px, ${x}px, 0)`,visibility:$}),d&&p.middlewareData.arrow){const{x:_,y:C}=p.middlewareData.arrow,A=p.placement.split("-")[0];Object.assign(d.style,{left:_!=null?`${_}px`:"",top:C!=null?`${C}px`:"",[A]:"100%"})}}H(()=>{const u=i(),g=n();if(!u||!g)return;const d=$u(u,g,h,{elementResize:typeof ResizeObserver=="function"});G(d)}),H(()=>{var d;const u=n(),g=(d=t.contentRef)==null?void 0:d.call(t);!u||!g||queueMicrotask(()=>{u.style.zIndex=getComputedStyle(g).zIndex})});const f={currentPlacement:l,contentRef:()=>{var u;return(u=t.contentRef)==null?void 0:u.call(t)},setPositionerRef:r,setArrowRef:s};return v(wr.Provider,{value:f,get children(){return t.children}})}var Di=Object.assign(Ru,{Arrow:$r,Context:wr,usePopperContext:xr,Positioner:Lu});function zu(e){const t=n=>{var r;n.key===ur.Escape&&((r=e.onEscapeKeyDown)==null||r.call(e,n))};H(()=>{var r;if(E(e.isDisabled))return;const n=((r=e.ownerDocument)==null?void 0:r.call(e))??Je();n.addEventListener("keydown",t),G(()=>{n.removeEventListener("keydown",t)})})}var bo="interactOutside.pointerDownOutside",po="interactOutside.focusOutside";function Ku(e,t){let n,r=jl;const o=()=>Je(t()),s=f=>{var u;return(u=e.onPointerDownOutside)==null?void 0:u.call(e,f)},l=f=>{var u;return(u=e.onFocusOutside)==null?void 0:u.call(e,f)},a=f=>{var u;return(u=e.onInteractOutside)==null?void 0:u.call(e,f)},i=f=>{var g;const u=f.target;return!(u instanceof HTMLElement)||u.closest(`[${Cn}]`)||!Be(o(),u)||Be(t(),u)?!1:!((g=e.shouldExcludeElement)!=null&&g.call(e,u))},c=f=>{function u(){const g=t(),d=f.target;if(!g||!d||!i(f))return;const y=we([s,a]);d.addEventListener(bo,y,{once:!0});const b=new CustomEvent(bo,{bubbles:!1,cancelable:!0,detail:{originalEvent:f,isContextMenu:f.button===2||ql(f)&&f.button===0}});d.dispatchEvent(b)}f.pointerType==="touch"?(o().removeEventListener("click",u),r=u,o().addEventListener("click",u,{once:!0})):u()},h=f=>{const u=t(),g=f.target;if(!u||!g||!i(f))return;const d=we([l,a]);g.addEventListener(po,d,{once:!0});const y=new CustomEvent(po,{bubbles:!1,cancelable:!0,detail:{originalEvent:f,isContextMenu:!1}});g.dispatchEvent(y)};H(()=>{E(e.isDisabled)||(n=window.setTimeout(()=>{o().addEventListener("pointerdown",c,!0)},0),o().addEventListener("focusin",h,!0),G(()=>{window.clearTimeout(n),o().removeEventListener("click",r),o().removeEventListener("pointerdown",c,!0),o().removeEventListener("focusin",h,!0)}))})}var Ai=xe();function Bu(){return $e(Ai)}function Nu(e){let t;const n=Bu(),[r,o]=oe(e,["ref","disableOutsidePointerEvents","excludedElements","onEscapeKeyDown","onPointerDownOutside","onFocusOutside","onInteractOutside","onDismiss","bypassTopMostLayerCheck"]),s=new Set([]),l=f=>{s.add(f);const u=n==null?void 0:n.registerNestedLayer(f);return()=>{s.delete(f),u==null||u()}};Ku({shouldExcludeElement:f=>{var u;return t?((u=r.excludedElements)==null?void 0:u.some(g=>Be(g(),f)))||[...s].some(g=>Be(g,f)):!1},onPointerDownOutside:f=>{var u,g,d;!t||Ie.isBelowPointerBlockingLayer(t)||!r.bypassTopMostLayerCheck&&!Ie.isTopMostLayer(t)||((u=r.onPointerDownOutside)==null||u.call(r,f),(g=r.onInteractOutside)==null||g.call(r,f),f.defaultPrevented||(d=r.onDismiss)==null||d.call(r))},onFocusOutside:f=>{var u,g,d;(u=r.onFocusOutside)==null||u.call(r,f),(g=r.onInteractOutside)==null||g.call(r,f),f.defaultPrevented||(d=r.onDismiss)==null||d.call(r)}},()=>t),zu({ownerDocument:()=>Je(t),onEscapeKeyDown:f=>{var u;!t||!Ie.isTopMostLayer(t)||((u=r.onEscapeKeyDown)==null||u.call(r,f),!f.defaultPrevented&&r.onDismiss&&(f.preventDefault(),r.onDismiss()))}}),Mt(()=>{if(!t)return;Ie.addLayer({node:t,isPointerBlocking:r.disableOutsidePointerEvents,dismiss:r.onDismiss});const f=n==null?void 0:n.registerNestedLayer(t);Ie.assignPointerEventToLayers(),Ie.disableBodyPointerEvents(t),G(()=>{t&&(Ie.removeLayer(t),f==null||f(),Ie.assignPointerEventToLayers(),Ie.restoreBodyPointerEvents(t))})}),H(ft([()=>t,()=>r.disableOutsidePointerEvents],([f,u])=>{if(!f)return;const g=Ie.find(f);g&&g.isPointerBlocking!==u&&(g.isPointerBlocking=u,Ie.assignPointerEventToLayers()),u&&Ie.disableBodyPointerEvents(f),G(()=>{Ie.restoreBodyPointerEvents(f)})},{defer:!0}));const h={registerNestedLayer:l};return v(Ai.Provider,{value:h,get children(){return v(fe,W({as:"div",ref(f){const u=Me(g=>t=g,r.ref);typeof u=="function"&&u(f)}},o))}})}function Mi(e={}){const[t,n]=ri({value:()=>E(e.open),defaultValue:()=>!!E(e.defaultOpen),onChange:l=>{var a;return(a=e.onOpenChange)==null?void 0:a.call(e,l)}}),r=()=>{n(!0)},o=()=>{n(!1)};return{isOpen:t,setIsOpen:n,open:r,close:o,toggle:()=>{t()?o():r()}}}var Ke={};Ln(Ke,{Description:()=>ti,ErrorMessage:()=>ni,Item:()=>Li,ItemControl:()=>Oi,ItemDescription:()=>Pi,ItemIndicator:()=>qi,ItemInput:()=>_i,ItemLabel:()=>Ri,Label:()=>zi,RadioGroup:()=>Hu,Root:()=>Ki});var Ti=xe();function Fi(){const e=$e(Ti);if(e===void 0)throw new Error("[kobalte]: `useRadioGroupContext` must be used within a `RadioGroup` component");return e}var Ii=xe();function hn(){const e=$e(Ii);if(e===void 0)throw new Error("[kobalte]: `useRadioGroupItemContext` must be used within a `RadioGroup.Item` component");return e}function Li(e){const t=dn(),n=Fi(),r=`${t.generateId("item")}-${He()}`,o=X({id:r},e),[s,l]=oe(o,["value","disabled","onPointerDown"]),[a,i]=K(),[c,h]=K(),[f,u]=K(),[g,d]=K(),[y,b]=K(!1),m=O(()=>n.isSelectedValue(s.value)),p=O(()=>s.disabled||t.isDisabled()||!1),w=P=>{de(P,s.onPointerDown),y()&&P.preventDefault()},x=O(()=>({...t.dataset(),"data-disabled":p()?"":void 0,"data-checked":m()?"":void 0})),$={value:()=>s.value,dataset:x,isSelected:m,isDisabled:p,inputId:a,labelId:c,descriptionId:f,inputRef:g,select:()=>n.setSelectedValue(s.value),generateId:cn(()=>l.id),registerInput:Ne(i),registerLabel:Ne(h),registerDescription:Ne(u),setIsFocused:b,setInputRef:d};return v(Ii.Provider,{value:$,get children(){return v(fe,W({as:"div",role:"group",onPointerDown:w},x,l))}})}function Oi(e){const t=hn(),n=X({id:t.generateId("control")},e),[r,o]=oe(n,["onClick","onKeyDown"]);return v(fe,W({as:"div",onClick:a=>{var i;de(a,r.onClick),t.select(),(i=t.inputRef())==null||i.focus()},onKeyDown:a=>{var i;de(a,r.onKeyDown),a.key===ur.Space&&(t.select(),(i=t.inputRef())==null||i.focus())}},()=>t.dataset(),o))}function Pi(e){const t=hn(),n=X({id:t.generateId("description")},e);return H(()=>G(t.registerDescription(n.id))),v(fe,W({as:"div"},()=>t.dataset(),n))}function qi(e){const t=hn(),n=X({id:t.generateId("indicator")},e),[r,o]=oe(n,["ref","forceMount"]),[s,l]=K(),{present:a}=gi({show:()=>r.forceMount||t.isSelected(),element:()=>s()??null});return v(z,{get when(){return a()},get children(){return v(fe,W({as:"div",ref(i){const c=Me(l,r.ref);typeof c=="function"&&c(i)}},()=>t.dataset(),o))}})}function _i(e){const t=dn(),n=Fi(),r=hn(),o=X({id:r.generateId("input")},e),[s,l]=oe(o,["ref","style","aria-labelledby","aria-describedby","onChange","onFocus","onBlur"]),a=()=>[s["aria-labelledby"],r.labelId(),s["aria-labelledby"]!=null&&l["aria-label"]!=null?l.id:void 0].filter(Boolean).join(" ")||void 0,i=()=>[s["aria-describedby"],r.descriptionId(),n.ariaDescribedBy()].filter(Boolean).join(" ")||void 0,[c,h]=K(!1),f=d=>{if(de(d,s.onChange),d.stopPropagation(),!c()){n.setSelectedValue(r.value());const y=d.target;y.checked=r.isSelected()}h(!1)},u=d=>{de(d,s.onFocus),r.setIsFocused(!0)},g=d=>{de(d,s.onBlur),r.setIsFocused(!1)};return H(ft([()=>r.isSelected(),()=>r.value()],d=>{if(!d[0]&&d[1]===r.value())return;h(!0);const y=r.inputRef();y==null||y.dispatchEvent(new Event("input",{bubbles:!0,cancelable:!0})),y==null||y.dispatchEvent(new Event("change",{bubbles:!0,cancelable:!0}))},{defer:!0})),H(()=>G(r.registerInput(l.id))),v(fe,W({as:"input",ref(d){const y=Me(r.setInputRef,s.ref);typeof y=="function"&&y(d)},type:"radio",get name(){return t.name()},get value(){return r.value()},get checked(){return r.isSelected()},get required(){return t.isRequired()},get disabled(){return r.isDisabled()},get readonly(){return t.isReadOnly()},get style(){return Tn({...Jo},s.style)},get"aria-labelledby"(){return a()},get"aria-describedby"(){return i()},onChange:f,onFocus:u,onBlur:g},()=>r.dataset(),l))}function Ri(e){const t=hn(),n=X({id:t.generateId("label")},e);return H(()=>G(t.registerLabel(n.id))),v(fe,W({as:"label",get for(){return t.inputId()}},()=>t.dataset(),n))}function zi(e){return v(Zl,W({as:"span"},e))}function Ki(e){let t;const n=`radiogroup-${He()}`,r=X({id:n,orientation:"vertical"},e),[o,s,l]=oe(r,["ref","value","defaultValue","onChange","orientation","aria-labelledby","aria-describedby"],Yl),[a,i]=fn({value:()=>o.value,defaultValue:()=>o.defaultValue,onChange:d=>{var y;return(y=o.onChange)==null?void 0:y.call(o,d)}}),{formControlContext:c}=Xl(s);Jl(()=>t,()=>i(o.defaultValue??""));const h=()=>c.getAriaLabelledBy(E(s.id),l["aria-label"],o["aria-labelledby"]),f=()=>c.getAriaDescribedBy(o["aria-describedby"]),u=d=>d===a(),g={ariaDescribedBy:f,isSelectedValue:u,setSelectedValue:d=>{if(!(c.isReadOnly()||c.isDisabled())&&(i(d),t))for(const y of t.querySelectorAll("[type='radio']")){const b=y;b.checked=u(b.value)}}};return v(ei.Provider,{value:c,get children(){return v(Ti.Provider,{value:g,get children(){return v(fe,W({as:"div",ref(d){const y=Me(b=>t=b,o.ref);typeof y=="function"&&y(d)},role:"radiogroup",get id(){return E(s.id)},get"aria-invalid"(){return c.validationState()==="invalid"||void 0},get"aria-required"(){return c.isRequired()||void 0},get"aria-disabled"(){return c.isDisabled()||void 0},get"aria-readonly"(){return c.isReadOnly()||void 0},get"aria-orientation"(){return o.orientation},get"aria-labelledby"(){return h()},get"aria-describedby"(){return f()}},()=>c.dataset(),l))}})}})}var Hu=Object.assign(Ki,{Description:ti,ErrorMessage:ni,Item:Li,ItemControl:Oi,ItemDescription:Pi,ItemIndicator:qi,ItemInput:_i,ItemLabel:Ri,Label:zi}),Uu=class{constructor(e,t,n){_e(this,"collection");_e(this,"ref");_e(this,"collator");this.collection=e,this.ref=t,this.collator=n}getKeyBelow(e){let t=this.collection().getKeyAfter(e);for(;t!=null;){const n=this.collection().getItem(t);if(n&&n.type==="item"&&!n.disabled)return t;t=this.collection().getKeyAfter(t)}}getKeyAbove(e){let t=this.collection().getKeyBefore(e);for(;t!=null;){const n=this.collection().getItem(t);if(n&&n.type==="item"&&!n.disabled)return t;t=this.collection().getKeyBefore(t)}}getFirstKey(){let e=this.collection().getFirstKey();for(;e!=null;){const t=this.collection().getItem(e);if(t&&t.type==="item"&&!t.disabled)return e;e=this.collection().getKeyAfter(e)}}getLastKey(){let e=this.collection().getLastKey();for(;e!=null;){const t=this.collection().getItem(e);if(t&&t.type==="item"&&!t.disabled)return e;e=this.collection().getKeyBefore(e)}}getItem(e){var t,n;return((n=(t=this.ref)==null?void 0:t.call(this))==null?void 0:n.querySelector(`[data-key="${e}"]`))??null}getKeyPageAbove(e){var s;const t=(s=this.ref)==null?void 0:s.call(this);let n=this.getItem(e);if(!t||!n)return;const r=Math.max(0,n.offsetTop+n.offsetHeight-t.offsetHeight);let o=e;for(;o&&n&&n.offsetTop>r;)o=this.getKeyAbove(o),n=o!=null?this.getItem(o):null;return o}getKeyPageBelow(e){var s;const t=(s=this.ref)==null?void 0:s.call(this);let n=this.getItem(e);if(!t||!n)return;const r=Math.min(t.scrollHeight,n.offsetTop-n.offsetHeight+t.offsetHeight);let o=e;for(;o&&n&&n.offsetTop<r;)o=this.getKeyBelow(o),n=o!=null?this.getItem(o):null;return o}getKeyForSearch(e,t){var o;const n=(o=this.collator)==null?void 0:o.call(this);if(!n)return;let r=t!=null?this.getKeyBelow(t):this.getFirstKey();for(;r!=null;){const s=this.collection().getItem(r);if(s){const l=s.textValue.slice(0,e.length);if(s.textValue&&n.compare(l,e)===0)return r}r=this.getKeyBelow(r)}}};function Vu(e,t,n){const r=wa({usage:"search",sensitivity:"base"}),o=O(()=>{const s=E(e.keyboardDelegate);return s||new Uu(e.collection,t,r)});return Da({selectionManager:()=>E(e.selectionManager),keyboardDelegate:o,autoFocus:()=>E(e.autoFocus),deferAutoFocus:()=>E(e.deferAutoFocus),shouldFocusWrap:()=>E(e.shouldFocusWrap),disallowEmptySelection:()=>E(e.disallowEmptySelection),selectOnFocus:()=>E(e.selectOnFocus),disallowTypeAhead:()=>E(e.disallowTypeAhead),shouldUseVirtualFocus:()=>E(e.shouldUseVirtualFocus),allowsTabNavigation:()=>E(e.allowsTabNavigation),isVirtualized:()=>E(e.isVirtualized),scrollToKey:s=>{var l;return(l=E(e.scrollToKey))==null?void 0:l(s)},orientation:()=>E(e.orientation)},t)}var Un="focusScope.autoFocusOnMount",Vn="focusScope.autoFocusOnUnmount",wo={bubbles:!1,cancelable:!0},xo={stack:[],active(){return this.stack[0]},add(e){var t;e!==this.active()&&((t=this.active())==null||t.pause()),this.stack=Xn(this.stack,e),this.stack.unshift(e)},remove(e){var t;this.stack=Xn(this.stack,e),(t=this.active())==null||t.resume()}};function Gu(e,t){const[n,r]=K(!1),o={pause(){r(!0)},resume(){r(!1)}};let s=null;const l=d=>{var y;return(y=e.onMountAutoFocus)==null?void 0:y.call(e,d)},a=d=>{var y;return(y=e.onUnmountAutoFocus)==null?void 0:y.call(e,d)},i=()=>Je(t()),c=()=>{const d=i().createElement("span");return d.setAttribute("data-focus-trap",""),d.tabIndex=0,Object.assign(d.style,Jo),d},h=()=>{const d=t();return d?Xo(d,!0).filter(y=>!y.hasAttribute("data-focus-trap")):[]},f=()=>{const d=h();return d.length>0?d[0]:null},u=()=>{const d=h();return d.length>0?d[d.length-1]:null},g=()=>{const d=t();if(!d)return!1;const y=rn(d);return!y||Be(d,y)?!1:Zo(y)};H(()=>{const d=t();if(!d)return;xo.add(o);const y=rn(d);if(!Be(d,y)){const m=new CustomEvent(Un,wo);d.addEventListener(Un,l),d.dispatchEvent(m),m.defaultPrevented||setTimeout(()=>{De(f()),rn(d)===y&&De(d)},0)}G(()=>{d.removeEventListener(Un,l),setTimeout(()=>{const m=new CustomEvent(Vn,wo);g()&&m.preventDefault(),d.addEventListener(Vn,a),d.dispatchEvent(m),m.defaultPrevented||De(y??i().body),d.removeEventListener(Vn,a),xo.remove(o)},0)})}),H(()=>{const d=t();if(!d||!E(e.trapFocus)||n())return;const y=m=>{const p=m.target;p!=null&&p.closest(`[${Cn}]`)||(Be(d,p)?s=p:De(s))},b=m=>{const w=m.relatedTarget??rn(d);w!=null&&w.closest(`[${Cn}]`)||Be(d,w)||De(s)};i().addEventListener("focusin",y),i().addEventListener("focusout",b),G(()=>{i().removeEventListener("focusin",y),i().removeEventListener("focusout",b)})}),H(()=>{const d=t();if(!d||!E(e.trapFocus)||n())return;const y=c();d.insertAdjacentElement("afterbegin",y);const b=c();d.insertAdjacentElement("beforeend",b);function m(w){const x=f(),$=u();w.relatedTarget===x?De($):De(x)}y.addEventListener("focusin",m),b.addEventListener("focusin",m);const p=new MutationObserver(w=>{for(const x of w)x.previousSibling===b&&(b.remove(),d.insertAdjacentElement("beforeend",b)),x.nextSibling===y&&(y.remove(),d.insertAdjacentElement("afterbegin",y))});p.observe(d,{childList:!0,subtree:!1}),G(()=>{y.removeEventListener("focusin",m),b.removeEventListener("focusin",m),y.remove(),b.remove(),p.disconnect()})})}var ju="data-live-announcer";function Wu(e){H(()=>{E(e.isDisabled)||G(Qu(E(e.targets),E(e.root)))})}var en=new WeakMap,ze=[];function Qu(e,t=document.body){const n=new Set(e),r=new Set,o=i=>{for(const u of i.querySelectorAll(`[${ju}], [${Cn}]`))n.add(u);const c=u=>{if(n.has(u)||u.parentElement&&r.has(u.parentElement)&&u.parentElement.getAttribute("role")!=="row")return NodeFilter.FILTER_REJECT;for(const g of n)if(u.contains(g))return NodeFilter.FILTER_SKIP;return NodeFilter.FILTER_ACCEPT},h=document.createTreeWalker(i,NodeFilter.SHOW_ELEMENT,{acceptNode:c}),f=c(i);if(f===NodeFilter.FILTER_ACCEPT&&s(i),f!==NodeFilter.FILTER_REJECT){let u=h.nextNode();for(;u!=null;)s(u),u=h.nextNode()}},s=i=>{const c=en.get(i)??0;i.getAttribute("aria-hidden")==="true"&&c===0||(c===0&&i.setAttribute("aria-hidden","true"),r.add(i),en.set(i,c+1))};ze.length&&ze[ze.length-1].disconnect(),o(t);const l=new MutationObserver(i=>{for(const c of i)if(!(c.type!=="childList"||c.addedNodes.length===0)&&![...n,...r].some(h=>h.contains(c.target))){for(const h of c.removedNodes)h instanceof Element&&(n.delete(h),r.delete(h));for(const h of c.addedNodes)(h instanceof HTMLElement||h instanceof SVGElement)&&(h.dataset.liveAnnouncer==="true"||h.dataset.reactAriaTopLayer==="true")?n.add(h):h instanceof Element&&o(h)}});l.observe(t,{childList:!0,subtree:!0});const a={observe(){l.observe(t,{childList:!0,subtree:!0})},disconnect(){l.disconnect()}};return ze.push(a),()=>{l.disconnect();for(const i of r){const c=en.get(i);if(c==null)return;c===1?(i.removeAttribute("aria-hidden"),en.delete(i)):en.set(i,c-1)}a===ze[ze.length-1]?(ze.pop(),ze.length&&ze[ze.length-1].observe()):ze.splice(ze.indexOf(a),1)}}var wn=new Map,Yu=e=>{H(()=>{const t=Ee(e.style)??{},n=Ee(e.properties)??[],r={};for(const s in t)r[s]=e.element.style[s];const o=wn.get(e.key);o?o.activeCount++:wn.set(e.key,{activeCount:1,originalStyles:r,properties:n.map(s=>s.key)}),Object.assign(e.element.style,e.style);for(const s of n)e.element.style.setProperty(s.key,s.value);G(()=>{var l;const s=wn.get(e.key);if(s){if(s.activeCount!==1){s.activeCount--;return}wn.delete(e.key);for(const[a,i]of Object.entries(s.originalStyles))e.element.style[a]=i;for(const a of s.properties)e.element.style.removeProperty(a);e.element.style.length===0&&e.element.removeAttribute("style"),(l=e.cleanup)==null||l.call(e)}})})},$o=Yu,Xu=(e,t)=>{switch(t){case"x":return[e.clientWidth,e.scrollLeft,e.scrollWidth];case"y":return[e.clientHeight,e.scrollTop,e.scrollHeight]}},Zu=(e,t)=>{const n=getComputedStyle(e),r=t==="x"?n.overflowX:n.overflowY;return r==="auto"||r==="scroll"||e.tagName==="HTML"&&r==="visible"},Ju=(e,t,n)=>{const r=t==="x"&&window.getComputedStyle(e).direction==="rtl"?-1:1;let o=e,s=0,l=0,a=!1;do{const[i,c,h]=Xu(o,t),f=h-i-r*c;(c!==0||f!==0)&&Zu(o,t)&&(s+=f,l+=c),o===(n??document.documentElement)?a=!0:o=o._$host??o.parentElement}while(o&&!a);return[s,l]},[Co,So]=K([]),ec=e=>Co().indexOf(e)===Co().length-1,tc=e=>{const t=W({element:null,enabled:!0,hideScrollbar:!0,preventScrollbarShift:!0,preventScrollbarShiftMode:"padding",restoreScrollPosition:!0,allowPinchZoom:!1},e),n=He();let r=[0,0],o=null,s=null;H(()=>{Ee(t.enabled)&&(So(c=>[...c,n]),G(()=>{So(c=>c.filter(h=>h!==n))}))}),H(()=>{if(!Ee(t.enabled)||!Ee(t.hideScrollbar))return;const{body:c}=document,h=window.innerWidth-c.offsetWidth;if(Ee(t.preventScrollbarShift)){const f={overflow:"hidden"},u=[];h>0&&(Ee(t.preventScrollbarShiftMode)==="padding"?f.paddingRight=`calc(${window.getComputedStyle(c).paddingRight} + ${h}px)`:f.marginRight=`calc(${window.getComputedStyle(c).marginRight} + ${h}px)`,u.push({key:"--scrollbar-width",value:`${h}px`}));const g=window.scrollY,d=window.scrollX;$o({key:"prevent-scroll",element:c,style:f,properties:u,cleanup:()=>{Ee(t.restoreScrollPosition)&&h>0&&window.scrollTo(d,g)}})}else $o({key:"prevent-scroll",element:c,style:{overflow:"hidden"}})}),H(()=>{!ec(n)||!Ee(t.enabled)||(document.addEventListener("wheel",a,{passive:!1}),document.addEventListener("touchstart",l,{passive:!1}),document.addEventListener("touchmove",i,{passive:!1}),G(()=>{document.removeEventListener("wheel",a),document.removeEventListener("touchstart",l),document.removeEventListener("touchmove",i)}))});const l=c=>{r=ko(c),o=null,s=null},a=c=>{const h=c.target,f=Ee(t.element),u=nc(c),g=Math.abs(u[0])>Math.abs(u[1])?"x":"y",d=g==="x"?u[0]:u[1],y=Eo(h,g,d,f);let b;f&&or(f,h)?b=!y:b=!0,b&&c.cancelable&&c.preventDefault()},i=c=>{const h=Ee(t.element),f=c.target;let u;if(c.touches.length===2)u=!Ee(t.allowPinchZoom);else{if(o==null||s===null){const g=ko(c).map((y,b)=>r[b]-y),d=Math.abs(g[0])>Math.abs(g[1])?"x":"y";o=d,s=d==="x"?g[0]:g[1]}if(f.type==="range")u=!1;else{const g=Eo(f,o,s,h);h&&or(h,f)?u=!g:u=!0}}u&&c.cancelable&&c.preventDefault()}},nc=e=>[e.deltaX,e.deltaY],ko=e=>e.changedTouches[0]?[e.changedTouches[0].clientX,e.changedTouches[0].clientY]:[0,0],Eo=(e,t,n,r)=>{const o=r!==null&&or(r,e),[s,l]=Ju(e,t,o?r:void 0);return!(n>0&&Math.abs(s)<=1||n<0&&Math.abs(l)<1)},or=(e,t)=>{if(e.contains(t))return!0;let n=t;for(;n;){if(n===e)return!0;n=n._$host??n.parentElement}return!1},rc=tc,oc=rc,Bi=xe();function Ni(){return $e(Bi)}function yt(){const e=Ni();if(e===void 0)throw new Error("[kobalte]: `useMenuContext` must be used within a `Menu` component");return e}var Hi=xe();function Cr(){const e=$e(Hi);if(e===void 0)throw new Error("[kobalte]: `useMenuItemContext` must be used within a `Menu.Item` component");return e}var Ui=xe();function tt(){const e=$e(Ui);if(e===void 0)throw new Error("[kobalte]: `useMenuRootContext` must be used within a `MenuRoot` component");return e}function Sr(e){let t;const n=tt(),r=yt(),o=X({id:n.generateId(`item-${He()}`)},e),[s,l]=oe(o,["ref","textValue","disabled","closeOnSelect","checked","indeterminate","onSelect","onPointerMove","onPointerLeave","onPointerDown","onPointerUp","onClick","onKeyDown","onMouseDown","onFocus"]),[a,i]=K(),[c,h]=K(),[f,u]=K(),g=()=>r.listState().selectionManager(),d=()=>l.id,y=()=>g().focusedKey()===d(),b=()=>{var C;(C=s.onSelect)==null||C.call(s),s.closeOnSelect&&setTimeout(()=>{r.close(!0)})};fa({getItem:()=>{var C;return{ref:()=>t,type:"item",key:d(),textValue:s.textValue??((C=f())==null?void 0:C.textContent)??(t==null?void 0:t.textContent)??"",disabled:s.disabled??!1}}});const m=fi({key:d,selectionManager:g,shouldSelectOnPressUp:!0,allowsDifferentPressOrigin:!0,disabled:()=>s.disabled},()=>t),p=C=>{de(C,s.onPointerMove),C.pointerType==="mouse"&&(s.disabled?r.onItemLeave(C):(r.onItemEnter(C),C.defaultPrevented||(De(C.currentTarget),r.listState().selectionManager().setFocused(!0),r.listState().selectionManager().setFocusedKey(d()))))},w=C=>{de(C,s.onPointerLeave),C.pointerType==="mouse"&&r.onItemLeave(C)},x=C=>{de(C,s.onPointerUp),!s.disabled&&C.button===0&&b()},$=C=>{if(de(C,s.onKeyDown),!C.repeat&&!s.disabled)switch(C.key){case"Enter":case" ":b();break}},P=O(()=>{if(s.indeterminate)return"mixed";if(s.checked!=null)return s.checked}),F=O(()=>({"data-indeterminate":s.indeterminate?"":void 0,"data-checked":s.checked&&!s.indeterminate?"":void 0,"data-disabled":s.disabled?"":void 0,"data-highlighted":y()?"":void 0})),_={isChecked:()=>s.checked,dataset:F,setLabelRef:u,generateId:cn(()=>l.id),registerLabel:Ne(i),registerDescription:Ne(h)};return v(Hi.Provider,{value:_,get children(){return v(fe,W({as:"div",ref(C){const A=Me(B=>t=B,s.ref);typeof A=="function"&&A(C)},get tabIndex(){return m.tabIndex()},get"aria-checked"(){return P()},get"aria-disabled"(){return s.disabled},get"aria-labelledby"(){return a()},get"aria-describedby"(){return c()},get"data-key"(){return m.dataKey()},get onPointerDown(){return we([s.onPointerDown,m.onPointerDown])},get onPointerUp(){return we([x,m.onPointerUp])},get onClick(){return we([s.onClick,m.onClick])},get onKeyDown(){return we([$,m.onKeyDown])},get onMouseDown(){return we([s.onMouseDown,m.onMouseDown])},get onFocus(){return we([s.onFocus,m.onFocus])},onPointerMove:p,onPointerLeave:w},F,l))}})}function Vi(e){const t=X({closeOnSelect:!1},e),[n,r]=oe(t,["checked","defaultChecked","onChange","onSelect"]),o=ra({isSelected:()=>n.checked,defaultIsSelected:()=>n.defaultChecked,onSelectedChange:l=>{var a;return(a=n.onChange)==null?void 0:a.call(n,l)},isDisabled:()=>r.disabled});return v(Sr,W({role:"menuitemcheckbox",get checked(){return o.isSelected()},onSelect:()=>{var l;(l=n.onSelect)==null||l.call(n),o.toggle()}},r))}var ic=xe();function qn(){return $e(ic)}var un={next:(e,t)=>e==="ltr"?t==="horizontal"?"ArrowRight":"ArrowDown":t==="horizontal"?"ArrowLeft":"ArrowUp",previous:(e,t)=>un.next(e==="ltr"?"rtl":"ltr",t)},Do={first:e=>e==="horizontal"?"ArrowDown":"ArrowRight",last:e=>e==="horizontal"?"ArrowUp":"ArrowLeft"};function Gi(e){const t=tt(),n=yt(),r=qn(),{direction:o}=St(),s=X({id:t.generateId("trigger")},e),[l,a]=oe(s,["ref","id","disabled","onPointerDown","onClick","onKeyDown","onMouseOver","onFocus"]);let i=()=>t.value();r!==void 0&&(i=()=>t.value()??l.id,r.lastValue()===void 0&&r.setLastValue(i));const c=In(()=>n.triggerRef(),()=>"button"),h=O(()=>{var m;return c()==="a"&&((m=n.triggerRef())==null?void 0:m.getAttribute("href"))!=null});H(ft(()=>r==null?void 0:r.value(),m=>{var p;h()&&m===i()&&((p=n.triggerRef())==null||p.focus())}));const f=()=>{r!==void 0?n.isOpen()?r.value()===i()&&r.closeMenu():(r.autoFocusMenu()||r.setAutoFocusMenu(!0),n.open(!1)):n.toggle(!0)},u=m=>{de(m,l.onPointerDown),m.currentTarget.dataset.pointerType=m.pointerType,!l.disabled&&m.pointerType!=="touch"&&m.button===0&&f()},g=m=>{de(m,l.onClick),l.disabled||m.currentTarget.dataset.pointerType==="touch"&&f()},d=m=>{if(de(m,l.onKeyDown),!l.disabled){if(h())switch(m.key){case"Enter":case" ":return}switch(m.key){case"Enter":case" ":case Do.first(t.orientation()):m.stopPropagation(),m.preventDefault(),Ql(m.currentTarget),n.open("first"),r==null||r.setAutoFocusMenu(!0),r==null||r.setValue(i);break;case Do.last(t.orientation()):m.stopPropagation(),m.preventDefault(),n.open("last");break;case un.next(o(),t.orientation()):if(r===void 0)break;m.stopPropagation(),m.preventDefault(),r.nextMenu();break;case un.previous(o(),t.orientation()):if(r===void 0)break;m.stopPropagation(),m.preventDefault(),r.previousMenu();break}}},y=m=>{var p;de(m,l.onMouseOver),((p=n.triggerRef())==null?void 0:p.dataset.pointerType)!=="touch"&&!l.disabled&&r!==void 0&&r.value()!==void 0&&r.setValue(i)},b=m=>{de(m,l.onFocus),r!==void 0&&m.currentTarget.dataset.pointerType!=="touch"&&r.setValue(i)};return H(()=>G(n.registerTriggerId(l.id))),v(hr,W({ref(m){const p=Me(n.setTriggerRef,l.ref);typeof p=="function"&&p(m)},get"data-kb-menu-value-trigger"(){return t.value()},get id(){return l.id},get disabled(){return l.disabled},"aria-haspopup":"true",get"aria-expanded"(){return n.isOpen()},get"aria-controls"(){return ye(()=>!!n.isOpen())()?n.contentId():void 0},get"data-highlighted"(){return i()!==void 0&&(r==null?void 0:r.value())===i()?!0:void 0},get tabIndex(){return r!==void 0?r.value()===i()||r.lastValue()===i()?0:-1:void 0},onPointerDown:u,onMouseOver:y,onClick:g,onKeyDown:d,onFocus:b,role:r!==void 0?"menuitem":void 0},()=>n.dataset(),a))}var sc=xe();function ji(){return $e(sc)}function Wi(e){let t;const n=tt(),r=yt(),o=qn(),s=ji(),{direction:l}=St(),a=X({id:n.generateId(`content-${He()}`)},e),[i,c]=oe(a,["ref","id","style","onOpenAutoFocus","onCloseAutoFocus","onEscapeKeyDown","onFocusOutside","onPointerEnter","onPointerMove","onKeyDown","onMouseDown","onFocusIn","onFocusOut"]);let h=0;const f=()=>r.parentMenuContext()==null&&o===void 0&&n.isModal(),u=Vu({selectionManager:r.listState().selectionManager,collection:r.listState().collection,autoFocus:r.autoFocus,deferAutoFocus:!0,shouldFocusWrap:!0,disallowTypeAhead:()=>!r.listState().selectionManager().isFocused(),orientation:()=>n.orientation()==="horizontal"?"vertical":"horizontal"},()=>t);Gu({trapFocus:()=>f()&&r.isOpen(),onMountAutoFocus:w=>{var x;o===void 0&&((x=i.onOpenAutoFocus)==null||x.call(i,w))},onUnmountAutoFocus:i.onCloseAutoFocus},()=>t);const g=w=>{if(Be(w.currentTarget,w.target)&&(w.key==="Tab"&&r.isOpen()&&w.preventDefault(),o!==void 0&&w.currentTarget.getAttribute("aria-haspopup")!=="true"))switch(w.key){case un.next(l(),n.orientation()):w.stopPropagation(),w.preventDefault(),r.close(!0),o.setAutoFocusMenu(!0),o.nextMenu();break;case un.previous(l(),n.orientation()):if(w.currentTarget.hasAttribute("data-closed"))break;w.stopPropagation(),w.preventDefault(),r.close(!0),o.setAutoFocusMenu(!0),o.previousMenu();break}},d=w=>{var x;(x=i.onEscapeKeyDown)==null||x.call(i,w),o==null||o.setAutoFocusMenu(!1),r.close(!0)},y=w=>{var x;(x=i.onFocusOutside)==null||x.call(i,w),n.isModal()&&w.preventDefault()},b=w=>{var x,$;de(w,i.onPointerEnter),r.isOpen()&&((x=r.parentMenuContext())==null||x.listState().selectionManager().setFocused(!1),($=r.parentMenuContext())==null||$.listState().selectionManager().setFocusedKey(void 0))},m=w=>{if(de(w,i.onPointerMove),w.pointerType!=="mouse")return;const x=w.target,$=h!==w.clientX;Be(w.currentTarget,x)&&$&&(r.setPointerDir(w.clientX>h?"right":"left"),h=w.clientX)};H(()=>G(r.registerContentId(i.id)));const p={ref:Me(w=>{r.setContentRef(w),t=w},i.ref),role:"menu",get id(){return i.id},get tabIndex(){return u.tabIndex()},get"aria-labelledby"(){return r.triggerId()},onKeyDown:we([i.onKeyDown,u.onKeyDown,g]),onMouseDown:we([i.onMouseDown,u.onMouseDown]),onFocusIn:we([i.onFocusIn,u.onFocusIn]),onFocusOut:we([i.onFocusOut,u.onFocusOut]),onPointerEnter:b,onPointerMove:m,get"data-orientation"(){return n.orientation()}};return v(z,{get when(){return r.contentPresent()},get children(){return v(z,{get when(){return s===void 0||r.parentMenuContext()!=null},get fallback(){return v(fe,W({as:"div"},()=>r.dataset(),p,c))},get children(){return v(Di.Positioner,{get children(){return v(Nu,W({get disableOutsidePointerEvents(){return ye(()=>!!f())()&&r.isOpen()},get excludedElements(){return[r.triggerRef]},bypassTopMostLayerCheck:!0,get style(){return Tn({"--kb-menu-content-transform-origin":"var(--kb-popper-content-transform-origin)",position:"relative"},i.style)},onEscapeKeyDown:d,onFocusOutside:y,get onDismiss(){return r.close}},()=>r.dataset(),p,c))}})}})}})}function lc(e){let t;const n=tt(),r=yt(),[o,s]=oe(e,["ref"]);return oc({element:()=>t??null,enabled:()=>r.contentPresent()&&n.preventScroll()}),v(Wi,W({ref(l){const a=Me(i=>{t=i},o.ref);typeof a=="function"&&a(l)}},s))}var Qi=xe();function ac(){const e=$e(Qi);if(e===void 0)throw new Error("[kobalte]: `useMenuGroupContext` must be used within a `Menu.Group` component");return e}function kr(e){const t=tt(),n=X({id:t.generateId(`group-${He()}`)},e),[r,o]=K(),s={generateId:cn(()=>n.id),registerLabelId:Ne(o)};return v(Qi.Provider,{value:s,get children(){return v(fe,W({as:"div",role:"group",get"aria-labelledby"(){return r()}},n))}})}function Yi(e){const t=ac(),n=X({id:t.generateId("label")},e),[r,o]=oe(n,["id"]);return H(()=>G(t.registerLabelId(r.id))),v(fe,W({as:"span",get id(){return r.id},"aria-hidden":"true"},o))}function Xi(e){const t=yt(),n=X({children:"▼"},e);return v(fe,W({as:"span","aria-hidden":"true"},()=>t.dataset(),n))}function Zi(e){return v(Sr,W({role:"menuitem",closeOnSelect:!0},e))}function Ji(e){const t=Cr(),n=X({id:t.generateId("description")},e),[r,o]=oe(n,["id"]);return H(()=>G(t.registerDescription(r.id))),v(fe,W({as:"div",get id(){return r.id}},()=>t.dataset(),o))}function es(e){const t=Cr(),n=X({id:t.generateId("indicator")},e),[r,o]=oe(n,["forceMount"]);return v(z,{get when(){return r.forceMount||t.isChecked()},get children(){return v(fe,W({as:"div"},()=>t.dataset(),o))}})}function ts(e){const t=Cr(),n=X({id:t.generateId("label")},e),[r,o]=oe(n,["ref","id"]);return H(()=>G(t.registerLabel(r.id))),v(fe,W({as:"div",ref(s){const l=Me(t.setLabelRef,r.ref);typeof l=="function"&&l(s)},get id(){return r.id}},()=>t.dataset(),o))}function ns(e){const t=yt();return v(z,{get when(){return t.contentPresent()},get children(){return v(_o,e)}})}var rs=xe();function uc(){const e=$e(rs);if(e===void 0)throw new Error("[kobalte]: `useMenuRadioGroupContext` must be used within a `Menu.RadioGroup` component");return e}function os(e){const n=tt().generateId(`radiogroup-${He()}`),r=X({id:n},e),[o,s]=oe(r,["value","defaultValue","onChange","disabled"]),[l,a]=fn({value:()=>o.value,defaultValue:()=>o.defaultValue,onChange:c=>{var h;return(h=o.onChange)==null?void 0:h.call(o,c)}}),i={isDisabled:()=>o.disabled,isSelectedValue:c=>c===l(),setSelectedValue:a};return v(rs.Provider,{value:i,get children(){return v(kr,s)}})}function is(e){const t=uc(),n=X({closeOnSelect:!1},e),[r,o]=oe(n,["value","onSelect"]);return v(Sr,W({role:"menuitemradio",get checked(){return t.isSelectedValue(r.value)},onSelect:()=>{var l;(l=r.onSelect)==null||l.call(r),t.setSelectedValue(r.value)}},o))}function cc(e,t,n){const r=e.split("-")[0],o=n.getBoundingClientRect(),s=[],l=t.clientX,a=t.clientY;switch(r){case"top":s.push([l,a+5]),s.push([o.left,o.bottom]),s.push([o.left,o.top]),s.push([o.right,o.top]),s.push([o.right,o.bottom]);break;case"right":s.push([l-5,a]),s.push([o.left,o.top]),s.push([o.right,o.top]),s.push([o.right,o.bottom]),s.push([o.left,o.bottom]);break;case"bottom":s.push([l,a-5]),s.push([o.right,o.top]),s.push([o.right,o.bottom]),s.push([o.left,o.bottom]),s.push([o.left,o.top]);break;case"left":s.push([l+5,a]),s.push([o.right,o.bottom]),s.push([o.left,o.bottom]),s.push([o.left,o.top]),s.push([o.right,o.top]);break}return s}function dc(e,t){return t?Wl([e.clientX,e.clientY],t):!1}function ss(e){const t=tt(),n=ii(),r=Ni(),o=qn(),s=ji(),l=X({placement:t.orientation()==="horizontal"?"bottom-start":"right-start"},e),[a,i]=oe(l,["open","defaultOpen","onOpenChange"]);let c=0,h=null,f="right";const[u,g]=K(),[d,y]=K(),[b,m]=K(),[p,w]=K(),[x,$]=K(!0),[P,F]=K(i.placement),[_,C]=K([]),[A,B]=K([]),{DomCollectionProvider:U}=da({items:A,onItemsChange:B}),ne=Mi({open:()=>a.open,defaultOpen:()=>a.defaultOpen,onOpenChange:j=>{var Se;return(Se=a.onOpenChange)==null?void 0:Se.call(a,j)}}),{present:Z}=gi({show:()=>t.forceMount()||ne.isOpen(),element:()=>p()??null}),se=Ma({selectionMode:"none",dataSource:A}),R=j=>{$(j),ne.open()},Q=(j=!1)=>{ne.close(),j&&r&&r.close(!0)},J=j=>{$(j),ne.toggle()},ue=()=>{const j=p();j&&(De(j),se.selectionManager().setFocused(!0),se.selectionManager().setFocusedKey(void 0))},ve=()=>{s!=null?setTimeout(()=>ue()):ue()},Te=j=>{C(ke=>[...ke,j]);const Se=r==null?void 0:r.registerNestedMenu(j);return()=>{C(ke=>Xn(ke,j)),Se==null||Se()}},he=j=>f===(h==null?void 0:h.side)&&dc(j,h==null?void 0:h.area),Ae=j=>{he(j)&&j.preventDefault()},D=j=>{he(j)||ve()},ge=j=>{he(j)&&j.preventDefault()};Wu({isDisabled:()=>!(r==null&&ne.isOpen()&&t.isModal()),targets:()=>[p(),..._()].filter(Boolean)}),H(()=>{const j=p();if(!j||!r)return;const Se=r.registerNestedMenu(j);G(()=>{Se()})}),H(()=>{r===void 0&&(o==null||o.registerMenu(t.value(),[p(),..._()]))}),H(()=>{var j;r!==void 0||o===void 0||(o.value()===t.value()?((j=b())==null||j.focus(),o.autoFocusMenu()&&R(!0)):Q())}),H(()=>{r!==void 0||o===void 0||ne.isOpen()&&o.setValue(t.value())}),G(()=>{r===void 0&&(o==null||o.unregisterMenu(t.value()))});const vt={dataset:O(()=>({"data-expanded":ne.isOpen()?"":void 0,"data-closed":ne.isOpen()?void 0:""})),isOpen:ne.isOpen,contentPresent:Z,nestedMenus:_,currentPlacement:P,pointerGraceTimeoutId:()=>c,autoFocus:x,listState:()=>se,parentMenuContext:()=>r,triggerRef:b,contentRef:p,triggerId:u,contentId:d,setTriggerRef:m,setContentRef:w,open:R,close:Q,toggle:J,focusContent:ve,onItemEnter:Ae,onItemLeave:D,onTriggerLeave:ge,setPointerDir:j=>f=j,setPointerGraceTimeoutId:j=>c=j,setPointerGraceIntent:j=>h=j,registerNestedMenu:Te,registerItemToParentDomCollection:n==null?void 0:n.registerItem,registerTriggerId:Ne(g),registerContentId:Ne(y)};return v(U,{get children(){return v(Bi.Provider,{value:vt,get children(){return v(z,{when:s===void 0,get fallback(){return i.children},get children(){return v(Di,W({anchorRef:b,contentRef:p,onCurrentPlacementChange:F},i))}})}})}})}function ls(e){const{direction:t}=St();return v(ss,W({get placement(){return t()==="rtl"?"left-start":"right-start"},flip:!0},e))}var fc={close:(e,t)=>e==="ltr"?[t==="horizontal"?"ArrowLeft":"ArrowUp"]:[t==="horizontal"?"ArrowRight":"ArrowDown"]};function as(e){const t=yt(),n=tt(),[r,o]=oe(e,["onFocusOutside","onKeyDown"]),{direction:s}=St();return v(Wi,W({onOpenAutoFocus:h=>{h.preventDefault()},onCloseAutoFocus:h=>{h.preventDefault()},onFocusOutside:h=>{var u;(u=r.onFocusOutside)==null||u.call(r,h);const f=h.target;Be(t.triggerRef(),f)||t.close()},onKeyDown:h=>{de(h,r.onKeyDown);const f=Be(h.currentTarget,h.target),u=fc.close(s(),n.orientation()).includes(h.key),g=t.parentMenuContext()!=null;f&&u&&g&&(t.close(),De(t.triggerRef()))}},o))}var Ao=["Enter"," "],gc={open:(e,t)=>e==="ltr"?[...Ao,t==="horizontal"?"ArrowRight":"ArrowDown"]:[...Ao,t==="horizontal"?"ArrowLeft":"ArrowUp"]};function us(e){let t;const n=tt(),r=yt(),o=X({id:n.generateId(`sub-trigger-${He()}`)},e),[s,l]=oe(o,["ref","id","textValue","disabled","onPointerMove","onPointerLeave","onPointerDown","onPointerUp","onClick","onKeyDown","onMouseDown","onFocus"]);let a=null;const i=()=>{a&&window.clearTimeout(a),a=null},{direction:c}=St(),h=()=>s.id,f=()=>{const w=r.parentMenuContext();if(w==null)throw new Error("[kobalte]: `Menu.SubTrigger` must be used within a `Menu.Sub` component");return w.listState().selectionManager()},u=()=>r.listState().collection(),g=()=>f().focusedKey()===h(),d=fi({key:h,selectionManager:f,shouldSelectOnPressUp:!0,allowsDifferentPressOrigin:!0,disabled:()=>s.disabled},()=>t),y=w=>{de(w,s.onClick),!r.isOpen()&&!s.disabled&&r.open(!0)},b=w=>{var $;if(de(w,s.onPointerMove),w.pointerType!=="mouse")return;const x=r.parentMenuContext();if(x==null||x.onItemEnter(w),!w.defaultPrevented){if(s.disabled){x==null||x.onItemLeave(w);return}!r.isOpen()&&!a&&(($=r.parentMenuContext())==null||$.setPointerGraceIntent(null),a=window.setTimeout(()=>{r.open(!1),i()},100)),x==null||x.onItemEnter(w),w.defaultPrevented||(r.listState().selectionManager().isFocused()&&(r.listState().selectionManager().setFocused(!1),r.listState().selectionManager().setFocusedKey(void 0)),De(w.currentTarget),x==null||x.listState().selectionManager().setFocused(!0),x==null||x.listState().selectionManager().setFocusedKey(h()))}},m=w=>{if(de(w,s.onPointerLeave),w.pointerType!=="mouse")return;i();const x=r.parentMenuContext(),$=r.contentRef();if($){x==null||x.setPointerGraceIntent({area:cc(r.currentPlacement(),w,$),side:r.currentPlacement().split("-")[0]}),window.clearTimeout(x==null?void 0:x.pointerGraceTimeoutId());const P=window.setTimeout(()=>{x==null||x.setPointerGraceIntent(null)},300);x==null||x.setPointerGraceTimeoutId(P)}else{if(x==null||x.onTriggerLeave(w),w.defaultPrevented)return;x==null||x.setPointerGraceIntent(null)}x==null||x.onItemLeave(w)},p=w=>{de(w,s.onKeyDown),!w.repeat&&(s.disabled||gc.open(c(),n.orientation()).includes(w.key)&&(w.stopPropagation(),w.preventDefault(),f().setFocused(!1),f().setFocusedKey(void 0),r.isOpen()||r.open("first"),r.focusContent(),r.listState().selectionManager().setFocused(!0),r.listState().selectionManager().setFocusedKey(u().getFirstKey())))};return H(()=>{if(r.registerItemToParentDomCollection==null)throw new Error("[kobalte]: `Menu.SubTrigger` must be used within a `Menu.Sub` component");const w=r.registerItemToParentDomCollection({ref:()=>t,type:"item",key:h(),textValue:s.textValue??(t==null?void 0:t.textContent)??"",disabled:s.disabled??!1});G(w)}),H(ft(()=>{var w;return(w=r.parentMenuContext())==null?void 0:w.pointerGraceTimeoutId()},w=>{G(()=>{var x;window.clearTimeout(w),(x=r.parentMenuContext())==null||x.setPointerGraceIntent(null)})})),H(()=>G(r.registerTriggerId(s.id))),G(()=>{i()}),v(fe,W({as:"div",ref(w){const x=Me($=>{r.setTriggerRef($),t=$},s.ref);typeof x=="function"&&x(w)},get id(){return s.id},role:"menuitem",get tabIndex(){return d.tabIndex()},"aria-haspopup":"true",get"aria-expanded"(){return r.isOpen()},get"aria-controls"(){return ye(()=>!!r.isOpen())()?r.contentId():void 0},get"aria-disabled"(){return s.disabled},get"data-key"(){return d.dataKey()},get"data-highlighted"(){return g()?"":void 0},get"data-disabled"(){return s.disabled?"":void 0},get onPointerDown(){return we([s.onPointerDown,d.onPointerDown])},get onPointerUp(){return we([s.onPointerUp,d.onPointerUp])},get onClick(){return we([y,d.onClick])},get onKeyDown(){return we([p,d.onKeyDown])},get onMouseDown(){return we([s.onMouseDown,d.onMouseDown])},get onFocus(){return we([s.onFocus,d.onFocus])},onPointerMove:b,onPointerLeave:m},()=>r.dataset(),l))}function hc(e){const t=qn(),n=`menu-${He()}`,r=X({id:n,modal:!0},e),[o,s]=oe(r,["id","modal","preventScroll","forceMount","open","defaultOpen","onOpenChange","value","orientation"]),l=Mi({open:()=>o.open,defaultOpen:()=>o.defaultOpen,onOpenChange:i=>{var c;return(c=o.onOpenChange)==null?void 0:c.call(o,i)}}),a={isModal:()=>o.modal??!0,preventScroll:()=>o.preventScroll??a.isModal(),forceMount:()=>o.forceMount??!1,generateId:cn(()=>o.id),value:()=>o.value,orientation:()=>o.orientation??(t==null?void 0:t.orientation())??"horizontal"};return v(Ui.Provider,{value:a,get children(){return v(ss,W({get open(){return l.isOpen()},get onOpenChange(){return l.setIsOpen}},s))}})}var yc={};Ln(yc,{Root:()=>_n,Separator:()=>vc});function _n(e){let t;const n=X({orientation:"horizontal"},e),[r,o]=oe(n,["ref","orientation"]),s=In(()=>t,()=>"hr");return v(fe,W({as:"hr",ref(l){const a=Me(i=>t=i,r.ref);typeof a=="function"&&a(l)},get role(){return s()!=="hr"?"separator":void 0},get"aria-orientation"(){return r.orientation==="vertical"?"vertical":void 0},get"data-orientation"(){return r.orientation}},o))}var vc=_n,ae={};Ln(ae,{Arrow:()=>$r,CheckboxItem:()=>Vi,Content:()=>cs,DropdownMenu:()=>mc,Group:()=>kr,GroupLabel:()=>Yi,Icon:()=>Xi,Item:()=>Zi,ItemDescription:()=>Ji,ItemIndicator:()=>es,ItemLabel:()=>ts,Portal:()=>ns,RadioGroup:()=>os,RadioItem:()=>is,Root:()=>ds,Separator:()=>_n,Sub:()=>ls,SubContent:()=>as,SubTrigger:()=>us,Trigger:()=>Gi});function cs(e){const t=tt(),n=yt(),[r,o]=oe(e,["onCloseAutoFocus","onInteractOutside"]);let s=!1;return v(lc,W({onCloseAutoFocus:i=>{var c;(c=r.onCloseAutoFocus)==null||c.call(r,i),s||De(n.triggerRef()),s=!1,i.preventDefault()},onInteractOutside:i=>{var c;(c=r.onInteractOutside)==null||c.call(r,i),(!t.isModal()||i.detail.isContextMenu)&&(s=!0)}},o))}function ds(e){const t=`dropdownmenu-${He()}`,n=X({id:t},e);return v(hc,n)}var mc=Object.assign(ds,{Arrow:$r,CheckboxItem:Vi,Content:cs,Group:kr,GroupLabel:Yi,Icon:Xi,Item:Zi,ItemDescription:Ji,ItemIndicator:es,ItemLabel:ts,Portal:ns,RadioGroup:os,RadioItem:is,Separator:_n,Sub:ls,SubContent:as,SubTrigger:us,Trigger:Gi}),S={colors:{inherit:"inherit",current:"currentColor",transparent:"transparent",black:"#000000",white:"#ffffff",neutral:{50:"#f9fafb",100:"#f2f4f7",200:"#eaecf0",300:"#d0d5dd",400:"#98a2b3",500:"#667085",600:"#475467",700:"#344054",800:"#1d2939",900:"#101828"},darkGray:{50:"#525c7a",100:"#49536e",200:"#414962",300:"#394056",400:"#313749",500:"#292e3d",600:"#212530",700:"#191c24",800:"#111318",900:"#0b0d10"},gray:{50:"#f9fafb",100:"#f2f4f7",200:"#eaecf0",300:"#d0d5dd",400:"#98a2b3",500:"#667085",600:"#475467",700:"#344054",800:"#1d2939",900:"#101828"},blue:{25:"#F5FAFF",50:"#EFF8FF",100:"#D1E9FF",200:"#B2DDFF",300:"#84CAFF",400:"#53B1FD",500:"#2E90FA",600:"#1570EF",700:"#175CD3",800:"#1849A9",900:"#194185"},green:{25:"#F6FEF9",50:"#ECFDF3",100:"#D1FADF",200:"#A6F4C5",300:"#6CE9A6",400:"#32D583",500:"#12B76A",600:"#039855",700:"#027A48",800:"#05603A",900:"#054F31"},red:{50:"#fef2f2",100:"#fee2e2",200:"#fecaca",300:"#fca5a5",400:"#f87171",500:"#ef4444",600:"#dc2626",700:"#b91c1c",800:"#991b1b",900:"#7f1d1d",950:"#450a0a"},yellow:{25:"#FFFCF5",50:"#FFFAEB",100:"#FEF0C7",200:"#FEDF89",300:"#FEC84B",400:"#FDB022",500:"#F79009",600:"#DC6803",700:"#B54708",800:"#93370D",900:"#7A2E0E"},purple:{25:"#FAFAFF",50:"#F4F3FF",100:"#EBE9FE",200:"#D9D6FE",300:"#BDB4FE",400:"#9B8AFB",500:"#7A5AF8",600:"#6938EF",700:"#5925DC",800:"#4A1FB8",900:"#3E1C96"},teal:{25:"#F6FEFC",50:"#F0FDF9",100:"#CCFBEF",200:"#99F6E0",300:"#5FE9D0",400:"#2ED3B7",500:"#15B79E",600:"#0E9384",700:"#107569",800:"#125D56",900:"#134E48"},pink:{25:"#fdf2f8",50:"#fce7f3",100:"#fbcfe8",200:"#f9a8d4",300:"#f472b6",400:"#ec4899",500:"#db2777",600:"#be185d",700:"#9d174d",800:"#831843",900:"#500724"},cyan:{25:"#ecfeff",50:"#cffafe",100:"#a5f3fc",200:"#67e8f9",300:"#22d3ee",400:"#06b6d4",500:"#0891b2",600:"#0e7490",700:"#155e75",800:"#164e63",900:"#083344"}},alpha:{90:"e5",80:"cc"},font:{size:{xs:"calc(var(--tsqd-font-size) * 0.75)",sm:"calc(var(--tsqd-font-size) * 0.875)",md:"var(--tsqd-font-size)"},lineHeight:{xs:"calc(var(--tsqd-font-size) * 1)",sm:"calc(var(--tsqd-font-size) * 1.25)",md:"calc(var(--tsqd-font-size) * 1.5)"},weight:{medium:"500",semibold:"600",bold:"700"}},border:{radius:{xs:"calc(var(--tsqd-font-size) * 0.125)",sm:"calc(var(--tsqd-font-size) * 0.25)",full:"9999px"}},size:{.25:"calc(var(--tsqd-font-size) * 0.0625)",.5:"calc(var(--tsqd-font-size) * 0.125)",1:"calc(var(--tsqd-font-size) * 0.25)",1.5:"calc(var(--tsqd-font-size) * 0.375)",2:"calc(var(--tsqd-font-size) * 0.5)",2.5:"calc(var(--tsqd-font-size) * 0.625)",3:"calc(var(--tsqd-font-size) * 0.75)",3.5:"calc(var(--tsqd-font-size) * 0.875)",4:"calc(var(--tsqd-font-size) * 1)",4.5:"calc(var(--tsqd-font-size) * 1.125)",5:"calc(var(--tsqd-font-size) * 1.25)",6:"calc(var(--tsqd-font-size) * 1.5)",6.5:"calc(var(--tsqd-font-size) * 1.625)",14:"calc(var(--tsqd-font-size) * 3.5)"},shadow:{xs:(e="rgb(0 0 0 / 0.1)")=>"0 1px 2px 0 rgb(0 0 0 / 0.05)",sm:(e="rgb(0 0 0 / 0.1)")=>`0 1px 3px 0 ${e}, 0 1px 2px -1px ${e}`,md:(e="rgb(0 0 0 / 0.1)")=>`0 4px 6px -1px ${e}, 0 2px 4px -2px ${e}`,lg:(e="rgb(0 0 0 / 0.1)")=>`0 10px 15px -3px ${e}, 0 4px 6px -4px ${e}`,xl:(e="rgb(0 0 0 / 0.1)")=>`0 20px 25px -5px ${e}, 0 8px 10px -6px ${e}`,"2xl":(e="rgb(0 0 0 / 0.25)")=>`0 25px 50px -12px ${e}`,inner:(e="rgb(0 0 0 / 0.05)")=>`inset 0 2px 4px 0 ${e}`,none:()=>"none"}},bc=q('<svg width=14 height=14 viewBox="0 0 14 14"fill=none xmlns=http://www.w3.org/2000/svg><path d="M13 13L9.00007 9M10.3333 5.66667C10.3333 8.244 8.244 10.3333 5.66667 10.3333C3.08934 10.3333 1 8.244 1 5.66667C1 3.08934 3.08934 1 5.66667 1C8.244 1 10.3333 3.08934 10.3333 5.66667Z"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>'),pc=q('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M9 3H15M3 6H21M19 6L18.2987 16.5193C18.1935 18.0975 18.1409 18.8867 17.8 19.485C17.4999 20.0118 17.0472 20.4353 16.5017 20.6997C15.882 21 15.0911 21 13.5093 21H10.4907C8.90891 21 8.11803 21 7.49834 20.6997C6.95276 20.4353 6.50009 20.0118 6.19998 19.485C5.85911 18.8867 5.8065 18.0975 5.70129 16.5193L5 6M10 10.5V15.5M14 10.5V15.5"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),wc=q('<svg width=10 height=6 viewBox="0 0 10 6"fill=none xmlns=http://www.w3.org/2000/svg><path d="M1 1L5 5L9 1"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>'),xc=q('<svg width=12 height=12 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg><path d="M8 13.3333V2.66667M8 2.66667L4 6.66667M8 2.66667L12 6.66667"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>'),Er=q('<svg width=12 height=12 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg><path d="M8 2.66667V13.3333M8 13.3333L4 9.33333M8 13.3333L12 9.33333"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>'),$c=q('<svg viewBox="0 0 24 24"height=12 width=12 fill=none xmlns=http://www.w3.org/2000/svg><path d="M12 2v2m0 16v2M4 12H2m4.314-5.686L4.9 4.9m12.786 1.414L19.1 4.9M6.314 17.69 4.9 19.104m12.786-1.414 1.414 1.414M22 12h-2m-3 0a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Cc=q('<svg viewBox="0 0 24 24"height=12 width=12 fill=none xmlns=http://www.w3.org/2000/svg><path d="M22 15.844a10.424 10.424 0 0 1-4.306.925c-5.779 0-10.463-4.684-10.463-10.462 0-1.536.33-2.994.925-4.307A10.464 10.464 0 0 0 2 11.538C2 17.316 6.684 22 12.462 22c4.243 0 7.896-2.526 9.538-6.156Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Sc=q('<svg viewBox="0 0 24 24"height=12 width=12 fill=none xmlns=http://www.w3.org/2000/svg><path d="M8 21h8m-4-4v4m-5.2-4h10.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C22 14.72 22 13.88 22 12.2V7.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C19.72 3 18.88 3 17.2 3H6.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C2 5.28 2 6.12 2 7.8v4.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C4.28 17 5.12 17 6.8 17Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),kc=q('<svg stroke=currentColor fill=currentColor stroke-width=0 viewBox="0 0 24 24"height=1em width=1em xmlns=http://www.w3.org/2000/svg><path fill=none d="M0 0h24v24H0z"></path><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z">'),Ec=q('<svg stroke-width=0 viewBox="0 0 24 24"height=1em width=1em xmlns=http://www.w3.org/2000/svg><path fill=none d="M24 .01c0-.01 0-.01 0 0L0 0v24h24V.01zM0 0h24v24H0V0zm0 0h24v24H0V0z"></path><path d="M22.99 9C19.15 5.16 13.8 3.76 8.84 4.78l2.52 2.52c3.47-.17 6.99 1.05 9.63 3.7l2-2zm-4 4a9.793 9.793 0 00-4.49-2.56l3.53 3.53.96-.97zM2 3.05L5.07 6.1C3.6 6.82 2.22 7.78 1 9l1.99 2c1.24-1.24 2.67-2.16 4.2-2.77l2.24 2.24A9.684 9.684 0 005 13v.01L6.99 15a7.042 7.042 0 014.92-2.06L18.98 20l1.27-1.26L3.29 1.79 2 3.05zM9 17l3 3 3-3a4.237 4.237 0 00-6 0z">'),Dc=q('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M9.3951 19.3711L9.97955 20.6856C10.1533 21.0768 10.4368 21.4093 10.7958 21.6426C11.1547 21.8759 11.5737 22.0001 12.0018 22C12.4299 22.0001 12.8488 21.8759 13.2078 21.6426C13.5667 21.4093 13.8503 21.0768 14.024 20.6856L14.6084 19.3711C14.8165 18.9047 15.1664 18.5159 15.6084 18.26C16.0532 18.0034 16.5678 17.8941 17.0784 17.9478L18.5084 18.1C18.9341 18.145 19.3637 18.0656 19.7451 17.8713C20.1265 17.6771 20.4434 17.3763 20.6573 17.0056C20.8715 16.635 20.9735 16.2103 20.9511 15.7829C20.9286 15.3555 20.7825 14.9438 20.5307 14.5978L19.684 13.4344C19.3825 13.0171 19.2214 12.5148 19.224 12C19.2239 11.4866 19.3865 10.9864 19.6884 10.5711L20.5351 9.40778C20.787 9.06175 20.933 8.65007 20.9555 8.22267C20.978 7.79528 20.8759 7.37054 20.6618 7C20.4479 6.62923 20.131 6.32849 19.7496 6.13423C19.3681 5.93997 18.9386 5.86053 18.5129 5.90556L17.0829 6.05778C16.5722 6.11141 16.0577 6.00212 15.6129 5.74556C15.17 5.48825 14.82 5.09736 14.6129 4.62889L14.024 3.31444C13.8503 2.92317 13.5667 2.59072 13.2078 2.3574C12.8488 2.12408 12.4299 1.99993 12.0018 2C11.5737 1.99993 11.1547 2.12408 10.7958 2.3574C10.4368 2.59072 10.1533 2.92317 9.97955 3.31444L9.3951 4.62889C9.18803 5.09736 8.83798 5.48825 8.3951 5.74556C7.95032 6.00212 7.43577 6.11141 6.9251 6.05778L5.49066 5.90556C5.06499 5.86053 4.6354 5.93997 4.25397 6.13423C3.87255 6.32849 3.55567 6.62923 3.34177 7C3.12759 7.37054 3.02555 7.79528 3.04804 8.22267C3.07052 8.65007 3.21656 9.06175 3.46844 9.40778L4.3151 10.5711C4.61704 10.9864 4.77964 11.4866 4.77955 12C4.77964 12.5134 4.61704 13.0137 4.3151 13.4289L3.46844 14.5922C3.21656 14.9382 3.07052 15.3499 3.04804 15.7773C3.02555 16.2047 3.12759 16.6295 3.34177 17C3.55589 17.3706 3.8728 17.6712 4.25417 17.8654C4.63554 18.0596 5.06502 18.1392 5.49066 18.0944L6.92066 17.9422C7.43133 17.8886 7.94587 17.9979 8.39066 18.2544C8.83519 18.511 9.18687 18.902 9.3951 19.3711Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round></path><path d="M12 15C13.6568 15 15 13.6569 15 12C15 10.3431 13.6568 9 12 9C10.3431 9 8.99998 10.3431 8.99998 12C8.99998 13.6569 10.3431 15 12 15Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Ac=q('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M16 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V8M11.5 12.5L17 7M17 7H12M17 7V12M6.2 21H8.8C9.9201 21 10.4802 21 10.908 20.782C11.2843 20.5903 11.5903 20.2843 11.782 19.908C12 19.4802 12 18.9201 12 17.8V15.2C12 14.0799 12 13.5198 11.782 13.092C11.5903 12.7157 11.2843 12.4097 10.908 12.218C10.4802 12 9.92011 12 8.8 12H6.2C5.0799 12 4.51984 12 4.09202 12.218C3.71569 12.4097 3.40973 12.7157 3.21799 13.092C3 13.5198 3 14.0799 3 15.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Mc=q('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path class=copier d="M8 8V5.2C8 4.0799 8 3.51984 8.21799 3.09202C8.40973 2.71569 8.71569 2.40973 9.09202 2.21799C9.51984 2 10.0799 2 11.2 2H18.8C19.9201 2 20.4802 2 20.908 2.21799C21.2843 2.40973 21.5903 2.71569 21.782 3.09202C22 3.51984 22 4.0799 22 5.2V12.8C22 13.9201 22 14.4802 21.782 14.908C21.5903 15.2843 21.2843 15.5903 20.908 15.782C20.4802 16 19.9201 16 18.8 16H16M5.2 22H12.8C13.9201 22 14.4802 22 14.908 21.782C15.2843 21.5903 15.5903 21.2843 15.782 20.908C16 20.4802 16 19.9201 16 18.8V11.2C16 10.0799 16 9.51984 15.782 9.09202C15.5903 8.71569 15.2843 8.40973 14.908 8.21799C14.4802 8 13.9201 8 12.8 8H5.2C4.0799 8 3.51984 8 3.09202 8.21799C2.71569 8.40973 2.40973 8.71569 2.21799 9.09202C2 9.51984 2 10.0799 2 11.2V18.8C2 19.9201 2 20.4802 2.21799 20.908C2.40973 21.2843 2.71569 21.5903 3.09202 21.782C3.51984 22 4.07989 22 5.2 22Z"stroke-width=2 stroke-linecap=round stroke-linejoin=round stroke=currentColor>'),Tc=q('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M2.5 21.4998L8.04927 19.3655C8.40421 19.229 8.58168 19.1607 8.74772 19.0716C8.8952 18.9924 9.0358 18.901 9.16804 18.7984C9.31692 18.6829 9.45137 18.5484 9.72028 18.2795L21 6.99982C22.1046 5.89525 22.1046 4.10438 21 2.99981C19.8955 1.89525 18.1046 1.89524 17 2.99981L5.72028 14.2795C5.45138 14.5484 5.31692 14.6829 5.20139 14.8318C5.09877 14.964 5.0074 15.1046 4.92823 15.2521C4.83911 15.4181 4.77085 15.5956 4.63433 15.9506L2.5 21.4998ZM2.5 21.4998L4.55812 16.1488C4.7054 15.7659 4.77903 15.5744 4.90534 15.4867C5.01572 15.4101 5.1523 15.3811 5.2843 15.4063C5.43533 15.4351 5.58038 15.5802 5.87048 15.8703L8.12957 18.1294C8.41967 18.4195 8.56472 18.5645 8.59356 18.7155C8.61877 18.8475 8.58979 18.9841 8.51314 19.0945C8.42545 19.2208 8.23399 19.2944 7.85107 19.4417L2.5 21.4998Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),fs=q('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M7.5 12L10.5 15L16.5 9M7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21Z"stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Fc=q('<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M9 9L15 15M15 9L9 15M7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21Z"stroke=#F04438 stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Ic=q('<svg width=24 height=24 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 xmlns=http://www.w3.org/2000/svg><rect class=list width=20 height=20 y=2 x=2 rx=2></rect><line class=list-item y1=7 y2=7 x1=6 x2=18></line><line class=list-item y2=12 y1=12 x1=6 x2=18></line><line class=list-item y1=17 y2=17 x1=6 x2=18>'),Lc=q('<svg viewBox="0 0 24 24"height=20 width=20 fill=none xmlns=http://www.w3.org/2000/svg><path d="M3 7.8c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C5.28 3 6.12 3 7.8 3h8.4c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C21 5.28 21 6.12 21 7.8v8.4c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C18.72 21 17.88 21 16.2 21H7.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C3 18.72 3 17.88 3 16.2V7.8Z"stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Oc=q('<svg width=14 height=14 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M7.5 12L10.5 15L16.5 9M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Pc=q('<svg width=14 height=14 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.0784 19.0784L16.25 16.25M19.0784 4.99994L16.25 7.82837M4.92157 19.0784L7.75 16.25M4.92157 4.99994L7.75 7.82837"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round></path><animateTransform attributeName=transform attributeType=XML type=rotate from=0 to=360 dur=2s repeatCount=indefinite>'),qc=q('<svg width=14 height=14 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M15 9L9 15M9 9L15 15M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),_c=q('<svg width=14 height=14 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M9.5 15V9M14.5 15V9M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),Rc=q('<svg version=1.0 viewBox="0 0 633 633"><linearGradient x1=-666.45 x2=-666.45 y1=163.28 y2=163.99 gradientTransform="matrix(633 0 0 633 422177 -103358)"gradientUnits=userSpaceOnUse><stop stop-color=#6BDAFF offset=0></stop><stop stop-color=#F9FFB5 offset=.32></stop><stop stop-color=#FFA770 offset=.71></stop><stop stop-color=#FF7373 offset=1></stop></linearGradient><circle cx=316.5 cy=316.5 r=316.5></circle><defs><filter x=-137.5 y=412 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=-137.5 y=412 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=89.5 cy=610.5 rx=214.5 ry=186 fill=#015064 stroke=#00CFE2 stroke-width=25></ellipse></g><defs><filter x=316.5 y=412 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=316.5 y=412 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=543.5 cy=610.5 rx=214.5 ry=186 fill=#015064 stroke=#00CFE2 stroke-width=25></ellipse></g><defs><filter x=-137.5 y=450 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=-137.5 y=450 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=89.5 cy=648.5 rx=214.5 ry=186 fill=#015064 stroke=#00A8B8 stroke-width=25></ellipse></g><defs><filter x=316.5 y=450 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=316.5 y=450 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=543.5 cy=648.5 rx=214.5 ry=186 fill=#015064 stroke=#00A8B8 stroke-width=25></ellipse></g><defs><filter x=-137.5 y=486 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=-137.5 y=486 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=89.5 cy=684.5 rx=214.5 ry=186 fill=#015064 stroke=#007782 stroke-width=25></ellipse></g><defs><filter x=316.5 y=486 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=316.5 y=486 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=543.5 cy=684.5 rx=214.5 ry=186 fill=#015064 stroke=#007782 stroke-width=25></ellipse></g><defs><filter x=272.2 y=308 width=176.9 height=129.3 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=272.2 y=308 width=176.9 height=129.3 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><line x1=436 x2=431 y1=403.2 y2=431.8 fill=none stroke=#000 stroke-linecap=round stroke-linejoin=bevel stroke-width=11></line><line x1=291 x2=280 y1=341.5 y2=403.5 fill=none stroke=#000 stroke-linecap=round stroke-linejoin=bevel stroke-width=11></line><line x1=332.9 x2=328.6 y1=384.1 y2=411.2 fill=none stroke=#000 stroke-linecap=round stroke-linejoin=bevel stroke-width=11></line><linearGradient x1=-670.75 x2=-671.59 y1=164.4 y2=164.49 gradientTransform="matrix(-184.16 -32.472 -11.461 64.997 -121359 -32126)"gradientUnits=userSpaceOnUse><stop stop-color=#EE2700 offset=0></stop><stop stop-color=#FF008E offset=1></stop></linearGradient><path d="m344.1 363 97.7 17.2c5.8 2.1 8.2 6.1 7.1 12.1s-4.7 9.2-11 9.9l-106-18.7-57.5-59.2c-3.2-4.8-2.9-9.1 0.8-12.8s8.3-4.4 13.7-2.1l55.2 53.6z"clip-rule=evenodd fill-rule=evenodd></path><line x1=428.2 x2=429.1 y1=384.5 y2=378 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line><line x1=395.2 x2=396.1 y1=379.5 y2=373 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line><line x1=362.2 x2=363.1 y1=373.5 y2=367.4 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line><line x1=324.2 x2=328.4 y1=351.3 y2=347.4 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line><line x1=303.2 x2=307.4 y1=331.3 y2=327.4 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line></g><defs><filter x=73.2 y=113.8 width=280.6 height=317.4 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=73.2 y=113.8 width=280.6 height=317.4 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><linearGradient x1=-672.16 x2=-672.16 y1=165.03 y2=166.03 gradientTransform="matrix(-100.18 48.861 97.976 200.88 -83342 -93.059)"gradientUnits=userSpaceOnUse><stop stop-color=#A17500 offset=0></stop><stop stop-color=#5D2100 offset=1></stop></linearGradient><path d="m192.3 203c8.1 37.3 14 73.6 17.8 109.1 3.8 35.4 2.8 75.1-3 119.2l61.2-16.7c-15.6-59-25.2-97.9-28.6-116.6s-10.8-51.9-22.1-99.6l-25.3 4.6"clip-rule=evenodd fill-rule=evenodd></path><g stroke=#2F8A00><linearGradient x1=-660.23 x2=-660.23 y1=166.72 y2=167.72 gradientTransform="matrix(92.683 4.8573 -2.0259 38.657 61680 -3088.6)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m195 183.9s-12.6-22.1-36.5-29.9c-15.9-5.2-34.4-1.5-55.5 11.1 15.9 14.3 29.5 22.6 40.7 24.9 16.8 3.6 51.3-6.1 51.3-6.1z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-661.36 x2=-661.36 y1=164.18 y2=165.18 gradientTransform="matrix(110 5.7648 -6.3599 121.35 73933 -15933)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m194.9 184.5s-47.5-8.5-83.2 15.7c-23.8 16.2-34.3 49.3-31.6 99.4 30.3-27.8 52.1-48.5 65.2-61.9 19.8-20.2 49.6-53.2 49.6-53.2z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-656.79 x2=-656.79 y1=165.15 y2=166.15 gradientTransform="matrix(62.954 3.2993 -3.5023 66.828 42156 -8754.1)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m195 183.9c-0.8-21.9 6-38 20.6-48.2s29.8-15.4 45.5-15.3c-6.1 21.4-14.5 35.8-25.2 43.4s-24.4 14.2-40.9 20.1z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-663.07 x2=-663.07 y1=165.44 y2=166.44 gradientTransform="matrix(152.47 7.9907 -3.0936 59.029 101884 -4318.7)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m194.9 184.5c31.9-30 64.1-39.7 96.7-29s50.8 30.4 54.6 59.1c-35.2-5.5-60.4-9.6-75.8-12.1-15.3-2.6-40.5-8.6-75.5-18z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-662.57 x2=-662.57 y1=164.44 y2=165.44 gradientTransform="matrix(136.46 7.1517 -5.2163 99.533 91536 -11442)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m194.9 184.5c35.8-7.6 65.6-0.2 89.2 22s37.7 49 42.3 80.3c-39.8-9.7-68.3-23.8-85.5-42.4s-32.5-38.5-46-59.9z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-656.43 x2=-656.43 y1=163.86 y2=164.86 gradientTransform="matrix(60.866 3.1899 -8.7773 167.48 41560 -25168)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m194.9 184.5c-33.6 13.8-53.6 35.7-60.1 65.6s-3.6 63.1 8.7 99.6c27.4-40.3 43.2-69.6 47.4-88s5.6-44.1 4-77.2z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><path d="m196.5 182.3c-14.8 21.6-25.1 41.4-30.8 59.4s-9.5 33-11.1 45.1"fill=none stroke-linecap=round stroke-width=8></path><path d="m194.9 185.7c-24.4 1.7-43.8 9-58.1 21.8s-24.7 25.4-31.3 37.8"fill=none stroke-linecap=round stroke-width=8></path><path d="m204.5 176.4c29.7-6.7 52-8.4 67-5.1s26.9 8.6 35.8 15.9"fill=none stroke-linecap=round stroke-width=8></path><path d="m196.5 181.4c20.3 9.9 38.2 20.5 53.9 31.9s27.4 22.1 35.1 32"fill=none stroke-linecap=round stroke-width=8></path></g></g><defs><filter x=50.5 y=399 width=532 height=633 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=50.5 y=399 width=532 height=633 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><linearGradient x1=-666.06 x2=-666.23 y1=163.36 y2=163.75 gradientTransform="matrix(532 0 0 633 354760 -102959)"gradientUnits=userSpaceOnUse><stop stop-color=#FFF400 offset=0></stop><stop stop-color=#3C8700 offset=1></stop></linearGradient><ellipse cx=316.5 cy=715.5 rx=266 ry=316.5></ellipse></g><defs><filter x=391 y=-24 width=288 height=283 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=391 y=-24 width=288 height=283 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><linearGradient x1=-664.56 x2=-664.56 y1=163.79 y2=164.79 gradientTransform="matrix(227 0 0 227 151421 -37204)"gradientUnits=userSpaceOnUse><stop stop-color=#FFDF00 offset=0></stop><stop stop-color=#FF9D00 offset=1></stop></linearGradient><circle cx=565.5 cy=89.5 r=113.5></circle><linearGradient x1=-644.5 x2=-645.77 y1=342 y2=342 gradientTransform="matrix(30 0 0 1 19770 -253)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=427 x2=397 y1=89 y2=89 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-641.56 x2=-642.83 y1=196.02 y2=196.07 gradientTransform="matrix(26.5 0 0 5.5 17439 -1025.5)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=430.5 x2=404 y1=55.5 y2=50 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-643.73 x2=-645 y1=185.83 y2=185.9 gradientTransform="matrix(29 0 0 8 19107 -1361)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=431 x2=402 y1=122 y2=130 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-638.94 x2=-640.22 y1=177.09 y2=177.39 gradientTransform="matrix(24 0 0 13 15783 -2145)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=442 x2=418 y1=153 y2=166 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-633.42 x2=-634.7 y1=172.41 y2=173.31 gradientTransform="matrix(20 0 0 19 13137 -3096)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=464 x2=444 y1=180 y2=199 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-619.05 x2=-619.52 y1=170.82 y2=171.82 gradientTransform="matrix(13.83 0 0 22.85 9050 -3703.4)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=491.4 x2=477.5 y1=203 y2=225.9 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-578.5 x2=-578.63 y1=170.31 y2=171.31 gradientTransform="matrix(7.5 0 0 24.5 4860 -3953)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=524.5 x2=517 y1=219.5 y2=244 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=666.5 x2=666.5 y1=170.31 y2=171.31 gradientTransform="matrix(.5 0 0 24.5 231.5 -3944)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=564.5 x2=565 y1=228.5 y2=253 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12>');function zc(){return bc()}function gs(){return pc()}function Kt(){return wc()}function Mo(){return xc()}function To(){return Er()}function Kc(){return(()=>{var e=Er();return e.style.setProperty("transform","rotate(90deg)"),e})()}function Bc(){return(()=>{var e=Er();return e.style.setProperty("transform","rotate(-90deg)"),e})()}function Nc(){return $c()}function Hc(){return Cc()}function Uc(){return Sc()}function Vc(){return kc()}function Gc(){return Ec()}function jc(){return Dc()}function Wc(){return Ac()}function Qc(){return Mc()}function Yc(){return Tc()}function Xc(e){return(()=>{var t=fs(),n=t.firstChild;return V(()=>M(n,"stroke",e.theme==="dark"?"#12B76A":"#027A48")),t})()}function Zc(){return Fc()}function Jc(){return Ic()}function ed(e){return[v(z,{get when(){return e.checked},get children(){var t=fs(),n=t.firstChild;return V(()=>M(n,"stroke",e.theme==="dark"?"#9B8AFB":"#6938EF")),t}}),v(z,{get when(){return!e.checked},get children(){var t=Lc(),n=t.firstChild;return V(()=>M(n,"stroke",e.theme==="dark"?"#9B8AFB":"#6938EF")),t}})]}function ir(){return Oc()}function td(){return Pc()}function nd(){return qc()}function rd(){return _c()}function Fo(){const e=He();return(()=>{var t=Rc(),n=t.firstChild,r=n.nextSibling,o=r.nextSibling,s=o.firstChild,l=o.nextSibling,a=l.firstChild,i=l.nextSibling,c=i.nextSibling,h=c.firstChild,f=c.nextSibling,u=f.firstChild,g=f.nextSibling,d=g.nextSibling,y=d.firstChild,b=d.nextSibling,m=b.firstChild,p=b.nextSibling,w=p.nextSibling,x=w.firstChild,$=w.nextSibling,P=$.firstChild,F=$.nextSibling,_=F.nextSibling,C=_.firstChild,A=_.nextSibling,B=A.firstChild,U=A.nextSibling,ne=U.nextSibling,Z=ne.firstChild,se=ne.nextSibling,R=se.firstChild,Q=se.nextSibling,J=Q.nextSibling,ue=J.firstChild,ve=J.nextSibling,Te=ve.firstChild,he=ve.nextSibling,Ae=he.firstChild,D=Ae.nextSibling,ge=D.nextSibling,ee=ge.nextSibling,vt=ee.nextSibling,j=he.nextSibling,Se=j.firstChild,ke=j.nextSibling,Lt=ke.firstChild,qe=ke.nextSibling,mt=qe.firstChild,kt=mt.nextSibling,nt=kt.nextSibling,Ye=nt.firstChild,rt=Ye.nextSibling,I=rt.nextSibling,te=I.nextSibling,me=te.nextSibling,ie=me.nextSibling,le=ie.nextSibling,ce=le.nextSibling,be=ce.nextSibling,re=be.nextSibling,ot=re.nextSibling,it=ot.nextSibling,Ue=qe.nextSibling,Et=Ue.firstChild,st=Ue.nextSibling,Dt=st.firstChild,lt=st.nextSibling,bt=lt.firstChild,yn=bt.nextSibling,Qt=lt.nextSibling,vn=Qt.firstChild,Ot=Qt.nextSibling,mn=Ot.firstChild,Yt=Ot.nextSibling,Xt=Yt.firstChild,Zt=Xt.nextSibling,Pt=Zt.nextSibling,Dr=Pt.nextSibling,Ar=Dr.nextSibling,Mr=Ar.nextSibling,Tr=Mr.nextSibling,Fr=Tr.nextSibling,Ir=Fr.nextSibling,Lr=Ir.nextSibling,Or=Lr.nextSibling,Pr=Or.nextSibling,qr=Pr.nextSibling,_r=qr.nextSibling,Rr=_r.nextSibling,zr=Rr.nextSibling,Kr=zr.nextSibling,ws=Kr.nextSibling;return M(n,"id",`a-${e}`),M(r,"fill",`url(#a-${e})`),M(s,"id",`am-${e}`),M(l,"id",`b-${e}`),M(a,"filter",`url(#am-${e})`),M(i,"mask",`url(#b-${e})`),M(h,"id",`ah-${e}`),M(f,"id",`k-${e}`),M(u,"filter",`url(#ah-${e})`),M(g,"mask",`url(#k-${e})`),M(y,"id",`ae-${e}`),M(b,"id",`j-${e}`),M(m,"filter",`url(#ae-${e})`),M(p,"mask",`url(#j-${e})`),M(x,"id",`ai-${e}`),M($,"id",`i-${e}`),M(P,"filter",`url(#ai-${e})`),M(F,"mask",`url(#i-${e})`),M(C,"id",`aj-${e}`),M(A,"id",`h-${e}`),M(B,"filter",`url(#aj-${e})`),M(U,"mask",`url(#h-${e})`),M(Z,"id",`ag-${e}`),M(se,"id",`g-${e}`),M(R,"filter",`url(#ag-${e})`),M(Q,"mask",`url(#g-${e})`),M(ue,"id",`af-${e}`),M(ve,"id",`f-${e}`),M(Te,"filter",`url(#af-${e})`),M(he,"mask",`url(#f-${e})`),M(ee,"id",`m-${e}`),M(vt,"fill",`url(#m-${e})`),M(Se,"id",`ak-${e}`),M(ke,"id",`e-${e}`),M(Lt,"filter",`url(#ak-${e})`),M(qe,"mask",`url(#e-${e})`),M(mt,"id",`n-${e}`),M(kt,"fill",`url(#n-${e})`),M(Ye,"id",`r-${e}`),M(rt,"fill",`url(#r-${e})`),M(I,"id",`s-${e}`),M(te,"fill",`url(#s-${e})`),M(me,"id",`q-${e}`),M(ie,"fill",`url(#q-${e})`),M(le,"id",`p-${e}`),M(ce,"fill",`url(#p-${e})`),M(be,"id",`o-${e}`),M(re,"fill",`url(#o-${e})`),M(ot,"id",`l-${e}`),M(it,"fill",`url(#l-${e})`),M(Et,"id",`al-${e}`),M(st,"id",`d-${e}`),M(Dt,"filter",`url(#al-${e})`),M(lt,"mask",`url(#d-${e})`),M(bt,"id",`u-${e}`),M(yn,"fill",`url(#u-${e})`),M(vn,"id",`ad-${e}`),M(Ot,"id",`c-${e}`),M(mn,"filter",`url(#ad-${e})`),M(Yt,"mask",`url(#c-${e})`),M(Xt,"id",`t-${e}`),M(Zt,"fill",`url(#t-${e})`),M(Pt,"id",`v-${e}`),M(Dr,"stroke",`url(#v-${e})`),M(Ar,"id",`aa-${e}`),M(Mr,"stroke",`url(#aa-${e})`),M(Tr,"id",`w-${e}`),M(Fr,"stroke",`url(#w-${e})`),M(Ir,"id",`ac-${e}`),M(Lr,"stroke",`url(#ac-${e})`),M(Or,"id",`ab-${e}`),M(Pr,"stroke",`url(#ab-${e})`),M(qr,"id",`y-${e}`),M(_r,"stroke",`url(#y-${e})`),M(Rr,"id",`x-${e}`),M(zr,"stroke",`url(#x-${e})`),M(Kr,"id",`z-${e}`),M(ws,"stroke",`url(#z-${e})`),t})()}var od=q('<span><svg width=16 height=16 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg><path d="M6 12L10 8L6 4"stroke-width=2 stroke-linecap=round stroke-linejoin=round>'),id=q('<button title="Copy object to clipboard">'),sd=q('<button title="Remove all items"aria-label="Remove all items">'),ld=q('<button title="Delete item"aria-label="Delete item">'),ad=q('<button title="Toggle value"aria-label="Toggle value">'),ud=q('<button title="Bulk Edit Data"aria-label="Bulk Edit Data">'),tn=q("<div>"),cd=q("<div><button> <span></span> <span> "),dd=q("<input>"),Io=q("<span>"),fd=q("<div><span>:"),gd=q("<div><div><button> [<!>...<!>]");function hd(e,t){let n=0;const r=[];for(;n<e.length;)r.push(e.slice(n,n+t)),n=n+t;return r}var Lo=e=>{const t=Ce(),n=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,r=O(()=>t()==="dark"?Wt(n):jt(n));return(()=>{var o=od();return V(()=>T(o,L(r().expander,n`
          transform: rotate(${e.expanded?90:0}deg);
        `,e.expanded&&n`
            & svg {
              top: -1px;
            }
          `))),o})()},yd=e=>{const t=Ce(),n=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,r=O(()=>t()==="dark"?Wt(n):jt(n)),[o,s]=K("NoCopy");return(()=>{var l=id();return Ls(l,"click",o()==="NoCopy"?()=>{navigator.clipboard.writeText(Os(e.value)).then(()=>{s("SuccessCopy"),setTimeout(()=>{s("NoCopy")},1500)},a=>{console.error("Failed to copy: ",a),s("ErrorCopy"),setTimeout(()=>{s("NoCopy")},1500)})}:void 0,!0),k(l,v(Ps,{get children(){return[v(Kn,{get when(){return o()==="NoCopy"},get children(){return v(Qc,{})}}),v(Kn,{get when(){return o()==="SuccessCopy"},get children(){return v(Xc,{get theme(){return t()}})}}),v(Kn,{get when(){return o()==="ErrorCopy"},get children(){return v(Zc,{})}})]}})),V(a=>{var i=r().actionButton,c=`${o()==="NoCopy"?"Copy object to clipboard":o()==="SuccessCopy"?"Object copied to clipboard":"Error copying object to clipboard"}`;return i!==a.e&&T(l,a.e=i),c!==a.t&&M(l,"aria-label",a.t=c),a},{e:void 0,t:void 0}),l})()},vd=e=>{const t=Ce(),n=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,r=O(()=>t()==="dark"?Wt(n):jt(n)),o=N().client;return(()=>{var s=sd();return s.$$click=()=>{const l=e.activeQuery.state.data,a=lr(l,e.dataPath,[]);o.setQueryData(e.activeQuery.queryKey,a)},k(s,v(Jc,{})),V(()=>T(s,r().actionButton)),s})()},Oo=e=>{const t=Ce(),n=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,r=O(()=>t()==="dark"?Wt(n):jt(n)),o=N().client;return(()=>{var s=ld();return s.$$click=()=>{const l=e.activeQuery.state.data,a=qs(l,e.dataPath);o.setQueryData(e.activeQuery.queryKey,a)},k(s,v(gs,{})),V(()=>T(s,L(r().actionButton))),s})()},md=e=>{const t=Ce(),n=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,r=O(()=>t()==="dark"?Wt(n):jt(n)),o=N().client;return(()=>{var s=ad();return s.$$click=()=>{const l=e.activeQuery.state.data,a=lr(l,e.dataPath,!e.value);o.setQueryData(e.activeQuery.queryKey,a)},k(s,v(ed,{get theme(){return t()},get checked(){return e.value}})),V(()=>T(s,L(r().actionButton,n`
          width: ${S.size[3.5]};
          height: ${S.size[3.5]};
        `))),s})()};function Po(e){return Symbol.iterator in e}function pt(e){const t=Ce(),n=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,r=O(()=>t()==="dark"?Wt(n):jt(n)),o=N().client,[s,l]=K((e.defaultExpanded||[]).includes(e.label)),a=()=>l(d=>!d),[i,c]=K([]),h=O(()=>Array.isArray(e.value)?e.value.map((d,y)=>({label:y.toString(),value:d})):e.value!==null&&typeof e.value=="object"&&Po(e.value)&&typeof e.value[Symbol.iterator]=="function"?e.value instanceof Map?Array.from(e.value,([d,y])=>({label:d,value:y})):Array.from(e.value,(d,y)=>({label:y.toString(),value:d})):typeof e.value=="object"&&e.value!==null?Object.entries(e.value).map(([d,y])=>({label:d,value:y})):[]),f=O(()=>Array.isArray(e.value)?"array":e.value!==null&&typeof e.value=="object"&&Po(e.value)&&typeof e.value[Symbol.iterator]=="function"?"Iterable":typeof e.value=="object"&&e.value!==null?"object":typeof e.value),u=O(()=>hd(h(),100)),g=e.dataPath??[];return(()=>{var d=tn();return k(d,v(z,{get when(){return u().length},get children(){return[(()=>{var y=cd(),b=y.firstChild,m=b.firstChild,p=m.nextSibling,w=p.nextSibling,x=w.nextSibling,$=x.firstChild;return b.$$click=()=>a(),k(b,v(Lo,{get expanded(){return s()}}),m),k(p,()=>e.label),k(x,()=>String(f()).toLowerCase()==="iterable"?"(Iterable) ":"",$),k(x,()=>h().length,$),k(x,()=>h().length>1?"items":"item",null),k(y,v(z,{get when(){return e.editable},get children(){var P=tn();return k(P,v(yd,{get value(){return e.value}}),null),k(P,v(z,{get when(){return e.itemsDeletable&&e.activeQuery!==void 0},get children(){return v(Oo,{get activeQuery(){return e.activeQuery},dataPath:g})}}),null),k(P,v(z,{get when(){return f()==="array"&&e.activeQuery!==void 0},get children(){return v(vd,{get activeQuery(){return e.activeQuery},dataPath:g})}}),null),k(P,v(z,{get when(){return ye(()=>!!e.onEdit)()&&!Fs(e.value).meta},get children(){var F=ud();return F.$$click=()=>{var _;(_=e.onEdit)==null||_.call(e)},k(F,v(Yc,{})),V(()=>T(F,r().actionButton)),F}}),null),V(()=>T(P,r().actions)),P}}),null),V(P=>{var F=r().expanderButtonContainer,_=r().expanderButton,C=r().info;return F!==P.e&&T(y,P.e=F),_!==P.t&&T(b,P.t=_),C!==P.a&&T(x,P.a=C),P},{e:void 0,t:void 0,a:void 0}),y})(),v(z,{get when(){return s()},get children(){return[v(z,{get when(){return u().length===1},get children(){var y=tn();return k(y,v($n,{get each(){return h()},by:b=>b.label,children:b=>v(pt,{get defaultExpanded(){return e.defaultExpanded},get label(){return b().label},get value(){return b().value},get editable(){return e.editable},get dataPath(){return[...g,b().label]},get activeQuery(){return e.activeQuery},get itemsDeletable(){return f()==="array"||f()==="Iterable"||f()==="object"}})})),V(()=>T(y,r().subEntry)),y}}),v(z,{get when(){return u().length>1},get children(){var y=tn();return k(y,v(Is,{get each(){return u()},children:(b,m)=>(()=>{var p=gd(),w=p.firstChild,x=w.firstChild,$=x.firstChild,P=$.nextSibling,F=P.nextSibling,_=F.nextSibling;return _.nextSibling,x.$$click=()=>c(C=>C.includes(m)?C.filter(A=>A!==m):[...C,m]),k(x,v(Lo,{get expanded(){return i().includes(m)}}),$),k(x,m*100,P),k(x,m*100+100-1,_),k(w,v(z,{get when(){return i().includes(m)},get children(){var C=tn();return k(C,v($n,{get each(){return b()},by:A=>A.label,children:A=>v(pt,{get defaultExpanded(){return e.defaultExpanded},get label(){return A().label},get value(){return A().value},get editable(){return e.editable},get dataPath(){return[...g,A().label]},get activeQuery(){return e.activeQuery}})})),V(()=>T(C,r().subEntry)),C}}),null),V(C=>{var A=r().entry,B=r().expanderButton;return A!==C.e&&T(w,C.e=A),B!==C.t&&T(x,C.t=B),C},{e:void 0,t:void 0}),p})()})),V(()=>T(y,r().subEntry)),y}})]}})]}}),null),k(d,v(z,{get when(){return u().length===0},get children(){var y=fd(),b=y.firstChild,m=b.firstChild;return k(b,()=>e.label,m),k(y,v(z,{get when(){return ye(()=>!!(e.editable&&e.activeQuery!==void 0))()&&(f()==="string"||f()==="number"||f()==="boolean")},get fallback(){return(()=>{var p=Io();return k(p,()=>xn(e.value)),V(()=>T(p,r().value)),p})()},get children(){return[v(z,{get when(){return ye(()=>!!(e.editable&&e.activeQuery!==void 0))()&&(f()==="string"||f()==="number")},get children(){var p=dd();return p.addEventListener("change",w=>{const x=e.activeQuery.state.data,$=lr(x,g,f()==="number"?w.target.valueAsNumber:w.target.value);o.setQueryData(e.activeQuery.queryKey,$)}),V(w=>{var x=f()==="number"?"number":"text",$=L(r().value,r().editableInput);return x!==w.e&&M(p,"type",w.e=x),$!==w.t&&T(p,w.t=$),w},{e:void 0,t:void 0}),V(()=>p.value=e.value),p}}),v(z,{get when(){return f()==="boolean"},get children(){var p=Io();return k(p,v(md,{get activeQuery(){return e.activeQuery},dataPath:g,get value(){return e.value}}),null),k(p,()=>xn(e.value),null),V(()=>T(p,L(r().value,r().actions,r().editableInput))),p}})]}}),null),k(y,v(z,{get when(){return e.editable&&e.itemsDeletable&&e.activeQuery!==void 0},get children(){return v(Oo,{get activeQuery(){return e.activeQuery},dataPath:g})}}),null),V(p=>{var w=r().row,x=r().label;return w!==p.e&&T(y,p.e=w),x!==p.t&&T(b,p.t=x),p},{e:void 0,t:void 0}),y}}),null),V(()=>T(d,r().entry)),d})()}var hs=(e,t)=>{const{colors:n,font:r,size:o,border:s}=S,l=(a,i)=>e==="light"?a:i;return{entry:t`
      & * {
        font-size: ${r.size.xs};
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          'Liberation Mono', 'Courier New', monospace;
      }
      position: relative;
      outline: none;
      word-break: break-word;
    `,subEntry:t`
      margin: 0 0 0 0.5em;
      padding-left: 0.75em;
      border-left: 2px solid ${l(n.gray[300],n.darkGray[400])};
      /* outline: 1px solid ${n.teal[400]}; */
    `,expander:t`
      & path {
        stroke: ${n.gray[400]};
      }
      & svg {
        width: ${o[3]};
        height: ${o[3]};
      }
      display: inline-flex;
      align-items: center;
      transition: all 0.1s ease;
      /* outline: 1px solid ${n.blue[400]}; */
    `,expanderButtonContainer:t`
      display: flex;
      align-items: center;
      line-height: ${o[4]};
      min-height: ${o[4]};
      gap: ${o[2]};
    `,expanderButton:t`
      cursor: pointer;
      color: inherit;
      font: inherit;
      outline: inherit;
      height: ${o[5]};
      background: transparent;
      border: none;
      padding: 0;
      display: inline-flex;
      align-items: center;
      gap: ${o[1]};
      position: relative;
      /* outline: 1px solid ${n.green[400]}; */

      &:focus-visible {
        border-radius: ${s.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }

      & svg {
        position: relative;
        left: 1px;
      }
    `,info:t`
      color: ${l(n.gray[500],n.gray[500])};
      font-size: ${r.size.xs};
      margin-left: ${o[1]};
      /* outline: 1px solid ${n.yellow[400]}; */
    `,label:t`
      color: ${l(n.gray[700],n.gray[300])};
      white-space: nowrap;
    `,value:t`
      color: ${l(n.purple[600],n.purple[400])};
      flex-grow: 1;
    `,actions:t`
      display: inline-flex;
      gap: ${o[2]};
      align-items: center;
    `,row:t`
      display: inline-flex;
      gap: ${o[2]};
      width: 100%;
      margin: ${o[.25]} 0px;
      line-height: ${o[4.5]};
      align-items: center;
    `,editableInput:t`
      border: none;
      padding: ${o[.5]} ${o[1]} ${o[.5]} ${o[1.5]};
      flex-grow: 1;
      border-radius: ${s.radius.xs};
      background-color: ${l(n.gray[200],n.darkGray[500])};

      &:hover {
        background-color: ${l(n.gray[300],n.darkGray[600])};
      }
    `,actionButton:t`
      background-color: transparent;
      color: ${l(n.gray[500],n.gray[500])};
      border: none;
      display: inline-flex;
      padding: 0px;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      width: ${o[3]};
      height: ${o[3]};
      position: relative;
      z-index: 1;

      &:hover svg {
        color: ${l(n.gray[600],n.gray[400])};
      }

      &:focus-visible {
        border-radius: ${s.radius.xs};
        outline: 2px solid ${n.blue[800]};
        outline-offset: 2px;
      }
    `}},jt=e=>hs("light",e),Wt=e=>hs("dark",e);sr(["click"]);var bd=q('<div><div aria-hidden=true></div><button type=button aria-label="Open Tanstack query devtools"class=tsqd-open-btn>'),Rn=q("<div>"),pd=q('<aside aria-label="Tanstack query devtools"><div></div><button aria-label="Close tanstack query devtools">'),wd=q("<select name=tsqd-queries-filter-sort>"),xd=q("<select name=tsqd-mutations-filter-sort>"),$d=q("<span>Asc"),Cd=q("<span>Desc"),Sd=q('<button aria-label="Open in picture-in-picture mode"title="Open in picture-in-picture mode">'),kd=q("<div>Settings"),Ed=q("<span>Position"),Dd=q("<span>Top"),Ad=q("<span>Bottom"),Md=q("<span>Left"),Td=q("<span>Right"),Fd=q("<span>Theme"),Id=q("<span>Light"),Ld=q("<span>Dark"),Od=q("<span>System"),Pd=q("<span>Disabled Queries"),qd=q("<span>Show"),_d=q("<span>Hide"),Rd=q("<div><div class=tsqd-queries-container>"),zd=q("<div><div class=tsqd-mutations-container>"),Kd=q('<div><div><div><button aria-label="Close Tanstack query devtools"><span>TANSTACK</span><span> v</span></button></div></div><div><div><div><input aria-label="Filter queries by query key"type=text placeholder=Filter name=tsqd-query-filter-input></div><div></div><button class=tsqd-query-filter-sort-order-btn></button></div><div><button aria-label="Clear query cache"></button><button>'),qo=q("<option>Sort by "),Bd=q("<div class=tsqd-query-disabled-indicator>disabled"),Nd=q("<div class=tsqd-query-static-indicator>static"),ys=q("<button><div></div><code class=tsqd-query-hash>"),Hd=q("<div role=tooltip id=tsqd-status-tooltip>"),Ud=q("<span>"),Vd=q("<button><span></span><span>"),Gd=q("<button><span></span> Error"),jd=q('<div><span></span>Trigger Error<select><option value=""disabled selected>'),Wd=q('<div class="tsqd-query-details-explorer-container tsqd-query-details-data-explorer">'),Qd=q("<form><textarea name=data></textarea><div><span></span><div><button type=button>Cancel</button><button>Save"),Yd=q('<div><div>Query Details</div><div><div class=tsqd-query-details-summary><pre><code></code></pre><span></span></div><div class=tsqd-query-details-observers-count><span>Observers:</span><span></span></div><div class=tsqd-query-details-last-updated><span>Last Updated:</span><span></span></div></div><div>Actions</div><div><button><span></span>Refetch</button><button><span></span>Invalidate</button><button><span></span>Reset</button><button><span></span>Remove</button><button><span></span> Loading</button></div><div>Data </div><div>Query Explorer</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer">'),Xd=q("<option>"),Zd=q('<div><div>Mutation Details</div><div><div class=tsqd-query-details-summary><pre><code></code></pre><span></span></div><div class=tsqd-query-details-last-updated><span>Submitted At:</span><span></span></div></div><div>Variables Details</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer"></div><div>Context Details</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer"></div><div>Data Explorer</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer"></div><div>Mutations Explorer</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer">'),[Le,zn]=K(null),[wt,vs]=K(null),[dt,ms]=K(0),[nn,Jd]=K(!1),e0=e=>{const t=Ce(),n=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,r=O(()=>t()==="dark"?Qe(n):We(n)),o=O(()=>N().onlineManager);Mt(()=>{const f=o().subscribe(u=>{Jd(!u)});G(()=>{f()})});const s=ar(),l=O(()=>N().buttonPosition||Ys),a=O(()=>e.localStore.open==="true"?!0:e.localStore.open==="false"?!1:N().initialIsOpen||Zs),i=O(()=>e.localStore.position||N().position||Qn);let c;H(()=>{const f=c.parentElement,u=e.localStore.height||Ko,g=e.localStore.width||Bo,d=i();f.style.setProperty("--tsqd-panel-height",`${d==="top"?"-":""}${u}px`),f.style.setProperty("--tsqd-panel-width",`${d==="left"?"-":""}${g}px`)}),Mt(()=>{const f=()=>{const u=c.parentElement,g=getComputedStyle(u).fontSize;u.style.setProperty("--tsqd-font-size",g)};f(),window.addEventListener("focus",f),G(()=>{window.removeEventListener("focus",f)})});const h=O(()=>e.localStore.pip_open??"false");return[v(z,{get when(){return ye(()=>!!s().pipWindow)()&&h()=="true"},get children(){return v(_o,{get mount(){var f;return(f=s().pipWindow)==null?void 0:f.document.body},get children(){return v(t0,{get children(){return v(bs,e)}})}})}}),(()=>{var f=Rn(),u=c;return typeof u=="function"?Mn(u,f):c=f,k(f,v(Xr,{name:"tsqd-panel-transition",get children(){return v(z,{get when(){return ye(()=>!!(a()&&!s().pipWindow))()&&h()=="false"},get children(){return v(n0,{get localStore(){return e.localStore},get setLocalStore(){return e.setLocalStore}})}})}}),null),k(f,v(Xr,{name:"tsqd-button-transition",get children(){return v(z,{get when(){return!a()},get children(){var g=bd(),d=g.firstChild,y=d.nextSibling;return k(d,v(Fo,{})),y.$$click=()=>e.setLocalStore("open","true"),k(y,v(Fo,{})),V(()=>T(g,L(r().devtoolsBtn,r()[`devtoolsBtn-position-${l()}`],"tsqd-open-btn-container"))),g}})}}),null),V(()=>T(f,L(n`
            & .tsqd-panel-transition-exit-active,
            & .tsqd-panel-transition-enter-active {
              transition:
                opacity 0.3s,
                transform 0.3s;
            }

            & .tsqd-panel-transition-exit-to,
            & .tsqd-panel-transition-enter {
              ${i()==="top"||i()==="bottom"?"transform: translateY(var(--tsqd-panel-height));":"transform: translateX(var(--tsqd-panel-width));"}
            }

            & .tsqd-button-transition-exit-active,
            & .tsqd-button-transition-enter-active {
              transition:
                opacity 0.3s,
                transform 0.3s;
              opacity: 1;
            }

            & .tsqd-button-transition-exit-to,
            & .tsqd-button-transition-enter {
              transform: ${l()==="relative"?"none;":l()==="top-left"?"translateX(-72px);":l()==="top-right"?"translateX(72px);":"translateY(72px);"};
              opacity: 0;
            }
          `,"tsqd-transitions-container"))),f})()]},t0=e=>{const t=ar(),n=Ce(),r=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,o=O(()=>n()==="dark"?Qe(r):We(r)),s=()=>{const{colors:l}=S,a=(i,c)=>n()==="dark"?c:i;return dt()<Ht?r`
        flex-direction: column;
        background-color: ${a(l.gray[300],l.gray[600])};
      `:r`
      flex-direction: row;
      background-color: ${a(l.gray[200],l.darkGray[900])};
    `};return H(()=>{const l=t().pipWindow,a=()=>{l&&ms(l.innerWidth)};l&&(l.addEventListener("resize",a),a()),G(()=>{l&&l.removeEventListener("resize",a)})}),(()=>{var l=Rn();return l.style.setProperty("--tsqd-font-size","16px"),l.style.setProperty("max-height","100vh"),l.style.setProperty("height","100vh"),l.style.setProperty("width","100vw"),k(l,()=>e.children),V(()=>T(l,L(o().panel,s(),{[r`
            min-width: min-content;
          `]:dt()<zo},"tsqd-main-panel"))),l})()},n0=e=>{const t=Ce(),n=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,r=O(()=>t()==="dark"?Qe(n):We(n)),[o,s]=K(!1),l=O(()=>e.localStore.position||N().position||Qn),a=h=>{const f=h.currentTarget.parentElement;if(!f)return;s(!0);const{height:u,width:g}=f.getBoundingClientRect(),d=h.clientX,y=h.clientY;let b=0;const m=Br(3.5),p=Br(12),w=$=>{if($.preventDefault(),l()==="left"||l()==="right"){const P=l()==="right"?d-$.clientX:$.clientX-d;b=Math.round(g+P),b<p&&(b=p),e.setLocalStore("width",String(Math.round(b)));const F=f.getBoundingClientRect().width;Number(e.localStore.width)<F&&e.setLocalStore("width",String(F))}else{const P=l()==="bottom"?y-$.clientY:$.clientY-y;b=Math.round(u+P),b<m&&(b=m,zn(null)),e.setLocalStore("height",String(Math.round(b)))}},x=()=>{o()&&s(!1),document.removeEventListener("mousemove",w,!1),document.removeEventListener("mouseUp",x,!1)};document.addEventListener("mousemove",w,!1),document.addEventListener("mouseup",x,!1)};let i;Mt(()=>{El(i,({width:h},f)=>{f===i&&ms(h)})}),H(()=>{var y,b;const h=(b=(y=i.parentElement)==null?void 0:y.parentElement)==null?void 0:b.parentElement;if(!h)return;const f=e.localStore.position||Qn,u=Ss("padding",f),g=e.localStore.position==="left"||e.localStore.position==="right",d=(({padding:m,paddingTop:p,paddingBottom:w,paddingLeft:x,paddingRight:$})=>({padding:m,paddingTop:p,paddingBottom:w,paddingLeft:x,paddingRight:$}))(h.style);h.style[u]=`${g?e.localStore.width:e.localStore.height}px`,G(()=>{Object.entries(d).forEach(([m,p])=>{h.style[m]=p})})});const c=()=>{const{colors:h}=S,f=(u,g)=>t()==="dark"?g:u;return dt()<Ht?n`
        flex-direction: column;
        background-color: ${f(h.gray[300],h.gray[600])};
      `:n`
      flex-direction: row;
      background-color: ${f(h.gray[200],h.darkGray[900])};
    `};return(()=>{var h=pd(),f=h.firstChild,u=f.nextSibling,g=i;return typeof g=="function"?Mn(g,h):i=h,f.$$mousedown=a,u.$$click=()=>e.setLocalStore("open","false"),k(u,v(Kt,{})),k(h,v(bs,e),null),V(d=>{var y=L(r().panel,r()[`panel-position-${l()}`],c(),{[n`
            min-width: min-content;
          `]:dt()<zo&&(l()==="right"||l()==="left")},"tsqd-main-panel"),b=l()==="bottom"||l()==="top"?`${e.localStore.height||Ko}px`:"auto",m=l()==="right"||l()==="left"?`${e.localStore.width||Bo}px`:"auto",p=L(r().dragHandle,r()[`dragHandle-position-${l()}`],"tsqd-drag-handle"),w=L(r().closeBtn,r()[`closeBtn-position-${l()}`],"tsqd-minimize-btn");return y!==d.e&&T(h,d.e=y),b!==d.t&&((d.t=b)!=null?h.style.setProperty("height",b):h.style.removeProperty("height")),m!==d.a&&((d.a=m)!=null?h.style.setProperty("width",m):h.style.removeProperty("width")),p!==d.o&&T(f,d.o=p),w!==d.i&&T(u,d.i=w),d},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0}),h})()},bs=e=>{u0(),c0();let t;const n=Ce(),r=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,o=O(()=>n()==="dark"?Qe(r):We(r)),s=ar(),[l,a]=K("queries"),i=O(()=>e.localStore.sort||el),c=O(()=>Number(e.localStore.sortOrder)||Ur),h=O(()=>e.localStore.mutationSort||tl),f=O(()=>Number(e.localStore.mutationSortOrder)||Ur),u=O(()=>Gn[i()]),g=O(()=>jn[h()]),d=O(()=>N().onlineManager),y=O(()=>N().client.getQueryCache()),b=O(()=>N().client.getMutationCache()),m=pe(F=>F().getAll().length,!1),p=O(ft(()=>[m(),e.localStore.filter,i(),c(),e.localStore.hideDisabledQueries],()=>{const F=y().getAll();let _=e.localStore.filter?F.filter(A=>Vr(A.queryHash,e.localStore.filter||"").passed):[...F];return e.localStore.hideDisabledQueries==="true"&&(_=_.filter(A=>!A.isDisabled())),u()?_.sort((A,B)=>u()(A,B)*c()):_})),w=Ve(F=>F().getAll().length,!1),x=O(ft(()=>[w(),e.localStore.mutationFilter,h(),f()],()=>{const F=b().getAll(),_=e.localStore.mutationFilter?F.filter(A=>{const B=`${A.options.mutationKey?JSON.stringify(A.options.mutationKey)+" - ":""}${new Date(A.state.submittedAt).toLocaleString()}`;return Vr(B,e.localStore.mutationFilter||"").passed}):[...F];return g()?_.sort((A,B)=>g()(A,B)*f()):_})),$=F=>{e.setLocalStore("position",F)},P=F=>{const C=getComputedStyle(t).getPropertyValue("--tsqd-font-size");F.style.setProperty("--tsqd-font-size",C)};return[(()=>{var F=Kd(),_=F.firstChild,C=_.firstChild,A=C.firstChild,B=A.firstChild,U=B.nextSibling,ne=U.firstChild,Z=_.nextSibling,se=Z.firstChild,R=se.firstChild,Q=R.firstChild,J=R.nextSibling,ue=J.nextSibling,ve=se.nextSibling,Te=ve.firstChild,he=Te.nextSibling,Ae=t;return typeof Ae=="function"?Mn(Ae,F):t=F,A.$$click=()=>{if(!s().pipWindow&&!e.showPanelViewOnly){e.setLocalStore("open","false");return}e.onClose&&e.onClose()},k(U,()=>N().queryFlavor,ne),k(U,()=>N().version,null),k(C,v(Ke.Root,{get class(){return L(o().viewToggle)},get value(){return l()},onChange:D=>{a(D),zn(null),vs(null)},get children(){return[v(Ke.Item,{value:"queries",class:"tsqd-radio-toggle",get children(){return[v(Ke.ItemInput,{}),v(Ke.ItemControl,{get children(){return v(Ke.ItemIndicator,{})}}),v(Ke.ItemLabel,{title:"Toggle Queries View",children:"Queries"})]}}),v(Ke.Item,{value:"mutations",class:"tsqd-radio-toggle",get children(){return[v(Ke.ItemInput,{}),v(Ke.ItemControl,{get children(){return v(Ke.ItemIndicator,{})}}),v(Ke.ItemLabel,{title:"Toggle Mutations View",children:"Mutations"})]}})]}}),null),k(_,v(z,{get when(){return l()==="queries"},get children(){return v(i0,{})}}),null),k(_,v(z,{get when(){return l()==="mutations"},get children(){return v(s0,{})}}),null),k(R,v(zc,{}),Q),Q.$$input=D=>{l()==="queries"?e.setLocalStore("filter",D.currentTarget.value):e.setLocalStore("mutationFilter",D.currentTarget.value)},k(J,v(z,{get when(){return l()==="queries"},get children(){var D=wd();return D.addEventListener("change",ge=>{e.setLocalStore("sort",ge.currentTarget.value)}),k(D,()=>Object.keys(Gn).map(ge=>(()=>{var ee=qo();return ee.firstChild,ee.value=ge,k(ee,ge,null),ee})())),V(()=>D.value=i()),D}}),null),k(J,v(z,{get when(){return l()==="mutations"},get children(){var D=xd();return D.addEventListener("change",ge=>{e.setLocalStore("mutationSort",ge.currentTarget.value)}),k(D,()=>Object.keys(jn).map(ge=>(()=>{var ee=qo();return ee.firstChild,ee.value=ge,k(ee,ge,null),ee})())),V(()=>D.value=h()),D}}),null),k(J,v(Kt,{}),null),ue.$$click=()=>{l()==="queries"?e.setLocalStore("sortOrder",String(c()*-1)):e.setLocalStore("mutationSortOrder",String(f()*-1))},k(ue,v(z,{get when(){return(l()==="queries"?c():f())===1},get children(){return[$d(),v(Mo,{})]}}),null),k(ue,v(z,{get when(){return(l()==="queries"?c():f())===-1},get children(){return[Cd(),v(To,{})]}}),null),Te.$$click=()=>{l()==="queries"?(Xe({type:"CLEAR_QUERY_CACHE"}),y().clear()):(Xe({type:"CLEAR_MUTATION_CACHE"}),b().clear())},k(Te,v(gs,{})),he.$$click=()=>{d().setOnline(!d().isOnline())},k(he,(()=>{var D=ye(()=>!!nn());return()=>D()?v(Gc,{}):v(Vc,{})})()),k(ve,v(z,{get when(){return ye(()=>!s().pipWindow)()&&!s().disabled},get children(){var D=Sd();return D.$$click=()=>{s().requestPipWindow(Number(window.innerWidth),Number(e.localStore.height??500))},k(D,v(Wc,{})),V(()=>T(D,L(o().actionsBtn,"tsqd-actions-btn","tsqd-action-open-pip"))),D}}),null),k(ve,v(ae.Root,{gutter:4,get children(){return[v(ae.Trigger,{get class(){return L(o().actionsBtn,"tsqd-actions-btn","tsqd-action-settings")},get children(){return v(jc,{})}}),v(ae.Portal,{ref:D=>P(D),get mount(){return ye(()=>!!s().pipWindow)()?s().pipWindow.document.body:document.body},get children(){return v(ae.Content,{get class(){return L(o().settingsMenu,"tsqd-settings-menu")},get children(){return[(()=>{var D=kd();return V(()=>T(D,L(o().settingsMenuHeader,"tsqd-settings-menu-header"))),D})(),v(z,{get when(){return!e.showPanelViewOnly},get children(){return v(ae.Sub,{overlap:!0,gutter:8,shift:-4,get children(){return[v(ae.SubTrigger,{get class(){return L(o().settingsSubTrigger,"tsqd-settings-menu-sub-trigger","tsqd-settings-menu-sub-trigger-position")},get children(){return[Ed(),v(Kt,{})]}}),v(ae.Portal,{ref:D=>P(D),get mount(){return ye(()=>!!s().pipWindow)()?s().pipWindow.document.body:document.body},get children(){return v(ae.SubContent,{get class(){return L(o().settingsMenu,"tsqd-settings-submenu")},get children(){return[v(ae.Item,{onSelect:()=>{$("top")},as:"button",get class(){return L(o().settingsSubButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-top")},get children(){return[Dd(),v(Mo,{})]}}),v(ae.Item,{onSelect:()=>{$("bottom")},as:"button",get class(){return L(o().settingsSubButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-bottom")},get children(){return[Ad(),v(To,{})]}}),v(ae.Item,{onSelect:()=>{$("left")},as:"button",get class(){return L(o().settingsSubButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-left")},get children(){return[Md(),v(Kc,{})]}}),v(ae.Item,{onSelect:()=>{$("right")},as:"button",get class(){return L(o().settingsSubButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-right")},get children(){return[Td(),v(Bc,{})]}})]}})}})]}})}}),v(ae.Sub,{overlap:!0,gutter:8,shift:-4,get children(){return[v(ae.SubTrigger,{get class(){return L(o().settingsSubTrigger,"tsqd-settings-menu-sub-trigger","tsqd-settings-menu-sub-trigger-position")},get children(){return[Fd(),v(Kt,{})]}}),v(ae.Portal,{ref:D=>P(D),get mount(){return ye(()=>!!s().pipWindow)()?s().pipWindow.document.body:document.body},get children(){return v(ae.SubContent,{get class(){return L(o().settingsMenu,"tsqd-settings-submenu")},get children(){return[v(ae.Item,{onSelect:()=>{e.setLocalStore("theme_preference","light")},as:"button",get class(){return L(o().settingsSubButton,e.localStore.theme_preference==="light"&&o().themeSelectedButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-top")},get children(){return[Id(),v(Nc,{})]}}),v(ae.Item,{onSelect:()=>{e.setLocalStore("theme_preference","dark")},as:"button",get class(){return L(o().settingsSubButton,e.localStore.theme_preference==="dark"&&o().themeSelectedButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-bottom")},get children(){return[Ld(),v(Hc,{})]}}),v(ae.Item,{onSelect:()=>{e.setLocalStore("theme_preference","system")},as:"button",get class(){return L(o().settingsSubButton,e.localStore.theme_preference==="system"&&o().themeSelectedButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-left")},get children(){return[Od(),v(Uc,{})]}})]}})}})]}}),v(ae.Sub,{overlap:!0,gutter:8,shift:-4,get children(){return[v(ae.SubTrigger,{get class(){return L(o().settingsSubTrigger,"tsqd-settings-menu-sub-trigger","tsqd-settings-menu-sub-trigger-disabled-queries")},get children(){return[Pd(),v(Kt,{})]}}),v(ae.Portal,{ref:D=>P(D),get mount(){return ye(()=>!!s().pipWindow)()?s().pipWindow.document.body:document.body},get children(){return v(ae.SubContent,{get class(){return L(o().settingsMenu,"tsqd-settings-submenu")},get children(){return[v(ae.Item,{onSelect:()=>{e.setLocalStore("hideDisabledQueries","false")},as:"button",get class(){return L(o().settingsSubButton,e.localStore.hideDisabledQueries!=="true"&&o().themeSelectedButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-show")},get children(){return[qd(),v(z,{get when(){return e.localStore.hideDisabledQueries!=="true"},get children(){return v(ir,{})}})]}}),v(ae.Item,{onSelect:()=>{e.setLocalStore("hideDisabledQueries","true")},as:"button",get class(){return L(o().settingsSubButton,e.localStore.hideDisabledQueries==="true"&&o().themeSelectedButton,"tsqd-settings-menu-position-btn","tsqd-settings-menu-position-btn-hide")},get children(){return[_d(),v(z,{get when(){return e.localStore.hideDisabledQueries==="true"},get children(){return v(ir,{})}})]}})]}})}})]}})]}})}})]}}),null),k(F,v(z,{get when(){return l()==="queries"},get children(){var D=Rd(),ge=D.firstChild;return k(ge,v($n,{by:ee=>ee.queryHash,get each(){return p()},children:ee=>v(r0,{get query(){return ee()}})})),V(()=>T(D,L(o().overflowQueryContainer,"tsqd-queries-overflow-container"))),D}}),null),k(F,v(z,{get when(){return l()==="mutations"},get children(){var D=zd(),ge=D.firstChild;return k(ge,v($n,{by:ee=>ee.mutationId,get each(){return x()},children:ee=>v(o0,{get mutation(){return ee()}})})),V(()=>T(D,L(o().overflowQueryContainer,"tsqd-mutations-overflow-container"))),D}}),null),V(D=>{var ge=L(o().queriesContainer,dt()<Ht&&(Le()||wt())&&r`
              height: 50%;
              max-height: 50%;
            `,dt()<Ht&&!(Le()||wt())&&r`
              height: 100%;
              max-height: 100%;
            `,"tsqd-queries-container"),ee=L(o().row,"tsqd-header"),vt=o().logoAndToggleContainer,j=L(o().logo,"tsqd-text-logo-container"),Se=L(o().tanstackLogo,"tsqd-text-logo-tanstack"),ke=L(o().queryFlavorLogo,"tsqd-text-logo-query-flavor"),Lt=L(o().row,"tsqd-filters-actions-container"),qe=L(o().filtersContainer,"tsqd-filters-container"),mt=L(o().filterInput,"tsqd-query-filter-textfield-container"),kt=L("tsqd-query-filter-textfield"),nt=L(o().filterSelect,"tsqd-query-filter-sort-container"),Ye=`Sort order ${(l()==="queries"?c():f())===-1?"descending":"ascending"}`,rt=(l()==="queries"?c():f())===-1,I=L(o().actionsContainer,"tsqd-actions-container"),te=L(o().actionsBtn,"tsqd-actions-btn","tsqd-action-clear-cache"),me=`Clear ${l()} cache`,ie=L(o().actionsBtn,nn()&&o().actionsBtnOffline,"tsqd-actions-btn","tsqd-action-mock-offline-behavior"),le=`${nn()?"Unset offline mocking behavior":"Mock offline behavior"}`,ce=nn(),be=`${nn()?"Unset offline mocking behavior":"Mock offline behavior"}`;return ge!==D.e&&T(F,D.e=ge),ee!==D.t&&T(_,D.t=ee),vt!==D.a&&T(C,D.a=vt),j!==D.o&&T(A,D.o=j),Se!==D.i&&T(B,D.i=Se),ke!==D.n&&T(U,D.n=ke),Lt!==D.s&&T(Z,D.s=Lt),qe!==D.h&&T(se,D.h=qe),mt!==D.r&&T(R,D.r=mt),kt!==D.d&&T(Q,D.d=kt),nt!==D.l&&T(J,D.l=nt),Ye!==D.u&&M(ue,"aria-label",D.u=Ye),rt!==D.c&&M(ue,"aria-pressed",D.c=rt),I!==D.w&&T(ve,D.w=I),te!==D.m&&T(Te,D.m=te),me!==D.f&&M(Te,"title",D.f=me),ie!==D.y&&T(he,D.y=ie),le!==D.g&&M(he,"aria-label",D.g=le),ce!==D.p&&M(he,"aria-pressed",D.p=ce),be!==D.b&&M(he,"title",D.b=be),D},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0,r:void 0,d:void 0,l:void 0,u:void 0,c:void 0,w:void 0,m:void 0,f:void 0,y:void 0,g:void 0,p:void 0,b:void 0}),V(()=>Q.value=l()==="queries"?e.localStore.filter||"":e.localStore.mutationFilter||""),F})(),v(z,{get when(){return ye(()=>l()==="queries")()&&Le()},get children(){return v(l0,{})}}),v(z,{get when(){return ye(()=>l()==="mutations")()&&wt()},get children(){return v(a0,{})}})]},r0=e=>{const t=Ce(),n=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,r=O(()=>t()==="dark"?Qe(n):We(n)),{colors:o,alpha:s}=S,l=(d,y)=>t()==="dark"?y:d,a=pe(d=>{var y;return(y=d().find({queryKey:e.query.queryKey}))==null?void 0:y.state},!0,d=>d.query.queryHash===e.query.queryHash),i=pe(d=>{var y;return((y=d().find({queryKey:e.query.queryKey}))==null?void 0:y.isDisabled())??!1},!0,d=>d.query.queryHash===e.query.queryHash),c=pe(d=>{var y;return((y=d().find({queryKey:e.query.queryKey}))==null?void 0:y.isStatic())??!1},!0,d=>d.query.queryHash===e.query.queryHash),h=pe(d=>{var y;return((y=d().find({queryKey:e.query.queryKey}))==null?void 0:y.isStale())??!1},!0,d=>d.query.queryHash===e.query.queryHash),f=pe(d=>{var y;return((y=d().find({queryKey:e.query.queryKey}))==null?void 0:y.getObserversCount())??0},!0,d=>d.query.queryHash===e.query.queryHash),u=O(()=>Es({queryState:a(),observerCount:f(),isStale:h()})),g=()=>u()==="gray"?n`
        background-color: ${l(o[u()][200],o[u()][700])};
        color: ${l(o[u()][700],o[u()][300])};
      `:n`
      background-color: ${l(o[u()][200]+s[80],o[u()][900])};
      color: ${l(o[u()][800],o[u()][300])};
    `;return v(z,{get when(){return a()},get children(){var d=ys(),y=d.firstChild,b=y.nextSibling;return d.$$click=()=>zn(e.query.queryHash===Le()?null:e.query.queryHash),k(y,f),k(b,()=>e.query.queryHash),k(d,v(z,{get when(){return i()},get children(){return Bd()}}),null),k(d,v(z,{get when(){return c()},get children(){return Nd()}}),null),V(m=>{var p=L(r().queryRow,Le()===e.query.queryHash&&r().selectedQueryRow,"tsqd-query-row"),w=`Query key ${e.query.queryHash}`,x=L(g(),"tsqd-query-observer-count");return p!==m.e&&T(d,m.e=p),w!==m.t&&M(d,"aria-label",m.t=w),x!==m.a&&T(y,m.a=x),m},{e:void 0,t:void 0,a:void 0}),d}})},o0=e=>{const t=Ce(),n=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,r=O(()=>t()==="dark"?Qe(n):We(n)),{colors:o,alpha:s}=S,l=(u,g)=>t()==="dark"?g:u,a=Ve(u=>{const d=u().getAll().find(y=>y.mutationId===e.mutation.mutationId);return d==null?void 0:d.state}),i=Ve(u=>{const d=u().getAll().find(y=>y.mutationId===e.mutation.mutationId);return d?d.state.isPaused:!1}),c=Ve(u=>{const d=u().getAll().find(y=>y.mutationId===e.mutation.mutationId);return d?d.state.status:"idle"}),h=O(()=>zt({isPaused:i(),status:c()})),f=()=>h()==="gray"?n`
        background-color: ${l(o[h()][200],o[h()][700])};
        color: ${l(o[h()][700],o[h()][300])};
      `:n`
      background-color: ${l(o[h()][200]+s[80],o[h()][900])};
      color: ${l(o[h()][800],o[h()][300])};
    `;return v(z,{get when(){return a()},get children(){var u=ys(),g=u.firstChild,d=g.nextSibling;return u.$$click=()=>{vs(e.mutation.mutationId===wt()?null:e.mutation.mutationId)},k(g,v(z,{get when(){return h()==="purple"},get children(){return v(rd,{})}}),null),k(g,v(z,{get when(){return h()==="green"},get children(){return v(ir,{})}}),null),k(g,v(z,{get when(){return h()==="red"},get children(){return v(nd,{})}}),null),k(g,v(z,{get when(){return h()==="yellow"},get children(){return v(td,{})}}),null),k(d,v(z,{get when(){return e.mutation.options.mutationKey},get children(){return[ye(()=>JSON.stringify(e.mutation.options.mutationKey))," -"," "]}}),null),k(d,()=>new Date(e.mutation.state.submittedAt).toLocaleString(),null),V(y=>{var b=L(r().queryRow,wt()===e.mutation.mutationId&&r().selectedQueryRow,"tsqd-query-row"),m=`Mutation submitted at ${new Date(e.mutation.state.submittedAt).toLocaleString()}`,p=L(f(),"tsqd-query-observer-count");return b!==y.e&&T(u,y.e=b),m!==y.t&&M(u,"aria-label",y.t=m),p!==y.a&&T(g,y.a=p),y},{e:void 0,t:void 0,a:void 0}),u}})},i0=()=>{const e=pe(i=>i().getAll().filter(c=>qt(c)==="stale").length),t=pe(i=>i().getAll().filter(c=>qt(c)==="fresh").length),n=pe(i=>i().getAll().filter(c=>qt(c)==="fetching").length),r=pe(i=>i().getAll().filter(c=>qt(c)==="paused").length),o=pe(i=>i().getAll().filter(c=>qt(c)==="inactive").length),s=Ce(),l=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,a=O(()=>s()==="dark"?Qe(l):We(l));return(()=>{var i=Rn();return k(i,v(ct,{label:"Fresh",color:"green",get count(){return t()}}),null),k(i,v(ct,{label:"Fetching",color:"blue",get count(){return n()}}),null),k(i,v(ct,{label:"Paused",color:"purple",get count(){return r()}}),null),k(i,v(ct,{label:"Stale",color:"yellow",get count(){return e()}}),null),k(i,v(ct,{label:"Inactive",color:"gray",get count(){return o()}}),null),V(()=>T(i,L(a().queryStatusContainer,"tsqd-query-status-container"))),i})()},s0=()=>{const e=Ve(a=>a().getAll().filter(i=>zt({isPaused:i.state.isPaused,status:i.state.status})==="green").length),t=Ve(a=>a().getAll().filter(i=>zt({isPaused:i.state.isPaused,status:i.state.status})==="yellow").length),n=Ve(a=>a().getAll().filter(i=>zt({isPaused:i.state.isPaused,status:i.state.status})==="purple").length),r=Ve(a=>a().getAll().filter(i=>zt({isPaused:i.state.isPaused,status:i.state.status})==="red").length),o=Ce(),s=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,l=O(()=>o()==="dark"?Qe(s):We(s));return(()=>{var a=Rn();return k(a,v(ct,{label:"Paused",color:"purple",get count(){return n()}}),null),k(a,v(ct,{label:"Pending",color:"yellow",get count(){return t()}}),null),k(a,v(ct,{label:"Success",color:"green",get count(){return e()}}),null),k(a,v(ct,{label:"Error",color:"red",get count(){return r()}}),null),V(()=>T(a,L(l().queryStatusContainer,"tsqd-query-status-container"))),a})()},ct=e=>{const t=Ce(),n=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,r=O(()=>t()==="dark"?Qe(n):We(n)),{colors:o,alpha:s}=S,l=(g,d)=>t()==="dark"?d:g;let a;const[i,c]=K(!1),[h,f]=K(!1),u=O(()=>!(Le()&&dt()<Qs&&dt()>Ht||dt()<Ht));return(()=>{var g=Vd(),d=g.firstChild,y=d.nextSibling,b=a;return typeof b=="function"?Mn(b,g):a=g,g.addEventListener("mouseleave",()=>{c(!1),f(!1)}),g.addEventListener("mouseenter",()=>c(!0)),g.addEventListener("blur",()=>f(!1)),g.addEventListener("focus",()=>f(!0)),Ts(g,W({get disabled(){return u()},get class(){return L(r().queryStatusTag,!u()&&n`
            cursor: pointer;
            &:hover {
              background: ${l(o.gray[200],o.darkGray[400])}${s[80]};
            }
          `,"tsqd-query-status-tag",`tsqd-query-status-tag-${e.label.toLowerCase()}`)}},()=>i()||h()?{"aria-describedby":"tsqd-status-tooltip"}:{}),!1,!0),k(g,v(z,{get when(){return ye(()=>!u())()&&(i()||h())},get children(){var m=Hd();return k(m,()=>e.label),V(()=>T(m,L(r().statusTooltip,"tsqd-query-status-tooltip"))),m}}),d),k(g,v(z,{get when(){return u()},get children(){var m=Ud();return k(m,()=>e.label),V(()=>T(m,L(r().queryStatusTagLabel,"tsqd-query-status-tag-label"))),m}}),y),k(y,()=>e.count),V(m=>{var p=L(n`
            width: ${S.size[1.5]};
            height: ${S.size[1.5]};
            border-radius: ${S.border.radius.full};
            background-color: ${S.colors[e.color][500]};
          `,"tsqd-query-status-tag-dot"),w=L(r().queryStatusCount,e.count>0&&e.color!=="gray"&&n`
              background-color: ${l(o[e.color][100],o[e.color][900])};
              color: ${l(o[e.color][700],o[e.color][300])};
            `,"tsqd-query-status-tag-count");return p!==m.e&&T(d,m.e=p),w!==m.t&&T(y,m.t=w),m},{e:void 0,t:void 0}),g})()},l0=()=>{const e=Ce(),t=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,n=O(()=>e()==="dark"?Qe(t):We(t)),{colors:r}=S,o=(C,A)=>e()==="dark"?A:C,s=N().client,[l,a]=K(!1),[i,c]=K("view"),[h,f]=K(!1),u=O(()=>N().errorTypes||[]),g=pe(C=>C().getAll().find(A=>A.queryHash===Le()),!1),d=pe(C=>C().getAll().find(A=>A.queryHash===Le()),!1),y=pe(C=>{var A;return(A=C().getAll().find(B=>B.queryHash===Le()))==null?void 0:A.state},!1),b=pe(C=>{var A;return(A=C().getAll().find(B=>B.queryHash===Le()))==null?void 0:A.state.data},!1),m=pe(C=>{const A=C().getAll().find(B=>B.queryHash===Le());return A?qt(A):"inactive"}),p=pe(C=>{const A=C().getAll().find(B=>B.queryHash===Le());return A?A.state.status:"pending"}),w=pe(C=>{var A;return((A=C().getAll().find(B=>B.queryHash===Le()))==null?void 0:A.getObserversCount())??0}),x=O(()=>Ds(m())),$=()=>{var A,B;Xe({type:"REFETCH",queryHash:(A=g())==null?void 0:A.queryHash});const C=(B=g())==null?void 0:B.fetch();C==null||C.catch(()=>{})},P=C=>{const A=g();if(!A)return;Xe({type:"TRIGGER_ERROR",queryHash:A.queryHash,metadata:{error:C==null?void 0:C.name}});const B=(C==null?void 0:C.initializer(A))??new Error("Unknown error from devtools"),U=A.options;A.setState({status:"error",error:B,fetchMeta:{...A.state.fetchMeta,__previousQueryOptions:U}})},F=()=>{const C=g();if(!C)return;Xe({type:"RESTORE_LOADING",queryHash:C.queryHash});const A=C.state,B=C.state.fetchMeta?C.state.fetchMeta.__previousQueryOptions:null;C.cancel({silent:!0}),C.setState({...A,fetchStatus:"idle",fetchMeta:null}),B&&C.fetch(B)};H(()=>{m()!=="fetching"&&a(!1)});const _=()=>x()==="gray"?t`
        background-color: ${o(r[x()][200],r[x()][700])};
        color: ${o(r[x()][700],r[x()][300])};
        border-color: ${o(r[x()][400],r[x()][600])};
      `:t`
      background-color: ${o(r[x()][100],r[x()][900])};
      color: ${o(r[x()][700],r[x()][300])};
      border-color: ${o(r[x()][400],r[x()][600])};
    `;return v(z,{get when(){return ye(()=>!!g())()&&y()},get children(){var C=Yd(),A=C.firstChild,B=A.nextSibling,U=B.firstChild,ne=U.firstChild,Z=ne.firstChild,se=ne.nextSibling,R=U.nextSibling,Q=R.firstChild,J=Q.nextSibling,ue=R.nextSibling,ve=ue.firstChild,Te=ve.nextSibling,he=B.nextSibling,Ae=he.nextSibling,D=Ae.firstChild,ge=D.firstChild,ee=D.nextSibling,vt=ee.firstChild,j=ee.nextSibling,Se=j.firstChild,ke=j.nextSibling,Lt=ke.firstChild,qe=ke.nextSibling,mt=qe.firstChild,kt=mt.nextSibling,nt=Ae.nextSibling;nt.firstChild;var Ye=nt.nextSibling,rt=Ye.nextSibling;return k(Z,()=>xn(g().queryKey,!0)),k(se,m),k(J,w),k(Te,()=>new Date(y().dataUpdatedAt).toLocaleTimeString()),D.$$click=$,ee.$$click=()=>{var I;Xe({type:"INVALIDATE",queryHash:(I=g())==null?void 0:I.queryHash}),s.invalidateQueries(g())},j.$$click=()=>{var I;Xe({type:"RESET",queryHash:(I=g())==null?void 0:I.queryHash}),s.resetQueries(g())},ke.$$click=()=>{var I;Xe({type:"REMOVE",queryHash:(I=g())==null?void 0:I.queryHash}),s.removeQueries(g()),zn(null)},qe.$$click=()=>{var I;if(((I=g())==null?void 0:I.state.data)===void 0)a(!0),F();else{const te=g();if(!te)return;Xe({type:"TRIGGER_LOADING",queryHash:te.queryHash});const me=te.options;te.fetch({...me,queryFn:()=>new Promise(()=>{}),gcTime:-1}),te.setState({data:void 0,status:"pending",fetchMeta:{...te.state.fetchMeta,__previousQueryOptions:me}})}},k(qe,()=>p()==="pending"?"Restore":"Trigger",kt),k(Ae,v(z,{get when(){return u().length===0||p()==="error"},get children(){var I=Gd(),te=I.firstChild,me=te.nextSibling;return I.$$click=()=>{var ie;g().state.error?(Xe({type:"RESTORE_ERROR",queryHash:(ie=g())==null?void 0:ie.queryHash}),s.resetQueries(g())):P()},k(I,()=>p()==="error"?"Restore":"Trigger",me),V(ie=>{var le=L(t`
                  color: ${o(r.red[500],r.red[400])};
                `,"tsqd-query-details-actions-btn","tsqd-query-details-action-error"),ce=p()==="pending",be=t`
                  background-color: ${o(r.red[500],r.red[400])};
                `;return le!==ie.e&&T(I,ie.e=le),ce!==ie.t&&(I.disabled=ie.t=ce),be!==ie.a&&T(te,ie.a=be),ie},{e:void 0,t:void 0,a:void 0}),I}}),null),k(Ae,v(z,{get when(){return!(u().length===0||p()==="error")},get children(){var I=jd(),te=I.firstChild,me=te.nextSibling,ie=me.nextSibling;return ie.firstChild,ie.addEventListener("change",le=>{const ce=u().find(be=>be.name===le.currentTarget.value);P(ce)}),k(ie,v(As,{get each(){return u()},children:le=>(()=>{var ce=Xd();return k(ce,()=>le.name),V(()=>ce.value=le.name),ce})()}),null),k(I,v(Kt,{}),null),V(le=>{var ce=L(n().actionsSelect,"tsqd-query-details-actions-btn","tsqd-query-details-action-error-multiple"),be=t`
                  background-color: ${S.colors.red[400]};
                `,re=p()==="pending";return ce!==le.e&&T(I,le.e=ce),be!==le.t&&T(te,le.t=be),re!==le.a&&(ie.disabled=le.a=re),le},{e:void 0,t:void 0,a:void 0}),I}}),null),k(nt,()=>i()==="view"?"Explorer":"Editor",null),k(C,v(z,{get when(){return i()==="view"},get children(){var I=Wd();return k(I,v(pt,{label:"Data",defaultExpanded:["Data"],get value(){return b()},editable:!0,onEdit:()=>c("edit"),get activeQuery(){return g()}})),V(te=>(te=S.size[2])!=null?I.style.setProperty("padding",te):I.style.removeProperty("padding")),I}}),Ye),k(C,v(z,{get when(){return i()==="edit"},get children(){var I=Qd(),te=I.firstChild,me=te.nextSibling,ie=me.firstChild,le=ie.nextSibling,ce=le.firstChild,be=ce.nextSibling;return I.addEventListener("submit",re=>{re.preventDefault();const it=new FormData(re.currentTarget).get("data");try{const Ue=JSON.parse(it);g().setState({...g().state,data:Ue}),c("view")}catch{f(!0)}}),te.addEventListener("focus",()=>f(!1)),k(ie,()=>h()?"Invalid Value":""),ce.$$click=()=>c("view"),V(re=>{var ot=L(n().devtoolsEditForm,"tsqd-query-details-data-editor"),it=n().devtoolsEditTextarea,Ue=h(),Et=n().devtoolsEditFormActions,st=n().devtoolsEditFormError,Dt=n().devtoolsEditFormActionContainer,lt=L(n().devtoolsEditFormAction,t`
                      color: ${o(r.gray[600],r.gray[300])};
                    `),bt=L(n().devtoolsEditFormAction,t`
                      color: ${o(r.blue[600],r.blue[400])};
                    `);return ot!==re.e&&T(I,re.e=ot),it!==re.t&&T(te,re.t=it),Ue!==re.a&&M(te,"data-error",re.a=Ue),Et!==re.o&&T(me,re.o=Et),st!==re.i&&T(ie,re.i=st),Dt!==re.n&&T(le,re.n=Dt),lt!==re.s&&T(ce,re.s=lt),bt!==re.h&&T(be,re.h=bt),re},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0}),V(()=>te.value=JSON.stringify(b(),null,2)),I}}),Ye),k(rt,v(pt,{label:"Query",defaultExpanded:["Query","queryKey"],get value(){return d()}})),V(I=>{var te=L(n().detailsContainer,"tsqd-query-details-container"),me=L(n().detailsHeader,"tsqd-query-details-header"),ie=L(n().detailsBody,"tsqd-query-details-summary-container"),le=L(n().queryDetailsStatus,_()),ce=L(n().detailsHeader,"tsqd-query-details-header"),be=L(n().actionsBody,"tsqd-query-details-actions-container"),re=L(t`
                color: ${o(r.blue[600],r.blue[400])};
              `,"tsqd-query-details-actions-btn","tsqd-query-details-action-refetch"),ot=m()==="fetching",it=t`
                background-color: ${o(r.blue[600],r.blue[400])};
              `,Ue=L(t`
                color: ${o(r.yellow[600],r.yellow[400])};
              `,"tsqd-query-details-actions-btn","tsqd-query-details-action-invalidate"),Et=p()==="pending",st=t`
                background-color: ${o(r.yellow[600],r.yellow[400])};
              `,Dt=L(t`
                color: ${o(r.gray[600],r.gray[300])};
              `,"tsqd-query-details-actions-btn","tsqd-query-details-action-reset"),lt=p()==="pending",bt=t`
                background-color: ${o(r.gray[600],r.gray[400])};
              `,yn=L(t`
                color: ${o(r.pink[500],r.pink[400])};
              `,"tsqd-query-details-actions-btn","tsqd-query-details-action-remove"),Qt=m()==="fetching",vn=t`
                background-color: ${o(r.pink[500],r.pink[400])};
              `,Ot=L(t`
                color: ${o(r.cyan[500],r.cyan[400])};
              `,"tsqd-query-details-actions-btn","tsqd-query-details-action-loading"),mn=l(),Yt=t`
                background-color: ${o(r.cyan[500],r.cyan[400])};
              `,Xt=L(n().detailsHeader,"tsqd-query-details-header"),Zt=L(n().detailsHeader,"tsqd-query-details-header"),Pt=S.size[2];return te!==I.e&&T(C,I.e=te),me!==I.t&&T(A,I.t=me),ie!==I.a&&T(B,I.a=ie),le!==I.o&&T(se,I.o=le),ce!==I.i&&T(he,I.i=ce),be!==I.n&&T(Ae,I.n=be),re!==I.s&&T(D,I.s=re),ot!==I.h&&(D.disabled=I.h=ot),it!==I.r&&T(ge,I.r=it),Ue!==I.d&&T(ee,I.d=Ue),Et!==I.l&&(ee.disabled=I.l=Et),st!==I.u&&T(vt,I.u=st),Dt!==I.c&&T(j,I.c=Dt),lt!==I.w&&(j.disabled=I.w=lt),bt!==I.m&&T(Se,I.m=bt),yn!==I.f&&T(ke,I.f=yn),Qt!==I.y&&(ke.disabled=I.y=Qt),vn!==I.g&&T(Lt,I.g=vn),Ot!==I.p&&T(qe,I.p=Ot),mn!==I.b&&(qe.disabled=I.b=mn),Yt!==I.T&&T(mt,I.T=Yt),Xt!==I.A&&T(nt,I.A=Xt),Zt!==I.O&&T(Ye,I.O=Zt),Pt!==I.I&&((I.I=Pt)!=null?rt.style.setProperty("padding",Pt):rt.style.removeProperty("padding")),I},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0,r:void 0,d:void 0,l:void 0,u:void 0,c:void 0,w:void 0,m:void 0,f:void 0,y:void 0,g:void 0,p:void 0,b:void 0,T:void 0,A:void 0,O:void 0,I:void 0}),C}})},a0=()=>{const e=Ce(),t=N().shadowDOMTarget?Y.bind({target:N().shadowDOMTarget}):Y,n=O(()=>e()==="dark"?Qe(t):We(t)),{colors:r}=S,o=(h,f)=>e()==="dark"?f:h,s=Ve(h=>{const u=h().getAll().find(g=>g.mutationId===wt());return u?u.state.isPaused:!1}),l=Ve(h=>{const u=h().getAll().find(g=>g.mutationId===wt());return u?u.state.status:"idle"}),a=O(()=>zt({isPaused:s(),status:l()})),i=Ve(h=>h().getAll().find(f=>f.mutationId===wt()),!1),c=()=>a()==="gray"?t`
        background-color: ${o(r[a()][200],r[a()][700])};
        color: ${o(r[a()][700],r[a()][300])};
        border-color: ${o(r[a()][400],r[a()][600])};
      `:t`
      background-color: ${o(r[a()][100],r[a()][900])};
      color: ${o(r[a()][700],r[a()][300])};
      border-color: ${o(r[a()][400],r[a()][600])};
    `;return v(z,{get when(){return i()},get children(){var h=Zd(),f=h.firstChild,u=f.nextSibling,g=u.firstChild,d=g.firstChild,y=d.firstChild,b=d.nextSibling,m=g.nextSibling,p=m.firstChild,w=p.nextSibling,x=u.nextSibling,$=x.nextSibling,P=$.nextSibling,F=P.nextSibling,_=F.nextSibling,C=_.nextSibling,A=C.nextSibling,B=A.nextSibling;return k(y,v(z,{get when(){return i().options.mutationKey},fallback:"No mutationKey found",get children(){return xn(i().options.mutationKey,!0)}})),k(b,v(z,{get when(){return a()==="purple"},children:"pending"}),null),k(b,v(z,{get when(){return a()!=="purple"},get children(){return l()}}),null),k(w,()=>new Date(i().state.submittedAt).toLocaleTimeString()),k($,v(pt,{label:"Variables",defaultExpanded:["Variables"],get value(){return i().state.variables}})),k(F,v(pt,{label:"Context",defaultExpanded:["Context"],get value(){return i().state.context}})),k(C,v(pt,{label:"Data",defaultExpanded:["Data"],get value(){return i().state.data}})),k(B,v(pt,{label:"Mutation",defaultExpanded:["Mutation"],get value(){return i()}})),V(U=>{var ne=L(n().detailsContainer,"tsqd-query-details-container"),Z=L(n().detailsHeader,"tsqd-query-details-header"),se=L(n().detailsBody,"tsqd-query-details-summary-container"),R=L(n().queryDetailsStatus,c()),Q=L(n().detailsHeader,"tsqd-query-details-header"),J=S.size[2],ue=L(n().detailsHeader,"tsqd-query-details-header"),ve=S.size[2],Te=L(n().detailsHeader,"tsqd-query-details-header"),he=S.size[2],Ae=L(n().detailsHeader,"tsqd-query-details-header"),D=S.size[2];return ne!==U.e&&T(h,U.e=ne),Z!==U.t&&T(f,U.t=Z),se!==U.a&&T(u,U.a=se),R!==U.o&&T(b,U.o=R),Q!==U.i&&T(x,U.i=Q),J!==U.n&&((U.n=J)!=null?$.style.setProperty("padding",J):$.style.removeProperty("padding")),ue!==U.s&&T(P,U.s=ue),ve!==U.h&&((U.h=ve)!=null?F.style.setProperty("padding",ve):F.style.removeProperty("padding")),Te!==U.r&&T(_,U.r=Te),he!==U.d&&((U.d=he)!=null?C.style.setProperty("padding",he):C.style.removeProperty("padding")),Ae!==U.l&&T(A,U.l=Ae),D!==U.u&&((U.u=D)!=null?B.style.setProperty("padding",D):B.style.removeProperty("padding")),U},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0,r:void 0,d:void 0,l:void 0,u:void 0}),h}})},Dn=new Map,u0=()=>{const e=O(()=>N().client.getQueryCache()),t=e().subscribe(n=>{ks(()=>{for(const[r,o]of Dn.entries())o.shouldUpdate(n)&&o.setter(r(e))})});return G(()=>{Dn.clear(),t()}),t},pe=(e,t=!0,n=()=>!0)=>{const r=O(()=>N().client.getQueryCache()),[o,s]=K(e(r),t?void 0:{equals:!1});return H(()=>{s(e(r))}),Dn.set(e,{setter:s,shouldUpdate:n}),G(()=>{Dn.delete(e)}),o},An=new Map,c0=()=>{const e=O(()=>N().client.getMutationCache()),t=e().subscribe(()=>{for(const[n,r]of An.entries())queueMicrotask(()=>{r(n(e))})});return G(()=>{An.clear(),t()}),t},Ve=(e,t=!0)=>{const n=O(()=>N().client.getMutationCache()),[r,o]=K(e(n),t?void 0:{equals:!1});return H(()=>{o(e(n))}),An.set(e,o),G(()=>{An.delete(e)}),r},d0="@tanstack/query-devtools-event",Xe=({type:e,queryHash:t,metadata:n})=>{const r=new CustomEvent(d0,{detail:{type:e,queryHash:t,metadata:n},bubbles:!0,cancelable:!0});window.dispatchEvent(r)},ps=(e,t)=>{const{colors:n,font:r,size:o,alpha:s,shadow:l,border:a}=S,i=(c,h)=>e==="light"?c:h;return{devtoolsBtn:t`
      z-index: 100000;
      position: fixed;
      padding: 4px;
      text-align: left;

      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      box-shadow: ${l.md()};
      overflow: hidden;

      & div {
        position: absolute;
        top: -8px;
        left: -8px;
        right: -8px;
        bottom: -8px;
        border-radius: 9999px;

        & svg {
          position: absolute;
          width: 100%;
          height: 100%;
        }
        filter: blur(6px) saturate(1.2) contrast(1.1);
      }

      &:focus-within {
        outline-offset: 2px;
        outline: 3px solid ${n.green[600]};
      }

      & button {
        position: relative;
        z-index: 1;
        padding: 0;
        border-radius: 9999px;
        background-color: transparent;
        border: none;
        height: 40px;
        display: flex;
        width: 40px;
        overflow: hidden;
        cursor: pointer;
        outline: none;
        & svg {
          position: absolute;
          width: 100%;
          height: 100%;
        }
      }
    `,panel:t`
      position: fixed;
      z-index: 9999;
      display: flex;
      gap: ${S.size[.5]};
      & * {
        box-sizing: border-box;
        text-transform: none;
      }

      & *::-webkit-scrollbar {
        width: 7px;
      }

      & *::-webkit-scrollbar-track {
        background: transparent;
      }

      & *::-webkit-scrollbar-thumb {
        background: ${i(n.gray[300],n.darkGray[200])};
      }

      & *::-webkit-scrollbar-thumb:hover {
        background: ${i(n.gray[400],n.darkGray[300])};
      }
    `,parentPanel:t`
      z-index: 9999;
      display: flex;
      height: 100%;
      gap: ${S.size[.5]};
      & * {
        box-sizing: border-box;
        text-transform: none;
      }

      & *::-webkit-scrollbar {
        width: 7px;
      }

      & *::-webkit-scrollbar-track {
        background: transparent;
      }

      & *::-webkit-scrollbar-thumb {
        background: ${i(n.gray[300],n.darkGray[200])};
      }

      & *::-webkit-scrollbar-thumb:hover {
        background: ${i(n.gray[400],n.darkGray[300])};
      }
    `,"devtoolsBtn-position-bottom-right":t`
      bottom: 12px;
      right: 12px;
    `,"devtoolsBtn-position-bottom-left":t`
      bottom: 12px;
      left: 12px;
    `,"devtoolsBtn-position-top-left":t`
      top: 12px;
      left: 12px;
    `,"devtoolsBtn-position-top-right":t`
      top: 12px;
      right: 12px;
    `,"devtoolsBtn-position-relative":t`
      position: relative;
    `,"panel-position-top":t`
      top: 0;
      right: 0;
      left: 0;
      max-height: 90%;
      min-height: ${o[14]};
      border-bottom: ${i(n.gray[400],n.darkGray[300])} 1px solid;
    `,"panel-position-bottom":t`
      bottom: 0;
      right: 0;
      left: 0;
      max-height: 90%;
      min-height: ${o[14]};
      border-top: ${i(n.gray[400],n.darkGray[300])} 1px solid;
    `,"panel-position-right":t`
      bottom: 0;
      right: 0;
      top: 0;
      border-left: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      max-width: 90%;
    `,"panel-position-left":t`
      bottom: 0;
      left: 0;
      top: 0;
      border-right: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      max-width: 90%;
    `,closeBtn:t`
      position: absolute;
      cursor: pointer;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: center;
      outline: none;
      background-color: ${i(n.gray[50],n.darkGray[700])};
      &:hover {
        background-color: ${i(n.gray[200],n.darkGray[500])};
      }
      &:focus-visible {
        outline: 2px solid ${n.blue[600]};
      }
      & svg {
        color: ${i(n.gray[600],n.gray[400])};
        width: ${o[2]};
        height: ${o[2]};
      }
    `,"closeBtn-position-top":t`
      bottom: 0;
      right: ${o[2]};
      transform: translate(0, 100%);
      border-right: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-left: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-top: none;
      border-bottom: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-radius: 0px 0px ${a.radius.sm} ${a.radius.sm};
      padding: ${o[.5]} ${o[1.5]} ${o[1]} ${o[1.5]};

      &::after {
        content: ' ';
        position: absolute;
        bottom: 100%;
        left: -${o[2.5]};
        height: ${o[1.5]};
        width: calc(100% + ${o[5]});
      }

      & svg {
        transform: rotate(180deg);
      }
    `,"closeBtn-position-bottom":t`
      top: 0;
      right: ${o[2]};
      transform: translate(0, -100%);
      border-right: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-left: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-top: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-bottom: none;
      border-radius: ${a.radius.sm} ${a.radius.sm} 0px 0px;
      padding: ${o[1]} ${o[1.5]} ${o[.5]} ${o[1.5]};

      &::after {
        content: ' ';
        position: absolute;
        top: 100%;
        left: -${o[2.5]};
        height: ${o[1.5]};
        width: calc(100% + ${o[5]});
      }
    `,"closeBtn-position-right":t`
      bottom: ${o[2]};
      left: 0;
      transform: translate(-100%, 0);
      border-right: none;
      border-left: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-top: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-bottom: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-radius: ${a.radius.sm} 0px 0px ${a.radius.sm};
      padding: ${o[1.5]} ${o[.5]} ${o[1.5]} ${o[1]};

      &::after {
        content: ' ';
        position: absolute;
        left: 100%;
        height: calc(100% + ${o[5]});
        width: ${o[1.5]};
      }

      & svg {
        transform: rotate(-90deg);
      }
    `,"closeBtn-position-left":t`
      bottom: ${o[2]};
      right: 0;
      transform: translate(100%, 0);
      border-left: none;
      border-right: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-top: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-bottom: ${i(n.gray[400],n.darkGray[300])} 1px solid;
      border-radius: 0px ${a.radius.sm} ${a.radius.sm} 0px;
      padding: ${o[1.5]} ${o[1]} ${o[1.5]} ${o[.5]};

      &::after {
        content: ' ';
        position: absolute;
        right: 100%;
        height: calc(100% + ${o[5]});
        width: ${o[1.5]};
      }

      & svg {
        transform: rotate(90deg);
      }
    `,queriesContainer:t`
      flex: 1 1 700px;
      background-color: ${i(n.gray[50],n.darkGray[700])};
      display: flex;
      flex-direction: column;
      & * {
        font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      }
    `,dragHandle:t`
      position: absolute;
      transition: background-color 0.125s ease;
      &:hover {
        background-color: ${n.purple[400]}${i("",s[90])};
      }
      z-index: 4;
    `,"dragHandle-position-top":t`
      bottom: 0;
      width: 100%;
      height: 3px;
      cursor: ns-resize;
    `,"dragHandle-position-bottom":t`
      top: 0;
      width: 100%;
      height: 3px;
      cursor: ns-resize;
    `,"dragHandle-position-right":t`
      left: 0;
      width: 3px;
      height: 100%;
      cursor: ew-resize;
    `,"dragHandle-position-left":t`
      right: 0;
      width: 3px;
      height: 100%;
      cursor: ew-resize;
    `,row:t`
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: ${S.size[2]} ${S.size[2.5]};
      gap: ${S.size[2.5]};
      border-bottom: ${i(n.gray[300],n.darkGray[500])} 1px solid;
      align-items: center;
      & > button {
        padding: 0;
        background: transparent;
        border: none;
        display: flex;
        gap: ${o[.5]};
        flex-direction: column;
      }
    `,logoAndToggleContainer:t`
      display: flex;
      gap: ${S.size[3]};
      align-items: center;
    `,logo:t`
      cursor: pointer;
      display: flex;
      flex-direction: column;
      background-color: transparent;
      border: none;
      gap: ${S.size[.5]};
      padding: 0px;
      &:hover {
        opacity: 0.7;
      }
      &:focus-visible {
        outline-offset: 4px;
        border-radius: ${a.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
    `,tanstackLogo:t`
      font-size: ${r.size.md};
      font-weight: ${r.weight.bold};
      line-height: ${r.lineHeight.xs};
      white-space: nowrap;
      color: ${i(n.gray[600],n.gray[300])};
    `,queryFlavorLogo:t`
      font-weight: ${r.weight.semibold};
      font-size: ${r.size.xs};
      background: linear-gradient(
        to right,
        ${i("#ea4037, #ff9b11","#dd524b, #e9a03b")}
      );
      background-clip: text;
      -webkit-background-clip: text;
      line-height: 1;
      -webkit-text-fill-color: transparent;
      white-space: nowrap;
    `,queryStatusContainer:t`
      display: flex;
      gap: ${S.size[2]};
      height: min-content;
    `,queryStatusTag:t`
      display: flex;
      gap: ${S.size[1.5]};
      box-sizing: border-box;
      height: ${S.size[6.5]};
      background: ${i(n.gray[50],n.darkGray[500])};
      color: ${i(n.gray[700],n.gray[300])};
      border-radius: ${S.border.radius.sm};
      font-size: ${r.size.sm};
      padding: ${S.size[1]};
      padding-left: ${S.size[1.5]};
      align-items: center;
      font-weight: ${r.weight.medium};
      border: ${i("1px solid "+n.gray[300],"1px solid transparent")};
      user-select: none;
      position: relative;
      &:focus-visible {
        outline-offset: 2px;
        outline: 2px solid ${n.blue[800]};
      }
    `,queryStatusTagLabel:t`
      font-size: ${r.size.xs};
    `,queryStatusCount:t`
      font-size: ${r.size.xs};
      padding: 0 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${i(n.gray[500],n.gray[400])};
      background-color: ${i(n.gray[200],n.darkGray[300])};
      border-radius: 2px;
      font-variant-numeric: tabular-nums;
      height: ${S.size[4.5]};
    `,statusTooltip:t`
      position: absolute;
      z-index: 1;
      background-color: ${i(n.gray[50],n.darkGray[500])};
      top: 100%;
      left: 50%;
      transform: translate(-50%, calc(${S.size[2]}));
      padding: ${S.size[.5]} ${S.size[2]};
      border-radius: ${S.border.radius.sm};
      font-size: ${r.size.xs};
      border: 1px solid ${i(n.gray[400],n.gray[600])};
      color: ${i(n.gray[600],n.gray[300])};

      &::before {
        top: 0px;
        content: ' ';
        display: block;
        left: 50%;
        transform: translate(-50%, -100%);
        position: absolute;
        border-color: transparent transparent
          ${i(n.gray[400],n.gray[600])} transparent;
        border-style: solid;
        border-width: 7px;
        /* transform: rotate(180deg); */
      }

      &::after {
        top: 0px;
        content: ' ';
        display: block;
        left: 50%;
        transform: translate(-50%, calc(-100% + 2px));
        position: absolute;
        border-color: transparent transparent
          ${i(n.gray[100],n.darkGray[500])} transparent;
        border-style: solid;
        border-width: 7px;
      }
    `,filtersContainer:t`
      display: flex;
      gap: ${S.size[2]};
      & > button {
        cursor: pointer;
        padding: ${S.size[.5]} ${S.size[1.5]} ${S.size[.5]}
          ${S.size[2]};
        border-radius: ${S.border.radius.sm};
        background-color: ${i(n.gray[100],n.darkGray[400])};
        border: 1px solid ${i(n.gray[300],n.darkGray[200])};
        color: ${i(n.gray[700],n.gray[300])};
        font-size: ${r.size.xs};
        display: flex;
        align-items: center;
        line-height: ${r.lineHeight.sm};
        gap: ${S.size[1.5]};
        max-width: 160px;
        &:focus-visible {
          outline-offset: 2px;
          border-radius: ${a.radius.xs};
          outline: 2px solid ${n.blue[800]};
        }
        & svg {
          width: ${S.size[3]};
          height: ${S.size[3]};
          color: ${i(n.gray[500],n.gray[400])};
        }
      }
    `,filterInput:t`
      padding: ${o[.5]} ${o[2]};
      border-radius: ${S.border.radius.sm};
      background-color: ${i(n.gray[100],n.darkGray[400])};
      display: flex;
      box-sizing: content-box;
      align-items: center;
      gap: ${S.size[1.5]};
      max-width: 160px;
      min-width: 100px;
      border: 1px solid ${i(n.gray[300],n.darkGray[200])};
      height: min-content;
      color: ${i(n.gray[600],n.gray[400])};
      & > svg {
        width: ${o[3]};
        height: ${o[3]};
      }
      & input {
        font-size: ${r.size.xs};
        width: 100%;
        background-color: ${i(n.gray[100],n.darkGray[400])};
        border: none;
        padding: 0;
        line-height: ${r.lineHeight.sm};
        color: ${i(n.gray[700],n.gray[300])};
        &::placeholder {
          color: ${i(n.gray[700],n.gray[300])};
        }
        &:focus {
          outline: none;
        }
      }

      &:focus-within {
        outline-offset: 2px;
        border-radius: ${a.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
    `,filterSelect:t`
      padding: ${S.size[.5]} ${S.size[2]};
      border-radius: ${S.border.radius.sm};
      background-color: ${i(n.gray[100],n.darkGray[400])};
      display: flex;
      align-items: center;
      gap: ${S.size[1.5]};
      box-sizing: content-box;
      max-width: 160px;
      border: 1px solid ${i(n.gray[300],n.darkGray[200])};
      height: min-content;
      & > svg {
        color: ${i(n.gray[600],n.gray[400])};
        width: ${S.size[2]};
        height: ${S.size[2]};
      }
      & > select {
        appearance: none;
        color: ${i(n.gray[700],n.gray[300])};
        min-width: 100px;
        line-height: ${r.lineHeight.sm};
        font-size: ${r.size.xs};
        background-color: ${i(n.gray[100],n.darkGray[400])};
        border: none;
        &:focus {
          outline: none;
        }
      }
      &:focus-within {
        outline-offset: 2px;
        border-radius: ${a.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
    `,actionsContainer:t`
      display: flex;
      gap: ${S.size[2]};
    `,actionsBtn:t`
      border-radius: ${S.border.radius.sm};
      background-color: ${i(n.gray[100],n.darkGray[400])};
      border: 1px solid ${i(n.gray[300],n.darkGray[200])};
      width: ${S.size[6.5]};
      height: ${S.size[6.5]};
      justify-content: center;
      display: flex;
      align-items: center;
      gap: ${S.size[1.5]};
      max-width: 160px;
      cursor: pointer;
      padding: 0;
      &:hover {
        background-color: ${i(n.gray[200],n.darkGray[500])};
      }
      & svg {
        color: ${i(n.gray[700],n.gray[300])};
        width: ${S.size[3]};
        height: ${S.size[3]};
      }
      &:focus-visible {
        outline-offset: 2px;
        border-radius: ${a.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
    `,actionsBtnOffline:t`
      & svg {
        stroke: ${i(n.yellow[700],n.yellow[500])};
        fill: ${i(n.yellow[700],n.yellow[500])};
      }
    `,overflowQueryContainer:t`
      flex: 1;
      overflow-y: auto;
      & > div {
        display: flex;
        flex-direction: column;
      }
    `,queryRow:t`
      display: flex;
      align-items: center;
      padding: 0;
      border: none;
      cursor: pointer;
      color: ${i(n.gray[700],n.gray[300])};
      background-color: ${i(n.gray[50],n.darkGray[700])};
      line-height: 1;
      &:focus {
        outline: none;
      }
      &:focus-visible {
        outline-offset: -2px;
        border-radius: ${a.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
      &:hover .tsqd-query-hash {
        background-color: ${i(n.gray[200],n.darkGray[600])};
      }

      & .tsqd-query-observer-count {
        padding: 0 ${S.size[1]};
        user-select: none;
        min-width: ${S.size[6.5]};
        align-self: stretch;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${r.size.xs};
        font-weight: ${r.weight.medium};
        border-bottom-width: 1px;
        border-bottom-style: solid;
        border-bottom: 1px solid ${i(n.gray[300],n.darkGray[700])};
      }
      & .tsqd-query-hash {
        user-select: text;
        font-size: ${r.size.xs};
        display: flex;
        align-items: center;
        min-height: ${S.size[6]};
        flex: 1;
        padding: ${S.size[1]} ${S.size[2]};
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          'Liberation Mono', 'Courier New', monospace;
        border-bottom: 1px solid ${i(n.gray[300],n.darkGray[400])};
        text-align: left;
        text-overflow: clip;
        word-break: break-word;
      }

      & .tsqd-query-disabled-indicator {
        align-self: stretch;
        display: flex;
        align-items: center;
        padding: 0 ${S.size[2]};
        color: ${i(n.gray[800],n.gray[300])};
        background-color: ${i(n.gray[300],n.darkGray[600])};
        border-bottom: 1px solid ${i(n.gray[300],n.darkGray[400])};
        font-size: ${r.size.xs};
      }

      & .tsqd-query-static-indicator {
        align-self: stretch;
        display: flex;
        align-items: center;
        padding: 0 ${S.size[2]};
        color: ${i(n.teal[800],n.teal[300])};
        background-color: ${i(n.teal[100],n.teal[900])};
        border-bottom: 1px solid ${i(n.teal[300],n.teal[700])};
        font-size: ${r.size.xs};
      }
    `,selectedQueryRow:t`
      background-color: ${i(n.gray[200],n.darkGray[500])};
    `,detailsContainer:t`
      flex: 1 1 700px;
      background-color: ${i(n.gray[50],n.darkGray[700])};
      color: ${i(n.gray[700],n.gray[300])};
      font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      display: flex;
      text-align: left;
    `,detailsHeader:t`
      font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      position: sticky;
      top: 0;
      z-index: 2;
      background-color: ${i(n.gray[200],n.darkGray[600])};
      padding: ${S.size[1.5]} ${S.size[2]};
      font-weight: ${r.weight.medium};
      font-size: ${r.size.xs};
      line-height: ${r.lineHeight.xs};
      text-align: left;
    `,detailsBody:t`
      margin: ${S.size[1.5]} 0px ${S.size[2]} 0px;
      & > div {
        display: flex;
        align-items: stretch;
        padding: 0 ${S.size[2]};
        line-height: ${r.lineHeight.sm};
        justify-content: space-between;
        & > span {
          font-size: ${r.size.xs};
        }
        & > span:nth-child(2) {
          font-variant-numeric: tabular-nums;
        }
      }

      & > div:first-child {
        margin-bottom: ${S.size[1.5]};
      }

      & code {
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          'Liberation Mono', 'Courier New', monospace;
        margin: 0;
        font-size: ${r.size.xs};
        line-height: ${r.lineHeight.xs};
      }

      & pre {
        margin: 0;
        display: flex;
        align-items: center;
      }
    `,queryDetailsStatus:t`
      border: 1px solid ${n.darkGray[200]};
      border-radius: ${S.border.radius.sm};
      font-weight: ${r.weight.medium};
      padding: ${S.size[1]} ${S.size[2.5]};
    `,actionsBody:t`
      flex-wrap: wrap;
      margin: ${S.size[2]} 0px ${S.size[2]} 0px;
      display: flex;
      gap: ${S.size[2]};
      padding: 0px ${S.size[2]};
      & > button {
        font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
        font-size: ${r.size.xs};
        padding: ${S.size[1]} ${S.size[2]};
        display: flex;
        border-radius: ${S.border.radius.sm};
        background-color: ${i(n.gray[100],n.darkGray[600])};
        border: 1px solid ${i(n.gray[300],n.darkGray[400])};
        align-items: center;
        gap: ${S.size[2]};
        font-weight: ${r.weight.medium};
        line-height: ${r.lineHeight.xs};
        cursor: pointer;
        &:focus-visible {
          outline-offset: 2px;
          border-radius: ${a.radius.xs};
          outline: 2px solid ${n.blue[800]};
        }
        &:hover {
          background-color: ${i(n.gray[200],n.darkGray[500])};
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        & > span {
          width: ${o[1.5]};
          height: ${o[1.5]};
          border-radius: ${S.border.radius.full};
        }
      }
    `,actionsSelect:t`
      font-size: ${r.size.xs};
      padding: ${S.size[.5]} ${S.size[2]};
      display: flex;
      border-radius: ${S.border.radius.sm};
      overflow: hidden;
      background-color: ${i(n.gray[100],n.darkGray[600])};
      border: 1px solid ${i(n.gray[300],n.darkGray[400])};
      align-items: center;
      gap: ${S.size[2]};
      font-weight: ${r.weight.medium};
      line-height: ${r.lineHeight.sm};
      color: ${i(n.red[500],n.red[400])};
      cursor: pointer;
      position: relative;
      &:hover {
        background-color: ${i(n.gray[200],n.darkGray[500])};
      }
      & > span {
        width: ${o[1.5]};
        height: ${o[1.5]};
        border-radius: ${S.border.radius.full};
      }
      &:focus-within {
        outline-offset: 2px;
        border-radius: ${a.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
      & select {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        appearance: none;
        background-color: transparent;
        border: none;
        color: transparent;
        outline: none;
      }

      & svg path {
        stroke: ${S.colors.red[400]};
      }
      & svg {
        width: ${S.size[2]};
        height: ${S.size[2]};
      }
    `,settingsMenu:t`
      display: flex;
      & * {
        font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      }
      flex-direction: column;
      gap: ${o[.5]};
      border-radius: ${S.border.radius.sm};
      border: 1px solid ${i(n.gray[300],n.gray[700])};
      background-color: ${i(n.gray[50],n.darkGray[600])};
      font-size: ${r.size.xs};
      color: ${i(n.gray[700],n.gray[300])};
      z-index: 99999;
      min-width: 120px;
      padding: ${o[.5]};
    `,settingsSubTrigger:t`
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: ${S.border.radius.xs};
      padding: ${S.size[1]} ${S.size[1]};
      cursor: pointer;
      background-color: transparent;
      border: none;
      color: ${i(n.gray[700],n.gray[300])};
      & svg {
        color: ${i(n.gray[600],n.gray[400])};
        transform: rotate(-90deg);
        width: ${S.size[2]};
        height: ${S.size[2]};
      }
      &:hover {
        background-color: ${i(n.gray[200],n.darkGray[500])};
      }
      &:focus-visible {
        outline-offset: 2px;
        outline: 2px solid ${n.blue[800]};
      }
      &.data-disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,settingsMenuHeader:t`
      padding: ${S.size[1]} ${S.size[1]};
      font-weight: ${r.weight.medium};
      border-bottom: 1px solid ${i(n.gray[300],n.darkGray[400])};
      color: ${i(n.gray[500],n.gray[400])};
      font-size: ${r.size.xs};
    `,settingsSubButton:t`
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: ${i(n.gray[700],n.gray[300])};
      font-size: ${r.size.xs};
      border-radius: ${S.border.radius.xs};
      padding: ${S.size[1]} ${S.size[1]};
      cursor: pointer;
      background-color: transparent;
      border: none;
      & svg {
        color: ${i(n.gray[600],n.gray[400])};
      }
      &:hover {
        background-color: ${i(n.gray[200],n.darkGray[500])};
      }
      &:focus-visible {
        outline-offset: 2px;
        outline: 2px solid ${n.blue[800]};
      }
    `,themeSelectedButton:t`
      background-color: ${i(n.purple[100],n.purple[900])};
      color: ${i(n.purple[700],n.purple[300])};
      & svg {
        color: ${i(n.purple[700],n.purple[300])};
      }
      &:hover {
        background-color: ${i(n.purple[100],n.purple[900])};
      }
    `,viewToggle:t`
      border-radius: ${S.border.radius.sm};
      background-color: ${i(n.gray[200],n.darkGray[600])};
      border: 1px solid ${i(n.gray[300],n.darkGray[200])};
      display: flex;
      padding: 0;
      font-size: ${r.size.xs};
      color: ${i(n.gray[700],n.gray[300])};
      overflow: hidden;

      &:has(:focus-visible) {
        outline: 2px solid ${n.blue[800]};
      }

      & .tsqd-radio-toggle {
        opacity: 0.5;
        display: flex;
        & label {
          display: flex;
          align-items: center;
          cursor: pointer;
          line-height: ${r.lineHeight.md};
        }

        & label:hover {
          background-color: ${i(n.gray[100],n.darkGray[500])};
        }
      }

      & > [data-checked] {
        opacity: 1;
        background-color: ${i(n.gray[100],n.darkGray[400])};
        & label:hover {
          background-color: ${i(n.gray[100],n.darkGray[400])};
        }
      }

      & .tsqd-radio-toggle:first-child {
        & label {
          padding: 0 ${S.size[1.5]} 0 ${S.size[2]};
        }
        border-right: 1px solid ${i(n.gray[300],n.darkGray[200])};
      }

      & .tsqd-radio-toggle:nth-child(2) {
        & label {
          padding: 0 ${S.size[2]} 0 ${S.size[1.5]};
        }
      }
    `,devtoolsEditForm:t`
      padding: ${o[2]};
      & > [data-error='true'] {
        outline: 2px solid ${i(n.red[200],n.red[800])};
        outline-offset: 2px;
        border-radius: ${a.radius.xs};
      }
    `,devtoolsEditTextarea:t`
      width: 100%;
      max-height: 500px;
      font-family: 'Fira Code', monospace;
      font-size: ${r.size.xs};
      border-radius: ${a.radius.sm};
      field-sizing: content;
      padding: ${o[2]};
      background-color: ${i(n.gray[100],n.darkGray[800])};
      color: ${i(n.gray[900],n.gray[100])};
      border: 1px solid ${i(n.gray[200],n.gray[700])};
      resize: none;
      &:focus {
        outline-offset: 2px;
        border-radius: ${a.radius.xs};
        outline: 2px solid ${i(n.blue[200],n.blue[800])};
      }
    `,devtoolsEditFormActions:t`
      display: flex;
      justify-content: space-between;
      gap: ${o[2]};
      align-items: center;
      padding-top: ${o[1]};
      font-size: ${r.size.xs};
    `,devtoolsEditFormError:t`
      color: ${i(n.red[700],n.red[500])};
    `,devtoolsEditFormActionContainer:t`
      display: flex;
      gap: ${o[2]};
    `,devtoolsEditFormAction:t`
      font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      font-size: ${r.size.xs};
      padding: ${o[1]} ${S.size[2]};
      display: flex;
      border-radius: ${a.radius.sm};
      background-color: ${i(n.gray[100],n.darkGray[600])};
      border: 1px solid ${i(n.gray[300],n.darkGray[400])};
      align-items: center;
      gap: ${o[2]};
      font-weight: ${r.weight.medium};
      line-height: ${r.lineHeight.xs};
      cursor: pointer;
      &:focus-visible {
        outline-offset: 2px;
        border-radius: ${a.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
      &:hover {
        background-color: ${i(n.gray[200],n.darkGray[500])};
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `}},We=e=>ps("light",e),Qe=e=>ps("dark",e);sr(["click","mousedown","input"]);var f0=e=>{const[t,n]=js({prefix:"TanstackQueryDevtools"}),r=zs(),o=O(()=>{const s=t.theme_preference||Xs;return s!=="system"?s:r()});return v(No.Provider,{value:e,get children(){return v(nl,{localStore:t,setLocalStore:n,get children(){return v(Uo.Provider,{value:o,get children(){return v(e0,{localStore:t,setLocalStore:n})}})}})}})},$0=f0;export{$0 as default};
//# sourceMappingURL=EDEL3XIZ-CclGiI8L.js.map
