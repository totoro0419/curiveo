import { catalog, unitMap, videoMap } from '../catalog';
import type { Series, SubjectId } from '../types';

/** Display order only: canonical IDs and the provider's lesson sequence never change. */
const mathLevels=['中学数学','数学Ⅰ','数学A','数学Ⅱ','数学B','数学Ⅲ','数学C','高校・大学受験','総復習・入試'];
const subjects:Record<SubjectId,string[]>={
 mathematics:mathLevels,
 english:['英文法','語彙・学習法','英語コミュニケーションⅠ～Ⅲ','長文・英文解釈','英作文'],
 chemistry:['物質の構成','物質量と化学反応','物質の状態','化学反応と平衡','無機物質の性質','無機化学','有機化合物の性質','有機化学','高分子化合物','日常の化学'],
 physics:['力学','熱力学','波動','電磁気学','原子'],
 japanese:['現代文','論理国語','文学国語','古文','漢文'],
 'japanese-history':['縄文・弥生〜平安中期','平安後期〜安土桃山','江戸時代','幕末・明治・大正','昭和・平成','近現代の文化','歴史総合','テーマ別'],
 'world-history':['古代文明・地中海世界','アジア・イスラーム世界','中世ヨーロッパ','近世ヨーロッパ','近現代の欧米','近現代のアジア','戦後の世界','歴史総合','テーマ別'],
 information:['情報社会の問題解決','コミュニケーションと情報デザイン','コンピュータとプログラミング','情報通信ネットワークとデータの活用','総復習・共通テスト対策'],
};
const topics:Record<string,string[]>={
 '数学Ⅰ':['数と式','関数','図形と計量','データ・統計'],
 '数と式':['展開・因数分解','実数・一次不等式','論理と集合'],
 '数学A':['場合の数・確率','図形','数学と人間の活動','整数・記数法（旧課程の講座）'],
 '数学Ⅱ':['いろいろな式','図形と方程式','関数','微分・積分','総復習'],
 'いろいろな式':['式と証明','複素数と方程式'],
 '数学B':['数列','統計的な推測'],
 '統計的な推測':['確率変数と確率分布','二項分布と正規分布','標本分布','統計的な推定','仮説検定'],
 '数学Ⅲ':['関数','極限','微分・積分'],
 'ベクトル・平面上の曲線と複素数平面':['ベクトル','式と曲線','複素数平面'],
 '場合の数・確率':['場合の数','確率'],
 '微分・積分':['微分法','微分法の応用','積分法','積分法の応用'],
 '英文法':['文型','動詞の語法','時制','助動詞','受動態','不定詞・動名詞','分詞','比較','関係詞','仮定法','前置詞','否定','倒置・強調','英文法総合'],
 '長文・英文解釈':['英文解釈・和訳','長文読解'],
 '古文':['入門','基礎の定着','解釈','記述演習','共通テスト・入試演習'],
 '漢文':['句法・基礎','基礎の定着','記述演習','共通テスト・入試演習'],
 '現代文':['読解の基礎','設問・記述','共通テスト・入試演習','補講・総まとめ'],
 '力学':['運動の表し方','力とつり合い','運動の法則','落体・放物運動','仕事とエネルギー','運動量と保存則','円運動・慣性力','単振動','万有引力','分野の総復習','発展的な補強講義'],
 '熱力学':['熱と熱量','気体の性質','熱力学の法則','気体の状態変化と熱機関','分野の総復習'],
 '電磁気学':['電場と電位','コンデンサー','直流回路','電流と磁場','電磁誘導','交流・電気振動'],
 '物質の構成':['物質の探求','物質の構成粒子','化学結合'],
 '物質量と化学反応':['物質量mol','化学反応式'],
 '物質の状態':['固体の構造','気体の性質','溶液の性質'],
 '化学反応と平衡':['酸と塩基','酸化還元｜電池・電気分解','反応熱','反応速度','化学平衡'],
 '有機化合物の性質':['脂肪族化合物','芳香族化合物','構造決定','有機化学の演習・総復習'],
 '無機物質の性質':['無機の反応原理','無機化学の演習・総復習'],
 '高分子化合物':['天然高分子','合成高分子','高分子の演習・総復習'],
};
const normalized=(text:string)=>text.normalize('NFKC').replace(/\s+/g,'').replace(/第[0-9]+[講話]/g,'');
const position=(title:string,order:string[])=>{const index=order.findIndex(name=>normalized(name)===normalized(title));return index<0?order.length:index;};
const unknown=(title:string)=>/分類確認中|その他/.test(title)?1:0;
export function compareCategory(subjectId:SubjectId,parent:string,a:string,b:string,isRoot=false){
 const order=isRoot?subjects[subjectId]:topics[parent]||[];
 return unknown(a)-unknown(b)||position(a,order)-position(b,order);
}
export function compareLevels(subjectId:SubjectId,a:string,b:string){return position(a,subjects[subjectId])-position(b,subjects[subjectId]);}

const sourceOrder=new Map(catalog.series.map((s,i)=>[s.id,i]));
const roleOrder={core:0,reinforcement:1,exam:2,advanced:3};
const roleRanks=new Map(catalog.series.map(s=>[s.id,Math.min(...s.videoIds.map(id=>roleOrder[videoMap.get(id)!.role]))]));
const themeCache=new Map<string,number[]>();
function computeCourseTheme(series:Series){
 if(series.subjectId==='japanese'){
  const title=series.title;
  const field=/古文/.test(title)?'古文':/漢文/.test(title)?'漢文':'現代文';
  const stage=/はじめて/.test(title)?0:/基礎/.test(title)?1:/アウトプット/.test(title)?2:/解釈/.test(title)?3:/設問|記述/.test(title)?4:/過去問|共通テスト|対策|東大/.test(title)?5:/まとめ|特別/.test(title)?6:1;
  return [position(field,subjects.japanese),stage];
 }
 const units=series.videoIds.flatMap(id=>videoMap.get(id)?.unitIds||[]).map(id=>unitMap.get(id)).filter(Boolean);
 const first=units[0];
 if(series.subjectId==='english'){
  const name=first?.name||series.title;
  if(topics['英文法'].includes(name))return [0,position(name,topics['英文法'])];
  if(/語彙|学習法/.test(name))return [1,0];
  if(/リスニング/.test(name))return [2,0];
  if(/英作文|英訳/.test(name))return [4,0];
  if(/長文|英文解釈|和訳|英文読解/.test(name))return [3,0];
  return [0,topics['英文法'].length];
 }
 if(series.subjectId==='mathematics'){
  const name=first?.name||series.title;
  const mathUnits:Record<string,string[]>={
   '中学数学':['正の数と負の数','文字式','方程式','比例と反比例','連立方程式','一次関数','平方根','因数分解','二次方程式','二次関数','平面図形','空間図形'],
   '数学Ⅰ':['展開・因数分解','実数・一次不等式','論理と集合','二次関数','二次方程式','二次不等式','三角比','データの分析'],
   '数学Ⅱ':['式と証明','複素数と方程式','図形と方程式','三角関数','指数・対数関数','微分法','積分法'],
   '数学Ⅲ':['関数','数列の極限','関数の極限','微分法','微分法の応用','積分法','積分法の応用'],
   '数学C':['ベクトル','式と曲線','複素数平面'],
  };
  const normalizedName=name.normalize('NFKC').replace(/1次/g,'一次').replace(/2次/g,'二次').replace('y=ax2(二次関数)','二次関数');
  return [0,position(normalizedName,mathUnits[series.level]||[])];
 }
 if(series.subjectId==='chemistry'){
  const byUnit:Record<string,string>={'物質の探求':'物質の構成','物質の構成粒子':'物質の構成','化学結合':'物質の構成','物質量mol':'物質量と化学反応','化学反応式':'物質量と化学反応','固体の構造':'物質の状態','気体の性質':'物質の状態','溶液の性質':'物質の状態','酸と塩基':'化学反応と平衡','酸化還元｜電池・電気分解':'化学反応と平衡','反応熱':'化学反応と平衡','反応速度':'化学反応と平衡','化学平衡':'化学反応と平衡'};
  const field=byUnit[first?.name||'']||units.flatMap(u=>u?.path||[]).find(title=>subjects.chemistry.includes(title))||first?.field||'';
  return [position(field,subjects.chemistry),roleRanks.get(series.id)||0];
 }
 if(series.subjectId==='physics')return [position(first?.name||'',subjects.physics),first?.order||0];
 return [0,first?.order||0];
}
function courseTheme(series:Series){let value=themeCache.get(series.id);if(!value){value=computeCourseTheme(series);themeCache.set(series.id,value);}return value;}
export function sortCourses(courses:Series[]){return [...courses].sort((a,b)=>{
 if(a.subjectId!==b.subjectId)return catalog.subjects.findIndex(s=>s.id===a.subjectId)-catalog.subjects.findIndex(s=>s.id===b.subjectId);
 const level=compareLevels(a.subjectId,a.level,b.level);if(level)return level;
 const at=courseTheme(a),bt=courseTheme(b);const theme=at[0]-bt[0]||at[1]-bt[1];if(theme)return theme;
 return (roleRanks.get(a.id)||0)-(roleRanks.get(b.id)||0)||(sourceOrder.get(a.id)||0)-(sourceOrder.get(b.id)||0);
});}
